import status from "http-status";
import config from "../config";
import { AppError } from "../utils/AppError";
import { redisClient } from "./redis";

export const getBkashIdToken = async () => {
  const IdTokenKey = "bkash:idToken";
  const RefreshTokenKey = "bkash:refreshToken";

  let bkashIdToken = await redisClient.get(IdTokenKey);
  const bkashIdTokenTTL = await redisClient.ttl(IdTokenKey);

  const bkashRefreshToken = await redisClient.get(RefreshTokenKey);
  const bkashRefreshTokenTTL = await redisClient.ttl(RefreshTokenKey);


  // Run if ID token is nearing expiry (<= 10 mins) AND valid refresh token exists
  if (
    (bkashIdTokenTTL <= 600 || !bkashIdToken) &&
    bkashRefreshToken &&
    bkashRefreshTokenTTL > 600
  ) {
    try {
      const refreshTokenResponse = await fetch(
        `${config.bkash_base_url}/tokenized/checkout/token/refresh`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            username: config.bkash_username,
            password: config.bkash_password,
          },
          body: JSON.stringify({
            app_key: config.bkash_app_key,
            app_secret: config.bkash_app_secret,
            refresh_token: bkashRefreshToken,
          }),
        },
      );

      const refreshResult = await refreshTokenResponse.json();

      if (refreshResult?.statusCode === "0000" && refreshResult.id_token) {
        bkashIdToken = refreshResult.id_token as string;

        // Cache the new ID token (valid for 1 hour)
        await redisClient.set(IdTokenKey, bkashIdToken, {
          expiration: {
            type: "EX",
            value: 60 * 60,
          },
        });

        return bkashIdToken;
      }

      // If refresh failed on bKash's end, fall through to GRANT flow
      console.warn(
        "bKash token refresh failed, falling back to Grant token:",
        refreshResult?.statusMessage,
      );
    } catch (err) {
      console.error("Error during bKash token refresh process:", err);
    }
  }

  if (bkashIdTokenTTL > 600) {
    return bkashIdToken;
  }

  try {
    const response = await fetch(
      `${config.bkash_base_url}/tokenized/checkout/token/grant`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          username: config.bkash_username,
          password: config.bkash_password,
        },
        body: JSON.stringify({
          app_key: config.bkash_app_key,
          app_secret: config.bkash_app_secret,
        }),
      },
    );
    if (!response.ok) {
      throw new AppError(
        status.BAD_REQUEST,
        "Bkash Access Token Grant Failed!",
      );
    }
    const result = await response.json();

    // bkash id token set
    await redisClient.set(IdTokenKey, result.id_token, {
      expiration: {
        type: "EX",
        value: 60 * 60,
      },
    });
    // bkash refresh token set
    await redisClient.set(RefreshTokenKey, result.refresh_token, {
      expiration: {
        type: "EX",
        value: 60 * 60 * 24 * 28,
      },
    });
    bkashIdToken = result.id_token;
    return bkashIdToken;
  } catch (error) {
    return error;
  }
};
