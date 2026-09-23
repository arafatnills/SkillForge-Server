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
        Authorization: bkashIdToken as string,
        "X-App-Key": config.bkash_app_key,
      },
      body: JSON.stringify({
        agreementID: "TokenizedMerchant01L3IKB6H1565072174986",
        mode: "0011",
        payerReference: "01723888888",
        callbackURL: `${config.bkash_callback_url}/appointment/book-appointment/payment/callback`,
        // merchantAssociationInfo: "MI05MID54RF09123456One",
        amount: "300",
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: "Inv14451sass",
      }),
    },
  );

  const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json();
  return bkashCreatePaymentResult;
};

// call back url
const bookAppointmentCallbackQuery = async (query: Record<string, any>) => {
  const paymentId = query.paymentID;
  const PaymentStatus = query.status;
  if (!PaymentStatus) {
    throw new AppError(status.NOT_FOUND, "Payment Status is messing!");
  }
  if (!paymentId) {
    throw new AppError(status.NOT_FOUND, "Payment Id is messing!");
  }
  const bkashIdToken = await getBkashIdToken();
  if (!bkashIdToken) {
    throw new AppError(status.NOT_FOUND, "Bkash id token not found!");
  }

  const executedPaymentResponse = await fetch(
    `${config.bkash_base_url}/tokenized/checkout/execute`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: bkashIdToken as string,
        "X-App-Key": config.bkash_app_key,
      },
      body: JSON.stringify({
        paymentID: paymentId,
      }),
    },
  );

  const executedPaymentResult = await executedPaymentResponse.json();
  console.log(executedPaymentResult)
  return executedPaymentResult
};

export const AppointmentServices = {
  bookAppointmentQuery,
  bookAppointmentCallbackQuery,
};
