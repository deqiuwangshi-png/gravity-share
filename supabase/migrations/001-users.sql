-- ============================================================
-- 引力 · 阶段 1a 认证基座 · 用户资料表
-- 执行位置：Supabase Dashboard → SQL Editor → 粘贴执行
-- 注意：auth.users 由 Supabase 托管，本脚本只建 public.users 资料表
-- ============================================================

-- 1. 用户资料表（profile）
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '引力用户',
  bio text default '',
  avatar_url text default '',
  points int not null default 0,
  created_at timestamptz not null default now()
);

-- 2. 开启 RLS（安全基线：行级权限）
alter table public.users enable row level security;

-- 3. RLS 策略：用户只能读写自己的行（auth.uid() = id）
drop policy if exists "users_self_all" on public.users;
create policy "users_self_all" on public.users
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 4. 新用户自动建默认行（注册时触发，配合前端「首次登录自动建 profile」）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', '引力用户'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 验证：select * from public.users;
