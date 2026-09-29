import { Router } from "express";
import { Role } from "../../generated/prisma/enums";
import { upload } from "../../lib/multer";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { MentorControllers } from "./mentor.controller";
import { mentorValidation } from "./mentor.validation";

const router = Router();

// apply as mentor
router.post(
	"/apply-as-mentor",
	upload.fields([
		{
			name: "resume",
			maxCount: 1,
		},
		{
			name: "additionalFiles",
			maxCount: 5,
		},
	]),
	auth(Role.LEARNER, Role.ADMIN, Role.MENTOR),
	MentorControllers.applyAsMentor,
);

// approved mentor
router.post(
	"/mentor-approved",
	validateRequest(mentorValidation.approvedMentorEmailValidationZodSchema),
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	MentorControllers.approvedMentor,
);

// rejected mentor
router.post(
	"/mentor-reject",
	validateRequest(mentorValidation.rejectMentorApplicationValidationZodSchema),
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	MentorControllers.rejectMentorApplication,
);

// get all mentors
router.get(
	"/all-mentors",
	// validateRequest(mentorValidation.approvedMentorEmailValidationZodSchema),
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	MentorControllers.getAllMentors,
);

// verify OTP
router.post(
	"/verify-otp",
	validateRequest(mentorValidation.verifyMentorApplicationOtpZodSchema),
	auth(Role.LEARNER),

	MentorControllers.verifyMentorOtp,
);

// resent otp
router.post(
	"/resent-otp",
	auth(Role.LEARNER, Role.ADMIN),
	MentorControllers.resendMentorOtp,
);

export const MentorRoutes = router;
