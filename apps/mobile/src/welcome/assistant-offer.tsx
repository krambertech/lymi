import { useLingui } from "@lingui/react/macro";
import { connectedAppsQuery } from "@lymi/client/queries";
import { useQuery } from "@tanstack/react-query";
import { type Href, useRouter } from "expo-router";
import { View } from "react-native";
import { ASSISTANTS } from "../apps/catalog";
import { AppGlyph } from "../apps/marks";
import { usePalette } from "../theme/palette";
import { Button, Plate, Press, Text } from "../ui/primitives";

/** The assistants the offer shows, in the order a learner is likeliest to have one. */
const SHOWN = ASSISTANTS.filter((a) => ["claude", "chatgpt", "gemini", "grok"].includes(a.key));

/** Whether to offer connecting an assistant: only once the connected apps are read and there are none. */
export function useAssistantOffer() {
  const apps = useQuery(connectedAppsQuery);
  return apps.isSuccess && apps.data.length === 0;
}

/**
 * The web's offer to connect an AI assistant, for a learner with none: each mark opens its page under
 * Apps, and Connect opens Apps. ADR 0030, docs/design/app-pages.md.
 */
export function AssistantOffer({ onConnect }: { onConnect: () => void }) {
  const { t } = useLingui();
  const p = usePalette();
  const router = useRouter();
  return (
    <Plate className="gap-3 p-4">
      <View className="flex-row">
        {SHOWN.map((a, i) => (
          <Press
            key={a.key}
            onPress={() => {
              onConnect();
              router.push(`/you/apps/${a.key}` as Href);
            }}
            accessibilityRole="link"
            accessibilityLabel={t`Connect ${a.app?.name ?? ""}`}
            style={{ marginStart: i === 0 ? -2 : -6, zIndex: SHOWN.length - i }}
          >
            {/* The plate's own colour around each tile cuts it out of the one it overlaps. */}
            <View style={{ borderRadius: 13, padding: 2, backgroundColor: p.plate }}>
              <View
                className="size-10 items-center justify-center border border-edge bg-plate"
                style={{ borderRadius: 11 }}
              >
                {a.app && <AppGlyph app={a.app} size={20} />}
              </View>
            </View>
          </Press>
        ))}
      </View>
      <View className="gap-0.5">
        <Text className="text-md font-medium text-text" accessibilityRole="header">
          {t`Connect your AI assistant`}
        </Text>
        <Text className="text-base text-text-2">
          {t`Ask Claude or ChatGPT to create cards and decks for you.`}
        </Text>
      </View>
      <Button
        label={t`Connect`}
        onPress={() => {
          onConnect();
          router.push("/you/apps");
        }}
      />
    </Plate>
  );
}
