import { and, desc, eq, ilike, inArray, lt, gt, sql, or } from "drizzle-orm";
import { db } from "../db";
import { comments, users, posts } from "../schemas";
import { getNextCommentSequence } from "./commentCounter.repository";

type CommentRow = {
  _id: number;
  inCommentId: bigint;
  postId: number;
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
    return getNextCommentSequence("commentId");
  }



  
  async findPostById(postId: number) {
  const rows = await db
    .select({ _id: posts._id })
    .from(posts)
    .where(eq(posts._id,postId))  // convert inside
    .limit(1);
  return rows[0];
}

  async countByPost(postId: number, isReply?: boolean) {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(comments)
      .where(
        and(
          eq(comments.postId, postId),
          ...(isReply === undefined ? [] : [eq(comments.isReply, isReply)])
        )
      );
    return Number(rows[0]?.count ?? 0);
  }

  async countReplies(parentComment: number) {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(comments)
      .where(
        and(
          eq(comments.parentComment, parentComment),
          eq(comments.isReply, true)
        )
      );
    return Number(rows[0]?.count ?? 0);
  }


  async create(values: {
    _id: number;
    inCommentId: bigint;
    postId: number;
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
          _id: users._id,
          username: users.username,
          fullName: users.fullName,
          avatar: users.avatar,
        },
      })
      .from(comments)
      .leftJoin(users, eq(comments.owner, users._id))
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

  async unpinForPost(postId: number) {
    await db
      .update(comments)
      .set({ pinned: false, updatedAt: new Date() })
      .where(and(eq(comments.postId, postId), eq(comments.pinned, true), eq(comments.isReply, false)));
  }

  async findPinnedForPost(postId: number) {
    const rows = await db
      .select({
        comment: comments,
        owner: {
          _id: users._id,
          username: users.username,
          fullName: users.fullName,
          avatar: users.avatar,
        },
      })
      .from(comments)
      .leftJoin(users, eq(comments.owner, users._id))
      .where(and(eq(comments.postId, postId), eq(comments.pinned, true), eq(comments.isReply, false)))
      .orderBy(desc(comments.createdAt))
      .limit(1);
    return rows[0] as any;
  }

  async findTopLevelPage(params: {
    postId: number;
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
          _id: users._id,
          username: users.username,
          fullName: users.fullName,
          avatar: users.avatar,
        },
      })
      .from(comments)
      .leftJoin(users, eq(comments.owner, users._id))
      .where(and(...(whereParts as any)))
      .orderBy(orderBy as any)
      .limit(params.limit);
  }

  async findCommentCursor(postId: number, inCommentId: string) {
    const rows = await db
      .select({ createdAt: comments.createdAt })
      .from(comments)
      .where(
        and(
          eq(comments.postId, postId),
          eq(comments.isReply, false),
          sql`${comments.inCommentId} = ${inCommentId}::bigint`
        )
      )
      .limit(1);
    return rows[0] as { createdAt: Date } | undefined;
  }

  async findReplyCursor(parentComment: number, inCommentId: string) {
    const rows = await db
      .select({ createdAt: comments.createdAt })
      .from(comments)
      .where(
        and(
          eq(comments.parentComment, parentComment),
          eq(comments.isReply, true),
          sql`${comments.inCommentId} = ${inCommentId}::bigint`
        )
      )
      .limit(1);
    return rows[0] as { createdAt: Date } | undefined;
  }

  async findSearchCursor(
    postId: number,
    inCommentId: string,
    includeReplies: boolean
  ) {
    const rows = await db
      .select({
        _id: comments._id,
        createdAt: comments.createdAt,
        numberOfLikes: comments.numberOfLikes,
      })
      .from(comments)
      .where(
        and(
          eq(comments.postId, postId),
          ...(includeReplies ? [] : [eq(comments.isReply, false)]),
          sql`${comments.inCommentId} = ${inCommentId}::bigint`
        )
      )
      .limit(1);
    return rows[0];
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
          _id: users._id,
          username: users.username,
          fullName: users.fullName,
          avatar: users.avatar,
        },
      })
      .from(comments)
      .leftJoin(users, eq(comments.owner, users._id))
      .where(and(...(whereParts as any)))
      .orderBy(orderBy as any)
      .limit(params.limit);
  }

  async listRepliesForPost(postId: number) {
    return db
      .select({
        comment: comments,
        owner: {
          _id: users._id,
          username: users.username,
          fullName: users.fullName,
          avatar: users.avatar,
        },
      })
      .from(comments)
      .leftJoin(users, eq(comments.owner, users._id))
      .where(and(eq(comments.postId, postId), eq(comments.isReply, true)))
      .orderBy(desc(comments.createdAt));
  }

  async search(params: {
    postId: number;
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
    cursor?: {
      _id: number;
      createdAt: Date;
      numberOfLikes: number;
    };
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
        ? [desc(comments.numberOfLikes), desc(comments._id)]
        : params.sortBy === "recent"
        ? [desc(comments.createdAt), desc(comments._id)]
        : [desc(comments.createdAt), desc(comments._id)];

    const cursorCondition = params.cursor
      ? params.sortBy === "likes"
        ? or(
            lt(comments.numberOfLikes, params.cursor.numberOfLikes),
            and(
              eq(comments.numberOfLikes, params.cursor.numberOfLikes),
              lt(comments._id, params.cursor._id)
            )
          )
        : or(
            lt(comments.createdAt, params.cursor.createdAt),
            and(
              eq(comments.createdAt, params.cursor.createdAt),
              lt(comments._id, params.cursor._id)
            )
          )
      : undefined;
    const pageWhere = cursorCondition
      ? [...searchWhere, cursorCondition]
      : searchWhere;

    const [rows, countRows] = await Promise.all([
      db
        .select({
          comment: comments,
          owner: {
            _id: users._id,
            username: users.username,
            fullName: users.fullName,
            avatar: users.avatar,
          },
        })
        .from(comments)
        .leftJoin(users, eq(comments.owner, users._id))
        .where(and(...(pageWhere as any)))
        .orderBy(orderBy as any)
        .limit(params.limit),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(comments)
        .leftJoin(users, eq(comments.owner, users._id))
        .where(and(...(searchWhere as any))),
    ]);

    return { rows: rows as any[], total: Number(countRows[0]?.count ?? 0) };
  }
}

export const commentRepository = new CommentRepository();
