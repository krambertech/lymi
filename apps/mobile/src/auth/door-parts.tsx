import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { MIN_PASSWORD_LENGTH } from "@lymi/core";
import { openBrowserAsync } from "expo-web-browser";
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
import { useLandingSpot } from "../splash/landing";
import { useReduceMotion } from "../theme/motion";
import { clear, usePalette } from "../theme/palette";
import { AppleMark } from "../ui/apple-mark";
import { Field, FieldDescription, FieldError, FieldLabel, Input, PasswordInput } from "../ui/field";
import { GoogleMark } from "../ui/google-mark";
import { Button, Icon, Press, Text } from "../ui/primitives";
import { API_URL, localizedSiteUrl } from "./client";
import { devSignIn, type SignIn, type Step } from "./use-sign-in";

type EmailStep = Exclude<Step, "doors">;

const HEADINGS: Record<EmailStep, { title: MessageDescriptor; line?: MessageDescriptor }> = {
  "sign-in": { title: msg`Sign in to Lymi`, line: msg`Welcome back.` },
  "sign-up": { title: msg`Create your Lymi account`, line: msg`Lymi is free to use.` },
  code: { title: msg`Check your inbox` },
  forgot: { title: msg`Reset your password`, line: msg`We’ll email you a link to set a new one.` },
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
          experimental_backgroundImage: `radial-gradient(closest-side at 50% 50%, ${p["lantern-pool"]}, ${clear(p["lantern-pool"])} 100%)`,
        } as ViewStyle,
        style,
      ]}
    />
  );
}

/** The brand moment: the lantern, the name, and why an account is worth having. */
export function Brand() {
  const { t } = useLingui();
  const arrive = useArrival();
  const spot = useLandingSpot("welcome", 150);
  return (
    <View className="items-center gap-3">
      {/* Measured outside its rise, so the splash lands where the lantern settles. */}
      <View ref={spot.ref} onLayout={spot.onLayout} style={spot.style}>
        <Animated.View entering={arrive(80)}>
          <Lantern size={150} />
        </Animated.View>
      </View>
      <Animated.View entering={arrive(160)} className="items-center gap-2">
        <Text
          className="text-4xl font-medium text-ink"
          style={{ letterSpacing: -1 }}
          accessibilityRole="header"
        >
          Lymi
        </Text>
        <Text className="text-center text-md text-ink-secondary">
          {t`Your cards and your streak, on every device.`}
        </Text>
      </Animated.View>
    </View>
  );
}

/** The available providers, email sign-in, and a door for someone new. */
export function DoorButtons({ door, open }: { door: SignIn; open: (step: EmailStep) => void }) {
  const { t } = useLingui();
  const arrive = useArrival();
  return (
    <View className="gap-3">
      {door.appleAvailable && (
        <Animated.View entering={arrive(220)}>
          <Button
            label={t`Continue with Apple`}
            size="lg"
            strong
            lead={<AppleMark size={20} />}
            loading={door.pending === "apple"}
            disabled={Boolean(door.pending && door.pending !== "apple")}
            onPress={door.apple}
          />
        </Animated.View>
      )}
      <Animated.View entering={arrive(280)}>
        <Button
          label={t`Continue with Google`}
          size="lg"
          strong
          lead={<GoogleMark size={20} />}
          loading={door.pending === "google"}
          disabled={Boolean(door.pending && door.pending !== "google")}
          onPress={door.google}
        />
      </Animated.View>
      {door.errors.social && <Alert>{door.errors.social}</Alert>}
      <Animated.View entering={arrive(340)}>
        <Button
          label={t`Sign in with email`}
          icon="email"
          size="lg"
          strong
          onPress={() => open("sign-in")}
        />
      </Animated.View>
      <Animated.View entering={arrive(400)} className="gap-3 pt-3">
        <View className="flex-row items-center gap-3" accessibilityElementsHidden>
          <View className="h-px flex-1 bg-edge" />
          <Text className="text-sm text-ink-muted">{t`New to Lymi?`}</Text>
          <View className="h-px flex-1 bg-edge" />
        </View>
        <Button label={t`Create an account`} size="lg" onPress={() => open("sign-up")} />
      </Animated.View>
    </View>
  );
}

/** The privacy policy, reachable before there is an account, in the app's language. */
export function PrivacyLink() {
  const { t, i18n } = useLingui();
  const arrive = useArrival();
  return (
    <Animated.View entering={arrive(460)} className="items-center">
      <Press
        onPress={() => void openBrowserAsync(localizedSiteUrl("/privacy", i18n.locale))}
        haptic={false}
        className="min-h-11 justify-center px-2"
        accessibilityRole="link"
      >
        <Text className="text-sm text-ink-muted">{t`Privacy policy`}</Text>
      </Press>
    </Animated.View>
  );
}

/**
 * One email step, top-aligned: its title, then its form, then how to switch. A new step's parts
 * rise in 50 ms apart; the old step goes at once, so nothing overlaps or shifts.
 */
export function EmailContent({ door }: { door: SignIn }) {
  const { t, i18n } = useLingui();
  const arrive = useArrival();
  const step = (door.step === "doors" ? "sign-in" : door.step) as EmailStep;
  const heading = HEADINGS[step];
  const email = door.email.trim();
  return (
    <View key={step} className="gap-6">
      <Animated.View entering={arrive(0)} className="gap-1">
        <Text className="text-3xl font-medium text-ink" accessibilityRole="header">
          {i18n._(heading.title)}
        </Text>
        <Text className="text-md text-ink-secondary">
          {step === "code"
            ? t`Enter the 6-digit code we sent to ${email}.`
            : heading.line && i18n._(heading.line)}
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
  const { t } = useLingui();
  const link =
    step === "sign-up"
      ? { lead: t`Have an account?`, label: t`Sign in`, to: "sign-in" as const }
      : step === "code" || step === "forgot"
        ? { lead: null, label: t`Back to sign in`, to: "sign-in" as const }
        : { lead: t`New to Lymi?`, label: t`Create an account`, to: "sign-up" as const };
  return (
    <View className="items-center">
      <View className="flex-row flex-wrap items-center justify-center gap-1">
        {link.lead && <Text className="text-base text-ink-muted">{link.lead}</Text>}
        <Press
          onPress={() => door.goTo(link.to)}
          haptic={false}
          className="py-2"
          accessibilityRole="button"
        >
          <Text className="text-base font-medium text-ink">{link.label}</Text>
        </Press>
      </View>
    </View>
  );
}

/** A Worker on this Mac, which alone answers the dev routes; a Release build pointed at one keeps them, to profile. */
const LOCAL_WORKER = /^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(API_URL);

/** Local development only: a persona without a password, or an empty account that starts at Welcome. */
export function DevSignIn() {
  if (!__DEV__ && !LOCAL_WORKER) return null;
  return (
    <View className="flex-row flex-wrap justify-center gap-2">
      <Press onPress={() => devSignIn()} haptic={false} className="px-2 py-2">
        <Text className="text-xs text-ink-faint">Dev sign-in as learner</Text>
      </Press>
      <Press onPress={() => devSignIn("heavy")} haptic={false} className="px-2 py-2">
        <Text className="text-xs text-ink-faint">Dev sign-in as heavy</Text>
      </Press>
      <Press onPress={() => devSignIn("fresh", true)} haptic={false} className="px-2 py-2">
        <Text className="text-xs text-ink-faint">Dev sign-up as new</Text>
      </Press>
    </View>
  );
}

function CredentialForm({ door }: { door: SignIn }) {
  const { t } = useLingui();
  const p = usePalette();
  const passwordRef = useRef<TextInput>(null);
  const step = door.step === "doors" ? "sign-in" : door.step;
  const forgot = step === "forgot";
  return (
    <View className="gap-4">
      <Field>
        <FieldLabel>{t`Email`}</FieldLabel>
        <Input
          testID="email"
          value={door.email}
          onChangeText={door.setEmail}
          keyboardType="email-address"
          textContentType={step === "sign-up" ? "emailAddress" : "username"}
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={!door.email}
          returnKeyType={forgot ? "send" : "next"}
          onSubmitEditing={() => (forgot ? door.submit() : passwordRef.current?.focus())}
        />
        <FieldError>{door.errors.email}</FieldError>
      </Field>
      {!forgot && (
        <View className="gap-1">
          <Field>
            <FieldLabel>{t`Password`}</FieldLabel>
            <PasswordInput
              ref={passwordRef}
              testID="password"
              value={door.password}
              onChangeText={door.setPassword}
              textContentType={step === "sign-up" ? "newPassword" : "password"}
              autoComplete={step === "sign-up" ? "new-password" : "current-password"}
              returnKeyType="go"
              onSubmitEditing={door.submit}
            />
            {step === "sign-up" && (
              <FieldDescription>{t`At least ${MIN_PASSWORD_LENGTH} characters.`}</FieldDescription>
            )}
            <FieldError>{door.errors.password}</FieldError>
          </Field>
          {step === "sign-in" && (
            <Press
              onPress={() => door.goTo("forgot")}
              haptic={false}
              className="-me-1 self-end px-1 py-2"
              accessibilityRole="button"
            >
              <Text
                className="text-base text-ink-muted"
                style={{ textDecorationColor: p["edge-strong"] }}
              >
                {t`Forgot your password?`}
              </Text>
            </Press>
          )}
        </View>
      )}
      <Button
        label={forgot ? t`Send reset link` : step === "sign-up" ? t`Create account` : t`Sign in`}
        variant="primary"
        size="lg"
        loading={door.pending === "form"}
        onPress={door.submit}
      />
    </View>
  );
}

function CodeForm({ door }: { door: SignIn }) {
  const { t } = useLingui();
  return (
    <View className="gap-4">
      <Field>
        <FieldLabel>{t`Code`}</FieldLabel>
        <Input
          value={door.code}
          onChangeText={door.setCode}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={door.submit}
        />
        <FieldError>{door.errors.code}</FieldError>
      </Field>
      <Button
        label={t`Confirm`}
        variant="primary"
        size="lg"
        loading={door.pending === "form"}
        onPress={door.submit}
      />
      <Button
        label={t`Send a new code`}
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
      className="flex-row gap-3 rounded-md bg-success-soft p-4"
      accessibilityLiveRegion="polite"
    >
      <Icon name="email" size={20} colour={p.success} />
      <View className="flex-1 gap-1">
        <Text className="text-md font-medium text-ink">{notice.title}</Text>
        <Text className="text-base text-ink-secondary">{notice.body}</Text>
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
      <Text className="flex-1 text-base text-ink">{children}</Text>
    </Animated.View>
  );
}
