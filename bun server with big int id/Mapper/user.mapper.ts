import type { SensitiveUserFields, UserDto } from "../DTOS/user.dto";

export const mapUserToDto = <T extends object>(user: T): UserDto<T> => {
  const {
    password: _password,
    refreshToken: _refreshToken,
    otp: _otp,
    fcmToken: _fcmToken,
    ...userDto
  } = user as T & Partial<Record<SensitiveUserFields, unknown>>;

  return userDto;
};
