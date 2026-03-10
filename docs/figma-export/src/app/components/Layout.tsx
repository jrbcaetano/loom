import { Outlet, Link, useLocation } from "react-router";
import { Home, CheckSquare, List, Calendar as CalendarIcon, User, Plus, Bell } from "lucide-react";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/tasks", icon: CheckSquare, label: "Tasks" },
  { path: "/lists", icon: List, label: "Lists" },
  { path: "/calendar", icon: CalendarIcon, label: "Calendar" },
  { path: "/profile", icon: User, label: "Profile" },
];

export function Layout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-card border-r border-border z-10">
        <div className="flex flex-col flex-1 overflow-y-auto">
          <div className="flex items-center gap-3 h-16 px-6 border-b border-border">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-lg">🏠</div>
            <h1 className="text-xl text-foreground">Loom</h1>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-[10px] transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            
            {/* Additional navigation items for desktop */}
            <div className="pt-4 mt-4 border-t border-border">
              <Link
                to="/meals"
                className={`flex items-center gap-3 px-4 py-3 rounded-[10px] transition-colors ${
                  location.pathname === "/meals"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <span className="text-lg">🍽️</span>
                <span>Meal Planner</span>
              </Link>
              <Link
                to="/chores"
                className={`flex items-center gap-3 px-4 py-3 rounded-[10px] transition-colors ${
                  location.pathname === "/chores"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <span className="text-lg">⭐</span>
                <span>Chores & Rewards</span>
              </Link>
              <Link
                to="/notes"
                className={`flex items-center gap-3 px-4 py-3 rounded-[10px] transition-colors ${
                  location.pathname === "/notes"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <span className="text-lg">📝</span>
                <span>Notes</span>
              </Link>
              <Link
                to="/notifications"
                className={`flex items-center gap-3 px-4 py-3 rounded-[10px] transition-colors ${
                  location.pathname === "/notifications"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Bell className="w-5 h-5" />
                <span>Notifications</span>
              </Link>
            </div>

            {/* Design System Link - Bottom */}
            <div className="pt-4 mt-4 border-t border-border">
              <Link
                to="/screen-directory"
                className={`flex items-center gap-3 px-4 py-3 rounded-[10px] transition-colors ${
                  location.pathname === "/screen-directory"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <span className="text-lg">📱</span>
                <span>Screen Directory</span>
              </Link>
              <Link
                to="/design-system"
                className={`flex items-center gap-3 px-4 py-3 rounded-[10px] transition-colors ${
                  location.pathname === "/design-system"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <span className="text-lg">🎨</span>
                <span>Design System</span>
              </Link>
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 lg:pl-64 max-w-[390px] lg:max-w-none mx-auto lg:mx-0 w-full">
        {/* Top Bar - Desktop */}
        <header className="hidden lg:flex items-center justify-between h-16 px-8 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <h2 className="text-lg text-foreground">
              {navItems.find((item) => item.path === location.pathname)?.label || "Loom"}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/notifications"
              className="w-10 h-10 rounded-[10px] bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors relative"
            >
              <Bell className="w-5 h-5 text-foreground" />
              <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></div>
            </Link>
            <Link to="/profile" className="w-10 h-10 rounded-[10px] bg-primary/10 flex items-center justify-center text-xl">
              👩
            </Link>
          </div>
        </header>

        <main className="flex-1 pb-24 lg:pb-8">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border lg:hidden max-w-[390px] mx-auto">
          <div className="flex justify-around items-center h-20 px-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center justify-center gap-1 flex-1 h-full ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Floating Action Button */}
          <button
            className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
            aria-label="Add new item"
          >
            <Plus className="w-6 h-6" />
          </button>
        </nav>
      </div>
    </div>
  );
}