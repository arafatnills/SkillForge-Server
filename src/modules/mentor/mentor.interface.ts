export interface MentorApplicationInterface {
	phone?: string;
	address?: string;
	expertise?: string;
	experienceYears: number;
	bio?: string;
	appointmentFee?: number;
}

export interface approvedMentorEmailInterface {
	readonly email: string;
}

export interface RejectApplicationInterface {
	applicationId: string;
	rejectionReason: string;
}

export interface VerifyMentorOtpInterface {
	otp: string;
}
