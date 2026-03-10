import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  member: {
    name: string;
    avatar: string;
    color: string;
  };
  type: "personal" | "family" | "kids";
}

const mockEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Family Breakfast",
    date: "2026-03-08",
    time: "9:00 AM",
    member: { name: "Sarah", avatar: "👩", color: "#FF6B9D" },
    type: "family",
  },
  {
    id: "2",
    title: "Emma's Soccer Practice",
    date: "2026-03-08",
    time: "2:00 PM",
    member: { name: "Emma", avatar: "👧", color: "#FFA94D" },
    type: "kids",
  },
  {
    id: "3",
    title: "Dinner with Grandparents",
    date: "2026-03-08",
    time: "6:30 PM",
    member: { name: "Mike", avatar: "👨", color: "#4F7DF3" },
    type: "family",
  },
  {
    id: "4",
    title: "Doctor Appointment",
    date: "2026-03-10",
    time: "10:00 AM",
    member: { name: "Sarah", avatar: "👩", color: "#FF6B9D" },
    type: "personal",
  },
  {
    id: "5",
    title: "Jake's Birthday Party",
    date: "2026-03-12",
    time: "3:00 PM",
    member: { name: "Jake", avatar: "👦", color: "#22C55E" },
    type: "kids",
  },
  {
    id: "6",
    title: "Parent-Teacher Conference",
    date: "2026-03-13",
    time: "4:30 PM",
    member: { name: "Sarah", avatar: "👩", color: "#FF6B9D" },
    type: "kids",
  },
  {
    id: "7",
    title: "Dentist - Emma",
    date: "2026-03-15",
    time: "11:00 AM",
    member: { name: "Emma", avatar: "👧", color: "#FFA94D" },
    type: "kids",
  },
];

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function Calendar() {
  // Generate calendar days for March 2026
  const today = new Date(2026, 2, 8); // March 8, 2026
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const startingDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const getEventsForDay = (day: number) => {
    const dateStr = `2026-03-${day.toString().padStart(2, "0")}`;
    return mockEvents.filter((event) => event.date === dateStr);
  };

  // Group upcoming events
  const upcomingEvents = mockEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="max-w-md mx-auto lg:max-w-6xl lg:px-8">
      {/* Header */}
      <div className="px-4 pt-8 pb-6 lg:pt-12">
        <h1 className="text-[28px] text-foreground mb-4">Calendar</h1>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button className="w-10 h-10 bg-card rounded-[10px] border border-border flex items-center justify-center shadow-sm hover:bg-muted/50 transition-colors">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h2 className="text-lg text-foreground">March 2026</h2>
          <button className="w-10 h-10 bg-card rounded-[10px] border border-border flex items-center justify-center shadow-sm hover:bg-muted/50 transition-colors">
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:gap-6">
        {/* Calendar Grid */}
        <div className="px-4 mb-6 lg:col-span-2">
          <div className="bg-card rounded-[16px] shadow-sm border border-border p-4">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {daysOfWeek.map((day) => (
                <div key={day} className="text-center text-xs text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="aspect-square"></div>;
                }

                const isToday = day === 8;
                const hasEvents = getEventsForDay(day).length > 0;

                return (
                  <button
                    key={day}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center relative transition-colors ${
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : hasEvents
                        ? "bg-muted/50 hover:bg-muted"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <span className={`text-sm ${isToday ? "font-medium" : ""}`}>{day}</span>
                    {hasEvents && !isToday && (
                      <div className="absolute bottom-1 flex gap-0.5">
                        {getEventsForDay(day).slice(0, 3).map((event, i) => (
                          <div
                            key={i}
                            className="w-1 h-1 rounded-full"
                            style={{ backgroundColor: event.member.color }}
                          ></div>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="px-4 lg:px-0">
          <div className="mb-4">
            <h3 className="text-base text-foreground mb-3">Upcoming Events</h3>
            <div className="space-y-3">
              {upcomingEvents.slice(0, 6).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>

          {/* Add Event Button - Desktop */}
          <div className="hidden lg:block mt-6">
            <button className="w-full py-3 bg-primary text-primary-foreground rounded-[10px] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
              <Plus className="w-5 h-5" />
              <span>Add Event</span>
            </button>
          </div>
        </div>
      </div>

      {/* Event Legend */}
      <div className="px-4 mt-6 mb-8">
        <div className="bg-muted/50 rounded-[16px] p-4 border border-border">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span className="text-muted-foreground">Family</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FFA94D]"></div>
              <span className="text-muted-foreground">Kids</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FF6B9D]"></div>
              <span className="text-muted-foreground">Personal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventCard({ event }: { event: CalendarEvent }) {
  const typeColors = {
    family: "#4F7DF3",
    kids: "#FFA94D",
    personal: "#FF6B9D",
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date(2026, 2, 8);
    const tomorrow = new Date(2026, 2, 9);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="bg-card rounded-[16px] p-4 shadow-sm border border-border hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div
          className="w-1 h-12 rounded-full flex-shrink-0"
          style={{ backgroundColor: typeColors[event.type] }}
        ></div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground mb-1">{event.title}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDate(event.date)}</span>
            <span>•</span>
            <span>{event.time}</span>
          </div>
        </div>
        <div className="text-xl flex-shrink-0">{event.member.avatar}</div>
      </div>
    </div>
  );
}
