import { ApiError } from "../utils/ApiError";
import { deviceRepository } from "../repository/device.repository";
import { userRepository } from "../repository/user.repository";
import type { DeviceHealthReport, NewDevice } from "../schemas/device.schema";

type StoreDeviceInput = Pick<
  NewDevice,
  "deviceId" | "brand" | "model" | "systemName" | "systemVersion" | "totalRAM" | "totalStorage"
> & Partial<Pick<
  NewDevice,
  "deviceName" | "appVersion" | "isAuth" | "deviceType" | "buildNumber" | "pushToken" | "deviceMetadata"
>>;

type HealthInput = Pick<DeviceHealthReport, "freeRAM" | "freeStorage" | "batteryLevel" | "isCharging">;

const deviceUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class DeviceService {
  async storeDeviceInfo(data: StoreDeviceInput) {
    if ([data.deviceId, data.brand, data.model, data.systemName, data.systemVersion]
      .some((field) => typeof field !== "string" || !field.trim())) {
      throw new ApiError(400, "All device fields are required");
    }

    if (!Number.isFinite(data.totalRAM) || data.totalRAM <= 0 ||
      !Number.isFinite(data.totalStorage) || data.totalStorage <= 0) {
      throw new ApiError(400, "Total RAM and Storage are required");
    }

    const existing = await deviceRepository.findByDeviceId(data.deviceId);
    if (existing) {
      const updated = await deviceRepository.updateById(existing._id, {
        deviceName: data.deviceName || existing.deviceName,
        systemVersion: data.systemVersion,
        appVersion: data.appVersion || existing.appVersion,
        isAuth: Boolean(data.isAuth),
        lastActive: new Date(),
      });
      if (!updated) throw new ApiError(500, "Failed to update device information");
      return { device: updated, isNew: false };
    }

    const device = await deviceRepository.create({
      ...data,
      deviceName: data.deviceName || `${data.brand} ${data.model}`,
      appVersion: data.appVersion || "1.0.0",
      isAuth: Boolean(data.isAuth),
      lastActive: new Date(),
    });
    return { device, isNew: true };
  }

  async getUserDevices(userId: string) {
    return deviceRepository.findByUserId(userId);
  }

  async getDeviceById(deviceId: string, userId: string) {
    const device = await deviceRepository.findByDeviceIdAndUserId(deviceId, userId);
    if (!device) {
      throw new ApiError(404, "Device not found or does not belong to this user");
    }
    return device;
  }

  async updateDeviceHealth(deviceId: string, userId: string, data: HealthInput) {
    const device = await this.getDeviceById(deviceId, userId);
    if (Object.values(data).every((value) => value === undefined)) {
      throw new ApiError(400, "At least one health field is required");
    }

    const previous = device.healthReports[0];
    const report: DeviceHealthReport = {
      freeRAM: data.freeRAM ?? previous?.freeRAM,
      freeStorage: data.freeStorage ?? previous?.freeStorage,
      batteryLevel: data.batteryLevel ?? previous?.batteryLevel,
      isCharging: data.isCharging ?? previous?.isCharging,
      timestamp: new Date().toISOString(),
    };
    const updated = await deviceRepository.updateHealthReports(
      device._id,
      [report, ...device.healthReports].slice(0, 100),
    );
    if (!updated) throw new ApiError(500, "Failed to update device health");
    return updated;
  }

  async linkUserToDevice(deviceId: string, userId: string) {
    if (!deviceUuidPattern.test(deviceId)) {
      throw new ApiError(400, "Invalid device ID");
    }

    const user = await userRepository.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    const device = await deviceRepository.findById(deviceId);
    if (!device) {
      throw new ApiError(404, "Device not found. Call /devices/store first.");
    }

    const updated = await deviceRepository.linkToUser(deviceId, userId);
    if (!updated) throw new ApiError(500, "Failed to link user to device");
    return updated;
  }
}

export const deviceService = new DeviceService();