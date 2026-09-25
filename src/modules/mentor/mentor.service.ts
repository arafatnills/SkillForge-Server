import bcrypt from "bcryptjs";
import type { UploadApiResponse } from "cloudinary";
import status from "http-status";
import config from "../../config";
import { Role } from "../../generated/prisma/enums";
import { cloudinary } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

// update profile
const applyAsMentorQuery = async (
  payload: any,
  resume: Express.Multer.File,
  additionalFiles: Express.Multer.File[],
) => {
  const existingMentor = await prisma.user.findUnique({
    where: {
      email: payload.user.email,
    },
  });

  if (existingMentor) {
    throw new AppError(status.CONFLICT, "User with this email already exists!");
  }

  const resumeCloudinaryPromise = await new Promise<UploadApiResponse>(
    (resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "auto",
            folder: "resume",
          },
          async (err, result) => {
            if (err) {
              return reject(err);
            }
            if (!result) {
              return reject(
                new AppError(
                  status.NOT_FOUND,
                  "No result returned from cloudinary!",
                ),
              );
            }

            resolve(result);
          },
        )
        .end(resume.buffer);
    },
  );

  const additionalFilesCloudinaryPromise = await Promise.all(
    additionalFiles.map((file) => {
      return new Promise<UploadApiResponse>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              resource_type: "auto",
              folder: "additionalFiles",
            },
            async (err, result) => {
              if (err) {
                return reject(err);
              }
              if (!result) {
                return reject(
                  new AppError(
                    status.NOT_FOUND,
                    "No result returned from cloudinary!",
                  ),
                );
              }

              resolve(result);
            },
          )
          .end(file.buffer);
      });
    }),
  );

  const randomPassword = Math.random().toString(36).slice(-6);
  const hashedPassword = await bcrypt.hash(
    randomPassword,
    Number(config.bcrypt_salt_rounds),
  );

  const mentorApplication = await prisma.user.create({
    data: {
      name: payload.user.name,
      email: payload.user.email,
      password: hashedPassword,
      role: Role.MENTOR,
      needsPasswordChange: true,
      mentor: {
        create: {
          name: payload.user.name,
          email: payload.user.email,
          ...payload.mentor,
          resume: resumeCloudinaryPromise.secure_url,
          resumePublicId: resumeCloudinaryPromise.public_id,
          additionalFiles: additionalFilesCloudinaryPromise.map((file) => ({
            url: file.secure_url,
            publicId: file.public_id,
          })),
        },
      },
    },
    include: {
      mentor: true,
    },
    omit: {
      password: true,
    },
  });

  return mentorApplication;
};

export const MentorServices = {
  applyAsMentorQuery,
};
