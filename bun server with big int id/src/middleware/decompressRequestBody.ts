import { Elysia } from "elysia";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";
import { ApiError } from "../utils/ApiError";

const gunzipAsync = promisify(gunzip);

const MAX_ENCODED_BYTES = 7 * 1024 * 1024; // raw base64 body limit
const MAX_DECOMPRESSED_BYTES = 5 * 1024 * 1024; // zip-bomb protection

const decompressRequestBody = new Elysia({ name: "gzip-base64-body-parser" }).onParse(
  { as: "scoped" },
  async ({ request }) => {
    if (request.headers.get("content-encoding")?.toLowerCase() !== "gzip-base64") {
      return; // let Elysia parse normal requests
    }

    try {
      const encodedBody = await request.text();

      if (encodedBody.length > MAX_ENCODED_BYTES) {
        throw new ApiError(413, "Request body too large");
      }

      const decompressed = await gunzipAsync(Buffer.from(encodedBody, "base64"), {
        maxOutputLength: MAX_DECOMPRESSED_BYTES,
      });

      return JSON.parse(decompressed.toString("utf8"));
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("gzip-base64 body parse failed:", error);
      throw new ApiError(400, "Failed to decompress or parse request body");
    }
  }
);

export default decompressRequestBody;

// import { Elysia } from "elysia";
// import { gunzipSync } from "node:zlib";
// import { ApiError } from "../utils/ApiError";

// const decompressRequestBody = new Elysia({ name: "gzip-base64-body-parser" }).onParse(
//   { as: "scoped" },
//   async ({ request }) => {
//     if (request.headers.get("content-encoding")?.toLowerCase() !== "gzip-base64") {
//       return;
//     }

//     try {
//       const encodedBody = await request.text();
//       const decompressedBody = gunzipSync(Buffer.from(encodedBody, "base64")).toString("utf8");
//       return JSON.parse(decompressedBody);
//     } catch {
//       throw new ApiError(400, "Failed to decompress or parse request body");
//     }
//   }
// );

// export default decompressRequestBody;