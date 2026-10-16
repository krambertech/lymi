import { useLingui } from "@lingui/react/macro";
import { ApiError, api } from "@lymi/client/api";
import { avatarQuery, meQuery } from "@lymi/client/queries";
import { NameInput } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
import { View } from "react-native";
import { useSession } from "../auth/client";
import { usePalette } from "../theme/palette";
import { Input } from "../ui/field";
import { Sheet, SheetGroup, SheetRow } from "../ui/sheet";
import { Avatar } from "./avatar";

/** The learner's name and photo, and the writes that change them. */
export function useProfile() {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const session = useSession().data?.user;
  const me = useQuery(meQuery).data ?? session;
  const avatar = useQuery(avatarQuery);

  const rename = useMutation({
    mutationFn: (next: string) => api.rename(next),
    onSuccess: (saved) => queryClient.setQueryData(meQuery.queryKey, saved),
  });
  const photo = useMutation({
    mutationFn: async (change: { image: Blob } | "remove") => {
      const revision = avatar.data?.revision ?? 0;
      return change === "remove"
        ? api.removeAvatar(revision)
        : api.uploadAvatar(change.image, revision);
    },
    onSuccess: (saved) => queryClient.setQueryData(avatarQuery.queryKey, saved),
    // Changed from another device: read the photo again so the next try has its revision.
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) void avatar.refetch();
    },
  });

  const pick = async (from: "camera" | "library") => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      // A JPEG rather than HEIC, which the server cannot read.
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    };
    if (from === "camera" && !(await ImagePicker.requestCameraPermissionsAsync()).granted) return;
    const result =
      from === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    photo.mutate({ image: await (await fetch(asset.uri)).blob() });
  };

  const error = rename.isError
    ? t`Couldn’t save your name. Check your connection and try again.`
    : photo.isError
      ? photo.error instanceof ApiError && photo.error.status === 409
        ? t`Your photo changed on another device. Try again.`
        : t`Couldn’t change your photo. Check your connection and try again.`
      : null;

  return {
    name: me?.name,
    email: me?.email,
    pending: photo.isPending || rename.isPending,
    error,
    canRemove: avatar.data?.source === "custom",
    /** Saves a changed name; an empty or unchanged one keeps the name there was. */
    rename: (draft: string) => {
      const parsed = NameInput.safeParse({ name: draft });
      if (parsed.success && parsed.data.name !== me?.name) rename.mutate(parsed.data.name);
    },
    pick,
    removePhoto: () => photo.mutate("remove"),
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ReturnType<typeof useProfile>;
}

/**
 * The name and photo, as a sheet like a field's in Add a word. The name is kept once the sheet has
 * gone, by the keyboard's done key or a swipe; a photo is taken or chosen after it has gone.
 */
export function ProfileSheet({ open, onOpenChange, profile }: Props) {
  const { t } = useLingui();
  const p = usePalette();
  const [draft, setDraft] = useState(profile.name ?? "");
  const then = useRef<(() => void) | null>(null);
  // Each opening starts from the saved name, so a draft left unsaved never lingers.
  const [shown, setShown] = useState(open);
  if (open !== shown) {
    setShown(open);
    if (open) setDraft(profile.name ?? "");
  }
  const close = (next?: () => void) => {
    then.current = next ?? null;
    onOpenChange(false);
  };
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      onDismiss={() => {
        profile.rename(draft);
        then.current?.();
        then.current = null;
      }}
    >
      <View className="items-center pb-1">
        <Avatar name={draft || profile.name} size={80} />
      </View>
      <Input
        value={draft}
        onChangeText={setDraft}
        placeholder={t`Your name`}
        accessibilityLabel={t({ message: "Name", context: "person" })}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        maxLength={80}
        returnKeyType="done"
        onSubmitEditing={() => close()}
      />
      <SheetGroup>
        <SheetRow
          icon="camera"
          label={t`Take photo`}
          onPress={() => close(() => void profile.pick("camera"))}
        />
        <SheetRow
          icon="picture"
          label={t`Choose photo`}
          onPress={() => close(() => void profile.pick("library"))}
        />
        {profile.canRemove && (
          <SheetRow
            icon="removePhoto"
            label={t`Remove photo`}
            destructive
            onPress={() => close(profile.removePhoto)}
          />
        )}
      </SheetGroup>
    </Sheet>
  );
}
