import { Link } from "react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function CreateFamily() {
  return (
    <div className="min-h-screen bg-background flex flex-col px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/onboarding/welcome"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Link>

        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 h-1 bg-primary rounded-full"></div>
          <div className="flex-1 h-1 bg-muted rounded-full"></div>
          <div className="flex-1 h-1 bg-muted rounded-full"></div>
        </div>

        <p className="text-sm text-muted-foreground mb-2">Step 1 of 3</p>
        <h1 className="text-[28px] text-foreground mb-2">Create Your Family</h1>
        <p className="text-muted-foreground">Give your family a name</p>
      </div>

      {/* Form */}
      <div className="flex-1 max-w-md w-full mx-auto">
        <form className="space-y-6">
          {/* Family Name */}
          <div>
            <label htmlFor="familyName" className="block text-sm text-foreground mb-2">
              Family Name
            </label>
            <input
              id="familyName"
              type="text"
              placeholder="The Johnson Family"
              className="w-full px-4 py-3 bg-card border border-border rounded-[10px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-xs text-muted-foreground mt-2">
              This will be visible to all family members
            </p>
          </div>

          {/* Family Emoji/Icon */}
          <div>
            <label className="block text-sm text-foreground mb-3">Choose an Icon</label>
            <div className="grid grid-cols-5 gap-3">
              {["🏠", "👨‍👩‍👧‍👦", "❤️", "🌟", "🌈", "🎈", "🎨", "🌻", "🍀", "⭐"].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="aspect-square bg-card border-2 border-border rounded-[10px] text-2xl hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Suggestions */}
          <div className="bg-muted/30 rounded-[16px] p-4 border border-border">
            <p className="text-sm text-muted-foreground mb-3">💡 Suggestions</p>
            <div className="flex flex-wrap gap-2">
              {["Home", "Family", "Our Crew", "Team [Name]"].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="px-3 py-1.5 bg-card border border-border rounded-full text-sm text-foreground hover:bg-muted transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="max-w-md w-full mx-auto pt-6">
        <Link
          to="/onboarding/add-members"
          className="w-full py-3.5 bg-primary text-primary-foreground rounded-[10px] hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <span>Continue</span>
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}
