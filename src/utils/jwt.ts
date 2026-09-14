import type { JwtPayload, SignOptions } from "jsonwebtoken";
import type { Role } from "../generated/prisma/enums";
import jwt from "jsonwebtoken";

interface TokenPayload extends JwtPayload {
	id: string;
	name: string;
	email: string;
	role: Role;
}

const createToken = (
	payload: TokenPayload,
	secret: string,
	options: SignOptions,
) => {
	const token = jwt.sign(payload, secret, options);
	return token;
};

const verifyToken = (token: string, secret: string) => {
	try {
		const verifyToken = jwt.verify(token, secret) as TokenPayload;
		return {
			success: true,
			data: verifyToken,
		};
	} catch (error: any) {
		return {
			success: false,
			error: error.message,
		};
	}
};

export const jwtUtils = {
	createToken,
	verifyToken,
};
