import type { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ScheduleServices } from "./schedule.service";

// create schedule
const createSchedule = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user!;
  const result = await ScheduleServices.createScheduleQuery(payload, user);
  sendResponse(res, {
    success: true,
    status: status.OK,
    message: "Schedule Created successfully!",
    data: result,
  });
});

// get mentor schedule
const getMySchedule = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await ScheduleServices.getMentorScheduleQuery(req.query, user);
  sendResponse(res, {
    success: true,
    status: status.OK,
    message: "Schedule Retrieved successfully!",
    data: result,
  });
});

// get all schedule
const getAllSchedule = catchAsync(async (req: Request, res: Response) => {
  const result = await ScheduleServices.getAllScheduleQuery(req.query);
  sendResponse(res, {
    success: true,
    status: status.OK,
    message: "Schedule Retrieved successfully!",
    data: result,
  });
});

// update schedule
const updateSchedule = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const payload = req.body;
  const scheduleId = req.params.scheduleId as string;
  const result = await ScheduleServices.updateScheduleQuery(
    scheduleId,
    payload,
    user,
  );
  sendResponse(res, {
    success: true,
    status: status.OK,
    message: "Schedule Updated successfully!",
    data: result,
  });
});

// update schedule
const publishSchedule = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const scheduleId = req.params.scheduleId as string;
  const result = await ScheduleServices.publicScheduleQuery(scheduleId, user);
  sendResponse(res, {
    success: true,
    status: status.OK,
    message: "Schedule Published successfully!",
    data: result,
  });
});

// delete schedule
const deleteSchedule = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const scheduleId = req.params.scheduleId as string;
  const result = await ScheduleServices.deleteScheduleQuery(scheduleId, user);
  sendResponse(res, {
    success: true,
    status: status.OK,
    message: "Schedule Deleted successfully!",
    data: result,
  });
});

// get Todays schedule
const getTodaysSchedules = catchAsync(async (req: Request, res: Response) => {
  const result = await ScheduleServices.getTodaysSchedulesQuery(req.query);
  sendResponse(res, {
    success: true,
    status: status.OK,
    message: "Todays Schedule Retrieved successfully!",
    data: result,
  });
});

export const ScheduleControllers = {
  createSchedule,
  getMySchedule,
  getAllSchedule,
  updateSchedule,
  publishSchedule,
  deleteSchedule,
  getTodaysSchedules,
};
