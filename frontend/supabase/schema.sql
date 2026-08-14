-- ============================================================
-- Sogno Enterprise — Supabase schema
-- Run this once in Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. PROFILES (extends auth.users with role/department)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'employee' check (role in ('employee', 'manager', 'admin')),
  department text not null default 'Operations',
  initials text generated always as (
    upper(left(split_part(full_name, ' ', 1), 1) || coalesce(left(split_part(full_name, ' ', 2), 1), ''))
  ) stored,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Anyone signed in can read all profiles (needed for "Users & access" page + "uploaded by")
create policy "profiles are readable by authenticated users"
  on public.profiles for select
  using (auth.role() = 'authenticated');

-- Users can update their own profile
create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Managers/admins can update anyone's role/department (e.g. from the Users & access page)
create policy "managers can update any profile"
  on public.profiles for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'admin'))
  );

-- Only managers/admins can change roles/departments of others (simplified: any authenticated update above;
-- tighten later with a dedicated policy checking the caller's own role if needed)

-- Auto-create a profile row whenever someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role, department)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'employee'),
    coalesce(new.raw_user_meta_data->>'department', 'Operations')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. DOCUMENTS
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department text not null,
  version text not null default '1.0',
  status text not null default 'Active' check (status in ('Active', 'Archived')),
  access text not null default 'all_employees' check (access in ('all_employees', 'managers_only', 'restricted')),
  restricted_department text,
  type text not null check (type in ('pdf', 'docx')),
  size_bytes bigint not null default 0,
  pages int not null default 0,
  description text default '',
  storage_path text not null,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documents enable row level security;

-- Everyone authenticated can read documents (frontend filters by access/department for display)
create policy "documents are readable by authenticated users"
  on public.documents for select
  using (auth.role() = 'authenticated');

-- Only managers/admins can insert/update/delete documents
create policy "managers can insert documents"
  on public.documents for insert
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'admin'))
  );

create policy "managers can update documents"
  on public.documents for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'admin'))
  );

create policy "managers can delete documents"
  on public.documents for delete
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'admin'))
  );

create index if not exists documents_department_idx on public.documents (department);
create index if not exists documents_status_idx on public.documents (status);


-- 3. STORAGE BUCKET for the actual PDF/DOCX files
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Authenticated users can read files in the bucket
create policy "authenticated users can read documents bucket"
  on storage.objects for select
  using (bucket_id = 'documents' and auth.role() = 'authenticated');

-- Only managers/admins can upload
create policy "managers can upload to documents bucket"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'admin'))
  );

create policy "managers can delete from documents bucket"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'admin'))
  );

-- 4. CONVERSATIONS & MESSAGES
-- AI Assistant history — powers Dashboard + Assistant page

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create policy "users can read their own conversations"
  on public.conversations for select
  using (auth.uid() = user_id);

create policy "managers can read all conversations"
  on public.conversations for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('manager', 'admin')
    )
  );

create policy "users can create their own conversations"
  on public.conversations for insert
  with check (auth.uid() = user_id);


create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.conversations (id)
    on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "users can read messages in their own conversations"
  on public.messages for select
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and c.user_id = auth.uid()
    )
  );

create policy "managers can read all messages"
  on public.messages for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('manager', 'admin')
    )
  );

create policy "users can insert messages in their own conversations"
  on public.messages for insert
  with check (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and c.user_id = auth.uid()
    )
  );

create index if not exists conversations_user_idx
  on public.conversations (user_id, created_at desc);

create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at asc);