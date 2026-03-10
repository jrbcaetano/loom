-- Loom mock data seed
-- Safe to re-run: it rebuilds one dedicated mock family and related records.
-- Run in Supabase SQL Editor after at least one real user has signed in (profile exists).

do $$
declare
  v_admin_user uuid;
  v_member_user uuid;
  v_child_user uuid;
  v_family_id uuid := '8d44a9fe-4e3b-4ece-a453-0d253ec7d8f2';
  v_now timestamptz := now();
  v_today date := current_date;
  v_family_conversation_id uuid;
  v_direct_conversation_id uuid;
begin
  select p.id into v_admin_user
  from public.profiles p
  order by p.created_at asc
  limit 1;

  if v_admin_user is null then
    raise exception 'No profiles found. Sign in at least once in Loom before seeding mock data.';
  end if;

  select p.id into v_member_user
  from public.profiles p
  where p.id <> v_admin_user
  order by p.created_at asc
  limit 1;

  select p.id into v_child_user
  from public.profiles p
  where p.id not in (v_admin_user, coalesce(v_member_user, '00000000-0000-0000-0000-000000000000'::uuid))
  order by p.created_at asc
  limit 1;

  -- Rebuild only the dedicated mock family tree.
  delete from public.families where id = v_family_id;

  insert into public.families (id, name, created_by)
  values (v_family_id, '[MOCK] Family Flow', v_admin_user);

  insert into public.family_members (family_id, user_id, role, status, joined_at)
  values (v_family_id, v_admin_user, 'admin', 'active', v_now)
  on conflict do nothing;

  if v_member_user is not null then
    insert into public.family_members (family_id, user_id, role, status, joined_at)
    values (v_family_id, v_member_user, 'adult', 'active', v_now)
    on conflict do nothing;
  end if;

  if v_child_user is not null then
    insert into public.family_members (family_id, user_id, role, status, joined_at)
    values (v_family_id, v_child_user, 'child', 'active', v_now)
    on conflict do nothing;
  end if;

  insert into public.family_members (family_id, invited_email, invited_by, role, status)
  values
    (v_family_id, 'mock.invite.parent@example.com', v_admin_user, 'adult', 'invited'),
    (v_family_id, 'mock.invite.child@example.com', v_admin_user, 'child', 'invited')
  on conflict do nothing;

  insert into public.user_settings (user_id, active_family_id, theme)
  values (v_admin_user, v_family_id, 'light')
  on conflict (user_id) do update set active_family_id = excluded.active_family_id;

  if v_member_user is not null then
    insert into public.user_settings (user_id, active_family_id, theme)
    values (v_member_user, v_family_id, 'light')
    on conflict (user_id) do update set active_family_id = excluded.active_family_id;
  end if;

  if v_child_user is not null then
    insert into public.user_settings (user_id, active_family_id, theme)
    values (v_child_user, v_family_id, 'light')
    on conflict (user_id) do update set active_family_id = excluded.active_family_id;
  end if;

  -- Lists + items
  insert into public.lists (id, family_id, owner_user_id, title, description, visibility, created_by, updated_by)
  values
    ('b1ba0e26-fef8-4eb3-bc1f-2f7ff6aa72be', v_family_id, v_admin_user, 'Groceries', '[MOCK] Weekly grocery run', 'family', v_admin_user, v_admin_user),
    ('cf58f041-d4df-4322-9f0f-dd9523da7661', v_family_id, v_admin_user, 'House Supplies', '[MOCK] Shared household items', 'family', v_admin_user, v_admin_user),
    ('986648bc-d0ed-4e4e-b906-4f8b8bbadcb3', v_family_id, v_admin_user, 'Admin Private', '[MOCK] Private checklist', 'private', v_admin_user, v_admin_user);

  insert into public.list_items (list_id, text, quantity, category, is_completed, sort_order, created_by)
  values
    ('b1ba0e26-fef8-4eb3-bc1f-2f7ff6aa72be', 'Milk', '2', 'Dairy', false, 1, v_admin_user),
    ('b1ba0e26-fef8-4eb3-bc1f-2f7ff6aa72be', 'Eggs', '12', 'Dairy', false, 2, v_admin_user),
    ('b1ba0e26-fef8-4eb3-bc1f-2f7ff6aa72be', 'Bread', '1', 'Bakery', true, 3, v_admin_user),
    ('b1ba0e26-fef8-4eb3-bc1f-2f7ff6aa72be', 'Apples', '6', 'Produce', false, 4, v_admin_user),
    ('cf58f041-d4df-4322-9f0f-dd9523da7661', 'Dish soap', '2', 'Cleaning', false, 1, v_admin_user),
    ('cf58f041-d4df-4322-9f0f-dd9523da7661', 'Laundry detergent', '1', 'Cleaning', false, 2, v_admin_user);

  -- Tasks
  insert into public.tasks (
    id, family_id, owner_user_id, assigned_to_user_id, title, description,
    status, priority, start_at, due_at, visibility, created_by, updated_by
  )
  values
    (
      'f4e2a2a4-0f34-4927-b93d-3112e4ebdc53',
      v_family_id,
      v_admin_user,
      coalesce(v_member_user, v_admin_user),
      'Pick up dry cleaning',
      '[MOCK] Due today',
      'todo',
      'medium',
      v_now,
      v_now + interval '5 hours',
      'family',
      v_admin_user,
      v_admin_user
    ),
    (
      '6f213ce2-e4d4-4ede-9f24-458d4cf2f3e9',
      v_family_id,
      v_admin_user,
      coalesce(v_child_user, v_admin_user),
      'Review homework',
      '[MOCK] Evening check',
      'doing',
      'high',
      v_now + interval '1 day',
      v_now + interval '1 day 4 hours',
      'family',
      v_admin_user,
      v_admin_user
    ),
    (
      '7f4be07e-dd6f-4405-b2d2-c1f43d4ff88d',
      v_family_id,
      v_admin_user,
      v_admin_user,
      'Book dentist appointment',
      '[MOCK] Private task',
      'todo',
      'low',
      v_now + interval '2 days',
      v_now + interval '4 days',
      'private',
      v_admin_user,
      v_admin_user
    );

  -- Events
  insert into public.events (
    id, family_id, owner_user_id, title, description, start_at, end_at, location,
    all_day, visibility, created_by, updated_by
  )
  values
    (
      'f6423e09-0f7d-40eb-b3fd-035932e838b0',
      v_family_id,
      v_admin_user,
      'Family Breakfast',
      '[MOCK] Weekly family breakfast',
      (v_today + time '09:00'),
      (v_today + time '10:00'),
      'Kitchen',
      false,
      'family',
      v_admin_user,
      v_admin_user
    ),
    (
      '304f9d6e-4ef0-4b83-80ca-2ba31fc3df67',
      v_family_id,
      v_admin_user,
      'Soccer Practice',
      '[MOCK] Kids practice',
      ((v_today + 1) + time '14:00'),
      ((v_today + 1) + time '15:30'),
      'City Sports Center',
      false,
      'family',
      v_admin_user,
      v_admin_user
    ),
    (
      '46483f4f-5c95-467d-a430-562665f63a0e',
      v_family_id,
      v_admin_user,
      'Doctor Appointment',
      '[MOCK] Private appointment',
      ((v_today + 2) + time '10:00'),
      ((v_today + 2) + time '10:45'),
      'Clinic',
      false,
      'private',
      v_admin_user,
      v_admin_user
    );

  -- Selective sharing examples (only when additional users exist)
  if v_member_user is not null then
    update public.tasks set visibility = 'selected_members' where id = '6f213ce2-e4d4-4ede-9f24-458d4cf2f3e9';
    insert into public.entity_shares (family_id, entity_type, entity_id, shared_with_user_id, permission, created_by)
    values (v_family_id, 'task', '6f213ce2-e4d4-4ede-9f24-458d4cf2f3e9', v_member_user, 'edit', v_admin_user);
  end if;

  -- Meals
  insert into public.recipes (id, family_id, title, description, instructions, created_by)
  values
    ('f88f8cd6-4af1-4d53-bdd4-b2e83f8af4b3', v_family_id, 'Spaghetti Carbonara', '[MOCK] Fast dinner', 'Boil pasta. Cook pancetta. Mix eggs and cheese.', v_admin_user),
    ('96e96a6b-c6bb-4f51-a065-804df8fca7ff', v_family_id, 'Chicken Stir Fry', '[MOCK] Midweek meal', 'Saute chicken, add vegetables and sauce.', v_admin_user);

  insert into public.recipe_ingredients (recipe_id, name, quantity, unit)
  values
    ('f88f8cd6-4af1-4d53-bdd4-b2e83f8af4b3', 'Spaghetti', '500', 'g'),
    ('f88f8cd6-4af1-4d53-bdd4-b2e83f8af4b3', 'Eggs', '4', 'unit'),
    ('f88f8cd6-4af1-4d53-bdd4-b2e83f8af4b3', 'Parmesan', '120', 'g'),
    ('96e96a6b-c6bb-4f51-a065-804df8fca7ff', 'Chicken breast', '500', 'g'),
    ('96e96a6b-c6bb-4f51-a065-804df8fca7ff', 'Broccoli', '1', 'head'),
    ('96e96a6b-c6bb-4f51-a065-804df8fca7ff', 'Soy sauce', '4', 'tbsp');

  insert into public.meal_plan_entries (family_id, recipe_id, date, meal_type, notes, created_by)
  values
    (v_family_id, 'f88f8cd6-4af1-4d53-bdd4-b2e83f8af4b3', v_today, 'dinner', '[MOCK] Family dinner', v_admin_user),
    (v_family_id, '96e96a6b-c6bb-4f51-a065-804df8fca7ff', v_today + 1, 'dinner', '[MOCK] Weeknight dinner', v_admin_user),
    (v_family_id, null, v_today + 2, 'lunch', '[MOCK] Leftovers', v_admin_user);

  -- Expenses
  insert into public.expense_categories (family_id, name)
  values
    (v_family_id, 'Groceries'),
    (v_family_id, 'Utilities'),
    (v_family_id, 'School')
  on conflict do nothing;

  insert into public.expenses (family_id, title, amount, currency, category, paid_by_user_id, date, notes)
  values
    (v_family_id, 'Weekly supermarket', 142.60, 'EUR', 'Groceries', v_admin_user, v_today - 1, '[MOCK] Shared expense'),
    (v_family_id, 'Electricity bill', 78.10, 'EUR', 'Utilities', coalesce(v_member_user, v_admin_user), v_today - 3, '[MOCK] Monthly bill'),
    (v_family_id, 'School supplies', 39.90, 'EUR', 'School', v_admin_user, v_today - 5, '[MOCK] Back to school');

  -- Documents
  insert into public.document_categories (family_id, name)
  values
    (v_family_id, 'Medical'),
    (v_family_id, 'School'),
    (v_family_id, 'House')
  on conflict do nothing;

  insert into public.documents (family_id, title, description, category, file_url, created_by)
  values
    (v_family_id, 'Insurance Policy', '[MOCK] Family insurance summary', 'House', null, v_admin_user),
    (v_family_id, 'Pediatrician Contact', '[MOCK] Dr. Miller contact details', 'Medical', null, v_admin_user),
    (v_family_id, 'School Calendar', '[MOCK] Semester dates', 'School', null, v_admin_user);

  -- Routines
  insert into public.routines (id, family_id, title, assigned_to_user_id, schedule_type)
  values
    ('b219050d-19fe-4e7a-a2dd-57e395362615', v_family_id, 'Morning Routine', coalesce(v_child_user, v_admin_user), 'daily'),
    ('f0fc0e67-cb29-4e7c-83b5-6208534f7aa6', v_family_id, 'Sunday Reset', coalesce(v_member_user, v_admin_user), 'weekly');

  insert into public.routine_steps (routine_id, text, sort_order)
  values
    ('b219050d-19fe-4e7a-a2dd-57e395362615', 'Make bed', 1),
    ('b219050d-19fe-4e7a-a2dd-57e395362615', 'Brush teeth', 2),
    ('b219050d-19fe-4e7a-a2dd-57e395362615', 'Pack school bag', 3),
    ('f0fc0e67-cb29-4e7c-83b5-6208534f7aa6', 'Laundry', 1),
    ('f0fc0e67-cb29-4e7c-83b5-6208534f7aa6', 'Kitchen deep clean', 2);

  insert into public.routine_logs (routine_id, user_id, completed_at)
  values
    ('b219050d-19fe-4e7a-a2dd-57e395362615', coalesce(v_child_user, v_admin_user), v_now - interval '1 day'),
    ('f0fc0e67-cb29-4e7c-83b5-6208534f7aa6', coalesce(v_member_user, v_admin_user), v_now - interval '2 day');

  -- Notes
  insert into public.note_categories (family_id, name)
  values
    (v_family_id, 'Home'),
    (v_family_id, 'Health'),
    (v_family_id, 'School')
  on conflict do nothing;

  insert into public.notes (family_id, title, content, category, created_by)
  values
    (v_family_id, 'Wi-Fi password', '[MOCK] Network: FamilyFlow / Password: Loom2026!', 'Home', v_admin_user),
    (v_family_id, 'Emergency contacts', '[MOCK] Pediatrician: +351 xxx xxx xxx', 'Health', v_admin_user),
    (v_family_id, 'Pickup schedule', '[MOCK] Monday/Wednesday 5PM soccer pickup.', 'School', v_admin_user);

  -- Chores + rewards
  insert into public.chores (id, family_id, title, description, assigned_to_user_id, points, due_date, status)
  values
    ('2f2a33db-fbf2-40d8-99fe-8a3f792a1f0c', v_family_id, 'Take out trash', '[MOCK] Evening routine', coalesce(v_child_user, v_admin_user), 15, v_today, 'todo'),
    ('f53f13e0-1a71-43d2-9f2c-93f69ec4df53', v_family_id, 'Feed the dog', '[MOCK] Morning and evening', coalesce(v_child_user, v_admin_user), 10, v_today, 'done'),
    ('6ef8bc22-bf5f-45d8-894e-7be4ae2da28b', v_family_id, 'Clean kitchen', '[MOCK] After dinner', coalesce(v_member_user, v_admin_user), 20, v_today + 1, 'todo');

  insert into public.chore_completions (chore_id, completed_by_user_id, completed_at)
  values ('f53f13e0-1a71-43d2-9f2c-93f69ec4df53', coalesce(v_child_user, v_admin_user), v_now - interval '6 hours');

  insert into public.reward_balances (user_id, points_balance)
  values (v_admin_user, 40)
  on conflict (user_id) do update set points_balance = excluded.points_balance;

  if v_member_user is not null and v_member_user <> v_admin_user then
    insert into public.reward_balances (user_id, points_balance)
    values (v_member_user, 60)
    on conflict (user_id) do update set points_balance = excluded.points_balance;
  end if;

  if v_child_user is not null and v_child_user not in (v_admin_user, coalesce(v_member_user, v_admin_user)) then
    insert into public.reward_balances (user_id, points_balance)
    values (v_child_user, 45)
    on conflict (user_id) do update set points_balance = excluded.points_balance;
  end if;

  insert into public.reward_transactions (user_id, points, type, reference_id)
  values
    (coalesce(v_child_user, v_admin_user), 10, 'earn', 'f53f13e0-1a71-43d2-9f2c-93f69ec4df53'::uuid),
    (coalesce(v_member_user, v_admin_user), 20, 'earn', '6ef8bc22-bf5f-45d8-894e-7be4ae2da28b'::uuid);

  -- Conversations + messages
  insert into public.conversations (id, family_id, type)
  values ('90f0fcc6-05a9-4f09-a5ff-80ea2fd52f79', v_family_id, 'family');
  v_family_conversation_id := '90f0fcc6-05a9-4f09-a5ff-80ea2fd52f79'::uuid;

  insert into public.conversation_members (conversation_id, user_id)
  values
    (v_family_conversation_id, v_admin_user),
    (v_family_conversation_id, coalesce(v_member_user, v_admin_user)),
    (v_family_conversation_id, coalesce(v_child_user, v_admin_user))
  on conflict do nothing;

  insert into public.messages (conversation_id, sender_user_id, content, created_at)
  values
    (v_family_conversation_id, v_admin_user, '[MOCK] Dinner is at 7:30 PM.', v_now - interval '2 hours'),
    (v_family_conversation_id, coalesce(v_member_user, v_admin_user), '[MOCK] I can pick up groceries on the way back.', v_now - interval '90 minutes'),
    (v_family_conversation_id, v_admin_user, '[MOCK] Great, adding pasta and milk to the list.', v_now - interval '70 minutes');

  if v_member_user is not null then
    insert into public.conversations (id, family_id, type)
    values ('24bdce49-c005-4f90-8ef9-ec8de5f78311', v_family_id, 'direct');
    v_direct_conversation_id := '24bdce49-c005-4f90-8ef9-ec8de5f78311'::uuid;

    insert into public.conversation_members (conversation_id, user_id)
    values (v_direct_conversation_id, v_admin_user), (v_direct_conversation_id, v_member_user)
    on conflict do nothing;

    insert into public.messages (conversation_id, sender_user_id, content, created_at)
    values
      (v_direct_conversation_id, v_admin_user, '[MOCK] Can you take Emma to practice tomorrow?', v_now - interval '50 minutes'),
      (v_direct_conversation_id, v_member_user, '[MOCK] Yes, I will handle it.', v_now - interval '40 minutes');
  end if;

  -- Notifications
  insert into public.notifications (user_id, family_id, type, title, body, related_entity_type, related_entity_id, actor_user_id, is_read)
  values
    (v_admin_user, v_family_id, 'event_created', '[MOCK] New event: Family Breakfast', 'Event added to calendar', 'event', 'f6423e09-0f7d-40eb-b3fd-035932e838b0'::uuid, v_admin_user, false),
    (v_admin_user, v_family_id, 'list_shared', '[MOCK] Groceries list updated', 'Milk and eggs were added', 'list', 'b1ba0e26-fef8-4eb3-bc1f-2f7ff6aa72be'::uuid, v_admin_user, false),
    (v_admin_user, v_family_id, 'task_assigned', '[MOCK] Task assigned: Pick up dry cleaning', 'Assigned in family tasks', 'task', 'f4e2a2a4-0f34-4927-b93d-3112e4ebdc53'::uuid, v_admin_user, true);

  if v_member_user is not null then
    insert into public.notifications (user_id, family_id, type, title, body, related_entity_type, related_entity_id, actor_user_id, is_read)
    values
      (v_member_user, v_family_id, 'task_assigned', '[MOCK] Task assigned to you', 'Pick up dry cleaning', 'task', 'f4e2a2a4-0f34-4927-b93d-3112e4ebdc53'::uuid, v_admin_user, false);
  end if;
end
$$;
