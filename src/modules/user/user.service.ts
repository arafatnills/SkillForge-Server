import type { UploadApiResponse } from "cloudinary";
import status from "http-status";
import { cloudinary } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

// update profile
const uploadProfileImageQuery = async (buffer: Buffer, userId: string) => {
  const currentUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      profilePublicId: true,
	  profilePhoto: true
    },
  });
  const cloudinaryPromise = await new Promise<UploadApiResponse>(
    (resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "auto",
			folder: 'profile-images'
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
        .end(buffer);
    },
  );

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      profilePhoto: cloudinaryPromise.secure_url,
      profilePublicId: cloudinaryPromise.public_id,
    },
  });

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    omit: {
      password: true,
    },
  });

  if(currentUser?.profilePublicId && currentUser.profilePhoto){
	await cloudinary.uploader.destroy(currentUser.profilePublicId, )
  }

  return user;
};

export const UserServices = {
  uploadProfileImageQuery,
};
