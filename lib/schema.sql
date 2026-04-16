-- ============================================================
-- FocusFlow Database Schema
-- Run this in your Supabase SQL Editor (supabase.com → your project → SQL Editor)
-- ============================================================

-- User profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  avatar_url text,
  deep_work_start time default '09:00',
  deep_work_end   time default '12:00',
  work_start_hour int default 8,
  work_end_hour   int default 18,
  timezone        text default 'UTC',
  created_at      timestamptz default now()
);

-- Tasks table
create table public.tasks (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  priority    text check (priority in ('high','medium','low')) not null default 'medium',
  done        boolean default false,
  date        date not null default current_date,
  carried_over boolean default false,
  source_date  date,
  completed_at timestamptz,
  time_block   text,
  notes        text,
  created_at   timestamptz default now()
);

-- Daily schedule snapshots (what the AI built for each day)
create table public.daily_schedules (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  date       date not null default current_date,
  schedule   jsonb not null default '[]',
  ai_notes   text,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- Focus sessions (Pomodoro logs)
create table public.focus_sessions (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  task_id     uuid references public.tasks(id) on delete set null,
  started_at  timestamptz default now(),
  ended_at    timestamptz,
  duration_minutes int,
  completed   boolean default false
);

-- AI insights log (stores generated weekly/daily insights)
create table public.ai_insights (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  type        text check (type in ('daily','weekly')) default 'daily',
  week_start  date,
  content     text not null,
  metrics     jsonb default '{}',
  created_at  timestamptz default now()
);

-- ── Row Level Security ──────────────────────────────────────
alter table public.profiles        enable row level security;
alter table public.tasks           enable row level security;
alter table public.daily_schedules enable row level security;
alter table public.focus_sessions  enable row level security;
alter table public.ai_insights     enable row level security;

-- Profiles: users can only see and edit their own
create policy "profiles: own" on public.profiles for all using (auth.uid() = id);

-- Tasks: users own their tasks
create policy "tasks: own" on public.tasks for all using (auth.uid() = user_id);

-- Schedules: users own their schedules
create policy "schedules: own" on public.daily_schedules for all using (auth.uid() = user_id);

-- Focus sessions: users own their sessions
create policy "sessions: own" on public.focus_sessions for all using (auth.uid() = user_id);

-- Insights: users own their insights
create policy "insights: own" on public.ai_insights for all using (auth.uid() = user_id);

-- ── Auto-create profile on sign up ──────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
