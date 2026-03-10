import { ChevronRight, Plus, BookOpen } from "lucide-react";

interface Meal {
  id: string;
  day: string;
  date: string;
  breakfast?: string;
  lunch?: string;
  dinner: string;
  recipeLink?: boolean;
  preparedBy?: {
    name: string;
    avatar: string;
  };
}

const mockMeals: Meal[] = [
  {
    id: "1",
    day: "Sunday",
    date: "Mar 8",
    breakfast: "Pancakes & Fruit",
    lunch: "Sandwiches",
    dinner: "Spaghetti Carbonara",
    recipeLink: true,
    preparedBy: { name: "Sarah", avatar: "👩" },
  },
  {
    id: "2",
    day: "Monday",
    date: "Mar 9",
    dinner: "Chicken Stir Fry",
    recipeLink: true,
    preparedBy: { name: "Mike", avatar: "👨" },
  },
  {
    id: "3",
    day: "Tuesday",
    date: "Mar 10",
    dinner: "Taco Tuesday",
    recipeLink: false,
    preparedBy: { name: "Sarah", avatar: "👩" },
  },
  {
    id: "4",
    day: "Wednesday",
    date: "Mar 11",
    dinner: "Baked Salmon & Veggies",
    recipeLink: true,
    preparedBy: { name: "Mike", avatar: "👨" },
  },
  {
    id: "5",
    day: "Thursday",
    date: "Mar 12",
    dinner: "Pizza Night",
    recipeLink: false,
  },
  {
    id: "6",
    day: "Friday",
    date: "Mar 13",
    dinner: "Grilled Burgers",
    recipeLink: false,
    preparedBy: { name: "Mike", avatar: "👨" },
  },
  {
    id: "7",
    day: "Saturday",
    date: "Mar 14",
    dinner: "Homemade Lasagna",
    recipeLink: true,
    preparedBy: { name: "Sarah", avatar: "👩" },
  },
];

const recipeSuggestions = [
  { id: "1", name: "Sheet Pan Chicken Fajitas", time: "30 min", difficulty: "Easy" },
  { id: "2", name: "Creamy Tuscan Pasta", time: "25 min", difficulty: "Easy" },
  { id: "3", name: "Teriyaki Salmon Bowl", time: "35 min", difficulty: "Medium" },
];

export function MealPlanner() {
  return (
    <div className="max-w-md mx-auto lg:max-w-6xl lg:px-8">
      {/* Header */}
      <div className="px-4 pt-8 pb-6 lg:pt-12">
        <h1 className="text-[28px] text-foreground mb-2">Meal Planner</h1>
        <p className="text-sm text-muted-foreground">Week of March 8 - March 14</p>
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:gap-6">
        {/* Weekly Meal Plan */}
        <div className="px-4 mb-6 lg:col-span-2 lg:mb-0">
          <div className="space-y-3">
            {mockMeals.map((meal) => (
              <MealCard key={meal.id} meal={meal} />
            ))}
          </div>

          {/* Add Meal Button - Desktop */}
          <div className="hidden lg:block mt-6">
            <button className="w-full py-3 bg-primary text-primary-foreground rounded-[10px] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
              <Plus className="w-5 h-5" />
              <span>Add Meal</span>
            </button>
          </div>
        </div>

        {/* Sidebar - Recipe Suggestions & Shopping */}
        <div className="px-4 space-y-4">
          {/* Recipe Suggestions */}
          <div className="bg-card rounded-[16px] p-5 shadow-sm border border-border">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-primary" />
              <h3 className="text-base text-foreground">Recipe Ideas</h3>
            </div>
            <div className="space-y-3">
              {recipeSuggestions.map((recipe) => (
                <RecipeSuggestion key={recipe.id} recipe={recipe} />
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card rounded-[16px] p-5 shadow-sm border border-border">
            <h3 className="text-base text-foreground mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full py-2.5 px-4 bg-muted/50 rounded-[10px] text-sm text-foreground hover:bg-muted transition-colors text-left">
                Generate Shopping List
              </button>
              <button className="w-full py-2.5 px-4 bg-muted/50 rounded-[10px] text-sm text-foreground hover:bg-muted transition-colors text-left">
                View Saved Recipes
              </button>
              <button className="w-full py-2.5 px-4 bg-muted/50 rounded-[10px] text-sm text-foreground hover:bg-muted transition-colors text-left">
                Dietary Preferences
              </button>
            </div>
          </div>

          {/* Meal Prep Tips */}
          <div className="bg-primary/5 rounded-[16px] p-5 border border-primary/20">
            <p className="text-xs text-primary mb-1">💡 Tip of the Week</p>
            <p className="text-sm text-foreground">
              Prep ingredients on Sunday to save time during the week!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MealCard({ meal }: { meal: Meal }) {
  const isToday = meal.date === "Mar 8";

  return (
    <div
      className={`bg-card rounded-[16px] p-5 shadow-sm border transition-all ${
        isToday ? "border-primary shadow-md" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base text-foreground">{meal.day}</h3>
            {isToday && (
              <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">Today</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{meal.date}</p>
        </div>
        {meal.preparedBy && (
          <div className="text-2xl">{meal.preparedBy.avatar}</div>
        )}
      </div>

      <div className="space-y-2">
        {meal.breakfast && (
          <MealItem label="Breakfast" name={meal.breakfast} />
        )}
        {meal.lunch && (
          <MealItem label="Lunch" name={meal.lunch} />
        )}
        <MealItem label="Dinner" name={meal.dinner} hasRecipe={meal.recipeLink} />
      </div>
    </div>
  );
}

function MealItem({ label, name, hasRecipe }: { label: string; name: string; hasRecipe?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-t border-border first:border-0">
      <div className="flex-1">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm text-foreground">{name}</p>
      </div>
      {hasRecipe && (
        <div className="flex items-center gap-1 text-xs text-primary">
          <BookOpen className="w-3 h-3" />
          <span>Recipe</span>
        </div>
      )}
    </div>
  );
}

function RecipeSuggestion({ recipe }: { recipe: { name: string; time: string; difficulty: string } }) {
  return (
    <button className="w-full flex items-start justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-1 text-left">
        <p className="text-sm text-foreground mb-1">{recipe.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{recipe.time}</span>
          <span>•</span>
          <span>{recipe.difficulty}</span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
    </button>
  );
}
