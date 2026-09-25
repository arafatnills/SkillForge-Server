import z from "zod";

export const applyAsMentorValidationZodSchema = z.object({
  user: z.object({
    name: z.string(),
    email: z.email("Invalid email address"),
  }),
  mentor: z.object({
    phone: z.string().min(5).max(20).optional(),
    address: z.string().max(255).optional(),
    expertise: z.string().max(255).optional(),
    experienceYears: z.number("Experience years must be a number"),
    bio: z.string().max(255).optional(),
    appointmentFee: z.number("Appointment fee must be a number").optional(),
  }),
});


const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = [
  'application/pdf', 
  'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
];

export const fileValidationSchema = z.object({
  fieldname: z.string(),
  originalname: z.string(),
  encoding: z.string(),
  mimetype: z.string().superRefine((val, ctx) => {
    if (!ACCEPTED_FILE_TYPES.includes(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only .pdf, .doc, .docx, .jpg, and .png files are accepted.",
      });
    }
  }),
  size: z.number().superRefine((val, ctx) => {
    if (val > MAX_FILE_SIZE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Max file size is 5MB.",
      });
    }
  }),
  buffer: z.instanceof(Buffer),
});
