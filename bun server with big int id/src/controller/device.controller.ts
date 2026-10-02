import { deviceService } from "../services/device.service";
import { mapDeviceToDto, mapDevicesToDto } from "../../Mapper/device.mapper";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";

export const storeDeviceInfo = async ({ body }: any) => {
  const result = await deviceService.storeDeviceInfo(body);
  return new ApiResponse(
    200,
    mapDeviceToDto(result.device),
    result.isNew ? "Device registered successfully" : "Device info updated successfully",
  );
};

export const getUserDevices = async ({ userVerified }: any) => {
  const found = await deviceService.getUserDevices(userVerified._id);
  if (found.length === 0) {
    return new ApiResponse(200, [], "No devices found for this user");
  }
  return new ApiResponse(200, mapDevicesToDto(found), `Found ${found.length} device(s)`);
};

export const getDeviceById = async ({ params, userVerified }: any) => {
  const device = await deviceService.getDeviceById(params.deviceId, userVerified._id);
  return new ApiResponse(200, mapDeviceToDto(device), "Device retrieved successfully");
};

export const updateDeviceHealth = async ({ params, body, userVerified }: any) => {
  const updated = await deviceService.updateDeviceHealth(
    params.deviceId,
    userVerified._id,
    body,
  );
  return new ApiResponse(200, mapDeviceToDto(updated), "Device health report updated successfully");
};

export const linkUserToDevice = async ({ params, userVerified }: any) => {
  const updated = await deviceService.linkUserToDevice(params.id, userVerified._id);
  return new ApiResponse(200, mapDeviceToDto(updated), "User linked to device successfully");
};

export const playWithDevice = async () => {
  throw new ApiError(501, "Device hardware control is not implemented");
};