import { Trans, useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { EDITABLE_FIELDS, type EditableField, type ViewCard } from "../../shared/mcp-app";
import { Button } from "../components/button";
import { InlineError } from "../components/inline-error";
import { Field, FieldError, FieldLabel } from "../components/ui/field";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { useHost } from "./host";

type Draft = Record<EditableField, string>;

const draftOf = (card: ViewCard): Draft => ({
  term: card.term,
  meaning: card.meaning ?? "",
  example: card.example ?? "",
  pronunciation: card.pronunciation ?? "",
  hook: card.hook ?? "",
});

/** Only the fields the learner changed, so a save never rewrites text they left alone. */
function patchOf(base: Draft, draft: Draft): Partial<Draft> {
  const patch: Partial<Draft> = {};
  for (const field of EDITABLE_FIELDS) {
    if (draft[field].trim() !== base[field].trim()) patch[field] = draft[field].trim();
  }
  return patch;
}

interface Props {
  card: ViewCard;
  onSaved: (card: ViewCard) => void;
  onCancel: () => void;
}

/**
 * The five fields a card's text lives in, edited in place. Everything else a card holds
 * (picture, tags, review modes, section) opens in Lymi. A save first re-reads the card, and
 * when someone changed a field the learner also changed, keeps the draft and asks.
 */
export function CardEditor({ card, onSaved, onCancel }: Props) {
  const { t } = useLingui();
  const host = useHost();
  const [base, setBase] = useState(() => draftOf(card));
  const [draft, setDraft] = useState(base);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termError, setTermError] = useState<string | null>(null);
  const [changed, setChanged] = useState<ViewCard | null>(null);

  const labels: Record<EditableField, string> = {
    term: t`Term`,
    meaning: t`Meaning`,
    example: t`Example`,
    pronunciation: t`Pronunciation`,
    hook: t`Hook`,
  };

  const save = async (force: boolean) => {
    const patch = patchOf(base, draft);
    if (Object.keys(patch).length === 0) return onCancel();
    if (patch.term === "") {
      setTermError(t`A card needs a term.`);
      return;
    }
    setSaving(true);
    setError(null);
    if (!force) {
      const fresh = await host.call<ViewCard>("get_card", { cardId: card.id });
      if (fresh.ok) {
        const now = draftOf(fresh.data);
        const clash = (Object.keys(patch) as EditableField[]).some(
          (field) => now[field].trim() !== base[field].trim(),
        );
        if (clash) {
          setChanged(fresh.data);
          setSaving(false);
          return;
        }
      }
    }
    const saved = await host.call<ViewCard>("update_card", { cardId: card.id, ...patch });
    setSaving(false);
    if (!saved.ok) {
      setError(saved.message || t`Couldn’t save the card. Your changes are still here.`);
      return;
    }
    onSaved(saved.data);
  };

  const takeTheirs = () => {
    if (!changed) return;
    const fresh = draftOf(changed);
    setBase(fresh);
    setDraft(fresh);
    setChanged(null);
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save(changed !== null);
      }}
    >
      {EDITABLE_FIELDS.map((field) => {
        const long = field === "meaning" || field === "example";
        const Control = long ? Textarea : Input;
        return (
          <Field key={field}>
            <FieldLabel>{labels[field]}</FieldLabel>
            <Control
              value={draft[field]}
              autoComplete="off"
              spellCheck={field === "meaning"}
              onChange={(e: { target: { value: string } }) => {
                setDraft((d) => ({ ...d, [field]: e.target.value }));
                if (field === "term") setTermError(null);
              }}
            />
            {field === "term" && <FieldError>{termError}</FieldError>}
          </Field>
        );
      })}

      {changed && (
        <div role="alert" className="flex flex-col gap-3 rounded-lg bg-plate-2 p-3 text-sm">
          <p className="text-text">
            <Trans>This card changed while you were editing it.</Trans>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" variant="primary" loading={saving}>
              <Trans>Save mine</Trans>
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={takeTheirs}>
              <Trans>Use the new version</Trans>
            </Button>
          </div>
        </div>
      )}

      <div aria-live="polite" className="empty:hidden">
        {error && <InlineError className="text-sm">{error}</InlineError>}
      </div>

      {!changed && (
        <div className="flex gap-2">
          <Button type="submit" size="sm" variant="primary" loading={saving}>
            <Trans>Save</Trans>
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            <Trans>Cancel</Trans>
          </Button>
        </div>
      )}
    </form>
  );
}
