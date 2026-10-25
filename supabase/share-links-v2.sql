-- Predki · «Ссылка на древо»: two kinds of links in share_links. Run once after share-links.sql
-- (Supabase → SQL Editor → New query → paste everything → Run). Running it again is safe.
--
-- • mode = 'ask'  — for relatives: names, dates, places and photos; they can suggest additions (as «Попросить заполнить»). 30 days.
-- • mode = 'show' — for social networks: the living only by first name, no suggestions. No end date until it is closed.
-- The snapshot is still made once, when the link is created: what the owner adds later does not reach the link.

alter table public.share_links add column if not exists mode text not null default 'ask';
alter table public.share_links drop constraint if exists share_links_mode_check;
alter table public.share_links add constraint share_links_mode_check check (mode in ('ask', 'show'));

-- a link for relatives lives up to 31 days; a link for social networks may live until it is closed
drop policy if exists "share_links: owner creates" on public.share_links;
drop policy if exists "share_links: owner closes" on public.share_links;
create policy "share_links: owner creates" on public.share_links for insert to authenticated
  with check (user_id = auth.uid() and (mode = 'show' or expires_at <= now() + interval '31 days'));
create policy "share_links: owner closes" on public.share_links for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and (mode = 'show' or expires_at <= now() + interval '31 days'));

-- the guest gets the kind of link too
create or replace function public.shared_tree(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('snapshot', l.snapshot, 'expires_at', l.expires_at, 'mode', l.mode)
  from public.share_links l
  where l.token = p_token and not l.revoked and l.expires_at > now();
$$;

-- answers come only through links for relatives: a link for social networks takes none
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
  where l.token = p_token and not l.revoked and l.expires_at > now() and l.mode = 'ask';
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
