import z from "zod";

export const createUserZodSchema = z.object({
	name: z.string(),
	email: z.string().email("Invalid email address"),
	password: z
		.string()
		.min(6, { message: "Password must be at least 8 characters long" })
		.max(20, { message: "Password cannot exceed 20 characters" })
		.regex(/[A-Z]/, "Password must contain at least one uppercase letter")
		.regex(/[a-z]/, "Password must contain at least one lowercase letter")
		.regex(/[0-9]/, "Password must contain at least one number")
		.regex(
			/[!@#$%^&*]/,
			"Password must contain at least one special character (!@#$%^&*)",
		),
});

const loginUserZodSchema = z.object({
	email: z.email(),
	password: z
		.string()
		.min(8, "Password Must Minimum 8 Characters Long.")
		.regex(/[a-z]/, "Password must contain atleast 1 Lowercase Letter")
		.regex(/[A-Z]/, "Password must contain atleast 1 Uppercase Letter")

		.regex(/[0-9]/, "Password must contain atleast 1 Number")
		.regex(/[^A-Za-z0-9]/, "Password must contain atleast 1 Special Character"),
});

export const UserValidation = {
	createUserZodSchema,
	loginUserZodSchema,
};
