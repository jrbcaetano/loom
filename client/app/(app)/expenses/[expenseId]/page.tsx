import { redirect } from "next/navigation";

type ExpenseDetailPageProps = {
  params: Promise<{ expenseId: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function ExpenseDetailPage({ params, searchParams }: ExpenseDetailPageProps) {
  const { expenseId } = await params;
  const query = await searchParams;
  const panel = query.edit === "1" ? "&panel=edit" : "";
  redirect(`/expenses?item=${encodeURIComponent(expenseId)}${panel}`);
}

