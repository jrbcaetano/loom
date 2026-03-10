import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, ArrowRight, Plus, X } from "lucide-react";

interface Member {
  id: string;
  name: string;
  role: "Adult" | "Child";
  avatar: string;
}

export function AddMembers() {
  const [members, setMembers] = useState<Member[]>([
    { id: "1", name: "Sarah", role: "Adult", avatar: "👩" },
  ]);

  const removeMember = (id: string) => {
    setMembers(members.filter((m) => m.id !== id));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/onboarding/create-family"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Link>

        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 h-1 bg-primary rounded-full"></div>
          <div className="flex-1 h-1 bg-primary rounded-full"></div>
          <div className="flex-1 h-1 bg-muted rounded-full"></div>
        </div>

        <p className="text-sm text-muted-foreground mb-2">Step 2 of 3</p>
        <h1 className="text-[28px] text-foreground mb-2">Add Family Members</h1>
        <p className="text-muted-foreground">Who's in your family?</p>
      </div>

      {/* Member List */}
      <div className="flex-1 max-w-md w-full mx-auto">
        <div className="space-y-3 mb-6">
          {members.map((member) => (
            <div
              key={member.id}
              className="bg-card rounded-[16px] p-4 shadow-sm border border-border flex items-center gap-3"
            >
              <div className="text-3xl">{member.avatar}</div>
              <div className="flex-1">
                <p className="text-sm text-foreground">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.role}</p>
              </div>
              <button
                onClick={() => removeMember(member.id)}
                className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Member Form */}
        <div className="bg-card rounded-[16px] p-5 shadow-sm border border-border mb-6">
          <h3 className="text-sm text-foreground mb-4">Add Member</h3>
          <form className="space-y-4">
            <div>
              <label htmlFor="memberName" className="block text-sm text-foreground mb-2">
                Name
              </label>
              <input
                id="memberName"
                type="text"
                placeholder="Enter name"
                className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-[10px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm text-foreground mb-2">Role</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="py-2.5 px-4 bg-primary text-primary-foreground rounded-[10px] text-sm"
                >
                  Adult
                </button>
                <button
                  type="button"
                  className="py-2.5 px-4 bg-muted/50 border border-border text-foreground rounded-[10px] text-sm"
                >
                  Child
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-foreground mb-2">Avatar</label>
              <div className="grid grid-cols-6 gap-2">
                {["👨", "👩", "👦", "👧", "🧒", "👶", "🧑", "👴", "👵"].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="aspect-square bg-muted/50 border border-border rounded-lg text-xl hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="w-full py-2.5 bg-muted/50 border border-border text-foreground rounded-[10px] hover:bg-muted transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
          </form>
        </div>

        {/* Skip Option */}
        <div className="text-center mb-6">
          <Link to="/onboarding/invite" className="text-sm text-muted-foreground hover:text-foreground">
            I'll add members later
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-md w-full mx-auto pt-6">
        <Link
          to="/onboarding/invite"
          className="w-full py-3.5 bg-primary text-primary-foreground rounded-[10px] hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <span>Continue</span>
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}
