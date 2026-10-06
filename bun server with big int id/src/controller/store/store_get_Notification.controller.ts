import { isUUID } from "../../Validators/isUUID";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { storeNotificationService } from "../../services/store/store_get_Notification.service";

export const toggleStoreNotification = async ({ params, userVerified }: any) => {
  const { storeId } = params;
  if (!isUUID(storeId)) throw new ApiError(400, "Invalid store ID");

  const data = await storeNotificationService.toggle({
    storeId,
    userId: userVerified._id,
    username: userVerified.username,
  });
  return new ApiResponse(
    200,
    data,
    data.getStoreNotification
      ? "Successfully subscribed to store notifications"
      : "Successfully unsubscribed from store notifications"
  );
};

export const getStoreSubscribers = async ({ params }: any) => {
  const { storeId } = params;
  if (!isUUID(storeId)) throw new ApiError(400, "Invalid store ID");
  const data = await storeNotificationService.getSubscribers(storeId);
  return new ApiResponse(200, data, "Store subscribers retrieved successfully");
};