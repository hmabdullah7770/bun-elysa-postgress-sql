import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";

if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic);

export const extractFrames = async (videoPath: string, outputDir: string): Promise<string[]> => {
  if (!ffmpegStatic) throw new Error("FFmpeg binary is unavailable");
  await mkdir(outputDir, { recursive: true });

  await new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions(["-vf", "fps=1/5", "-vframes", "10", "-q:v", "2"])
      .output(path.join(outputDir, "frame_%03d.jpg"))
      .on("end", resolve)
      .on("error", reject)
      .run();
  });

  const frameNames = (await readdir(outputDir))
    .filter((fileName) => /^frame_\d+\.jpg$/.test(fileName))
    .sort();
  return frameNames.map((fileName) => path.join(outputDir, fileName));
};