CREATE TYPE "public"."comment_type" AS ENUM('text', 'audio', 'video', 'image', 'sticker', 'file', 'text_audio', 'text_video', 'text_image', 'text_sticker', 'text_file');--> statement-breakpoint
CREATE TYPE "public"."item_payment_status" AS ENUM('pending', 'completed', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cod', 'jazzcash', 'easypaisa', 'bank_transfer');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'completed', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'transgender', 'other');--> statement-breakpoint
CREATE TABLE "carousel_items_old" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_carousel_id" uuid NOT NULL,
	"index" integer NOT NULL,
	"images" text NOT NULL,
	"image_alt" varchar(255) DEFAULT 'Banner Background',
	"title" varchar(255),
	"title_color" varchar(100),
	"tile_background" varchar(100),
	"description" text,
	"description_color" varchar(100),
	"discription_background_color" varchar(100),
	"button_text" varchar(255),
	"button_text_color" varchar(100),
	"button_hover_text_color" varchar(100),
	"button_background" varchar(100),
	"button_hover_background" varchar(100),
	"button_shadow" boolean DEFAULT false,
	"button_shadow_color" varchar(100),
	"button_border" boolean DEFAULT false,
	"button_border_color" varchar(100),
	"product_id" uuid,
	"font_family" text[] DEFAULT '{"Arial"}',
	"category" varchar(255),
	"overlay_opacity" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"_id" bigserial PRIMARY KEY NOT NULL,
	"in_comment_id" bigint NOT NULL,
	"content" text DEFAULT null,
	"comment_type" "comment_type" DEFAULT 'text' NOT NULL,
	"audio_url" text DEFAULT null,
	"video_url" text DEFAULT null,
	"image_url" text DEFAULT null,
	"sticker_url" text DEFAULT null,
	"file_url" text DEFAULT null,
	"post_id" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"owner" uuid NOT NULL,
	"parent_comment" bigint DEFAULT null,
	"is_reply" boolean DEFAULT false NOT NULL,
	"number_of_likes" integer DEFAULT 0 NOT NULL,
	"number_of_dislikes" integer DEFAULT 0 NOT NULL,
	"liked_by" text[] DEFAULT '{}' NOT NULL,
	"disliked_by" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "createStore" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_name" varchar(255) NOT NULL,
	"store_logo" text NOT NULL,
	"category" varchar(255),
	"owner_id" uuid NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"rating" numeric(2, 1) DEFAULT '0' NOT NULL,
	"total_ratings" integer DEFAULT 0 NOT NULL,
	"total_sells" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "createStore_store_name_unique" UNIQUE("store_name")
);
--> statement-breakpoint
CREATE TABLE "post_counters" (
	"key" text PRIMARY KEY NOT NULL,
	"seq" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "posts__id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"post_id_unique" varchar(255) NOT NULL,
	"in_category_id" varchar(255) NOT NULL,
	"category" varchar(255) NOT NULL,
	"title" text DEFAULT null,
	"description" text DEFAULT null,
	"owner" uuid NOT NULL,
	"store" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"product" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"image_files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"video_files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"audio_file" text DEFAULT null,
	"song" text[] DEFAULT '{}' NOT NULL,
	"videocount" integer DEFAULT 0 NOT NULL,
	"imagecount" integer DEFAULT 0 NOT NULL,
	"audiocount" integer DEFAULT 0 NOT NULL,
	"pattern" varchar(50) DEFAULT '1' NOT NULL,
	"post_type" varchar(50) DEFAULT null,
	"views" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"whatsapp" text DEFAULT null,
	"store_link" text DEFAULT null,
	"facebook" text DEFAULT null,
	"instagram" text DEFAULT null,
	"productlink" text DEFAULT null,
	"facebookurl" text DEFAULT null,
	"instagramurl" text DEFAULT null,
	"whatsappnumberurl" text DEFAULT null,
	"storelinkurl" text DEFAULT null,
	"total_rating" integer DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"average_rating" numeric(5, 2) DEFAULT '0' NOT NULL,
	"total_views" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_carousel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"carousels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "store_carousel_store_id_unique" UNIQUE("store_id")
);
--> statement-breakpoint
CREATE TABLE "store_carousel_old" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "store_carousel_old_store_id_unique" UNIQUE("store_id")
);
--> statement-breakpoint
CREATE TABLE "store_cart" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"store_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_cart_item" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"store_cart_id" bigint NOT NULL,
	"product_id" uuid,
	"quantity" integer DEFAULT 1 NOT NULL,
	"color_id" bigint,
	"color_value" varchar(50),
	"color_index" integer,
	"size" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_order" (
	"_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"customer_email" varchar(255) NOT NULL,
	"customer_phone" varchar(50) NOT NULL,
	"customer_address" text NOT NULL,
	"customer_city" varchar(100),
	"customer_country" varchar(100),
	"customer_postal_code" varchar(20),
	"store_id" uuid NOT NULL,
	"store_owner_id" uuid NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"shipping_cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"final_amount" numeric(10, 2) NOT NULL,
	"order_status" "order_status" DEFAULT 'pending' NOT NULL,
	"payment_method" "payment_method" DEFAULT 'cod' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"tracking_number" varchar(255),
	"notes" text,
	"is_notified" boolean DEFAULT false,
	"notification_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_order_item" (
	"_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"product_images" text[] DEFAULT '{}' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"color" varchar(100),
	"size" varchar(50),
	"item_status" "item_status" DEFAULT 'pending' NOT NULL,
	"item_payment_status" "item_payment_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"description" text DEFAULT '',
	"warnings" text DEFAULT '',
	"product_price" numeric(10, 2) NOT NULL,
	"product_discount" numeric(5, 2) DEFAULT '0',
	"final_price" numeric(10, 2) DEFAULT '0',
	"product_sizes" text[] DEFAULT '{}',
	"product_colors" jsonb DEFAULT '[]'::jsonb,
	"product_images" text[] NOT NULL,
	"tags" text[] DEFAULT '{}',
	"variants" text[] DEFAULT '{}',
	"specifications" text[] DEFAULT '{}',
	"category" varchar(255),
	"stock" integer DEFAULT 0,
	"orders_all_time" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"full_name" varchar(255),
	"bio" text,
	"gender" "gender",
	"avatar" text NOT NULL,
	"cover_image" text,
	"refresh_token" text,
	"otp" text,
	"whatsapp" varchar(255),
	"store_link" text,
	"facebook" text,
	"instagram" text,
	"productlink" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_whatsapp_unique" UNIQUE("whatsapp"),
	CONSTRAINT "users_store_link_unique" UNIQUE("store_link"),
	CONSTRAINT "users_facebook_unique" UNIQUE("facebook"),
	CONSTRAINT "users_instagram_unique" UNIQUE("instagram")
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_name" varchar(255) NOT NULL,
	"store_logo" text NOT NULL,
	"category" varchar(255),
	"owner_id" uuid NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"rating" numeric(2, 1) DEFAULT '0' NOT NULL,
	"total_ratings" integer DEFAULT 0 NOT NULL,
	"total_sells" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stores_store_name_unique" UNIQUE("store_name")
);
--> statement-breakpoint
CREATE TABLE "watch_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"video_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follow_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "carousel_items_old" ADD CONSTRAINT "carousel_items_old_store_carousel_id_store_carousel_old_id_fk" FOREIGN KEY ("store_carousel_id") REFERENCES "public"."store_carousel_old"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_owner_users_id_fk" FOREIGN KEY ("owner") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "createStore" ADD CONSTRAINT "createStore_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_owner_users_id_fk" FOREIGN KEY ("owner") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_ratings" ADD CONSTRAINT "store_ratings_store_id_createStore_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."createStore"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_ratings" ADD CONSTRAINT "store_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_carousel" ADD CONSTRAINT "store_carousel_store_id_createStore_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."createStore"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_carousel_old" ADD CONSTRAINT "store_carousel_old_store_id_createStore_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."createStore"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_cart_item" ADD CONSTRAINT "store_cart_item_store_cart_id_store_cart_id_fk" FOREIGN KEY ("store_cart_id") REFERENCES "public"."store_cart"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_order_item" ADD CONSTRAINT "store_order_item_order_id_store_order__id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."store_order"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_product" ADD CONSTRAINT "store_product_store_id_createStore_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."createStore"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_lists" ADD CONSTRAINT "follow_lists_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_lists" ADD CONSTRAINT "follow_lists_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "carousel_items_old_store_carousel_idx" ON "carousel_items_old" USING btree ("store_carousel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "comments_in_comment_id_unique" ON "comments" USING btree ("in_comment_id");--> statement-breakpoint
CREATE INDEX "comments_post_created_idx" ON "comments" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "comments_owner_created_idx" ON "comments" USING btree ("owner","created_at");--> statement-breakpoint
CREATE INDEX "comments_parent_created_idx" ON "comments" USING btree ("parent_comment","created_at");--> statement-breakpoint
CREATE INDEX "comments_post_pinned_idx" ON "comments" USING btree ("post_id","pinned");--> statement-breakpoint
CREATE INDEX "comments_post_is_reply_created_idx" ON "comments" USING btree ("post_id","is_reply","created_at");--> statement-breakpoint
CREATE INDEX "createStore_owner_idx" ON "createStore" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "createStore_category_idx" ON "createStore" USING btree ("category");--> statement-breakpoint
CREATE INDEX "createStore_rating_idx" ON "createStore" USING btree ("rating");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_post_id_unique_unique" ON "posts" USING btree ("post_id_unique");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_category_in_category_unique" ON "posts" USING btree ("category","in_category_id");--> statement-breakpoint
CREATE INDEX "posts_category_published_created_idx" ON "posts" USING btree ("category","is_published","created_at");--> statement-breakpoint
CREATE INDEX "posts_published_created_idx" ON "posts" USING btree ("is_published","created_at");--> statement-breakpoint
CREATE INDEX "posts_category_published_total_views_idx" ON "posts" USING btree ("category","is_published","total_views");--> statement-breakpoint
CREATE INDEX "posts_category_published_avg_rating_idx" ON "posts" USING btree ("category","is_published","average_rating");--> statement-breakpoint
CREATE INDEX "posts_owner_published_created_idx" ON "posts" USING btree ("owner","is_published","created_at");--> statement-breakpoint
CREATE INDEX "posts_owner_created_idx" ON "posts" USING btree ("owner","created_at");--> statement-breakpoint
CREATE INDEX "store_ratings_store_user_idx" ON "store_ratings" USING btree ("store_id","user_id");--> statement-breakpoint
CREATE INDEX "store_carousel_store_idx" ON "store_carousel" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "store_carousel_old_store_idx" ON "store_carousel_old" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_cart_user_store_unique" ON "store_cart" USING btree ("user_id","store_id");--> statement-breakpoint
CREATE INDEX "store_cart_user_idx" ON "store_cart" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "store_cart_store_idx" ON "store_cart" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "store_cart_item_cart_idx" ON "store_cart_item" USING btree ("store_cart_id");--> statement-breakpoint
CREATE INDEX "store_cart_item_product_idx" ON "store_cart_item" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "store_order_customer_idx" ON "store_order" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "store_order_store_idx" ON "store_order" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "store_order_store_owner_idx" ON "store_order" USING btree ("store_owner_id");--> statement-breakpoint
CREATE INDEX "store_order_status_idx" ON "store_order" USING btree ("order_status");--> statement-breakpoint
CREATE INDEX "store_order_payment_status_idx" ON "store_order" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "store_order_created_at_idx" ON "store_order" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "store_order_item_order_idx" ON "store_order_item" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "store_order_item_product_idx" ON "store_order_item" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "store_order_item_status_idx" ON "store_order_item" USING btree ("item_status");--> statement-breakpoint
CREATE UNIQUE INDEX "store_product_name_idx" ON "store_product" USING btree ("store_id","product_name");--> statement-breakpoint
CREATE INDEX "store_product_store_idx" ON "store_product" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "store_product_category_idx" ON "store_product" USING btree ("category");--> statement-breakpoint
CREATE INDEX "stores_owner_idx" ON "stores" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "stores_category_idx" ON "stores" USING btree ("category");--> statement-breakpoint
CREATE INDEX "stores_rating_idx" ON "stores" USING btree ("rating");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_follow" ON "follow_lists" USING btree ("follower_id","following_id");