import { createClient } from "@/lib/supabase/server";

export async function getHomeSnapshot(familyId: string, userId: string) {
  const supabase = await createClient();

  const [myTasksResult, familyOpenTasksResult, eventsResult, listsResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, due_at, status")
      .eq("family_id", familyId)
      .eq("assigned_to_user_id", userId)
      .in("status", ["todo", "doing"])
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
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true })
      .limit(6),
    supabase
      .from("lists")
      .select("id, title, visibility, updated_at")
      .eq("family_id", familyId)
      .eq("archived", false)
      .order("updated_at", { ascending: false })
      .limit(6)
  ]);

  if (myTasksResult.error) throw new Error(myTasksResult.error.message);
  if (familyOpenTasksResult.error) throw new Error(familyOpenTasksResult.error.message);
  if (eventsResult.error) throw new Error(eventsResult.error.message);
  if (listsResult.error) throw new Error(listsResult.error.message);

  const myTasks = myTasksResult.data ?? [];
  const familyTasks = familyOpenTasksResult.data ?? [];
  const openCount = familyTasks.filter((task) => task.status !== "done").length;
  const doneCount = familyTasks.filter((task) => task.status === "done").length;

  return {
    myTasks,
    familySummary: {
      openCount,
      doneCount,
      totalCount: familyTasks.length
    },
    upcomingEvents: eventsResult.data ?? [],
    recentLists: listsResult.data ?? []
  };
}
