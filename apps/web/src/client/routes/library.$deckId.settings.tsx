import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { type InviteRefusal, PENDING_INVITATION_LIMIT } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { LeaveDeckDialog } from "../components/leave-deck-dialog";
import {
  CancelInvitationDialog,
  InviteDialog,
  RemoveMemberDialog,
} from "../components/member-dialogs";
import {
  ArchivedSectionsDialog,
  ArchiveSectionDialog,
  SectionNameDialog,
} from "../components/section-dialogs";
import {
  ApiError,
  api,
  errorMessage,
  type Invitation,
  type Member,
  refusalDetail,
  type Section,
} from "../lib/api";
import { useDocumentTitle } from "../lib/document-title";
import {
  archivedSectionsQuery,
  deckCardsQuery,
  decksQuery,
  invitationsQuery,
  joinLinkQuery,
  membersQuery,
  sectionsQuery,
} from "../lib/queries";
import { useArchiveDeck } from "../lib/use-archive-deck";
import { useLeaveDeck } from "../lib/use-leave-deck";
import { useSectionActions } from "../lib/use-sections";
import { writes } from "../lib/writes";
import { type DeckSettingsPatch, DeckSettingsView } from "../views/deck-settings-view";

export const Route = createFileRoute("/library/$deckId/settings")({
  component: DeckSettings,
});

function DeckSettings() {
  const { t } = useLingui();
  const { deckId } = Route.useParams();
  const qc = useQueryClient();
  const decks = useQuery(decksQuery);
  const cards = useQuery(deckCardsQuery(deckId));
  const deck = decks.data?.find((d) => d.id === deckId);
  // The oldest card with a meaning, so the direction rows read the same way twice running.
  const isOwner = deck?.role === "owner";
  const isMember = !!deck && deck.role !== "owner";
  useDocumentTitle(isMember ? t`About this deck` : t`Deck settings`);
  const joinLink = useQuery({ ...joinLinkQuery(deckId), enabled: isOwner });
  const sections = useQuery({ ...sectionsQuery(deckId), enabled: isOwner });
  const sectionActions = useSectionActions(deckId);
  const [naming, setNaming] = useState<{ section?: Section | undefined } | null>(null);
  const [archiving, setArchiving] = useState<Section | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  // Fetched up front, so the way to archived sections shows only when there are some.
  const archived = useQuery({ ...archivedSectionsQuery(deckId), enabled: isOwner });
  const example = cards.data?.filter((c) => c.card.meaning).at(-1)?.card;

  const [saved, setSaved] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const save = useMutation({
    mutationFn: (patch: DeckSettingsPatch) => writes.updateDeck(deckId, patch),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["decks"] }),
        qc.invalidateQueries({ queryKey: ["queue"] }),
        qc.invalidateQueries({ queryKey: ["decks", deckId, "cards"] }),
      ]);
      setSaved(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setSaved(false), 2500);
    },
  });

  const archive = useArchiveDeck(deckId, deck?.name);
  const leave = useLeaveDeck(deckId, deck?.name);
  const [leaving, setLeaving] = useState(false);
  // Asked for whenever the owner is on the screen, so the group is there before anyone joins.
  const members = useQuery({ ...membersQuery(deckId), enabled: isOwner });
  const invitations = useQuery({ ...invitationsQuery(deckId), enabled: isOwner });
  const [removing, setRemoving] = useState<Member | null>(null);
  const [inviting, setInviting] = useState(false);
  const [cancelling, setCancelling] = useState<Invitation | null>(null);

  const invite = useMutation({
    mutationFn: (email: string) => api.invite(deckId, email),
    onSuccess: async () => {
      // The dialog closes only once the invitation lands, so a refusal keeps what was typed.
      setInviting(false);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["decks", deckId, "invitations"] }),
        qc.invalidateQueries({ queryKey: ["activity"] }),
      ]);
    },
  });

  // The server's reason is English and for integrations; the owner reads it in their language.
  const inviteRefusal = (error: unknown): string => {
    switch (refusalDetail(error, "reason") as InviteRefusal | null) {
      case "owner":
        return t`This deck is already yours.`;
      case "member":
        return t`They’re already in this deck.`;
      case "removed":
        return t`You removed them from this deck, so you can’t invite them again.`;
      case "invited":
        return t`They already have a pending invitation.`;
      case "full":
        return plural(PENDING_INVITATION_LIMIT, {
          one: "You already have # pending invitation. Cancel it, or wait for them to join.",
          other: "You already have # pending invitations. Cancel one, or wait for someone to join.",
        });
    }
    if (error instanceof ApiError && error.status === 429) {
      return t`Couldn’t send the invitation. Too many went out recently, so try again later.`;
    }
    return errorMessage(error);
  };

  const cancelInvite = useMutation({
    mutationFn: (invitation: Invitation) => api.cancelInvitation(deckId, invitation.id),
    onSuccess: async () => {
      setCancelling(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["decks", deckId, "invitations"] }),
        qc.invalidateQueries({ queryKey: ["activity"] }),
      ]);
    },
  });

  const remove = useMutation({
    mutationFn: (member: Member) => api.removeMember(deckId, member.userId),
    onSuccess: async () => {
      setRemoving(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["decks", deckId, "members"] }),
        // The Sharing card counts members, and the removal is an Activity row.
        qc.invalidateQueries({ queryKey: ["decks", deckId, "join-link"] }),
        qc.invalidateQueries({ queryKey: ["activity"] }),
      ]);
    },
  });

  const turnOn = useMutation({
    mutationFn: () => api.turnOnJoinLink(deckId),
    onSuccess: (value) => {
      qc.setQueryData(joinLinkQuery(deckId).queryKey, value);
      // Turning the link on is an Activity row.
      void qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
  const turnOff = useMutation({
    mutationFn: () => api.turnOffJoinLink(deckId),
    onSuccess: () => {
      qc.setQueryData(joinLinkQuery(deckId).queryKey, (prev) => ({
        link: null,
        members: prev?.members ?? 0,
      }));
      void qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
  const sharingError = turnOn.isError
    ? t`Couldn’t turn on the join link. Try again.`
    : turnOff.isError
      ? t`Couldn’t turn off the join link. Try again.`
      : joinLink.isError
        ? t`Couldn’t load the join link. Try again.`
        : undefined;

  return (
    <>
      <DeckSettingsView
        deck={deck}
        example={example ? { term: example.term, meaning: example.meaning } : undefined}
        onSave={(patch) => save.mutate(patch)}
        saving={save.isPending}
        saved={saved}
        error={save.isError ? errorMessage(save.error) : undefined}
        onArchive={isOwner ? () => archive.mutate() : undefined}
        onLeave={isMember ? () => setLeaving(true) : undefined}
        sections={
          isOwner
            ? {
                sections: sections.data?.sections ?? [],
                onCreate: () => setNaming({}),
                onRename: (section) => setNaming({ section }),
                onMove: (section, by) => {
                  const ids = (sections.data?.sections ?? []).map((s) => s.id);
                  const from = ids.indexOf(section.id);
                  const to = from + by;
                  if (from < 0 || to < 0 || to >= ids.length) return;
                  ids.splice(from, 1);
                  ids.splice(to, 0, section.id);
                  sectionActions.reorder.mutate(ids);
                },
                onArchive: (section) =>
                  section.total > 0
                    ? setArchiving(section)
                    : sectionActions.archive.mutate({ section, cards: "keep" }),
                onShowArchived: () => setShowArchived(true),
                archivedCount: archived.data?.sections.length ?? 0,
              }
            : undefined
        }
        members={
          isOwner
            ? {
                owner: deck.owner,
                members: members.data,
                invitations: invitations.data,
                onInvite: () => setInviting(true),
                onRemove: setRemoving,
                onCancelInvite: setCancelling,
                cancelling: cancelInvite.isPending ? cancelInvite.variables?.id : undefined,
                removing: remove.isPending ? remove.variables?.userId : undefined,
                error:
                  members.isError || invitations.isError
                    ? t`Couldn’t load the people in this deck. Try again.`
                    : undefined,
              }
            : undefined
        }
        sharing={
          isOwner
            ? {
                deckName: deck.name,
                link: joinLink.data?.link,
                onTurnOn: () => turnOn.mutate(),
                onTurnOff: () => turnOff.mutate(),
                pending: turnOn.isPending ? "on" : turnOff.isPending ? "off" : undefined,
                error: sharingError,
              }
            : undefined
        }
      />
      <InviteDialog
        open={inviting}
        onOpenChange={(open) => {
          if (open) return;
          setInviting(false);
          invite.reset();
        }}
        onInvite={(email) => invite.mutate(email)}
        onChange={() => invite.isError && invite.reset()}
        pending={invite.isPending}
        error={invite.isError ? inviteRefusal(invite.error) : undefined}
      />
      <CancelInvitationDialog
        invitation={cancelling}
        onOpenChange={(open) => {
          if (open) return;
          setCancelling(null);
          cancelInvite.reset();
        }}
        onCancelInvitation={() => cancelling && cancelInvite.mutate(cancelling)}
        pending={cancelInvite.isPending}
        error={cancelInvite.isError ? t`Couldn’t cancel the invitation. Try again.` : undefined}
      />
      <RemoveMemberDialog
        member={removing}
        onOpenChange={(open) => {
          if (open) return;
          setRemoving(null);
          remove.reset();
        }}
        onRemove={() => removing && remove.mutate(removing)}
        pending={remove.isPending}
        error={remove.isError ? t`Couldn’t remove the member. Try again.` : undefined}
      />
      {isMember && deck && (
        <LeaveDeckDialog
          open={leaving}
          onOpenChange={setLeaving}
          deckName={deck.name}
          onLeave={() => leave.mutate()}
          pending={leave.isPending}
        />
      )}
      {isOwner && (
        <>
          <SectionNameDialog
            open={!!naming}
            onOpenChange={(open) => {
              if (open) return;
              setNaming(null);
              sectionActions.create.reset();
              sectionActions.rename.reset();
            }}
            section={naming?.section}
            pending={sectionActions.create.isPending || sectionActions.rename.isPending}
            error={
              sectionActions.create.isError
                ? errorMessage(sectionActions.create.error)
                : sectionActions.rename.isError
                  ? errorMessage(sectionActions.rename.error)
                  : undefined
            }
            onSubmit={async (name) => {
              const renaming = naming?.section;
              if (renaming) await sectionActions.rename.mutateAsync({ id: renaming.id, name });
              else await sectionActions.create.mutateAsync({ name });
              setNaming(null);
            }}
          />
          <ArchiveSectionDialog
            section={archiving}
            onOpenChange={(open) => !open && setArchiving(null)}
            onArchive={(choice) => {
              if (archiving) sectionActions.archive.mutate({ section: archiving, cards: choice });
              setArchiving(null);
            }}
          />
          <ArchivedSectionsDialog
            open={showArchived}
            onOpenChange={setShowArchived}
            sections={archived.data?.sections}
            onRestore={(section) => sectionActions.restore.mutate(section)}
            restoring={
              sectionActions.restore.isPending ? sectionActions.restore.variables?.id : undefined
            }
            error={archived.isError ? errorMessage(archived.error) : undefined}
          />
        </>
      )}
    </>
  );
}
