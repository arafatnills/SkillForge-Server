import status from "http-status";
import config from "../../config";
import { AppointmentStatus, PaymentStatus } from "../../generated/prisma/enums";
import { getBkashIdToken } from "../../lib/bkash";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";

const bookAppointmentQuery = async (payload: any, user: RequestUser) => {
  // bkash payment flow
  const transactionResult = await prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.create({
      data: {
        status: AppointmentStatus.PENDING,
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
          amount: "1200",
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
const payAppointmentQuery = async (payload: any, user: RequestUser) => {
  const { appointmentId } = payload;
  const existingAppointment = await prisma.appointment.findUnique({
    where: {
      id: appointmentId,
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
        amount: "1200",
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
      await tx.appointment.update({
        where: {
          id: executedPaymentResult.merchantInvoiceNumber,
        },
        data: {
          status: AppointmentStatus.CONFIRMED,
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

    console.log(bkashRefundPaymentResult)

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
        gatewayResponse: bkashRefundPaymentResult
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
