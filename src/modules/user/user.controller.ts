import type { NextFunction, Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { UserServices } from "./user.services";

// create user
const createUser = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const payload = req.body;
		await UserServices.uploadProfileImage(payload);
		sendResponse(res, {
			success: true,
			status: status.CREATED,
			message: "OTP sent to your email",
			data: null,
		});
	},
);

export const UserControllers = {
	createUser,
};
