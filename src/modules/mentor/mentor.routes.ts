import { Router } from "express";
import { Role } from "../../generated/prisma/enums";
import { upload } from "../../lib/multer";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { MentorControllers } from "./mentor.controller";
import { mentorValidation } from "./mentor.validation";

const router = Router();

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
	auth(Role.LEARNER, Role.ADMIN),
	MentorControllers.applyAsMentor,
);
router.post(
	"/verify-mentor",
	validateRequest(mentorValidation.approvedMentorEmailValidationZodSchema),
	auth(Role.ADMIN, Role.SUPER_ADMIN), 
	MentorControllers.approvedMentor,
);
router.post(
	"/reject",
	// validateRequest(mentorValidation.approvedMentorEmailValidationZodSchema),
	auth(Role.ADMIN, Role.SUPER_ADMIN), 
	MentorControllers.rejectMentorApplication,
);

export const MentorRoutes = router;
