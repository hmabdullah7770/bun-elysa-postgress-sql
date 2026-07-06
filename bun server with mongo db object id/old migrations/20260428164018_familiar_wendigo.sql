ALTER TABLE "carousel_items_old" RENAME COLUMN "id" TO "_id";--> statement-breakpoint
ALTER TABLE "createStore" RENAME COLUMN "id" TO "_id";--> statement-breakpoint
ALTER TABLE "store_ratings" RENAME COLUMN "id" TO "_id";--> statement-breakpoint
ALTER TABLE "store_carousel" RENAME COLUMN "id" TO "_id";--> statement-breakpoint
ALTER TABLE "store_carousel_old" RENAME COLUMN "id" TO "_id";--> statement-breakpoint
ALTER TABLE "store_cart" RENAME COLUMN "id" TO "_id";--> statement-breakpoint
ALTER TABLE "store_cart_item" RENAME COLUMN "id" TO "_id";--> statement-breakpoint
ALTER TABLE "store_product" RENAME COLUMN "id" TO "_id";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "id" TO "_id";--> statement-breakpoint
ALTER TABLE "watch_history" RENAME COLUMN "id" TO "_id";--> statement-breakpoint
ALTER TABLE "follow_lists" RENAME COLUMN "id" TO "_id";--> statement-breakpoint
ALTER TABLE "carousel_items_old" DROP CONSTRAINT "carousel_items_old_store_carousel_id_store_carousel_old_id_fk";
--> statement-breakpoint
ALTER TABLE "comments" DROP CONSTRAINT "comments_owner_users_id_fk";
--> statement-breakpoint
ALTER TABLE "createStore" DROP CONSTRAINT "createStore_owner_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "posts_owner_users_id_fk";
--> statement-breakpoint
ALTER TABLE "store_ratings" DROP CONSTRAINT "store_ratings_store_id_createStore_id_fk";
--> statement-breakpoint
ALTER TABLE "store_ratings" DROP CONSTRAINT "store_ratings_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "store_carousel" DROP CONSTRAINT "store_carousel_store_id_createStore_id_fk";
--> statement-breakpoint
ALTER TABLE "store_carousel_old" DROP CONSTRAINT "store_carousel_old_store_id_createStore_id_fk";
--> statement-breakpoint
ALTER TABLE "store_cart_item" DROP CONSTRAINT "store_cart_item_store_cart_id_store_cart_id_fk";
--> statement-breakpoint
ALTER TABLE "store_product" DROP CONSTRAINT "store_product_store_id_createStore_id_fk";
--> statement-breakpoint
ALTER TABLE "watch_history" DROP CONSTRAINT "watch_history_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "follow_lists" DROP CONSTRAINT "follow_lists_follower_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "follow_lists" DROP CONSTRAINT "follow_lists_following_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "carousel_items_old" ADD CONSTRAINT "carousel_items_old_store_carousel_id_store_carousel_old__id_fk" FOREIGN KEY ("store_carousel_id") REFERENCES "public"."store_carousel_old"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_owner_users__id_fk" FOREIGN KEY ("owner") REFERENCES "public"."users"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "createStore" ADD CONSTRAINT "createStore_owner_id_users__id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_owner_users__id_fk" FOREIGN KEY ("owner") REFERENCES "public"."users"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_ratings" ADD CONSTRAINT "store_ratings_store_id_createStore__id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."createStore"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_ratings" ADD CONSTRAINT "store_ratings_user_id_users__id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_carousel" ADD CONSTRAINT "store_carousel_store_id_createStore__id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."createStore"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_carousel_old" ADD CONSTRAINT "store_carousel_old_store_id_createStore__id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."createStore"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_cart_item" ADD CONSTRAINT "store_cart_item_store_cart_id_store_cart__id_fk" FOREIGN KEY ("store_cart_id") REFERENCES "public"."store_cart"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_product" ADD CONSTRAINT "store_product_store_id_createStore__id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."createStore"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_user_id_users__id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_lists" ADD CONSTRAINT "follow_lists_follower_id_users__id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_lists" ADD CONSTRAINT "follow_lists_following_id_users__id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("_id") ON DELETE cascade ON UPDATE no action;