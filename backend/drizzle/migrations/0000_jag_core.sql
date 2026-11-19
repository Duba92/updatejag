create type public.app_role as enum ('admin','moderator','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "Users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  bio text,
  university text,
  department text,
  academic_year text,
  interests text[] not null default '{}',
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Profiles are public" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "Users insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete cascade,
  sample_author text,
  is_sample boolean not null default false,
  title text not null,
  body text not null default '',
  category text not null default 'Other Experiences',
  tags text[] not null default '{}',
  status text not null default 'published' check (status in ('draft','published')),
  youtube_url text,
  youtube_id text,
  audio_title text,
  featured boolean not null default false,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.posts (created_at desc);
grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;
grant all on public.posts to service_role;
alter table public.posts enable row level security;
create policy "Published posts are public" on public.posts for select using (status = 'published');
create policy "Authors read own posts" on public.posts for select to authenticated using (author_id = auth.uid());
create policy "Authors create posts" on public.posts for insert to authenticated with check (author_id = auth.uid() and is_sample = false and featured = false);
create policy "Authors update own posts" on public.posts for update to authenticated using (author_id = auth.uid() or public.has_role(auth.uid(),'admin')) with check (author_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Authors delete own posts" on public.posts for delete to authenticated using (author_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  owner_id uuid,
  kind text not null check (kind in ('image','audio','audio_cover')),
  url text not null,
  path text,
  caption text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.post_media to anon, authenticated;
grant insert, update, delete on public.post_media to authenticated;
grant all on public.post_media to service_role;
alter table public.post_media enable row level security;
create policy "Media visible with post" on public.post_media for select using (exists (select 1 from public.posts p where p.id = post_id and (p.status='published' or p.author_id = auth.uid())));
create policy "Owners add media" on public.post_media for insert to authenticated with check (owner_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));
create policy "Owners delete media" on public.post_media for delete to authenticated using (owner_id = auth.uid());

create table public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
grant select on public.likes to anon, authenticated;
grant insert, delete on public.likes to authenticated;
grant all on public.likes to service_role;
alter table public.likes enable row level security;
create policy "Likes public" on public.likes for select using (true);
create policy "Like as self" on public.likes for insert to authenticated with check (user_id = auth.uid());
create policy "Unlike as self" on public.likes for delete to authenticated using (user_id = auth.uid());

create table public.bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
grant select, insert, delete on public.bookmarks to authenticated;
grant all on public.bookmarks to service_role;
alter table public.bookmarks enable row level security;
create policy "Own bookmarks" on public.bookmarks for select to authenticated using (user_id = auth.uid());
create policy "Add own bookmark" on public.bookmarks for insert to authenticated with check (user_id = auth.uid());
create policy "Remove own bookmark" on public.bookmarks for delete to authenticated using (user_id = auth.uid());

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
grant select on public.comments to anon, authenticated;
grant insert, delete on public.comments to authenticated;
grant all on public.comments to service_role;
alter table public.comments enable row level security;
create policy "Comments public" on public.comments for select using (true);
create policy "Comment as self" on public.comments for insert to authenticated with check (author_id = auth.uid());
create policy "Delete own comment" on public.comments for delete to authenticated using (author_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
grant select on public.follows to anon, authenticated;
grant insert, delete on public.follows to authenticated;
grant all on public.follows to service_role;
alter table public.follows enable row level security;
create policy "Follows public" on public.follows for select using (true);
create policy "Follow as self" on public.follows for insert to authenticated with check (follower_id = auth.uid());
create policy "Unfollow as self" on public.follows for delete to authenticated using (follower_id = auth.uid());

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete cascade,
  type text not null,
  post_id uuid references public.posts(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "Own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "Mark own read" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Delete own notif" on public.notifications for delete to authenticated using (user_id = auth.uid());

create or replace function public.notify_event()
returns trigger language plpgsql security definer set search_path = public
as $$
declare target uuid; t text; pid uuid; actor uuid;
begin
  if tg_table_name = 'likes' then
    select author_id into target from posts where id = new.post_id; t := 'like'; pid := new.post_id; actor := new.user_id;
  elsif tg_table_name = 'comments' then
    pid := new.post_id; actor := new.author_id;
    if new.parent_id is not null then select author_id into target from comments where id = new.parent_id; t := 'reply';
    else select author_id into target from posts where id = new.post_id; t := 'comment'; end if;
  elsif tg_table_name = 'follows' then
    target := new.following_id; t := 'follow'; actor := new.follower_id;
  end if;
  if target is not null and target <> actor then
    insert into notifications (user_id, actor_id, type, post_id) values (target, actor, t, pid);
  end if;
  return new;
end; $$;
create trigger notify_like after insert on public.likes for each row execute function public.notify_event();
create trigger notify_comment after insert on public.comments for each row execute function public.notify_event();
create trigger notify_follow after insert on public.follows for each row execute function public.notify_event();

create or replace function public.increment_view(_post_id uuid)
returns void language sql security definer set search_path = public
as $$ update posts set view_count = view_count + 1 where id = _post_id and status = 'published' $$;
grant execute on function public.increment_view(uuid) to anon, authenticated;

alter publication supabase_realtime add table public.notifications;

insert into public.posts (is_sample, sample_author, title, body, category, tags, youtube_url, youtube_id, featured, view_count, created_at) values
(true,'Hanna T. · Addis Ababa University','What I wish I knew in my first semester','<p>My first semester was overwhelming. I didn''t know how to register for courses, where the library was, or how to talk to lecturers.</p><h2>Three things that helped</h2><ul><li><strong>Join a study group early.</strong> It made me feel less alone.</li><li><strong>Visit office hours.</strong> Lecturers remember students who ask.</li><li><strong>Plan your week every Sunday.</strong></li></ul><p>If you are starting now: you are not behind. Everyone is figuring it out.</p>','First-Year Experience','{freshman,tips}',null,null,true,412, now() - interval '2 days'),
(true,'Dawit M. · Jimma University','How I raised my GPA from 2.4 to 3.6','<p>After a bad first year I changed how I study. I stopped re-reading notes and started testing myself.</p><h2>My system</h2><ol><li>Active recall with flashcards</li><li>Past exam papers every week</li><li>Teaching topics to a friend</li></ol><p>This video explains the method better than I can.</p>','GPA Improvement','{gpa,study}','https://www.youtube.com/watch?v=ukLnPbIffxE','ukLnPbIffxE',true,980, now() - interval '5 days'),
(true,'Lensa G. · Haramaya University','Choosing my department: engineering or medicine?','<p>I was torn between what my family wanted and what I enjoyed. Here is how I decided, and what I would tell someone in the same situation.</p><p>Talk to senior students in both departments. Ask them about a normal week, not just career salaries.</p>','Department Selection','{departments,advice}',null,null,false,233, now() - interval '1 day'),
(true,'Yonas A. · Bahir Dar University','Surviving dorm life with five roommates','<p>Shared rooms teach patience. We made a simple rota for cleaning and a quiet-hours rule during exams. It changed everything.</p>','Accommodation','{dorm,campus}',null,null,false,150, now() - interval '8 hours'),
(true,'Meron K. · Mekelle University','My first internship: what actually happened','<p>I applied to 23 places and got one reply. That one reply became my internship. Keep your CV to one page and write a short, honest cover letter.</p>','Internship Experience','{internship,career}','https://youtu.be/Tt08KmFfIYQ','Tt08KmFfIYQ',false,321, now() - interval '3 days');

insert into public.post_media (post_id, kind, url, caption, position)
select id, 'image', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200', 'Graduation day on campus', 0 from public.posts where title like 'What I wish%'
union all select id, 'image', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200', 'Our study group', 1 from public.posts where title like 'What I wish%'
union all select id, 'image', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1200', 'Our shared room', 0 from public.posts where title like 'Surviving dorm%'
union all select id, 'audio', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 'Sample audio clip', 0 from public.posts where title like 'Choosing my department%';
update public.posts set audio_title = 'Listen: my decision story (sample audio)' where title like 'Choosing my department%';