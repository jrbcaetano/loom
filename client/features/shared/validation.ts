import { z } from "zod";

export const visibilitySchema = z.enum(["private", "family", "selected_members"]);

export const uuidSchema = z.string().uuid();

export const nonEmptyTextSchema = z.string().trim().min(1);
