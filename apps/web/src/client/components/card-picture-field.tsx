import { Trans, useLingui } from "@lingui/react/macro";
import { CardImageImportInput, IMAGE_LIMITS } from "@lymi/core";
import { clsx } from "clsx";
import { Camera, ImagePlus, Link2, RefreshCw, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import type { CardImage } from "../lib/api";
import { useObjectUrl } from "../lib/avatar";
import { useDesktop } from "../lib/device";
import { Button, IconButton } from "./button";
import { CardPicture } from "./card-picture";
import { Field, FieldDescription, FieldError, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";

/** What the form will do with the card's picture when it is saved. */
export type PictureDraft =
  | { kind: "none" }
  | { kind: "current"; image: CardImage }
  | { kind: "file"; file: File }
  | { kind: "link"; url: string; host: string };

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Whether the server would take a picked, dropped or pasted file; it checks the bytes again. */
export function acceptsPictureFile(file: File): boolean {
  return TYPES.includes(file.type) && file.size <= IMAGE_LIMITS.maxBytes;
}

interface Props {
  value: PictureDraft;
  onChange: (value: PictureDraft) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  descriptionError?: string | undefined;
  /** Set when a picked file was refused. */
  fileError?: string | undefined;
  onFileError: (message: string | undefined) => void;
  /** One line while empty, for a form that shows every field at once. */
  compact?: boolean | undefined;
}

function formatSize(bytes: number, locale: string): string {
  const mb = bytes / 1_000_000;
  const unit = mb >= 1 ? "megabyte" : "kilobyte";
  const amount = mb >= 1 ? mb : Math.max(1, bytes / 1000);
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit,
    unitDisplay: "short",
    maximumFractionDigits: mb >= 1 ? 1 : 0,
  }).format(amount);
}

/**
 * The card's one picture: dropped, pasted, chosen, taken with the camera on a phone, or copied from
 * a link. Nothing is sent until the form is saved, because a new card has no id to send it to yet.
 */
export function CardPictureField({
  value,
  onChange,
  description,
  onDescriptionChange,
  descriptionError,
  fileError,
  onFileError,
  compact,
}: Props) {
  const { t, i18n } = useLingui();
  const desktop = useDesktop();
  const pickRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [linking, setLinking] = useState(false);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState<string>();
  const [over, setOver] = useState(false);
  const preview = useObjectUrl(value.kind === "file" ? value.file : null);
  const refused = t`Use a JPEG, PNG, WebP or still GIF under 10 MB.`;

  const take = (file: File | undefined) => {
    if (!file) return;
    if (!acceptsPictureFile(file)) {
      onFileError(refused);
      return;
    }
    onFileError(undefined);
    onChange({ kind: "file", file });
  };
  const applyLink = () => {
    const parsed = CardImageImportInput.shape.url.safeParse(link.trim());
    if (!parsed.success) {
      setLinkError(t`Use a public http or https link to a picture.`);
      return;
    }
    const url = new URL(parsed.data);
    setLinking(false);
    setLink("");
    setLinkError(undefined);
    onChange({ kind: "link", url: url.href, host: url.host });
  };

  const inputs = (
    <>
      <input
        ref={pickRef}
        type="file"
        accept={TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </>
  );

  if (value.kind === "none") {
    return (
      <div className="grid gap-1.5">
        {linking ? (
          <Field>
            <FieldLabel className="sr-only">{t`Link to a picture`}</FieldLabel>
            <div className="flex gap-2">
              <Input
                type="url"
                inputMode="url"
                ref={(el) => el?.focus()}
                value={link}
                placeholder="https://"
                onChange={(e) => {
                  setLink(e.target.value);
                  setLinkError(undefined);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyLink();
                  }
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    setLinking(false);
                  }
                }}
              />
              <Button onClick={applyLink}>
                <Trans>Use link</Trans>
              </Button>
              <IconButton
                label={t`Cancel the link`}
                onClick={() => {
                  setLinking(false);
                  setLinkError(undefined);
                }}
              >
                <X />
              </IconButton>
            </div>
            <FieldDescription>
              <Trans>A link to a picture online.</Trans>
            </FieldDescription>
            <FieldError>{linkError}</FieldError>
          </Field>
        ) : (
          // biome-ignore lint/a11y/noStaticElementInteractions: a drop target; its buttons do the same by keyboard.
          <div
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes("Files")) return;
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              take(e.dataTransfer.files[0]);
            }}
            className={clsx(
              "rounded-md border border-dashed bg-plate-2 transition-colors duration-150",
              compact
                ? "flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2"
                : "grid justify-items-center gap-3 px-4 py-4 text-center",
              over ? "border-text bg-hover" : "border-edge-2",
            )}
          >
            <p className="flex items-center gap-2 text-base font-medium text-text">
              <ImagePlus className="size-[18px] text-muted" aria-hidden="true" />
              {desktop ? <Trans>Drop or paste a picture</Trans> : <Trans>Add a picture</Trans>}
            </p>
            <div className={clsx("flex flex-wrap gap-2", !compact && "justify-center")}>
              {!desktop && (
                <Button size="sm" onClick={() => cameraRef.current?.click()}>
                  <Camera data-icon="inline-start" aria-hidden="true" />
                  <Trans>Take photo</Trans>
                </Button>
              )}
              <Button size="sm" onClick={() => pickRef.current?.click()}>
                <Upload data-icon="inline-start" aria-hidden="true" />
                <Trans>Choose file</Trans>
              </Button>
              <Button size="sm" onClick={() => setLinking(true)}>
                <Link2 data-icon="inline-start" aria-hidden="true" />
                <Trans>Paste a link</Trans>
              </Button>
            </div>
            {!compact && (
              <p className="text-xs text-muted">
                <Trans>JPEG, PNG, WebP or still GIF, up to 10 MB.</Trans>
              </p>
            )}
          </div>
        )}
        <FieldError>{fileError}</FieldError>
        {inputs}
      </div>
    );
  }

  const name =
    value.kind === "file" ? (
      value.file.name || t`Pasted picture`
    ) : value.kind === "link" ? (
      <span className="font-mono text-sm">{value.host}</span>
    ) : (
      t`Current picture`
    );
  const caption =
    value.kind === "file"
      ? t`${formatSize(value.file.size, i18n.locale)} · uploads when you save`
      : value.kind === "link"
        ? t`Copied when you save`
        : null;

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <div className="edge grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md p-2">
          <div className="grid size-18 place-items-center overflow-hidden rounded-sm bg-plate-2 text-muted">
            {value.kind === "current" ? (
              <CardPicture image={value.image} maxHeight="4.5rem" fallback="placeholder" />
            ) : value.kind === "file" && preview ? (
              <img src={preview} alt="" className="size-full object-contain" />
            ) : (
              <Link2 className="size-5" aria-hidden="true" />
            )}
          </div>
          <div className="grid min-w-0 gap-0.5">
            <span className="truncate text-base font-medium text-text">{name}</span>
            {caption && <span className="truncate text-sm text-muted">{caption}</span>}
          </div>
          <div className="flex items-center gap-1">
            <IconButton label={t`Replace the picture`} onClick={() => pickRef.current?.click()}>
              <RefreshCw />
            </IconButton>
            <IconButton
              label={value.kind === "current" ? t`Archive the picture` : t`Clear the picture`}
              onClick={() => {
                onFileError(undefined);
                onChange({ kind: "none" });
              }}
            >
              <X />
            </IconButton>
          </div>
        </div>
        <FieldError>{fileError}</FieldError>
        {inputs}
      </div>
      <Field>
        <FieldLabel aside={t`Optional`}>{t`Description`}</FieldLabel>
        <Input
          value={description}
          autoComplete="off"
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
        <FieldDescription>
          <Trans>What the picture shows, without the answer. Picture review needs it.</Trans>
        </FieldDescription>
        <FieldError>{descriptionError}</FieldError>
      </Field>
    </div>
  );
}
