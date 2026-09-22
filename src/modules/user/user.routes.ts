import { Router } from "express";
import { UserControllers } from "./user.controller";

const router = Router();

router.patch("/profile-image", UserControllers.createUser);

export const UserRoutes = router;
