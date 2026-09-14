import dotenv from "dotenv";
import path from "path";
import { env } from "process";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
	node_env: env.NODE_ENV,
	port: process.env.PORT || 5000,
	databaseUrl: env.DATABASE_URL,
	app_url: env.APP_URL || "http://localhost:5000",
	app_url_client: env.APP_CLIENT || "http://localhost:3000",
	bcrypt_salt_rounds: env.BCRYPT_SALT_ROUNDS!,
	jwt_access_secret: env.JWT_ACCESS_SECRET!,
	jwt_refresh_secret: env.JWT_REFRESH_SECRET!,
	jwt_access_expire_in: env.JWT_ACCESS_EXPIRE_IN!,
	jwt_refresh_expire_in: env.JWT_REFRESH_EXPIRE_IN!,

	stripe_secret_key: env.STRIPE_SECRET_KEY!,
	stripe_product_id: env.STRIPE_PRODUCT_ID!,
	stripe_price_id: env.STRIPE_PRICE_ID!,
	stripe_webhook_secret: env.STRIPE_WEBHOOK_SECRET!,

	cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
	cloud_api_key: process.env.CLOUDINARY_API_KEY!,
	cloud_api_secret: process.env.CLOUDINARY_API_SECRET!,

	google_client_id: process.env.GOOGLE_CLIENT_ID!,
	google_client_secret: process.env.GOOGLE_CLIENT_SECRET!,
};
