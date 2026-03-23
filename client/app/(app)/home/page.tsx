import Link from "next/link";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getHomeDashboardPreferences, getHomeSnapshot } from "@/features/home/server";
import { getProductFeatureAvailability } from "@/features/admin/server";
import { getServerI18n } from "@/lib/i18n/server";
import type { HomeWidgetKey } from "@/features/home/dashboard";
import { getLocationLabelFromIp, getWeatherWidgetData } from "@/features/home/weather";

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

function getGreetingKey(reference: Date) {
  const hour = reference.getHours();

  if (hour >= 5 && hour < 12) {
    return "home.greetingMorning";
  }

  if (hour >= 12 && hour < 18) {
    return "home.greetingAfternoon";
  }

  if (hour >= 18 && hour < 22) {
    return "home.greetingEvening";
  }

  return "home.greetingNight";
}

export default async function HomePage() {
  const user = await requireUser();
  const { t, dateLocale, locale } = await getServerI18n();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    return <p className="loom-muted">{t("onboarding.createFamilyFirst", "Create a family first.")}</p>;
  }

  const [snapshot, featureAvailability, dashboard] = await Promise.all([
    getHomeSnapshot(context.activeFamilyId, user.id),
    getProductFeatureAvailability(),
    getHomeDashboardPreferences(user.id)
  ]);
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const clientIp = forwardedFor?.split(",")[0]?.trim() ?? null;
  const ipLocationLabel = !dashboard.settings.weather?.location ? await getLocationLabelFromIp(clientIp) : null;

  const weatherSettings = dashboard.settings.weather;
  const weather = dashboard.widgets.some((widget) => widget.key === "weather" && widget.enabled)
    ? await getWeatherWidgetData({
        locale,
        location: weatherSettings?.location || ipLocationLabel || "",
        unit: weatherSettings?.unit ?? "celsius"
      })
    : null;

  const showChoresRewards = featureAvailability.chores || featureAvailability.rewards;
  const firstName = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ?? t("home.greetingFallbackName", "there");
  const now = new Date();
  const todayLabel = new Intl.DateTimeFormat(dateLocale, { weekday: "long", month: "long", day: "numeric" }).format(now);
  const greeting = t(getGreetingKey(now), "Good morning");
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const weekEnd = getWeekStartMonday(now);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const upcomingEventsPreview = snapshot.upcomingEvents.slice(0, 7);
  const extraEvents = Math.max(0, snapshot.upcomingEvents.length - upcomingEventsPreview.length);
  const groupedUpcomingEvents = {
    today: upcomingEventsPreview.filter((event) => {
      const eventDate = new Date(event.start_at);
      return eventDate >= todayStart && eventDate <= todayEnd;
    }),
    thisWeek: upcomingEventsPreview.filter((event) => {
      const eventDate = new Date(event.start_at);
      return eventDate > todayEnd && eventDate <= weekEnd;
    }),
    following: upcomingEventsPreview.filter((event) => {
      const eventDate = new Date(event.start_at);
      return eventDate > weekEnd;
    })
  };
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

  function renderWidget(widgetKey: HomeWidgetKey) {
    switch (widgetKey) {
      case "upcoming_events":
        return (
          <article key={widgetKey} className="loom-card p-4 loom-home-layout-upcoming">
            <div className="loom-row-between">
              <h3 className="loom-section-title">{t("home.upcomingEvents", "Upcoming events")}</h3>
              <Link href="/calendar" className="loom-subtle-link">
                {t("common.viewAll", "View all")}
              </Link>
            </div>
            <div className="loom-stack-sm mt-3">
              {upcomingEventsPreview.length === 0 ? <p className="loom-muted">{t("calendar.noUpcomingItems", "No upcoming items.")}</p> : null}
              {groupedUpcomingEvents.today.length > 0 ? <p className="loom-lists-group-title">{t("calendar.groupToday", "Today")}</p> : null}
              {groupedUpcomingEvents.today.map((event) => {
                const eventDate = new Date(event.start_at);
                return (
                  <Link key={event.id} href={`/calendar/${event.id}`} className="loom-home-row is-today">
                    <span className="loom-home-time">{eventDate.toLocaleTimeString(dateLocale, { hour: "numeric", minute: "2-digit" })}</span>
                    <span className="loom-home-text">{event.title}</span>
                    <span>{t("calendar.today", "Today")}</span>
                  </Link>
                );
              })}
              {groupedUpcomingEvents.thisWeek.length > 0 ? <p className="loom-lists-group-title">{t("calendar.groupThisWeek", "This Week")}</p> : null}
              {groupedUpcomingEvents.thisWeek.map((event) => {
                const eventDate = new Date(event.start_at);
                return (
                  <Link key={event.id} href={`/calendar/${event.id}`} className="loom-home-row">
                    <span className="loom-home-time">{eventDate.toLocaleString(dateLocale, { weekday: "short", hour: "numeric", minute: "2-digit" })}</span>
                    <span className="loom-home-text">{event.title}</span>
                    <span>&gt;</span>
                  </Link>
                );
              })}
              {groupedUpcomingEvents.following.length > 0 ? <p className="loom-lists-group-title">{t("calendar.groupFollowing", "Following")}</p> : null}
              {groupedUpcomingEvents.following.map((event) => {
                const eventDate = new Date(event.start_at);
                return (
                  <Link key={event.id} href={`/calendar/${event.id}`} className="loom-home-row">
                    <span className="loom-home-time">{eventDate.toLocaleString(dateLocale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                    <span className="loom-home-text">{event.title}</span>
                    <span>&gt;</span>
                  </Link>
                );
              })}
              {extraEvents > 0 ? (
                <Link href="/calendar" className="loom-subtle-link">
                  + {extraEvents} {t("home.moreUpcomingEvents", "more upcoming events")} &gt;
                </Link>
              ) : null}
            </div>
          </article>
        );
      case "quick_stats":
        return (
          <article key={widgetKey} className="loom-card p-4 loom-home-layout-quick">
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
        );
      case "shopping_list":
        return (
          <article key={widgetKey} className="loom-card p-4 loom-home-layout-shopping">
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
        );
      case "tasks":
        return (
          <article key={widgetKey} className="loom-card p-4 loom-home-layout-tasks">
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
        );
      case "weekly_meals":
        return (
          <article key={widgetKey} className="loom-card p-4 loom-home-layout-meals">
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
        );
      case "chores_rewards":
        if (!showChoresRewards) {
          return null;
        }

        return (
          <article key={widgetKey} className="loom-card p-4 loom-home-layout-chores">
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
        );
      case "weather":
        return (
          <article key={widgetKey} className="loom-card p-4 loom-home-layout-weather">
            <div className="loom-row-between">
              <div>
                <h3 className="loom-section-title">{t("home.widgets.weather", "Weather")}</h3>
                <p className="loom-muted small mt-1 mb-0">{weather?.locationLabel ?? weatherSettings?.location ?? ipLocationLabel ?? "Weather"}</p>
              </div>
              <Link href="/settings" className="loom-subtle-link">
                {t("common.edit", "Edit")}
              </Link>
            </div>
            {weather?.status === "ready" ? (
              <div className="loom-weather-widget mt-4">
                <p className="loom-weather-widget-temp">
                  {Math.round(weather.temperature)}
                  <span>{weather.unitLabel}</span>
                </p>
                <p className="loom-weather-widget-summary">{weather.summary}</p>
                <div className="loom-stack-sm">
                  <p className="loom-home-statline">
                    <span>{t("home.weatherFeelsLike", "Feels like")}</span>
                    <strong className="loom-weather-widget-stat">
                      {weather.apparentTemperature !== null ? `${Math.round(weather.apparentTemperature)}${weather.unitLabel}` : "—"}
                    </strong>
                  </p>
                  <p className="loom-home-statline">
                    <span>{t("home.weatherWind", "Wind")}</span>
                    <strong className="loom-weather-widget-stat">
                      {weather.windSpeed !== null ? `${Math.round(weather.windSpeed)} km/h` : "—"}
                    </strong>
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 loom-stack-sm">
                <p className="loom-muted">{weather?.message ?? t("home.weatherUnavailable", "Weather is taking a quick breather.")}</p>
                <p className="loom-home-pill is-muted">{t("home.weatherEditHint", "Update the weather location in Settings.")}</p>
              </div>
            )}
          </article>
        );
      default:
        return null;
    }
  }

  return (
    <div className="loom-home-figma">
      <section className="loom-home-greeting">
        <p className="loom-muted">{todayLabel}</p>
        <h2 className="loom-home-greeting-title">
          {greeting}, {firstName}
        </h2>
      </section>

      <section className="loom-home-layout">{dashboard.widgets.filter((widget) => widget.enabled).map((widget) => renderWidget(widget.key))}</section>
    </div>
  );
}
