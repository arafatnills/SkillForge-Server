import z from "zod";

const applyAsMentorValidationZodSchema = z.object({
	name: z.string(),
	email: z.email("Invalid email address"),

	phone: z.string().min(5).max(20).optional(),
	address: z.string().max(255).optional(),
	expertise: z.string().max(255).optional(),
	experienceYears: z.number("Experience years must be a number"),
	bio: z.string().max(255).optional(),
	appointmentFee: z.number("Appointment fee must be a number").optional(),
});

const approvedMentorEmailValidationZodSchema = z.object({
	email: z.email("Invalid email address"),
});

export const mentorValidation = {
	applyAsMentorValidationZodSchema,
	approvedMentorEmailValidationZodSchema,
};
