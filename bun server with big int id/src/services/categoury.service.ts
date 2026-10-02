import { followListRepository } from "../repository/followlist.repository";
import { categouryRepository } from "../repository/categoury.repository";
import { postService } from "./post.service";
import { ApiError } from "../utils/ApiError";

export class CategouryService {
  async getCategories(page: number, limit: number) {
    const result = await categouryRepository.list(page, limit);
    return {
      categories: result.rows,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
        hasNextPage: page < Math.ceil(result.total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  async getAllCategoryNames() {
    return categouryRepository.listNames();
  }

  async addCategory(name: string) {
    const normalizedName = this.validateName(name);
    if (await categouryRepository.findByName(normalizedName)) {
      throw new ApiError(409, "Category already exists");
    }
    const category = await categouryRepository.create({ categouryname: normalizedName });
    if (!category) throw new ApiError(409, "Category already exists");
    return category;
  }

  async updateCategory(id: number, name: string) {
    const normalizedName = this.validateName(name);
    const existing = await categouryRepository.findById(id);
    if (!existing) throw new ApiError(404, "Category not found");
    const duplicate = await categouryRepository.findByName(normalizedName);
    if (duplicate && duplicate._id !== id) throw new ApiError(409, "Category already exists");
    const updated = await categouryRepository.update(id, normalizedName);
    if (!updated) throw new ApiError(404, "Category not found");
    return updated;
  }

  async deleteCategory(id: number) {
    const deleted = await categouryRepository.delete(id);
    if (!deleted) throw new ApiError(404, "Category not found");
    return deleted;
  }

  async deleteCategoryByName(name: string) {
    const existing = await categouryRepository.findByName(this.validateName(name));
    if (!existing) throw new ApiError(404, "Category not found");
    return this.deleteCategory(existing._id);
  }

  async getCategoryFeed(params: {
    query: any;
    userVerified?: any;
    followingOnly?: boolean;
    videosOnly?: boolean;
    imagesOnly?: boolean;
  }) {
    let userIdsFilter: string[] | undefined;
    if (params.followingOnly) {
      userIdsFilter = await followListRepository.getFollowingIds(params.userVerified._id);
    }
    return postService.getAllPosts({
      query: params.query,
      userVerified: params.userVerified,
      userIdsFilter,
      videosOnly: params.videosOnly,
      imagesOnly: params.imagesOnly,
    });
  }

  private validateName(name: string) {
    const normalizedName = name.trim();
    if (!normalizedName) throw new ApiError(400, "Category name is required");
    if (normalizedName.length > 255) throw new ApiError(400, "Category name cannot exceed 255 characters");
    return normalizedName;
  }
}

export const categouryService = new CategouryService();