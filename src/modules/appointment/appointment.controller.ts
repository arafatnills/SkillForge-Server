import type { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AppointmentServices } from "./appointment.service";

const bookAppointment = catchAsync(async (req: Request, res: Response) => {
  const result = await AppointmentServices.bookAppointmentQuery();
  sendResponse(res, {
    success: true,
    status: status.CREATED,
    message: "Payment URL created Successfully!",
    data: result,
  });
});

// callback
const bookAppointmentCallback = catchAsync(
  async (req: Request, res: Response) => {
    const result = await AppointmentServices.bookAppointmentCallbackQuery(
      req.query,
    );
    sendResponse(res, {
      success: true,
      status: status.OK,
      message: "Appointment Successfully!",
      data: result,
    });
  },
);

export const AppointmentControllers = {
  bookAppointment,
  bookAppointmentCallback,
};
