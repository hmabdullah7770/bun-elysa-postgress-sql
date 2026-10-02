import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { promisify } from "util";

const unlinkAsync = promisify(fs.unlink);

cloudinary.config({
	cloud_name: process.env.CLAUDNARY_NAME,
	api_key: process.env.CLAUDNARY_KEY,
	api_secret: process.env.CLAUDNARY_SECRET,
	secure: true,
});

interface CloudinaryUploadResponse {
	url: string;
	secure_url?: string;
	public_id?: string;
	hlsUrl?: string;
	dashUrl?: string;
	[key: string]: unknown;
}

const uploadResult = async (
	localfile: string,
	isVideo: boolean = false
): Promise<CloudinaryUploadResponse | null> => {
	try {
		if (!localfile) return null;

		const fileExtension = localfile.split(".").pop()?.toLowerCase() ?? "";
		const videoExtensions = ["mp4", "avi", "mov", "mkv", "webm", "flv", "wmv"];
		const audioExtensions = ["mp3", "wav", "ogg", "aac", "flac", "m4a", "wma", "opus"];
		const documentExtensions = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"];

		let resourceType: "auto" | "video" | "raw" = "auto";
		let isAudio = false;

		if (isVideo || videoExtensions.includes(fileExtension)) {
			resourceType = "video";
			isVideo = true;
		} else if (audioExtensions.includes(fileExtension)) {
			resourceType = "video";
			isAudio = true;
		} else if (documentExtensions.includes(fileExtension)) {
			resourceType = "raw";
		}

		const uploadOptions: Record<string, unknown> = {
			resource_type: resourceType,
		};

		if (isVideo && !isAudio) {
			uploadOptions.eager = [
				{ streaming_profile: "auto", format: "m3u8" },
				{ streaming_profile: "auto", format: "mpd" },
			];
			uploadOptions.eager_async = true;
		}

		const response = (await cloudinary.uploader.upload(
			localfile,
			uploadOptions
		)) as CloudinaryUploadResponse;

		if (response?.secure_url) response.url = response.secure_url;

		console.log("File uploaded to Cloudinary:", response.url);

		if (isVideo && !isAudio && response.public_id) {
			response.hlsUrl = cloudinary.url(response.public_id, {
				resource_type: "video",
				format: "m3u8",
				transformation: [{ streaming_profile: "auto" }],
			});
			response.dashUrl = cloudinary.url(response.public_id, {
				resource_type: "video",
				format: "mpd",
				transformation: [{ streaming_profile: "auto" }],
			});

			console.log("HLS URL (CMAF):", response.hlsUrl);
			console.log("DASH URL (CMAF):", response.dashUrl);
		}

		unlinkAsync(localfile).catch((error) =>
			console.error("Failed to delete local file:", error)
		);

		return response;
	} catch (error) {
		console.error("Upload error:", error);

		if (fs.existsSync(localfile)) {
			unlinkAsync(localfile).catch((deleteError) =>
				console.error("Failed to delete local file after error:", deleteError)
			);
		}

		return null;
	}
};

export { uploadResult };