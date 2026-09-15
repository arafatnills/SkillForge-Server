import {
  response,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { AuthServices } from "./auth.services";
import status from "http-status";
import sendResponse from "../../utils/sendResponse";
import catchAsync from "../../utils/catchAsync";

// create user
const createUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const payload = req.body;

    const { accessToken, refreshToken, user } =
      await AuthServices.createUserQuery(payload);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24, // 1 days
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    sendResponse(res, {
      success: true,
      status: status.CREATED,
      message: "user created successfully!",
      data: {
        accessToken,
        refreshToken,
        user,
      },
    });
  },
);

// create user
const loginUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const payload = req.body;
    const { accessToken, refreshToken } =
      await AuthServices.loginUserQuery(payload);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24, // 1 days
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    sendResponse(res, {
      success: true,
      status: status.OK,
      message: "user login successfully!",
      data: {
        accessToken,
        refreshToken,
      },
    });
  },
);

// google login
const googleLogin = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const payload = req.body;
    const { accessToken, refreshToken } =
      await AuthServices.googleLoginQuery(payload);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24, // 1 days
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    sendResponse(res, {
      success: true,
      status: status.OK,
      message: "user login successfully!",
      data: {
        accessToken,
        refreshToken,
      },
    });
  },
);
// Forgot Password
const forgotPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const payload = req.body;
    console.log(payload)
    await AuthServices.forgotPasswordQuery(payload);

    sendResponse(res, {
      success: true,
      status: status.OK,
      message: `OPT sent to email ${payload.email}`,
      data: null,
    });
  },
);

// Reset Password
const resetPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const payload = req.body;
    await AuthServices.resetPasswordQuery(payload);

    sendResponse(res, {
      success: true,
      status: status.OK,
      message: "password was changed successfully!",
      data: null
    });
  },
);

export const AuthControllers = {
  createUser,
  loginUser,
  googleLogin,
  forgotPassword,
  resetPassword,
};
