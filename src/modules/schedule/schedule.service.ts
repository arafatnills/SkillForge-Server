import { addDays, differenceInMinutes, startOfDay } from "date-fns";
import status from "http-status";
import type { ScheduleWhereInput } from "../../generated/prisma/models";
import type { IQueryInterface } from "../../interfaces";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import type {
  CreateScheduleInterface,
  UpdateScheduleInterface,
} from "./schedule.interface";

// create schedule
const createScheduleQuery = async (
  payload: CreateScheduleInterface,
  user: RequestUser,
) => {
  const mentor = await prisma.mentor.findUnique({
    where: {
      userId: user.userId,
    },
  });

  if (!mentor) {
    throw new AppError(status.NOT_FOUND, "Mentor Nor Found!");
  }

  const startOfTheDay = startOfDay(payload.startDateTime);
  const startOfNextDay = addDays(startOfTheDay, 1);

  const existingScheduleOnThisDay = await prisma.schedule.findFirst({
    where: {
      id: mentor.id,
      isDeleted: false,
      startDateTime: {
        gte: startOfTheDay,
        lt: startOfNextDay,
      },
    },
  });

  if (existingScheduleOnThisDay) {
    throw new AppError(
      status.CONFLICT,
      "You Already Have A Schedule For This Date!",
    );
  }

  const durationInMinutes = differenceInMinutes(
    payload.startDateTime,
    payload.endDateTime,
  );

  const MINUTES_ALLOCATED_PER_SLOT = 20;
  const totalSlots = Math.floor(durationInMinutes / MINUTES_ALLOCATED_PER_SLOT);

  const schedule = await prisma.schedule.create({
    data: {
      startDateTime: payload.startDateTime,
      endDateTime: payload.endDateTime,
      meetingLink: payload.meetingLink,
      mentorId: mentor.id,
      totalSlots,
      availableSlots: totalSlots,
    },
    include: {
      mentor: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  return schedule;
};

// get mentor schedule only for mentor
const getMentorScheduleQuery = async (
  query: IQueryInterface,
  user: RequestUser,
) => {
  const mentor = await prisma.mentor.findUnique({
    where: {
      userId: user.userId,
    },
  });

  if (!mentor) {
    throw new AppError(status.NOT_FOUND, "Mentor Profile Not Found!");
  }

  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : "createdAt";
  const sortOrder = query.sortOrder ? query.sortOrder : "desc";

  const andConditions: ScheduleWhereInput[] = [
    {
      mentorId: mentor.id,
    },
    {
      isDeleted: false,
    },
  ];

  if (query.status) {
    andConditions.push({ status: query.status });
  }

  const schedules = await prisma.schedule.findMany({
    where: {
      AND: andConditions,
    },
    take: limit,
    skip,
    orderBy: { [sortBy]: sortOrder },
    include: {
      appointments: {
        include: {
          learner: true,
        },
      },
    },
  });
  const total = await prisma.schedule.count({
    where: {
      AND: andConditions,
    },
  });

  return {
    data: schedules,
    meta: {
      total: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// get all schedule only for admin or super admin
const getAllScheduleQuery = async (query: IQueryInterface) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : "createdAt";
  const sortOrder = query.sortOrder ? query.sortOrder : "desc";

  const andConditions: ScheduleWhereInput[] = [];

  if (query.email) {
    andConditions.push({
      mentor: {
        email: query.email,
      },
    });
  }
  if (query.mentorId) {
    andConditions.push({
      mentorId: query.mentorId,
    });
  }
  if (query.status) {
    andConditions.push({
      status: query.status,
    });
  }

  if (query.searchTerm) {
    andConditions.push({
      mentor: {
        OR: [
          { name: { contains: query.searchTerm, mode: "insensitive" } },
          { email: { contains: query.searchTerm, mode: "insensitive" } },
          { expertise: { contains: query.searchTerm, mode: "insensitive" } },
        ],
      },
    });
  }

  const schedules = await prisma.schedule.findMany({
    where: {
      AND: andConditions,
    },
    take: limit,
    skip,
    orderBy: { [sortBy]: sortOrder },
    include: {
      appointments: {
        include: {
          learner: true,
        },
      },
    },
  });
  const total = await prisma.schedule.count({
    where: {
      AND: andConditions,
    },
  });

  return {
    data: schedules,
    meta: {
      total: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// get schedule by id
const scheduleByIdQuery = async (scheduleId: string) => {
  const schedule = await prisma.schedule.findUnique({
    where: {
      id: scheduleId,
    },
    include: {
      mentor: {
        select: {
          id: true,
          name: true,
          email: true,
          expertise: true,
          userid: true,
        },
      },
      appointments: {
        include: {
          learner: true,
          payment: true,
        },
      },
    },
  });

  if (!schedule || schedule.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Schedule Not Found!");
  }

  return schedule;
};

// update schedule
const updateScheduleQuery = async (
  scheduleId: string,
  payload: UpdateScheduleInterface,
  user: RequestUser,
) => {
  const mentor = await prisma.mentor.findUnique({
    where: {
      userId: user.userId,
    },
  });

  if (!mentor) {
    throw new AppError(status.NOT_FOUND, "Mentor Profile Not Found!");
  }

  const schedule = await prisma.schedule.findUnique({
    where: {
      id: scheduleId,
    },
  });

  if (!schedule || schedule.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Schedule Not Found!");
  }

  if (schedule.mentorId !== mentor.id) {
    throw new AppError(
      status.FORBIDDEN,
      "You Are Not Allowed To Update This Schedule",
    );
  }

  if (
    schedule.status === "PUBLISHED" &&
    schedule.totalSlots !== schedule.availableSlots
  ) {
    throw new AppError(
      status.CONFLICT,
      "Schedule Once Published & Appointment Booked Cannot Be Updated!",
    );
  }

  payload.meetingLink = payload.meetingLink || schedule.meetingLink;
  payload.startDateTime = payload.startDateTime || schedule.startDateTime;
  payload.endDateTime = payload.endDateTime || schedule.endDateTime;

  const startOfTheDay = startOfDay(payload.startDateTime);
  const startOfNextDay = addDays(startOfTheDay, 1);

  const existingScheduleOnThisDay = await prisma.schedule.findFirst({
    where: {
      id: mentor.id,
      isDeleted: false,
      startDateTime: {
        gte: startOfTheDay,
        lt: startOfNextDay,
      },
    },
  });

  if (existingScheduleOnThisDay) {
    throw new AppError(
      status.CONFLICT,
      "You Already Have A Schedule For This Date!",
    );
  }

  const durationInMinutes = differenceInMinutes(
    payload.startDateTime,
    payload.endDateTime,
  );

  const MINUTES_ALLOCATED_PER_SLOT = 20;
  const totalSlots = Math.floor(durationInMinutes / MINUTES_ALLOCATED_PER_SLOT);

  const updateSchedule = await prisma.schedule.update({
    where: {
      id: schedule.id,
    },
    data: {
      startDateTime: payload.startDateTime,
      endDateTime: payload.endDateTime,
      meetingLink: payload.meetingLink,
      availableSlots: totalSlots,
    },
    include: {
      mentor: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });
  return updateSchedule;
};

// public schedule
const publicSchedule = async (scheduleId: string, user: RequestUser) => {
  const mentor = await prisma.mentor.findUnique({
    where: {
      userId: user.userId,
    },
  });

  if (!mentor) {
    throw new AppError(status.NOT_FOUND, "Mentor Profile Not Found!");
  }

  const schedule = await prisma.schedule.findUnique({
    where: {
      id: scheduleId,
      mentorId: mentor.id,
    },
  });

  if (!schedule || schedule.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Schedule Not Found!");
  }

  if (schedule.mentorId !== mentor.id) {
    throw new AppError(
      status.FORBIDDEN,
      "You Are Not Allowed To Update This Schedule",
    );
  }

  if (schedule.status === "PUBLISHED") {
    throw new AppError(status.CONFLICT, "Schedule Is Already Published!");
  }

  const publishedSchedule = await prisma.schedule.update({
    where: {
      id: schedule.id,
    },
    data: {
      status: "PUBLISHED",
    },
  });

  return publishedSchedule
};

export const ScheduleServices = {
  createScheduleQuery,
  getMentorScheduleQuery,
  getAllScheduleQuery,
  scheduleByIdQuery,
  updateScheduleQuery,
  publicSchedule
};
