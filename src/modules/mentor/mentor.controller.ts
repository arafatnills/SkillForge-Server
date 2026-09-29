import type { NextFunction, Request, Response } from "express";
import status from "http-status";
import { AppError } from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { MentorServices } from "./mentor.service";
import { mentorValidation } from "./mentor.validation";

// create user
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
// mentor email verification
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
// mentor email verification
const rejectMentorApplication = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const payload = req.body;
		const reviewer = req.user!;
		const result = await MentorServices.rejectMentorApplicationQuery(payload, reviewer);
		sendResponse(res, {
			success: true,
			status: status.OK,
			message: "Reject!",
			data: result,
		});
	},
);

export const MentorControllers = {
	applyAsMentor,
	approvedMentor,
	rejectMentorApplication
};
