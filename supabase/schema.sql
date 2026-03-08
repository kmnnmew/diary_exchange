-- ============================================================
-- Shared Diary Exchange Platform — Supabase Schema
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. profiles (extends auth.users)
-- ────────────────────────────────────────────────────────────
create table public.profiles (
  id                uuid references auth.users(id) primary key,
  nickname          text not null default '익명의 독자',
  email             text,
  subscription_type text not null default 'free', -- 'free' | 'premium'
  default_paper     text default 'lined',
  default_stamp     text,
  theme             text default 'light',
  created_at        timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- 2. diaries
-- ────────────────────────────────────────────────────────────
create table public.diaries (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid references profiles(id) on delete cascade,
  title         text,
  content       text not null,
  exchange_mode text not null, -- 'anonymous' | 'group' | 'ai'
  paper_design  text default 'lined',
  stamp         text,
  emotion       text,
  status        text default 'waiting', -- 'waiting' | 'matched' | 'completed'
  created_at    timestamptz default now(),
  created_date  date default current_date -- for daily limit check
);

-- ────────────────────────────────────────────────────────────
-- 3. comments
-- ────────────────────────────────────────────────────────────
create table public.comments (
  id               uuid primary key default gen_random_uuid(),
  diary_id         uuid references diaries(id) on delete cascade,
  author_id        uuid references profiles(id),
  content          text not null,
  is_ai_generated  boolean default false,
  ai_persona       text, -- which persona was used if AI
  created_at       timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- 4. diary_matches (anonymous mode pairing)
-- ────────────────────────────────────────────────────────────
create table public.diary_matches (
  id          uuid primary key default gen_random_uuid(),
  diary_id    uuid references diaries(id) on delete cascade,
  sender_id   uuid references profiles(id),
  receiver_id uuid references profiles(id),
  status      text default 'pending', -- 'pending' | 'commented' | 'returned'
  created_at  timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- 5. groups
-- ────────────────────────────────────────────────────────────
create table public.groups (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text,
  owner_id         uuid references profiles(id),
  max_members      int default 6,
  is_private       boolean default false,
  invite_code      text unique default substr(md5(random()::text), 1, 8),
  invite_method    text default 'link', -- 'link' | 'password'
  invite_password  text,
  created_at       timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- 6. group_members
-- ────────────────────────────────────────────────────────────
create table public.group_members (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid references groups(id) on delete cascade,
  user_id    uuid references profiles(id),
  role       text default 'member', -- 'owner' | 'member'
  status     text default 'active', -- 'active' | 'restricted' | 'banned'
  joined_at  timestamptz default now(),
  unique(group_id, user_id)
);

-- ────────────────────────────────────────────────────────────
-- 7. group_match_cycles (fair rotation tracking)
-- ────────────────────────────────────────────────────────────
create table public.group_match_cycles (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid references groups(id) on delete cascade,
  cycle_number  int default 1,
  sender_id     uuid references profiles(id),
  receiver_id   uuid references profiles(id),
  diary_id      uuid references diaries(id),
  match_date    date default current_date,
  created_at    timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- 8. ai_persona_settings (premium users only)
-- ────────────────────────────────────────────────────────────
create table public.ai_persona_settings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references profiles(id) unique,
  persona_name  text,
  system_prompt text,
  tone          text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- 9. blocks
-- ────────────────────────────────────────────────────────────
create table public.blocks (
  id         uuid primary key default gen_random_uuid(),
  blocker_id uuid references profiles(id),
  blocked_id uuid references profiles(id),
  created_at timestamptz default now(),
  unique(blocker_id, blocked_id)
);

-- ────────────────────────────────────────────────────────────
-- 10. reports
-- ────────────────────────────────────────────────────────────
create table public.reports (
  id                  uuid primary key default gen_random_uuid(),
  reporter_id         uuid references profiles(id),
  target_content_id   uuid,   -- diary or comment id
  target_content_type text,   -- 'diary' | 'comment'
  reason              text,
  status              text default 'pending', -- 'pending' | 'reviewed' | 'dismissed'
  group_id            uuid references groups(id), -- null if anonymous
  created_at          timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- 11. notifications
-- ────────────────────────────────────────────────────────────
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id),
  message    text not null,
  type       text not null, -- 'comment' | 'group' | 'ai'
  is_read    boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles           enable row level security;
alter table public.diaries            enable row level security;
alter table public.comments           enable row level security;
alter table public.diary_matches      enable row level security;
alter table public.groups             enable row level security;
alter table public.group_members      enable row level security;
alter table public.group_match_cycles enable row level security;
alter table public.ai_persona_settings enable row level security;
alter table public.blocks             enable row level security;
alter table public.reports            enable row level security;
alter table public.notifications      enable row level security;

-- ────────────────────────────────────────────────────────────
-- profiles: own row only
-- ────────────────────────────────────────────────────────────
create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ────────────────────────────────────────────────────────────
-- diaries: author can CRUD; matched receiver can SELECT
-- ────────────────────────────────────────────────────────────
create policy "diaries: author full access"
  on public.diaries for all
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "diaries: matched receiver can read"
  on public.diaries for select
  using (
    exists (
      select 1 from public.diary_matches dm
      where dm.diary_id = diaries.id
        and dm.receiver_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- comments: visible only to diary author and commenter
-- ────────────────────────────────────────────────────────────
create policy "comments: commenter can insert and read own"
  on public.comments for all
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "comments: diary author can read"
  on public.comments for select
  using (
    exists (
      select 1 from public.diaries d
      where d.id = comments.diary_id
        and d.author_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- diary_matches: sender and receiver can read their own matches
-- ────────────────────────────────────────────────────────────
create policy "diary_matches: sender or receiver can read"
  on public.diary_matches for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "diary_matches: system insert (service role only)"
  on public.diary_matches for insert
  with check (auth.uid() = sender_id);

create policy "diary_matches: receiver can update (comment/return)"
  on public.diary_matches for update
  using (auth.uid() = receiver_id);

-- ────────────────────────────────────────────────────────────
-- groups: members can read; owner can update/delete
-- ────────────────────────────────────────────────────────────
create policy "groups: members can read"
  on public.groups for select
  using (
    not is_private
    or auth.uid() = owner_id
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id
        and gm.user_id = auth.uid()
        and gm.status = 'active'
    )
  );

create policy "groups: authenticated users can create"
  on public.groups for insert
  with check (auth.uid() = owner_id);

create policy "groups: owner can update"
  on public.groups for update
  using (auth.uid() = owner_id);

create policy "groups: owner can delete"
  on public.groups for delete
  using (auth.uid() = owner_id);

-- ────────────────────────────────────────────────────────────
-- group_members: members see sibling members; owner manages all
-- ────────────────────────────────────────────────────────────
create policy "group_members: active members can read"
  on public.group_members for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = auth.uid()
        and gm.status = 'active'
    )
  );

create policy "group_members: user can join (insert own)"
  on public.group_members for insert
  with check (auth.uid() = user_id);

create policy "group_members: owner can update membership"
  on public.group_members for update
  using (
    exists (
      select 1 from public.groups g
      where g.id = group_members.group_id
        and g.owner_id = auth.uid()
    )
  );

create policy "group_members: user can leave (delete own)"
  on public.group_members for delete
  using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- group_match_cycles: group members can read their group cycles
-- ────────────────────────────────────────────────────────────
create policy "group_match_cycles: participants can read"
  on public.group_match_cycles for select
  using (
    auth.uid() = sender_id
    or auth.uid() = receiver_id
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = group_match_cycles.group_id
        and gm.user_id = auth.uid()
        and gm.status = 'active'
    )
  );

-- ────────────────────────────────────────────────────────────
-- ai_persona_settings: own row only (premium)
-- ────────────────────────────────────────────────────────────
create policy "ai_persona_settings: own row only"
  on public.ai_persona_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- blocks: blocker manages own blocks
-- ────────────────────────────────────────────────────────────
create policy "blocks: blocker full access"
  on public.blocks for all
  using (auth.uid() = blocker_id)
  with check (auth.uid() = blocker_id);

-- ────────────────────────────────────────────────────────────
-- reports: reporter can insert; can read own reports
-- ────────────────────────────────────────────────────────────
create policy "reports: reporter can insert"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create policy "reports: reporter can read own"
  on public.reports for select
  using (auth.uid() = reporter_id);

-- ────────────────────────────────────────────────────────────
-- notifications: private per user
-- ────────────────────────────────────────────────────────────
create policy "notifications: user reads own"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "notifications: user updates own (mark read)"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "notifications: system can insert (service role)"
  on public.notifications for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, nickname)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nickname', '익명의 독자')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- INDEXES (performance)
-- ============================================================
create index diaries_author_id_idx          on public.diaries(author_id);
create index diaries_created_date_idx       on public.diaries(created_date);
create index diaries_exchange_mode_idx      on public.diaries(exchange_mode);
create index diaries_status_idx             on public.diaries(status);
create index comments_diary_id_idx          on public.comments(diary_id);
create index diary_matches_diary_id_idx     on public.diary_matches(diary_id);
create index diary_matches_sender_id_idx    on public.diary_matches(sender_id);
create index diary_matches_receiver_id_idx  on public.diary_matches(receiver_id);
create index group_members_group_id_idx     on public.group_members(group_id);
create index group_members_user_id_idx      on public.group_members(user_id);
create index group_match_cycles_group_idx   on public.group_match_cycles(group_id);
create index notifications_user_id_idx      on public.notifications(user_id);
create index notifications_is_read_idx      on public.notifications(user_id, is_read);
