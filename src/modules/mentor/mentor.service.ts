import type { UploadApiResponse } from "cloudinary";
import crypto, { createHash } from "crypto";
import ejs from "ejs";
import status from "http-status";
import path from "path";
import config from "../../config";
import { Role } from "../../generated/prisma/enums";
import type { MentorWhereInput } from "../../generated/prisma/models";
import type { IQueryInterface } from "../../interfaces";
import { cloudinary } from "../../lib/cloudinary";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import { redisClient } from "../../lib/redis";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { deleteCloudinaryFile } from "../../utils/deleteCloudinaryFile";
import type {
	approvedMentorEmailInterface,
	MentorApplicationInterface,
	RejectApplicationInterface,
	VerifyMentorOtpInterface,
} from "./mentor.interface";

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

const OTP_TTL_SECONDS = 60 * 60; // 1 hour
const MAX_OTP_ATTEMPTS = 5;

const otpKey = (email: string) => `mentor-otp:${email}`;
const otpAttemptsKey = (email: string) => `mentor-otp-attempts:${email}`;

const hashOtp = (otp: string) => createHash("sha256").update(otp).digest("hex");

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const renderTemplate = (file: string, data: Record<string, unknown>) =>
	ejs.renderFile(path.join(process.cwd(), "/src/templates", file), data);

const uploadToCloudinary = (file: Express.Multer.File, folder: string) =>
	new Promise<UploadApiResponse>((resolve, reject) => {
		cloudinary.uploader
			.upload_stream({ resource_type: "auto", folder }, (err, result) => {
				if (err) return reject(err);
				if (!result) {
					return reject(
						new AppError(
							status.NOT_FOUND,
							"No result returned from cloudinary!",
						),
					);
				}
				resolve(result);
			})
			.end(file.buffer);
	});

// generate OTP -> save (hashed) in redis for 1 hour -> email it
const sendMentorOtp = async (name: string, email: string) => {
	const otp = generateOtp();

	await redisClient.set(otpKey(email), hashOtp(otp), { EX: OTP_TTL_SECONDS });
	await redisClient.del(otpAttemptsKey(email));

	const html = await renderTemplate("verify-email.ejs", {
		name,
		otp,
		expiresIn: "1 hour",
	});

	await transporter.sendMail({
		from: config.smtp_sender,
		to: email,
		subject: "Verify your mentor application",
		html,
	});
};

/* -------------------------------------------------------------------------- */
/*                              1. Apply as mentor                            */
/* -------------------------------------------------------------------------- */

const applyAsMentorQuery = async (
	payload: MentorApplicationInterface,
	resume: Express.Multer.File,
	additionalFiles: Express.Multer.File[],
	user: RequestUser,
) => {
	const existingUser = await prisma.user.findUnique({
		where: { email: user.email },
	});

	if (!existingUser) {
		throw new AppError(
			status.NOT_FOUND,
			"User Not Found Please Log in to Apply!",
		);
	}

	if (existingUser.role === Role.MENTOR) {
		throw new AppError(status.CONFLICT, "You are already a mentor!");
	}

	if (existingUser.status === "BLOCKED") {
		throw new AppError(status.CONFLICT, "User Already Blocked!");
	}

	if (existingUser.status === "DELETED") {
		throw new AppError(status.CONFLICT, "User Already Deleted!");
	}

	// Mentor table e already request ache kina
	const existingMentor = await prisma.mentor.findUnique({
		where: { email: user.email },
	});

	if (existingMentor) {
		switch (existingMentor.verificationStatus) {
			case "OTP_PENDING":
				throw new AppError(
					status.CONFLICT,
					"Please verify the OTP sent to your email, or request a new OTP!",
				);
			case "PENDING":
				throw new AppError(
					status.CONFLICT,
					"Your application is already under review!",
				);
			case "APPROVED":
				throw new AppError(status.CONFLICT, "You are already a mentor!");
			default:
				throw new AppError(status.CONFLICT, "You already applied!");
		}
	}

	// upload files
	const uploadedResume = await uploadToCloudinary(resume, "resume");
	const uploadedAdditional = await Promise.all(
		additionalFiles.map((file) => uploadToCloudinary(file, "additionalFiles")),
	);

	// create mentor with OTP_PENDING (role is still LEARNER)
	try {
		await prisma.mentor.create({
			data: {
				name: user.name,
				email: user.email,
				userId: existingUser.id,
				experienceYears: payload.experienceYears,
				resume: uploadedResume.secure_url,
				resumePublicId: uploadedResume.public_id,
				additionalFiles: uploadedAdditional.map((file) => ({
					url: file.secure_url,
					publicId: file.public_id,
					resourceType: file.resource_type,
				})),
				verificationStatus: "OTP_PENDING",
			},
		});
	} catch (error) {
		await Promise.all([
			deleteCloudinaryFile(uploadedResume.public_id),
			...uploadedAdditional.map((f) => deleteCloudinaryFile(f.public_id)),
		]);
		throw error;
	}

	await sendMentorOtp(user.name, user.email);

	return {
		message:
			"OTP sent to your email. Please verify within 1 hour to submit your application.",
	};
};

/* -------------------------------------------------------------------------- */
/*                               2. Verify OTP                                */
/* -------------------------------------------------------------------------- */

const verifyMentorOtpQuery = async (
	payload: VerifyMentorOtpInterface,
	user: RequestUser,
) => {
	console.log(user);
	const mentor = await prisma.mentor.findUnique({
		where: { email: user.email },
	});

	if (!mentor) {
		throw new AppError(status.NOT_FOUND, "Mentor request not found!");
	}

	if (mentor.verificationStatus !== "OTP_PENDING") {
		throw new AppError(
			status.CONFLICT,
			`Your application is already ${mentor.verificationStatus}!`,
		);
	}

	const attempts = Number(
		(await redisClient.get(otpAttemptsKey(user.email))) ?? 0,
	);
	if (attempts >= MAX_OTP_ATTEMPTS) {
		throw new AppError(
			status.TOO_MANY_REQUESTS,
			"Too many wrong attempts. Please request a new OTP!",
		);
	}

	const storedHash = await redisClient.get(otpKey(user.email));
	if (!storedHash) {
		throw new AppError(
			status.BAD_REQUEST,
			"OTP expired! Please request a new OTP.",
		);
	}

	if (storedHash !== hashOtp(String(payload.otp).trim())) {
		const key = otpAttemptsKey(user.email);
		await redisClient.incr(key);
		await redisClient.expire(key, OTP_TTL_SECONDS);
		throw new AppError(status.BAD_REQUEST, "Invalid OTP!");
	}

	const updatedMentor = await prisma.mentor.update({
		where: { id: mentor.id },
		data: { verificationStatus: "PENDING" },
	});

	await redisClient.del([otpKey(user.email), otpAttemptsKey(user.email)]);

	const html = await renderTemplate("mentor-application.ejs", {
		name: mentor.name,
		message:
			"Thank you for verifying your email. Our review team usually takes 3 to 5 business days to verify mentor credentials.",
	});

	await transporter.sendMail({
		from: config.smtp_sender,
		to: user.email,
		subject: "Mentor Application Submitted!",
		html,
	});

	return updatedMentor;
};

/* -------------------------------------------------------------------------- */
/*                               3. Resend OTP                                */
/* -------------------------------------------------------------------------- */

const resendMentorOtpQuery = async (user: RequestUser) => {
	const mentor = await prisma.mentor.findUnique({
		where: { email: user.email },
	});

	if (!mentor) {
		throw new AppError(status.NOT_FOUND, "Mentor request not found!");
	}

	if (mentor.verificationStatus !== "OTP_PENDING") {
		throw new AppError(
			status.CONFLICT,
			"OTP verification is not required for your application!",
		);
	}

	await sendMentorOtp(mentor.name, mentor.email);

	return { message: "A new OTP has been sent to your email." };
};

/* -------------------------------------------------------------------------- */
/*                                 4. Approve                                 */
/* -------------------------------------------------------------------------- */

const approvedMentorQuery = async (
	payload: approvedMentorEmailInterface,
	reviewer: RequestUser,
) => {
	const email = payload.email.trim().toLowerCase();
	if (!email) {
		throw new AppError(status.BAD_REQUEST, "Email is required!");
	}

	const mentor = await prisma.mentor.findUnique({ where: { email } });

	if (!mentor) {
		throw new AppError(status.NOT_FOUND, "Mentor Application Not Found!");
	}

	if (mentor.verificationStatus === "APPROVED") {
		throw new AppError(status.CONFLICT, "Mentor Application Already Approved!");
	}

	if (mentor.verificationStatus !== "PENDING") {
		throw new AppError(
			status.CONFLICT,
			`Application status is ${mentor.verificationStatus}`,
		);
	}

	const trxResult = await prisma.$transaction(async (tx) => {
		const approvedMentor = await tx.mentor.update({
			where: { id: mentor.id },
			data: {
				verificationStatus: "APPROVED",
				reviewedBy: reviewer.email,
				reviewedAt: new Date(),
			},
		});

		const updatedUser = await tx.user.update({
			where: { id: mentor.userId },
			data: { role: Role.MENTOR },
			omit: { password: true },
			include: { Learner: true, mentor: true },
		});

		return { mentor: approvedMentor, user: updatedUser };
	});

	const html = await renderTemplate("mentor-application-approved.ejs", {
		name: mentor.name,
		message:
			"Congratulations! Your mentor application has been approved. You can now log in and start mentoring.",
	});

	await transporter.sendMail({
		from: config.smtp_sender,
		to: mentor.email,
		subject: "Mentor Application Approved",
		html,
	});

	return trxResult;
};

/* -------------------------------------------------------------------------- */
/*                                  5. Reject                                 */
/* -------------------------------------------------------------------------- */

// NOTE: payload.applicationId ekhon Mentor.id (MentorApplication model nai)
const rejectMentorApplicationQuery = async (
	payload: RejectApplicationInterface,
	reviewer: RequestUser,
) => {
	const mentor = await prisma.mentor.findUnique({
		where: { id: payload.applicationId },
	});

	if (!mentor) {
		throw new AppError(status.NOT_FOUND, "Mentor Application Not Found!");
	}

	if (mentor.verificationStatus !== "PENDING") {
		throw new AppError(
			status.CONFLICT,
			"Only pending applications can be rejected!",
		);
	}

	// cloudinary files delete
	if (mentor.resumePublicId) {
		await deleteCloudinaryFile(mentor.resumePublicId);
	}

	if (mentor.additionalFiles) {
		const files = mentor.additionalFiles as Array<{
			url: string;
			publicId: string;
			resourceType?: string;
		}>;
		await Promise.all(
			files.map((file) =>
				file.publicId ? deleteCloudinaryFile(file.publicId) : null,
			),
		);
	}

	// rejected hole record delete hoye jabe -> user abar apply korte parbe
	// (jodi rejected record rekhe dite chao, delete er jaygay update kore
	// verificationStatus: "REJECTED" + rejectionReason set koro)
	await prisma.mentor.delete({ where: { id: mentor.id } });

	const html = await renderTemplate("mentor-application-rejected.ejs", {
		name: mentor.name,
		reason: `Your mentor application has been rejected. Reason: ${payload.rejectionReason}`,
	});

	await transporter.sendMail({
		from: config.smtp_sender,
		to: mentor.email,
		subject: "Mentor Application Rejected",
		html,
	});

	return {
		...mentor,
		verificationStatus: "REJECTED" as const,
		rejectionReason: payload.rejectionReason,
		reviewedBy: reviewer.email,
		reviewedAt: new Date(),
	};
};

/* -------------------------------------------------------------------------- */
/*                               6. Get all mentors                           */
/* -------------------------------------------------------------------------- */

const getAllMentorsQuery = async (query: IQueryInterface) => {
	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "createdAt";
	const sortOrder = query.sortOrder ? query.sortOrder : "desc";

	const andConditions: MentorWhereInput[] = [];

	// searching
	if (query.searchTerm) {
		andConditions.push({
			OR: [
				{ name: { contains: query.searchTerm, mode: "insensitive" } },
				{ email: { contains: query.searchTerm, mode: "insensitive" } },
				{ expertise: { contains: query.searchTerm, mode: "insensitive" } },
			],
		});
	}

	// filtering
	if (query.name) {
		andConditions.push({
			name: { contains: query.name, mode: "insensitive" },
		});
	}
	if (query.expertise) {
		andConditions.push({
			expertise: { contains: query.expertise, mode: "insensitive" },
		});
	}
	if (query.email) {
		andConditions.push({
			email: { contains: query.email, mode: "insensitive" },
		});
	}

	// shudhu approved mentor gula dekhabe
	andConditions.push({ isDeleted: false, verificationStatus: "APPROVED" });

	const mentors = await prisma.mentor.findMany({
		where: { AND: andConditions },
		orderBy: { [sortBy]: sortOrder },
		skip,
		take: limit,
	});

	const totalMentors = await prisma.mentor.count({
		where: { AND: andConditions },
	});

	return {
		data: mentors,
		meta: {
			total: totalMentors,
			page,
			limit,
			totalPages: Math.ceil(totalMentors / limit),
		},
	};
};

export const MentorServices = {
	applyAsMentorQuery,
	verifyMentorOtpQuery,
	resendMentorOtpQuery,
	approvedMentorQuery,
	rejectMentorApplicationQuery,
	getAllMentorsQuery,
};
