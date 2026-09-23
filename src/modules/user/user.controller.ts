import type { NextFunction, Request, Response } from "express";
import status from "http-status";
import { AppError } from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { UserServices } from "./user.service";

// create user
const uploadProfileImage = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		console.log(req.user?.userId);

		const payload = req.file?.buffer;
		const userId = req.user?.userId;
		if (!payload) {
			throw new AppError(status.NOT_FOUND, "File not found!");
		}
		const result = await UserServices.uploadProfileImageQuery(payload, userId!);
		sendResponse(res, {
			success: true,
			status: status.OK,
			message: "User profile updated successfully!",
			data: result,
		});
	},
);

export const UserControllers = {
	uploadProfileImage,
};
