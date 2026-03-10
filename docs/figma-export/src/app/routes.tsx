import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Home } from "./screens/Home";
import { Tasks } from "./screens/Tasks";
import { ShoppingLists } from "./screens/ShoppingLists";
import { Calendar } from "./screens/Calendar";
import { MealPlanner } from "./screens/MealPlanner";
import { Chores } from "./screens/Chores";
import { Notes } from "./screens/Notes";
import { Profile } from "./screens/Profile";
import { Notifications } from "./screens/Notifications";
import { DesignSystem } from "./screens/DesignSystem";
import { ScreenDirectory } from "./screens/ScreenDirectory";
import { NotFound } from "./screens/NotFound";

// Auth
import { Login } from "./screens/auth/Login";
import { Register } from "./screens/auth/Register";
import { ForgotPassword } from "./screens/auth/ForgotPassword";

// Onboarding
import { Welcome } from "./screens/onboarding/Welcome";
import { CreateFamily } from "./screens/onboarding/CreateFamily";
import { AddMembers } from "./screens/onboarding/AddMembers";

export const router = createBrowserRouter([
  // Auth routes (no layout)
  { path: "/login", Component: Login },
  { path: "/register", Component: Register },
  { path: "/forgot-password", Component: ForgotPassword },
  
  // Onboarding routes (no layout)
  { path: "/onboarding/welcome", Component: Welcome },
  { path: "/onboarding/create-family", Component: CreateFamily },
  { path: "/onboarding/add-members", Component: AddMembers },
  
  // Main app routes (with layout)
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "tasks", Component: Tasks },
      { path: "lists", Component: ShoppingLists },
      { path: "calendar", Component: Calendar },
      { path: "meals", Component: MealPlanner },
      { path: "chores", Component: Chores },
      { path: "notes", Component: Notes },
      { path: "profile", Component: Profile },
      { path: "notifications", Component: Notifications },
      { path: "design-system", Component: DesignSystem },
      { path: "screen-directory", Component: ScreenDirectory },
      { path: "*", Component: NotFound },
    ],
  },
]);