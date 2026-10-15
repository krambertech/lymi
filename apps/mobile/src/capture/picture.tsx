import { useLingui } from "@lingui/react/macro";
import { imageLimits, revealsAnswer } from "@lymi/core";
import * as ImagePicker from "expo-image-picker";
import { Image, TextInput, View } from "react-native";
import { useSessionHeaders } from "../auth/client";
import { usePalette } from "../theme/palette";
import { inputCap } from "../theme/type";
import { SheetError, SheetGroup, SheetRow } from "../ui/sheet";
import type { Picture } from "./model";

interface PictureChoicesProps {
  value: Picture | null;
  onChange: (value: Picture | null) => void;
  /** The card the picture is for, whose term and meaning the description must not name. */
  card: { term: string; meaning: string };
}

/** Whether a picture's description gives the answer away, which the server refuses. ADR 0014. */
export function describesAnswer(card: { term: string; meaning: string }, picture: Picture | null) {
  const description = picture?.description.trim();
  return !!description && revealsAnswer(card, description);
}

/**
 * The card's picture, taken or chosen, then described without naming the answer, which is what a
 * screen reader says and what review shows if it cannot load. It is uploaded after the card is added.
 */
export function PictureChoices({ value, onChange, card }: PictureChoicesProps) {
  const { t } = useLingui();
  const p = usePalette();
  // The card's own picture is read from the server, which needs the session.
  const headers = useSessionHeaders();
  const pick = async (from: "camera" | "library") => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      // A JPEG rather than HEIC, which the server cannot read.
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    };
    if (from === "camera") {
      const allowed = await ImagePicker.requestCameraPermissionsAsync();
      if (!allowed.granted) return;
    }
    const result =
      from === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    onChange({
      uri: asset.uri,
      name: asset.fileName ?? "picture.jpg",
      type: asset.mimeType ?? "image/jpeg",
      description: value?.description ?? "",
    });
  };
  return (
    <>
      {value && (
        <View className="gap-3">
          {/* Asked for only with the session, since an image that failed once is not asked for again. */}
          {value.kept && !headers ? (
            <View className="h-44 w-full rounded-xl bg-glass-group" />
          ) : (
            <Image
              source={{ uri: value.uri, ...(value.kept && headers ? { headers } : {}) }}
              className="h-44 w-full rounded-xl"
              resizeMode={value.kept ? "contain" : "cover"}
              accessibilityIgnoresInvertColors
            />
          )}
          <View className="rounded-xl bg-glass-group px-4">
            <TextInput
              value={value.description}
              maxLength={imageLimits.description ?? undefined}
              onChangeText={(description) => onChange({ ...value, description })}
              placeholder={t`Describe what the picture shows without naming the term or the meaning.`}
              placeholderTextColor={p.muted}
              accessibilityLabel={t`Description`}
              multiline
              submitBehavior="blurAndSubmit"
              returnKeyType="done"
              selectionColor={p.text}
              className="min-h-20 py-3 font-sans text-text"
              style={{ fontSize: 17, textAlignVertical: "top" }}
              maxFontSizeMultiplier={inputCap(17)}
            />
          </View>
          {describesAnswer(card, value) && (
            <SheetError>{t`Describe what the picture shows without naming the term or the meaning.`}</SheetError>
          )}
        </View>
      )}
      <SheetGroup>
        <SheetRow label={t`Take a photo`} icon="camera" onPress={() => void pick("camera")} />
        <SheetRow
          label={value ? t`Choose another` : t`Choose from photos`}
          icon="picture"
          onPress={() => void pick("library")}
        />
      </SheetGroup>
      {value && (
        <SheetGroup>
          <SheetRow
            label={t`Clear the picture`}
            icon="close"
            destructive
            onPress={() => onChange(null)}
          />
        </SheetGroup>
      )}
    </>
  );
}
