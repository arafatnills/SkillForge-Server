import { Router } from "express";
import { Role } from "../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { createScheduleValidationZodSchema, updateScheduleValidationZodSchema } from "./mentor.validation";
import { ScheduleControllers } from "./schedule.controller";

const router = Router();

// create schedule
router.post(
  "/create-schedule",
  auth(Role.ADMIN, Role.MENTOR, Role.SUPER_ADMIN),
  validateRequest(createScheduleValidationZodSchema),
  ScheduleControllers.createSchedule,
);

// get mentor schedule
router.get(
  "/get-my-schedule",
  auth(Role.ADMIN, Role.MENTOR, Role.SUPER_ADMIN),
  ScheduleControllers.getMySchedule,
);

// get all schedule
router.get(
  "/get-all-schedule",
  auth(Role.ADMIN, Role.SUPER_ADMIN),
  ScheduleControllers.getAllSchedule,
);

// update schedule
router.patch(
  "/update-schedule/:scheduleId",
  auth(Role.ADMIN, Role.MENTOR, Role.SUPER_ADMIN),
  validateRequest(updateScheduleValidationZodSchema),
  ScheduleControllers.updateSchedule,
);  

// publish schedule
router.patch(
  "/publish-schedule/:scheduleId",
  auth(Role.ADMIN, Role.MENTOR, Role.SUPER_ADMIN),
  ScheduleControllers.publishSchedule,
);

// delete schedule
router.delete(
  "/delete-schedule/:scheduleId",
  auth(Role.ADMIN, Role.MENTOR, Role.SUPER_ADMIN),
  ScheduleControllers.deleteSchedule,
);

// get today's schedules
router.get(
  "/get-todays-schedules",
  auth(Role.ADMIN, Role.LEARNER, Role.MENTOR, Role.SUPER_ADMIN),
  ScheduleControllers.getTodaysSchedules,
);

export const ScheduleRoutes = router;
