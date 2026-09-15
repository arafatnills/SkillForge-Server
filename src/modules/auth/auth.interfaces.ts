export interface CreateUserInterface {
  name: string;
  email: string;
  password: string;
}

export interface LoginUserInterface {
  email: string;
  password: string;
}

export interface GoogleAuthInterface {
  idToken: string;
}

export interface ForgotPasswordInterface {
  email: string;
}

export interface ResetPasswordInterface {
  email: string;
  newPassword: string;
  otp: string;
}
