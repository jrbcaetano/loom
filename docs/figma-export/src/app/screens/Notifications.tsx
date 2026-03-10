import { Bell, CheckSquare, Calendar, ShoppingCart, Star, Check, X } from "lucide-react";

interface Notification {
  id: string;
  type: "task" | "event" | "shopping" | "chore" | "general";
  title: string;
  message: string;
  time: string;
  read: boolean;
  actionable?: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "task",
    title: "Task Due Today",
    message: "Pick up dry cleaning is due today",
    time: "10 min ago",
    read: false,
    actionable: true,
  },
  {
    id: "2",
    type: "event",
    title: "Upcoming Event",
    message: "Emma's Soccer Practice starts in 1 hour",
    time: "30 min ago",
    read: false,
  },
  {
    id: "3",
    type: "shopping",
    title: "Shopping List Updated",
    message: "Mike added 3 items to Grocery List",
    time: "1 hour ago",
    read: false,
  },
  {
    id: "4",
    type: "chore",
    title: "Chore Completed",
    message: "Emma completed 'Clean room' and earned 10 points",
    time: "2 hours ago",
    read: true,
  },
  {
    id: "5",
    type: "general",
    title: "New Family Member",
    message: "Jake joined your family",
    time: "1 day ago",
    read: true,
  },
  {
    id: "6",
    type: "task",
    title: "Task Assigned",
    message: "Sarah assigned you 'Buy birthday gift'",
    time: "1 day ago",
    read: true,
    actionable: true,
  },
  {
    id: "7",
    type: "event",
    title: "Event Reminder",
    message: "Dinner with Grandparents tomorrow at 6:30 PM",
    time: "2 days ago",
    read: true,
  },
];

export function Notifications() {
  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-md mx-auto lg:max-w-4xl lg:px-8">
      {/* Header */}
      <div className="px-4 pt-8 pb-6 lg:pt-12">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-[28px] text-foreground">Notifications</h1>
          {unreadCount > 0 && (
            <div className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded-full">
              {unreadCount} new
            </div>
          )}
        </div>
        {unreadCount > 0 && (
          <button className="text-sm text-primary hover:underline">Mark all as read</button>
        )}
      </div>

      {/* Notifications List */}
      <div className="px-4 space-y-3">
        {/* Today */}
        <div>
          <h3 className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Today</h3>
          <div className="space-y-2">
            {mockNotifications
              .filter((n) => n.time.includes("min") || n.time.includes("hour"))
              .map((notification) => (
                <NotificationCard key={notification.id} notification={notification} />
              ))}
          </div>
        </div>

        {/* Earlier */}
        <div>
          <h3 className="text-xs text-muted-foreground uppercase tracking-wide mb-3 mt-6">Earlier</h3>
          <div className="space-y-2">
            {mockNotifications
              .filter((n) => n.time.includes("day"))
              .map((notification) => (
                <NotificationCard key={notification.id} notification={notification} />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationCard({ notification }: { notification: Notification }) {
  const getIcon = () => {
    switch (notification.type) {
      case "task":
        return <CheckSquare className="w-5 h-5 text-primary" />;
      case "event":
        return <Calendar className="w-5 h-5 text-primary" />;
      case "shopping":
        return <ShoppingCart className="w-5 h-5 text-primary" />;
      case "chore":
        return <Star className="w-5 h-5 text-primary" />;
      default:
        return <Bell className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div
      className={`bg-card rounded-[16px] p-4 shadow-sm border transition-all ${
        notification.read ? "border-border" : "border-primary/30 bg-primary/5"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-[10px] flex items-center justify-center flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm text-foreground">{notification.title}</h3>
            {!notification.read && <div className="w-2 h-2 bg-primary rounded-full mt-1 flex-shrink-0"></div>}
          </div>
          <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
          <p className="text-xs text-muted-foreground">{notification.time}</p>

          {/* Action Buttons */}
          {notification.actionable && !notification.read && (
            <div className="flex gap-2 mt-3">
              <button className="px-3 py-1.5 bg-primary text-primary-foreground rounded-[8px] text-xs hover:opacity-90 transition-opacity flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>View</span>
              </button>
              <button className="px-3 py-1.5 bg-muted/50 text-muted-foreground rounded-[8px] text-xs hover:bg-muted transition-colors flex items-center gap-1">
                <X className="w-3 h-3" />
                <span>Dismiss</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
