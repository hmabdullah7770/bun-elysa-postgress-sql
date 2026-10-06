import { flags } from "../../config/flags";
import { QUEUE_NAMES, addNotificationJob } from "../../MQ/Qstash/dispatcher/notification.dispatcher";
import { storeNotificationRepository } from "../../repository/store/store_get_Notification.repository";
import { ApiError } from "../../utils/ApiError";

export class StoreNotificationService {
  async toggle(params: { storeId: string; userId: string; username: string }) {
    const store = await storeNotificationRepository.findStore(params.storeId);
    if (!store) throw new ApiError(404, "Store not found");

    const result = await storeNotificationRepository.toggle(params.storeId, params.userId);
    const shouldNotifyOwner = result.subscribed || flags.paidUser;
    if (shouldNotifyOwner) {
      const type = result.subscribed ? "store-subscribe" : "store-unsubscribe";
      const title = result.subscribed ? "New Subscriber!" : "Subscriber Removed";
      const body = result.subscribed
        ? `${params.username} subscribed to your store notifications.`
        : `${params.username} unsubscribed from your store.`;
      void addNotificationJob(QUEUE_NAMES.STORE, type, {
        userId: store.ownerId,
        title,
        body,
      }).catch((error) => console.error("Store subscription push notification failed:", error));
    }

    return {
      storeId: params.storeId,
      userId: params.userId,
      getStoreNotification: result.subscribed,
      totalSubscribers: result.totalSubscribers,
    };
  }

  async getSubscribers(storeId: string) {
    const store = await storeNotificationRepository.findStore(storeId);
    if (!store) throw new ApiError(404, "Store not found");
    const subscribers = await storeNotificationRepository.listSubscribers(storeId);
    return { storeId, totalSubscribers: subscribers.length, subscribers };
  }
}

export const storeNotificationService = new StoreNotificationService();