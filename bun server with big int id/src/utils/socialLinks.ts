import { ApiError } from "./ApiErrors";

interface SocialLinksPayload {
	whatsapp?: boolean | string;
	storeLink?: boolean | string;
	facebook?: boolean | string;
	instagram?: boolean | string;
	productlink?: boolean | string;
	[key: string]: unknown;
}

interface UpdateOps {
	$set?: Record<string, unknown>;
	$unset?: Record<string, string>;
}

export const processSocialLinks = (
	user: Record<string, unknown>,
	payload: SocialLinksPayload,
	existingCard: Record<string, unknown> | null = null
): { socialLinks: Record<string, unknown> } | UpdateOps => {
	const socialLinks: Record<string, unknown> = {};
	const errors: string[] = [];
	const allowedLinks = [
		"whatsapp",
		"storeLink",
		"facebook",
		"instagram",
		"productlink",
	];

	allowedLinks.forEach((link) => {
		const payloadValue = payload[link];
		if (
			payloadValue === true ||
			(typeof payloadValue === "string" && payloadValue.toLowerCase() === "true")
		) {
			const userValue = user[link];

			if (typeof userValue === "number" && userValue > 0) {
				socialLinks[link] = userValue;
			} else if (typeof userValue === "string" && userValue.trim() !== "") {
				socialLinks[link] = userValue;
			} else {
				errors.push(`${link} not configured in profile`);
			}
		}
	});

	if (errors.length > 0) {
		throw new ApiError(400, errors.join(", "));
	}

	if (!existingCard) {
		if (Object.keys(socialLinks).length === 0) {
			throw new ApiError(400, "At least one social link required");
		}
		return { socialLinks };
	}

	const updateOps: UpdateOps = { $set: {}, $unset: {} };

	Object.keys(socialLinks).forEach((link) => {
		updateOps.$set![link] = socialLinks[link];
	});

	allowedLinks.forEach((link) => {
		if (existingCard[link] && !socialLinks[link] && payload[link] === false) {
			updateOps.$unset![link] = "";
		}
	});

	if (Object.keys(updateOps.$set!).length === 0) delete updateOps.$set;
	if (Object.keys(updateOps.$unset!).length === 0) delete updateOps.$unset;

	return updateOps;
};