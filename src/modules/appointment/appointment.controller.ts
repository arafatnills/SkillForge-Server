import type { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AppointmentServices } from "./appointment.service";

const bookAppointment = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user!;

  const result = await AppointmentServices.bookAppointmentQuery(payload, user);
  sendResponse(res, {
    success: true,
    status: status.CREATED,
    message: "Payment URL created Successfully!",
    data: result,
  });
});
const payAppointment = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user!;

  const result = await AppointmentServices.payAppointmentQuery(payload, user);
  sendResponse(res, {
    success: true,
    status: status.CREATED,
    message: "Appointment Initiated Successfully!",
    data: result,
  });
});

// callback
const bookAppointmentCallback = catchAsync(
  async (req: Request, res: Response) => {
    const { redirectUrl } =
      await AppointmentServices.bookAppointmentCallbackQuery(req.query);
    res.redirect(redirectUrl);
    // sendResponse(res, {
    //   success: true,
    //   status: status.OK,
    //   message: "Appointment Successfully!",
    //   data: redirectUrl,
    // });
  },
);

// cancel appointment and refund
const cancelAppointment = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await AppointmentServices.cancelAppointmentQuery(payload);

  sendResponse(res, {
    success: true,
    status: status.OK,
    message: "Appointment Cancel & Refund Successfully!",
    data: result,
  });
});

export const AppointmentControllers = {
  bookAppointment,
  payAppointment,
  bookAppointmentCallback,
  cancelAppointment
};
