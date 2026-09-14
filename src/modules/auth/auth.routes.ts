import { NextFunction, Request, Response, Router } from "express";
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
	"/login",
	validateRequest(UserValidation.loginUserZodSchema),
	AuthControllers.loginUser,
);

export const AuthRoutes = router;
