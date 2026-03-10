import { Lock, Users, Plus, Wifi, Home, Phone } from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  icon: string;
  shared: boolean;
  lastUpdated: string;
  updatedBy?: string;
}

const mockNotes: Note[] = [
  {
    id: "1",
    title: "WiFi Password",
    content: "Network: FamilyHome2026\nPassword: SafeHome2026!",
    category: "Home",
    icon: "📶",
    shared: true,
    lastUpdated: "2 days ago",
    updatedBy: "Mike",
  },
  {
    id: "2",
    title: "Emergency Contacts",
    content: "Police: 911\nDoctor: (555) 123-4567\nSchool: (555) 234-5678",
    category: "Important",
    icon: "🚨",
    shared: true,
    lastUpdated: "1 week ago",
    updatedBy: "Sarah",
  },
  {
    id: "3",
    title: "Babysitter Instructions",
    content: "Bedtime: 8:30 PM\nEmergency contacts in fridge\nPizza money in drawer",
    category: "Kids",
    icon: "👶",
    shared: true,
    lastUpdated: "3 days ago",
    updatedBy: "Sarah",
  },
  {
    id: "4",
    title: "House Security Code",
    content: "Front door: 1234\nGarage: 5678",
    category: "Home",
    icon: "🔐",
    shared: false,
    lastUpdated: "1 month ago",
    updatedBy: "Mike",
  },
  {
    id: "5",
    title: "Gift Ideas",
    content: "Emma: New books, art supplies\nJake: Sports equipment, board games",
    category: "Personal",
    icon: "🎁",
    shared: false,
    lastUpdated: "5 days ago",
    updatedBy: "Sarah",
  },
  {
    id: "6",
    title: "Trash & Recycling Schedule",
    content: "Trash: Monday & Thursday\nRecycling: Wednesday\nBulk pickup: 2nd Saturday",
    category: "Home",
    icon: "🗑️",
    shared: true,
    lastUpdated: "2 weeks ago",
    updatedBy: "Mike",
  },
  {
    id: "7",
    title: "School Calendar",
    content: "Spring Break: Mar 15-22\nParent-Teacher: Mar 13\nField Trip: Mar 25",
    category: "Kids",
    icon: "🏫",
    shared: true,
    lastUpdated: "1 week ago",
    updatedBy: "Sarah",
  },
  {
    id: "8",
    title: "Pet Care",
    content: "Feed Max: Morning & Evening\nWalks: 3x daily\nVet: Dr. Smith (555) 345-6789",
    category: "Home",
    icon: "🐕",
    shared: true,
    lastUpdated: "4 days ago",
    updatedBy: "Emma",
  },
];

const quickAccessNotes = [
  { id: "1", title: "WiFi Password", icon: Wifi, color: "#4F7DF3" },
  { id: "2", title: "Emergency Contacts", icon: Phone, color: "#EF4444" },
  { id: "4", title: "Security Code", icon: Lock, color: "#F59E0B" },
  { id: "6", title: "Trash Schedule", icon: Home, color: "#22C55E" },
];

export function Notes() {
  return (
    <div className="max-w-md mx-auto lg:max-w-6xl lg:px-8">
      {/* Header */}
      <div className="px-4 pt-8 pb-6 lg:pt-12">
        <h1 className="text-[28px] text-foreground mb-2">Family Notes</h1>
        <p className="text-sm text-muted-foreground">Shared knowledge & important info</p>
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:gap-6">
        {/* Quick Access - Desktop Sidebar */}
        <div className="hidden lg:block">
          <div className="bg-card rounded-[16px] p-5 shadow-sm border border-border mb-6">
            <h3 className="text-base text-foreground mb-4">Quick Access</h3>
            <div className="space-y-2">
              {quickAccessNotes.map((note) => {
                const Icon = note.icon;
                return (
                  <button
                    key={note.id}
                    className="w-full flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${note.color}15` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: note.color }} />
                    </div>
                    <span className="text-sm text-foreground">{note.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add Note Button - Desktop */}
          <button className="w-full py-3 bg-primary text-primary-foreground rounded-[10px] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            <Plus className="w-5 h-5" />
            <span>Add Note</span>
          </button>
        </div>

        {/* Notes Grid */}
        <div className="px-4 lg:px-0 lg:col-span-2">
          {/* Filter Pills - Mobile */}
          <div className="flex gap-2 mb-4 overflow-x-auto lg:hidden">
            <FilterPill label="All" active={true} />
            <FilterPill label="Shared" active={false} />
            <FilterPill label="Private" active={false} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {mockNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NoteCard({ note }: { note: Note }) {
  return (
    <button className="bg-card rounded-[16px] p-4 shadow-sm border border-border hover:shadow-md transition-all text-left w-full">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{note.icon}</span>
          <div>
            <h3 className="text-sm text-foreground">{note.title}</h3>
            <p className="text-xs text-muted-foreground">{note.category}</p>
          </div>
        </div>
        {note.shared ? (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
            <Users className="w-3 h-3" />
            <span>Shared</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">
            <Lock className="w-3 h-3" />
            <span>Private</span>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-3 mb-3">{note.content}</p>

      <div className="text-xs text-muted-foreground">
        Updated {note.lastUpdated} {note.updatedBy && `by ${note.updatedBy}`}
      </div>
    </button>
  );
}

function FilterPill({ label, active }: { label: string; active: boolean }) {
  return (
    <button
      className={`px-4 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border"
      }`}
    >
      {label}
    </button>
  );
}
