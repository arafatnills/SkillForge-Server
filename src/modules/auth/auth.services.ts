import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import config from "../../config";
import type { SignOptions } from "jsonwebtoken";
import { jwtUtils } from "../../utils/jwt";
import type {
  CreateUserInterface,
  ForgotPasswordInterface,
  GoogleAuthInterface,
  LoginUserInterface,
  ResetPasswordInterface,
} from "./auth.interfaces";
import { AppError } from "../../utils/AppError";
import status from "http-status";
import { AuthProvider, Role } from "../../generated/prisma/enums";
import type { TokenPayload } from "google-auth-library";
import { googleClient } from "../../lib/google";
import crypto from "crypto";
import { redisClient } from "../../lib/redis";
import { transporter } from "../../lib/nodemailer";
import ejs from "ejs";
import path from "path";

// create user
const createUserQuery = async (payload: CreateUserInterface) => {
  const { name, email, password } = payload;

  const isExistsUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (isExistsUser) {
    throw new AppError(status.CONFLICT, "user already exists with this email");
  }

  const hashPassword = await bcrypt.hash(
    password,
    Number(config.bcrypt_salt_rounds),
  );

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashPassword,
      role: Role.LEARNER,
      Learner: {
        create: {
          name,
          email,
        },
      },
    },
    omit: {
      password: true,
    },
    include: {
      Learner: true,
    },
  });

  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    {
      expiresIn: config.jwt_access_expire_in,
    } as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    {
      expiresIn: config.jwt_refresh_expire_in,
    } as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
    user,
  };
};

// login user
const loginUserQuery = async (payload: LoginUserInterface) => {
  const { email, password } = payload;

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "user not found!");
  }

  const verifyPassword = await bcrypt.compare(
    password,
    user.password as string,
  );

  if (!verifyPassword) {
    throw new AppError(status.CONFLICT, "Invalid password");
  }

  if (user.status === "BLOCKED") {
    throw new AppError(status.CONFLICT, "User blocked");
  }

  if (user.status === "DELETED") {
    throw new AppError(status.CONFLICT, "User deleted");
  }

  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    { expiresIn: config.jwt_access_expire_in } as SignOptions,
  );
  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    { expiresIn: config.jwt_refresh_expire_in } as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};

// google login
const googleLoginQuery = async (payload: GoogleAuthInterface) => {
  let googleIdTokenPayload: TokenPayload | null | undefined = null;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: payload.idToken,
      audience: config.google_client_id,
    });
    googleIdTokenPayload = ticket.getPayload();
  } catch (error) {
    console.log(`google id token verification failed`, error);
    throw new AppError(
      status.EXPECTATION_FAILED,
      "Invalid or expired google id token",
    );
  }

  if (!googleIdTokenPayload)
    throw new AppError(
      status.EXPECTATION_FAILED,
      "Invalid or expired google id token",
    );

  if (!googleIdTokenPayload.email || !googleIdTokenPayload.name) {
    throw new AppError(status.NOT_FOUND, "google email or name not found!");
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: googleIdTokenPayload.email,
    },
  });

  let user = existingUser;

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: googleIdTokenPayload.email,
        name: googleIdTokenPayload.name,
        profilePhoto: googleIdTokenPayload.picture,
        role: Role.LEARNER,
        provider: AuthProvider.GOOGLE,
        googleId: googleIdTokenPayload.sub,
        Learner: {
          create: {
            name: googleIdTokenPayload.name,
            email: googleIdTokenPayload.email,
          },
        },
      },
    });
  }

  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    { expiresIn: config.jwt_access_expire_in } as SignOptions,
  );
  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    { expiresIn: config.jwt_refresh_expire_in } as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};

// forgot password
const forgotPasswordQuery = async (payload: ForgotPasswordInterface) => {
  const { email } = payload;

  const isExistsUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!isExistsUser) throw new AppError(status.NOT_FOUND, "user not found!");

  if (isExistsUser.status === "BLOCKED")
    throw new AppError(status.CONFLICT, "user is blocked!");

  if (isExistsUser.status === "DELETED" || isExistsUser.isDeleted)
    throw new AppError(status.NOT_FOUND, "user is deleted!");

  if (isExistsUser.googleId && isExistsUser.provider === "GOOGLE")
    throw new AppError(status.CONFLICT, "user has account with google.");
  if (!isExistsUser.emailVerified)
    throw new AppError(status.CONFLICT, "email not verified!");

  const otp = crypto.randomInt(100000, 1000000).toString();
  const key = `forgot-password:${isExistsUser.email}`;

  await redisClient.set(key, otp, {
    expiration: {
      type: "EX",
      value: 5 * 60,
    },
  });

  const templatePath = path.join(
    process.cwd(),
    "/src/templates/forgot-password.ejs",
  );

  const html = await ejs.renderFile(templatePath, {
    otp,
    name: isExistsUser.name,
  });

  // sent otp via email
  await transporter.sendMail({
    from: config.smtp_sender,
    to: isExistsUser.email,
    subject: "Forgot Password OTP",
    html,
  });
};

// reset password
const resetPasswordQuery = async (payload: ResetPasswordInterface) => {
  const { email, otp, newPassword } = payload;

  const isExistsUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!isExistsUser) throw new AppError(status.NOT_FOUND, "user not found!");

  if (isExistsUser.status === "BLOCKED")
    throw new AppError(status.CONFLICT, "user is blocked!");

  if (isExistsUser.status === "DELETED" || isExistsUser.isDeleted)
    throw new AppError(status.NOT_FOUND, "user is deleted!");

  if (isExistsUser.googleId && isExistsUser.provider === "GOOGLE")
    throw new AppError(status.CONFLICT, "user has account with google.");
  if (!isExistsUser.emailVerified)
    throw new AppError(status.CONFLICT, "email not verified!");

  const key = `forgot-password:${isExistsUser.email}`;

  const redisOtp = await redisClient.get(key);

  if (!redisOtp) throw new AppError(status.UNAUTHORIZED, "Invalid OPT");
  if (redisOtp !== otp)
    throw new AppError(status.UNAUTHORIZED, "OTP does not match!.");

  const hashPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  await prisma.user.update({
    where: {
      email: isExistsUser.email,
    },
    data: {
      password: hashPassword,
    },
  });

  await redisClient.del([key]);

    const templatePath = path.join(
    process.cwd(),
    "/src/templates/reset-success.ejs",
  );

  const html = await ejs.renderFile(templatePath, {
    name: isExistsUser.name,
  });

  // sent otp via email
  await transporter.sendMail({
    from: config.smtp_sender,
    to: isExistsUser.email,
    subject: "Password changed",
    html,
  });
};

export const AuthServices = {
  createUserQuery,
  loginUserQuery,
  googleLoginQuery,
  forgotPasswordQuery,
  resetPasswordQuery,
};
