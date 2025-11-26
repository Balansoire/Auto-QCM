-- Supabase schema for Auto QCM
-- Run this in the Supabase SQL editor

-- Extensions
create extension if not exists pgcrypto;

-- Table: qcm_tests
create table if not exists public.qcm_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  qcm jsonb not null,
  score integer,
  created_at timestamptz not null default now()
);

-- Table: user_roles
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user'
);

-- Table: qcm_usage
create table if not exists public.qcm_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  model text not null,
  generated_count integer not null default 0,
  primary key (user_id, model)
);

-- Indexes
create index if not exists idx_qcm_tests_user_created on public.qcm_tests(user_id, created_at desc);

-- RLS
alter table public.qcm_tests enable row level security;

-- Policies
create policy "Allow insert own" on public.qcm_tests
  for insert with check (auth.uid() = user_id);

create policy "Allow select own" on public.qcm_tests
  for select using (auth.uid() = user_id);

create policy "Allow delete own" on public.qcm_tests
  for delete using (auth.uid() = user_id);

create policy "Allow update own" on public.qcm_tests
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
