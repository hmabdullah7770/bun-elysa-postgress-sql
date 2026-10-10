import { rm } from "node:fs/promises";
import { bannerRepository } from "../repository/banner.repository";
import { ApiError } from "../utils/ApiError";
import { saveTempFile, uploadResult } from "../utils/cloudinary";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const imageExtensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

type BannerOwner = {
  _id: string;
  username: string;
  fullName: string | null;
  avatar?: string;
};

const getTimeRemaining = (expiresAt: Date) => {
  const remainingMs = Math.max(0, expiresAt.getTime() - Date.now());
  const hours = Math.floor(remainingMs / (60 * 60 * 1000));
  const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${minutes}m`;
};

const serializeBanner = <T extends { _id: number; expiresAt: Date }>(banner: T) => ({
  ...banner,
  _id: String(banner._id),
  expiryTime: banner.expiresAt,
  timeRemaining: getTimeRemaining(banner.expiresAt),
});

export class BannerService {
  async create(input: {
    owner: BannerOwner;
    store: string | null;
    bannerImage: File;
  }) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.owner._id)) {
      throw new ApiError(400, "Invalid user ID");
    }
    if (input.store !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.store)) {
      throw new ApiError(400, "Invalid store ID");
    }
    const extension = imageExtensions[input.bannerImage.type];
    if (!extension || input.bannerImage.size === 0 || input.bannerImage.size > MAX_IMAGE_SIZE) {
      throw new ApiError(400, "Banner image must be a JPEG, PNG, or WebP image under 10 MB");
    }

    const reservation = await bannerRepository.reserve(input.owner._id, input.store);
    if (reservation.status === "full") {
      throw new ApiError(400, "Maximum banner limit reached (5). Please try again when an existing banner expires.");
    }
    if (reservation.status === "owner_active") {
      throw new ApiError(
        400,
        `You already have an active banner. Please wait ${getTimeRemaining(reservation.expiresAt)} before creating another.`
      );
    }

    let localPath: string | undefined;
    try {
      const namedImage = new File([input.bannerImage], `banner${extension}`, {
        type: input.bannerImage.type,
      });
      localPath = await saveTempFile(namedImage, "banner");

      const upload = await uploadResult(localPath);
      if (!upload?.secure_url) {
        throw new ApiError(502, "Error while uploading banner image");
      }

      const banner = await bannerRepository.publish(
        reservation.banner._id,
        input.owner._id,
        upload.secure_url
      );
      if (!banner) throw new ApiError(500, "Could not save banner");

      return {
        ...serializeBanner(banner),
        owner: {
          _id: input.owner._id,
          username: input.owner.username,
          fullName: input.owner.fullName,
        },
      };
    } catch (error) {
      await bannerRepository.deleteByIdAndOwner(reservation.banner._id, input.owner._id);
      throw error;
    } finally {
      if (localPath) await rm(localPath, { force: true });
    }
  }

  async listActive() {
    await bannerRepository.deleteExpired();
    const rows = await bannerRepository.listActive();
    return rows.map(({ banner, owner }) => ({
      ...serializeBanner(banner),
      owner,
    }));
  }

  async delete(id: number, owner: string) {
    const deleted = await bannerRepository.deleteByIdAndOwner(id, owner);
    if (!deleted) throw new ApiError(404, "Banner not found");
    return serializeBanner(deleted);
  }

  async cleanupExpired() {
    return bannerRepository.deleteExpired();
  }
}

export const bannerService = new BannerService();
