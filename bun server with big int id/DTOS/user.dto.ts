export type SensitiveUserFields =
  | "password"
  | "refreshToken"
  | "otp"
  | "fcmToken";

export type UserDto<T extends object> = Omit<T, SensitiveUserFields>;
