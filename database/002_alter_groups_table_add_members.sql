-- Etapa 8 — ajuste da tabela groups para modelo com integrantes e série.
-- Use este script se a tabela groups já foi criada com o modelo anterior.

alter table public.groups
  add column if not exists member_1_name text,
  add column if not exists member_1_series text,
  add column if not exists member_2_name text,
  add column if not exists member_2_series text,
  add column if not exists member_3_name text,
  add column if not exists member_3_series text,
  add column if not exists theme text,
  add column if not exists description text;

alter table public.groups
  alter column member_1_name set not null,
  alter column member_1_series set not null;

alter table public.groups
  drop column if exists name;
