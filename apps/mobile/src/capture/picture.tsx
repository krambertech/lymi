import { useLingui } from "@lingui/react/macro";
import { imageLimits } from "@lymi/core";
import * as ImagePicker from "expo-image-picker";
import { Image, TextInput, View } from "react-native";
import { usePalette } from "../theme/palette";
import { inputCap } from "../theme/type";
import { SheetGroup, SheetRow } from "../ui/sheet";
import type { Picture } from "./model";

interface PictureChoicesProps {
  value: Picture | null;
  onChange: (value: Picture | null) => void;
}

/**
 * The card's picture, taken or chosen, then described without naming the answer, which is what a
 * screen reader says and what review shows if it cannot load. It is uploaded after the card is added.
 */
export function PictureChoices({ value, onChange }: PictureChoicesProps) {
  const { t } = useLingui();
  const p = usePalette();
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
          <Image
            source={{ uri: value.uri }}
            className="h-44 w-full rounded-xl"
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
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
