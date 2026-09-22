import { Router } from "express";
import { AuthControllers } from "./auth.controller";
import { UserValidation } from "./auth.validation";
import { validateRequest } from "../../middleware/validateRequest";

const router = Router();

router.post(
	"/register",
	validateRequest(UserValidation.createUserZodSchema),
	AuthControllers.createUser,
);
router.post(
	"/verify-email",
	validateRequest(UserValidation.verifyUserEmailZodSchema),
	AuthControllers.verifyUserEmail,
);
router.post(
	"/login",
	validateRequest(UserValidation.loginUserZodSchema),
	AuthControllers.loginUser,
);
router.post(
	"/google",
	validateRequest(UserValidation.googleLoginZodSchema),
	AuthControllers.googleLogin,
);
router.post(
	"/forgot-password",
	validateRequest(UserValidation.forgotPasswordZodSchema),
	AuthControllers.forgotPassword,
);
router.post(
	"/reset-password",
	validateRequest(UserValidation.resetPasswordZodSchema),
	AuthControllers.resetPassword,
);

export const AuthRoutes = router;
