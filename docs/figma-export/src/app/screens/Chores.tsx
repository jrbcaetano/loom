import { Trophy, Star, Gift } from "lucide-react";

interface Chore {
  id: string;
  name: string;
  points: number;
  completed: boolean;
  dueDate?: string;
}

interface Child {
  id: string;
  name: string;
  avatar: string;
  color: string;
  points: number;
  targetPoints: number;
  chores: Chore[];
  rewards: Reward[];
}

interface Reward {
  id: string;
  name: string;
  cost: number;
  unlocked: boolean;
}

const mockChildren: Child[] = [
  {
    id: "1",
    name: "Emma",
    avatar: "👧",
    color: "#FFA94D",
    points: 145,
    targetPoints: 200,
    chores: [
      { id: "1", name: "Clean room", points: 10, completed: false, dueDate: "Today" },
      { id: "2", name: "Complete homework", points: 15, completed: true },
      { id: "3", name: "Practice piano", points: 10, completed: false, dueDate: "Today" },
      { id: "4", name: "Help with dishes", points: 5, completed: false },
    ],
    rewards: [
      { id: "1", name: "Ice cream trip", cost: 50, unlocked: true },
      { id: "2", name: "Movie night pick", cost: 100, unlocked: true },
      { id: "3", name: "Sleepover with friend", cost: 150, unlocked: false },
      { id: "4", name: "New book", cost: 200, unlocked: false },
    ],
  },
  {
    id: "2",
    name: "Jake",
    avatar: "👦",
    color: "#22C55E",
    points: 180,
    targetPoints: 200,
    chores: [
      { id: "5", name: "Feed the dog", points: 5, completed: true },
      { id: "6", name: "Take out trash", points: 5, completed: true },
      { id: "7", name: "Water plants", points: 5, completed: false, dueDate: "Today" },
      { id: "8", name: "Organize toys", points: 10, completed: false },
    ],
    rewards: [
      { id: "5", name: "Extra screen time", cost: 50, unlocked: true },
      { id: "6", name: "Pizza for dinner", cost: 100, unlocked: true },
      { id: "7", name: "Trip to arcade", cost: 150, unlocked: true },
      { id: "8", name: "New video game", cost: 200, unlocked: false },
    ],
  },
];

export function Chores() {
  return (
    <div className="max-w-md mx-auto lg:max-w-6xl lg:px-8">
      {/* Header */}
      <div className="px-4 pt-8 pb-6 lg:pt-12">
        <h1 className="text-[28px] text-foreground mb-2">Chores & Rewards</h1>
        <p className="text-sm text-muted-foreground">Track progress and earn rewards</p>
      </div>

      {/* Desktop Grid */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
        {mockChildren.map((child) => (
          <div key={child.id} className="px-4 mb-6 lg:px-0">
            <ChildChoreCard child={child} />
          </div>
        ))}
      </div>

      {/* Leaderboard - Full Width */}
      <div className="px-4 mt-6 mb-8">
        <div className="bg-card rounded-[16px] p-5 shadow-sm border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-primary" />
            <h2 className="text-base text-foreground">Leaderboard - This Month</h2>
          </div>
          <div className="space-y-3">
            {mockChildren
              .sort((a, b) => b.points - a.points)
              .map((child, index) => (
                <LeaderboardItem key={child.id} child={child} rank={index + 1} />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChildChoreCard({ child }: { child: Child }) {
  const progress = (child.points / child.targetPoints) * 100;
  const completedChores = child.chores.filter((c) => c.completed).length;

  return (
    <div className="bg-card rounded-[16px] shadow-sm border border-border overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border" style={{ backgroundColor: `${child.color}15` }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="text-4xl">{child.avatar}</div>
          <div className="flex-1">
            <h2 className="text-lg text-foreground">{child.name}</h2>
            <p className="text-sm text-muted-foreground">
              {child.points} / {child.targetPoints} points
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-primary mb-1">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm">{child.points}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-background rounded-full h-2.5 overflow-hidden">
          <div
            className="h-2.5 rounded-full transition-all"
            style={{ width: `${progress}%`, backgroundColor: child.color }}
          ></div>
        </div>
      </div>

      {/* Chores */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm text-foreground">Chores</h3>
          <span className="text-xs text-muted-foreground">
            {completedChores} / {child.chores.length} done
          </span>
        </div>
        <div className="space-y-2">
          {child.chores.map((chore) => (
            <ChoreItem key={chore.id} chore={chore} color={child.color} />
          ))}
        </div>
      </div>

      {/* Rewards */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-4 h-4 text-primary" />
          <h3 className="text-sm text-foreground">Rewards</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {child.rewards.map((reward) => (
            <RewardItem key={reward.id} reward={reward} childPoints={child.points} color={child.color} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ChoreItem({ chore, color }: { chore: Chore; color: string }) {
  return (
    <div className="flex items-center gap-3 p-2 bg-muted/20 rounded-lg">
      <input
        type="checkbox"
        checked={chore.completed}
        className="w-4 h-4 rounded border-2 border-muted-foreground/30 text-primary focus:ring-primary cursor-pointer"
        readOnly
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${chore.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {chore.name}
        </p>
        {chore.dueDate && !chore.completed && (
          <p className="text-xs text-muted-foreground">{chore.dueDate}</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Star className="w-3 h-3" style={{ color }} />
        <span className="text-xs" style={{ color }}>
          {chore.points}
        </span>
      </div>
    </div>
  );
}

function RewardItem({ reward, childPoints, color }: { reward: Reward; childPoints: number; color: string }) {
  const canUnlock = childPoints >= reward.cost;

  return (
    <div
      className={`p-3 rounded-lg border text-center transition-all ${
        reward.unlocked
          ? "bg-muted/20 border-muted-foreground/20 opacity-50"
          : canUnlock
          ? "bg-card border-border shadow-sm hover:shadow-md cursor-pointer"
          : "bg-muted/10 border-muted-foreground/10 opacity-60"
      }`}
    >
      <p className="text-xs text-foreground mb-1">{reward.name}</p>
      <div className="flex items-center justify-center gap-1">
        <Star className="w-3 h-3" style={{ color: canUnlock && !reward.unlocked ? color : "#6B7280" }} />
        <span className="text-xs text-muted-foreground">{reward.cost}</span>
      </div>
      {reward.unlocked && <p className="text-xs text-primary mt-1">Claimed</p>}
    </div>
  );
}

function LeaderboardItem({ child, rank }: { child: Child; rank: number }) {
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
      <div className="text-xl w-8 text-center">{rank <= 3 ? medals[rank - 1] : rank}</div>
      <div className="text-2xl">{child.avatar}</div>
      <div className="flex-1">
        <p className="text-sm text-foreground">{child.name}</p>
        <p className="text-xs text-muted-foreground">{child.points} points this month</p>
      </div>
      <div className="flex items-center gap-1">
        <Star className="w-4 h-4 fill-current" style={{ color: child.color }} />
        <span className="text-sm" style={{ color: child.color }}>
          {child.points}
        </span>
      </div>
    </div>
  );
}
