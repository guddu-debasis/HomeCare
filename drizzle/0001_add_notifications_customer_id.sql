ALTER TABLE "Notifications" ALTER COLUMN "seller_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Notifications" ADD COLUMN "customer_id" integer;--> statement-breakpoint
ALTER TABLE "Notifications" ADD CONSTRAINT "Notifications_customer_id_Customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."Customers"("id") ON DELETE cascade ON UPDATE no action;