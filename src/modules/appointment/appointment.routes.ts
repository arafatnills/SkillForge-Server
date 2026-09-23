import { Router } from "express";
import { AppointmentControllers } from "./appointment.controller";

const router = Router();

router.post("/book-appointment", AppointmentControllers.bookAppointment);


// bkash payment
router.get("/book-appointment/payment/callback", AppointmentControllers.bookAppointmentCallback);

export const AppointmentRoutes = router;
