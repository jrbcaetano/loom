import { Settings, Bell, Shield, HelpCircle, LogOut, ChevronRight, Users, Crown } from "lucide-react";

interface FamilyMember {
  id: string;
  name: string;
  avatar: string;
  role: "Parent" | "Child" | "Admin";
  color: string;
  email?: string;
}

const familyMembers: FamilyMember[] = [
  { id: "1", name: "Sarah", avatar: "👩", role: "Admin", color: "#FF6B9D", email: "sarah@family.com" },
  { id: "2", name: "Mike", avatar: "👨", role: "Parent", color: "#4F7DF3", email: "mike@family.com" },
  { id: "3", name: "Emma", avatar: "👧", role: "Child", color: "#FFA94D" },
  { id: "4", name: "Jake", avatar: "👦", role: "Child", color: "#22C55E" },
];

const settingsGroups = [
  {
    title: "Account",
    items: [
      { id: "1", label: "Edit Profile", icon: Settings, action: "edit-profile" },
      { id: "2", label: "Notifications", icon: Bell, action: "notifications" },
      { id: "3", label: "Privacy & Security", icon: Shield, action: "privacy" },
    ],
  },
  {
    title: "Support",
    items: [
      { id: "4", label: "Help Center", icon: HelpCircle, action: "help" },
      { id: "5", label: "Send Feedback", icon: Settings, action: "feedback" },
    ],
  },
];

export function Profile() {
  const currentUser = familyMembers[0]; // Sarah is the current user

  return (
    <div className="max-w-md mx-auto lg:max-w-6xl lg:px-8">
      {/* Header */}
      <div className="px-4 pt-8 pb-6 lg:pt-12">
        <h1 className="text-[28px] text-foreground">Profile</h1>
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:gap-6">
        {/* Current User Profile */}
        <div className="px-4 mb-6 lg:px-0 lg:col-span-1">
          <div className="bg-card rounded-[16px] p-6 shadow-sm border border-border">
            <div className="flex flex-col items-center text-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-5xl mb-3"
                style={{ backgroundColor: `${currentUser.color}15` }}
              >
                {currentUser.avatar}
              </div>
              <h2 className="text-lg text-foreground mb-1">{currentUser.name}</h2>
              <div className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full mb-2">
                <Crown className="w-3 h-3" />
                <span>{currentUser.role}</span>
              </div>
              <p className="text-sm text-muted-foreground">{currentUser.email}</p>
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg text-foreground">12</p>
                  <p className="text-xs text-muted-foreground">Tasks</p>
                </div>
                <div>
                  <p className="text-lg text-foreground">8</p>
                  <p className="text-xs text-muted-foreground">Events</p>
                </div>
                <div>
                  <p className="text-lg text-foreground">4</p>
                  <p className="text-xs text-muted-foreground">Lists</p>
                </div>
              </div>
            </div>
          </div>

          {/* Logout Button - Desktop */}
          <div className="hidden lg:block mt-4">
            <button className="w-full py-3 px-4 bg-destructive/10 text-destructive rounded-[10px] flex items-center justify-center gap-2 hover:bg-destructive/20 transition-colors">
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Family Members & Settings */}
        <div className="px-4 space-y-6 lg:px-0 lg:col-span-2">
          {/* Family Members */}
          <div className="bg-card rounded-[16px] shadow-sm border border-border overflow-hidden">
            <div className="p-5 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="text-base text-foreground">Family Members</h2>
                </div>
                <button className="text-sm text-primary hover:underline">Invite</button>
              </div>
            </div>
            <div className="divide-y divide-border">
              {familyMembers.map((member) => (
                <FamilyMemberRow key={member.id} member={member} />
              ))}
            </div>
          </div>

          {/* Settings Groups */}
          {settingsGroups.map((group) => (
            <div key={group.title} className="bg-card rounded-[16px] shadow-sm border border-border overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h3 className="text-sm text-muted-foreground uppercase tracking-wide">{group.title}</h3>
              </div>
              <div className="divide-y divide-border">
                {group.items.map((item) => (
                  <SettingRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}

          {/* App Info */}
          <div className="bg-muted/30 rounded-[16px] p-4 border border-border text-center">
            <p className="text-xs text-muted-foreground">Loom v1.0.0</p>
            <p className="text-xs text-muted-foreground mt-1">Made with ❤️ for families</p>
          </div>

          {/* Logout Button - Mobile */}
          <div className="lg:hidden pb-4">
            <button className="w-full py-3 px-4 bg-destructive/10 text-destructive rounded-[10px] flex items-center justify-center gap-2">
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FamilyMemberRow({ member }: { member: FamilyMember }) {
  return (
    <button className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
        style={{ backgroundColor: `${member.color}15` }}
      >
        {member.avatar}
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm text-foreground">{member.name}</p>
        <p className="text-xs text-muted-foreground">{member.role}</p>
        {member.email && <p className="text-xs text-muted-foreground">{member.email}</p>}
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground" />
    </button>
  );
}

function SettingRow({ item }: { item: { label: string; icon: any; action: string } }) {
  const Icon = item.icon;

  return (
    <button className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
      <Icon className="w-5 h-5 text-muted-foreground" />
      <span className="flex-1 text-left text-sm text-foreground">{item.label}</span>
      <ChevronRight className="w-5 h-5 text-muted-foreground" />
    </button>
  );
}