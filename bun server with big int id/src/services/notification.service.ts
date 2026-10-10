import { notificationRepository } from "../repository/notification.repository";
import { ApiError } from "../utils/ApiError";

const serializeIdentity = <T extends { _id: number }>(record: T) => ({
  ...record,
  _id: String(record._id),
});

export type CreateNotificationInput = {
  recipient: string;
  sender?: string | null;
  store?: string | null;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
};

export const createNotification = async (input: CreateNotificationInput) => {
  const type = input.type.trim();
  const title = input.title.trim();
  const body = input.body.trim();
  if (!input.recipient || !type || !title || !body) {
    throw new ApiError(400, "recipient, type, title, and body are required");
  }

  const [recipient, sender, store] = await Promise.all([
    notificationRepository.findUser(input.recipient),
    input.sender ? notificationRepository.findUser(input.sender) : null,
    input.store ? notificationRepository.findStore(input.store) : null,
  ]);
  if (!recipient) throw new ApiError(404, "Notification recipient not found");
  if (input.sender && !sender) throw new ApiError(404, "Notification sender not found");
  if (input.store && !store) throw new ApiError(404, "Notification store not found");

  const notification = await notificationRepository.create({
    recipient: input.recipient,
    sender: input.sender ?? null,
    store: input.store ?? null,
    type,
    title,
    body,
    metadata: input.metadata ?? {},
  });
  if (!notification) throw new ApiError(500, "Notification could not be created");
  return notification;
};

export class NotificationService {
  async getUserNotifications(params: {
    recipient: string;
    type?: string;
    page: number;
    limit: number;
  }) {
    const { rows, totalCount } = await notificationRepository.listForRecipient(params);
    const totalPages = Math.ceil(totalCount / params.limit);
    return {
      notifications: rows.map(({ notification, sender, store }) => ({
        ...notification,
        _id: String(notification._id),
        sender: sender?._id ? sender : null,
        store: store?._id ? store : null,
      })),
      pagination: {
        page: params.page,
        limit: params.limit,
        totalCount,
        totalPages,
        hasNextPage: params.page < totalPages,
        hasPrevPage: params.page > 1,
      },
    };
  }

  async getUnreadCount(recipient: string) {
    return { unreadCount: await notificationRepository.countUnread(recipient) };
  }

  async getCounts(recipient: string) {
    return notificationRepository.getCounts(recipient);
  }

  async markAsRead(recipient: string, ids: number[]) {
    const result = await notificationRepository.markIdsRead(recipient, ids);
    if (result.matchedCount === 0) {
      throw new ApiError(404, "No notifications found to update");
    }
    return { modifiedCount: result.modifiedCount };
  }

  async markAllAsRead(recipient: string) {
    await notificationRepository.markAllRead(recipient);
  }

  async markAllAsSeen(recipient: string) {
    await notificationRepository.markAllSeen(recipient);
  }

  async deleteNotifications(recipient: string, ids: number[]) {
    const deleted = await notificationRepository.deleteIds(recipient, ids);
    if (!deleted.length) throw new ApiError(404, "No notifications found to delete");
    return { deletedCount: deleted.length };
  }

  async clearAllNotifications(recipient: string) {
    await notificationRepository.deleteAll(recipient);
  }

  async addNotificationType(input: { type: string; label: string; description?: string }) {
    const type = input.type.trim().toLowerCase();
    const label = input.label.trim();
    if (!type || !label) throw new ApiError(400, "type and label are required");
    const result = await notificationRepository.addType({
      type,
      label,
      description: input.description?.trim() ?? "",
    });
    if (!result) throw new ApiError(409, `Notification type "${type}" already exists`);
    return serializeIdentity(result);
  }

  async getNotificationTypes(includeInactive: boolean) {
    const types = await notificationRepository.listTypes(includeInactive);
    return types.map(serializeIdentity);
  }

  async updateNotificationTypeStatus(id: number, isActive: boolean) {
    const result = await notificationRepository.updateTypeStatus(id, isActive);
    if (!result) throw new ApiError(404, "Notification type not found");
    return serializeIdentity(result);
  }
}

export const notificationService = new NotificationService();