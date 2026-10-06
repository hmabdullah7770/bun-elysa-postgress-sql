import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { flags } from "../config/flags";
import { moderateFrames, type ModerationFrame } from "../config/GoogleVision";
import { videoModerationRepository } from "../repository/videoModeration.repository";
import { ApiError } from "../utils/ApiError";

const MAX_FRAMES = 15;
const fileExtensionByType: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export class VideoModerationService {
  async checkFrames(input: {
    uploadedBy: string;
    mediaIndex: number;
    files: File[];
  }) {
    if (!Number.isSafeInteger(input.mediaIndex) || input.mediaIndex < 0) {
      throw new ApiError(400, "mediaIndex must be a non-negative integer");
    }
    if (!input.files.length) throw new ApiError(400, "frames files are required and cannot be empty");
    if (input.files.length > MAX_FRAMES) throw new ApiError(400, `Maximum ${MAX_FRAMES} frames allowed per video`);

    for (const file of input.files) {
      if (!fileExtensionByType[file.type]) {
        throw new ApiError(400, "Frames must be JPEG, PNG, or WebP images");
      }
    }

    const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "video-moderation-"));
    let recordId: number | null = null;

    try {
      const frames: ModerationFrame[] = await Promise.all(input.files.map(async (file, frameIndex) => {
        const framePath = path.join(
          temporaryDirectory,
          `frame_${frameIndex}${fileExtensionByType[file.type]}`
        );
        await writeFile(framePath, new Uint8Array(await file.arrayBuffer()));
        return { frameIndex, path: framePath };
      }));

      const record = await videoModerationRepository.createProcessingRecord({
        uploadedBy: input.uploadedBy,
        mediaIndex: input.mediaIndex,
        approved: false,
        rejectionReason: null,
        processing: true,
      });
      if (!record) {
        throw new ApiError(429, "Another video is still being processed. Please wait.");
      }
      recordId = record._id;

      if (flags.downloadFrames) await this.archiveFrames(frames, recordId);

      const result = await moderateFrames(frames, {
        onFrameChecked: (frame, frameResult) => {
          console.log(
            frameResult.isFlagged
              ? `Frame ${frame.frameIndex} flagged for mediaIndex ${input.mediaIndex}`
              : `Frame ${frame.frameIndex} passed for mediaIndex ${input.mediaIndex}`
          );
        },
        onFrameError: (frame, error) => {
          console.error(`Vision check failed for frame ${frame.frameIndex}:`, error);
        },
      });

      const updated = await videoModerationRepository.updateResult(recordId, {
        approved: result.approved,
        rejectionReason: result.approved ? null : result.rejectionReason,
      });
      if (!updated) throw new ApiError(500, "Could not save moderation result");

      return {
        _id: updated._id,
        approved: updated.approved,
        mediaIndex: updated.mediaIndex,
        rejectionReason: updated.approved
          ? null
          : "Content violates community guidelines",
      };
    } catch (error) {
      if (recordId !== null) {
        await videoModerationRepository.updateResult(recordId, {
          approved: false,
          rejectionReason: "Moderation processing failed",
        });
      }
      throw error;
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }

  async verify(uploadedBy: string, id: number) {
    const record = await videoModerationRepository.findByIdAndOwner(id, uploadedBy);
    if (!record) throw new ApiError(404, "Moderation record not found or does not belong to you");
    if (record.processing) throw new ApiError(409, "Video moderation is still in progress. Please wait.");
    if (!record.approved) {
      throw new ApiError(403, `Video was rejected: ${record.rejectionReason ?? "not approved"}`);
    }
    return { valid: true, _id: record._id, mediaIndex: record.mediaIndex };
  }

  async delete(uploadedBy: string, id: number) {
    return Boolean(await videoModerationRepository.deleteByIdAndOwner(id, uploadedBy));
  }

  private async archiveFrames(frames: ModerationFrame[], recordId: number) {
    const archiveDirectory = path.join(
      process.cwd(),
      "public",
      "temp",
      "moderation-frames",
      String(recordId)
    );
    await mkdir(archiveDirectory, { recursive: true });
    await Promise.all(frames.map(async (frame) => {
      try {
        await copyFile(frame.path, path.join(archiveDirectory, path.basename(frame.path)));
      } catch (error) {
        console.warn(`Could not archive moderation frame ${frame.frameIndex}:`, error);
      }
    }));
  }
}

export const videoModerationService = new VideoModerationService();