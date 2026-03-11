import { expandEventOccurrences, parseRRuleString, sanitizeRecurrenceRule, type EventRecurrenceRule } from "@/features/events/recurrence";

export type ExternalCalendarConfig = {
  id: string;
  displayName: string | null;
  sourceUrl: string;
  isEnabled: boolean;
};

export type ExternalCalendarEvent = {
  id: string;
  sourceEventId: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  location: string | null;
  allDay: boolean;
  recurrenceRule: EventRecurrenceRule | null;
  externalCalendarId: string;
  externalCalendarName: string;
  sourceUrl: string;
};

type IcsProperty = {
  value: string;
  params: Record<string, string>;
};

type IcsEvent = {
  uid: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  recurrenceRule: EventRecurrenceRule | null;
};

function decodeIcsText(value: string) {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function sanitizeIdPart(value: string) {
  return encodeURIComponent(value.trim()).replace(/%/g, "_").slice(0, 160);
}

function normalizeSourceUrl(input: string) {
  const raw = input.trim();
  if (!raw) {
    throw new Error("Calendar URL is required");
  }

  const webUrl = raw.toLowerCase().startsWith("webcal://") ? `https://${raw.slice("webcal://".length)}` : raw;
  const parsed = new URL(webUrl);

  if (parsed.hostname === "calendar.google.com") {
    const src = parsed.searchParams.get("src")?.trim();
    if (src) {
      const encoded = encodeURIComponent(src);
      return `https://calendar.google.com/calendar/ical/${encoded}/public/basic.ics`;
    }
  }

  return parsed.toString();
}

function defaultCalendarName(config: ExternalCalendarConfig) {
  if (config.displayName?.trim()) {
    return config.displayName.trim();
  }

  try {
    const url = new URL(config.sourceUrl);
    const host = url.hostname.replace(/^www\./i, "");
    if (host === "calendar.google.com") {
      return "Google Calendar";
    }
    return host || "External calendar";
  } catch {
    return "External calendar";
  }
}

function unfoldLines(icsText: string) {
  const lines = icsText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const unfolded: string[] = [];

  for (const line of lines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] = `${unfolded[unfolded.length - 1]}${line.slice(1)}`;
      continue;
    }
    unfolded.push(line);
  }

  return unfolded;
}

function parseLineProperty(line: string) {
  const separatorIndex = line.indexOf(":");
  if (separatorIndex <= 0) {
    return null;
  }

  const left = line.slice(0, separatorIndex);
  const value = line.slice(separatorIndex + 1);
  const [rawName, ...paramTokens] = left.split(";");
  const params: Record<string, string> = {};

  for (const token of paramTokens) {
    const eqIndex = token.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }
    const key = token.slice(0, eqIndex).trim().toUpperCase();
    const paramValue = token.slice(eqIndex + 1).trim().replace(/^"|"$/g, "");
    params[key] = paramValue;
  }

  return {
    name: rawName.trim().toUpperCase(),
    property: {
      value: value.trim(),
      params
    } satisfies IcsProperty
  };
}

function extractProperty(properties: Map<string, IcsProperty[]>, key: string) {
  const values = properties.get(key);
  if (!values || values.length === 0) {
    return null;
  }

  return values[0]!;
}

function parseDurationToMilliseconds(value: string) {
  const match = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i.exec(value.trim());
  if (!match) {
    return null;
  }

  const weeks = Number.parseInt(match[1] ?? "0", 10);
  const days = Number.parseInt(match[2] ?? "0", 10);
  const hours = Number.parseInt(match[3] ?? "0", 10);
  const minutes = Number.parseInt(match[4] ?? "0", 10);
  const seconds = Number.parseInt(match[5] ?? "0", 10);

  const totalSeconds = seconds + minutes * 60 + hours * 3600 + days * 86_400 + weeks * 604_800;
  if (totalSeconds <= 0) {
    return null;
  }

  return totalSeconds * 1000;
}

function partsToTimeZoneDate(year: number, month: number, day: number, hours: number, minutes: number, seconds: number, timeZone: string) {
  const utcGuess = Date.UTC(year, month - 1, day, hours, minutes, seconds, 0);

  try {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });

    const partMap = new Map<string, string>();
    for (const part of formatter.formatToParts(new Date(utcGuess))) {
      if (part.type !== "literal") {
        partMap.set(part.type, part.value);
      }
    }

    const localAsUtc = Date.UTC(
      Number.parseInt(partMap.get("year") ?? "0", 10),
      Number.parseInt(partMap.get("month") ?? "1", 10) - 1,
      Number.parseInt(partMap.get("day") ?? "1", 10),
      Number.parseInt(partMap.get("hour") ?? "0", 10),
      Number.parseInt(partMap.get("minute") ?? "0", 10),
      Number.parseInt(partMap.get("second") ?? "0", 10),
      0
    );

    const offset = localAsUtc - utcGuess;
    return new Date(utcGuess - offset);
  } catch {
    return new Date(utcGuess);
  }
}

function parseIcsDate(property: IcsProperty | null) {
  if (!property) {
    return null;
  }

  const raw = property.value.trim();
  const valueType = property.params.VALUE?.toUpperCase() ?? "";
  const isAllDay = valueType === "DATE" || /^\d{8}$/.test(raw);

  const dateMatch = /^(\d{4})(\d{2})(\d{2})$/.exec(raw);
  if (dateMatch) {
    const year = Number.parseInt(dateMatch[1]!, 10);
    const month = Number.parseInt(dateMatch[2]!, 10);
    const day = Number.parseInt(dateMatch[3]!, 10);
    return {
      date: new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)),
      allDay: true
    };
  }

  const datetimeMatch = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/i.exec(raw);
  if (!datetimeMatch) {
    const fallback = new Date(raw);
    if (Number.isNaN(fallback.getTime())) {
      return null;
    }
    return { date: fallback, allDay: isAllDay };
  }

  const year = Number.parseInt(datetimeMatch[1]!, 10);
  const month = Number.parseInt(datetimeMatch[2]!, 10);
  const day = Number.parseInt(datetimeMatch[3]!, 10);
  const hours = Number.parseInt(datetimeMatch[4]!, 10);
  const minutes = Number.parseInt(datetimeMatch[5]!, 10);
  const seconds = Number.parseInt(datetimeMatch[6] ?? "0", 10);
  const hasZulu = Boolean(datetimeMatch[7]);

  if (hasZulu) {
    return {
      date: new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds, 0)),
      allDay: false
    };
  }

  const timeZone = property.params.TZID;
  if (timeZone) {
    return {
      date: partsToTimeZoneDate(year, month, day, hours, minutes, seconds, timeZone),
      allDay: false
    };
  }

  return {
    date: new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds, 0)),
    allDay: false
  };
}

function parseIcsEvents(icsText: string) {
  const lines = unfoldLines(icsText);
  const events: IcsEvent[] = [];

  let currentProperties: Map<string, IcsProperty[]> | null = null;

  for (const line of lines) {
    const normalized = line.trim();
    if (normalized === "BEGIN:VEVENT") {
      currentProperties = new Map();
      continue;
    }

    if (normalized === "END:VEVENT") {
      if (!currentProperties) {
        continue;
      }

      const uid = extractProperty(currentProperties, "UID")?.value?.trim() ?? crypto.randomUUID();
      const summary = decodeIcsText(extractProperty(currentProperties, "SUMMARY")?.value?.trim() || "External event");
      const descriptionRaw = extractProperty(currentProperties, "DESCRIPTION")?.value;
      const locationRaw = extractProperty(currentProperties, "LOCATION")?.value;
      const dtStart = parseIcsDate(extractProperty(currentProperties, "DTSTART"));
      if (!dtStart?.date || Number.isNaN(dtStart.date.getTime())) {
        currentProperties = null;
        continue;
      }

      const dtEndValue = parseIcsDate(extractProperty(currentProperties, "DTEND"));
      let endDate = dtEndValue?.date ?? null;

      if (!endDate) {
        const duration = parseDurationToMilliseconds(extractProperty(currentProperties, "DURATION")?.value ?? "");
        if (duration) {
          endDate = new Date(dtStart.date.getTime() + duration);
        } else if (dtStart.allDay) {
          endDate = new Date(dtStart.date.getTime() + 86_400_000);
        } else {
          endDate = new Date(dtStart.date.getTime() + 3_600_000);
        }
      }

      if (endDate.getTime() < dtStart.date.getTime()) {
        currentProperties = null;
        continue;
      }

      const rule = sanitizeRecurrenceRule(parseRRuleString(extractProperty(currentProperties, "RRULE")?.value ?? ""));
      events.push({
        uid,
        title: summary,
        description: descriptionRaw ? decodeIcsText(descriptionRaw) : null,
        location: locationRaw ? decodeIcsText(locationRaw) : null,
        startAt: dtStart.date.toISOString(),
        endAt: endDate.toISOString(),
        allDay: dtStart.allDay,
        recurrenceRule: rule
      });

      currentProperties = null;
      continue;
    }

    if (!currentProperties) {
      continue;
    }

    const parsed = parseLineProperty(line);
    if (!parsed) {
      continue;
    }

    const existing = currentProperties.get(parsed.name) ?? [];
    existing.push(parsed.property);
    currentProperties.set(parsed.name, existing);
  }

  return events;
}

function trimExternalEvents(events: ExternalCalendarEvent[]) {
  const now = new Date();
  const rangeStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const rangeEnd = new Date(now.getTime() + 370 * 24 * 60 * 60 * 1000);

  return events.filter((event) => {
    if (!event.recurrenceRule) {
      return new Date(event.endAt) >= rangeStart;
    }

    const occurrences = expandEventOccurrences(
      {
        id: event.id,
        startAt: event.startAt,
        endAt: event.endAt,
        recurrenceRule: event.recurrenceRule
      },
      rangeStart,
      rangeEnd,
      { maxOccurrences: 2 }
    );

    return occurrences.length > 0;
  });
}

export async function fetchExternalCalendarEvents(config: ExternalCalendarConfig): Promise<ExternalCalendarEvent[]> {
  if (!config.isEnabled) {
    return [];
  }

  const fetchUrl = normalizeSourceUrl(config.sourceUrl);
  const calendarName = defaultCalendarName(config);
  const response = await fetch(fetchUrl, {
    headers: { accept: "text/calendar, text/plain;q=0.9, */*;q=0.2" },
    next: { revalidate: 1800 }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch calendar feed (${response.status})`);
  }

  const icsText = await response.text();
  const events = parseIcsEvents(icsText);
  const mapped = events.map((event) => {
    const sourceId = sanitizeIdPart(event.uid);
    return {
      id: `external:${config.id}:${sourceId}`,
      sourceEventId: `external:${config.id}:${sourceId}`,
      title: event.title,
      description: event.description,
      location: event.location,
      startAt: event.startAt,
      endAt: event.endAt,
      allDay: event.allDay,
      recurrenceRule: event.recurrenceRule,
      externalCalendarId: config.id,
      externalCalendarName: calendarName,
      sourceUrl: config.sourceUrl
    } satisfies ExternalCalendarEvent;
  });

  return trimExternalEvents(mapped);
}
