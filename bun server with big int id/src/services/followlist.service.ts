import { flags } from "../config/flags";
import {
  QUEUE_NAMES,
  addNotificationJob,
} from "../MQ/Qstash/dispatcher/notification.dispatcher";
import { followListRepository } from "../repository/followlist.repository";
import { createNotification } from "./notification.service";
import { ApiError } from "../utils/ApiError";

type FollowActor = { _id: string; username: string };

export class FollowListService {
  private async requireUser(userId: string) {
    const user = await followListRepository.findUser(userId);
    if (!user) throw new ApiError(404, "User not found");
  }

  private notifyFollowChange(
    actor: FollowActor,
    recipientId: string,
    followed: boolean
  ) {
    const type = followed ? "new-follower" : "unfollowed";
    const title = followed ? "New Follower!" : "Someone unfollowed you";
    const body = followed
      ? `${actor.username} started following you.`
      : `${actor.username} unfollowed you.`;

    void addNotificationJob(QUEUE_NAMES.FOLLOW, type, {
      userId: recipientId,
      title,
      body,
    }).catch((error) =>
      console.error("Follow notification queue failed:", error)
    );

    void createNotification({
      recipient: recipientId,
      sender: actor._id,
      type: "follow",
      title,
      body,
      metadata: { userId: actor._id },
    }).catch((error) =>
      console.error("Follow notification store failed:", error)
    );
  }

  async toggleFollow(followingId: string, actor: FollowActor) {
    await this.requireUser(followingId);
    if (followingId.toLowerCase() === actor._id.toLowerCase()) {
      throw new ApiError(400, "You cannot follow yourself");
    }

    const alreadyFollowing = await followListRepository.isFollowing(
      actor._id,
      followingId
    );

    if (alreadyFollowing) {
      const deleted = await followListRepository.deleteFollow(
        actor._id,
        followingId
      );
      if (!deleted) throw new ApiError(500, "Failed to unfollow");

      if (flags.paidUser) {
        this.notifyFollowChange(actor, followingId, false);
      }
      return { followed: false };
    }

    const follow = await followListRepository.createFollow(
      actor._id,
      followingId
    );
    if (!follow) throw new ApiError(500, "Failed to follow");

    this.notifyFollowChange(actor, followingId, true);
    return { followed: true };
  }

  async getFollowers(userId: string, page: number, limit: number) {
    await this.requireUser(userId);
    const { rows, total } = await followListRepository.listFollowers(
      userId,
      page,
      limit
    );
    const totalPages = Math.ceil(total / limit);
    return {
      followers: rows,
      pagination: {
        page,
        limit,
        totalFollowers: total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async getFollowing(userId: string, page: number, limit: number) {
    await this.requireUser(userId);
    const { rows, total } = await followListRepository.listFollowing(
      userId,
      page,
      limit
    );
    const totalPages = Math.ceil(total / limit);
    return {
      following: rows,
      pagination: {
        page,
        limit,
        totalFollowing: total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async isFollowing(actorId: string, userId: string) {
    return {
      following: await followListRepository.isFollowing(actorId, userId),
    };
  }

  async getFollowStats(userId: string) {
    await this.requireUser(userId);
    const [followerCount, followingCount] = await Promise.all([
      followListRepository.getFollowerCount(userId),
      followListRepository.getFollowingCount(userId),
    ]);
    return { followerCount, followingCount };
  }
}

export const followListService = new FollowListService();
