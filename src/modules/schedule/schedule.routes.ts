import { Router } from "express";
import { Role } from "../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { ScheduleControllers } from "./schedule.controller";

const router = Router();

// create schedule
router.post(
  "/create-schedule",
  auth(Role.ADMIN, Role.LEARNER, Role.MENTOR, Role.SUPER_ADMIN),
  ScheduleControllers.createSchedule,
);

export const ScheduleRoutes = router;
