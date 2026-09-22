import { Router } from "express";
import { Role } from "../../generated/prisma/enums";
import { upload } from "../../lib/multer";
import { auth } from "../../middleware/checkAuth";
import { UserControllers } from "./user.controller";

const router = Router();

router.patch(
	"/profile-image",
	auth(Role.ADMIN, Role.LEARNER, Role.MENTOR, Role.SUPER_ADMIN),
	upload.single("profileImage"),
	UserControllers.uploadProfileImage,
);

export const UserRoutes = router;
