-- Predki · photos from relatives: by a «Для родных» link a relative can send a photo for someone's portrait.
-- Run once after share-links.sql and share-links-v2.sql (Supabase → SQL Editor → New query → paste everything → Run).
-- Running it again is safe.
--
-- How it works
-- • suggestion_photos: the photo itself (a JPEG as a data: URL, already shrunk to 900 px in the browser).
--   Only the owner of the link can read and delete it. Guests never touch the table directly.
-- • submit_photo(token, author, person, data): the guest's only way in. It checks the link (open, not expired, «Для родных»),
--   the size and the type, keeps at most 10 photos per link per hour, saves the photo and adds an answer to suggestions
--   with one line {t: 'photo', id: <person>, photo: <photo id>} — the owner sees it among «Ответы от родных».
-- • When the owner accepts the photo it goes into the tree (and from there into the private «media» bucket, as any portrait);
--   accepted or declined, the row here is deleted. Closing or deleting the link deletes its photos too.

create table if not exists public.suggestion_photos (
  id          uuid primary key default gen_random_uuid(),
  token       text not null references public.share_links (token) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  data        text not null check (char_length(data) < 1500000 and data ~ '^data:image/(jpeg|png|webp);base64,'),
  created_at  timestamptz not null default now()
);
create index if not exists suggestion_photos_token on public.suggestion_photos (token, created_at);
create index if not exists suggestion_photos_user on public.suggestion_photos (user_id);
alter table public.suggestion_photos enable row level security;

-- no insert policy: photos come in only through submit_photo()
drop policy if exists "suggestion_photos: owner reads" on public.suggestion_photos;
drop policy if exists "suggestion_photos: owner deletes" on public.suggestion_photos;
create policy "suggestion_photos: owner reads"   on public.suggestion_photos for select to authenticated using (user_id = auth.uid());
create policy "suggestion_photos: owner deletes" on public.suggestion_photos for delete to authenticated using (user_id = auth.uid());

create or replace function public.submit_photo(p_token text, p_author text, p_person text, p_data text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  owner uuid;
  recent int;
  pid uuid;
begin
  select l.user_id into owner from public.share_links l
  where l.token = p_token and not l.revoked and l.expires_at > now() and l.mode = 'ask';
  if owner is null then raise exception 'link_closed' using errcode = 'P0001'; end if;
  if p_person is null or char_length(p_person) = 0 or char_length(p_person) > 64 then raise exception 'bad_items' using errcode = 'P0001'; end if;
  if p_data is null or char_length(p_data) >= 1500000 or p_data !~ '^data:image/(jpeg|png|webp);base64,' then
    raise exception 'bad_photo' using errcode = 'P0001';
  end if;
  select count(*) into recent from public.suggestion_photos s where s.token = p_token and s.created_at > now() - interval '1 hour';
  if recent >= 10 then raise exception 'too_many' using errcode = 'P0001'; end if;
  insert into public.suggestion_photos (token, user_id, data) values (p_token, owner, p_data) returning id into pid;
  insert into public.suggestions (token, user_id, author, items)
  values (p_token, owner, left(coalesce(p_author, ''), 80), jsonb_build_array(jsonb_build_object('t', 'photo', 'id', p_person, 'photo', pid)));
  return pid;
end;
$$;

revoke all on function public.submit_photo(text, text, text, text) from public;
grant execute on function public.submit_photo(text, text, text, text) to anon, authenticated;
