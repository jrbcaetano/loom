"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { CreateEntityModal } from "@/components/patterns/create-entity-modal";
import { CollectionControls, CollectionControlField } from "@/components/patterns/collection-controls";
import { EntityDetailShell } from "@/components/patterns/entity-detail-shell";
import { EntityDrawerEmptyState } from "@/components/patterns/entity-drawer-state";
import { EntityAssigneeBadge, EntityMetadataGrid, EntityMetadataItem, EntitySection, EntitySummaryMeta, EntitySummaryMetaItem } from "@/components/patterns/entity-metadata";
import { RouteStateEntityDetailRegistry, type EntityDetailRegistryEntry, type EntityDetailRegistryEntryProps } from "@/features/entities/entity-detail-registry";
import { InviteMemberForm } from "@/features/families/invite-member-form";
import type { FamilyMember } from "@/features/families/server";
import { useI18n } from "@/lib/i18n/context";
import { useCollectionRouteState } from "@/lib/routing/use-collection-route-state";

type FamilyMembersClientProps = {
  familyId: string;
  members: FamilyMember[];
};

function FamilyMemberDetailPanel({
  itemId,
  close,
  members,
  familyId
}: EntityDetailRegistryEntryProps & { members: FamilyMember[]; familyId: string }) {
  const { t, dateLocale } = useI18n();
  const router = useRouter();
  const member = members.find((entry) => entry.id === itemId) ?? null;
  const [serverError, setServerError] = useState<string | null>(null);
  const removeInviteMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await fetch(`/api/families/invite/${memberId}?familyId=${encodeURIComponent(familyId)}`, {
        method: "DELETE"
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? t("family.removeInviteError", "Failed to remove invite"));
      }
    },
    onSuccess: () => {
      close();
      router.refresh();
    },
    onError: (error) => {
      setServerError(error instanceof Error ? error.message : t("family.removeInviteError", "Failed to remove invite"));
    }
  });

  if (!member) {
    return (
      <EntityDetailShell isOpen title={t("family.memberDetail", "Member")} eyebrow={t("family.membersTitle", "Family Members")} onClose={close}>
        <EntityDrawerEmptyState message={t("family.noMemberSelected", "Member not found.")} />
      </EntityDetailShell>
    );
  }

  const displayName = member.fullName ?? member.email ?? t("family.pendingInvite", "Pending invite");
  const isPendingInvite = member.status === "invited" && !member.userId;

  return (
    <EntityDetailShell
      isOpen
      title={displayName}
      eyebrow={t("family.membersTitle", "Family Members")}
      subtitle={member.email ?? undefined}
      summaryMeta={
        <EntitySummaryMeta>
          <EntitySummaryMetaItem label={t("family.role", "Role")} value={member.role} />
          <EntitySummaryMetaItem label={t("common.status", "Status")} value={member.status} />
          <EntitySummaryMetaItem
            label={t("family.joined", "Joined")}
            value={member.joinedAt ? new Date(member.joinedAt).toLocaleDateString(dateLocale) : t("common.notSet", "Not set")}
          />
        </EntitySummaryMeta>
      }
      onClose={close}
    >
      <EntitySection title={t("common.details", "Details")}>
        <EntityMetadataGrid>
          <EntityMetadataItem label={t("common.name", "Name")} value={displayName} />
          <EntityMetadataItem label={t("auth.email", "Email")} value={member.email ?? member.invitedEmail ?? t("common.notSet", "Not set")} />
          <EntityMetadataItem label={t("family.role", "Role")} value={<EntityAssigneeBadge value={member.role} />} />
          <EntityMetadataItem label={t("common.status", "Status")} value={member.status} />
        </EntityMetadataGrid>
      </EntitySection>

      <EntitySection title={t("family.access", "Access")}>
        <p className="m-0 loom-muted">
          {isPendingInvite
            ? t("family.pendingInviteDetail", "This person has been invited but has not accepted access yet.")
            : t("family.activeMemberDetail", "This member is active in the current family.")}
        </p>
      </EntitySection>

      {isPendingInvite ? (
        <EntitySection title={t("family.manageInvite", "Manage invite")}>
          <button
            type="button"
            className="loom-button-ghost loom-signout-danger"
            disabled={removeInviteMutation.isPending}
            onClick={() => removeInviteMutation.mutate(member.id)}
          >
            {removeInviteMutation.isPending ? t("common.deleting", "Deleting...") : t("common.remove", "Remove")}
          </button>
          {serverError ? <p className="loom-feedback-error mt-3">{serverError}</p> : null}
        </EntitySection>
      ) : null}
    </EntityDetailShell>
  );
}

export function FamilyMembersClient({ familyId, members }: FamilyMembersClientProps) {
  const { t } = useI18n();
  const { routeState, updateRouteState, openItem, clearItem, clearCreate } = useCollectionRouteState();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | FamilyMember["status"]>("all");
  const [roleFilter, setRoleFilter] = useState<"all" | FamilyMember["role"]>("all");

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesQuery = query.trim().length === 0 || `${member.fullName ?? ""} ${member.email ?? member.invitedEmail ?? ""}`.toLowerCase().includes(query.trim().toLowerCase());
      const matchesStatus = statusFilter === "all" || member.status === statusFilter;
      const matchesRole = roleFilter === "all" || member.role === roleFilter;
      return matchesQuery && matchesStatus && matchesRole;
    });
  }, [members, query, roleFilter, statusFilter]);

  const detailRegistry: EntityDetailRegistryEntry[] = [
    {
      key: "family-member",
      Component: (props) => <FamilyMemberDetailPanel {...props} familyId={familyId} members={members} />
    }
  ];

  return (
    <div className="loom-stack">
      <CollectionControls>
          <CollectionControlField>
            <span>{t("common.search", "Search")}</span>
            <input className="loom-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("family.searchMembers", "Search members")} />
          </CollectionControlField>
          <CollectionControlField>
            <span>{t("common.status", "Status")}</span>
            <select className="loom-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="all">{t("tasks.filterAll", "All")}</option>
              <option value="active">{t("family.statusActive", "Active")}</option>
              <option value="invited">{t("family.statusInvited", "Invited")}</option>
              <option value="inactive">{t("family.statusInactive", "Inactive")}</option>
            </select>
          </CollectionControlField>
          <CollectionControlField>
            <span>{t("family.role", "Role")}</span>
            <select className="loom-input" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}>
              <option value="all">{t("tasks.filterAll", "All")}</option>
              <option value="admin">{t("family.roleAdmin", "Admin")}</option>
              <option value="adult">{t("family.roleAdult", "Adult")}</option>
              <option value="child">{t("family.roleChild", "Child")}</option>
            </select>
          </CollectionControlField>
      </CollectionControls>

      <section className="loom-card p-3">
        <div className="loom-stack-sm" role="list" aria-label={t("family.membersSectionTitle", "Members")}>
          {filteredMembers.map((member) => {
            const displayName = member.fullName ?? member.email ?? t("family.pendingInvite", "Pending invite");
            return (
              <article key={member.id} className="loom-conversation-row" role="listitem">
                <div>
                  <button type="button" className="loom-link-button loom-link-strong" aria-label={`${t("family.openMember", "Open member")}: ${displayName}`} onClick={() => openItem(member.id)}>
                    {displayName}
                  </button>
                  <p className="loom-entity-meta">{member.email ?? member.invitedEmail ?? t("common.notSet", "Not set")}</p>
                </div>
                <div className="loom-inline-actions">
                  <span className="loom-badge">{member.role}</span>
                  <span className="loom-home-pill is-muted">{member.status}</span>
                </div>
              </article>
            );
          })}
          {filteredMembers.length === 0 ? <p className="loom-muted p-3">{t("family.noMembersFound", "No family members found.")}</p> : null}
        </div>
      </section>

      <CreateEntityModal
        isOpen={routeState.create === "family-member"}
        title={t("family.inviteTitle", "Invite member")}
        eyebrow={t("family.membersTitle", "Family Members")}
        subtitle={t("family.inviteSubtitle", "Invite by email and assign a family role.")}
        onClose={() => clearCreate()}
      >
        <InviteMemberForm familyId={familyId} onSaved={() => clearCreate()} />
      </CreateEntityModal>

      <RouteStateEntityDetailRegistry routeState={routeState} entries={detailRegistry} close={() => clearItem()} updateRouteState={updateRouteState} />
    </div>
  );
}
