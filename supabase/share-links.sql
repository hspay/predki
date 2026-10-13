-- Predki · «Попросить заполнить»: links for relatives without an account.
-- Run once in Supabase → SQL Editor → New query → paste everything → Run.
--
-- How it works
-- • share_links: a link the owner made. It keeps a trimmed copy of the tree (snapshot) made at that moment:
--   names, relations, years and places. No photos, documents, stories or notes. Valid for 30 days, can be closed.
-- • suggestions: what a relative sent through the link. Only the owner of the link can read it.
-- • Guests never touch the tables directly. They call two functions with the link's secret token:
--   shared_tree(token) — read the snapshot; submit_suggestion(token, author, items) — send an answer.
-- • public.trees is not changed and stays private: a guest cannot reach the real tree.

create table if not exists public.share_links (
  token       text primary key check (char_length(token) between 20 and 64),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label       text not null default '' check (char_length(label) <= 120),
  snapshot    jsonb not null check (pg_column_size(snapshot) < 800000),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '30 days',
  revoked     boolean not null default false
);
create index if not exists share_links_user on public.share_links (user_id);
alter table public.share_links enable row level security;

drop policy if exists "share_links: owner reads" on public.share_links;
drop policy if exists "share_links: owner creates" on public.share_links;
drop policy if exists "share_links: owner closes" on public.share_links;
drop policy if exists "share_links: owner deletes" on public.share_links;
create policy "share_links: owner reads"   on public.share_links for select to authenticated using (user_id = auth.uid());
create policy "share_links: owner creates" on public.share_links for insert to authenticated with check (user_id = auth.uid() and expires_at <= now() + interval '31 days');
create policy "share_links: owner closes"  on public.share_links for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and expires_at <= now() + interval '31 days');
create policy "share_links: owner deletes" on public.share_links for delete to authenticated using (user_id = auth.uid());

create table if not exists public.suggestions (
  id          uuid primary key default gen_random_uuid(),
  token       text not null references public.share_links (token) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  author      text not null default '' check (char_length(author) <= 80),
  items       jsonb not null check (jsonb_typeof(items) = 'array' and pg_column_size(items) < 60000),
  status      text not null default 'new' check (status in ('new', 'done')),
  created_at  timestamptz not null default now()
);
create index if not exists suggestions_user on public.suggestions (user_id, status);
create index if not exists suggestions_token on public.suggestions (token, created_at);
alter table public.suggestions enable row level security;

-- no insert policy: answers come in only through submit_suggestion()
drop policy if exists "suggestions: owner reads" on public.suggestions;
drop policy if exists "suggestions: owner marks" on public.suggestions;
drop policy if exists "suggestions: owner deletes" on public.suggestions;
create policy "suggestions: owner reads"   on public.suggestions for select to authenticated using (user_id = auth.uid());
create policy "suggestions: owner marks"   on public.suggestions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "suggestions: owner deletes" on public.suggestions for delete to authenticated using (user_id = auth.uid());

-- a guest reads the snapshot by the token; a closed or expired link returns nothing
create or replace function public.shared_tree(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('snapshot', l.snapshot, 'expires_at', l.expires_at)
  from public.share_links l
  where l.token = p_token and not l.revoked and l.expires_at > now();
$$;

-- a guest sends an answer; at most 20 answers per link per hour, 60 items each
create or replace function public.submit_suggestion(p_token text, p_author text, p_items jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  owner uuid;
  recent int;
  new_id uuid;
begin
  select l.user_id into owner from public.share_links l
  where l.token = p_token and not l.revoked and l.expires_at > now();
  if owner is null then raise exception 'link_closed' using errcode = 'P0001'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 60 then
    raise exception 'bad_items' using errcode = 'P0001';
  end if;
  select count(*) into recent from public.suggestions s where s.token = p_token and s.created_at > now() - interval '1 hour';
  if recent >= 20 then raise exception 'too_many' using errcode = 'P0001'; end if;
  insert into public.suggestions (token, user_id, author, items)
  values (p_token, owner, left(coalesce(p_author, ''), 80), p_items)
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.shared_tree(text) from public;
revoke all on function public.submit_suggestion(text, text, jsonb) from public;
grant execute on function public.shared_tree(text) to anon, authenticated;
grant execute on function public.submit_suggestion(text, text, jsonb) to anon, authenticated;
