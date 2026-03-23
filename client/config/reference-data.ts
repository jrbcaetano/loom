export type ReferenceValue = {
  value: string;
  translations?: Record<string, string>;
};

export const SHOPPING_LIST_CATEGORY_DEFAULTS: ReferenceValue[] = [
  { value: "Produce", translations: { pt: "Frutas e vegetais" } },
  { value: "Dairy", translations: { pt: "Laticinios" } },
  { value: "Meat", translations: { pt: "Carne" } },
  { value: "Seafood", translations: { pt: "Peixaria" } },
  { value: "Bakery", translations: { pt: "Padaria" } },
  { value: "Breakfast", translations: { pt: "Pequeno almoco" } },
  { value: "Frozen", translations: { pt: "Congelados" } },
  { value: "Ready Meals", translations: { pt: "Take away" } },
  { value: "Pantry - Savory", translations: { pt: "Mercearia - Salgada" } },
  { value: "Pantry - Sweet", translations: { pt: "Mercearia - Doce" } },
  { value: "Household - Cleaning", translations: { pt: "Casa - Limpeza" } },
  { value: "Household - Hygiene", translations: { pt: "Casa - Higiene" } },
  { value: "Pet Care", translations: { pt: "Pets" } }
];
