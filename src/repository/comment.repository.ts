import { and, desc, eq, ilike, inArray, lt, gt, sql, or } from "drizzle-orm";
import { db } from "../db";
import { comments, users } from "../schemas";

type CommentRow = {
  _id: number;
  inCommentId: bigint;
  postId: string;
  content: string | null;
  commentType: string;
  audioUrl: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  stickerUrl: string | null;
  fileUrl: string | null;
  pinned: boolean;
  owner: string;
  parentComment: number | null;
  isReply: boolean;
  numberOfLikes: number;
  numberOfDislikes: number;
  likedBy: string[];
  dislikedBy: string[];
  createdAt: Date;
  updatedAt: Date;
};

export class CommentRepository {
  async nextCommentId(): Promise<number> {
    const result = await db.execute<{ id: string }>(
      sql`select nextval(pg_get_serial_sequence('comments','_id'))::text as id`
    );
    const idStr = (result as any)?.[0]?.id;
    const id = Number(idStr);
    if (!Number.isFinite(id)) throw new Error("Failed to allocate comment id");
    return id;
  }

  async create(values: {
    _id: number;
    inCommentId: bigint;
    postId: string;
    owner: string;
    content?: string | null;
    pinned?: boolean;
    parentComment?: number | null;
    isReply?: boolean;
    commentType: string;
    audioUrl?: string | null;
    videoUrl?: string | null;
    imageUrl?: string | null;
    stickerUrl?: string | null;
    fileUrl?: string | null;
  }) {
    const inserted = await db.insert(comments).values(values as any).returning();
    return inserted[0] as unknown as CommentRow | undefined;
  }

  async findById(id: number) {
    const rows = await db.select().from(comments).where(eq(comments._id, id)).limit(1);
    return rows[0] as unknown as CommentRow | undefined;
  }

  async findByIdWithOwner(id: number) {
    const rows = await db
      .select({
        comment: comments,
        owner: {
          _id: users.id,
          username: users.username,
          fullName: users.fullName,
          avatar: users.avatar,
        },
      })
      .from(comments)
      .leftJoin(users, eq(comments.owner, users.id))
      .where(eq(comments._id, id))
      .limit(1);
    return rows[0] as any;
  }

  async updateById(id: number, patch: Partial<CommentRow>) {
    const updated = await db
      .update(comments)
      .set({ ...(patch as any), updatedAt: new Date() })
      .where(eq(comments._id, id))
      .returning();
    return updated[0] as unknown as CommentRow | undefined;
  }

  async deleteCascade(id: number) {
    return db.transaction(async (tx) => {
      await tx.delete(comments).where(eq(comments.parentComment, id));
      const deleted = await tx.delete(comments).where(eq(comments._id, id)).returning();
      return deleted[0] as unknown as CommentRow | undefined;
    });
  }

  async unpinForPost(postId: string) {
    await db
      .update(comments)
      .set({ pinned: false, updatedAt: new Date() })
      .where(and(eq(comments.postId, postId), eq(comments.pinned, true), eq(comments.isReply, false)));
  }

  async findPinnedForPost(postId: string) {
    const rows = await db
      .select({
        comment: comments,
        owner: {
          _id: users.id,
          username: users.username,
          fullName: users.fullName,
          avatar: users.avatar,
        },
      })
      .from(comments)
      .leftJoin(users, eq(comments.owner, users.id))
      .where(and(eq(comments.postId, postId), eq(comments.pinned, true), eq(comments.isReply, false)))
      .orderBy(desc(comments.createdAt))
      .limit(1);
    return rows[0] as any;
  }

  async findTopLevelPage(params: {
    postId: string;
    limit: number;
    sortType: "asc" | "desc";
    cursorCreatedAt?: Date | null;
    excludePinned?: boolean;
  }) {
    const whereParts = [
      eq(comments.postId, params.postId),
      eq(comments.isReply, false),
      ...(params.excludePinned ? [sql`${comments.pinned} is distinct from true`] : []),
      ...(params.cursorCreatedAt
        ? [
            params.sortType === "desc"
              ? lt(comments.createdAt, params.cursorCreatedAt)
              : gt(comments.createdAt, params.cursorCreatedAt),
          ]
        : []),
    ];

    const orderBy = params.sortType === "desc" ? desc(comments.createdAt) : comments.createdAt;

    return db
      .select({
        comment: comments,
        owner: {
          _id: users.id,
          username: users.username,
          fullName: users.fullName,
          avatar: users.avatar,
        },
      })
      .from(comments)
      .leftJoin(users, eq(comments.owner, users.id))
      .where(and(...(whereParts as any)))
      .orderBy(orderBy as any)
      .limit(params.limit);
  }

  async findByInCommentId(inCommentId: string) {
    // inCommentId comes from frontend as string; compare via bigint cast
    const rows = await db
      .select({ createdAt: comments.createdAt })
      .from(comments)
      .where(sql`${comments.inCommentId} = ${inCommentId}::bigint`)
      .limit(1);
    return rows[0] as { createdAt: Date } | undefined;
  }

  async getReplyCounts(parentIds: number[]) {
    if (parentIds.length === 0) return new Map<string, number>();

    const rows = await db
      .select({
        parentComment: comments.parentComment,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(comments)
      .where(and(eq(comments.isReply, true), inArray(comments.parentComment, parentIds as any)))
      .groupBy(comments.parentComment);

    return new Map(
      rows
        .filter((r) => r.parentComment !== null)
        .map((r) => [String(r.parentComment), Number(r.count)])
    );
  }

  async findRepliesPage(params: {
    parentComment: number;
    limit: number;
    sortType: "asc" | "desc";
    cursorCreatedAt?: Date | null;
  }) {
    const whereParts = [
      eq(comments.parentComment, params.parentComment),
      eq(comments.isReply, true),
      ...(params.cursorCreatedAt
        ? [
            params.sortType === "desc"
              ? lt(comments.createdAt, params.cursorCreatedAt)
              : gt(comments.createdAt, params.cursorCreatedAt),
          ]
        : []),
    ];

    const orderBy = params.sortType === "desc" ? desc(comments.createdAt) : comments.createdAt;

    return db
      .select({
        comment: comments,
        owner: {
          _id: users.id,
          username: users.username,
          fullName: users.fullName,
          avatar: users.avatar,
        },
      })
      .from(comments)
      .leftJoin(users, eq(comments.owner, users.id))
      .where(and(...(whereParts as any)))
      .orderBy(orderBy as any)
      .limit(params.limit);
  }

  async search(params: {
    postId: string;
    searchTerm: string;
    limit: number;
    includeReplies: boolean;
    withUsername: boolean;
    withContent: boolean;
    caseSensitive: boolean;
    minLikes: number;
    commentType?: string | null;
    dateFrom?: Date | null;
    dateTo?: Date | null;
    sortBy: "relevance" | "likes" | "recent";
  }) {
    const term = params.searchTerm.trim();
    const likeTerm = params.caseSensitive ? `%${term}%` : `%${term.toLowerCase()}%`;

    const baseWhere = [
      eq(comments.postId, params.postId),
      sql`${comments.numberOfLikes} >= ${params.minLikes}`,
      ...(params.includeReplies ? [] : [eq(comments.isReply, false)]),
      ...(params.commentType ? [eq(comments.commentType, params.commentType as any)] : []),
      ...(params.dateFrom ? [gt(comments.createdAt, params.dateFrom)] : []),
      ...(params.dateTo ? [lt(comments.createdAt, params.dateTo)] : []),
    ];

    // If both false => search both (same as old behavior)
    const shouldSearchContent = params.withContent || (!params.withUsername && !params.withContent);
    const shouldSearchUsername =
      params.withUsername || (!params.withUsername && !params.withContent);

    const contentCond = shouldSearchContent ? ilike(comments.content, likeTerm) : null;
    const usernameCond = shouldSearchUsername ? ilike(users.username, likeTerm) : null;
    const fullNameCond = shouldSearchUsername ? ilike(users.fullName, likeTerm) : null;

    const searchConds = [contentCond, usernameCond, fullNameCond].filter(Boolean) as any[];
    const searchWhere = [...baseWhere, ...(searchConds.length ? [or(...searchConds)] : [])];

    const orderBy =
      params.sortBy === "likes"
        ? desc(comments.numberOfLikes)
        : params.sortBy === "recent"
        ? desc(comments.createdAt)
        : desc(comments.createdAt);

    const rows = await db
      .select({
        comment: comments,
        owner: {
          _id: users.id,
          username: users.username,
          fullName: users.fullName,
          avatar: users.avatar,
        },
      })
      .from(comments)
      .leftJoin(users, eq(comments.owner, users.id))
      .where(and(...(searchWhere as any)))
      .orderBy(orderBy as any)
      .limit(params.limit);

    return rows as any[];
  }
}

export const commentRepository = new CommentRepository();

