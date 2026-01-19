
# Supabase Integration Guide

This guide will help you integrate Supabase as the backend database for your Support Worker Shift app.

## 📋 Table of Contents

1. [Setup Supabase Project](#setup-supabase-project)
2. [Configure App](#configure-app)
3. [Create Database Schema](#create-database-schema)
4. [Update API Calls](#update-api-calls)
5. [Testing](#testing)

---

## 1. Setup Supabase Project

### Step 1: Create a Supabase Account
1. Go to [https://supabase.com](https://supabase.com)
2. Sign up for a free account
3. Create a new project

### Step 2: Get Your Credentials
1. Go to **Settings** > **API**
2. Copy your **Project URL** (e.g., `https://abcdefgh.supabase.co`)
3. Copy your **anon/public key** (starts with `eyJ...`)

---

## 2. Configure App

### Update app.json

Replace the placeholder values in `app.json`:

```json
{
  "expo": {
    "extra": {
      "backendUrl": "https://gemvwbnnsvbmxyqhxrry8udv8c5q77ms.app.specular.dev",
      "supabaseUrl": "https://YOUR_PROJECT_ID.supabase.co",
      "supabaseAnonKey": "YOUR_SUPABASE_ANON_KEY"
    }
  }
}
```

**Important:** Replace `YOUR_PROJECT_ID` and `YOUR_SUPABASE_ANON_KEY` with your actual Supabase credentials.

---

## 3. Create Database Schema

### Option A: Using Supabase SQL Editor

1. Go to **SQL Editor** in your Supabase dashboard
2. Run the following SQL to create all tables:

```sql
-- Users table (Better Auth)
CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  image TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- User roles
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('support_worker', 'service_provider', 'admin')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Service providers
CREATE TABLE IF NOT EXISTS service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_abn TEXT,
  company_email TEXT,
  company_phone TEXT,
  company_address TEXT,
  website TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Support workers
CREATE TABLE IF NOT EXISTS support_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  date_of_birth TIMESTAMP,
  phone_number TEXT,
  address TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Worker-Provider relationships
CREATE TABLE IF NOT EXISTS worker_provider_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  support_worker_id TEXT NOT NULL,
  service_provider_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'pending')),
  hourly_rate NUMERIC(10, 2),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Shifts
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  support_worker_id TEXT NOT NULL,
  service_provider_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  location TEXT,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  hourly_rate NUMERIC(10, 2),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Shift notes
CREATE TABLE IF NOT EXISTS shift_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  client_name TEXT,
  client_id TEXT,
  task_description TEXT,
  notes TEXT,
  special_requirements TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Timesheets
CREATE TABLE IF NOT EXISTS timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  support_worker_id TEXT NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  break_minutes INTEGER DEFAULT 0,
  total_hours NUMERIC(10, 2),
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'approved', 'rejected')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Compliance documents
CREATE TABLE IF NOT EXISTS compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  support_worker_id TEXT NOT NULL,
  service_provider_id TEXT NOT NULL,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  expiry_date TIMESTAMP,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'pending')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Payslips
CREATE TABLE IF NOT EXISTS payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  support_worker_id TEXT NOT NULL,
  service_provider_id TEXT NOT NULL,
  pay_period_start_date TIMESTAMP NOT NULL,
  pay_period_end_date TIMESTAMP NOT NULL,
  total_hours NUMERIC(10, 2) NOT NULL,
  hourly_rate NUMERIC(10, 2) NOT NULL,
  gross_pay NUMERIC(10, 2) NOT NULL,
  deductions NUMERIC(10, 2) DEFAULT 0,
  net_pay NUMERIC(10, 2) NOT NULL,
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'issued', 'paid')),
  issued_date TIMESTAMP,
  paid_date TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Payslip items
CREATE TABLE IF NOT EXISTS payslip_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id UUID NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('earning', 'deduction', 'reimbursement')),
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2),
  rate NUMERIC(10, 2),
  amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by TEXT NOT NULL,
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
  timesheet_id UUID REFERENCES timesheets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  file_size INTEGER,
  document_type TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_service_providers_user_id ON service_providers(user_id);
CREATE INDEX idx_support_workers_user_id ON support_workers(user_id);
CREATE INDEX idx_shifts_worker_id ON shifts(support_worker_id);
CREATE INDEX idx_shifts_provider_id ON shifts(service_provider_id);
CREATE INDEX idx_shifts_start_time ON shifts(start_time);
CREATE INDEX idx_timesheets_worker_id ON timesheets(support_worker_id);
CREATE INDEX idx_timesheets_shift_id ON timesheets(shift_id);
CREATE INDEX idx_compliance_docs_worker_id ON compliance_documents(support_worker_id);
CREATE INDEX idx_payslips_worker_id ON payslips(support_worker_id);
```

### Option B: Using Supabase Table Editor

1. Go to **Table Editor** in your Supabase dashboard
2. Create each table manually using the schema above
3. Set up foreign key relationships
4. Create indexes for performance

---

## 4. Update API Calls

### Replace Existing API Calls

Find and replace API calls in your components with Supabase calls:

#### Before (Current Backend):
```typescript
import { authenticatedGet } from '@/utils/api';

const shifts = await authenticatedGet('/api/shifts');
```

#### After (Supabase):
```typescript
import { getWorkerShifts } from '@/utils/supabaseExamples';

const shifts = await getWorkerShifts(workerId);
```

### Common Replacements

| Current API Call | Supabase Replacement |
|-----------------|---------------------|
| `GET /api/shifts` | `getWorkerShifts(workerId)` |
| `POST /api/shifts` | `createShift(shiftData)` |
| `PATCH /api/shifts/:id` | `updateShiftStatus(shiftId, status)` |
| `GET /api/timesheets` | `getWorkerTimesheets(workerId)` |
| `POST /api/timesheets/clock-in` | `clockIn(shiftId, workerId)` |
| `POST /api/timesheets/clock-out` | `clockOut(timesheetId, breakMinutes, notes)` |
| `GET /api/compliance-documents` | `getWorkerDocuments(workerId)` |
| `POST /api/compliance-documents` | `uploadComplianceDocument(...)` |
| `GET /api/payslips` | `getWorkerPayslips(workerId)` |

---

## 5. Testing

### Test Each Feature

1. **Authentication**
   - Sign in with email/password
   - Sign in with Google OAuth
   - Sign in with Apple OAuth
   - Verify JWT token is stored

2. **Shifts**
   - View shifts list
   - Create new shift
   - Update shift status
   - Delete shift

3. **Timesheets**
   - Clock in to shift
   - Clock out from shift
   - View timesheet history

4. **Documents**
   - Upload compliance document
   - View documents list
   - Delete document

5. **Payslips**
   - View payslips list
   - Generate new payslip

### Common Issues

**Issue:** "Supabase not configured"
- **Solution:** Check that `supabaseUrl` and `supabaseAnonKey` are set in `app.json`

**Issue:** "401 Unauthorized"
- **Solution:** Ensure JWT token is stored after login using `setBearerToken(token)`

**Issue:** "Table does not exist"
- **Solution:** Run the SQL schema creation script in Supabase SQL Editor

**Issue:** "Row Level Security policy violation"
- **Solution:** Configure RLS policies in Supabase or disable RLS for testing

---

## 6. Storage Setup

### Create Storage Buckets

1. Go to **Storage** in your Supabase dashboard
2. Create a new bucket named `compliance-documents`
3. Set the bucket to **Public** or configure access policies
4. Repeat for any other file storage needs

### Storage Policies

If using private buckets, configure policies:

```sql
-- Allow authenticated users to upload their own documents
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'compliance-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to view their own documents
CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'compliance-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 7. Row Level Security (RLS)

### Enable RLS for Security

Supabase uses Row Level Security to protect your data. Enable it for each table:

```sql
-- Enable RLS on all tables
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;

-- Example: Users can only view their own data
CREATE POLICY "Users can view own profile"
ON "user" FOR SELECT
TO authenticated
USING (auth.uid()::text = id);

-- Example: Support workers can view their own shifts
CREATE POLICY "Workers can view own shifts"
ON shifts FOR SELECT
TO authenticated
USING (auth.uid()::text = support_worker_id);

-- Example: Service providers can view shifts they created
CREATE POLICY "Providers can view their shifts"
ON shifts FOR SELECT
TO authenticated
USING (auth.uid()::text = service_provider_id);
```

---

## 8. Migration Checklist

- [ ] Create Supabase project
- [ ] Get project URL and anon key
- [ ] Update `app.json` with credentials
- [ ] Run SQL schema creation script
- [ ] Create storage buckets
- [ ] Configure RLS policies
- [ ] Update API calls in components
- [ ] Test authentication flow
- [ ] Test all CRUD operations
- [ ] Test file uploads
- [ ] Deploy and test on production

---

## 9. Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase REST API Reference](https://supabase.com/docs/guides/api)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

## 10. Support

If you encounter any issues:

1. Check the console logs for error messages
2. Verify your Supabase credentials in `app.json`
3. Ensure database tables are created correctly
4. Check RLS policies if getting permission errors
5. Review the Supabase dashboard for API logs

---

**Note:** This integration maintains compatibility with your existing Better Auth authentication system. The JWT tokens from Better Auth can be used to authenticate Supabase requests.
