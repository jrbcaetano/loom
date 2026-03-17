import { createClient } from "@/lib/supabase/server";
import { isSystemShoppingListTitle } from "@/features/lists/display";

export async function getHomeSnapshot(familyId: string, userId: string) {
  const supabase = await createClient();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const weekStart = new Date(todayStart);
  const dayOfWeek = weekStart.getDay();
  const daysFromMonday = (dayOfWeek + 6) % 7;
  weekStart.setDate(weekStart.getDate() - daysFromMonday);
  const workWeekEnd = new Date(weekStart);
  workWeekEnd.setDate(workWeekEnd.getDate() + 4);

  const [myTasksResult, familyOpenTasksResult, eventsResult, listsResult, choresResult, shoppingItemsResult, mealsResult, membersResult, rewardBalancesResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, due_at, status")
      .eq("family_id", familyId)
      .eq("assigned_to_user_id", userId)
      .neq("status", "done")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(8),
    supabase
      .from("tasks")
      .select("id, status")
      .eq("family_id", familyId)
      .eq("archived", false),
    supabase
      .from("events")
      .select("id, title, start_at, location")
      .eq("family_id", familyId)
      .eq("archived", false)
      .gte("start_at", todayStart.toISOString())
      .order("start_at", { ascending: true })
      .limit(80),
    supabase
      .from("lists")
      .select("id, title, visibility, updated_at")
      .eq("family_id", familyId)
      .eq("archived", false)
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("chores")
      .select("id, assigned_to_user_id, status")
      .eq("family_id", familyId)
      .eq("status", "todo"),
    supabase
      .from("list_items")
      .select("id, list_id, text, quantity, is_completed, sort_order"),
    supabase
      .from("meal_plan_entries")
      .select("id, date, meal_type, recipes(title)")
      .eq("family_id", familyId)
      .gte("date", weekStart.toISOString().slice(0, 10))
      .lte("date", workWeekEnd.toISOString().slice(0, 10))
      .order("date", { ascending: true })
      .limit(20),
    supabase
      .from("family_members")
      .select("user_id, profiles!family_members_user_id_fkey(full_name, email)")
      .eq("family_id", familyId)
      .eq("status", "active")
      .not("user_id", "is", null),
    supabase
      .from("reward_balances")
      .select("user_id, points_balance")
  ]);

  if (myTasksResult.error) throw new Error(myTasksResult.error.message);
  if (familyOpenTasksResult.error) throw new Error(familyOpenTasksResult.error.message);
  if (eventsResult.error) throw new Error(eventsResult.error.message);
  if (listsResult.error) throw new Error(listsResult.error.message);
  if (choresResult.error) throw new Error(choresResult.error.message);
  if (shoppingItemsResult.error) throw new Error(shoppingItemsResult.error.message);
  if (mealsResult.error) throw new Error(mealsResult.error.message);
  if (membersResult.error) throw new Error(membersResult.error.message);
  if (rewardBalancesResult.error) throw new Error(rewardBalancesResult.error.message);

  const myTasks = myTasksResult.data ?? [];
  const familyTasks = familyOpenTasksResult.data ?? [];
  const openCount = familyTasks.filter((task) => task.status !== "done").length;
  const doneCount = familyTasks.filter((task) => task.status === "done").length;
  const todayTaskCount = myTasks.filter((task) => task.due_at && new Date(task.due_at) >= todayStart && new Date(task.due_at) <= todayEnd).length;

  const familyListIds = new Set((listsResult.data ?? []).map((list) => list.id));
  const shoppingItemsCount = (shoppingItemsResult.data ?? []).filter((item) => familyListIds.has(item.list_id) && item.is_completed === false).length;
  const selectedList =
    (listsResult.data ?? []).find((list) => isSystemShoppingListTitle(list.title)) ??
    (listsResult.data ?? []).find((list) => list.visibility === "family") ??
    (listsResult.data ?? [])[0] ??
    null;

  const allSelectedListItems = (shoppingItemsResult.data ?? [])
    .filter((item) => selectedList && item.list_id === selectedList.id && item.is_completed === false)
    .sort((a, b) => a.sort_order - b.sort_order);
  const selectedListItems = (shoppingItemsResult.data ?? [])
    .filter((item) => selectedList && item.list_id === selectedList.id && item.is_completed === false)
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, 8);

  const memberNameById = new Map<string, string>();
  for (const row of membersResult.data ?? []) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    if (row.user_id) {
      memberNameById.set(row.user_id, profile?.full_name ?? profile?.email ?? "Family member");
    }
  }

  const rewards = (rewardBalancesResult.data ?? [])
    .filter((row) => memberNameById.has(row.user_id))
    .map((row) => ({
      userId: row.user_id,
      name: memberNameById.get(row.user_id) ?? "Family member",
      points: row.points_balance
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 2);

  return {
    myTasks,
    familySummary: {
      openCount,
      doneCount,
      totalCount: familyTasks.length
    },
    upcomingEvents: eventsResult.data ?? [],
    recentLists: listsResult.data ?? [],
    quickStats: {
      tasksDueToday: todayTaskCount,
      pendingChores: (choresResult.data ?? []).length,
      shoppingItems: shoppingItemsCount
    },
    weeklyMeals: (mealsResult.data ?? []).map((meal) => ({
      id: meal.id,
      date: meal.date,
      mealType: meal.meal_type,
      title: (Array.isArray(meal.recipes) ? meal.recipes[0] : meal.recipes)?.title ?? "Planned meal"
    })),
    rewards,
    shopping: {
      listId: selectedList?.id ?? null,
      listTitle: selectedList?.title ?? null,
      listVisibility: selectedList?.visibility ?? null,
      totalItems: allSelectedListItems.length,
      items: selectedListItems.map((item) => ({
        id: item.id,
        text: item.text,
        quantity: item.quantity,
        isCompleted: item.is_completed
      }))
    }
  };
}
