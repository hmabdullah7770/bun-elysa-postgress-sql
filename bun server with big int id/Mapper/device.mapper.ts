import type { Device } from "../src/schemas/device.schema";
import type { DeviceDto } from "../DTOS/device.dto";

const omitNullish = <T extends object>(value: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue != null),
  ) as Partial<T>;

export const mapDeviceToDto = (device: Device): DeviceDto => {
  const {
    userId,
    buildNumber,
    lastLoginIP,
    pushToken,
    deviceMetadata,
    healthReports,
    ...deviceFields
  } = device;

  return {
    ...deviceFields,
    ...(userId != null && { userId }),
    ...(buildNumber != null && { buildNumber }),
    ...(lastLoginIP != null && { lastLoginIP }),
    ...(pushToken != null && { pushToken }),
    ...(deviceMetadata != null && {
      deviceMetadata: omitNullish(deviceMetadata) as DeviceDto["deviceMetadata"],
    }),
    ...(healthReports.length > 0 && {
      healthReports: healthReports.map(
        (report) => omitNullish(report) as typeof report,
      ),
    }),
  };
};

export const mapDevicesToDto = (devices: Device[]): DeviceDto[] =>
  devices.map(mapDeviceToDto);