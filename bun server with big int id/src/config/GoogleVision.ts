import vision from "@google-cloud/vision";
import { existsSync, unlinkSync } from "node:fs";

const visionClient = new vision.ImageAnnotatorClient();

const likelihoodScores: Record<string, number> = {
  UNKNOWN: 0,
  VERY_UNLIKELY: 1,
  UNLIKELY: 2,
  POSSIBLE: 3,
  LIKELY: 4,
  VERY_LIKELY: 5,
};

export const likelihoodToScore = (likelihood: unknown): number => {
  if (typeof likelihood === "number") return likelihood;
  return typeof likelihood === "string" ? likelihoodScores[likelihood] ?? 0 : 0;
};

export const shouldFlag = (safeSearch: {
  adult?: unknown;
  violence?: unknown;
  racy?: unknown;
} | null | undefined): boolean => {
  if (!safeSearch) return false;
  return (
    likelihoodToScore(safeSearch.adult) >= 3 ||
    likelihoodToScore(safeSearch.violence) >= 4 ||
    likelihoodToScore(safeSearch.racy) >= 4
  );
};

export const deleteTempFile = (filePath?: string | null) => {
  if (!filePath) return;
  try {
    if (existsSync(filePath)) unlinkSync(filePath);
  } catch (error) {
    console.warn("Temporary moderation file cleanup failed:", filePath, error);
  }
};

export const checkFrameWithVision = async (imagePath: string) => {
  try {
    const [result] = await visionClient.safeSearchDetection(imagePath);
    const safeSearch = result.safeSearchAnnotation;
    const isFlagged = shouldFlag(safeSearch);
    return {
      isFlagged,
      reason: isFlagged
        ? `adult=${safeSearch?.adult}, violence=${safeSearch?.violence}, racy=${safeSearch?.racy}`
        : null,
    };
  } catch (error) {
    console.error("Google Vision SafeSearch failed; approving frame:", error);
    return { isFlagged: false, reason: null };
  }
};

export type ModerationFrame = { frameIndex: number; path: string };
export type FrameModerationResult = { isFlagged: boolean; reason: string | null };

export const moderateFrame = async (frame: ModerationFrame): Promise<FrameModerationResult> => {
  try {
    return await checkFrameWithVision(frame.path);
  } finally {
    deleteTempFile(frame.path);
  }
};

export const moderateFrames = async (
  frames: ModerationFrame[],
  callbacks: {
    onFrameChecked?: (frame: ModerationFrame, result: FrameModerationResult) => void;
    onFrameError?: (frame: ModerationFrame, error: unknown) => void;
  } = {}
) => {
  for (const frame of frames) {
    try {
      const result = await moderateFrame(frame);
      callbacks.onFrameChecked?.(frame, result);
      if (result.isFlagged) {
        return { approved: false, rejectionReason: result.reason };
      }
    } catch (error) {
      callbacks.onFrameError?.(frame, error);
    }
  }
  return { approved: true, rejectionReason: null };
};