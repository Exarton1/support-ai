// Settings model is now a Supabase table called "settings".
// Schema (create this table in Supabase SQL editor):
//
//   create table if not exists settings (
//     id uuid primary key default gen_random_uuid(),
//     owner_id text unique not null,
//     business_name text,
//     support_email text,
//     knowledge text,
//     created_at timestamptz default now(),
//     updated_at timestamptz default now()
//   );
//
// The ISettings interface lives in src/types.d.ts.

export const SETTINGS_TABLE = "settings"