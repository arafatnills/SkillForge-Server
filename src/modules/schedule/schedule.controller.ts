import type { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ScheduleServices } from "./schedule.service";

// create schedule
const createSchedule = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body
    const user = req.user!
    const result = await ScheduleServices.createScheduleQuery(payload, user)
    sendResponse(res, {
        success: true,
        status: status.OK,
        message: "Schedule Created successfully!",
        data: result,
    });
});

export const ScheduleControllers = { createSchedule };
