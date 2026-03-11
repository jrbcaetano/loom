import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getHomeSnapshot } from "@/features/home/server";
import { getServerI18n } from "@/lib/i18n/server";
import { resolveDateLocale } from "@/lib/date";

function formatDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getWeekStartMonday(reference: Date) {
  const start = new Date(reference);
  const day = start.getDay();
  const daysFromMonday = (day + 6) % 7;
  start.setDate(start.getDate() - daysFromMonday);
  start.setHours(0, 0, 0, 0);
  return start;
}

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
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const eventsPreview = snapshot.upcomingEvents.slice(0, 7);
  const extraEvents = Math.max(0, snapshot.upcomingEvents.length - eventsPreview.length);
  const tasksPreview = snapshot.myTasks.slice(0, 4);
  const extraTasks = Math.max(0, snapshot.myTasks.length - tasksPreview.length);
  const shoppingPreview = snapshot.shopping.items.slice(0, 3);
  const extraShoppingItems = Math.max(0, snapshot.shopping.totalItems - shoppingPreview.length);
  const shoppingHref = snapshot.shopping.listId ? `/lists/${snapshot.shopping.listId}` : "/lists";
  const rewardsPreview = snapshot.rewards.slice(0, 4);

  const weekStart = getWeekStartMonday(now);
  const mealByDate = new Map(snapshot.weeklyMeals.map((meal) => [meal.date, meal]));
  const mealsWeekPreview = Array.from({ length: 5 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const key = formatDateKey(date);
    const meal = mealByDate.get(key);
    return {
      id: key,
      dayLabel: new Intl.DateTimeFormat(dateLocale, { weekday: "long" }).format(date),
      title: meal?.title ?? t("home.noMealPlanned", "No meal planned")
    };
  });

  return (
    <div className="loom-home-figma">
      <section className="loom-home-greeting">
        <p className="loom-muted">{todayLabel}</p>
        <h2 className="loom-home-greeting-title">
          {t("home.greeting", "Good morning")}, {firstName}
        </h2>
      </section>

      <section className="loom-home-layout">
        <article className="loom-card p-4 loom-home-layout-upcoming">
          <div className="loom-row-between">
            <h3 className="loom-section-title">{t("home.upcomingEvents", "Upcoming events")}</h3>
            <Link href="/calendar" className="loom-subtle-link">
              {t("common.viewAll", "View all")}
            </Link>
          </div>
          <div className="loom-stack-sm mt-3">
            {eventsPreview.length === 0 ? <p className="loom-muted">{t("calendar.noUpcomingItems", "No upcoming items.")}</p> : null}
            {eventsPreview.map((event) => {
              const eventDate = new Date(event.start_at);
              const isToday = eventDate >= todayStart && eventDate <= todayEnd;

              return (
                <Link key={event.id} href={`/calendar/${event.id}`} className={`loom-home-row ${isToday ? "is-today" : ""}`}>
                  <span className="loom-home-time">{eventDate.toLocaleString(dateLocale, { weekday: "short", hour: "numeric", minute: "2-digit" })}</span>
                  <span className="loom-home-text">{event.title}</span>
                  <span>{isToday ? t("calendar.today", "Today") : ">"}</span>
                </Link>
              );
            })}
            {extraEvents > 0 ? (
              <Link href="/calendar" className="loom-subtle-link">
                + {extraEvents} {t("home.moreEventsThisWeek", "more events this week")} &gt;
              </Link>
            ) : null}
          </div>
        </article>

        <article className="loom-card p-4 loom-home-layout-quick">
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

        <article className="loom-card p-4 loom-home-layout-shopping">
          <div className="loom-row-between">
            <h3 className="loom-section-title">{t("home.shoppingList", "Shopping List")}</h3>
            <Link href={shoppingHref} className="loom-subtle-link">
              {t("common.viewAll", "View all")}
            </Link>
          </div>
          {snapshot.shopping.listVisibility === "family" ? <p className="loom-home-pill mt-2">{t("common.shared", "Shared")}</p> : null}
          <div className="loom-stack-sm mt-3">
            {shoppingPreview.length === 0 ? <p className="loom-muted">{t("lists.noItems", "No items yet.")}</p> : null}
            {shoppingPreview.map((item) => (
              <p key={item.id} className="loom-home-check-row">
                <span className={`loom-home-checkbox ${item.isCompleted ? "is-done" : ""}`} />
                <span className="loom-home-row-between">
                  <span className={item.isCompleted ? "loom-home-line-through" : ""}>{item.text}</span>
                  <small>{item.quantity ?? ""}</small>
                </span>
              </p>
            ))}
            {extraShoppingItems > 0 ? (
              <Link href={shoppingHref} className="loom-subtle-link">
                + {extraShoppingItems} {t("home.moreItems", "more items")} &gt;
              </Link>
            ) : null}
          </div>
        </article>

        <article className="loom-card p-4 loom-home-layout-tasks">
          <div className="loom-row-between">
            <h3 className="loom-section-title">{t("nav.tasks", "Tasks")}</h3>
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
            {extraTasks > 0 ? (
              <Link href="/tasks" className="loom-subtle-link">
                + {extraTasks} {t("home.moreTasks", "more tasks")} &gt;
              </Link>
            ) : null}
          </div>
        </article>

        <article className="loom-card p-4 loom-home-layout-meals">
          <div className="loom-row-between">
            <h3 className="loom-section-title">{t("home.thisWeeksMeals", "This Week's Meals")}</h3>
            <Link href="/meals/planner" className="loom-subtle-link">
              {t("common.viewAll", "View all")}
            </Link>
          </div>
          <div className="loom-stack-sm mt-3">
            {mealsWeekPreview.map((meal) => (
              <p key={meal.id} className="loom-home-row">
                <span className="loom-home-time">{meal.dayLabel}</span>
                <span className="loom-home-text">{meal.title}</span>
                <span>&gt;</span>
              </p>
            ))}
          </div>
        </article>

        <article className="loom-card p-4 loom-home-layout-chores">
          <div className="loom-row-between">
            <h3 className="loom-section-title">{t("nav.chores", "Chores & Rewards")}</h3>
            <Link href="/chores" className="loom-subtle-link">
              {t("common.viewAll", "View all")}
            </Link>
          </div>
          <p className="loom-home-statline mt-3">
            <span>{t("home.quickStatsPendingChores", "Pending Chores")}</span>
            <strong>{snapshot.quickStats.pendingChores}</strong>
          </p>
          <div className="loom-home-grid-bottom mt-3">
            {rewardsPreview.map((member) => (
              <article key={member.userId} className="loom-home-reward">
                <p className="m-0 font-semibold">{member.name}</p>
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
        </article>
      </section>
    </div>
  );
}
