import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import config from "./config";
import { AuthRoutes } from "./modules/auth/auth.routes";
import sendResponse from "./utils/sendResponse";
import status from "http-status";
import { redisClient } from "./lib/redis";
import crypto from 'crypto'
import { globalErrorHandler } from "./middleware/globalErrorHandeler";

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

	const opt = crypto.randomInt(100000 ,1000000 )

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


// global error handler

app.use(globalErrorHandler)

export default app;
