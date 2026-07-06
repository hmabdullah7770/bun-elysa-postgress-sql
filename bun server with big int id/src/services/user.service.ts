// src/services/user.service.ts
import { ApiError } from "../utils/ApiError";
import { userRepository } from "../repository/user.repository";
import { uploadResult, saveTempFile } from "../utils/cloudinary";

export class UserService {
  // â”€â”€â”€ Get Current User (with follow counts) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getCurrentUser(userId: string) {
    const user = await userRepository.findByIdWithFollowCounts(userId);
    if (!user) throw new ApiError(404, "User not found");

    // Get user stores
    const stores = await userRepository.getUserStores(userId);

    return { ...user, stores };
  }

  // â”€â”€â”€ Get User By ID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getUserById(id: string) {
    const user = await userRepository.findByIdSafe(id);
    if (!user) throw new ApiError(404, "User not found");
    return user;
  }

  // â”€â”€â”€ Get User Without Following Info â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getUserWithoutFollowing(userId: string) {
    const user = await userRepository.findByIdSafe(userId);
    if (!user) throw new ApiError(404, "User not found");
    return user;
  }

  // â”€â”€â”€ Get User Profile (Follow List / Channel Profile) â”€â”€â”€â”€â”€â”€â”€â”€

  async getUserProfile(username: string, currentUserId: string) {
    if (!username?.trim()) {
      throw new ApiError(400, "Username is required");
    }

    // Verify user exists
    const userExists = await userRepository.findByUsername(username);
    if (!userExists) {
      throw new ApiError(404, "Profile does not exist");
    }

    const profile = await userRepository.findProfileByUsername(
      username,
      currentUserId
    );
    if (!profile) {
      throw new ApiError(404, "Profile does not exist");
    }

    // Get stores
    const stores = await userRepository.getUserStores(profile._id);

    return { ...profile, stores };
  }

  // â”€â”€â”€ Update User â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async updateUser(
    userId: string,
    data: {
      email?: string;
      fullName?: string;
      whatsapp?: string;
      storeLink?: string;
      facebook?: string;
      instagram?: string;
      productlink?: string;
      bio?: string;
    }
  ) {
    const currentUser = await userRepository.findById(userId);
    if (!currentUser) throw new ApiError(404, "User not found");

    const updateData: Record<string, any> = {};

    // Only add fields that are provided
    if (data.email !== undefined) updateData.email = data.email;
    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.productlink !== undefined) updateData.productlink = data.productlink;
    if (data.whatsapp !== undefined) updateData.whatsapp = data.whatsapp || null;
    if (data.storeLink !== undefined) updateData.storeLink = data.storeLink || null;
    if (data.facebook !== undefined) updateData.facebook = data.facebook || null;
    if (data.instagram !== undefined) updateData.instagram = data.instagram || null;

    // Validate at least one social link will remain
    const finalWhatsapp =
      data.whatsapp !== undefined ? data.whatsapp : currentUser.whatsapp;
    const finalStoreLink =
      data.storeLink !== undefined ? data.storeLink : currentUser.storeLink;
    const finalFacebook =
      data.facebook !== undefined ? data.facebook : currentUser.facebook;
    const finalInstagram =
      data.instagram !== undefined ? data.instagram : currentUser.instagram;

    if (!finalWhatsapp && !finalStoreLink && !finalFacebook && !finalInstagram) {
      throw new ApiError(
        400,
        "At least one social link must be provided"
      );
    }

    // Check for duplicate social links
    const uniqueChecks: any = {};
    if (
      data.whatsapp !== undefined &&
      data.whatsapp !== currentUser.whatsapp &&
      data.whatsapp
    ) {
      uniqueChecks.whatsapp = data.whatsapp;
    }
    if (
      data.storeLink !== undefined &&
      data.storeLink !== currentUser.storeLink &&
      data.storeLink
    ) {
      uniqueChecks.storeLink = data.storeLink;
    }
    if (
      data.facebook !== undefined &&
      data.facebook !== currentUser.facebook &&
      data.facebook
    ) {
      uniqueChecks.facebook = data.facebook;
    }
    if (
      data.instagram !== undefined &&
      data.instagram !== currentUser.instagram &&
      data.instagram
    ) {
      uniqueChecks.instagram = data.instagram;
    }

    if (Object.keys(uniqueChecks).length > 0) {
      const existingUser = await userRepository.findBySocialLinks(
        uniqueChecks,
        userId
      );
      if (existingUser) {
        throw new ApiError(
          409,
          "One of the social links is already in use by another user"
        );
      }
    }

    if (Object.keys(updateData).length === 0) {
      const user = await userRepository.findByIdSafe(userId);
      return user;
    }

    const updatedUser = await userRepository.updateById(userId, updateData);
    return updatedUser;
  }

  // â”€â”€â”€ Change Avatar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async changeAvatar(userId: string, avatarFile: File) {
    if (!avatarFile) throw new ApiError(400, "Avatar file is required");

    const avatarPath = await saveTempFile(avatarFile);
    const avatar = await uploadResult(avatarPath);

    if (!avatar?.url) {
      throw new ApiError(500, "Failed to upload avatar");
    }

    const user = await userRepository.updateAvatar(userId, avatar.url);
    if (!user) throw new ApiError(404, "User not found");

    return user;
  }

  // â”€â”€â”€ Change Cover Image â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async changeCoverImage(userId: string, coverImageFile: File) {
    if (!coverImageFile) {
      throw new ApiError(400, "Cover image file is required");
    }

    const coverPath = await saveTempFile(coverImageFile);
    const coverImage = await uploadResult(coverPath);

    if (!coverImage?.url) {
      throw new ApiError(500, "Failed to upload cover image");
    }

    const user = await userRepository.updateCoverImage(userId, coverImage.url);
    if (!user) throw new ApiError(404, "User not found");

    return user;
  }

  // â”€â”€â”€ Get Watch History â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getWatchHistory(userId: string) {
    const history = await userRepository.getWatchHistory(userId);
    return history;
  }
}

export const userService = new UserService();