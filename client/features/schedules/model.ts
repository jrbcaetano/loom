import { z } from "zod";

export const scheduleCategorySchema = z.enum(["work", "school", "sport", "custom"]);

const timeStringSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time");
const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");
export const scheduleColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color");

export const scheduleTemplateSchema = z.object({
  familyId: z.string().uuid(),
  title: z.string().trim().min(1).max(180),
  category: scheduleCategorySchema.default("custom"),
  location: z.string().trim().max(240).optional().nullable(),
  startsAtLocal: timeStringSchema,
  endsAtLocal: timeStringSchema,
  spansNextDay: z.boolean().default(false),
  notes: z.string().trim().max(5000).optional().nullable()
});

export const scheduleBlockSchema = z.object({
  id: z.string().uuid().optional(),
  templateId: z.string().uuid().optional().nullable(),
  weekIndex: z.number().int().min(1).max(12),
  weekday: z.number().int().min(0).max(6),
  title: z.string().trim().min(1).max(180),
  location: z.string().trim().max(240).optional().nullable(),
  startsAtLocal: timeStringSchema,
  endsAtLocal: timeStringSchema,
  spansNextDay: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(999).default(0)
});

export const schedulePauseSchema = z.object({
  id: z.string().uuid().optional(),
  startOn: dateStringSchema,
  endOn: dateStringSchema,
  reason: z.string().trim().max(500).optional().nullable()
});

export const scheduleOverrideBlockSchema = z.object({
  id: z.string().uuid().optional(),
  templateId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1).max(180),
  location: z.string().trim().max(240).optional().nullable(),
  startsAtLocal: timeStringSchema,
  endsAtLocal: timeStringSchema,
  spansNextDay: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(999).default(0)
});

export const scheduleOverrideDaySchema = z.object({
  id: z.string().uuid().optional(),
  overrideDate: dateStringSchema,
  notes: z.string().trim().max(500).optional().nullable(),
  blocks: z.array(scheduleOverrideBlockSchema).max(12).default([])
});

export const scheduleSeriesSchema = z.object({
  familyId: z.string().uuid(),
  familyMemberId: z.string().uuid(),
  title: z.string().trim().min(1).max(180),
  category: scheduleCategorySchema.default("custom"),
  color: scheduleColorSchema.default("#7c88d9"),
  location: z.string().trim().max(240).optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
  startsOn: dateStringSchema,
  endsOn: dateStringSchema.optional().nullable(),
  cycleLengthWeeks: z.number().int().min(1).max(12).default(1),
  isEnabled: z.boolean().default(true),
  blocks: z.array(scheduleBlockSchema).max(96),
  pauses: z.array(schedulePauseSchema).max(40).default([]),
  overrideDays: z.array(scheduleOverrideDaySchema).max(400).default([])
}).superRefine((value, context) => {
  if (value.category === "work") {
    if (!value.endsOn) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsOn"],
        message: "Work schedules require an end date"
      });
    }
    return;
  }

  if (value.blocks.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["blocks"],
      message: "At least one schedule block is required"
    });
  }
});

export type ScheduleCategory = z.infer<typeof scheduleCategorySchema>;
export type ScheduleTemplateInput = z.infer<typeof scheduleTemplateSchema>;
export type ScheduleBlockInput = z.infer<typeof scheduleBlockSchema>;
export type SchedulePauseInput = z.infer<typeof schedulePauseSchema>;
export type ScheduleOverrideBlockInput = z.infer<typeof scheduleOverrideBlockSchema>;
export type ScheduleOverrideDayInput = z.infer<typeof scheduleOverrideDaySchema>;
export type ScheduleSeriesInput = z.infer<typeof scheduleSeriesSchema>;

export type ScheduleTemplateRow = {
  id: string;
  familyId: string;
  title: string;
  category: ScheduleCategory;
  location: string | null;
  startsAtLocal: string;
  endsAtLocal: string;
  spansNextDay: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ScheduleBlockRow = {
  id: string;
  scheduleId: string;
  templateId: string | null;
  weekIndex: number;
  weekday: number;
  title: string;
  location: string | null;
  startsAtLocal: string;
  endsAtLocal: string;
  spansNextDay: boolean;
  sortOrder: number;
};

export type SchedulePauseRow = {
  id: string;
  scheduleId: string;
  startOn: string;
  endOn: string;
  reason: string | null;
};

export type ScheduleOverrideBlockRow = {
  id: string;
  overrideDayId: string;
  templateId: string | null;
  title: string;
  location: string | null;
  startsAtLocal: string;
  endsAtLocal: string;
  spansNextDay: boolean;
  sortOrder: number;
};

export type ScheduleOverrideDayRow = {
  id: string;
  scheduleId: string;
  overrideDate: string;
  notes: string | null;
  blocks: ScheduleOverrideBlockRow[];
};

export type ScheduleSeriesRow = {
  id: string;
  familyId: string;
  familyMemberId: string;
  familyMemberName: string;
  familyMemberRole: "admin" | "adult" | "child";
  title: string;
  category: ScheduleCategory;
  color: string;
  location: string | null;
  notes: string | null;
  startsOn: string;
  endsOn: string | null;
  cycleLengthWeeks: number;
  isEnabled: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  blocks: ScheduleBlockRow[];
  pauses: SchedulePauseRow[];
  overrideDays: ScheduleOverrideDayRow[];
};

export type ScheduleOccurrence = {
  id: string;
  sourceScheduleId: string;
  familyMemberId: string;
  familyMemberName: string;
  familyMemberRole: "admin" | "adult" | "child";
  scheduleTitle: string;
  title: string;
  category: ScheduleCategory;
  color: string;
  location: string | null;
  occurrenceDate: string;
  startsAtLocal: string;
  endsAtLocal: string;
  spansNextDay: boolean;
  source: "base" | "override";
};
