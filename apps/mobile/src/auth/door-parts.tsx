import { MIN_PASSWORD_LENGTH } from "@lymi/core";
import { type ReactNode, useEffect, useRef } from "react";
import { type TextInput, View, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  Keyframe,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { Lantern } from "../brand/lantern";
import { useReduceMotion } from "../theme/motion";
import { usePalette } from "../theme/palette";
import { Field } from "../ui/field";
import { GoogleMark } from "../ui/google-mark";
import { Button, Icon, Press, Text } from "../ui/primitives";
import { devSignIn, type SignIn, type Step } from "./use-sign-in";

type EmailStep = Exclude<Step, "doors">;

const HEADINGS: Record<EmailStep, { title: string; line?: string }> = {
  "sign-in": { title: "Sign in to Lymi", line: "Welcome back." },
  "sign-up": { title: "Create your Lymi account", line: "Lymi is free to use." },
  code: { title: "Check your inbox" },
  forgot: { title: "Reset your password", line: "We’ll email you a link to set a new one." },
};

/** A card's arrival from motion.md: a 6 px rise over 200 ms; under reduced motion, a fade. */
export function useArrival() {
  const reduce = useReduceMotion();
  return (delay = 0) =>
    reduce
      ? FadeIn.duration(150)
      : new Keyframe({
          0: { opacity: 0, transform: [{ translateY: 6 }] },
          100: { opacity: 1, transform: [{ translateY: 0 }], easing: Easing.out(Easing.cubic) },
        })
          .duration(200)
          .delay(delay);
}

/** The warm pool the lantern throws on the room, as on Today. It blooms as the room is lit. */
export function Pool({ className }: { className: string }) {
  const p = usePalette();
  const reduce = useReduceMotion();
  const lit = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    lit.value = withDelay(80, withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) }));
  }, [lit]);
  const style = useAnimatedStyle(() => ({ opacity: lit.value }));
  return (
    <Animated.View
      pointerEvents="none"
      className={`absolute ${className}`}
      style={[
        {
          experimental_backgroundImage: `radial-gradient(closest-side at 50% 50%, ${p.pool}, transparent 100%)`,
        } as ViewStyle,
        style,
      ]}
    />
  );
}

/** The brand moment: the lantern, the name, and why an account is worth having. */
export function Brand() {
  const arrive = useArrival();
  return (
    <View className="items-center gap-3">
      <Animated.View entering={arrive(80)}>
        <Lantern size={150} />
      </Animated.View>
      <Animated.View entering={arrive(160)} className="items-center gap-2">
        <Text
          className="text-4xl font-medium text-text"
          style={{ letterSpacing: -1 }}
          accessibilityRole="header"
        >
          Lymi
        </Text>
        <Text className="text-center text-md text-text-2">
          Your cards and your streak, on every device.
        </Text>
      </Animated.View>
    </View>
  );
}

/** Two equal ways in, each with the stronger edge the web gives Google, and a door for someone new. */
export function DoorButtons({ door, open }: { door: SignIn; open: (step: EmailStep) => void }) {
  const arrive = useArrival();
  return (
    <View className="gap-3">
      <Animated.View entering={arrive(280)}>
        <Button
          label="Continue with Google"
          size="lg"
          strong
          lead={<GoogleMark size={20} />}
          loading={door.pending === "google"}
          onPress={door.google}
        />
      </Animated.View>
      {door.errors.google && <Alert>{door.errors.google}</Alert>}
      <Animated.View entering={arrive(340)}>
        <Button
          label="Sign in with email"
          icon="email"
          size="lg"
          strong
          onPress={() => open("sign-in")}
        />
      </Animated.View>
      <Animated.View entering={arrive(400)} className="gap-3 pt-3">
        <View className="flex-row items-center gap-3" accessibilityElementsHidden>
          <View className="h-px flex-1 bg-edge" />
          <Text className="text-sm text-muted">New to Lymi?</Text>
          <View className="h-px flex-1 bg-edge" />
        </View>
        <Button label="Create an account" size="lg" onPress={() => open("sign-up")} />
      </Animated.View>
    </View>
  );
}

/**
 * One email step, top-aligned: its title, then its form, then how to switch. A new step's parts
 * rise in 50 ms apart; the old step goes at once, so nothing overlaps or shifts.
 */
export function EmailContent({ door }: { door: SignIn }) {
  const arrive = useArrival();
  const step = (door.step === "doors" ? "sign-in" : door.step) as EmailStep;
  const heading = HEADINGS[step];
  return (
    <View key={step} className="gap-6">
      <Animated.View entering={arrive(0)} className="gap-1">
        <Text className="text-3xl font-medium text-text" accessibilityRole="header">
          {heading.title}
        </Text>
        <Text className="text-md text-text-2">
          {step === "code"
            ? `Enter the 6-digit code we sent to ${door.email.trim()}.`
            : heading.line}
        </Text>
      </Animated.View>
      {door.notice && <NoticeBlock notice={door.notice} />}
      {door.errors.form && <Alert>{door.errors.form}</Alert>}
      <Animated.View entering={arrive(50)}>
        {step === "code" ? (
          <CodeForm door={door} />
        ) : !(step === "forgot" && door.notice) ? (
          <CredentialForm door={door} />
        ) : null}
      </Animated.View>
      <Animated.View entering={arrive(100)}>
        <SwitchLinks door={door} step={step} />
      </Animated.View>
    </View>
  );
}

/** How to switch between having an account and making one, and back from a side step. */
function SwitchLinks({ door, step }: { door: SignIn; step: EmailStep }) {
  const link =
    step === "sign-up"
      ? { lead: "Have an account?", label: "Sign in", to: "sign-in" as const }
      : step === "code" || step === "forgot"
        ? { lead: null, label: "Back to sign in", to: "sign-in" as const }
        : { lead: "New to Lymi?", label: "Create an account", to: "sign-up" as const };
  return (
    <View className="items-center">
      <View className="flex-row flex-wrap items-center justify-center gap-1">
        {link.lead && <Text className="text-base text-muted">{link.lead}</Text>}
        <Press
          onPress={() => door.goTo(link.to)}
          haptic={false}
          className="py-2"
          accessibilityRole="button"
        >
          <Text className="text-base font-medium text-text">{link.label}</Text>
        </Press>
      </View>
    </View>
  );
}

/** Local development only: a persona without a password. */
export function DevSignIn() {
  if (!__DEV__) return null;
  return (
    <Press onPress={() => devSignIn()} haptic={false} className="self-center px-2 py-2">
      <Text className="text-xs text-faint">Dev sign-in as learner</Text>
    </Press>
  );
}

function CredentialForm({ door }: { door: SignIn }) {
  const p = usePalette();
  const passwordRef = useRef<TextInput>(null);
  const step = door.step === "doors" ? "sign-in" : door.step;
  const forgot = step === "forgot";
  return (
    <View className="gap-4">
      <Field
        label="Email"
        value={door.email}
        onChangeText={door.setEmail}
        error={door.errors.email}
        keyboardType="email-address"
        textContentType={step === "sign-up" ? "emailAddress" : "username"}
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={!door.email}
        returnKeyType={forgot ? "send" : "next"}
        onSubmitEditing={() => (forgot ? door.submit() : passwordRef.current?.focus())}
      />
      {!forgot && (
        <View className="gap-1">
          <Field
            ref={passwordRef}
            label="Password"
            secret
            value={door.password}
            onChangeText={door.setPassword}
            error={door.errors.password}
            hint={step === "sign-up" ? `At least ${MIN_PASSWORD_LENGTH} characters.` : undefined}
            textContentType={step === "sign-up" ? "newPassword" : "password"}
            autoComplete={step === "sign-up" ? "new-password" : "current-password"}
            returnKeyType="go"
            onSubmitEditing={door.submit}
          />
          {step === "sign-in" && (
            <Press
              onPress={() => door.goTo("forgot")}
              haptic={false}
              className="-me-1 self-end px-1 py-2"
              accessibilityRole="button"
            >
              <Text className="text-base text-muted" style={{ textDecorationColor: p["edge-2"] }}>
                Forgot your password?
              </Text>
            </Press>
          )}
        </View>
      )}
      <Button
        label={forgot ? "Send reset link" : step === "sign-up" ? "Create account" : "Sign in"}
        variant="primary"
        size="lg"
        loading={door.pending === "form"}
        onPress={door.submit}
      />
    </View>
  );
}

function CodeForm({ door }: { door: SignIn }) {
  return (
    <View className="gap-4">
      <Field
        label="Code"
        value={door.code}
        onChangeText={door.setCode}
        error={door.errors.code}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={door.submit}
      />
      <Button
        label="Confirm"
        variant="primary"
        size="lg"
        loading={door.pending === "form"}
        onPress={door.submit}
      />
      <Button
        label="Send a new code"
        variant="ghost"
        loading={door.pending === "resend"}
        onPress={door.resend}
      />
    </View>
  );
}

function NoticeBlock({ notice }: { notice: NonNullable<SignIn["notice"]> }) {
  const p = usePalette();
  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      className="flex-row gap-3 rounded-md bg-good-soft p-4"
      accessibilityLiveRegion="polite"
    >
      <Icon name="email" size={20} colour={p.good} />
      <View className="flex-1 gap-1">
        <Text className="text-md font-medium text-text">{notice.title}</Text>
        <Text className="text-base text-text-2">{notice.body}</Text>
      </View>
    </Animated.View>
  );
}

function Alert({ children }: { children: ReactNode }) {
  const p = usePalette();
  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      className="flex-row items-start gap-2.5 rounded-md bg-danger-soft px-3.5 py-3"
      accessibilityRole="alert"
    >
      <View className="pt-0.5">
        <Icon name="alert" size={16} colour={p.danger} />
      </View>
      <Text className="flex-1 text-base text-text">{children}</Text>
    </Animated.View>
  );
}
