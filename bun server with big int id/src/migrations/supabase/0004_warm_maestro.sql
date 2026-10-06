CREATE TYPE "public"."subscription_plan" AS ENUM('free', 'basic', 'pro', 'premium', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'inactive', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."subscription_type" AS ENUM('inapp', 'store');--> statement-breakpoint
CREATE TABLE "comment_counters" (
	"_id" text PRIMARY KEY NOT NULL,
	"seq" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ratings__id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"rating" integer NOT NULL,
	"post_id" bigint NOT NULL,
	"owner" uuid NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_rating_range_check" CHECK ("ratings"."rating" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "bids" (
	"_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bids__id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"post_id" bigint NOT NULL,
	"product_id" bigint NOT NULL,
	"store_id" uuid NOT NULL,
	"owner" uuid NOT NULL,
	"bid_for_user_id" uuid,
	"bid_amount" numeric(12, 2) NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bids_positive_amount_check" CHECK ("bids"."bid_amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories__id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"categouryname" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_types" (
	"_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_types__id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"type" varchar(100) NOT NULL,
	"label" varchar(255) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notifications__id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"recipient" uuid NOT NULL,
	"sender" uuid,
	"store" uuid,
	"type" varchar(100) NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_seen" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "subscriptions__id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"type" "subscription_type" NOT NULL,
	"user" uuid NOT NULL,
	"store" uuid,
	"plan" "subscription_plan" DEFAULT 'free' NOT NULL,
	"status" "subscription_status" DEFAULT 'inactive' NOT NULL,
	"started_at" timestamp,
	"expires_at" timestamp,
	"gateway_subscription_id" text,
	"gateway_customer_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_store_type_check" CHECK (("subscriptions"."type" = 'store' and "subscriptions"."store" is not null) or ("subscriptions"."type" = 'inapp' and "subscriptions"."store" is null))
);
--> statement-breakpoint
CREATE TABLE "video_moderation" (
	"_id" bigserial PRIMARY KEY NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"rejection_reason" text,
	"media_index" integer NOT NULL,
	"processing" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_notification_subscriptions" (
	"_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "store_notification_subscriptions__id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"store_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fcm_token" text;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_post_id_posts__id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_owner_users__id_fk" FOREIGN KEY ("owner") REFERENCES "public"."users"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_user_id_users__id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_post_id_posts__id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_product_id_store_product__id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."store_product"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_store_id_createStore__id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."createStore"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_owner_users__id_fk" FOREIGN KEY ("owner") REFERENCES "public"."users"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_bid_for_user_id_users__id_fk" FOREIGN KEY ("bid_for_user_id") REFERENCES "public"."users"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_users__id_fk" FOREIGN KEY ("recipient") REFERENCES "public"."users"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sender_users__id_fk" FOREIGN KEY ("sender") REFERENCES "public"."users"("_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_store_createStore__id_fk" FOREIGN KEY ("store") REFERENCES "public"."createStore"("_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_users__id_fk" FOREIGN KEY ("user") REFERENCES "public"."users"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_store_createStore__id_fk" FOREIGN KEY ("store") REFERENCES "public"."createStore"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_moderation" ADD CONSTRAINT "video_moderation_uploaded_by_users__id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_notification_subscriptions" ADD CONSTRAINT "store_notification_subscriptions_store_id_createStore__id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."createStore"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_notification_subscriptions" ADD CONSTRAINT "store_notification_subscriptions_user_id_users__id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ratings_post_owner_unique" ON "ratings" USING btree ("post_id","owner");--> statement-breakpoint
CREATE INDEX "ratings_owner_idx" ON "ratings" USING btree ("owner");--> statement-breakpoint
CREATE INDEX "ratings_post_rating_idx" ON "ratings" USING btree ("post_id","rating");--> statement-breakpoint
CREATE INDEX "bids_post_amount_idx" ON "bids" USING btree ("post_id","bid_amount");--> statement-breakpoint
CREATE INDEX "bids_user_created_idx" ON "bids" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "bids_post_user_idx" ON "bids" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE INDEX "bids_recipient_amount_idx" ON "bids" USING btree ("bid_for_user_id","bid_amount");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_categouryname_unique" ON "categories" USING btree ("categouryname");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_types_type_unique" ON "notification_types" USING btree ("type");--> statement-breakpoint
CREATE INDEX "notification_types_active_created_idx" ON "notification_types" USING btree ("is_active","created_at");--> statement-breakpoint
CREATE INDEX "notifications_recipient_created_idx" ON "notifications" USING btree ("recipient","created_at");--> statement-breakpoint
CREATE INDEX "notifications_recipient_type_created_idx" ON "notifications" USING btree ("recipient","type","created_at");--> statement-breakpoint
CREATE INDEX "notifications_recipient_read_idx" ON "notifications" USING btree ("recipient","is_read");--> statement-breakpoint
CREATE INDEX "notifications_recipient_seen_idx" ON "notifications" USING btree ("recipient","is_seen");--> statement-breakpoint
CREATE INDEX "subscriptions_user_status_idx" ON "subscriptions" USING btree ("user","status");--> statement-breakpoint
CREATE INDEX "subscriptions_store_status_idx" ON "subscriptions" USING btree ("store","status");--> statement-breakpoint
CREATE INDEX "subscriptions_gateway_subscription_idx" ON "subscriptions" USING btree ("gateway_subscription_id");--> statement-breakpoint
CREATE INDEX "video_moderation_uploaded_by_created_idx" ON "video_moderation" USING btree ("uploaded_by","created_at");--> statement-breakpoint
CREATE INDEX "video_moderation_processing_idx" ON "video_moderation" USING btree ("processing");--> statement-breakpoint
CREATE UNIQUE INDEX "store_notification_subscriptions_store_user_unique" ON "store_notification_subscriptions" USING btree ("store_id","user_id");--> statement-breakpoint
CREATE INDEX "store_notification_subscriptions_user_idx" ON "store_notification_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "store_notification_subscriptions_store_idx" ON "store_notification_subscriptions" USING btree ("store_id");