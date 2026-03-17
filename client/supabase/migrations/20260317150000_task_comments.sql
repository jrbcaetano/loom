-- Task comments for drawer-based task detail

-- Compatibility guard: some older environments may still have tasks without family_id.
do $$
declare
  unresolved_tasks_count bigint;
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'family_id'
  ) then
    execute 'alter table public.tasks add column family_id uuid';

    execute $sql$
      update public.tasks t
      set family_id = fm.family_id
      from public.family_members fm
      where fm.user_id = t.owner_user_id
        and fm.status = ''active''
        and t.family_id is null
    $sql$;

    execute 'select count(*) from public.tasks where family_id is null' into unresolved_tasks_count;
    if unresolved_tasks_count > 0 then
      raise exception 'Cannot infer family_id for all existing tasks. Populate tasks.family_id first and re-run migration.';
    end if;

    if not exists (
      select 1
      from pg_constraint
      where conname = 'tasks_family_id_fkey'
        and conrelid = 'public.tasks'::regclass
    ) then
      execute $sql$
        alter table public.tasks
          add constraint tasks_family_id_fkey
          foreign key (family_id)
          references public.families(id)
          on delete cascade
      $sql$;
    end if;

    execute 'alter table public.tasks alter column family_id set not null';
    execute 'create index if not exists idx_tasks_family_id on public.tasks(family_id)';
  end if;
end $$;

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  author_user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compatibility guard: if table already existed from a partial run, ensure family_id exists.
do $$
declare
  unresolved_comments_count bigint;
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'task_comments'
      and column_name = 'family_id'
  ) then
    execute 'alter table public.task_comments add column family_id uuid';

    execute $sql$
      update public.task_comments tc
      set family_id = t.family_id
      from public.tasks t
      where t.id = tc.task_id
        and tc.family_id is null
    $sql$;

    execute 'select count(*) from public.task_comments where family_id is null' into unresolved_comments_count;
    if unresolved_comments_count > 0 then
      raise exception 'Cannot infer family_id for all existing task_comments. Populate task_comments.family_id first and re-run migration.';
    end if;

    if not exists (
      select 1
      from pg_constraint
      where conname = 'task_comments_family_id_fkey'
        and conrelid = 'public.task_comments'::regclass
    ) then
      execute $sql$
        alter table public.task_comments
          add constraint task_comments_family_id_fkey
          foreign key (family_id)
          references public.families(id)
          on delete cascade
      $sql$;
    end if;

    execute 'alter table public.task_comments alter column family_id set not null';
  end if;
end $$;

drop trigger if exists trg_task_comments_set_updated_at on public.task_comments;
create trigger trg_task_comments_set_updated_at
before update on public.task_comments
for each row execute function public.set_updated_at();

create index if not exists idx_task_comments_task_id on public.task_comments(task_id, created_at asc);
create index if not exists idx_task_comments_family_id on public.task_comments(family_id);

create or replace function public.validate_task_comment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  task_family_id uuid;
begin
  select family_id
  into task_family_id
  from public.tasks
  where id = new.task_id;

  if task_family_id is null then
    raise exception 'Task not found for comment';
  end if;

  if new.family_id <> task_family_id then
    raise exception 'Task comment family does not match task family';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_task_comments_validate on public.task_comments;
create trigger trg_task_comments_validate
before insert or update on public.task_comments
for each row execute function public.validate_task_comment();

alter table public.task_comments enable row level security;

drop policy if exists "task_comments_select" on public.task_comments;
drop policy if exists "task_comments_insert" on public.task_comments;
drop policy if exists "task_comments_update" on public.task_comments;
drop policy if exists "task_comments_delete" on public.task_comments;

create policy "task_comments_select" on public.task_comments for select to authenticated
using (public.can_view_entity('task', task_id));

create policy "task_comments_insert" on public.task_comments for insert to authenticated
with check (
  author_user_id = auth.uid()
  and public.can_view_entity('task', task_id)
);

create policy "task_comments_update" on public.task_comments for update to authenticated
using (author_user_id = auth.uid() or public.can_edit_entity('task', task_id))
with check (author_user_id = auth.uid() or public.can_edit_entity('task', task_id));

create policy "task_comments_delete" on public.task_comments for delete to authenticated
using (author_user_id = auth.uid() or public.can_edit_entity('task', task_id));

grant select, insert, update, delete on public.task_comments to authenticated;
grant execute on function public.validate_task_comment() to authenticated;

alter table public.task_comments replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'task_comments'
    ) then
      alter publication supabase_realtime add table public.task_comments;
    end if;
  end if;
end $$;
