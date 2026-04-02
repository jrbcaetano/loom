import { redirect } from "next/navigation";

type TaskDetailPageProps = {
  params: Promise<{ taskId: string }>;
};

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { taskId } = await params;
  redirect(`/tasks?item=${encodeURIComponent(taskId)}`);
}
