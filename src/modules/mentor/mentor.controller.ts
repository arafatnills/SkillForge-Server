import type { NextFunction, Request, Response } from "express";
import status from "http-status";
import { AppError } from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { MentorServices } from "./mentor.service";
import { mentorValidation } from "./mentor.validation";

// apply as mentor
const applyAsMentor = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const files = req.files as { [fieldname: string]: Express.Multer.File[] };

		const data = JSON.parse(req.body.data);
		const validationResult =
			mentorValidation.applyAsMentorValidationZodSchema.safeParse(data);

		if (!validationResult.success) {
			throw new AppError(status.BAD_REQUEST, validationResult.error.message);
		}

		const payload = validationResult.data;

		const resume = files?.resume ? files.resume[0] : null;
		const additionalFiles = files?.additionalFiles ? files.additionalFiles : [];
		const user = req.user!;

		await MentorServices.applyAsMentorQuery(
			payload,
			resume!,
			additionalFiles,
			user,
		);
		sendResponse(res, {
			success: true,
			status: status.OK,
			message: `Apply as Mentor Application Successfully!`,
			data: null,
		});
	},
);
// approve mentor application
const approvedMentor = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const payload = req.body;
		const reviewer = req.user!;
		const result = await MentorServices.approvedMentorQuery(payload, reviewer);
		sendResponse(res, {
			success: true,
			status: status.OK,
			message: "Mentor email verified successfully!",
			data: result,
		});
	},
);
// reject mentor application
const rejectMentorApplication = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const payload = req.body;
		const reviewer = req.user!;
		const result = await MentorServices.rejectMentorApplicationQuery(
			payload,
			reviewer,
		);
		sendResponse(res, {
			success: true,
			status: status.OK,
			message: "Mentor application rejected successfully!",
			data: result,
		});
	},
);

// get all mentors
const getAllMentors = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const { data, meta } = await MentorServices.getAllMentorsQuery(req.query);
		sendResponse(res, {
			success: true,
			status: status.OK,
			message: "All mentors retrieved successfully!",
			data: data,
			meta: meta,
			total: meta.total,
		});
	},
);

// verify OTP
const verifyMentorOtp = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const otp = req.body;
		const user = req.user!;
		const result = await MentorServices.verifyMentorOtpQuery(otp, user);
		sendResponse(res, {
			success: true,
			status: status.OK,
			message: "OTP Verify Successfully!",
			data: result,
		});
	},
);
// resent OTP
const resendMentorOtp = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const user = req.user!;
		const result = await MentorServices.resendMentorOtpQuery(user);
		sendResponse(res, {
			success: true,
			status: status.OK,
			message: "OTP resent Successfully!",
			data: result,
		});
	},
);

export const MentorControllers = {
	applyAsMentor,
	approvedMentor,
	rejectMentorApplication,
	getAllMentors,
	verifyMentorOtp,
	resendMentorOtp,
};
