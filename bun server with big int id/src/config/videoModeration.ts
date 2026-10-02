import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { extractFrames } from "./frameExtractor";
import { moderateFrames } from "./GoogleVision";

export const moderateVideo = async (videoPath: string) => {
  const framesDirectory = await mkdtemp(path.join(tmpdir(), "video-moderation-"));
  try {
    const framePaths = await extractFrames(videoPath, framesDirectory);
    return await moderateFrames(framePaths.map((framePath, frameIndex) => ({
      frameIndex,
      path: framePath,
    })));
  } finally {
    await rm(framesDirectory, { recursive: true, force: true });
  }
};