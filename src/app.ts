import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import status from "http-status";
import config from "./config";
import { getBkashIdToken } from "./lib/bkash";
import { globalErrorHandler } from "./middleware/globalErrorHandeler";
import { AppointmentRoutes } from "./modules/appointment/appointment.routes";
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
app.post(
  "/api/v1/grant",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const grantIdToken = await getBkashIdToken();

      sendResponse(res, {
        success: true,
        status: status.OK,
        message: "Welcome to backend server!",
        data: grantIdToken,
      });
    } catch (error) {
      next(error);
    }
  },
);

// all APIs routes
app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/user", UserRoutes);
app.use("/api/v1/appointment", AppointmentRoutes);

// global error handler

app.use(globalErrorHandler);

export default app;
