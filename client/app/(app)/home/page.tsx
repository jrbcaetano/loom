import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getHomeSnapshot } from "@/features/home/server";
import { getServerI18n } from "@/lib/i18n/server";
import { resolveDateLocale } from "@/lib/date";

export default async function HomePage() {
  const user = await requireUser();
  const { t, locale } = await getServerI18n();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    return <p className="loom-muted">{t("onboarding.createFamilyFirst", "Create a family first.")}</p>;
  }

  const snapshot = await getHomeSnapshot(context.activeFamilyId, user.id);
  const firstName = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ?? t("home.greetingFallbackName", "there");
  const dateLocale = resolveDateLocale(locale);
  const todayLabel = new Intl.DateTimeFormat(dateLocale, { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  const eventsToday = snapshot.upcomingEvents.slice(0, 3);
  const tasksPreview = snapshot.myTasks.slice(0, 3);
  const mealsPreview = snapshot.weeklyMeals.slice(0, 3);
  const rewardsPreview = snapshot.rewards.slice(0, 2);

  return (
    <div className="loom-home-figma">
      <section className="loom-home-greeting">
        <p className="loom-muted">{todayLabel}</p>
        <h2 className="loom-home-greeting-title">
          {t("home.greeting", "Good morning")}, {firstName} <span className="loom-no-wrap">{"👋"}</span>
        </h2>
      </section>

      <section className="loom-home-grid-top">
        <article className="loom-card p-4">
          <div className="loom-row-between">
            <h3 className="loom-section-title">{"📅"} {t("home.todaysEvents", "Today's Events")}</h3>
            <Link href="/calendar" className="loom-subtle-link">
              {t("common.viewAll", "View all")}
            </Link>
          </div>
          <div className="loom-stack-sm mt-3">
            {(eventsToday.length > 0
              ? eventsToday
              : [{ id: "e1", title: t("home.sampleFamilyBreakfast", "Family breakfast"), start_at: new Date().toISOString(), location: "" }]
            ).map((event) => (
              <Link key={event.id} href={event.id.startsWith("e") ? "/calendar" : `/calendar/${event.id}`} className="loom-home-row">
                <span className="loom-home-time">{new Date(event.start_at).toLocaleTimeString(dateLocale, { hour: "numeric", minute: "2-digit" })}</span>
                <span className="loom-home-text">{event.title}</span>
                <span>{"👨"}</span>
              </Link>
            ))}
          </div>
        </article>

        <article className="loom-card p-4 loom-home-desktop-only">
          <h3 className="loom-section-title">{t("home.quickStats", "Quick Stats")}</h3>
          <div className="loom-stack-sm mt-4">
            <p className="loom-home-statline">
              <span>{t("home.quickStatsTasksDueToday", "Tasks Due Today")}</span>
              <strong>{snapshot.quickStats.tasksDueToday}</strong>
            </p>
            <p className="loom-home-statline">
              <span>{t("home.quickStatsPendingChores", "Pending Chores")}</span>
              <strong>{snapshot.quickStats.pendingChores}</strong>
            </p>
            <p className="loom-home-statline">
              <span>{t("home.quickStatsShoppingItems", "Shopping Items")}</span>
              <strong>{snapshot.quickStats.shoppingItems}</strong>
            </p>
          </div>
        </article>
      </section>

      <section className="loom-home-grid-mid">
        <article className="loom-card p-4">
          <div className="loom-row-between">
            <h3 className="loom-section-title">{"☑"} {t("nav.tasks", "Tasks")}</h3>
            <Link href="/tasks" className="loom-subtle-link">
              {t("common.viewAll", "View all")}
            </Link>
          </div>
          <div className="loom-stack-sm mt-3">
            {tasksPreview.length === 0 ? <p className="loom-muted">{t("home.noTasksDueToday", "No tasks due today.")}</p> : null}
            {tasksPreview.map((task) => (
              <Link key={task.id} href={`/tasks/${task.id}`} className="loom-home-check-row">
                <span className="loom-home-checkbox" />
                <span className="loom-home-task-copy">
                  <span>{task.title}</span>
                  <small>{task.due_at ? new Date(task.due_at).toLocaleDateString(dateLocale) : t("tasks.noDueDate", "No due date")}</small>
                </span>
              </Link>
            ))}
          </div>
        </article>

        <article className="loom-card p-4">
          <div className="loom-row-between">
            <h3 className="loom-section-title">{"🛒"} {t("home.shoppingList", "Shopping List")}</h3>
            <Link href="/lists" className="loom-subtle-link">
              {t("common.viewAll", "View all")}
            </Link>
          </div>
          {snapshot.shopping.listVisibility === "family" ? <p className="loom-home-pill mt-2">{t("common.shared", "Shared")}</p> : null}
          <div className="loom-stack-sm mt-3">
            {snapshot.shopping.items.length === 0 ? <p className="loom-muted">{t("lists.noItems", "No items yet.")}</p> : null}
            {snapshot.shopping.items.map((item) => (
              <p key={item.id} className="loom-home-check-row">
                <span className={`loom-home-checkbox ${item.isCompleted ? "is-done" : ""}`} />
                <span className="loom-home-row-between">
                  <span className={item.isCompleted ? "loom-home-line-through" : ""}>{item.text}</span>
                  <small>{item.quantity ?? ""}</small>
                </span>
              </p>
            ))}
          </div>
        </article>

        <article className="loom-card p-4 loom-home-desktop-only">
          <div className="loom-row-between">
            <h3 className="loom-section-title">{"🍽️"} {t("home.thisWeeksMeals", "This Week's Meals")}</h3>
            <Link href="/meals/planner" className="loom-subtle-link">
              {t("common.viewAll", "View all")}
            </Link>
          </div>
          <div className="loom-stack-sm mt-3">
            {(mealsPreview.length > 0
              ? mealsPreview
              : [
                  { id: "m1", date: t("calendar.today", "Today"), title: "Spaghetti Carbonara" },
                  { id: "m2", date: t("calendar.monday", "Monday"), title: "Chicken Stir Fry" },
                  { id: "m3", date: t("calendar.tuesday", "Tuesday"), title: "Taco Tuesday" }
                ]).map((meal) => (
              <p key={meal.id} className="loom-home-row">
                <span className="loom-home-time">{meal.date}</span>
                <span className="loom-home-text">{meal.title}</span>
                <span>›</span>
              </p>
            ))}
          </div>
        </article>
      </section>

      <section className="loom-card p-4 loom-home-desktop-only">
        <div className="loom-row-between">
          <h3 className="loom-section-title">{"⭐"} {t("nav.chores", "Chores & Rewards")}</h3>
          <Link href="/chores" className="loom-subtle-link">
            {t("common.viewAll", "View all")}
          </Link>
        </div>
        <div className="loom-home-grid-bottom mt-3">
          {rewardsPreview.map((member) => (
            <article key={member.userId} className="loom-home-reward">
              <p className="m-0 font-semibold">{"👧"} {member.name}</p>
              <p className="m-0 loom-muted small">
                {member.points}/100 {t("home.points", "points")}
              </p>
              <div className="loom-home-progress mt-3">
                <div style={{ width: `${Math.max(8, Math.min(100, member.points))}%` }} />
              </div>
            </article>
          ))}
          {rewardsPreview.length === 0 ? <p className="loom-muted">{t("home.noRewardBalances", "No reward balances yet.")}</p> : null}
        </div>
      </section>
    </div>
  );
}
