CREATE TABLE "favorites" (
	"_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "favorites__id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"post_id" bigint NOT NULL,
	"owner" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_post_id_posts__id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_owner_users__id_fk" FOREIGN KEY ("owner") REFERENCES "public"."users"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "favorites_owner_post_unique" ON "favorites" USING btree ("owner","post_id");--> statement-breakpoint
CREATE INDEX "favorites_owner_created_idx" ON "favorites" USING btree ("owner","created_at");--> statement-breakpoint
CREATE INDEX "favorites_post_idx" ON "favorites" USING btree ("post_id");