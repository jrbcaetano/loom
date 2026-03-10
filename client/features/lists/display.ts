export const SYSTEM_SHOPPING_LIST_TITLE = "Shopping List";

export function isSystemShoppingListTitle(title: string) {
  return title.trim().toLowerCase() === SYSTEM_SHOPPING_LIST_TITLE.toLowerCase();
}

export function getDisplayListTitle(
  title: string,
  isSystemShoppingList: boolean,
  translate: (key: string, fallback?: string) => string
) {
  if (isSystemShoppingList || isSystemShoppingListTitle(title)) {
    return translate("home.shoppingList", SYSTEM_SHOPPING_LIST_TITLE);
  }

  return title;
}
