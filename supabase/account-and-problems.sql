-- Predki · deleting an account from Settings, and «Сообщить о проблеме» with the error log.
-- Run once in Supabase → SQL Editor → New query → paste everything → Run. Running it again is safe.
--
-- How it works
-- • delete_my_account(p_really): the signed-in person deletes their own account. The app first calls it with false — it only
--   checks that everything is set up — then deletes the files in Storage itself, then calls it with true: the tree,
--   the links for relatives with their answers, problem reports and the account itself are deleted.
-- • problems: reports from «Сообщить о проблеме» (kind = 'user') and errors the app caught by itself (kind = 'auto').
--   The app can only send them, through report_problem(); nobody can read them from the app.
--   You read them in Table Editor → problems. Mark handled ones with status 'seen' or 'fixed'.

-- ---------- problems ----------
create table if not exists public.problems (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  user_id     uuid references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('user', 'auto')),
  message     text not null check (char_length(message) between 1 and 4000),
  contact     text not null default '' check (char_length(contact) <= 200),
  details     jsonb not null default '{}'::jsonb check (pg_column_size(details) < 40000),
  status      text not null default 'new' check (status in ('new', 'seen', 'fixed'))
);
create index if not exists problems_new on public.problems (status, created_at desc);
create index if not exists problems_user on public.problems (user_id, created_at);
alter table public.problems enable row level security;
-- no policies on purpose: the app sends only through report_problem()

-- at most 30 reports an hour from one account, 100 an hour from everyone without an account together
create or replace function public.report_problem(p_kind text, p_message text, p_contact text, p_details jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  recent int;
  new_id uuid;
begin
  if p_kind is null or p_kind not in ('user', 'auto') then raise exception 'bad_kind' using errcode = 'P0001'; end if;
  if coalesce(btrim(p_message), '') = '' then raise exception 'empty' using errcode = 'P0001'; end if;
  select count(*) into recent from public.problems p
  where p.created_at > now() - interval '1 hour' and (p.user_id = me or (me is null and p.user_id is null));
  if recent >= (case when me is null then 100 else 30 end) then raise exception 'too_many' using errcode = 'P0001'; end if;
  insert into public.problems (user_id, kind, message, contact, details)
  values (me, p_kind, left(p_message, 4000), left(coalesce(p_contact, ''), 200),
          case when jsonb_typeof(p_details) = 'object' and pg_column_size(p_details) < 40000 then p_details else '{}'::jsonb end)
  returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.report_problem(text, text, text, jsonb) from public;
grant execute on function public.report_problem(text, text, text, jsonb) to anon, authenticated;

-- ---------- the tree belongs to an account ----------
-- a tree row can only exist for an account that exists: after deletion, a tab left open somewhere cannot bring it back
-- (not valid = older rows are not checked, only new ones)
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.trees'::regclass and contype = 'f') then
    alter table public.trees add constraint trees_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade not valid;
  end if;
end;
$$;

-- ---------- deleting the account ----------
create or replace function public.delete_my_account(p_really boolean default false)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;
  if not p_really then
    -- only the check: the function is in place and may delete accounts
    if not has_table_privilege('auth.users', 'DELETE') then raise exception 'no_privilege' using errcode = 'P0001'; end if;
    return 'ready';
  end if;
  delete from public.suggestions where user_id = me;
  delete from public.share_links where user_id = me;
  delete from public.problems where user_id = me;
  delete from public.trees where user_id = me;
  delete from auth.users where id = me; -- sessions and the sign-in log go with it
  return 'deleted';
end;
$$;
revoke all on function public.delete_my_account(boolean) from public, anon;
grant execute on function public.delete_my_account(boolean) to authenticated;
