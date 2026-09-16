import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, passwordProblem, passwordStrength } from "./passwords";

const LEARNER = "ada.lovelace@example.com";

describe("what Lymi asks of a password", () => {
  it("takes a long passphrase with no symbols in it", () => {
    expect(passwordProblem("thunder oyster lamp", LEARNER)).toBeNull();
    expect(passwordStrength("thunder oyster lamp", LEARNER)).toBe("strong");
  });

  it("measures length, not a shape", () => {
    expect(passwordProblem("a".repeat(MIN_PASSWORD_LENGTH - 1), LEARNER)).toBe("too-short");
    expect(passwordProblem("x".repeat(129), LEARNER)).toBe("too-long");
    // No composition rule: lowercase letters alone are fine once there are enough of them.
    expect(passwordProblem("thunderoysterlamp", LEARNER)).toBeNull();
  });

  it("refuses the guesses an attacker opens with, however they are dressed up", () => {
    for (const password of [
      "password123",
      "qwerty12345",
      "P@ssw0rd!!",
      "letmein1111",
      "iloveyou123",
      "aaaaaaaaaaaa",
    ]) {
      expect(passwordProblem(password, LEARNER), password).toBe("too-common");
    }
  });

  it("refuses a password built from the address it protects", () => {
    expect(passwordProblem("ada.lovelace99", LEARNER)).toBe("from-address");
    expect(passwordProblem("my-lovelace-one", LEARNER)).toBe("from-address");
    expect(passwordProblem("example-and-more", LEARNER)).toBe("from-address");
    // A two-letter fragment is too short to mean anything, so it does not count.
    expect(passwordProblem("thunder oyster lamp", "ad@example.com")).toBeNull();
  });

  it("refuses a password built from the word Lymi", () => {
    expect(passwordProblem("lymi-forever-1", LEARNER)).toBe("from-lymi");
    expect(passwordProblem("LYMI-is-great", LEARNER)).toBe("from-lymi");
  });

  it("checks nothing about an address it was not given", () => {
    expect(passwordProblem("thunder oyster lamp")).toBeNull();
  });

  it("rates a password by the room it leaves a guesser", () => {
    expect(passwordStrength("password123", LEARNER)).toBe("weak");
    expect(passwordStrength("thunder-42x", LEARNER)).toBe("fair");
    expect(passwordStrength("Thunder-Oyster-42", LEARNER)).toBe("strong");
  });
});
