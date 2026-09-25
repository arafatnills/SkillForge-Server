import app from "./app";
import config from "./config";
import { transporter } from "./lib/nodemailer";
import { prisma } from "./lib/prisma";
import { redisClient } from "./lib/redis";
import { seedTesterAdmin, seedTesterMentor, seedTesterSuperAdmin } from "./utils/seed";

const port = config.port;

async function main() {
	try {
		await prisma.$connect();
		console.log("Connected to the database successfully.");
		await redisClient.connect();
		console.log("Connected to redis successfully.");
		await transporter.verify();
		console.log("Connected to nodemailer successfully.");
		seedTesterSuperAdmin()
		seedTesterAdmin()
		seedTesterMentor()
		app.listen(port, () => {
			console.log(`Server is running on port : ${port}`);
		});
	} catch (error) {
		console.error("Error starting the server:", error);
		await prisma.$disconnect(); // Ensure the database connection is closed
		process.exit(1); // Exit the process with an error code
	}
}

main();
