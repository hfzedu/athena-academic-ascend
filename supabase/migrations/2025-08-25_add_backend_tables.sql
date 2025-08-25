-- Create auxiliary tables referenced by the frontend services
-- Run this SQL in your Supabase project's SQL editor or via the Supabase CLI.

-- assignment_audit_log: track assignment changes
create table if not exists public.assignment_audit_log (
	id uuid primary key default gen_random_uuid(),
	assignment_id uuid not null references public.assignments(id) on delete cascade,
	changed_by_user_id uuid null references public.profiles(id) on delete set null,
	changed_at timestamptz not null default now(),
	action text not null,
	field_changed text null,
	old_value jsonb null,
	new_value jsonb null,
	details text null
);
create index if not exists idx_assignment_audit_log_assignment on public.assignment_audit_log(assignment_id);
create index if not exists idx_assignment_audit_log_changed_at on public.assignment_audit_log(changed_at desc);

-- auth_audit_log: track authentication events
create table if not exists public.auth_audit_log (
	id uuid primary key default gen_random_uuid(),
	event_type text not null,
	user_id uuid null references public.profiles(id) on delete set null,
	created_at timestamptz not null default now(),
	ip_address text null,
	user_agent text null,
	details jsonb null
);
create index if not exists idx_auth_audit_log_user on public.auth_audit_log(user_id);
create index if not exists idx_auth_audit_log_created_at on public.auth_audit_log(created_at desc);

-- section_instructors: map instructors/TAs to sections with roles
create table if not exists public.section_instructors (
	id uuid primary key default gen_random_uuid(),
	section_id uuid not null references public.course_sections(id) on delete cascade,
	instructor_profile_id uuid not null references public.profiles(id) on delete cascade,
	role text not null default 'instructor',
	created_at timestamptz not null default now(),
	unique(section_id, instructor_profile_id)
);
create index if not exists idx_section_instructors_section on public.section_instructors(section_id);
create index if not exists idx_section_instructors_instructor on public.section_instructors(instructor_profile_id);

-- active_qr_tokens: ephemeral tokens for QR-based attendance
create table if not exists public.active_qr_tokens (
	token text primary key,
	section_id uuid not null references public.course_sections(id) on delete cascade,
	expires_at timestamptz not null,
	created_by uuid not null references public.profiles(id) on delete set null,
	is_used boolean not null default false,
	is_used_by uuid[] not null default '{}',
	created_at timestamptz not null default now()
);
create index if not exists idx_active_qr_tokens_section on public.active_qr_tokens(section_id);
create index if not exists idx_active_qr_tokens_expires on public.active_qr_tokens(expires_at);

-- Optional: enable RLS and add permissive policies to start (tighten later)
-- alter table public.assignment_audit_log enable row level security;
-- alter table public.auth_audit_log enable row level security;
-- alter table public.section_instructors enable row level security;
-- alter table public.active_qr_tokens enable row level security;
-- create policy "read all audit logs for admins" on public.assignment_audit_log for select to authenticated using (true);
-- create policy "insert audit logs" on public.assignment_audit_log for insert to authenticated with check (true);
-- Repeat policies as appropriate per your security model.

