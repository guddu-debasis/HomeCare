CREATE TYPE "public"."verification_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
ALTER TABLE "Order/Booking" ADD COLUMN "invoice_pdf_base64" text;--> statement-breakpoint
ALTER TABLE "Order/Booking" ADD COLUMN "invoice_generated_at" timestamp;--> statement-breakpoint
ALTER TABLE "Seller_Service" ADD COLUMN "verification_status" "verification_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "Seller_Service" ADD COLUMN "rejection_reason" varchar(500);