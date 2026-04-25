// src/utils/cloudinary.ts

import { unlink } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// ─── File type detection maps ──────────────────────────────────
const videoExtensions = new Set([
  "mp4", "avi", "mov", "mkv", "webm", "flv", "wmv",
]);

const audioExtensions = new Set([
  "mp3", "wav", "ogg", "aac", "flac", "m4a", "wma", "opus",
]);

const documentExtensions = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv",
]);

const imageExtensions = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff",
  "tif", "svg", "ico", "heic", "heif", "avif", "jfif",
]);

// ─── Type definitions ──────────────────────────────────────────
interface UploadResponse {
  url: string;
  secure_url: string;
  public_id: string;
  resource_type: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  duration?: number;
  hlsUrl?: string;
  dashUrl?: string;
  [key: string]: any;
}

// ─── Get resource type from file extension ─────────────────────
const getResourceType = (
  fileExtension: string,
  isVideo: boolean
): {
  resourceType: "image" | "video" | "raw" | "auto";
  isAudio: boolean;
  isVideo: boolean;
} => {
  if (!fileExtension) {
    return { resourceType: "auto", isAudio: false, isVideo };
  }

  if (isVideo || videoExtensions.has(fileExtension)) {
    return { resourceType: "video", isAudio: false, isVideo: true };
  }

  if (audioExtensions.has(fileExtension)) {
    return { resourceType: "video", isAudio: true, isVideo: false };
  }

  if (documentExtensions.has(fileExtension)) {
    return { resourceType: "raw", isAudio: false, isVideo: false };
  }

  if (imageExtensions.has(fileExtension)) {
    return { resourceType: "image", isAudio: false, isVideo: false };
  }

  return { resourceType: "auto", isAudio: false, isVideo: false };
};

// ─── Get extension from MIME type (fallback) ──────────────────
const getExtensionFromMime = (mimeType: string): string => {
  const mimeMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/bmp": "bmp",
    "image/tiff": "tiff",
    "image/svg+xml": "svg",
    "image/ico": "ico",
    "image/heic": "heic",
    "image/heif": "heif",
    "image/avif": "avif",
    "video/mp4": "mp4",
    "video/avi": "avi",
    "video/mov": "mov",
    "video/mkv": "mkv",
    "video/webm": "webm",
    "video/flv": "flv",
    "video/wmv": "wmv",
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
    "audio/aac": "aac",
    "audio/flac": "flac",
    "audio/m4a": "m4a",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
    "text/csv": "csv",
  };

  return mimeMap[mimeType.toLowerCase()] || "";
};

// ─── Delete local file (non-blocking) ──────────────────────────
const deleteLocalFile = (filePath: string): void => {
  unlink(filePath).catch((err) =>
    console.error("Failed to delete local file:", err)
  );
};

// ─── Generate Cloudinary signature ────────────────────────────
const generateSignature = (
  params: Record<string, string>,
  apiSecret: string
): string => {
  const sortedString = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto
    .createHash("sha256")
    .update(sortedString + apiSecret)
    .digest("hex");
};

// ─── Main upload function (direct REST — no SDK) ───────────────
const uploadResult = async (
  localfile: string,
  isVideo: boolean = false
): Promise<UploadResponse | null> => {
  try {
    if (!localfile) return null;

    const cloudName = process.env.CLAUDNARY_NAME!;
    const apiKey = process.env.CLAUDNARY_KEY!;
    const apiSecret = process.env.CLAUDNARY_SECRET!;

    const rawExtension = path.extname(localfile).slice(1).toLowerCase();
    const fileExtension = rawExtension || "";

    console.log("Uploading file:", localfile);
    console.log("Detected extension:", fileExtension || "none — using auto");

    const {
      resourceType,
      isAudio,
      isVideo: isVid,
    } = getResourceType(fileExtension, isVideo);

    console.log("Resource type:", resourceType);
    console.log("🔑 Cloudinary config check:", {
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret ? "SET" : "UNDEFINED",
    });

    // ✅ Generate fresh signature for every upload call
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const sigParams: Record<string, string> = { timestamp };
    const signature = generateSignature(sigParams, apiSecret);

    // ✅ Read file from disk and build multipart form
    const fileBuffer = readFileSync(localfile);
    const blob = new Blob([fileBuffer]);
    const form = new FormData();
    form.append("file", blob, path.basename(localfile));
    form.append("api_key", apiKey);
    form.append("timestamp", timestamp);
    form.append("signature", signature);
    form.append("resource_type", resourceType);

    // ✅ Direct HTTP call to Cloudinary REST API — no SDK involved
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

    console.log("📤 Uploading to:", uploadUrl);

    const res = await fetch(uploadUrl, { method: "POST", body: form });
    const json = (await res.json()) as any;

    if (!res.ok) {
      console.error("❌ Upload error:", json);
      deleteLocalFile(localfile);
      return null;
    }

    console.log("✅ File uploaded to Cloudinary:", json.secure_url);

    // Generate HLS + DASH URLs for videos
    if (isVid && !isAudio && json.public_id) {
      json.hlsUrl = `https://res.cloudinary.com/${cloudName}/video/upload/sp_auto/${json.public_id}.m3u8`;
      json.dashUrl = `https://res.cloudinary.com/${cloudName}/video/upload/sp_auto/${json.public_id}.mpd`;
      console.log("HLS URL:", json.hlsUrl);
      console.log("DASH URL:", json.dashUrl);
    }

    deleteLocalFile(localfile);

    return json as UploadResponse;
  } catch (error) {
    console.error("❌ Upload error:", error);

    if (existsSync(localfile)) {
      deleteLocalFile(localfile);
    }

    return null;
  }
};

// ─── Helper: Save Elysia File to temp disk ────────────────────
const saveTempFile = async (file: File): Promise<string> => {
  const tempDir = "./temp";
  const { mkdirSync } = await import("node:fs");

  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  let extension = path.extname(file.name || "").toLowerCase();

  if (!extension && file.type) {
    const extFromMime = getExtensionFromMime(file.type);
    extension = extFromMime ? `.${extFromMime}` : "";
  }

  const baseName = file.name
    ? path.basename(file.name, path.extname(file.name))
        .replace(/[^a-zA-Z0-9-_]/g, "_")
        .slice(0, 50)
    : "upload";

  const fileName = `${Date.now()}-${baseName}${extension}`;
  const tempPath = path.join(tempDir, fileName);

  console.log("💾 Saving temp file:", tempPath);
  console.log("📄 File name:", file.name);
  console.log("📦 File type:", file.type);
  console.log("📏 File size:", file.size, "bytes");

  const buffer = await file.arrayBuffer();
  await Bun.write(tempPath, buffer);

  return tempPath;
};

export { uploadResult, saveTempFile };


// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// // src/utils/cloudinary.ts

// import { v2 as cloudinary } from "cloudinary";
// import { unlink } from "node:fs/promises";
// import { existsSync } from "node:fs";
// import path from "node:path";

// // ─── File type detection maps ──────────────────────────────────
// const videoExtensions = new Set([
//   "mp4", "avi", "mov", "mkv", "webm", "flv", "wmv",
// ]);

// const audioExtensions = new Set([
//   "mp3", "wav", "ogg", "aac", "flac", "m4a", "wma", "opus",
// ]);

// const documentExtensions = new Set([
//   "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv",
// ]);

// const imageExtensions = new Set([
//   "jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff",
//   "tif", "svg", "ico", "heic", "heif", "avif", "jfif",
// ]);

// // ─── Type definitions ──────────────────────────────────────────
// interface UploadResponse {
//   url: string;
//   secure_url: string;
//   public_id: string;
//   resource_type: string;
//   format: string;
//   bytes: number;
//   width?: number;
//   height?: number;
//   duration?: number;
//   hlsUrl?: string;
//   dashUrl?: string;
//   [key: string]: any;
// }

// // ─── Get resource type from file extension ─────────────────────
// const getResourceType = (
//   fileExtension: string,
//   isVideo: boolean
// ): {
//   resourceType: "auto" | "video" | "raw" | "image";
//   isAudio: boolean;
//   isVideo: boolean;
// } => {
//   if (!fileExtension) {
//     return { resourceType: "auto", isAudio: false, isVideo };
//   }

//   if (isVideo || videoExtensions.has(fileExtension)) {
//     return { resourceType: "video", isAudio: false, isVideo: true };
//   }

//   if (audioExtensions.has(fileExtension)) {
//     return { resourceType: "video", isAudio: true, isVideo: false };
//   }

//   if (documentExtensions.has(fileExtension)) {
//     return { resourceType: "raw", isAudio: false, isVideo: false };
//   }

//   if (imageExtensions.has(fileExtension)) {
//     return { resourceType: "image", isAudio: false, isVideo: false };
//   }

//   return { resourceType: "auto", isAudio: false, isVideo: false };
// };

// // ─── Get extension from MIME type (fallback) ──────────────────
// const getExtensionFromMime = (mimeType: string): string => {
//   const mimeMap: Record<string, string> = {
//     "image/jpeg": "jpg",
//     "image/jpg": "jpg",
//     "image/png": "png",
//     "image/gif": "gif",
//     "image/webp": "webp",
//     "image/bmp": "bmp",
//     "image/tiff": "tiff",
//     "image/svg+xml": "svg",
//     "image/ico": "ico",
//     "image/heic": "heic",
//     "image/heif": "heif",
//     "image/avif": "avif",
//     "video/mp4": "mp4",
//     "video/avi": "avi",
//     "video/mov": "mov",
//     "video/mkv": "mkv",
//     "video/webm": "webm",
//     "video/flv": "flv",
//     "video/wmv": "wmv",
//     "audio/mp3": "mp3",
//     "audio/mpeg": "mp3",
//     "audio/wav": "wav",
//     "audio/ogg": "ogg",
//     "audio/aac": "aac",
//     "audio/flac": "flac",
//     "audio/m4a": "m4a",
//     "application/pdf": "pdf",
//     "application/msword": "doc",
//     "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
//     "text/plain": "txt",
//     "text/csv": "csv",
//   };

//   return mimeMap[mimeType.toLowerCase()] || "";
// };

// // ─── Delete local file (non-blocking) ──────────────────────────
// const deleteLocalFile = (filePath: string): void => {
//   unlink(filePath).catch((err) =>
//     console.error("Failed to delete local file:", err)
//   );
// };

// // ─── Main upload function ──────────────────────────────────────
// const uploadResult = async (
//   localfile: string,
//   isVideo: boolean = false
// ): Promise<UploadResponse | null> => {
//   try {
//     if (!localfile) return null;

//     const rawExtension = path.extname(localfile).slice(1).toLowerCase();
//     const fileExtension = rawExtension || "";

//     console.log("Uploading file:", localfile);
//     console.log("Detected extension:", fileExtension || "none — using auto");

//     const {
//       resourceType,
//       isAudio,
//       isVideo: isVid,
//     } = getResourceType(fileExtension, isVideo);

//     console.log("Resource type:", resourceType);

//     // ✅ Debug: check env vars before every upload
//     console.log("🔑 Cloudinary config check:", {
//       cloud_name: process.env.CLAUDNARY_NAME,
//       api_key: process.env.CLAUDNARY_KEY,
//       api_secret: process.env.CLAUDNARY_SECRET ? "SET" : "UNDEFINED",
//     });

//     // ✅ Re-apply config before every upload — Bun async can lose the global singleton
//     cloudinary.config({
//       cloud_name: process.env.CLAUDNARY_NAME,
//       api_key: process.env.CLAUDNARY_KEY,
//       api_secret: process.env.CLAUDNARY_SECRET,
//     });

//     const uploadOptions: Record<string, any> = {
//       resource_type: resourceType,
//     };

//     if (isVid && !isAudio) {
//       uploadOptions.eager = [
//         { streaming_profile: "auto", format: "m3u8" },
//         { streaming_profile: "auto", format: "mpd" },
//       ];
//       uploadOptions.eager_async = true;
//     }

//     const response = await cloudinary.uploader.upload(localfile, uploadOptions);

//     console.log("✅ File uploaded to Cloudinary:", response.secure_url);

//     if (isVid && !isAudio && response.public_id) {
//       response.hlsUrl = cloudinary.url(response.public_id, {
//         resource_type: "video",
//         format: "m3u8",
//         transformation: [{ streaming_profile: "auto" }],
//       });

//       response.dashUrl = cloudinary.url(response.public_id, {
//         resource_type: "video",
//         format: "mpd",
//         transformation: [{ streaming_profile: "auto" }],
//       });

//       console.log("HLS URL:", response.hlsUrl);
//       console.log("DASH URL:", response.dashUrl);
//     }

//     deleteLocalFile(localfile);

//     return response as UploadResponse;
//   } catch (error) {
//     console.error("❌ Upload error:", error);

//     if (existsSync(localfile)) {
//       deleteLocalFile(localfile);
//     }

//     return null;
//   }
// };

// // ─── Helper: Save Elysia File to temp disk ────────────────────
// const saveTempFile = async (file: File): Promise<string> => {
//   const tempDir = "./temp";
//   const { mkdirSync } = await import("node:fs");

//   if (!existsSync(tempDir)) {
//     mkdirSync(tempDir, { recursive: true });
//   }

//   let extension = path.extname(file.name || "").toLowerCase();

//   if (!extension && file.type) {
//     const extFromMime = getExtensionFromMime(file.type);
//     extension = extFromMime ? `.${extFromMime}` : "";
//   }

//   const baseName = file.name
//     ? path.basename(file.name, path.extname(file.name))
//         .replace(/[^a-zA-Z0-9-_]/g, "_")
//         .slice(0, 50)
//     : "upload";

//   const fileName = `${Date.now()}-${baseName}${extension}`;
//   const tempPath = path.join(tempDir, fileName);

//   console.log("💾 Saving temp file:", tempPath);
//   console.log("📄 File name:", file.name);
//   console.log("📦 File type:", file.type);
//   console.log("📏 File size:", file.size, "bytes");

//   const buffer = await file.arrayBuffer();
//   await Bun.write(tempPath, buffer);

//   return tempPath;
// };

// export { uploadResult, saveTempFile };


// ==============================================================================================================================

// // src/utils/cloudinary.ts

// import { v2 as cloudinary } from "cloudinary";
// import { unlink } from "node:fs/promises";
// import { existsSync } from "node:fs";
// import path from "node:path";

// cloudinary.config({
//   cloud_name: process.env.CLAUDNARY_NAME,
//   api_key: process.env.CLAUDNARY_KEY,
//   api_secret: process.env.CLAUDNARY_SECRET,
// });

// // ─── File type detection maps ──────────────────────────────────
// const videoExtensions = new Set([
//   "mp4", "avi", "mov", "mkv", "webm", "flv", "wmv",
// ]);
// const audioExtensions = new Set([
//   "mp3", "wav", "ogg", "aac", "flac", "m4a", "wma", "opus",
// ]);
// const documentExtensions = new Set([
//   "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv",
// ]);

// // ─── Type definitions ──────────────────────────────────────────
// interface UploadResponse {
//   url: string;
//   secure_url: string;
//   public_id: string;
//   resource_type: string;
//   format: string;
//   bytes: number;
//   width?: number;
//   height?: number;
//   duration?: number;
//   hlsUrl?: string;
//   dashUrl?: string;
//   [key: string]: any;
// }

// // ─── Delete local file (non-blocking) ──────────────────────────
// const deleteLocalFile = (filePath: string): void => {
//   // Bun-compatible: using node:fs/promises which Bun supports natively
//   unlink(filePath).catch((err) =>
//     console.error("Failed to delete local file:", err)
//   );
// };

// // ─── Main upload function ──────────────────────────────────────
// const uploadResult = async (
//   localfile: string,
//   isVideo: boolean = false
// ): Promise<UploadResponse | null> => {
//   try {
//     if (!localfile) {
//       return null;
//     }

//     // Get file extension using Bun-compatible path
//     const fileExtension = path.extname(localfile).slice(1).toLowerCase();

//     // Auto-detect file type
//     let resourceType: "auto" | "video" | "raw" | "image" = "auto";
//     let isAudio = false;

//     if (isVideo || videoExtensions.has(fileExtension)) {
//       resourceType = "video";
//       isVideo = true;
//     } else if (audioExtensions.has(fileExtension)) {
//       // Audio files need "video" resource type in Cloudinary
//       resourceType = "video";
//       isAudio = true;
//     } else if (documentExtensions.has(fileExtension)) {
//       // PDFs and documents must use "raw" resource type
//       resourceType = "raw";
//     }

//     // Build upload options
//     const uploadOptions: Record<string, any> = {
//       resource_type: resourceType,
//     };

//     // Add video-specific CMAF + HLS optimizations (not for audio)
//     if (isVideo && !isAudio) {
//       uploadOptions.eager = [
//         {
//           streaming_profile: "auto",
//           format: "m3u8",
//         },
//         {
//           streaming_profile: "auto",
//           format: "mpd",
//         },
//       ];
//       uploadOptions.eager_async = true;
//     }

//     // Upload to Cloudinary
//     const response = await cloudinary.uploader.upload(
//       localfile,
//       uploadOptions
//     );

//     console.log("File uploaded to Cloudinary:", response.url);

//     // Generate CMAF streaming URLs if video (not audio)
//     if (isVideo && !isAudio && response.public_id) {
//       const hlsUrl = cloudinary.url(response.public_id, {
//         resource_type: "video",
//         format: "m3u8",
//         transformation: [{ streaming_profile: "auto" }],
//       });

//       const dashUrl = cloudinary.url(response.public_id, {
//         resource_type: "video",
//         format: "mpd",
//         transformation: [{ streaming_profile: "auto" }],
//       });

//       response.hlsUrl = hlsUrl;
//       response.dashUrl = dashUrl;

//       console.log("HLS URL (CMAF):", hlsUrl);
//       console.log("DASH URL (CMAF):", dashUrl);
//     }

//     // Non-blocking async file deletion
//     deleteLocalFile(localfile);

//     return response as UploadResponse;
//   } catch (error) {
//     console.error("Upload error:", error);

//     // Cleanup on error (non-blocking)
//     if (existsSync(localfile)) {
//       deleteLocalFile(localfile);
//     }

//     return null;
//   }
// };

// // ─── Helper: Save Elysia File upload to temp disk ──────────────
// // Elysia gives us a Web API File object, Cloudinary needs a file path
// const saveTempFile = async (file: File): Promise<string> => {
//   // Ensure temp directory exists
//   const tempDir = "./temp";
//   const { mkdirSync } = await import("node:fs");
//   if (!existsSync(tempDir)) {
//     mkdirSync(tempDir, { recursive: true });
//   }

//   const fileName = `${Date.now()}-${file.name}`;
//   const tempPath = path.join(tempDir, fileName);

//   // Bun.write — native Bun API, fastest way to write files
//   const buffer = await file.arrayBuffer();
//   await Bun.write(tempPath, buffer);

//   return tempPath;
// };

// export { uploadResult, saveTempFile };