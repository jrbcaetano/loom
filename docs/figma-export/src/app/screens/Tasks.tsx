import { useState } from "react";
import { Plus, Filter } from "lucide-react";

interface Task {
  id: string;
  title: string;
  assignedTo: {
    name: string;
    avatar: string;
    color: string;
  };
  dueDate: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
  category?: string;
}

const mockTasks: Task[] = [
  {
    id: "1",
    title: "Pick up dry cleaning",
    assignedTo: { name: "Mike", avatar: "👨", color: "#4F7DF3" },
    dueDate: "Today",
    priority: "high",
    completed: false,
  },
  {
    id: "2",
    title: "Review Emma's homework",
    assignedTo: { name: "Sarah", avatar: "👩", color: "#FF6B9D" },
    dueDate: "Today",
    priority: "high",
    completed: false,
  },
  {
    id: "3",
    title: "Schedule dentist appointment",
    assignedTo: { name: "Sarah", avatar: "👩", color: "#FF6B9D" },
    dueDate: "Tomorrow",
    priority: "medium",
    completed: false,
  },
  {
    id: "4",
    title: "Buy birthday gift for grandma",
    assignedTo: { name: "Mike", avatar: "👨", color: "#4F7DF3" },
    dueDate: "Mar 12",
    priority: "medium",
    completed: false,
  },
  {
    id: "5",
    title: "Water the plants",
    assignedTo: { name: "Emma", avatar: "👧", color: "#FFA94D" },
    dueDate: "Today",
    priority: "low",
    completed: true,
  },
  {
    id: "6",
    title: "Prepare school lunches",
    assignedTo: { name: "Sarah", avatar: "👩", color: "#FF6B9D" },
    dueDate: "Tomorrow",
    priority: "high",
    completed: false,
  },
  {
    id: "7",
    title: "Fix leaky faucet",
    assignedTo: { name: "Mike", avatar: "👨", color: "#4F7DF3" },
    dueDate: "This Week",
    priority: "medium",
    completed: false,
  },
  {
    id: "8",
    title: "Book hotel for vacation",
    assignedTo: { name: "Sarah", avatar: "👩", color: "#FF6B9D" },
    dueDate: "Mar 15",
    priority: "high",
    completed: false,
  },
];

export function Tasks() {
  const [tasks, setTasks] = useState(mockTasks);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  const toggleTask = (id: string) => {
    setTasks(tasks.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)));
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === "active") return !task.completed;
    if (filter === "completed") return task.completed;
    return true;
  });

  const activeTasks = filteredTasks.filter((t) => !t.completed);
  const completedTasks = filteredTasks.filter((t) => t.completed);

  return (
    <div className="max-w-md mx-auto lg:max-w-4xl lg:px-8">
      {/* Header */}
      <div className="px-4 pt-8 pb-6 lg:pt-12">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[28px] text-foreground">Tasks</h1>
          <button className="w-10 h-10 bg-card rounded-[10px] border border-border flex items-center justify-center shadow-sm">
            <Filter className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <FilterButton label="All" count={tasks.length} active={filter === "all"} onClick={() => setFilter("all")} />
          <FilterButton
            label="Active"
            count={tasks.filter((t) => !t.completed).length}
            active={filter === "active"}
            onClick={() => setFilter("active")}
          />
          <FilterButton
            label="Completed"
            count={tasks.filter((t) => t.completed).length}
            active={filter === "completed"}
            onClick={() => setFilter("completed")}
          />
        </div>
      </div>

      {/* Task List */}
      <div className="px-4 space-y-4">
        {/* Active Tasks */}
        {activeTasks.length > 0 && (
          <div>
            {filter === "all" && (
              <h3 className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Active</h3>
            )}
            <div className="bg-card rounded-[16px] shadow-sm border border-border divide-y divide-border">
              {activeTasks.map((task) => (
                <TaskItem key={task.id} task={task} onToggle={toggleTask} />
              ))}
            </div>
          </div>
        )}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div>
            {filter === "all" && (
              <h3 className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Completed</h3>
            )}
            <div className="bg-card rounded-[16px] shadow-sm border border-border divide-y divide-border">
              {completedTasks.map((task) => (
                <TaskItem key={task.id} task={task} onToggle={toggleTask} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredTasks.length === 0 && (
          <div className="bg-card rounded-[16px] shadow-sm border border-border p-12 text-center">
            <p className="text-muted-foreground">No tasks found</p>
          </div>
        )}
      </div>

      {/* Add Task Button - Desktop */}
      <div className="hidden lg:block px-4 mt-6">
        <button className="w-full py-3 bg-primary text-primary-foreground rounded-[10px] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
          <Plus className="w-5 h-5" />
          <span>Add Task</span>
        </button>
      </div>
    </div>
  );
}

function FilterButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-[10px] text-sm transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border"
      }`}
    >
      {label} <span className={active ? "opacity-80" : ""}>{count}</span>
    </button>
  );
}

function TaskItem({ task, onToggle }: { task: Task; onToggle: (id: string) => void }) {
  const priorityColor = {
    high: "#EF4444",
    medium: "#F59E0B",
    low: "#6B7280",
  };

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        className="w-5 h-5 rounded border-2 border-muted-foreground/30 text-primary focus:ring-primary cursor-pointer"
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-[15px] mb-1 ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{task.dueDate}</span>
          <span>•</span>
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: priorityColor[task.priority] }}
            ></div>
            <span className="capitalize">{task.priority}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-2xl">{task.assignedTo.avatar}</div>
      </div>
    </div>
  );
}
