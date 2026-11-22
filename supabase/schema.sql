-- =============================================================================
-- 청풍사 · 차경루 (view-mung) Supabase Postgres 스키마 및 보안 정책(RLS)
-- Supabase 대시보드 > SQL Editor > New query 에 그대로 붙여넣고 Run 하세요.
-- =============================================================================

-- 1. 소원 연등 테이블 생성
create table if not exists public.wishes (
  id text primary key,
  space text not null default 'cheongpungsa',
  color text not null default 'amber',
  author text not null check (char_length(author) between 1 and 30),
  tag text not null default '마음 평안' check (char_length(tag) between 1 and 30),
  text text not null check (char_length(text) between 1 and 200),
  date text not null,
  hapjang integer not null default 1 check (hapjang >= 1),
  created_at timestamptz not null default now()
);

create index if not exists idx_wishes_created_at on public.wishes (created_at asc);

-- 2. RLS(행 수준 보안) 활성화
alter table public.wishes enable row level security;

-- 누구나 소원 연등 열람 가능
drop policy if exists "wishes_select_public" on public.wishes;
create policy "wishes_select_public"
  on public.wishes
  for select
  to anon, authenticated
  using (true);

-- 누구나 새 소원 연등 작성 가능 (수정·삭제는 불가하여 기존 글 보호)
drop policy if exists "wishes_insert_public" on public.wishes;
create policy "wishes_insert_public"
  on public.wishes
  for insert
  to anon, authenticated
  with check (
    space = 'cheongpungsa'
    and hapjang = 1
    and char_length(trim(text)) > 0
  );

-- 3. 합장 수(+1) 안전 증가 전용 RPC 함수 (동시 클릭 유실 방지 + 타인 글 변조 차단)
create or replace function public.increment_wish_hapjang(target_wish_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer;
begin
  update public.wishes
  set hapjang = hapjang + 1
  where id = target_wish_id
  returning hapjang into next_count;

  return next_count;
end;
$$;

grant execute on function public.increment_wish_hapjang(text) to anon, authenticated;
