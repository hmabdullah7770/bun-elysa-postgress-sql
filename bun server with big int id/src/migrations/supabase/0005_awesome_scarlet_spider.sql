CREATE TABLE "banners" (
	"_id" bigserial PRIMARY KEY NOT NULL,
	"banner_image" text NOT NULL,
	"owner" uuid NOT NULL,
	"store" uuid,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "banners" ADD CONSTRAINT "banners_owner_users__id_fk" FOREIGN KEY ("owner") REFERENCES "public"."users"("_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banners" ADD CONSTRAINT "banners_store_createStore__id_fk" FOREIGN KEY ("store") REFERENCES "public"."createStore"("_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "banners_expires_at_idx" ON "banners" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "banners_owner_expires_at_idx" ON "banners" USING btree ("owner","expires_at");