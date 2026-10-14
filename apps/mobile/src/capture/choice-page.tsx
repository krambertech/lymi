import { useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { FormHeader } from "../ui/form-header";
import { KeyboardRoom } from "../ui/keyboard";
import { OnGlass } from "../ui/surface";

/** One of Add a word's choices, swapped in for the card inside the same sheet. phone.md "Add a word". */
export function ChoicePage({
  title,
  lead,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  /** Above the rows and outside their scroll, such as a search field. */
  lead?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useLingui();
  return (
    <KeyboardRoom>
      <OnGlass>
        <FormHeader
          close={{ label: t`Back`, icon: "back", onPress: onBack }}
          title={title}
          announce
        />
        {lead && <View className="px-4 pt-3">{lead}</View>}
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-3 px-4 pt-3 pb-8"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {children}
        </ScrollView>
      </OnGlass>
    </KeyboardRoom>
  );
}
