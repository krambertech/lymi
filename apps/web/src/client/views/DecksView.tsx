import { type FormEvent, useState } from "react";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Input } from "../components/Field";
import { Skeleton } from "../components/Skeleton";
import type { DeckSummary } from "../lib/api";
import { DeckRow, Page, PageHeader, type StaticNav } from "./Shell";

export interface DecksProps {
  decks: DeckSummary[] | undefined;
  onCreate?: ((name: string) => Promise<unknown> | undefined) | undefined;
  creating?: boolean | undefined;
  static?: StaticNav;
}

export function DecksView({ decks, onCreate, creating, static: st }: DecksProps) {
  const [name, setName] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !onCreate) return;
    await onCreate(name.trim());
    setName("");
  };
  return (
    <Page>
      <PageHeader title="Decks" />
      <form className="mb-5 flex gap-2" onSubmit={submit}>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New deck, e.g. Lesson 14"
          aria-label="New deck name"
          className="flex-1"
        />
        <Button variant="primary" type="submit" disabled={!name.trim()} loading={creating}>
          Create
        </Button>
      </form>

      {decks === undefined && (
        <div className="grid gap-2">
          <Skeleton className="h-[58px] rounded-lg" />
          <Skeleton className="h-[58px] rounded-lg" />
        </div>
      )}
      {decks && decks.length === 0 && (
        <EmptyState
          lantern="none"
          title="No decks yet"
          body="One per lesson works well, or one per topic. You can move cards later."
          className="py-6"
        />
      )}
      {decks && decks.length > 0 && (
        <ul className="grid gap-2">
          {decks.map((d) => (
            <li key={d.id}>
              <DeckRow
                name={d.name}
                language={d.defaultLanguage}
                due={d.due}
                total={d.total}
                href={`/decks/${d.id}`}
                st={st}
              />
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
