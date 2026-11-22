import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { LessonAccessOut } from "@lymi/core";
import { AI_CONSENT_REQUIRED, isolate } from "@lymi/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import {
  Camera,
  Check,
  ChevronRight,
  FileText,
  Hourglass,
  Images,
  Link2,
  Newspaper,
  Type,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useMemo, useReducer, useRef, useState } from "react";
import {
  api,
  type DeckSummary,
  errorMessage,
  type LessonQuestion,
  type LessonTerm,
  type LinkReadRefusal,
  linkReadRefusal,
  refusalCode,
} from "../lib/api";
import { refreshAfterCardWrite } from "../lib/card-writes";
import { useDesktop } from "../lib/device";
import { smartAddFlow } from "../lib/smart-add-flow";
import { Button, IconButton } from "./button";
import { Chip } from "./chip";
import { InfoTip } from "./info-tip";
import { InlineError } from "./inline-error";
import { PlaceBar } from "./layout/place-bar";
import { Notice } from "./notice";
import { RadioCard } from "./radio-card";
import { RollingCount, type ScanPage, ScanStage } from "./smart-add-scan";
import { Checkbox } from "./ui/checkbox";
import { Dialog, DialogBody, DialogContent, usePlaceShape } from "./ui/dialog";
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "./ui/field";
import { Input } from "./ui/input";
import { RadioGroup } from "./ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { toast } from "./ui/toast";

interface Page {
  id: string;
  file: File;
  kind: "photo" | "pdf";
  /** An object URL for a photo, shown while it is read. */
  url: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The deck it opened for, or none from the app-wide add menu. */
  deckId: string | undefined;
  /** The learner's own decks, the only ones Smart add writes to. */
  decks: DeckSummary[];
}

const MAX_FILES = 10;
/** Wider pages cost more to read and read no better; the server shrinks again to the same size. */
const PAGE_SIDE = 1536;
/** About how long a page takes, so the scan moves on while the one request runs. */
const SECONDS_A_PAGE = 6;
const EASE = [0.23, 1, 0.32, 1] as const;

/**
 * Smart add: lesson material in, the pages scanned while words stream in, a pick list out. Centred
 * over the page on a desktop and the whole screen on a phone, like the streak.
 */
export function SmartAddDialog({ open, onOpenChange, deckId, decks }: Props) {
  const titleId = useId();
  return (
    <Dialog kind="place" open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // One height for every step, so the window never jumps as the wizard moves on.
        className="h-[min(85dvh,620px)] w-[min(92vw,520px)]"
        scroll="body"
        aria-labelledby={titleId}
      >
        {open && (
          <SmartAdd
            titleId={titleId}
            fixedDeck={deckId}
            decks={decks}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

const LAST_DECK = "lymi:smart-add-deck";
const LESSON_ACCESS = ["lesson-reads", "access"];
type Daily = NonNullable<LessonAccessOut["daily"]>;
type LongRead = Extract<LinkReadRefusal, { kind: "long_read" }>;

function shownLink(link: string): string {
  return link.replace(/^https:\/\//i, "").replace(/^www\./i, "");
}

/** The deck Smart add last wrote to on this device, while it is still the learner's. */
function lastDeck(decks: DeckSummary[]): string | undefined {
  try {
    const id = localStorage.getItem(LAST_DECK);
    return decks.some((d) => d.id === id) ? (id ?? undefined) : undefined;
  } catch {
    return undefined;
  }
}

function SmartAdd({
  titleId,
  fixedDeck,
  decks,
  onClose,
}: {
  titleId: string;
  /** The deck Smart add was opened from; with none, Lymi chooses one from the lesson. */
  fixedDeck: string | undefined;
  decks: DeckSummary[];
  onClose: () => void;
}) {
  const { t } = useLingui();
  const [flow, dispatch] = useReducer(smartAddFlow, { step: "input" });
  const step = flow.step;
  // Each read is an attempt; its late answers carry the number and land only while it is current.
  const attempts = useRef(0);
  const [pages, setPages] = useState<Page[]>([]);
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [source, setSource] = useState<{ title: string; url: string } | null>(null);
  const [refusal, setRefusal] = useState<LinkReadRefusal | null>(null);
  const longRead = refusal?.kind === "long_read" ? refusal : null;
  const offerTranscript = refusal?.kind === "refused" && refusal.refused === "youtube";
  const [deckId, setDeckId] = useState(fixedDeck);
  const qc = useQueryClient();
  const deck = decks.find((d) => d.id === deckId);
  const titleInBar = usePlaceShape() !== "screen";
  const [error, setError] = useState<string>();
  const [terms, setTerms] = useState<LessonTerm[]>([]);
  const [questions, setQuestions] = useState<LessonQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  /** The learner's own answer per question, used when its option is chosen. */
  const [ownAnswers, setOwnAnswers] = useState<string[]>([]);
  const stop = useRef<AbortController | null>(null);
  // Read fresh each time Smart add opens: another tab or the phone may have read since.
  const access = useQuery({
    queryKey: LESSON_ACCESS,
    queryFn: api.lessonAccess,
    refetchOnMount: "always",
  });
  const daily = access.data?.daily ?? null;
  const atLimit = daily !== null && daily.used >= daily.limit;

  useEffect(() => () => stop.current?.abort(), []);

  // A photo's preview URL is freed once it leaves the list or Smart add closes.
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const current = new Set(pages.flatMap((page) => (page.url ? [page.url] : [])));
    for (const url of previews.current) if (!current.has(url)) URL.revokeObjectURL(url);
    previews.current = current;
  }, [pages]);
  useEffect(
    () => () => {
      for (const url of previews.current) URL.revokeObjectURL(url);
    },
    [],
  );

  const linkMessage = (refusal: LinkReadRefusal): string => {
    switch (refusal.kind) {
      case "refused":
        if (refusal.refused === "youtube") {
          return refusal.title
            ? t`YouTube doesn’t let apps read the captions of “${refusal.title}”. Paste its transcript instead.`
            : t`YouTube doesn’t let apps read its captions. Paste the video’s transcript instead.`;
        }
        if (refusal.refused === "drm") {
          const service = refusal.service ?? t`This service`;
          return t`${service} doesn’t let apps read what it plays. Paste the text instead.`;
        }
        return t`This site doesn’t allow apps to read it. Paste the text instead.`;
      case "invalid":
        return t`Paste a link to a public web page. It starts with https://.`;
      case "too_long":
        return t`This article is too long for Smart add. Paste the part you want to learn from.`;
      case "unreadable":
      case "long_read":
        return t`Smart add couldn’t read this page. Paste its text instead.`;
    }
  };

  const start = async (reads?: number) => {
    if (decks.length === 0) {
      setError(t`Create a deck first, then add a lesson to it.`);
      return;
    }
    const article = link.trim();
    if (!text.trim() && pages.length === 0 && !article) {
      setError(t`Add a photo or PDF of the lesson, paste its text or a link.`);
      return;
    }
    if (article && !/^https:\/\//i.test(article)) {
      setError(t`Paste a link to a public web page. It starts with https://.`);
      return;
    }
    if (atLimit) return;
    setError(undefined);
    setRefusal(null);
    setSource(null);
    setTerms([]);
    setQuestions([]);
    const attempt = ++attempts.current;
    dispatch({ type: "read", attempt });
    const controller = new AbortController();
    stop.current = controller;
    const form = new FormData();
    if (article) form.set("link", article);
    else if (text.trim()) form.set("text", text.trim());
    if (reads) form.set("reads", String(reads));
    if (fixedDeck) form.set("deckId", fixedDeck);
    const hint = lastDeck(decks);
    if (hint) form.set("hint", hint);
    if (!article)
      for (const page of pages)
        form.append("file", page.kind === "photo" ? await shrink(page.file) : page.file);
    let asked: LessonQuestion[] = [];
    try {
      await api.readLesson(
        form,
        (event) => {
          if (event.type === "deck") setDeckId(event.deckId);
          if (event.type === "source") setSource({ title: event.title, url: event.url });
          if (event.type === "term") setTerms((all) => [...all, event.term]);
          if (event.type === "questions") {
            asked = event.questions;
            setQuestions(event.questions);
            setAnswers(event.questions.map((q) => q.default));
            setOwnAnswers(event.questions.map(() => ""));
          }
        },
        controller.signal,
      );
      dispatch({ type: "finish", attempt });
      void qc.invalidateQueries({ queryKey: LESSON_ACCESS });
      // A beat on the finished scan, so the last words land before the screen moves on.
      setTimeout(() => dispatch({ type: "advance", attempt, asked: asked.length > 0 }), 700);
    } catch (failure) {
      if (controller.signal.aborted) return;
      dispatch({ type: "fail", attempt });
      void qc.invalidateQueries({ queryKey: LESSON_ACCESS });
      const declined = linkReadRefusal(failure);
      setRefusal(declined);
      if (declined?.kind === "long_read") return;
      // The footer says the limit is reached; an error line under it would only repeat it.
      const code = refusalCode(failure);
      setError(
        declined
          ? linkMessage(declined)
          : code === "daily_limit"
            ? undefined
            : code === AI_CONSENT_REQUIRED
              ? t`AI services are off for your account. Turn them on in Settings to read lessons.`
              : errorMessage(failure),
      );
    }
  };

  const dropped = useMemo(() => {
    const out = new Set<string>();
    questions.forEach((q, i) => {
      for (const id of q.options[answers[i] ?? q.default]?.drop ?? []) out.add(id);
    });
    if (flow.step === "list") for (const id of flow.ownDrops) out.add(id);
    return out;
  }, [questions, answers, flow]);

  /** Each question answered in the learner's own words is checked against the list. */
  const applyOwnAnswers = async (): Promise<Set<string>> => {
    const candidates = terms
      .filter((term) => !term.existing)
      .map((term) => ({ id: term.id, term: term.term, gloss: term.gloss }));
    const asked = questions.flatMap((q, i) =>
      answers[i] === OWN_ANSWER && ownAnswers[i]?.trim()
        ? [{ question: q.question, answer: ownAnswers[i].trim() }]
        : [],
    );
    if (asked.length === 0 || candidates.length === 0) return new Set();
    const results = await Promise.all(
      asked.map((a) => api.answerLesson({ ...a, terms: candidates.slice(0, 200) })),
    );
    return new Set(results.flatMap((r) => r.drop));
  };

  const add = async (chosen: LessonTerm[]) => {
    if (!deckId) return;
    try {
      localStorage.setItem(LAST_DECK, deckId);
    } catch {
      // Private browsing: the next guess goes without a tie-breaker.
    }
    const { results } = await api.addCards(
      {
        cards: chosen.map((term) => ({
          deckId,
          term: term.term,
          ...(term.meaning ? { meaning: term.meaning, meaningSource: "lesson" as const } : {}),
          ...(term.pronunciation
            ? { pronunciation: term.pronunciation, pronunciationSource: "lesson" as const }
            : {}),
          ...(term.example ? { example: term.example, exampleSource: "lesson" as const } : {}),
          ...(source ? { source: source.url } : term.heading ? { source: term.heading } : {}),
        })),
      },
      "lesson",
    );
    refreshAfterCardWrite(qc);
    const added = results.filter((r) => r.status === "added").length;
    toast.add({
      id: "smart-added",
      title: source
        ? t`${plural(added, { one: "Added # card", other: "Added # cards" })} to ${isolate(deck?.name ?? "")}. Lymi is filling in the rest.`
        : t`${plural(added, { one: "Added # card", other: "Added # cards" })} to ${isolate(deck?.name ?? "")}. Lymi is writing their examples.`,
    });
    onClose();
  };

  const title = (
    <h2 id={titleId} className="flex items-center gap-2 text-lg font-medium text-ink">
      <Trans>Smart add</Trans>
      <Chip size="sm">
        <Trans>Beta</Trans>
      </Chip>
    </h2>
  );

  return (
    <div className={cn("flex min-w-0 flex-col", titleInBar ? "h-full min-h-0" : "gap-5 pb-24")}>
      <div className={titleInBar ? "px-5 pt-4 pb-3" : undefined}>
        <PlaceBar returnsTo={t`Back`} title={titleInBar ? title : undefined} onClose={onClose} />
      </div>
      {!titleInBar && <div className="-mt-2 text-2xl font-medium text-ink">{title}</div>}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE } }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          className="flex min-h-0 flex-1 flex-col"
        >
          {step === "input" && (
            <InputStep
              pages={pages}
              onPagesChange={(next) => {
                setPages(next);
                setError(undefined);
              }}
              text={text}
              onTextChange={(value) => {
                setText(value);
                setError(undefined);
              }}
              link={link}
              onLinkChange={(value) => {
                setLink(value);
                setError(undefined);
                setRefusal(null);
              }}
              offerTranscript={offerTranscript}
              onPasteTranscript={() => {
                setLink("");
                setError(undefined);
                setRefusal(null);
              }}
              longRead={longRead}
              error={error}
              onRead={() => start(longRead?.reads)}
              daily={daily}
            />
          )}
          {step === "reading" && (
            <ReadingStep
              pages={
                link
                  ? []
                  : pages.map((page) => ({ id: page.id, url: page.url, name: page.file.name }))
              }
              text={link ? (source?.title ?? shownLink(link)) : text}
              article={!!link}
              found={terms.filter((term) => !term.existing).length}
              finished={flow.step === "reading" && flow.finished}
              onStop={() => {
                stop.current?.abort();
                dispatch({ type: "stop" });
              }}
            />
          )}
          {step === "questions" && (
            <QuestionsStep
              questions={questions}
              answers={answers}
              ownAnswers={ownAnswers}
              onAnswer={(index, value) =>
                setAnswers((all) => all.map((a, i) => (i === index ? value : a)))
              }
              onOwnAnswer={(index, value) =>
                setOwnAnswers((all) => all.map((a, i) => (i === index ? value : a)))
              }
              onBack={() => dispatch({ type: "back" })}
              onNext={async () => {
                if (flow.step !== "questions") return;
                const { attempt } = flow;
                dispatch({ type: "checked", attempt, ownDrops: await applyOwnAnswers() });
              }}
            />
          )}
          {step === "list" && (
            <ListStep
              decks={decks}
              deckId={deckId}
              onDeckChange={setDeckId}
              terms={terms}
              dropped={dropped}
              article={!!source}
              onBack={() => dispatch({ type: "back" })}
              onAdd={add}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** A photo shrunk and turned upright on the device, so the upload is small and carries no location. */
async function shrink(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, PAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    return blob ? new File([blob], "page.jpg", { type: "image/jpeg" }) : file;
  } catch {
    // A format the browser cannot draw goes as it is; the server checks it.
    return file;
  }
}

/** The bar that holds a step's actions, held to the foot of the dialog or the phone's screen. */
function ActionBar({
  children,
  note,
  error,
}: {
  children: React.ReactNode;
  note?: React.ReactNode;
  /** A failed press, on its own line so a phone doesn't wrap it into a narrow column. */
  error?: string | undefined;
}) {
  const screen = usePlaceShape() === "screen";
  return (
    <div
      className={cn(
        "z-10 flex shrink-0 flex-wrap items-center gap-3 border-t border-edge bg-plate px-5",
        // The full-screen place is transformed, so fixed holds the bar to its foot, not the page's.
        screen
          ? "fixed inset-x-0 bottom-0 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          : "py-4",
      )}
    >
      {error && (
        <p className="w-full text-sm" role="alert">
          <InlineError>{error}</InlineError>
        </p>
      )}
      <div className="min-w-0 flex-1 text-sm text-ink-muted">{note}</div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

function InputStep(props: {
  pages: Page[];
  onPagesChange: (pages: Page[]) => void;
  text: string;
  onTextChange: (text: string) => void;
  link: string;
  onLinkChange: (link: string) => void;
  offerTranscript: boolean;
  onPasteTranscript: () => void;
  longRead: LongRead | null;
  error: string | undefined;
  onRead: () => void;
  /** Today's reads, or null for an account without a limit. */
  daily: Daily | null;
}) {
  const { pages, onPagesChange, text, link, longRead, daily } = props;
  const atLimit = daily !== null && daily.used >= daily.limit;
  const tooFewReads = longRead !== null && longRead.left !== null && longRead.left < longRead.reads;
  const { t } = useLingui();
  const desktop = useDesktop();
  const fileRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [over, setOver] = useState(false);
  const [writing, setWriting] = useState(false);
  const [linking, setLinking] = useState(false);
  const [draftLink, setDraftLink] = useState(link);
  const [linkError, setLinkError] = useState<string>();
  const [fileError, setFileError] = useState<string>();
  const limitId = useId();
  const room = MAX_FILES - pages.length;
  const take = useRef<(files: FileList | null) => void>(() => {});
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const empty = pages.length === 0 && words === 0 && !link;

  take.current = (files) => {
    if (!files?.length || atLimit || link) return;
    const usable = [...files].filter(
      (f) => f.type.startsWith("image/") || f.type === "application/pdf",
    );
    setFileError(
      usable.length > room
        ? t`Up to ${MAX_FILES} files at a time. The first ${room} were added.`
        : undefined,
    );
    const added = usable.slice(0, room).map((file) => {
      const kind = file.type === "application/pdf" ? ("pdf" as const) : ("photo" as const);
      return {
        id: crypto.randomUUID(),
        file,
        kind,
        url: kind === "photo" ? URL.createObjectURL(file) : null,
      };
    });
    onPagesChange([...pages, ...added]);
  };

  // A file dropped anywhere on the screen joins the lesson.
  useEffect(() => {
    const onOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      setOver(true);
    };
    const onLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) setOver(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!e.dataTransfer?.files.length) return;
      e.preventDefault();
      setOver(false);
      take.current(e.dataTransfer.files);
    };
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  useEffect(() => {
    if (writing) textRef.current?.focus();
  }, [writing]);

  const input = (ref: React.RefObject<HTMLInputElement | null>, accept: string, camera = false) => (
    <input
      ref={ref}
      type="file"
      accept={accept}
      multiple={!camera}
      {...(camera ? { capture: "environment" as const } : {})}
      className="hidden"
      onChange={(e) => {
        take.current(e.target.files);
        e.target.value = "";
      }}
    />
  );

  // A PDF-only picker opens the phone's files rather than its photo library.
  const sources = [
    {
      id: "file",
      icon: FileText,
      label: t`File`,
      hint: desktop ? t`A PDF, or drop it here` : t`A PDF of the lesson`,
      onClick: () => fileRef.current?.click(),
    },
    {
      id: "photos",
      icon: Images,
      label: t`Photos`,
      hint: t`Pictures of the pages`,
      onClick: () => photosRef.current?.click(),
    },
    {
      id: "text",
      icon: Type,
      label: t`Text`,
      hint: t`Paste notes or a transcript`,
      onClick: () => setWriting(true),
    },
    ...(pages.length === 0 && words === 0
      ? [
          {
            id: "link",
            icon: Link2,
            label: t`Link`,
            hint: t`An article on the web`,
            onClick: () => {
              setDraftLink(link);
              setLinking(true);
            },
          },
        ]
      : []),
    ...(desktop
      ? []
      : [
          {
            id: "camera",
            icon: Camera,
            label: t`Camera`,
            hint: t`One page at a time`,
            onClick: () => cameraRef.current?.click(),
          },
        ]),
  ];

  if (linking) {
    const save = () => {
      const value = draftLink.trim();
      if (value && !/^https:\/\/\S+\.\S+/i.test(value)) {
        setLinkError(t`Paste a link to a public web page. It starts with https://.`);
        return;
      }
      props.onLinkChange(value);
      setLinking(false);
    };
    return (
      <>
        <DialogBody className="grid content-start gap-5">
          <Field invalid={!!linkError}>
            <FieldLabel>
              <Trans>Article link</Trans>
            </FieldLabel>
            <Input
              type="url"
              inputMode="url"
              autoComplete="off"
              ref={(el) => el?.focus()}
              value={draftLink}
              placeholder="https://"
              onChange={(e) => {
                setDraftLink(e.target.value);
                setLinkError(undefined);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  save();
                }
              }}
            />
            {linkError ? (
              <FieldError>{linkError}</FieldError>
            ) : (
              <p className="text-sm text-pretty text-ink-muted">
                <Trans>
                  Lymi reads the article’s text and gives each card the sentence it came from.
                </Trans>
              </p>
            )}
          </Field>
        </DialogBody>
        <ActionBar>
          <Button variant="primary" onClick={save}>
            {draftLink.trim() ? <Trans>Add link</Trans> : <Trans>Back</Trans>}
          </Button>
        </ActionBar>
      </>
    );
  }

  if (writing) {
    return (
      <>
        <DialogBody className="grid content-start gap-5">
          <Field className="flex min-h-0 flex-1 flex-col">
            <FieldLabel>
              <Trans>Lesson text</Trans>
            </FieldLabel>
            <Textarea
              ref={textRef}
              value={text}
              onChange={(e) => props.onTextChange(e.target.value)}
              placeholder={t`Paste a transcript, your notes or the lesson’s text`}
              className="min-h-48 flex-1 resize-none [field-sizing:fixed]"
            />
          </Field>
        </DialogBody>
        <ActionBar
          note={words > 0 ? t`${plural(words, { one: "# word", other: "# words" })}` : undefined}
        >
          <Button variant="primary" onClick={() => setWriting(false)}>
            {words > 0 ? <Trans>Add text</Trans> : <Trans>Back</Trans>}
          </Button>
        </ActionBar>
      </>
    );
  }

  const textItem =
    words > 0 ? { words, preview: text.trim().slice(0, 160), edit: () => setWriting(true) } : null;

  return (
    <>
      {input(fileRef, "application/pdf")}
      {input(photosRef, "image/*")}
      {input(cameraRef, "image/*", true)}
      <DialogBody className="grid content-start gap-5">
        {atLimit && daily ? (
          <div id={limitId}>
            <LimitNotice daily={daily} />
          </div>
        ) : (
          <p className="text-base text-pretty text-ink-secondary">
            <Trans>
              Add photos, PDFs or text from your lesson, or a link to an article. Then choose which
              terms to add as cards.
            </Trans>
          </p>
        )}

        {!empty && (
          <ul className="edge grid divide-y divide-edge rounded-xl bg-plate-nested">
            {pages.map((page, i) => {
              // Photos are numbered among themselves, so a PDF ahead of them takes no number.
              const n = pages.slice(0, i + 1).filter((p) => p.kind === "photo").length;
              const name = page.kind === "pdf" ? page.file.name : t`Page ${n}`;
              return (
                <li key={page.id} className="flex items-center gap-3 px-3 py-2.5">
                  <Thumb page={page} name={name} />
                  <span className="grid min-w-0 flex-1">
                    <span className="truncate text-base text-ink">{name}</span>
                    <span className="text-sm text-ink-muted">
                      {page.kind === "pdf" ? t`PDF` : t`Photo`}
                    </span>
                  </span>
                  <IconButton
                    label={t`Remove ${{ name: isolate(name) }}`}
                    size="sm"
                    onClick={() => onPagesChange(pages.filter((p) => p.id !== page.id))}
                  >
                    <X />
                  </IconButton>
                </li>
              );
            })}
            {link && (
              <li className="flex items-center gap-3 px-3 py-2.5">
                <IconTile icon={Link2} />
                <button
                  type="button"
                  onClick={() => {
                    setDraftLink(link);
                    setLinking(true);
                  }}
                  className="grid min-w-0 flex-1 text-start"
                >
                  <span className="truncate text-base text-ink" dir="ltr">
                    {shownLink(link)}
                  </span>
                  <span className="text-sm text-ink-muted">
                    <Trans>Link</Trans>
                  </span>
                </button>
                <IconButton
                  label={t`Remove the link`}
                  size="sm"
                  onClick={() => props.onLinkChange("")}
                >
                  <X />
                </IconButton>
              </li>
            )}
            {textItem && (
              <li className="flex items-center gap-3 px-3 py-2.5">
                <IconTile icon={Type} />
                <button
                  type="button"
                  onClick={textItem.edit}
                  className="grid min-w-0 flex-1 text-start"
                >
                  <span className="truncate text-base text-ink">{textItem.preview}</span>
                  <span className="text-sm text-ink-muted">
                    {t`Text · ${plural(textItem.words, { one: "# word", other: "# words" })}`}
                  </span>
                </button>
                <IconButton
                  label={t`Remove the text`}
                  size="sm"
                  onClick={() => props.onTextChange("")}
                >
                  <X />
                </IconButton>
              </li>
            )}
          </ul>
        )}
        {longRead && (
          <Notice
            icon={Newspaper}
            title={t`${plural(longRead.reads, { one: "This article counts as # lesson", other: "This article counts as # lessons" })}`}
          >
            {t`${plural(longRead.words, { one: "It’s about # word long, and one lesson covers up to 15,000.", other: "It’s about # words long, and one lesson covers up to 15,000." })}`}{" "}
            {longRead.left !== null &&
              t`${plural(longRead.left, { one: "You have # lesson left today.", other: "You have # lessons left today." })}`}
          </Notice>
        )}

        {props.offerTranscript && (
          <Button
            variant="secondary"
            className="justify-self-start"
            onClick={() => {
              props.onPasteTranscript();
              setWriting(true);
            }}
          >
            <Type data-icon="inline-start" aria-hidden="true" />
            <Trans>Paste the transcript</Trans>
          </Button>
        )}

        <div className={cn("grid gap-2", link && "hidden")}>
          {!empty && (
            <h3 className="text-sm font-medium text-ink-muted">
              <Trans>Add more</Trans>
            </h3>
          )}
          <div
            className={cn(
              "edge grid divide-y divide-edge rounded-xl bg-plate-nested",
              over && "bg-amber-soft",
            )}
          >
            {sources.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={source.onClick}
                disabled={atLimit}
                className="flex items-center gap-3 px-4 py-3.5 text-start transition-colors first:rounded-t-xl last:rounded-b-xl disabled:opacity-45 hoverable:enabled:hover:bg-plate-hover"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-plate text-ink">
                  <source.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="grid min-w-0 flex-1">
                  <span className="text-base font-medium text-ink">{source.label}</span>
                  <span className="text-sm text-ink-muted">{source.hint}</span>
                </span>
                <ChevronRight
                  className="size-5 text-ink-faint rtl:-scale-x-100"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </div>

        {fileError && <FieldError>{fileError}</FieldError>}

        {props.error && (
          <Field invalid>
            <FieldError>{props.error}</FieldError>
          </Field>
        )}
      </DialogBody>
      <ActionBar
        note={
          <span className="flex items-center gap-2">
            {daily && <LimitInfo limit={daily.limit} />}
            {empty || link
              ? undefined
              : words > 0 && pages.length > 0
                ? t`${plural(pages.length, { one: "# file", other: "# files" })} and text`
                : pages.length > 0
                  ? t`${plural(pages.length, { one: "# file", other: "# files" })} · up to ${MAX_FILES}`
                  : t`${plural(words, { one: "# word", other: "# words" })}`}
          </span>
        }
      >
        <Button
          variant="primary"
          onClick={tooFewReads ? undefined : props.onRead}
          aria-disabled={atLimit || tooFewReads}
          aria-describedby={atLimit ? limitId : undefined}
        >
          {longRead && !tooFewReads ? (
            t`${plural(longRead.reads, { one: "Read as # lesson", other: "Read as # lessons" })}`
          ) : (
            <Trans>Find terms</Trans>
          )}
        </Button>
      </ActionBar>
    </>
  );
}

/** What the beta's daily limit is, a tap away in the footer. */
function LimitInfo({ limit }: { limit: number }) {
  const { t } = useLingui();
  return (
    <InfoTip label={t`About the daily limit`} align="start">
      {t`${plural(limit, { one: "Smart add is in beta, so it reads up to # lesson a day.", other: "Smart add is in beta, so it reads up to # lessons a day." })} A lesson it couldn’t read doesn’t count, and the count starts again at midnight.`}
    </InfoTip>
  );
}

/** The warning above the disabled sources once today's reads are used, saying when more open. */
function LimitNotice({ daily }: { daily: Daily }) {
  const { t } = useLingui();
  const minutes = Math.max(1, Math.ceil((Date.parse(daily.resetsAt) - Date.now()) / 60_000));
  const hours = Math.max(1, Math.round(minutes / 60));
  const { limit } = daily;
  return (
    <Notice
      tone="warning"
      icon={Hourglass}
      title={t`${plural(limit, { one: "You’ve used today’s # lesson", other: "You’ve used today’s # lessons" })}`}
    >
      {minutes < 60
        ? t`${plural(minutes, { one: "You can add more lessons in # minute.", other: "You can add more lessons in # minutes." })}`
        : t`${plural(hours, { one: "You can add more lessons in # hour.", other: "You can add more lessons in # hours." })}`}
    </Notice>
  );
}

/** Every row in the lesson list leads with the same 40 px square: the photo itself, or an icon. */
function Thumb({ page, name }: { page: Page; name: string }) {
  if (!page.url) return <IconTile icon={FileText} />;
  return (
    <img
      src={page.url}
      alt={name}
      className="image-edge size-10 shrink-0 rounded-md object-cover"
    />
  );
}

function IconTile({ icon: Icon }: { icon: typeof FileText }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-md bg-plate text-ink-secondary">
      <Icon className="size-5" aria-hidden="true" />
    </span>
  );
}

export function ReadingStep({
  pages,
  text,
  article = false,
  found,
  finished,
  onStop,
}: {
  pages: ScanPage[];
  text: string;
  article?: boolean;
  found: number;
  finished: boolean;
  onStop?: () => void;
}) {
  const { t } = useLingui();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const tick = setInterval(() => setElapsed((s) => s + 0.5), 500);
    return () => clearInterval(tick);
  }, []);
  // Pages are scanned on a clock, since the one request says nothing until words arrive.
  const scanned = finished
    ? pages.length
    : Math.min(Math.floor(elapsed / SECONDS_A_PAGE), pages.length);
  const current = Math.min(scanned, Math.max(pages.length - 1, 0));
  const read = finished || found > 0 || (pages.length > 0 ? scanned >= pages.length : elapsed >= 3);

  const stage = !read
    ? pages.length > 1
      ? t`Reading page ${scanned + 1} of ${pages.length}`
      : pages.length > 0
        ? t`Reading the pages`
        : article
          ? t`Reading the article`
          : t`Reading the text`
    : finished
      ? t`Checking your decks for duplicates`
      : t`Finding terms to review`;

  return (
    <>
      <DialogBody className="grid content-center justify-items-center gap-6">
        <ScanStage pages={pages} text={text} finished={finished} current={current} />

        <div className="grid justify-items-center gap-1 text-center">
          <RollingCount value={found} className="text-4xl font-medium text-ink" />
          <p className="text-sm text-ink-muted" aria-live="polite">
            {t`${plural(found, { one: "term found", other: "terms found" })}`}
          </p>
        </div>

        <div className="grid h-6 justify-items-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={stage}
              className="flex items-center gap-2 text-sm text-ink-secondary"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE } }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
            >
              <span
                aria-hidden="true"
                className="size-1.5 animate-pulse rounded-full bg-amber motion-reduce:animate-none"
              />
              {stage}
            </motion.p>
          </AnimatePresence>
        </div>
      </DialogBody>

      <ActionBar>
        <Button variant="ghost" onClick={onStop}>
          <Trans>Stop</Trans>
        </Button>
      </ActionBar>
    </>
  );
}

/** The option index that stands for an answer in the learner's own words. */
const OWN_ANSWER = -1;

function QuestionsStep({
  questions,
  answers,
  ownAnswers,
  onAnswer,
  onOwnAnswer,
  onBack,
  onNext,
}: {
  questions: LessonQuestion[];
  answers: number[];
  ownAnswers: string[];
  onAnswer: (index: number, value: number) => void;
  onOwnAnswer: (index: number, value: string) => void;
  onBack: () => void;
  onNext: () => Promise<void>;
}) {
  const { t } = useLingui();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <>
      {/* The error makes the fixed bar taller, so the last option still has to clear it. */}
      <DialogBody className={cn("grid content-start gap-6", error && "pb-14")}>
        {questions.map((question, index) => {
          const own = answers[index] === OWN_ANSWER;
          return (
            <FieldSet key={question.id} className="gap-2.5">
              <FieldLegend variant="label" className="text-base font-medium text-pretty text-ink">
                {question.question}
              </FieldLegend>
              <RadioGroup
                value={String(answers[index] ?? question.default)}
                onValueChange={(v) => onAnswer(index, Number(v))}
                className="gap-2"
              >
                {question.options.map((option, i) => (
                  <RadioCard key={option.label} value={String(i)} title={option.label} />
                ))}
                {/* The learner's own answer is the last option, typed where its label would be. */}
                <RadioCard value={String(OWN_ANSWER)} className="items-center">
                  <input
                    type="text"
                    aria-label={t`Something else`}
                    value={ownAnswers[index] ?? ""}
                    onFocus={() => onAnswer(index, OWN_ANSWER)}
                    onChange={(e) => {
                      onOwnAnswer(index, e.target.value);
                      if (!own) onAnswer(index, OWN_ANSWER);
                    }}
                    placeholder={t`Something else…`}
                    maxLength={300}
                    className="min-w-0 flex-1 bg-transparent text-[1rem] font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink-muted md:hoverable:text-base"
                  />
                </RadioCard>
              </RadioGroup>
            </FieldSet>
          );
        })}
      </DialogBody>
      <ActionBar error={error}>
        <Button variant="ghost" onClick={onBack}>
          <Trans>Back</Trans>
        </Button>
        <Button
          variant="primary"
          loading={pending}
          onClick={async () => {
            setPending(true);
            setError(undefined);
            try {
              await onNext();
            } catch (failure) {
              setError(errorMessage(failure));
            } finally {
              setPending(false);
            }
          }}
        >
          <Trans>Show terms</Trans>
        </Button>
      </ActionBar>
    </>
  );
}

function ListStep({
  decks,
  deckId,
  onDeckChange,
  terms,
  dropped,
  article,
  onBack,
  onAdd,
}: {
  decks: DeckSummary[];
  deckId: string | undefined;
  onDeckChange: (deckId: string) => void;
  terms: LessonTerm[];
  dropped: Set<string>;
  article: boolean;
  onBack: () => void;
  onAdd: (terms: LessonTerm[]) => Promise<void>;
}) {
  const { t } = useLingui();
  const fresh = terms.filter((term) => !term.existing);
  const existing = terms.filter((term) => term.existing);
  const [ticked, setTicked] = useState<Set<string>>(
    () =>
      new Set(fresh.filter((term) => term.ticked && !dropped.has(term.id)).map((term) => term.id)),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const all = ticked.size === fresh.length;

  if (fresh.length === 0) {
    return (
      <>
        <DialogBody className="grid content-start gap-5">
          <div className="grid gap-1">
            <p className="text-md font-medium text-ink">
              <Trans>No new terms found</Trans>
            </p>
            <p className="text-base text-ink-secondary">
              {existing.length > 0 ? (
                <Trans>The terms Lymi found are already in your decks. Try another lesson.</Trans>
              ) : article ? (
                <Trans>Try another article, or paste the part you want to learn from.</Trans>
              ) : (
                <Trans>Try a clearer photo or paste the lesson text.</Trans>
              )}
            </p>
          </div>
          <ExistingList terms={existing} />
        </DialogBody>
        <ActionBar>
          <Button variant="primary" onClick={onBack}>
            <Trans>Back</Trans>
          </Button>
        </ActionBar>
      </>
    );
  }

  return (
    <>
      <DialogBody className="grid content-start gap-4">
        <Field>
          <FieldLabel>
            <Trans>Add to</Trans>
          </FieldLabel>
          <Select
            value={deckId ?? ""}
            onValueChange={(v) => v && onDeckChange(v)}
            items={decks.map((d) => ({ value: d.id, label: d.name }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t`Choose a deck`} />
            </SelectTrigger>
            <SelectContent>
              {decks.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  <bdi>{d.name}</bdi>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid">
          <div className="flex items-baseline justify-between gap-3 pb-1">
            <p className="text-sm text-ink-secondary tabular-nums">
              {t`${ticked.size} of ${fresh.length} chosen`}
            </p>
            <button
              type="button"
              onClick={() => setTicked(all ? new Set() : new Set(fresh.map((term) => term.id)))}
              className="-my-2 min-h-11 shrink-0 text-sm font-medium text-ink-secondary underline decoration-edge-strong underline-offset-3 transition-colors hoverable:hover:text-ink md:min-h-0"
            >
              {all ? <Trans>Clear all</Trans> : <Trans>Select all</Trans>}
            </button>
          </div>
          <ul className="-mx-2 grid">
            {fresh.map((term) => (
              <li key={term.id}>
                <Field
                  orientation="horizontal"
                  className="items-start gap-3 rounded-lg px-2 py-2 transition-colors hoverable:hover:veil"
                >
                  <Checkbox
                    checked={ticked.has(term.id)}
                    onCheckedChange={(on) => {
                      const next = new Set(ticked);
                      if (on) next.add(term.id);
                      else next.delete(term.id);
                      setTicked(next);
                      setError(undefined);
                    }}
                    className="mt-0.5"
                  />
                  <div className="grid min-w-0">
                    <FieldLabel className="text-base font-medium text-ink [overflow-wrap:anywhere]">
                      <bdi>{term.term}</bdi>
                    </FieldLabel>
                    <span className="text-sm text-ink-secondary">{term.gloss}</span>
                    {term.example && (
                      <span className="line-clamp-2 text-sm text-ink-muted [overflow-wrap:anywhere]">
                        <bdi>{term.example}</bdi>
                      </span>
                    )}
                    <TermNote term={term} />
                  </div>
                </Field>
              </li>
            ))}
          </ul>
        </div>

        {existing.length > 0 && <ExistingList terms={existing} />}

        <p className="text-sm text-ink-muted">
          {article ? (
            <Trans>
              Each card keeps its sentence and a link to the article. Lymi writes the rest.
            </Trans>
          ) : (
            <Trans>After you add them, Lymi writes each card’s example and pronunciation.</Trans>
          )}
        </p>
      </DialogBody>
      <ActionBar note={error ? <span className="text-danger">{error}</span> : undefined}>
        <Button variant="ghost" onClick={onBack}>
          <Trans>Back</Trans>
        </Button>
        <Button
          variant="primary"
          loading={pending}
          onClick={async () => {
            if (ticked.size === 0) {
              setError(t`Select at least one term to add.`);
              return;
            }
            setPending(true);
            try {
              await onAdd(fresh.filter((term) => ticked.has(term.id)));
            } catch (failure) {
              setError(errorMessage(failure));
              setPending(false);
            }
          }}
        >
          {t`${plural(ticked.size, { one: "Add # card", other: "Add # cards" })}`}
        </Button>
      </ActionBar>
    </>
  );
}

function TermNote({ term }: { term: LessonTerm }) {
  if (term.formOf) {
    return (
      <span className="text-xs text-ink-muted">
        <Trans>
          Another form of {isolate(term.formOf.term)}, in {isolate(term.formOf.deckName)}
        </Trans>
      </span>
    );
  }
  if (term.keep !== null && !term.ticked) {
    return (
      <span className="text-xs text-ink-muted">
        <Trans>May belong on another card</Trans>
      </span>
    );
  }
  if (term.handwritten) {
    return (
      <span className="text-xs text-ink-muted">
        <Trans>Handwritten</Trans>
      </span>
    );
  }
  return null;
}

function ExistingList({ terms }: { terms: LessonTerm[] }) {
  return (
    <section className="grid" aria-labelledby="lesson-existing">
      <h2 id="lesson-existing" className="pt-2 pb-1 text-sm text-ink-muted">
        <Trans>Already in your decks</Trans>
      </h2>
      <ul className="grid">
        {terms.map((term) => (
          <li key={term.id} className="flex items-start gap-3 py-2">
            <span className="grid size-5 shrink-0 place-items-center text-ink-faint">
              <Check className="size-4" aria-hidden="true" />
            </span>
            <div className="grid min-w-0 gap-0.5">
              <bdi className="text-base text-ink-muted">{term.term}</bdi>
              <span className="text-sm text-ink-muted">
                <Trans>In {isolate(term.existing?.deckName)}</Trans>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
