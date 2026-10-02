CREATE TABLE "devices" (
	"_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"is_auth" boolean DEFAULT false NOT NULL,
	"device_id" varchar(255) NOT NULL,
	"device_name" varchar(255) NOT NULL,
	"brand" varchar(255) NOT NULL,
	"model" varchar(255) NOT NULL,
	"device_type" varchar(32) DEFAULT 'Handset' NOT NULL,
	"system_name" varchar(32) NOT NULL,
	"system_version" varchar(64) NOT NULL,
	"total_ram" bigint NOT NULL,
	"total_storage" bigint NOT NULL,
	"app_version" varchar(64) NOT NULL,
	"build_number" varchar(64),
	"is_active" boolean DEFAULT true NOT NULL,
	"first_login" timestamp DEFAULT now() NOT NULL,
	"last_active" timestamp DEFAULT now() NOT NULL,
	"last_login_ip" text,
	"push_token" text,
	"device_metadata" jsonb,
	"health_reports" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "devices_device_id_unique" UNIQUE("device_id")
);
--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_users__id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "devices_user_id_idx" ON "devices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "devices_user_device_idx" ON "devices" USING btree ("user_id","device_id");