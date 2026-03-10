import { Calendar, CheckSquare, ShoppingCart, ChevronRight } from "lucide-react";
import { Link } from "react-router";

interface FamilyMember {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

const familyMembers: FamilyMember[] = [
  { id: "1", name: "Sarah", avatar: "👩", color: "#FF6B9D" },
  { id: "2", name: "Mike", avatar: "👨", color: "#4F7DF3" },
  { id: "3", name: "Emma", avatar: "👧", color: "#FFA94D" },
  { id: "4", name: "Jake", avatar: "👦", color: "#22C55E" },
];

export function Home() {
  return (
    <div className="max-w-md mx-auto lg:max-w-6xl lg:px-8">
      {/* Header */}
      <div className="px-4 pt-8 pb-6 lg:pt-12">
        <p className="text-sm text-muted-foreground mb-1">Sunday, March 8</p>
        <h1 className="text-[28px] text-foreground">Good morning, Sarah 👋</h1>
      </div>

      {/* Desktop Grid Layout */}
      <div className="lg:grid lg:grid-cols-3 lg:gap-6">
        {/* Today's Events Card */}
        <div className="mb-4 mx-4 lg:mx-0 lg:mb-0 lg:col-span-2">
          <div className="bg-card rounded-[16px] p-5 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h2 className="text-base text-foreground">Today's Events</h2>
              </div>
              <Link to="/calendar" className="text-sm text-primary">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              <EventItem
                time="9:00 AM"
                title="Family Breakfast"
                member={familyMembers[0]}
              />
              <EventItem
                time="2:00 PM"
                title="Emma's Soccer Practice"
                member={familyMembers[2]}
              />
              <EventItem
                time="6:30 PM"
                title="Dinner with Grandparents"
                member={familyMembers[1]}
              />
            </div>
          </div>
        </div>

        {/* Quick Stats - Desktop Only */}
        <div className="hidden lg:block">
          <div className="bg-card rounded-[16px] p-5 shadow-sm border border-border">
            <h3 className="text-base text-foreground mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <StatItem label="Tasks Due Today" value="5" color="#4F7DF3" />
              <StatItem label="Pending Chores" value="3" color="#FFA94D" />
              <StatItem label="Shopping Items" value="12" color="#22C55E" />
            </div>
          </div>
        </div>

        {/* Tasks Preview */}
        <div className="mb-4 mx-4 lg:mx-0 lg:mb-0">
          <div className="bg-card rounded-[16px] p-5 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-primary" />
                <h2 className="text-base text-foreground">Tasks</h2>
              </div>
              <Link to="/tasks" className="text-sm text-primary">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              <TaskItem
                title="Pick up dry cleaning"
                member={familyMembers[1]}
                dueDate="Today"
                completed={false}
              />
              <TaskItem
                title="Review Emma's homework"
                member={familyMembers[0]}
                dueDate="Today"
                completed={false}
              />
              <TaskItem
                title="Schedule dentist appointment"
                member={familyMembers[0]}
                dueDate="Tomorrow"
                completed={false}
              />
            </div>
          </div>
        </div>

        {/* Shopping List Preview */}
        <div className="mb-4 mx-4 lg:mx-0 lg:mb-0">
          <div className="bg-card rounded-[16px] p-5 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <h2 className="text-base text-foreground">Shopping List</h2>
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                  Shared
                </span>
              </div>
              <Link to="/lists" className="text-sm text-primary">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              <ShoppingItem item="Milk" quantity="2" completed={false} />
              <ShoppingItem item="Bread" quantity="1" completed={true} />
              <ShoppingItem item="Eggs" quantity="12" completed={false} />
              <ShoppingItem item="Apples" quantity="6" completed={false} />
            </div>
          </div>
        </div>

        {/* Meal Plan Preview */}
        <div className="mb-4 mx-4 lg:mx-0 lg:mb-0">
          <div className="bg-card rounded-[16px] p-5 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🍽️</span>
                <h2 className="text-base text-foreground">This Week's Meals</h2>
              </div>
              <Link to="/meals" className="text-sm text-primary">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              <MealItem day="Today" meal="Spaghetti Carbonara" type="Dinner" />
              <MealItem day="Monday" meal="Chicken Stir Fry" type="Dinner" />
              <MealItem day="Tuesday" meal="Taco Tuesday" type="Dinner" />
            </div>
          </div>
        </div>

        {/* Chores & Rewards - Full Width on Desktop */}
        <div className="mb-4 mx-4 lg:mx-0 lg:mb-0 lg:col-span-3">
          <div className="bg-card rounded-[16px] p-5 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">⭐</span>
                <h2 className="text-base text-foreground">Chores & Rewards</h2>
              </div>
              <Link to="/chores" className="text-sm text-primary">
                View all
              </Link>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChoreCard
                member={familyMembers[2]}
                chores={["Clean room", "Homework"]}
                points={45}
                totalPoints={100}
              />
              <ChoreCard
                member={familyMembers[3]}
                chores={["Feed dog", "Take out trash"]}
                points={60}
                totalPoints={100}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventItem({ time, title, member }: { time: string; title: string; member: FamilyMember }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
      <div className="text-xs text-muted-foreground w-16">{time}</div>
      <div className="flex-1">
        <p className="text-sm text-foreground">{title}</p>
      </div>
      <div className="text-xl">{member.avatar}</div>
    </div>
  );
}

function TaskItem({
  title,
  member,
  dueDate,
  completed,
}: {
  title: string;
  member: FamilyMember;
  dueDate: string;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={completed}
        className="w-5 h-5 rounded border-2 border-muted-foreground/30 text-primary focus:ring-primary"
        readOnly
      />
      <div className="flex-1">
        <p className={`text-sm ${completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground">{dueDate}</p>
      </div>
      <div className="text-lg">{member.avatar}</div>
    </div>
  );
}

function ShoppingItem({ item, quantity, completed }: { item: string; quantity: string; completed: boolean }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <input
        type="checkbox"
        checked={completed}
        className="w-4 h-4 rounded border-2 border-muted-foreground/30 text-primary focus:ring-primary"
        readOnly
      />
      <p className={`flex-1 text-sm ${completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
        {item}
      </p>
      <span className="text-xs text-muted-foreground">{quantity}</span>
    </div>
  );
}

function MealItem({ day, meal, type }: { day: string; meal: string; type: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-xs text-muted-foreground w-16 pt-1">{day}</div>
      <div className="flex-1">
        <p className="text-sm text-foreground">{meal}</p>
        <p className="text-xs text-muted-foreground">{type}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground mt-1" />
    </div>
  );
}

function ChoreCard({
  member,
  chores,
  points,
  totalPoints,
}: {
  member: FamilyMember;
  chores: string[];
  points: number;
  totalPoints: number;
}) {
  return (
    <div className="p-4 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-2xl">{member.avatar}</div>
        <div className="flex-1">
          <p className="text-sm text-foreground">{member.name}</p>
          <p className="text-xs text-muted-foreground">
            {points}/{totalPoints} points
          </p>
        </div>
      </div>
      <div className="w-full bg-muted rounded-full h-2 mb-2">
        <div
          className="bg-primary h-2 rounded-full"
          style={{ width: `${(points / totalPoints) * 100}%` }}
        ></div>
      </div>
      <div className="text-xs text-muted-foreground">
        {chores.map((chore, i) => (
          <span key={i}>
            {chore}
            {i < chores.length - 1 ? ", " : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-lg" style={{ color }}>
        {value}
      </span>
    </div>
  );
}
