import { useLingui } from "@lingui/react/macro";
import { inspectImage } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Camera, ImageMinus, ImageUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "../lib/api";
import {
  type Avatar as AvatarState,
  avatarImageQuery,
  avatarQuery,
  removeAvatar,
  uploadAvatar,
  useLearnerAvatar,
} from "../lib/avatar";
import { Avatar } from "./Avatar";
import { AvatarEditor, type PickedImage } from "./AvatarEditor";
import { SettingsGroup } from "./SettingsGroup";
import { Skeleton } from "./Skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { toast } from "./ui/toast";

/** Photos larger than this are refused before decoding; the cropped square is far smaller. */
const MAX_PICK_BYTES = 25 * 1024 * 1024;
const MAX_PICK_PIXELS = 50_000_000;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif";

interface GroupProps {
  name: string | undefined;
  email: string | undefined;
  photo?: { src: string | undefined; pending: boolean } | undefined;
  /** Only the learner's own upload can be removed; a Google photo or the initial cannot. */
  source?: AvatarState["source"] | undefined;
  /** Opens the device's picker. Absent until the photo's state is known. */
  onChoose?: (() => void) | undefined;
  onRemove?: (() => void) | undefined;
  busy?: boolean | undefined;
}

/**
 * The learner as the app knows them. The photo is its own control: with nothing of the
 * learner's own to remove it opens the picker at once, and once there is, a short menu.
 */
export function AccountGroup({ name, email, photo, source, onChoose, onRemove, busy }: GroupProps) {
  const { t } = useLingui();
  const avatar = (
    <Avatar name={name} src={photo?.src} pending={photo?.pending || !name} size={72} />
  );
  const face = (props: { onClick?: () => void } = {}) => (
    <button
      type="button"
      {...props}
      aria-label={t`Change photo`}
      aria-busy={busy || undefined}
      className={clsx(
        "group relative shrink-0 rounded-full transition-[scale,opacity] duration-150 ease-out active:scale-[0.97]",
        busy && "opacity-45",
      )}
    >
      {avatar}
      <span
        aria-hidden="true"
        className="edge absolute -end-0.5 -bottom-0.5 grid size-7 place-items-center rounded-full bg-plate text-text-2 transition-colors duration-150 group-hover:bg-hover group-hover:text-text group-aria-expanded:bg-hover [&_svg]:size-3.5"
      >
        <Camera />
      </span>
    </button>
  );

  return (
    <SettingsGroup title={t`Account`}>
      <div className="flex items-center gap-4">
        {!onChoose ? (
          avatar
        ) : source === "custom" && onRemove ? (
          <DropdownMenu>
            <DropdownMenuTrigger render={face()} />
            <DropdownMenuContent aria-label={t`Photo`} align="start">
              <DropdownMenuItem onClick={onChoose}>
                <ImageUp aria-hidden="true" />
                {t`Choose new photo`}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRemove}>
                <ImageMinus aria-hidden="true" />
                {t`Remove photo`}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          face({ onClick: onChoose })
        )}
        <div className="grid min-w-0 gap-0.5">
          {name ? (
            <span className="truncate text-md font-medium text-text">{name}</span>
          ) : (
            <Skeleton className="h-5 w-32" />
          )}
          {email ? (
            <span className="truncate text-sm text-muted">{email}</span>
          ) : (
            <Skeleton className="h-4 w-48" />
          )}
        </div>
      </div>
    </SettingsGroup>
  );
}

const PHOTO_TOAST = "photo";

/** The Account group with the photo wired up: pick, crop, save, and remove with Undo. */
export function AccountSection({
  name,
  email,
}: {
  name: string | undefined;
  email: string | undefined;
}) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const avatar = useQuery(avatarQuery);
  const photo = useLearnerAvatar();
  const input = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<PickedImage | null>(null);

  useEffect(() => () => closePicked(picked), [picked]);

  const tell = (text: string, undo?: () => void) =>
    toast.add({
      id: PHOTO_TOAST,
      title: text,
      actionProps: undo ? { children: t`Undo`, onClick: undo } : undefined,
    });
  const warn = (text: string) =>
    toast.add({ id: PHOTO_TOAST, type: "error", title: text, actionProps: undefined });

  const failure = (error: unknown) => {
    if (error instanceof ApiError && error.status === 409) {
      return t`Your photo was changed somewhere else. Check it, then try again.`;
    }
    if (error instanceof ApiError && error.status === 400) {
      return t`That image couldn’t be used. Choose a still JPEG, PNG or WebP image.`;
    }
    if (error instanceof ApiError && error.status === 0) {
      return t`Couldn’t reach Lymi. Check your connection and try again.`;
    }
    return t`Couldn’t save the photo. Try again.`;
  };

  /** Stores a new photo and shows it at once: the bytes sent are the bytes stored. */
  const store = async (square: Blob, revision: number) => {
    const next = await uploadAvatar(square, revision);
    if (next.version) qc.setQueryData(avatarImageQuery(next.version).queryKey, square);
    qc.setQueryData(avatarQuery.queryKey, next);
    return next;
  };

  /** A refused change was made from an old revision; fetch the current one so a retry can land. */
  const refreshIfStale = (error: unknown) => {
    if (error instanceof ApiError && error.status === 409) {
      void qc.invalidateQueries({ queryKey: avatarQuery.queryKey });
    }
  };

  const save = useMutation({
    mutationFn: (square: Blob) => store(square, avatar.data?.revision ?? 0),
    onMutate: () => toast.close(PHOTO_TOAST),
    onSuccess: () => setPicked(null),
    onError: refreshIfStale,
  });

  const restore = useMutation({
    mutationFn: ({ square, revision }: { square: Blob; revision: number }) =>
      store(square, revision),
    onMutate: () => toast.close(PHOTO_TOAST),
    onError: (error) => {
      refreshIfStale(error);
      warn(failure(error));
    },
  });

  const remove = useMutation({
    mutationFn: () => removeAvatar(avatar.data?.revision ?? 0),
    onMutate: () => toast.close(PHOTO_TOAST),
    onSuccess: (next, _vars) => {
      const previous = avatar.data?.version
        ? qc.getQueryData<Blob>(avatarImageQuery(avatar.data.version).queryKey)
        : undefined;
      qc.setQueryData(avatarQuery.queryKey, next);
      const undo =
        previous instanceof Blob
          ? () => restore.mutate({ square: previous, revision: next.revision })
          : undefined;
      tell(next.source === "google" ? t`Your Google photo is back` : t`Photo removed`, undo);
    },
    onError: (error) => {
      refreshIfStale(error);
      warn(failure(error));
    },
  });

  const choose = async (file: File | undefined) => {
    toast.close(PHOTO_TOAST);
    save.reset();
    if (!file) return;
    const problem = await checkPick(file);
    if (problem) {
      warn(pickMessage(problem));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch {
      URL.revokeObjectURL(url);
      warn(pickMessage("unreadable"));
      return;
    }
    const pixels = img.naturalWidth * img.naturalHeight;
    if (pixels > MAX_PICK_PIXELS || Math.min(img.naturalWidth, img.naturalHeight) < 16) {
      URL.revokeObjectURL(url);
      warn(pickMessage(pixels > MAX_PICK_PIXELS ? "too_large" : "too_small"));
      return;
    }
    setPicked({ url, width: img.naturalWidth, height: img.naturalHeight });
  };

  const pickMessage = (problem: PickProblem) => {
    switch (problem) {
      case "animated":
        return t`Animated images can’t be used. Choose a still image.`;
      case "too_large":
        return t`That image is too large. Choose one under 25 MB.`;
      case "too_small":
        return t`That image is too small. Choose one at least 16 pixels wide.`;
      default:
        return t`That file couldn’t be opened. Choose a JPEG, PNG or WebP image.`;
    }
  };

  return (
    <>
      <AccountGroup
        name={name}
        email={email}
        photo={photo}
        source={avatar.data?.source}
        onChoose={avatar.isSuccess ? () => input.current?.click() : undefined}
        onRemove={() => remove.mutate()}
        busy={remove.isPending || restore.isPending}
      />
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          void choose(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <AvatarEditor
        image={picked}
        saving={save.isPending}
        error={save.isError ? failure(save.error) : undefined}
        onCancel={() => {
          save.reset();
          setPicked(null);
        }}
        onSave={async (square) => {
          await save.mutateAsync(square).catch(() => undefined);
        }}
      />
    </>
  );
}

type PickProblem = "animated" | "too_large" | "too_small" | "unsupported" | "unreadable";

/** Refuses what the server would refuse anyway, before spending a decode on it. */
async function checkPick(file: File): Promise<PickProblem | null> {
  if (file.size > MAX_PICK_BYTES) return "too_large";
  if (file.type === "image/svg+xml") return "unsupported";
  const result = inspectImage(new Uint8Array(await file.arrayBuffer()));
  if (result.ok) return null;
  if (result.reason === "animated" || result.reason === "too_small") return result.reason;
  // Markup is never a photo, whatever the file claims to be.
  if (
    new TextDecoder()
      .decode(await file.slice(0, 256).arrayBuffer())
      .trimStart()
      .startsWith("<")
  ) {
    return "unsupported";
  }
  // HEIC and AVIF are not sniffed; the browser's decoder decides whether they open.
  return null;
}

function closePicked(image: PickedImage | null) {
  if (image) URL.revokeObjectURL(image.url);
}
