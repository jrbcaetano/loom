import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyMembers } from "@/features/families/server";
import { getSchedulesForFamily, getScheduleTemplates } from "@/features/schedules/server";
import { SchedulesCalendarClient } from "@/features/schedules/schedules-calendar-client";

export default async function SchedulesPage() {
  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    return <p className="loom-muted">Create a family first.</p>;
  }

  const familyId = context.activeFamilyId;
  const [members, schedules, templates] = await Promise.all([
    getFamilyMembers(familyId),
    getSchedulesForFamily(familyId),
    getScheduleTemplates(familyId)
  ]);

  return (
    <div className="loom-module-page">
      <SchedulesCalendarClient
        familyId={familyId}
        templates={templates}
        initialSchedules={schedules}
        familyMembers={members.map((member) => ({
          id: member.id,
          displayName: member.fullName ?? member.email ?? "Member",
          role: member.role
        }))}
      />
    </div>
  );
}
