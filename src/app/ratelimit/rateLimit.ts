import rateLimit from "express-rate-limit";

export const loginRateLimit = rateLimit({
    windowMs: 2 * 60 *1000,
    max:3,
    message: {
        success: false,
        message: "You have tried too many times. Please try again after 2 minutes.",
    },
    standardHeaders: true,
    legacyHeaders: false,
})