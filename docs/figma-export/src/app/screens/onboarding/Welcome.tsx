import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

const features = [
  {
    icon: "✓",
    title: "Stay Organized",
    description: "Manage tasks, events, and shopping lists in one place",
  },
  {
    icon: "👨‍👩‍👧‍👦",
    title: "Family Coordination",
    description: "Keep everyone on the same page with shared calendars",
  },
  {
    icon: "🎯",
    title: "Track Progress",
    description: "Gamify chores and reward children for completing tasks",
  },
];

export function Welcome() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          {/* Logo */}
          <div className="w-20 h-20 bg-primary rounded-[20px] flex items-center justify-center text-4xl mx-auto mb-6">
            🏠
          </div>

          <h1 className="text-[36px] text-foreground mb-3">Welcome to Loom</h1>
          <p className="text-lg text-muted-foreground mb-12">
            The simple way to coordinate family life
          </p>

          {/* Features */}
          <div className="space-y-4 mb-12">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-card rounded-[16px] p-5 shadow-sm border border-border text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-[10px] flex items-center justify-center text-xl flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-base text-foreground mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <Link
              to="/onboarding/create-family"
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-[10px] hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <span>Create Your Family</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/onboarding/join-family"
              className="w-full py-3.5 bg-muted/50 border border-border text-foreground rounded-[10px] hover:bg-muted transition-colors flex items-center justify-center"
            >
              Join Existing Family
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-6 px-4 text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
