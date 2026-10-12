import { useLingui } from "@lingui/react/macro";
import { ApiError, api } from "@lymi/client/api";
import { avatarQuery, meQuery } from "@lymi/client/queries";
import { NameInput } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useSession } from "../../../auth/client";
import { Field, FieldError, FieldLabel, Input } from "../../../ui/field";
import { GlassButton } from "../../../ui/glass";
import { DropdownMenu, type MenuItem } from "../../../ui/menu";
import { Press, Text } from "../../../ui/primitives";
import { OnGlass } from "../../../ui/surface";
import { Avatar } from "../../../you/avatar";

/** The learner's name and photo. A photo change saves at once, as on the web; the name on Save. */
export default function Profile() {
  const { t } = useLingui();
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSession().data?.user;
  const me = useQuery(meQuery).data ?? session;
  const avatar = useQuery(avatarQuery);
  const [name, setName] = useState(me?.name ?? "");
  const [invalid, setInvalid] = useState<string | null>(null);

  const rename = useMutation({
    mutationFn: (next: string) => api.rename(next),
    onSuccess: (saved) => {
      queryClient.setQueryData(meQuery.queryKey, saved);
      router.back();
    },
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
    const image = await (await fetch(asset.uri)).blob();
    photo.mutate({ image });
  };

  const save = () => {
    const parsed = NameInput.safeParse({ name });
    if (!parsed.success) {
      setInvalid(name.trim() ? t`Keep your name under 80 characters.` : t`Write your name.`);
      return;
    }
    setInvalid(null);
    if (parsed.data.name === me?.name) return router.back();
    rename.mutate(parsed.data.name);
  };

  const items: MenuItem[] = [
    { label: t`Take photo`, icon: "camera", onSelect: () => void pick("camera") },
    { label: t`Choose photo`, icon: "picture", onSelect: () => void pick("library") },
  ];
  if (avatar.data?.source === "custom") {
    items.push({
      label: t`Remove photo`,
      icon: "removePhoto",
      destructive: true,
      onSelect: () => photo.mutate("remove"),
    });
  }

  return (
    <OnGlass>
      <View className="flex-1 pb-6">
        <View className="flex-row items-center justify-between px-4 pt-5 pb-2">
          <GlassButton icon="close" label={t`Cancel`} onPress={() => router.back()} />
          <GlassButton
            icon="check"
            label={t`Save`}
            primary
            busy={rename.isPending}
            onPress={save}
          />
        </View>
        <View className="gap-6 px-5 pt-1">
          <View className="items-center gap-3">
            <Avatar name={name || me?.name} size={96} pending={photo.isPending} />
            <DropdownMenu
              items={items}
              trigger={(open) => (
                <Press
                  onPress={open}
                  disabled={photo.isPending}
                  accessibilityRole="button"
                  hitSlop={8}
                  className="px-3 py-1.5"
                >
                  <Text className="text-md font-medium text-text">{t`Change photo`}</Text>
                </Press>
              )}
            />
            {photo.isError && (
              <Text className="text-center text-base text-danger" accessibilityLiveRegion="polite">
                {photo.error instanceof ApiError && photo.error.status === 409
                  ? t`Your photo changed on another device. Try again.`
                  : t`Couldn’t change your photo. Check your connection and try again.`}
              </Text>
            )}
          </View>
          <Field disabled={rename.isPending}>
            <FieldLabel>{t({ message: "Name", context: "person" })}</FieldLabel>
            <Input
              value={name}
              onChangeText={(text) => {
                setName(text);
                setInvalid(null);
              }}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="done"
              onSubmitEditing={save}
              maxLength={80}
            />
            <FieldError>
              {invalid ??
                (rename.isError
                  ? t`Couldn’t save your name. Check your connection and try again.`
                  : null)}
            </FieldError>
          </Field>
        </View>
      </View>
    </OnGlass>
  );
}
