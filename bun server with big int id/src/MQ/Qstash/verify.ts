import { Receiver } from "@upstash/qstash";

export const getVerifiedQstashBody = async (request: Request): Promise<string | null> => {
  const rawBody = await request.text();
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  const signature = request.headers.get("upstash-signature");

  if (process.env.NODE_ENV === "development" && (!currentSigningKey || !nextSigningKey)) {
    return rawBody;
  }
  if (!currentSigningKey || !nextSigningKey || !signature) return null;

  try {
    const receiver = new Receiver({
      currentSigningKey,
      nextSigningKey,
      devMode: process.env.NODE_ENV === "development",
    });
    await receiver.verify({ signature, body: rawBody });
    return rawBody;
  } catch {
    return null;
  }
};