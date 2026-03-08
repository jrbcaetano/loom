-- Loom additional feature domains
-- chat, meals, expenses, documents, routines, notes, chores

create extension if not exists pgcrypto;

-- Enums
 do $$
 begin
   if not exists (select 1 from pg_type where typname = 'conversation_type') then
     create type public.conversation_type as enum ('family', 'direct');
   end if;

   if not exists (select 1 from pg_type where typname = 'meal_type') then
     create type public.meal_type as enum ('breakfast', 'lunch', 'dinner');
   end if;

   if not exists (select 1 from pg_type where typname = 'routine_schedule_type') then
     create type public.routine_schedule_type as enum ('daily', 'weekly', 'custom');
   end if;

   if not exists (select 1 from pg_type where typname = 'chore_status') then
     create type public.chore_status as enum ('todo', 'done');
   end if;

   if not exists (select 1 from pg_type where typname = 'reward_transaction_type') then
     create type public.reward_transaction_type as enum ('earn', 'redeem');
   end if;
 end $$;

-- Chat
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  type public.conversation_type not null,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_family_conversation_per_family
  on public.conversations (family_id, type)
  where type = 'family';

create table if not exists public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_conversation_members_user on public.conversation_members(user_id, conversation_id);
create index if not exists idx_messages_conversation_created on public.messages(conversation_id, created_at desc);

-- Meals
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 180),
  description text,
  instructions text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 180),
  quantity text,
  unit text,
  created_at timestamptz not null default now()
);

create table if not exists public.meal_plan_entries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete set null,
  date date not null,
  meal_type public.meal_type not null,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (family_id, date, meal_type)
);

create index if not exists idx_recipes_family on public.recipes(family_id, created_at desc);
create index if not exists idx_recipe_ingredients_recipe on public.recipe_ingredients(recipe_id);
create index if not exists idx_meal_plan_family_date on public.meal_plan_entries(family_id, date);

-- Expenses
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  unique (family_id, name)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 180),
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'EUR',
  category text,
  paid_by_user_id uuid references public.profiles(id) on delete set null,
  date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_expenses_family_date on public.expenses(family_id, date desc);

-- Documents
create table if not exists public.document_categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  unique (family_id, name)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 180),
  description text,
  category text,
  file_url text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_documents_family_created on public.documents(family_id, created_at desc);

-- Routines
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 180),
  assigned_to_user_id uuid references public.profiles(id) on delete set null,
  schedule_type public.routine_schedule_type not null default 'daily',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routine_steps (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  text text not null check (char_length(trim(text)) between 1 and 240),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.routine_logs (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz not null default now()
);

create index if not exists idx_routines_family on public.routines(family_id, created_at desc);
create index if not exists idx_routine_logs_routine on public.routine_logs(routine_id, completed_at desc);

-- Notes
create table if not exists public.note_categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  unique (family_id, name)
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 180),
  content text not null,
  category text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notes_family_updated on public.notes(family_id, updated_at desc);

-- Chores and rewards
create table if not exists public.chores (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 180),
  description text,
  assigned_to_user_id uuid references public.profiles(id) on delete set null,
  points integer not null default 1 check (points >= 0),
  due_date date,
  status public.chore_status not null default 'todo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chore_completions (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid not null references public.chores(id) on delete cascade,
  completed_by_user_id uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz not null default now()
);

create table if not exists public.reward_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  points_balance integer not null default 0,
  unique (user_id)
);

create table if not exists public.reward_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  points integer not null,
  type public.reward_transaction_type not null,
  reference_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_chores_family_status on public.chores(family_id, status, due_date);
create index if not exists idx_reward_transactions_user_date on public.reward_transactions(user_id, created_at desc);

-- Updated at triggers
drop trigger if exists trg_recipes_set_updated_at on public.recipes;
create trigger trg_recipes_set_updated_at before update on public.recipes for each row execute function public.set_updated_at();

drop trigger if exists trg_expenses_set_updated_at on public.expenses;
create trigger trg_expenses_set_updated_at before update on public.expenses for each row execute function public.set_updated_at();

drop trigger if exists trg_documents_set_updated_at on public.documents;
create trigger trg_documents_set_updated_at before update on public.documents for each row execute function public.set_updated_at();

drop trigger if exists trg_routines_set_updated_at on public.routines;
create trigger trg_routines_set_updated_at before update on public.routines for each row execute function public.set_updated_at();

drop trigger if exists trg_notes_set_updated_at on public.notes;
create trigger trg_notes_set_updated_at before update on public.notes for each row execute function public.set_updated_at();

drop trigger if exists trg_chores_set_updated_at on public.chores;
create trigger trg_chores_set_updated_at before update on public.chores for each row execute function public.set_updated_at();

-- Chat helper functions
create or replace function public.is_conversation_member(target_conversation_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = target_conversation_id
      and cm.user_id = target_user_id
  );
$$;

create or replace function public.ensure_family_conversation(target_family_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  conversation_id uuid;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_active_family_member(target_family_id, current_user_id) then
    raise exception 'Not a family member';
  end if;

  select c.id into conversation_id
  from public.conversations c
  where c.family_id = target_family_id
    and c.type = 'family'
  limit 1;

  if conversation_id is null then
    insert into public.conversations (family_id, type)
    values (target_family_id, 'family')
    returning id into conversation_id;

    insert into public.conversation_members (conversation_id, user_id)
    select conversation_id, fm.user_id
    from public.family_members fm
    where fm.family_id = target_family_id
      and fm.status = 'active'
      and fm.user_id is not null
    on conflict (conversation_id, user_id) do nothing;
  end if;

  return conversation_id;
end;
$$;

create or replace function public.create_direct_conversation(target_family_id uuid, other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  conversation_id uuid;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if other_user_id is null then
    raise exception 'Target user required';
  end if;

  if other_user_id = current_user_id then
    raise exception 'Cannot create direct conversation with yourself';
  end if;

  if not public.is_active_family_member(target_family_id, current_user_id)
     or not public.is_active_family_member(target_family_id, other_user_id) then
    raise exception 'Both users must be active family members';
  end if;

  select c.id into conversation_id
  from public.conversations c
  where c.family_id = target_family_id
    and c.type = 'direct'
    and exists (select 1 from public.conversation_members cm where cm.conversation_id = c.id and cm.user_id = current_user_id)
    and exists (select 1 from public.conversation_members cm where cm.conversation_id = c.id and cm.user_id = other_user_id)
  limit 1;

  if conversation_id is null then
    insert into public.conversations (family_id, type)
    values (target_family_id, 'direct')
    returning id into conversation_id;

    insert into public.conversation_members (conversation_id, user_id)
    values (conversation_id, current_user_id), (conversation_id, other_user_id)
    on conflict (conversation_id, user_id) do nothing;
  end if;

  return conversation_id;
end;
$$;

create or replace function public.mark_conversation_read(target_conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  updated_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_conversation_member(target_conversation_id, current_user_id) then
    raise exception 'Not a conversation member';
  end if;

  update public.messages m
  set read_at = now()
  where m.conversation_id = target_conversation_id
    and m.sender_user_id <> current_user_id
    and m.read_at is null;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

create or replace function public.complete_chore(target_chore_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  chore_row public.chores;
  completion_id uuid;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into chore_row from public.chores where id = target_chore_id;

  if chore_row.id is null then
    raise exception 'Chore not found';
  end if;

  if not public.is_active_family_member(chore_row.family_id, current_user_id) then
    raise exception 'Not a family member';
  end if;

  if chore_row.status = 'done' then
    select cc.id into completion_id from public.chore_completions cc where cc.chore_id = target_chore_id order by cc.completed_at desc limit 1;
    return completion_id;
  end if;

  insert into public.chore_completions (chore_id, completed_by_user_id)
  values (target_chore_id, current_user_id)
  returning id into completion_id;

  update public.chores set status = 'done', updated_at = now() where id = target_chore_id;

  insert into public.reward_balances (user_id, points_balance)
  values (coalesce(chore_row.assigned_to_user_id, current_user_id), 0)
  on conflict (user_id) do nothing;

  update public.reward_balances
  set points_balance = points_balance + chore_row.points
  where user_id = coalesce(chore_row.assigned_to_user_id, current_user_id);

  insert into public.reward_transactions (user_id, points, type, reference_id)
  values (coalesce(chore_row.assigned_to_user_id, current_user_id), chore_row.points, 'earn', target_chore_id);

  return completion_id;
end;
$$;

-- RLS enable
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.meal_plan_entries enable row level security;
alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;
alter table public.document_categories enable row level security;
alter table public.documents enable row level security;
alter table public.routines enable row level security;
alter table public.routine_steps enable row level security;
alter table public.routine_logs enable row level security;
alter table public.note_categories enable row level security;
alter table public.notes enable row level security;
alter table public.chores enable row level security;
alter table public.chore_completions enable row level security;
alter table public.reward_balances enable row level security;
alter table public.reward_transactions enable row level security;

-- Conversations policies
drop policy if exists "conversations_select" on public.conversations;
drop policy if exists "conversations_insert" on public.conversations;
create policy "conversations_select" on public.conversations for select to authenticated
using (public.is_active_family_member(family_id) and public.is_conversation_member(id));
create policy "conversations_insert" on public.conversations for insert to authenticated
with check (public.is_active_family_member(family_id));

drop policy if exists "conversation_members_select" on public.conversation_members;
drop policy if exists "conversation_members_insert" on public.conversation_members;
create policy "conversation_members_select" on public.conversation_members for select to authenticated
using (public.is_conversation_member(conversation_id));
create policy "conversation_members_insert" on public.conversation_members for insert to authenticated
with check (public.is_active_family_member((select c.family_id from public.conversations c where c.id = conversation_id)));

drop policy if exists "messages_select" on public.messages;
drop policy if exists "messages_insert" on public.messages;
drop policy if exists "messages_update" on public.messages;
create policy "messages_select" on public.messages for select to authenticated
using (public.is_conversation_member(conversation_id));
create policy "messages_insert" on public.messages for insert to authenticated
with check (sender_user_id = auth.uid() and public.is_conversation_member(conversation_id));
create policy "messages_update" on public.messages for update to authenticated
using (public.is_conversation_member(conversation_id))
with check (public.is_conversation_member(conversation_id));

-- Generic family-scoped policies helper macro style applied per table
-- recipes
drop policy if exists "recipes_select" on public.recipes;
drop policy if exists "recipes_insert" on public.recipes;
drop policy if exists "recipes_update" on public.recipes;
drop policy if exists "recipes_delete" on public.recipes;
create policy "recipes_select" on public.recipes for select to authenticated using (public.is_active_family_member(family_id));
create policy "recipes_insert" on public.recipes for insert to authenticated with check (public.is_active_family_member(family_id) and created_by = auth.uid());
create policy "recipes_update" on public.recipes for update to authenticated using (public.is_active_family_member(family_id)) with check (public.is_active_family_member(family_id));
create policy "recipes_delete" on public.recipes for delete to authenticated using (public.is_active_family_member(family_id));

-- recipe ingredients
drop policy if exists "recipe_ingredients_select" on public.recipe_ingredients;
drop policy if exists "recipe_ingredients_insert" on public.recipe_ingredients;
drop policy if exists "recipe_ingredients_update" on public.recipe_ingredients;
drop policy if exists "recipe_ingredients_delete" on public.recipe_ingredients;
create policy "recipe_ingredients_select" on public.recipe_ingredients for select to authenticated
using (exists (select 1 from public.recipes r where r.id = recipe_id and public.is_active_family_member(r.family_id)));
create policy "recipe_ingredients_insert" on public.recipe_ingredients for insert to authenticated
with check (exists (select 1 from public.recipes r where r.id = recipe_id and public.is_active_family_member(r.family_id)));
create policy "recipe_ingredients_update" on public.recipe_ingredients for update to authenticated
using (exists (select 1 from public.recipes r where r.id = recipe_id and public.is_active_family_member(r.family_id)))
with check (exists (select 1 from public.recipes r where r.id = recipe_id and public.is_active_family_member(r.family_id)));
create policy "recipe_ingredients_delete" on public.recipe_ingredients for delete to authenticated
using (exists (select 1 from public.recipes r where r.id = recipe_id and public.is_active_family_member(r.family_id)));

-- meal plan entries
drop policy if exists "meal_plan_entries_select" on public.meal_plan_entries;
drop policy if exists "meal_plan_entries_insert" on public.meal_plan_entries;
drop policy if exists "meal_plan_entries_update" on public.meal_plan_entries;
drop policy if exists "meal_plan_entries_delete" on public.meal_plan_entries;
create policy "meal_plan_entries_select" on public.meal_plan_entries for select to authenticated using (public.is_active_family_member(family_id));
create policy "meal_plan_entries_insert" on public.meal_plan_entries for insert to authenticated with check (public.is_active_family_member(family_id) and created_by = auth.uid());
create policy "meal_plan_entries_update" on public.meal_plan_entries for update to authenticated using (public.is_active_family_member(family_id)) with check (public.is_active_family_member(family_id));
create policy "meal_plan_entries_delete" on public.meal_plan_entries for delete to authenticated using (public.is_active_family_member(family_id));

-- expenses + categories
drop policy if exists "expense_categories_select" on public.expense_categories;
drop policy if exists "expense_categories_insert" on public.expense_categories;
drop policy if exists "expense_categories_update" on public.expense_categories;
drop policy if exists "expense_categories_delete" on public.expense_categories;
create policy "expense_categories_select" on public.expense_categories for select to authenticated using (public.is_active_family_member(family_id));
create policy "expense_categories_insert" on public.expense_categories for insert to authenticated with check (public.is_active_family_member(family_id));
create policy "expense_categories_update" on public.expense_categories for update to authenticated using (public.is_active_family_member(family_id)) with check (public.is_active_family_member(family_id));
create policy "expense_categories_delete" on public.expense_categories for delete to authenticated using (public.is_active_family_member(family_id));

drop policy if exists "expenses_select" on public.expenses;
drop policy if exists "expenses_insert" on public.expenses;
drop policy if exists "expenses_update" on public.expenses;
drop policy if exists "expenses_delete" on public.expenses;
create policy "expenses_select" on public.expenses for select to authenticated using (public.is_active_family_member(family_id));
create policy "expenses_insert" on public.expenses for insert to authenticated with check (public.is_active_family_member(family_id));
create policy "expenses_update" on public.expenses for update to authenticated using (public.is_active_family_member(family_id)) with check (public.is_active_family_member(family_id));
create policy "expenses_delete" on public.expenses for delete to authenticated using (public.is_active_family_member(family_id));

-- documents + categories
drop policy if exists "document_categories_select" on public.document_categories;
drop policy if exists "document_categories_insert" on public.document_categories;
drop policy if exists "document_categories_update" on public.document_categories;
drop policy if exists "document_categories_delete" on public.document_categories;
create policy "document_categories_select" on public.document_categories for select to authenticated using (public.is_active_family_member(family_id));
create policy "document_categories_insert" on public.document_categories for insert to authenticated with check (public.is_active_family_member(family_id));
create policy "document_categories_update" on public.document_categories for update to authenticated using (public.is_active_family_member(family_id)) with check (public.is_active_family_member(family_id));
create policy "document_categories_delete" on public.document_categories for delete to authenticated using (public.is_active_family_member(family_id));

drop policy if exists "documents_select" on public.documents;
drop policy if exists "documents_insert" on public.documents;
drop policy if exists "documents_update" on public.documents;
drop policy if exists "documents_delete" on public.documents;
create policy "documents_select" on public.documents for select to authenticated using (public.is_active_family_member(family_id));
create policy "documents_insert" on public.documents for insert to authenticated with check (public.is_active_family_member(family_id) and created_by = auth.uid());
create policy "documents_update" on public.documents for update to authenticated using (public.is_active_family_member(family_id)) with check (public.is_active_family_member(family_id));
create policy "documents_delete" on public.documents for delete to authenticated using (public.is_active_family_member(family_id));

-- routines
drop policy if exists "routines_select" on public.routines;
drop policy if exists "routines_insert" on public.routines;
drop policy if exists "routines_update" on public.routines;
drop policy if exists "routines_delete" on public.routines;
create policy "routines_select" on public.routines for select to authenticated using (public.is_active_family_member(family_id));
create policy "routines_insert" on public.routines for insert to authenticated with check (public.is_active_family_member(family_id));
create policy "routines_update" on public.routines for update to authenticated using (public.is_active_family_member(family_id)) with check (public.is_active_family_member(family_id));
create policy "routines_delete" on public.routines for delete to authenticated using (public.is_active_family_member(family_id));

drop policy if exists "routine_steps_select" on public.routine_steps;
drop policy if exists "routine_steps_insert" on public.routine_steps;
drop policy if exists "routine_steps_update" on public.routine_steps;
drop policy if exists "routine_steps_delete" on public.routine_steps;
create policy "routine_steps_select" on public.routine_steps for select to authenticated using (exists (select 1 from public.routines r where r.id = routine_id and public.is_active_family_member(r.family_id)));
create policy "routine_steps_insert" on public.routine_steps for insert to authenticated with check (exists (select 1 from public.routines r where r.id = routine_id and public.is_active_family_member(r.family_id)));
create policy "routine_steps_update" on public.routine_steps for update to authenticated using (exists (select 1 from public.routines r where r.id = routine_id and public.is_active_family_member(r.family_id))) with check (exists (select 1 from public.routines r where r.id = routine_id and public.is_active_family_member(r.family_id)));
create policy "routine_steps_delete" on public.routine_steps for delete to authenticated using (exists (select 1 from public.routines r where r.id = routine_id and public.is_active_family_member(r.family_id)));

drop policy if exists "routine_logs_select" on public.routine_logs;
drop policy if exists "routine_logs_insert" on public.routine_logs;
create policy "routine_logs_select" on public.routine_logs for select to authenticated using (exists (select 1 from public.routines r where r.id = routine_id and public.is_active_family_member(r.family_id)));
create policy "routine_logs_insert" on public.routine_logs for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.routines r where r.id = routine_id and public.is_active_family_member(r.family_id)));

-- notes
drop policy if exists "note_categories_select" on public.note_categories;
drop policy if exists "note_categories_insert" on public.note_categories;
drop policy if exists "note_categories_update" on public.note_categories;
drop policy if exists "note_categories_delete" on public.note_categories;
create policy "note_categories_select" on public.note_categories for select to authenticated using (public.is_active_family_member(family_id));
create policy "note_categories_insert" on public.note_categories for insert to authenticated with check (public.is_active_family_member(family_id));
create policy "note_categories_update" on public.note_categories for update to authenticated using (public.is_active_family_member(family_id)) with check (public.is_active_family_member(family_id));
create policy "note_categories_delete" on public.note_categories for delete to authenticated using (public.is_active_family_member(family_id));

drop policy if exists "notes_select" on public.notes;
drop policy if exists "notes_insert" on public.notes;
drop policy if exists "notes_update" on public.notes;
drop policy if exists "notes_delete" on public.notes;
create policy "notes_select" on public.notes for select to authenticated using (public.is_active_family_member(family_id));
create policy "notes_insert" on public.notes for insert to authenticated with check (public.is_active_family_member(family_id) and created_by = auth.uid());
create policy "notes_update" on public.notes for update to authenticated using (public.is_active_family_member(family_id)) with check (public.is_active_family_member(family_id));
create policy "notes_delete" on public.notes for delete to authenticated using (public.is_active_family_member(family_id));

-- chores + rewards
drop policy if exists "chores_select" on public.chores;
drop policy if exists "chores_insert" on public.chores;
drop policy if exists "chores_update" on public.chores;
drop policy if exists "chores_delete" on public.chores;
create policy "chores_select" on public.chores for select to authenticated using (public.is_active_family_member(family_id));
create policy "chores_insert" on public.chores for insert to authenticated with check (public.is_active_family_member(family_id));
create policy "chores_update" on public.chores for update to authenticated using (public.is_active_family_member(family_id)) with check (public.is_active_family_member(family_id));
create policy "chores_delete" on public.chores for delete to authenticated using (public.is_active_family_member(family_id));

drop policy if exists "chore_completions_select" on public.chore_completions;
drop policy if exists "chore_completions_insert" on public.chore_completions;
create policy "chore_completions_select" on public.chore_completions for select to authenticated using (
  exists (select 1 from public.chores c where c.id = chore_id and public.is_active_family_member(c.family_id))
);
create policy "chore_completions_insert" on public.chore_completions for insert to authenticated with check (
  completed_by_user_id = auth.uid()
  and exists (select 1 from public.chores c where c.id = chore_id and public.is_active_family_member(c.family_id))
);

drop policy if exists "reward_balances_select" on public.reward_balances;
drop policy if exists "reward_balances_insert" on public.reward_balances;
drop policy if exists "reward_balances_update" on public.reward_balances;
create policy "reward_balances_select" on public.reward_balances for select to authenticated using (
  user_id = auth.uid() or public.users_share_active_family(user_id, auth.uid())
);
create policy "reward_balances_insert" on public.reward_balances for insert to authenticated with check (user_id = auth.uid());
create policy "reward_balances_update" on public.reward_balances for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "reward_transactions_select" on public.reward_transactions;
drop policy if exists "reward_transactions_insert" on public.reward_transactions;
create policy "reward_transactions_select" on public.reward_transactions for select to authenticated using (
  user_id = auth.uid() or public.users_share_active_family(user_id, auth.uid())
);
create policy "reward_transactions_insert" on public.reward_transactions for insert to authenticated with check (user_id = auth.uid());

-- Grants
grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert, update, delete on public.conversation_members to authenticated;
grant select, insert, update on public.messages to authenticated;

grant select, insert, update, delete on public.recipes to authenticated;
grant select, insert, update, delete on public.recipe_ingredients to authenticated;
grant select, insert, update, delete on public.meal_plan_entries to authenticated;

grant select, insert, update, delete on public.expense_categories to authenticated;
grant select, insert, update, delete on public.expenses to authenticated;

grant select, insert, update, delete on public.document_categories to authenticated;
grant select, insert, update, delete on public.documents to authenticated;

grant select, insert, update, delete on public.routines to authenticated;
grant select, insert, update, delete on public.routine_steps to authenticated;
grant select, insert on public.routine_logs to authenticated;

grant select, insert, update, delete on public.note_categories to authenticated;
grant select, insert, update, delete on public.notes to authenticated;

grant select, insert, update, delete on public.chores to authenticated;
grant select, insert on public.chore_completions to authenticated;
grant select, insert, update on public.reward_balances to authenticated;
grant select, insert on public.reward_transactions to authenticated;

grant execute on function public.is_conversation_member(uuid, uuid) to authenticated;
grant execute on function public.ensure_family_conversation(uuid) to authenticated;
grant execute on function public.create_direct_conversation(uuid, uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.complete_chore(uuid) to authenticated;

-- Realtime publication
alter table public.messages replica identity full;
alter table public.chores replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then
      alter publication supabase_realtime add table public.messages;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chores') then
      alter publication supabase_realtime add table public.chores;
    end if;
  end if;
end $$;
