import { useLingui } from "@lingui/react/macro";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { Lantern } from "../brand/lantern";
import { usePalette } from "../theme/palette";
import { openWeb } from "../ui/on-the-web";
import { Button, Icon, Plate, Text } from "../ui/primitives";
import { Row, Rows } from "../ui/row";
import { AssistantOffer, useAssistantOffer } from "./assistant-offer";
import { trackGuide, useGuideSteps } from "./tracking";

interface Step {
  key: "deck" | "cards" | "review";
  title: string;
  line: string;
  action: string;
  onPress: () => void;
}

/** The rail's width: the lantern, and every step's number centred under it. */
const RAIL = 44;
const NUMBER = 28;
/** The lantern is drawn inside its box with room for its glow, so it is set larger than the rail. */
const LANTERN = 60;
/** The heading's two lines, which the lantern stands beside. */
const HEAD = 54;
/** A plate's 16 pt inset and half of text-md's 23 pt line, less half the number: it centres on the title. */
const CURRENT_DROP = 14;
/** text-base's line, which a later step's title centres on its number with. */
const LINE = 21;

/**
 * Today before the first review: three steps on one line that the flame lights down to the step the
 * learner is on, which is the one plate and holds its action. Each step is done by the learner's own
 * data. The web's `StartGuide`, drawn as a path. docs/design/onboarding.md.
 */
export function StartGuide({ decks, cards }: { decks: number; cards: number }) {
  const { t } = useLingui();
  const router = useRouter();
  const p = usePalette();
  const current = decks === 0 ? 0 : cards === 0 ? 1 : 2;
  useGuideSteps(current);
  const steps: Step[] = [
    {
      key: "deck",
      title: t`Make a deck`,
      line: t`Make one for each course or topic.`,
      action: t`New deck`,
      onPress: () => {
        trackGuide("create_deck");
        router.push("/new-deck");
      },
    },
    {
      key: "cards",
      title: t`Add cards from your last lesson`,
      line: t`Type them here, or send a lesson from your AI assistant.`,
      action: t`Add a card`,
      onPress: () => {
        trackGuide("typed");
        router.push("/capture");
      },
    },
    {
      key: "review",
      title: t`Review them`,
      line: t`Insights fill in from your first review.`,
      action: t`Review`,
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push("/review");
      },
    },
  ];
  const drop = (i: number) => (i === current ? CURRENT_DROP : 0);
  // A segment from one mark down to the next, lit as far as the step the learner is on. Plain
  // styles, since Uniwind's `absolute` class drops inline insets.
  const segment = (top: number, nextDrop: number, lit: boolean) => (
    <View
      accessibilityElementsHidden
      style={{
        position: "absolute",
        start: RAIL / 2 - 1,
        top,
        bottom: -nextDrop + 4,
        width: 2,
        borderRadius: 1,
        backgroundColor: lit ? p.amber : p["plate-2"],
      }}
    />
  );
  return (
    <View>
      <View className="flex-row items-start gap-3 pb-5">
        {segment(HEAD + 2, drop(0), true)}
        <View style={{ width: RAIL, height: HEAD }} className="items-center justify-center">
          <Lantern size={LANTERN} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="text-2xl font-medium text-text" accessibilityRole="header">
            {t`Getting started`}
          </Text>
          <Text className="text-base text-text-2" style={{ fontVariant: ["tabular-nums"] }}>
            {t`${current} of 3 done`}
          </Text>
        </View>
      </View>
      {steps.map((s, i) => {
        const state = i < current ? "done" : i === current ? "current" : "later";
        const last = i === steps.length - 1;
        return (
          <View key={s.key} className={`flex-row gap-3 ${last ? "" : "pb-5"}`}>
            {!last && segment(drop(i) + NUMBER + 4, drop(i + 1), i < current)}
            <View style={{ width: RAIL, paddingTop: drop(i) }} className="items-center">
              <StepNumber n={i + 1} state={state} />
            </View>
            <View className="flex-1">
              {state === "current" ? (
                <Plate className="gap-2 p-4">
                  <Text className="text-md font-medium text-text" accessibilityRole="header">
                    {s.title}
                  </Text>
                  <Text className="text-base text-text-2">{s.line}</Text>
                  <Button label={s.action} variant="primary" size="lg" onPress={s.onPress} />
                </Plate>
              ) : (
                <Text
                  className={`text-base ${state === "done" ? "text-muted" : "text-text-2"}`}
                  style={[
                    { paddingTop: (NUMBER - LINE) / 2 },
                    state === "done" && { textDecorationLine: "line-through" },
                  ]}
                  accessibilityLabel={state === "done" ? t`${s.title}, done` : s.title}
                >
                  {s.title}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function StepNumber({ n, state }: { n: number; state: "done" | "current" | "later" }) {
  const p = usePalette();
  if (state === "done") {
    return (
      <View
        className="items-center justify-center rounded-full bg-good"
        style={{ width: NUMBER, height: NUMBER }}
      >
        <Icon name="check" size={16} colour={p.canvas} strokeWidth={3} />
      </View>
    );
  }
  return (
    <View
      className="items-center justify-center rounded-full bg-canvas"
      style={{
        width: NUMBER,
        height: NUMBER,
        borderWidth: 1.5,
        borderColor: state === "current" ? p.text : p.edge,
      }}
    >
      <Text
        className={`text-sm font-semibold ${state === "current" ? "text-text" : "text-muted"}`}
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {n}
      </Text>
    </View>
  );
}

/**
 * Ways to bring what the learner already has, which stay on the web: an assistant, offered with its
 * marks until one is connected, and an import as a row that opens the web. ADR 0030.
 */
export function BringYourOwn() {
  const { t } = useLingui();
  const offer = useAssistantOffer();
  return (
    <View className="gap-3">
      <Text className="px-1 pt-2 text-lg font-medium text-text" accessibilityRole="header">
        {t`Bring what you have`}
      </Text>
      {offer && <AssistantOffer onConnect={() => trackGuide("ai_mcp")} />}
      <Rows>
        <Row
          icon="import"
          label={t`Import decks`}
          value={t`Anki, Mochi, Noji`}
          end="web"
          onPress={() => {
            trackGuide("import");
            void openWeb("/import");
          }}
        />
      </Rows>
    </View>
  );
}
