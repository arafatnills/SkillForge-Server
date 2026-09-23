import status from "http-status";
import config from "../../config";
import { getBkashIdToken } from "../../lib/bkash";
import { AppError } from "../../utils/AppError";

const bookAppointmentQuery = async () => {
  // bkash payment flow
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
        payerReference: "0123456789", //user email or phone number
        callbackURL: `${config.bkash_callback_url}/appointment/book-appointment/payment/callback`,
        amount: "1200",
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: "Inv31sd44",
      }),
    },
  );

  const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json();

  console.log({ bkashCreatePaymentResult });

  return bkashCreatePaymentResult;
};

// call back url
const bookAppointmentCallbackQuery = async (query: Record<string, any>) => {
  const paymentStatus = query.status;
  const paymentId = query.paymentID;

  if (!paymentId) {
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
        paymentID: paymentId,
      }),
    },
  );
  const executedPaymentResult = await executedPaymentResponse.json();
  if (paymentStatus === "success") {
    return {
      executedPaymentResult,
      redirectUrl: `${config.app_url_client}/dashboard/my-appointments?status=success`,
    };
  }
  if (paymentStatus === "failure") {
    return {
      executedPaymentResult,
      redirectUrl: `${config.app_url_client}/dashboard/my-appointments?status=failure`,
    };
  }
  if (paymentStatus === "cancel") {
    return {
      executedPaymentResult,
      redirectUrl: `${config.app_url_client}/dashboard/my-appointments?status=cancel`,
    };
  }

  return {
    executedPaymentResult,
    redirectUrl: `${config.app_url_client}/dashboard/my-appointments`,
  };
};

export const AppointmentServices = {
  bookAppointmentQuery,
  bookAppointmentCallbackQuery,
};
