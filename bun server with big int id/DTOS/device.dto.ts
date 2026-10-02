import type {
  Device,
  DeviceHealthReport,
  DeviceMetadata,
} from "../src/schemas/device.schema";

type OptionalDeviceFields =
  | "userId"
  | "buildNumber"
  | "lastLoginIP"
  | "pushToken"
  | "deviceMetadata"
  | "healthReports";

export type DeviceDto = Omit<Device, OptionalDeviceFields> & {
  userId?: string;
  buildNumber?: string;
  lastLoginIP?: string;
  pushToken?: string;
  deviceMetadata?: DeviceMetadata;
  healthReports?: DeviceHealthReport[];
};