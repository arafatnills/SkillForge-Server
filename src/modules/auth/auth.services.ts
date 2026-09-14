import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import config from "../../config";
import type { SignOptions } from "jsonwebtoken";
import { jwtUtils } from "../../utils/jwt";
import type {
  CreateUserInterface,
  GoogleAuthInterface,
  LoginUserInterface,
} from "./auth.interfaces";
import { AppError } from "../../utils/AppError";
import status from "http-status";
import { AuthProvider, Role } from "../../generated/prisma/enums";
import type { TokenPayload } from "google-auth-library";
import { googleClient } from "../../lib/google";

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
  } else {
    user = await prisma.user.update({
      where: {
        email: googleIdTokenPayload.email,
      },
      data: {
        googleId: googleIdTokenPayload.sub,
        provider: AuthProvider.GOOGLE,
        profilePhoto: user.profilePhoto || googleIdTokenPayload.picture,
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

export const AuthServices = {
  createUserQuery,
  loginUserQuery,
  googleLoginQuery
};
