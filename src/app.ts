import cookieParser from "cookie-parser";
import cors from "cors";
import crypto from "crypto";
import express, {
	type NextFunction,
	type Request,
	type Response,
} from "express";
import status from "http-status";
import config from "./config";
import { globalErrorHandler } from "./middleware/globalErrorHandeler";
import { AuthRoutes } from "./modules/auth/auth.routes";
import { UserRoutes } from "./modules/user/user.routes";
import sendResponse from "./utils/sendResponse";

const app = express();

app.use(
	cors({
		origin: [
			config.app_url,
			"http://localhost:3000",
			"http://localhost:5173",
		].filter(Boolean),
		credentials: true,
	}),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// test apis
app.get("/redis", async (req: Request, res: Response, next: NextFunction) => {
	try {
		// await redisClient.set("opt:nill@gmail.com", "123456", {
		//   expiration: {
		//     type: "EX",
		//     value: 60,
		//   },
		// });

		const opt = crypto.randomInt(100000, 1000000);

		sendResponse(res, {
			success: true,
			status: status.OK,
			message: "OTP send successfully!",
			data: opt,
		});
	} catch (error) {
		next(error);
	}
});

// all APIs routes
app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/user", UserRoutes);

// global error handler

app.use(globalErrorHandler);

export default app;
