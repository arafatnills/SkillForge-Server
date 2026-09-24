import { Router } from "express";
import { Role } from "../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { AppointmentControllers } from "./appointment.controller";

const router = Router();

router.post(
  "/book-appointment",
  auth(Role.LEARNER),
  AppointmentControllers.bookAppointment,
);
router.post(
  "/pay-appointment",
  auth(Role.LEARNER),
  AppointmentControllers.payAppointment,
);
router.post(
  "/cancel-appointment",
  auth(Role.LEARNER),
  AppointmentControllers.cancelAppointment,
);

// bkash payment
router.get(
  "/book-appointment/payment/callback",
  AppointmentControllers.bookAppointmentCallback,
);

export const AppointmentRoutes = router;
