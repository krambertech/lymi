import { MIN_PASSWORD_LENGTH } from "@lymi/core";
import { type ReactNode, useRef } from "react";
import { ScrollView, type TextInput, View, type ViewStyle } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { devSignIn, type SignIn, type Step, useSignIn } from "../auth/use-sign-in";
import { Lantern } from "../brand/lantern";
import { usePalette } from "../theme/palette";
import { Field } from "../ui/field";
import { GoogleMark } from "../ui/google-mark";
import { Button, Icon, Press, Text } from "../ui/primitives";

const HEADINGS: Record<Exclude<Step, "doors">, { title: string; line?: string }> = {
  "sign-in": { title: "Sign in to Lymi", line: "Welcome back." },
  "sign-up": { title: "Create your Lymi account", line: "Lymi is free to use." },
  code: { title: "Check your inbox" },
  forgot: { title: "Reset your password", line: "We’ll email you a link to set a new one." },
};

/**
 * The lit room and two ways in under the thumb. Email opens its form in place, so the lantern
 * stays where it was and the keyboard has the bottom of the screen.
 */
export default function SignInScreen() {
  const door = useSignIn();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const atDoors = door.step === "doors";
  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerClassName="flex-grow px-5"
      contentContainerStyle={{ paddingTop: insets.top + 40, paddingBottom: insets.bottom + 16 }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <View className={`items-center gap-3 ${atDoors ? "pt-10" : "pb-2"}`}>
        <Pool />
        <Lantern size={atDoors ? 150 : 88} />
        <Text
          className={`${atDoors ? "text-4xl" : "text-3xl"} font-medium text-text`}
          style={{ letterSpacing: -1 }}
          accessibilityRole={atDoors ? "header" : "text"}
        >
          Lymi
        </Text>
      </View>
      <View className="flex-1" />
      <Animated.View
        key={door.step}
        entering={reduce ? undefined : FadeIn.duration(200)}
        className="gap-6 pt-8"
      >
        {atDoors ? <Doors door={door} /> : <EmailStep door={door} />}
      </Animated.View>
      <Footer door={door} />
    </ScrollView>
  );
}

/** The warm pool the lantern throws on the room, as on Today. */
function Pool() {
  const p = usePalette();
  return (
    <View
      pointerEvents="none"
      className="absolute -inset-x-5 -top-60 bottom-0"
      style={
        {
          experimental_backgroundImage: `radial-gradient(closest-side at 50% 52%, ${p.pool}, transparent 100%)`,
        } as ViewStyle
      }
    />
  );
}

/** Two equal ways in, each with the stronger edge the web gives Google, and a door for someone new. */
function Doors({ door }: { door: SignIn }) {
  return (
    <View className="gap-3">
      <Button
        label="Continue with Google"
        size="lg"
        strong
        lead={<GoogleMark size={20} />}
        loading={door.pending === "google"}
        onPress={door.google}
      />
      {door.errors.google && <Alert>{door.errors.google}</Alert>}
      <Button
        label="Sign in with email"
        icon="email"
        size="lg"
        strong
        onPress={() => door.goTo("sign-in")}
      />
      <View className="flex-row items-center gap-3 pt-3" accessibilityElementsHidden>
        <View className="h-px flex-1 bg-edge" />
        <Text className="text-sm text-muted">New to Lymi?</Text>
        <View className="h-px flex-1 bg-edge" />
      </View>
      <Button label="Create an account" size="lg" onPress={() => door.goTo("sign-up")} />
    </View>
  );
}

function EmailStep({ door }: { door: SignIn }) {
  const step = door.step as Exclude<Step, "doors">;
  const heading = HEADINGS[step];
  return (
    <>
      <View className="items-center gap-1">
        <Text className="text-center text-2xl font-medium text-text" accessibilityRole="header">
          {heading.title}
        </Text>
        <Text className="text-center text-md text-text-2">
          {step === "code"
            ? `Enter the 6-digit code we sent to ${door.email.trim()}.`
            : heading.line}
        </Text>
      </View>
      {door.notice && <NoticeBlock notice={door.notice} />}
      {door.errors.form && <Alert>{door.errors.form}</Alert>}
      {step === "code" ? (
        <CodeForm door={door} />
      ) : !(step === "forgot" && door.notice) ? (
        <CredentialForm door={door} />
      ) : null}
      {(step === "sign-in" || step === "sign-up") && (
        <Button label="Other ways to sign in" variant="ghost" onPress={() => door.goTo("doors")} />
      )}
    </>
  );
}

function CredentialForm({ door }: { door: SignIn }) {
  const p = usePalette();
  const passwordRef = useRef<TextInput>(null);
  const { step } = door;
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
    <View className="flex-row gap-3 rounded-md bg-good-soft p-4" accessibilityLiveRegion="polite">
      <Icon name="email" size={20} colour={p.good} />
      <View className="flex-1 gap-1">
        <Text className="text-md font-medium text-text">{notice.title}</Text>
        <Text className="text-base text-text-2">{notice.body}</Text>
      </View>
    </View>
  );
}

function Alert({ children }: { children: ReactNode }) {
  const p = usePalette();
  return (
    <View
      className="flex-row items-start gap-2.5 rounded-md bg-danger-soft px-3.5 py-3"
      accessibilityRole="alert"
    >
      <View className="pt-0.5">
        <Icon name="alert" size={16} colour={p.danger} />
      </View>
      <Text className="flex-1 text-base text-text">{children}</Text>
    </View>
  );
}

/** How to switch between having an account and making one, and back from a side step. */
function Footer({ door }: { door: SignIn }) {
  const { step } = door;
  // The doors carry Create account as a door of its own.
  const hidden = step === "doors";
  const link =
    step === "sign-up"
      ? { lead: "Have an account?", label: "Sign in", to: "sign-in" as const }
      : step === "code" || step === "forgot"
        ? { lead: null, label: "Back to sign in", to: "sign-in" as const }
        : { lead: "New to Lymi?", label: "Create an account", to: "sign-up" as const };
  return (
    <View className="items-center gap-1 pt-6">
      {!hidden && (
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
      )}
      {__DEV__ && (
        <Press onPress={() => devSignIn()} haptic={false} className="px-2 py-2">
          <Text className="text-xs text-faint">Dev sign-in as learner</Text>
        </Press>
      )}
    </View>
  );
}
