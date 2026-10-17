import { addMinutes, isBefore, isSameDay } from "date-fns";
import status from "http-status";
import config from "../../config";
import { AppointmentStatus, PaymentStatus } from "../../generated/prisma/enums";
import { getBkashIdToken } from "../../lib/bkash";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { generateInvoicePdf } from "../../utils/generateInvoicePdf";
import type {
  bookingAppointmentPayload,
  payAppointmentPayload,
} from "./appointment.interface";


const bookAppointmentQuery = async (
  payload: bookingAppointmentPayload,
  user: RequestUser,
) => {
  // bkash payment flow
  const transactionResult = await prisma.$transaction(async (tx) => {
    const learner = await tx.learner.findUnique({
      where: {
        userId: user.userId,
      },
    });

    if (!learner) {
      throw new AppError(status.NOT_FOUND, "Learner Not Found!");
    }

    const schedule = await prisma.schedule.findUnique({
      where: {
        id: payload.scheduleId,
      },
      include: {
        mentor: true,
      },
    });

    if (!schedule || schedule.isDeleted) {
      throw new AppError(status.NOT_FOUND, "Schedule Not Found!");
    }
    if (schedule.status === "DRAFT") {
      throw new AppError(
        status.BAD_REQUEST,
        "This Schedule Is Not Publish Yet!",
      );
    }

    const now = new Date();

    if (!isSameDay(now, schedule.startDateTime)) {
      throw new AppError(
        status.BAD_REQUEST,
        "This Schedule Is Not Available Today!",
      );
    }

    if (!isBefore(now, schedule.startDateTime)) {
      throw new AppError(
        status.BAD_REQUEST,
        "This Schedule Has Already Started!",
      );
    }

    const existingAppointment = await tx.appointment.findFirst({
      where: {
        learnerId: learner.id,
        scheduleId: schedule.id,
      },
    });

    if (existingAppointment?.status === "PENDING") {
      throw new AppError(
        status.BAD_REQUEST,
        "You Already Have A Pending Appointment. Place Pay For That!",
      );
    }
    if (existingAppointment?.status === "CONFIRMED") {
      throw new AppError(
        status.BAD_REQUEST,
        "You Already Have A Confirmed Appointment!",
      );
    }

    if (existingAppointment?.status === "ONGOING") {
      throw new AppError(
        status.BAD_REQUEST,
        "You Already Have A Ongoing Appointment!",
      );
    }

    if (existingAppointment?.status === "COMPLETED") {
      throw new AppError(
        status.BAD_REQUEST,
        "You Already Have Completed An Appointment On This Schedule, Place Try Again Another Day!",
      );
    }

    if (schedule.availableSlots === 0) {
      throw new AppError(status.BAD_REQUEST, "This Schedule Is Fully Booked!");
    }

    if (!schedule.mentor.appointmentFee) {
      throw new AppError(
        status.BAD_REQUEST,
        "Mentor Has Not Set A Appointment Fee Yet!",
      );
    }

    const amount = schedule.mentor.appointmentFee.toString();

    const appointment = await tx.appointment.create({
      data: {
        learnerId: learner.id,
        mentorId: schedule.mentorId,
        scheduleId: payload.scheduleId,
      },
    });

    const bkashIdToken = await getBkashIdToken();
    if (!bkashIdToken) {
      throw new AppError(status.NOT_FOUND, "No Bkash Access Token Found!");
    }

    const bkashCreatePaymentResponse = await fetch(
      `${config.bkash_base_url}/tokenized/checkout/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: bkashIdToken,
          "X-App-Key": config.bkash_app_key,
        },
        body: JSON.stringify({
          mode: "0011",
          // payerReference: "0123456789", //user email or phone number
          payerReference: user.email,
          callbackURL: `${config.bkash_callback_url}/appointment/book-appointment/payment/callback`,
          amount: amount,
          currency: "BDT",
          intent: "sale",
          // merchantInvoiceNumber: "Inv31sd44",
          merchantInvoiceNumber: appointment.id,
        }),
      },
    );

    const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json();

    await tx.payment.create({
      data: {
        merchantInvoiceNumber: bkashCreatePaymentResult.merchantInvoiceNumber,
        amount: bkashCreatePaymentResult.amount,
        appointmentId: appointment.id,
        status: bkashCreatePaymentResult.status,
        gatewayResponse: bkashCreatePaymentResult,
        bkashPaymentId: bkashCreatePaymentResult.paymentID,
        payerReference: user.email,
      },
    });

    console.log({ bkashCreatePaymentResult });

    return {
      paymentUrl: bkashCreatePaymentResult.bkashURL,
    };
  });

  return transactionResult;
};

// failed payment again payment
const payAppointmentQuery = async (
  payload: payAppointmentPayload,
  user: RequestUser,
) => {
  const { appointmentId } = payload;
  const existingAppointment = await prisma.appointment.findUnique({
    where: {
      id: appointmentId,
    },
    include: {
      schedule: {
        include: {
          mentor: {
            select: {
              appointmentFee: true,
            },
          },
        },
      },
    },
  });

  if (!existingAppointment) {
    throw new AppError(status.NOT_FOUND, "Appointment dose not exists!");
  }
  if (existingAppointment.status !== "PENDING") {
    throw new AppError(status.CONFLICT, "Appointment Not Pending!");
  }

  const bkashIdToken = await getBkashIdToken();
  if (!bkashIdToken) {
    throw new AppError(status.NOT_FOUND, "No Bkash Access Token Found!");
  }

  if (!existingAppointment.schedule.mentor.appointmentFee) {
    throw new AppError(
      status.BAD_REQUEST,
      "Mentor Has Not Set A Appointment Fee Yet!",
    );
  }
  const amount = existingAppointment.schedule.mentor.appointmentFee.toString();

  const bkashCreatePaymentResponse = await fetch(
    `${config.bkash_base_url}/tokenized/checkout/create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: bkashIdToken,
        "X-App-Key": config.bkash_app_key,
      },
      body: JSON.stringify({
        mode: "0011",
        // payerReference: "0123456789", //user email or phone number
        payerReference: user.email,
        callbackURL: `${config.bkash_callback_url}/appointment/book-appointment/payment/callback`,
        amount: amount,
        currency: "BDT",
        intent: "sale",
        // merchantInvoiceNumber: "Inv31sd44",
        merchantInvoiceNumber: existingAppointment.id,
      }),
    },
  );

  const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json();

  await prisma.payment.update({
    where: {
      appointmentId: existingAppointment.id,
    },
    data: {
      merchantInvoiceNumber: bkashCreatePaymentResult.merchantInvoiceNumber,
      status: bkashCreatePaymentResult.status,
      gatewayResponse: bkashCreatePaymentResult,
      bkashPaymentId: bkashCreatePaymentResult.paymentID,
    },
  });
  return {
    paymentUrl: bkashCreatePaymentResult.bkashURL,
  };
};

// call back url
const bookAppointmentCallbackQuery = async (query: Record<string, any>) => {
  const transactionResult = await prisma.$transaction(async (tx) => {
    const { paymentID, status: paymentStatus } = query;

    if (!paymentID) {
      throw new AppError(status.NOT_FOUND, "Payment Id Missing");
    }
    if (!paymentStatus) {
      throw new AppError(status.NOT_FOUND, "Payment Status is Missing");
    }

    const bkashIdToken = await getBkashIdToken();
    if (!bkashIdToken) {
      throw new AppError(status.NOT_FOUND, "No Bkash Access Token Found!");
    }

    const executedPaymentResponse = await fetch(
      `${config.bkash_base_url}/tokenized/checkout/execute`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: bkashIdToken,
          "X-App-Key": config.bkash_app_key,
        },

        body: JSON.stringify({
          paymentID: paymentID,
        }),
      },
    );
    const executedPaymentResult = await executedPaymentResponse.json();
    if (paymentStatus === "success") {
      const appointment = await tx.appointment.findUnique({
        where: {
          id: executedPaymentResult.merchantInvoiceNumber,
        },
        include: {
          schedule: true,
          learner: true,
          mentor: true
        },
      });

      if (!appointment) {
        throw new AppError(status.NOT_FOUND, "Appointment Not Found!");
      }

      const newAvailableSlots = appointment.schedule.availableSlots - 1;
      const alreadyBookedSlots =
        appointment.schedule.totalSlots - appointment.schedule.availableSlots;

      const serialNumber = alreadyBookedSlots + 1;

      const joiningTime = addMinutes(
        appointment.schedule.startDateTime,
        (serialNumber - 1) * 20,
      );

      await tx.appointment.update({
        where: {
          id: executedPaymentResult.merchantInvoiceNumber,
        },
        data: {
          status: AppointmentStatus.CONFIRMED,
          joiningTime: joiningTime,
          serialNumber: serialNumber,
        },
      });

      await tx.schedule.update({
        where: {
          id: appointment.schedule.id,
        },
        data: {
          availableSlots: newAvailableSlots,
        },
      });

      await tx.payment.update({
        where: {
          bkashPaymentId: executedPaymentResult.paymentID,
          merchantInvoiceNumber: executedPaymentResult.merchantInvoiceNumber,
        },
        data: {
          bkashTrxId: executedPaymentResult.trxID,
          paidAt: executedPaymentResult.paymentExecuteTime,
          status: PaymentStatus.PAID,
          gatewayResponse: executedPaymentResult,
        },
      });

// ----------------------debug--------------------------------------
      console.log("Invoice date debug:", {
        joiningTime,
        scheduleDate: appointment.schedule.startDateTime,
        paymentExecuteTime: executedPaymentResult.paymentExecuteTime,
        paidAt: new Date(executedPaymentResult.paymentExecuteTime),
      });

      const invoicePdf = await generateInvoicePdf({
        invoiceId: `INV-${appointment.id}`,
        learnerName: appointment.learner.name,
        learnerEmail: appointment.learner.email,
        mentorName: appointment.mentor.name,
        mentorExpertise: appointment.mentor.expertise,
        appointmentId: appointment.id,
        serialNumber,
        joiningTime,
        scheduleDate: appointment.schedule.startDateTime,
        meetingLink: appointment.schedule.meetingLink,
        amount: Number(executedPaymentResult.amount),
        transactionId: executedPaymentResult.trxID,
        paidAt: new Date(executedPaymentResult.paymentExecuteTime),
      });

      await transporter.sendMail({
        from: config.smtp_sender,
        to: appointment.learner.email,
        subject: "Your Appointment Invoice - SkillForge",
        text: [
          `Hello ${appointment.learner.name},`,
          "",
          "Your appointment payment was successful.",
          "Please find your invoice attached.",
          "",
          "Thank you for choosing SkillForge!",
        ].join("\n"),
        attachments: [
          {
            filename: `invoice-${appointment.id}.pdf`,
            content: invoicePdf,
            contentType: "application/pdf",
          },
        ],
      });

      return {
        redirectUrl: `${config.app_url_client}/dashboard/my-appointments?status=success`,
      };
    } else if (paymentStatus === "failure") {
      await tx.payment.update({
        where: {
          bkashPaymentId: paymentID,
        },
        data: {
          status: PaymentStatus.FAILED,
          gatewayResponse: executedPaymentResult,
        },
      });
      return {
        redirectUrl: `${config.app_url_client}/dashboard/my-appointments?status=failure`,
      };
    } else if (paymentStatus === "cancel") {
      await tx.payment.update({
        where: {
          bkashPaymentId: paymentID,
        },
        data: {
          status: PaymentStatus.CANCELLED,
          gatewayResponse: executedPaymentResult,
        },
      });
      return {
        redirectUrl: `${config.app_url_client}/dashboard/my-appointments?status=cancel`,
      };
    } else {
      throw new AppError(status.EXPECTATION_FAILED, "Payment Failed!");
    }
  });

  return transactionResult;
};

// cancel appointment
const cancelAppointmentQuery = async (payload: any) => {
  const transactionResult = await prisma.$transaction(async (tx) => {
    const { appointmentId } = payload;

    const existingAppointment = await tx.appointment.findUnique({
      where: {
        id: appointmentId,
      },
      include: {
        payment: true,
      },
    });

    if (!existingAppointment) {
      throw new AppError(status.NOT_FOUND, "Appointment dose not exists!");
    }

    if (
      existingAppointment.status === "COMPLETED" ||
      existingAppointment.status === "ONGOING"
    ) {
      throw new AppError(
        status.BAD_REQUEST,
        `Appointment Already ${existingAppointment.status}!`,
      );
    }

    if (existingAppointment.status === "CANCELLED") {
      throw new AppError(status.CONFLICT, "Appointment Already Canceled!");
    }

    const updatedAppointment = await tx.appointment.update({
      where: {
        id: existingAppointment.id,
      },
      data: {
        status: "CANCELLED",
      },
    });

    const bkashIdToken = await getBkashIdToken();
    if (!bkashIdToken) {
      throw new AppError(status.NOT_FOUND, "No Bkash Access Token Found!");
    }

    const bkashRefundPaymentResponse = await fetch(
      `${config.bkash_base_url}/tokenized/checkout/payment/refund`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: bkashIdToken,
          "X-App-Key": config.bkash_app_key,
        },
        body: JSON.stringify({
          paymentID: existingAppointment.payment?.bkashPaymentId,
          trxID: existingAppointment.payment?.bkashTrxId,
          amount: existingAppointment.payment?.amount.toString(),
          sku: existingAppointment.id,
          reason: "Learner cancel this appointment!",
        }),
      },
    );

    const bkashRefundPaymentResult = await bkashRefundPaymentResponse.json();

    console.log(bkashRefundPaymentResult);

    const updatedPayment = await tx.payment.update({
      where: {
        appointmentId: existingAppointment.id,
      },
      data: {
        refundTrxId: bkashRefundPaymentResult.refundTrxID,
        refundAmount: bkashRefundPaymentResult.amount,
        refundedAt: bkashRefundPaymentResult.completedTime,
        refundReason: bkashRefundPaymentResult.reason,
        status: PaymentStatus.REFUNDED,
        gatewayResponse: bkashRefundPaymentResult,
      },
    });

    return {
      appointment: updatedAppointment,
      payment: updatedPayment,
    };
  });

  return transactionResult;
};

export const AppointmentServices = {
  bookAppointmentQuery,
  payAppointmentQuery,
  bookAppointmentCallbackQuery,
  cancelAppointmentQuery,
};
