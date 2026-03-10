import { useState } from "react";
import { Plus, Users } from "lucide-react";

interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  category: string;
  completed: boolean;
  addedBy: string;
}

const mockItems: ShoppingItem[] = [
  { id: "1", name: "Milk", quantity: "2 gallons", category: "Dairy", completed: false, addedBy: "Sarah" },
  { id: "2", name: "Bread", quantity: "1 loaf", category: "Bakery", completed: true, addedBy: "Mike" },
  { id: "3", name: "Eggs", quantity: "12", category: "Dairy", completed: false, addedBy: "Sarah" },
  { id: "4", name: "Apples", quantity: "6", category: "Produce", completed: false, addedBy: "Emma" },
  { id: "5", name: "Chicken Breast", quantity: "2 lbs", category: "Meat", completed: false, addedBy: "Sarah" },
  { id: "6", name: "Pasta", quantity: "2 boxes", category: "Pantry", completed: false, addedBy: "Mike" },
  { id: "7", name: "Tomatoes", quantity: "4", category: "Produce", completed: false, addedBy: "Sarah" },
  { id: "8", name: "Yogurt", quantity: "6 cups", category: "Dairy", completed: true, addedBy: "Emma" },
  { id: "9", name: "Cereal", quantity: "2 boxes", category: "Pantry", completed: false, addedBy: "Jake" },
  { id: "10", name: "Orange Juice", quantity: "1 bottle", category: "Beverages", completed: false, addedBy: "Mike" },
];

export function ShoppingLists() {
  const [items, setItems] = useState(mockItems);

  const toggleItem = (id: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)));
  };

  // Group items by category
  const categories = Array.from(new Set(items.map((item) => item.category)));
  const activeItems = items.filter((item) => !item.completed);
  const completedItems = items.filter((item) => item.completed);

  return (
    <div className="max-w-md mx-auto lg:max-w-4xl lg:px-8">
      {/* Header */}
      <div className="px-4 pt-8 pb-6 lg:pt-12">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-[28px] text-foreground">Shopping List</h1>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary text-xs rounded-full">
            <Users className="w-3 h-3" />
            <span>Shared</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {activeItems.length} items remaining • {completedItems.length} completed
        </p>
      </div>

      {/* Shopping Items */}
      <div className="px-4 space-y-6">
        {/* Active Items by Category */}
        {categories.map((category) => {
          const categoryItems = activeItems.filter((item) => item.category === category);
          if (categoryItems.length === 0) return null;

          return (
            <div key={category}>
              <h3 className="text-xs text-muted-foreground uppercase tracking-wide mb-3 px-1">{category}</h3>
              <div className="bg-card rounded-[16px] shadow-sm border border-border divide-y divide-border">
                {categoryItems.map((item) => (
                  <ShoppingItemRow key={item.id} item={item} onToggle={toggleItem} />
                ))}
              </div>
            </div>
          );
        })}

        {/* Completed Items */}
        {completedItems.length > 0 && (
          <div>
            <h3 className="text-xs text-muted-foreground uppercase tracking-wide mb-3 px-1">Completed</h3>
            <div className="bg-card rounded-[16px] shadow-sm border border-border divide-y divide-border">
              {completedItems.map((item) => (
                <ShoppingItemRow key={item.id} item={item} onToggle={toggleItem} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Item Button - Desktop */}
      <div className="hidden lg:block px-4 mt-6">
        <button className="w-full py-3 bg-primary text-primary-foreground rounded-[10px] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
          <Plus className="w-5 h-5" />
          <span>Add Item</span>
        </button>
      </div>

      {/* Summary Card */}
      <div className="px-4 mt-6 mb-8">
        <div className="bg-muted/50 rounded-[16px] p-4 border border-border">
          <h3 className="text-sm text-foreground mb-3">Added by</h3>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-lg">👩</span>
              <span className="text-muted-foreground">Sarah (4)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-lg">👨</span>
              <span className="text-muted-foreground">Mike (3)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-lg">👧</span>
              <span className="text-muted-foreground">Emma (2)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-lg">👦</span>
              <span className="text-muted-foreground">Jake (1)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShoppingItemRow({ item, onToggle }: { item: ShoppingItem; onToggle: (id: string) => void }) {
  return (
    <div className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
      <input
        type="checkbox"
        checked={item.completed}
        onChange={() => onToggle(item.id)}
        className="w-5 h-5 rounded border-2 border-muted-foreground/30 text-primary focus:ring-primary cursor-pointer"
      />
      <div className="flex-1 min-w-0">
        <p className={`text-[15px] ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {item.name}
        </p>
        <p className="text-xs text-muted-foreground">{item.quantity}</p>
      </div>
      <div className="text-xs text-muted-foreground">{item.addedBy}</div>
    </div>
  );
}
