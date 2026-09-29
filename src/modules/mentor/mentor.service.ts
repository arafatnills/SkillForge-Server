import type { UploadApiResponse } from "cloudinary";
import ejs from "ejs";
import status from "http-status";
import path from "path";
import config from "../../config";
import { Prisma } from "../../generated/prisma/client";
import { Role } from "../../generated/prisma/enums";
import { cloudinary } from "../../lib/cloudinary";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { deleteCloudinaryFile } from "../../utils/deleteCloudinaryFile";
import type {
  approvedMentorEmailInterface,
  MentorApplicationInterface,
} from "./mentor.interface";

// update profile
const applyAsMentorQuery = async (
  payload: MentorApplicationInterface,
  resume: Express.Multer.File,
  additionalFiles: Express.Multer.File[],
  user: RequestUser,
) => {
  // check in user
  const existingUser = await prisma.user.findUnique({
    where: {
      email: user.email,
    },
  });

  if (!existingUser) {
    throw new AppError(
      status.NOT_FOUND,
      "User Not Found Place Logged in to Apply!",
    );
  }

  if (existingUser.role === Role.MENTOR) {
    throw new AppError(status.CONFLICT, "You are already a mentor!");
  }

  if (existingUser.status === "BLOCKED") {
    throw new AppError(status.CONFLICT, "User Already Blocked!");
  }

  if (existingUser.status === "DELETED") {
    throw new AppError(status.CONFLICT, "User Already Deleted!");
  }
  // check in Application
  const existingApplication = await prisma.mentorApplication.findUnique({
    where: {
      email: user.email,
    },
  });

  if (existingApplication) {
    throw new AppError(
      status.CONFLICT,
      "You already applied to mentor application!",
    );
  }

  // upload resume to cloudinary
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

  // upload additional files to cloudinary
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

  await prisma.mentorApplication.create({
    data: {
      name: user.name,
      email: user.email,
      userId: existingUser.id,
      experienceYears: payload.experienceYears,
      resume: resumeCloudinaryPromise.secure_url,
      resumePublicId: resumeCloudinaryPromise.public_id,
      additionalFiles: additionalFilesCloudinaryPromise.map((file) => ({
        url: file.secure_url,
        publicId: file.public_id,
        resourceType: file.resource_type,
      })),
      verificationStatus: "PENDING",
    },
  });

  const templatePath = path.join(
    process.cwd(),
    "/src/templates/mentor-application.ejs",
  );

  const html = await ejs.renderFile(templatePath, {
    name: user.name,
    message:
      "Thank you for providing your files. Our review team usually takes 3 to 5 business days to verify mentor credentials.",
  });

  // sent password reset successfully via email
  await transporter.sendMail({
    from: config.smtp_sender,
    to: user.email,
    subject: "Apply as Mentor Application Successfully!",
    html,
  });
};

// Mentor email verification
const approvedMentorQuery = async (
  payload: approvedMentorEmailInterface,
  reviewer: RequestUser,
) => {
  const email = payload.email.trim().toLowerCase();
  if (!email) {
    throw new AppError(status.BAD_REQUEST, "Email is required!");
  }

  const existingApplication = await prisma.mentorApplication.findUnique({
    where: {
      email: email,
    },
  });

  if (!existingApplication) {
    throw new AppError(status.NOT_FOUND, "Mentor Application Not Found!");
  }

  // Already approved application
  if (existingApplication.verificationStatus === "APPROVED") {
    throw new AppError(status.CONFLICT, "Mentor Application Already Approved!");
  }

  // Only pending application can be approved
  if (existingApplication.verificationStatus !== "PENDING") {
    throw new AppError(
      status.CONFLICT,
      `Application status is ${existingApplication.verificationStatus}`,
    );
  }

  const trxResult = await prisma.$transaction(async (tx) => {
    const createMentor = await tx.mentor.create({
      data: {
        name: existingApplication.name,
        email: existingApplication.email,
        userId: existingApplication.userId,
        experienceYears: existingApplication.experienceYears,
        resume: existingApplication.resume,
        resumePublicId: existingApplication.resumePublicId,
        additionalFiles:
          existingApplication.additionalFiles === null
            ? Prisma.JsonNull
            : (existingApplication.additionalFiles as Prisma.InputJsonValue),

        verificationStatus: "APPROVED",

        reviewedBy: reviewer.email,
        reviewedAt: new Date(),
      },
    });
    const updatedUser = await tx.user.update({
      where: {
        id: existingApplication.userId,
      },
      data: {
        role: Role.MENTOR,
      },
      omit: {
        password: true,
      },
      include: {
        Learner: true,
        mentor: true,
      },
    });

    await tx.mentorApplication.delete({
      where: {
        id: existingApplication.id,
      },
    });
    return {
      mentor: createMentor,
      user: updatedUser,
    };
  });
  return trxResult;
};

interface RejectApplicationInterface {
  applicationId: string;
  rejectionReason: string;
}

const rejectMentorApplicationQuery = async (
  payload: RejectApplicationInterface,
  reviewer: RequestUser,
) => {
  const application = await prisma.mentorApplication.findUnique({
    where: {
      id: payload.applicationId,
    },
  });

  if (!application) {
    throw new AppError(status.NOT_FOUND, "Mentor Application Not Found!");
  }

  if (application.verificationStatus !== "PENDING") {
    throw new AppError(
      status.CONFLICT,
      "This application has already been reviewed!",
    );
  }

  if(application.resumePublicId){
    await deleteCloudinaryFile(application.resumePublicId)
  }

  if (application.additionalFiles) {
    const files = application.additionalFiles as Array<{
      url: string;
      publicId: string;
      resourceType?: string;
    }>;
    await Promise.all(
      files.map(async (file) => {
        if (file.publicId) {
          await deleteCloudinaryFile(file.publicId);
        }
      }),
    );
  }

  const trxResult = await prisma.$transaction(async(tx)=>{
    const rejectedApplication = await tx.mentorApplication.update({
      where: {
        id: application.id,
      },
      data: {
        verificationStatus: "REJECTED",
        rejectionReason: payload.rejectionReason,
        reviewedBy: reviewer.email,
        reviewedAt: new Date(),
      },
    });


    await tx.mentorApplication.delete({
      where: {
        id: rejectedApplication.id
      }
    })

    return rejectedApplication
  })

  if(trxResult.verificationStatus === "REJECTED"){
    const templatePath = path.join(
      process.cwd(),
      "/src/templates/mentor-application-rejected.ejs",
    );

    const html = await ejs.renderFile(templatePath, {
      name: application.name,
      reason: `Your mentor application has been rejected. Reason: ${payload.rejectionReason}`,
    });

    // sent rejection email
    await transporter.sendMail({
      from: config.smtp_sender,
      to: application.email,
      subject: "Mentor Application Rejected",
      html,
    });
  }

  return trxResult;
};

export const MentorServices = {
  applyAsMentorQuery,
  approvedMentorQuery,
  rejectMentorApplicationQuery,
};
