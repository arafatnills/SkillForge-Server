import type { NextFunction, Request, Response } from "express";
import status from "http-status";
import { AppError } from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { MentorServices } from "./mentor.service";
import { applyAsMentorValidationZodSchema } from "./mentor.validation";

// create user
const applyAsMentor = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    const data = JSON.parse(req.body.data);
    const validationResult = applyAsMentorValidationZodSchema.safeParse(data);

    if (!validationResult.success) {
      throw new AppError(status.BAD_REQUEST, validationResult.error.message);
    }

    const payload = validationResult.data;

    const resume = files?.resume ? files.resume[0] : null;
    const additionalFiles = files?.additionalFiles ? files.additionalFiles : [];

    console.log({ resume, additionalFiles, payload });
    const result = await MentorServices.applyAsMentorQuery(
      payload,
      resume!,
      additionalFiles,
    );
    sendResponse(res, {
      success: true,
      status: status.OK,
      message: "Applied As Mentor successfully!",
      data: result,
    });
  },
);

export const MentorControllers = {
  applyAsMentor,
};
