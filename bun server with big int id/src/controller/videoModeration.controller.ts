import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { videoModerationService } from "../services/videoModeration.service";

const parseId = (value: unknown) => {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new ApiError(400, "Invalid moderation record ID");
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new ApiError(400, "Invalid moderation record ID");
  return id;
};

export const checkVideoFrames = async ({ body, userVerified }: any) => {
  const mediaIndex = typeof body?.mediaIndex === "number"
    ? body.mediaIndex
    : Number(body?.mediaIndex);
  if (body?.mediaIndex === undefined || body.mediaIndex === "") {
    throw new ApiError(400, "mediaIndex is required");
  }

  const files = Array.isArray(body.frames)
    ? body.frames
    : body.frames
      ? [body.frames]
      : [];
  const result = await videoModerationService.checkFrames({
    uploadedBy: userVerified._id,
    mediaIndex,
    files,
  });
  return new ApiResponse(
    200,
    { ...result, _id: String(result._id) },
    result.approved
      ? "Video approved successfully"
      : "Video rejected — inappropriate content detected"
  );
};

export const verifyModeration = async ({ body, userVerified }: any) => {
  if (body?._id === undefined || body?._id === null || body?._id === "") {
    throw new ApiError(400, "_id is required");
  }
  const result = await videoModerationService.verify(userVerified._id, parseId(String(body._id)));
  return new ApiResponse(
    200,
    { ...result, _id: String(result._id) },
    "Video is approved and ready to post"
  );
};

export const deleteModerationRecord = async ({ params, userVerified }: any) => {
  const id = parseId(params.id);
  const deleted = await videoModerationService.delete(userVerified._id, id);
  return new ApiResponse(
    200,
    deleted ? { deleted: true, _id: String(id) } : { deleted: false },
    deleted
      ? "Moderation record deleted successfully"
      : "Moderation record not found (already deleted or never existed)"
  );
};