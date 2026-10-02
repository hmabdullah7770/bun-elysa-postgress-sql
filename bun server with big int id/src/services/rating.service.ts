import { ratingRepository, type RatingInput } from "../repository/rating.repository";
import { ApiError } from "../utils/ApiError";

export class RatingService {
  async getPostRatings(params: {
    postId: number;
    page: number;
    limit: number;
    sortBy: "rating" | "createdAt" | "updatedAt";
    sortType: "asc" | "desc";
  }) {
    const post = await ratingRepository.findPublishedPost(params.postId);
    if (!post) throw new ApiError(404, "Post not found");

    const [rows, totalRatings] = await Promise.all([
      ratingRepository.listForPost(params),
      ratingRepository.countForPost(params.postId),
    ]);
    const totalPages = Math.ceil(totalRatings / params.limit);

    return {
      ratings: rows.map(({ rating, owner }) => ({ ...rating, owner })),
      summary: {
        averageRating: Number(post.averageRating),
        totalRatings: post.ratingCount,
      },
      pagination: {
        page: params.page,
        limit: params.limit,
        totalRatings,
        totalPages,
        hasNextPage: params.page < totalPages,
        hasPrevPage: params.page > 1,
      },
    };
  }

  async addRatings(owner: string, entries: RatingInput[]) {
    const results = await ratingRepository.processBulk(owner, entries);
    if (results.length === 0) {
      throw new ApiError(404, "No published posts found for the given IDs");
    }
    return { processed: results.length, results };
  }

  async updateRating(id: number, owner: string, patch: { rating?: number; comment?: string | null }) {
    const updated = await ratingRepository.updateById(id, owner, patch);
    if (!updated) throw new ApiError(404, "Rating not found");
    return { ...updated.rating, owner: updated.owner };
  }

  async deleteRating(id: number, owner: string) {
    const deleted = await ratingRepository.deleteById(id, owner);
    if (!deleted) throw new ApiError(404, "Rating not found");
  }

  async getSummary(postId: number) {
    const post = await ratingRepository.findPublishedPost(postId);
    if (!post) throw new ApiError(404, "Post not found");

    const rows = await ratingRepository.distributionForPost(postId);
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of rows) distribution[row.rating] = Number(row.count);

    return {
      averageRating: Number(post.averageRating),
      totalRatings: post.ratingCount,
      distribution,
    };
  }

  async getUserRating(postId: number, owner: string) {
    return ratingRepository.findByPostAndOwner(postId, owner);
  }
}

export const ratingService = new RatingService();