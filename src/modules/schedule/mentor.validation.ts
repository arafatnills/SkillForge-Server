import z from "zod";

export const createScheduleValidationZodSchema = z.object({
  startDateTime: z.coerce.date("Invalid start date and time"),
  endDateTime: z.coerce.date("Invalid end date and time"),
  meetingLink: z.url("Invalid meeting link").trim(),
});

export const updateScheduleValidationZodSchema = z.object({
  startDateTime: z.coerce.date("Invalid start date and time").optional(),
  endDateTime: z.coerce.date("Invalid end date and time").optional(),
  meetingLink: z.url("Invalid meeting link").trim().optional(),
});
