CREATE TABLE "compliance_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"support_worker_id" text NOT NULL,
	"service_provider_id" text NOT NULL,
	"document_name" text NOT NULL,
	"document_type" text NOT NULL,
	"storage_key" text NOT NULL,
	"expiry_date" timestamp,
	"status" text DEFAULT 'valid' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payslip_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payslip_id" uuid NOT NULL,
	"item_type" text NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(8, 2),
	"rate" numeric(10, 2),
	"amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payslips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"support_worker_id" text NOT NULL,
	"service_provider_id" text NOT NULL,
	"pay_period_start_date" timestamp NOT NULL,
	"pay_period_end_date" timestamp NOT NULL,
	"total_hours" numeric(8, 2) NOT NULL,
	"hourly_rate" numeric(10, 2) NOT NULL,
	"gross_pay" numeric(10, 2) NOT NULL,
	"deductions" numeric(10, 2) DEFAULT '0',
	"net_pay" numeric(10, 2) NOT NULL,
	"notes" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"issued_date" timestamp,
	"paid_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"company_name" text NOT NULL,
	"company_abn" text,
	"company_email" text,
	"company_phone" text,
	"company_address" text,
	"website" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_providers_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "shift_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shift_id" uuid NOT NULL,
	"client_name" text,
	"client_id" text,
	"task_description" text,
	"notes" text,
	"special_requirements" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_workers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date_of_birth" timestamp,
	"phone_number" text,
	"address" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "support_workers_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "worker_provider_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"support_worker_id" text NOT NULL,
	"service_provider_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"hourly_rate" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "compliance_documents" ADD CONSTRAINT "compliance_documents_support_worker_id_user_id_fk" FOREIGN KEY ("support_worker_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_documents" ADD CONSTRAINT "compliance_documents_service_provider_id_user_id_fk" FOREIGN KEY ("service_provider_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslip_items" ADD CONSTRAINT "payslip_items_payslip_id_payslips_id_fk" FOREIGN KEY ("payslip_id") REFERENCES "public"."payslips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_support_worker_id_user_id_fk" FOREIGN KEY ("support_worker_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_service_provider_id_user_id_fk" FOREIGN KEY ("service_provider_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_providers" ADD CONSTRAINT "service_providers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_notes" ADD CONSTRAINT "shift_notes_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_workers" ADD CONSTRAINT "support_workers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_provider_relationships" ADD CONSTRAINT "worker_provider_relationships_support_worker_id_user_id_fk" FOREIGN KEY ("support_worker_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_provider_relationships" ADD CONSTRAINT "worker_provider_relationships_service_provider_id_user_id_fk" FOREIGN KEY ("service_provider_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;