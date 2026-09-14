import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import config from "./config";
import { AuthRoutes } from "./modules/auth/auth.routes";

const app = express();

app.use(
	cors({
		origin: [
			config.app_url,
			"http://localhost:3000",
			"http://localhost:5173",
		].filter(Boolean),
		credentials: true,
	}),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// all APIs routes
app.use("/api/v1/auth", AuthRoutes);

export default app;
