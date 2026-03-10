export type ReferenceValue = {
  value: string;
  translations?: Record<string, string>;
};

export const SHOPPING_LIST_CATEGORY_DEFAULTS: ReferenceValue[] = [
  { value: "Produce", translations: { pt: "Frutas e vegetais" } },
  { value: "Dairy", translations: { pt: "Laticinios" } },
  { value: "Meat", translations: { pt: "Carne" } },
  { value: "Bakery", translations: { pt: "Padaria" } },
  { value: "Household", translations: { pt: "Casa" } },
  { value: "Pantry", translations: { pt: "Despensa" } }
];
