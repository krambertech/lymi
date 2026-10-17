import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

export function useAppleAvailable() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let live = true;
    if (Platform.OS === "ios") {
      void AppleAuthentication.isAvailableAsync()
        .then((value) => {
          if (live) setAvailable(value);
        })
        .catch(() => {
          if (live) setAvailable(false);
        });
    }
    return () => {
      live = false;
    };
  }, []);
  return available;
}

export async function requestAppleCredential() {
  const nonce = Crypto.randomUUID();
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce),
  });
  if (!credential.identityToken) throw new Error("Apple returned no identity token");
  return {
    token: credential.identityToken,
    nonce,
    user: {
      name: {
        firstName: credential.fullName?.givenName ?? "",
        lastName: credential.fullName?.familyName ?? "",
      },
    },
    authorizationCode: credential.authorizationCode,
  };
}

export function appleSignInCancelled(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ERR_REQUEST_CANCELED"
  );
}
