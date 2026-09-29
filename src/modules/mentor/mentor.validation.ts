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

const rejectMentorApplicationValidationZodSchema = z.object({
	applicationId: z.string("Invalid application ID"),
	rejectionReason: z
		.string()
		.max(255, "Rejection reason must be less than 255 characters"),
});

const verifyMentorApplicationOtpZodSchema = z.object({
	otp: z.string("Invalid OTP").length(6),
});

export const mentorValidation = {
	applyAsMentorValidationZodSchema,
	approvedMentorEmailValidationZodSchema,
	rejectMentorApplicationValidationZodSchema,
	verifyMentorApplicationOtpZodSchema,
};
