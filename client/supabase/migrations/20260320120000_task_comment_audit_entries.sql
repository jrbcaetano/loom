alter table public.task_comments
  add column if not exists entry_kind text not null default 'comment',
  add column if not exists event_type text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'task_comments_entry_kind_check'
      and conrelid = 'public.task_comments'::regclass
  ) then
    alter table public.task_comments
      add constraint task_comments_entry_kind_check
      check (entry_kind in ('comment', 'audit'));
  end if;
end $$;

create index if not exists idx_task_comments_task_id_kind_created_at
  on public.task_comments(task_id, entry_kind, created_at asc);
