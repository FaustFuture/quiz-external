-- Users table to cache basic Whop user info locally
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  whop_user_id text not null unique,
  name text,
  username text,
  email text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Exam retake grants - per user
create table if not exists exam_retakes (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  user_id text not null, -- whop user id
  granted_by text not null, -- admin whop user id
  granted_at timestamptz default now(),
  used boolean default false
);

-- Optional: simple index for quick lookups
create index if not exists idx_exam_retakes_module_user on exam_retakes(module_id, user_id) where used = false;

-- Keep RLS relaxed for now (aligning with results tables approach)
alter table if exists users disable row level security;
alter table if exists exam_retakes disable row level security;

