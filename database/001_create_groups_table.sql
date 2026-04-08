-- Criação da tabela groups para o MVP do TCA Hub

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  member_1_name text not null,
  member_1_series text not null,
  member_2_name text null,
  member_2_series text null,
  member_3_name text null,
  member_3_series text null,
  theme text null,
  description text null,
  primary_advisor_id uuid null references public.advisors(id) on delete set null,
  co_advisor_id uuid null references public.advisors(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_groups_owner_id on public.groups(owner_id);
create index if not exists idx_groups_created_at on public.groups(created_at desc);
