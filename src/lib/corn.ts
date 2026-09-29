import cron from "node-cron";
import { deleteCloudinaryFile } from "../utils/deleteCloudinaryFile";
import { prisma } from "./prisma";

export const deleteUnVerifiedMentors = async () => {
  cron.schedule("*/10 * * * *", async () => {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const expiredMentors = await prisma.mentor.findMany({
        where: {
          verificationStatus: "OTP_PENDING",
          createdAt: { lt: oneHourAgo },
        },
        select: {
          id: true,
          resumePublicId: true,
          additionalFiles: true,
        },
      });

      for (const mentor of expiredMentors) {
        const { count } = await prisma.mentor.deleteMany({
          where: { id: mentor.id, verificationStatus: "OTP_PENDING" },
        });
        if (count === 0) continue;

        try {
          if (mentor.resumePublicId) {
            await deleteCloudinaryFile(mentor.resumePublicId);
          }

          const files = (mentor.additionalFiles ?? []) as Array<{
            url: string;
            publicId: string;
          }>;
          await Promise.all(
            files.map((file) =>
              file.publicId ? deleteCloudinaryFile(file.publicId) : null,
            ),
          );
        } catch (error) {
          console.error(
            `[cron] Cloudinary cleanup failed for mentor ${mentor.id}:`,
            error,
          );
        }
      }

      if (expiredMentors.length > 0) {
        console.log(
          `[cron] Cleaned up ${expiredMentors.length} unverified mentor(s)`,
        );
      }
    } catch (error) {
      console.error("[cron] deleteUnVerifiedMentors failed:", error);
    }
  });
};
