// src/middleware/storeOwner.ts
import { Elysia } from "elysia";
import { ApiError } from "../utils/ApiError";
import { createstoreRepository } from "../repository/store/createstore.repository";
import { isUUID } from "../Validators/isUUID";

export const verifyStoreOwner = new Elysia({ name: "verify-store-owner" })
  .derive(async ({ params, userVerified }: { params: Record<string, string>; userVerified?: { _id?: string; id?: string } }) => {

    console.log("In VerifyStoreOwner Middleware");
    console.log("Params:", params);

    const storeId = (params as Record<string, string>)?.storeId;

    if (!storeId) throw new ApiError(400, "Store ID is required");
    if (!isUUID(storeId)) {
      throw new ApiError(400, "Invalid store ID format");
    }

    if (!userVerified?._id) throw new ApiError(401, "Unauthorized - User not authenticated");

    const store = await createstoreRepository.findById(storeId);
    if (!store) throw new ApiError(404, "Store not found");

    if (store.ownerId !== userVerified._id) {
      throw new ApiError(403, "You are not authorized to perform this action");
    }

    return { store };
  });