import { Router } from "express";
import { upload } from "../../lib/multer";
import { MentorControllers } from "./mentor.controller";

const router = Router();

router.post(
  "/apply-as-mentor",
  upload.fields([
    {
      name: "resume",
      maxCount: 1,
    },
    {
      name: "additionalFiles",
      maxCount: 5,
    },
  ]),
  MentorControllers.applyAsMentor,
);

export const MentorRoutes = router;
