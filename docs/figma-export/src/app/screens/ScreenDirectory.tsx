import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

interface ScreenGroup {
  title: string;
  description: string;
  screens: {
    name: string;
    path: string;
    description: string;
  }[];
}

const screenGroups: ScreenGroup[] = [
  {
    title: "Authentication",
    description: "User authentication and account creation",
    screens: [
      { name: "Login", path: "/login", description: "User login with email/password and social options" },
      { name: "Register", path: "/register", description: "Create new account" },
      { name: "Forgot Password", path: "/forgot-password", description: "Password reset flow" },
    ],
  },
  {
    title: "Onboarding",
    description: "New user setup and family creation",
    screens: [
      { name: "Welcome", path: "/onboarding/welcome", description: "App introduction and feature highlights" },
      { name: "Create Family", path: "/onboarding/create-family", description: "Set up family profile" },
      { name: "Add Members", path: "/onboarding/add-members", description: "Add family members" },
    ],
  },
  {
    title: "Main App",
    description: "Core family management features",
    screens: [
      { name: "Home Dashboard", path: "/", description: "Overview of events, tasks, shopping, meals, and chores" },
      { name: "Tasks", path: "/tasks", description: "Personal and family task management" },
      { name: "Shopping Lists", path: "/lists", description: "Shared grocery and shopping lists" },
      { name: "Calendar", path: "/calendar", description: "Family calendar with events" },
      { name: "Meal Planner", path: "/meals", description: "Weekly meal planning with recipes" },
      { name: "Chores & Rewards", path: "/chores", description: "Gamified chore system for children" },
      { name: "Notes", path: "/notes", description: "Shared family knowledge base" },
      { name: "Profile", path: "/profile", description: "Family members and settings" },
      { name: "Notifications", path: "/notifications", description: "Activity and reminders" },
    ],
  },
  {
    title: "Design System",
    description: "Component library and design tokens",
    screens: [
      { name: "Design System", path: "/design-system", description: "UI components, colors, and typography" },
    ],
  },
];

export function ScreenDirectory() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="w-16 h-16 bg-primary rounded-[20px] flex items-center justify-center text-3xl mx-auto mb-4">
          🏠
        </div>
        <h1 className="text-[36px] text-foreground mb-3">Loom UI Mockup</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Complete mobile-first family management application
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm">
          <span className="text-lg">📱</span>
          <span>Mobile-first design (390x844)</span>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        <div className="bg-card rounded-[16px] p-5 border border-border text-center">
          <div className="text-2xl mb-2">🎨</div>
          <h3 className="text-sm text-foreground mb-1">Modern Design</h3>
          <p className="text-xs text-muted-foreground">Inspired by Apple Reminders & Linear</p>
        </div>
        <div className="bg-card rounded-[16px] p-5 border border-border text-center">
          <div className="text-2xl mb-2">📐</div>
          <h3 className="text-sm text-foreground mb-1">8px Grid System</h3>
          <p className="text-xs text-muted-foreground">Consistent spacing & alignment</p>
        </div>
        <div className="bg-card rounded-[16px] p-5 border border-border text-center">
          <div className="text-2xl mb-2">💻</div>
          <h3 className="text-sm text-foreground mb-1">Responsive Layout</h3>
          <p className="text-xs text-muted-foreground">Mobile & desktop optimized</p>
        </div>
      </div>

      {/* Screen Groups */}
      <div className="space-y-8">
        {screenGroups.map((group) => (
          <div key={group.title}>
            <div className="mb-4">
              <h2 className="text-xl text-foreground mb-1">{group.title}</h2>
              <p className="text-sm text-muted-foreground">{group.description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.screens.map((screen) => (
                <Link
                  key={screen.path}
                  to={screen.path}
                  className="bg-card rounded-[16px] p-4 border border-border hover:border-primary hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm text-foreground">{screen.name}</h3>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-xs text-muted-foreground">{screen.description}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Design Specs */}
      <div className="mt-12 bg-muted/30 rounded-[16px] p-6 border border-border">
        <h3 className="text-base text-foreground mb-4">Design Specifications</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">Primary Color</p>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary rounded"></div>
              <p className="text-foreground">#4F7DF3</p>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Background</p>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-background rounded border border-border"></div>
              <p className="text-foreground">#F7F8FA</p>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Card Radius</p>
            <p className="text-foreground">16px</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Button Radius</p>
            <p className="text-foreground">10px</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Typography</p>
            <p className="text-foreground">Inter</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Grid System</p>
            <p className="text-foreground">8px</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Icons</p>
            <p className="text-foreground">Lucide</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Mobile Frame</p>
            <p className="text-foreground">390×844</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-muted-foreground">
          Use the sidebar navigation (desktop) or bottom tabs (mobile) to explore all screens
        </p>
      </div>
    </div>
  );
}
