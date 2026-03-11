export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export type EventRecurrenceRule = {
  frequency: RecurrenceFrequency;
  interval: number;
  byWeekdays?: number[];
  byMonthDay?: number;
  byMonth?: number;
  bySetPos?: number;
  count?: number;
  until?: string;
};

export type RecurringEventBase = {
  id: string;
  startAt: string;
  endAt: string;
  recurrenceRule?: EventRecurrenceRule | null;
};

export type EventOccurrence<T extends RecurringEventBase> = T & {
  sourceEventId: string;
  occurrenceId: string;
  occurrenceIndex: number;
  occurrenceStartAt: string;
  occurrenceEndAt: string;
};

const WEEKDAY_TOKEN_TO_INDEX: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6
};

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0, 0));
}

function addUtcDays(value: Date, amount: number) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() + amount, 0, 0, 0, 0));
}

function combineUtcDateAndTime(dateOnly: Date, timeSource: Date) {
  return new Date(
    Date.UTC(
      dateOnly.getUTCFullYear(),
      dateOnly.getUTCMonth(),
      dateOnly.getUTCDate(),
      timeSource.getUTCHours(),
      timeSource.getUTCMinutes(),
      timeSource.getUTCSeconds(),
      timeSource.getUTCMilliseconds()
    )
  );
}

function daysBetweenUtc(from: Date, to: Date) {
  const diff = startOfUtcDay(to).getTime() - startOfUtcDay(from).getTime();
  return Math.floor(diff / 86_400_000);
}

function monthsBetweenUtc(from: Date, to: Date) {
  return (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
}

function getNthWeekdayInMonth(date: Date) {
  return Math.floor((date.getUTCDate() - 1) / 7) + 1;
}

function getNegativeNthWeekdayInMonth(date: Date) {
  const daysInMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  return -Math.floor((daysInMonth - date.getUTCDate()) / 7) - 1;
}

function isNthWeekdayOfMonth(date: Date, weekday: number, setPos: number) {
  if (date.getUTCDay() !== weekday) {
    return false;
  }

  if (setPos > 0) {
    return getNthWeekdayInMonth(date) === setPos;
  }

  if (setPos < 0) {
    return getNegativeNthWeekdayInMonth(date) === setPos;
  }

  return false;
}

function parseInteger(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }

  return null;
}

function normalizeWeekdays(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const weekdays = value
    .map((entry) => parseInteger(entry))
    .filter((entry): entry is number => entry !== null && entry >= 0 && entry <= 6);

  if (weekdays.length === 0) {
    return undefined;
  }

  return Array.from(new Set(weekdays)).sort((left, right) => left - right);
}

export function sanitizeRecurrenceRule(input: unknown): EventRecurrenceRule | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const raw = input as Record<string, unknown>;
  const frequency = raw.frequency;
  if (frequency !== "daily" && frequency !== "weekly" && frequency !== "monthly" && frequency !== "yearly") {
    return null;
  }

  const interval = parseInteger(raw.interval) ?? 1;
  const normalizedInterval = Math.max(1, Math.min(365, interval));

  const byWeekdays = normalizeWeekdays(raw.byWeekdays);
  const byMonthDayRaw = parseInteger(raw.byMonthDay);
  const byMonthRaw = parseInteger(raw.byMonth);
  const bySetPosRaw = parseInteger(raw.bySetPos);
  const countRaw = parseInteger(raw.count);
  const untilRaw = typeof raw.until === "string" ? raw.until : null;
  const untilDate = untilRaw ? new Date(untilRaw) : null;

  const rule: EventRecurrenceRule = {
    frequency,
    interval: normalizedInterval
  };

  if (byWeekdays && byWeekdays.length > 0) {
    rule.byWeekdays = byWeekdays;
  }

  if (byMonthDayRaw !== null && byMonthDayRaw >= 1 && byMonthDayRaw <= 31) {
    rule.byMonthDay = byMonthDayRaw;
  }

  if (byMonthRaw !== null && byMonthRaw >= 1 && byMonthRaw <= 12) {
    rule.byMonth = byMonthRaw;
  }

  if (bySetPosRaw !== null && bySetPosRaw >= -5 && bySetPosRaw <= 5 && bySetPosRaw !== 0) {
    rule.bySetPos = bySetPosRaw;
  }

  if (countRaw !== null && countRaw >= 1 && countRaw <= 5000) {
    rule.count = countRaw;
  }

  if (untilDate && !Number.isNaN(untilDate.getTime())) {
    rule.until = untilDate.toISOString();
  }

  return rule;
}

function normalizeUntil(icsValue: string) {
  if (!icsValue) {
    return null;
  }

  const trimmed = icsValue.trim();
  if (/^\d{8}$/.test(trimmed)) {
    const year = Number.parseInt(trimmed.slice(0, 4), 10);
    const month = Number.parseInt(trimmed.slice(4, 6), 10);
    const day = Number.parseInt(trimmed.slice(6, 8), 10);
    return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999)).toISOString();
  }

  if (/^\d{8}T\d{6}Z$/.test(trimmed)) {
    const year = Number.parseInt(trimmed.slice(0, 4), 10);
    const month = Number.parseInt(trimmed.slice(4, 6), 10);
    const day = Number.parseInt(trimmed.slice(6, 8), 10);
    const hours = Number.parseInt(trimmed.slice(9, 11), 10);
    const minutes = Number.parseInt(trimmed.slice(11, 13), 10);
    const seconds = Number.parseInt(trimmed.slice(13, 15), 10);
    return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds, 0)).toISOString();
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

export function parseRRuleString(rrule: string): EventRecurrenceRule | null {
  if (!rrule) {
    return null;
  }

  const pairs = rrule.split(";").map((item) => item.trim()).filter(Boolean);
  const raw: Record<string, string> = {};
  for (const pair of pairs) {
    const separator = pair.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const key = pair.slice(0, separator).toUpperCase();
    const value = pair.slice(separator + 1);
    raw[key] = value;
  }

  const freq = raw.FREQ?.toUpperCase();
  if (freq !== "DAILY" && freq !== "WEEKLY" && freq !== "MONTHLY" && freq !== "YEARLY") {
    return null;
  }

  const frequency: RecurrenceFrequency =
    freq === "DAILY" ? "daily" : freq === "WEEKLY" ? "weekly" : freq === "MONTHLY" ? "monthly" : "yearly";

  const interval = parseInteger(raw.INTERVAL) ?? 1;
  const count = parseInteger(raw.COUNT);
  const byMonthDay = parseInteger(raw.BYMONTHDAY);
  const byMonth = parseInteger(raw.BYMONTH);
  const bySetPos = parseInteger(raw.BYSETPOS);

  const weekdays: number[] = [];
  let ordinalFromByDay: number | null = null;
  if (raw.BYDAY) {
    const dayTokens = raw.BYDAY.split(",").map((token) => token.trim()).filter(Boolean);
    for (const token of dayTokens) {
      const match = /^([+-]?\d{1,2})?(SU|MO|TU|WE|TH|FR|SA)$/.exec(token.toUpperCase());
      if (!match) {
        continue;
      }

      const ordinalText = match[1];
      const weekdayToken = match[2];
      const weekday = WEEKDAY_TOKEN_TO_INDEX[weekdayToken];
      weekdays.push(weekday);

      if (ordinalText) {
        const parsedOrdinal = Number.parseInt(ordinalText, 10);
        if (!Number.isNaN(parsedOrdinal) && parsedOrdinal !== 0) {
          ordinalFromByDay = parsedOrdinal;
        }
      }
    }
  }

  const rule = sanitizeRecurrenceRule({
    frequency,
    interval,
    byWeekdays: weekdays,
    byMonthDay: byMonthDay ?? undefined,
    byMonth: byMonth ?? undefined,
    bySetPos: bySetPos ?? ordinalFromByDay ?? undefined,
    count: count ?? undefined,
    until: normalizeUntil(raw.UNTIL ?? "")
  });

  return rule;
}

function weekdayLabel(weekday: number, locale?: string) {
  const normalized = Math.min(6, Math.max(0, weekday));
  const base = new Date(Date.UTC(2024, 0, 7 + normalized, 12, 0, 0, 0));
  return new Intl.DateTimeFormat(locale ?? "en-GB", { weekday: "long" }).format(base);
}

function monthDayLabel(date: Date, locale?: string) {
  return new Intl.DateTimeFormat(locale ?? "en-GB", { month: "long", day: "numeric" }).format(date);
}

function ordinalLabel(value: number, locale?: string) {
  if ((locale ?? "en").toLowerCase().startsWith("pt")) {
    if (value === -1) return "ultimo";
    return `${Math.abs(value)}.o`;
  }

  if (value === -1) {
    return "last";
  }

  const abs = Math.abs(value);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return `${abs}st`;
  if (mod10 === 2 && mod100 !== 12) return `${abs}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${abs}rd`;
  return `${abs}th`;
}

export function describeRecurrenceRule(rule: EventRecurrenceRule | null | undefined, startAtIso: string, locale?: string) {
  const recurrence = sanitizeRecurrenceRule(rule);
  if (!recurrence) {
    return null;
  }

  const startAt = new Date(startAtIso);
  const startWeekday = startAt.getUTCDay();

  if (recurrence.frequency === "daily") {
    if (recurrence.interval === 1) {
      return "Daily";
    }
    return `Every ${recurrence.interval} days`;
  }

  if (recurrence.frequency === "weekly") {
    const weekdays = (recurrence.byWeekdays?.length ? recurrence.byWeekdays : [startWeekday]).map((weekday) => weekdayLabel(weekday, locale));
    if (weekdays.length === 5 && recurrence.byWeekdays?.join(",") === "1,2,3,4,5" && recurrence.interval === 1) {
      return "Every weekday";
    }

    if (recurrence.interval === 1 && weekdays.length === 1) {
      return `Weekly on ${weekdays[0]}`;
    }

    return `Every ${recurrence.interval} weeks on ${weekdays.join(", ")}`;
  }

  if (recurrence.frequency === "monthly") {
    const weekdays = recurrence.byWeekdays?.length ? recurrence.byWeekdays : [startWeekday];
    const setPos = recurrence.bySetPos ?? getNthWeekdayInMonth(startAt);
    if (recurrence.bySetPos || recurrence.byWeekdays) {
      if (recurrence.interval === 1) {
        return `Monthly on the ${ordinalLabel(setPos, locale)} ${weekdayLabel(weekdays[0]!, locale)}`;
      }
      return `Every ${recurrence.interval} months on the ${ordinalLabel(setPos, locale)} ${weekdayLabel(weekdays[0]!, locale)}`;
    }

    const day = recurrence.byMonthDay ?? startAt.getUTCDate();
    if (recurrence.interval === 1) {
      return `Monthly on day ${day}`;
    }
    return `Every ${recurrence.interval} months on day ${day}`;
  }

  const month = recurrence.byMonth ?? startAt.getUTCMonth() + 1;
  const day = recurrence.byMonthDay ?? startAt.getUTCDate();
  const displayDate = new Date(Date.UTC(startAt.getUTCFullYear(), month - 1, day, 12, 0, 0, 0));
  if (recurrence.interval === 1) {
    return `Annually on ${monthDayLabel(displayDate, locale)}`;
  }
  return `Every ${recurrence.interval} years on ${monthDayLabel(displayDate, locale)}`;
}

function matchesRuleOnUtcDate(day: Date, startAt: Date, rule: EventRecurrenceRule) {
  const diffDays = daysBetweenUtc(startAt, day);
  if (diffDays < 0) {
    return false;
  }

  const weekday = day.getUTCDay();
  const startWeekday = startAt.getUTCDay();
  const weekdays = rule.byWeekdays && rule.byWeekdays.length > 0 ? rule.byWeekdays : [startWeekday];
  const interval = Math.max(1, rule.interval || 1);

  if (rule.frequency === "daily") {
    return diffDays % interval === 0;
  }

  if (rule.frequency === "weekly") {
    const weekDiff = Math.floor(diffDays / 7);
    return weekDiff % interval === 0 && weekdays.includes(weekday);
  }

  if (rule.frequency === "monthly") {
    const monthDiff = monthsBetweenUtc(startAt, day);
    if (monthDiff < 0 || monthDiff % interval !== 0) {
      return false;
    }

    if (rule.bySetPos && weekdays.length > 0) {
      return weekdays.some((entry) => isNthWeekdayOfMonth(day, entry, rule.bySetPos!));
    }

    if (rule.byMonthDay) {
      return day.getUTCDate() === rule.byMonthDay;
    }

    if (rule.byWeekdays && rule.byWeekdays.length > 0) {
      return weekdays.includes(weekday);
    }

    return day.getUTCDate() === startAt.getUTCDate();
  }

  const yearDiff = day.getUTCFullYear() - startAt.getUTCFullYear();
  if (yearDiff < 0 || yearDiff % interval !== 0) {
    return false;
  }

  const targetMonth = (rule.byMonth ?? startAt.getUTCMonth() + 1) - 1;
  if (day.getUTCMonth() !== targetMonth) {
    return false;
  }

  if (rule.bySetPos && weekdays.length > 0) {
    return weekdays.some((entry) => isNthWeekdayOfMonth(day, entry, rule.bySetPos!));
  }

  const targetDay = rule.byMonthDay ?? startAt.getUTCDate();
  return day.getUTCDate() === targetDay;
}

export function expandEventOccurrences<T extends RecurringEventBase>(
  event: T,
  rangeStart: Date,
  rangeEnd: Date,
  options?: { maxOccurrences?: number }
): Array<EventOccurrence<T>> {
  const startAt = new Date(event.startAt);
  const endAt = new Date(event.endAt);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt.getTime() < startAt.getTime()) {
    return [];
  }

  const rangeStartValue = new Date(rangeStart);
  const rangeEndValue = new Date(rangeEnd);
  if (Number.isNaN(rangeStartValue.getTime()) || Number.isNaN(rangeEndValue.getTime()) || rangeEndValue < rangeStartValue) {
    return [];
  }

  const durationMs = endAt.getTime() - startAt.getTime();
  const recurrenceRule = sanitizeRecurrenceRule(event.recurrenceRule ?? null);
  const maxOccurrences = Math.max(1, options?.maxOccurrences ?? 500);

  if (!recurrenceRule) {
    const overlaps = startAt <= rangeEndValue && endAt >= rangeStartValue;
    if (!overlaps) {
      return [];
    }

    return [
      {
        ...event,
        sourceEventId: event.id,
        occurrenceId: `${event.id}:0`,
        occurrenceIndex: 0,
        occurrenceStartAt: startAt.toISOString(),
        occurrenceEndAt: endAt.toISOString()
      }
    ];
  }

  const untilDate = recurrenceRule.until ? new Date(recurrenceRule.until) : null;
  const countLimit = recurrenceRule.count ?? null;
  const results: Array<EventOccurrence<T>> = [];
  let occurrenceNumber = 0;

  const overlapLookbackDays = Math.min(31, Math.max(1, Math.ceil(durationMs / 86_400_000)));
  const iterationStart = startOfUtcDay(new Date(Math.min(startAt.getTime(), addUtcDays(rangeStartValue, -overlapLookbackDays).getTime())));
  const iterationEnd = startOfUtcDay(rangeEndValue);
  const maxIterationDays = Math.max(366, Math.min(366 * 200, daysBetweenUtc(iterationStart, iterationEnd) + 366));
  let cursor = iterationStart;

  for (let guard = 0; guard <= maxIterationDays && cursor <= iterationEnd; guard += 1) {
    if (matchesRuleOnUtcDate(cursor, startAt, recurrenceRule)) {
      const occurrenceStart = combineUtcDateAndTime(cursor, startAt);
      if (occurrenceStart < startAt) {
        cursor = addUtcDays(cursor, 1);
        continue;
      }

      if (untilDate && occurrenceStart > untilDate) {
        break;
      }

      occurrenceNumber += 1;
      if (countLimit && occurrenceNumber > countLimit) {
        break;
      }

      const occurrenceEnd = new Date(occurrenceStart.getTime() + durationMs);
      if (occurrenceStart <= rangeEndValue && occurrenceEnd >= rangeStartValue) {
        results.push({
          ...event,
          sourceEventId: event.id,
          occurrenceId: `${event.id}:${occurrenceNumber}`,
          occurrenceIndex: occurrenceNumber,
          occurrenceStartAt: occurrenceStart.toISOString(),
          occurrenceEndAt: occurrenceEnd.toISOString()
        });

        if (results.length >= maxOccurrences) {
          break;
        }
      }
    }

    cursor = addUtcDays(cursor, 1);
  }

  return results;
}
