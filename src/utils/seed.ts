import bcrypt from "bcryptjs";
import config from "../config";
import { Role } from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";

export const seedTesterSuperAdmin = async () => {
  try {
    const isSuperAdminExist = await prisma.user.findFirst({
      where: {
        role: Role.SUPER_ADMIN,
      },
    });

    if (isSuperAdminExist) {
      console.log("Super Admin Already Exists!");
      return;
    }

    const name = config.super_admin_name;
    const email = config.super_admin_email;
    const password = config.super_admin_password;

    if (!name || !email || !password) {
      throw new Error(
        "Super Admin Name , Email, Password Missing In Env File!!!",
      );
    }

    const hashedPassword = await bcrypt.hash(
      password,
      Number(config.bcrypt_salt_rounds),
    );
    if (!name || !email || !password) {
      throw new Error(
        "Tester Admin Name , Email, Password Missing In Env File!!!",
      );
    }

    const superAdmin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        emailVerified: true,
        role: Role.SUPER_ADMIN,
        super_admin: {
          create: {
            name,
            email,
          },
        },
      },
    });
    console.log("Super Admin Created : ", superAdmin);
  } catch (error) {
    console.log("Error Seeding Super Admin : ", error);

    await prisma.user.delete({
      where: {
        email: config.super_admin_email,
      },
    });
  }
};

// tester admin
export const seedTesterAdmin = async () => {
  try {
    const isTesterAdminExist = await prisma.user.findUnique({
      where: {
        email: config.tester_admin_email,
      },
    });

    if (isTesterAdminExist) {
      console.log("Tester Admin Already Exists!");
      return;
    }
    const name = config.tester_admin_name;
    const email = config.tester_admin_email;
    const password = config.tester_admin_password;

    if (!name || !email || !password) {
      throw new Error(
        "Tester Admin Name , Email, Password Missing In Env File!!!",
      );
    }

    const hashedPassword = await bcrypt.hash(
      password,
      Number(config.bcrypt_salt_rounds),
    );
    const testerAdmin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        emailVerified: true,
        role: Role.ADMIN,
        admin: {
          create: {
            name,
            email,
          },
        },
      },
    });
    console.log("Tester Admin Created : ", testerAdmin);
  } catch (error) {
    console.log("Error Seeding Super Admin : ", error);

    await prisma.user.delete({
      where: {
        email: config.tester_admin_email,
      },
    });
  }
};

// tester mentor
export const seedTesterMentor = async () => {
  try {
    const isTesterMentorExist = await prisma.user.findUnique({
      where: {
        email: config.tester_mentor_email,
      },
    });

    if (isTesterMentorExist) {
      console.log("Tester Mentor Already Exists!");
      return;
    }

    const name = config.tester_mentor_name;
    const email = config.tester_mentor_email;
    const password = config.tester_mentor_password;

    if (!name || !email || !password) {
      throw new Error(
        "Tester Mentor Name , Email, Password Missing In Env File!!!",
      );
    }

    const hashedPassword = await bcrypt.hash(
      password,
      Number(config.bcrypt_salt_rounds),
    );

    const testerMentor = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        emailVerified: true,
        role: Role.MENTOR,
        mentor: {
          create: {
            name,
            email,
            experienceYears: 5,
          },
        },
      },
    });

    console.log("Tester Mentor Created : ", testerMentor);
  } catch (error) {
    console.log("Error Seeding Tester Mentor : ", error);

    await prisma.user.delete({
      where: {
        email: config.tester_mentor_email,
      },
    });
  }
};
