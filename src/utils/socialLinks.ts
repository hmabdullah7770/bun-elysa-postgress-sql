import { ApiError } from "./ApiError";

const allowedLinks = [
  "whatsapp",
  "storeLink",
  "facebook",
  "instagram",
  "productlink",
] as const;

type AllowedLink = (typeof allowedLinks)[number];

// Bun/TS version of your old helper.
// - Create: returns { socialLinks }
// - Update: returns { $set, $unset }
export const processSocialLinks = (
  user: any,
  payload: Record<string, any>,
  existingPost: any = null
) => {
  const socialLinks: Record<string, any> = {};
  const errors: string[] = [];

  for (const link of allowedLinks) {
    const payloadValue = payload?.[link];
    const enabled =
      payloadValue === true ||
      (typeof payloadValue === "string" && payloadValue.toLowerCase() === "true");

    if (!enabled) continue;

    const userValue = user?.[link];

    if (typeof userValue === "number" && userValue > 0) {
      socialLinks[link] = userValue;
    } else if (typeof userValue === "string" && userValue.trim() !== "") {
      socialLinks[link] = userValue;
    } else {
      errors.push(`${link} not configured in profile`);
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join(", "));
  }

  // CREATE
  if (!existingPost) {
    if (Object.keys(socialLinks).length === 0) {
      throw new ApiError(400, "At least one social link required");
    }
    return { socialLinks };
  }

  // UPDATE
  const updateOps: any = { $set: {}, $unset: {} };

  // add/update enabled links
  for (const link of Object.keys(socialLinks)) {
    updateOps.$set[link] = socialLinks[link];
  }

  // remove links explicitly disabled in payload
  for (const link of allowedLinks) {
    if (existingPost?.[link] && !socialLinks[link] && payload?.[link] === false) {
      updateOps.$unset[link] = "";
    }
  }

  if (Object.keys(updateOps.$set).length === 0) delete updateOps.$set;
  if (Object.keys(updateOps.$unset).length === 0) delete updateOps.$unset;

  return updateOps;
};

