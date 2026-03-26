import type {
  ScheduleBlockRow,
  ScheduleOccurrence,
  ScheduleOverrideDayRow,
  ScheduleSeriesRow
} from "@/features/schedules/model";

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function formatDateOnly(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
}

function differenceInCalendarDays(left: Date, right: Date) {
  const leftStart = startOfDay(left).getTime();
  const rightStart = startOfDay(right).getTime();
  return Math.round((leftStart - rightStart) / 86_400_000);
}

function overlapsDateRange(targetDate: Date, startOn: Date, endOn: Date | null) {
  const normalizedTarget = startOfDay(targetDate);
  if (normalizedTarget.getTime() < startOfDay(startOn).getTime()) {
    return false;
  }

  if (endOn && normalizedTarget.getTime() > startOfDay(endOn).getTime()) {
    return false;
  }

  return true;
}

function isPaused(date: Date, series: ScheduleSeriesRow) {
  return series.pauses.some((pause) => {
    const startOn = parseDateOnly(pause.startOn);
    const endOn = parseDateOnly(pause.endOn);
    if (!startOn || !endOn) {
      return false;
    }

    return overlapsDateRange(date, startOn, endOn);
  });
}

function getWeekIndex(date: Date, startsOn: Date, cycleLengthWeeks: number) {
  const dayDiff = differenceInCalendarDays(date, startsOn);
  const weeksFromStart = Math.floor(dayDiff / 7);
  return ((weeksFromStart % cycleLengthWeeks) + cycleLengthWeeks) % cycleLengthWeeks + 1;
}

function normalizeTime(value: string) {
  return value.length === 5 ? `${value}:00` : value;
}

function buildOccurrence(
  series: ScheduleSeriesRow,
  date: string,
  block: Pick<ScheduleBlockRow, "title" | "location" | "startsAtLocal" | "endsAtLocal" | "spansNextDay">,
  source: "base" | "override",
  index: number
): ScheduleOccurrence {
  return {
    id: `${series.id}:${date}:${source}:${index}`,
    sourceScheduleId: series.id,
    familyMemberId: series.familyMemberId,
    familyMemberName: series.familyMemberName,
    familyMemberRole: series.familyMemberRole,
    scheduleTitle: series.title,
    title: block.title,
    category: series.category,
    color: series.color,
    location: block.location ?? series.location,
    occurrenceDate: date,
    startsAtLocal: normalizeTime(block.startsAtLocal),
    endsAtLocal: normalizeTime(block.endsAtLocal),
    spansNextDay: block.spansNextDay,
    source
  };
}

function overrideOccurrences(series: ScheduleSeriesRow, overrideDay: ScheduleOverrideDayRow) {
  return overrideDay.blocks
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder || left.startsAtLocal.localeCompare(right.startsAtLocal))
    .map((block, index) => buildOccurrence(series, overrideDay.overrideDate, block, "override", index));
}

function baseOccurrences(series: ScheduleSeriesRow, date: Date) {
  const startsOn = parseDateOnly(series.startsOn);
  if (!startsOn) {
    return [];
  }

  const weekIndex = getWeekIndex(date, startsOn, series.cycleLengthWeeks);
  const weekday = date.getDay();
  const dateText = formatDateOnly(date);

  return series.blocks
    .filter((block) => block.weekIndex === weekIndex && block.weekday === weekday)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.startsAtLocal.localeCompare(right.startsAtLocal))
    .map((block, index) => buildOccurrence(series, dateText, block, "base", index));
}

export function expandScheduleOccurrences(
  series: ScheduleSeriesRow,
  rangeStart: Date,
  rangeEnd: Date
): ScheduleOccurrence[] {
  if (!series.isEnabled || series.archived) {
    return [];
  }

  const startsOn = parseDateOnly(series.startsOn);
  const endsOn = series.endsOn ? parseDateOnly(series.endsOn) : null;
  if (!startsOn) {
    return [];
  }

  const normalizedRangeStart = startOfDay(rangeStart);
  const normalizedRangeEnd = startOfDay(rangeEnd);
  const first = normalizedRangeStart.getTime() > startsOn.getTime() ? normalizedRangeStart : startsOn;
  const last = endsOn && normalizedRangeEnd.getTime() > endsOn.getTime() ? endsOn : normalizedRangeEnd;

  if (first.getTime() > last.getTime()) {
    return [];
  }

  const overrideMap = new Map(series.overrideDays.map((entry) => [entry.overrideDate, entry]));
  const occurrences: ScheduleOccurrence[] = [];

  for (let cursor = first; cursor.getTime() <= last.getTime(); cursor = addDays(cursor, 1)) {
    if (isPaused(cursor, series)) {
      continue;
    }

    const dateText = formatDateOnly(cursor);
    const overrideDay = overrideMap.get(dateText);
    if (overrideDay) {
      occurrences.push(...overrideOccurrences(series, overrideDay));
      continue;
    }

    occurrences.push(...baseOccurrences(series, cursor));
  }

  return occurrences;
}

export function expandSchedulesForFamily(seriesList: ScheduleSeriesRow[], rangeStart: Date, rangeEnd: Date) {
  return seriesList
    .flatMap((series) => expandScheduleOccurrences(series, rangeStart, rangeEnd))
    .sort((left, right) => {
      const dateComparison = left.occurrenceDate.localeCompare(right.occurrenceDate);
      if (dateComparison !== 0) {
        return dateComparison;
      }

      const timeComparison = left.startsAtLocal.localeCompare(right.startsAtLocal);
      if (timeComparison !== 0) {
        return timeComparison;
      }

      return left.familyMemberName.localeCompare(right.familyMemberName);
    });
}
