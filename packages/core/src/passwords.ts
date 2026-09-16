/**
 * What Lymi asks of a password. Length is the part that matters, so the floor is high and
 * there are no composition rules: requiring a capital and a symbol pushes people towards
 * "Passw0rd!", which is shorter and more guessable than three plain words. What is screened
 * instead is the small set of passwords an attacker tries first.
 */
export const MIN_PASSWORD_LENGTH = 10;

/** Better Auth's own ceiling. Scrypt costs the same above it, and nothing needs more. */
export const MAX_PASSWORD_LENGTH = 128;

export type PasswordProblem =
  | "too-short"
  | "too-long"
  | "too-common"
  | "from-address"
  | "from-lymi";

/**
 * The most-guessed passwords, folded to their letters and digits so "P@ssw0rd!" and
 * "password" are the same entry. Short of a breach corpus, this is the list that stops the
 * guesses a credential-stuffing run actually opens with.
 */
const COMMON = new Set([
  "123456",
  "password",
  "123456789",
  "12345678",
  "12345",
  "111111",
  "1234567",
  "sunshine",
  "qwerty",
  "iloveyou",
  "princess",
  "admin",
  "welcome",
  "666666",
  "abc123",
  "football",
  "123123",
  "monkey",
  "654321",
  "charlie",
  "aa123456",
  "donald",
  "qwertyuiop",
  "dragon",
  "letmein",
  "baseball",
  "master",
  "shadow",
  "superman",
  "trustno1",
  "whatever",
  "starwars",
  "computer",
  "michelle",
  "jessica",
  "pepper",
  "ginger",
  "hunter",
  "buster",
  "soccer",
  "harley",
  "batman",
  "andrew",
  "tigger",
  "sunshine1",
  "chocolate",
  "password1",
  "password123",
  "qwerty123",
  "1q2w3e4r",
  "zaq12wsx",
  "qazwsx",
  "asdfgh",
  "zxcvbnm",
  "passw0rd",
  "iloveyou1",
  "loveme",
  "flower",
  "hottie",
  "freedom",
  "summer",
  "purple",
  "orange",
  "banana",
  "cookie",
  "maggie",
  "jordan",
  "hannah",
  "michael",
  "ashley",
  "daniel",
  "thomas",
  "robert",
  "jennifer",
  "nicole",
  "anthony",
  "matthew",
  "joshua",
  "amanda",
  "secret",
  "silver",
  "ranger",
  "killer",
  "hockey",
  "george",
  "sexsex",
  "andrea",
  "cheese",
  "please",
  "winter",
  "autumn",
  "spring",
  "internet",
  "samsung",
  "google",
  "facebook",
  "yahoo",
  "linkedin",
  "myspace",
  "twitter",
  "welcome1",
  "welcome123",
  "changeme",
  "default",
  "testtest",
  "test1234",
  "temppassword",
  "letmein123",
  "iloveyou123",
  "trustme",
  "nopassword",
  "newpassword",
  "mypassword",
  "yourpassword",
  "thepassword",
  "passwordpassword",
  "qwertyqwerty",
  "abcdefgh",
  "abcd1234",
  "a1b2c3d4",
  "11111111",
  "00000000",
  "88888888",
  "1234512345",
  "123456789",
  "1234567890",
  "12345678910",
  "987654321",
  "asdfghjkl",
  "qwertyui",
  "poiuytrewq",
  "lovelove",
  "loveyou",
  "forever",
  "princess1",
  "sunflower",
  "starwars1",
  "pokemon",
  "minecraft",
  "fortnite",
  "spiderman",
  "superman1",
  "batman123",
]);

/** Letters and digits only, lowercased. */
function plain(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * The same, with the usual letter-for-digit swaps undone, so "P@ssw0rd" reads as "password".
 * Checked alongside the plain form rather than instead of it: undoing the swaps turns a plain
 * numeric tail into letters, and "password123" would stop matching "password".
 */
function fold(value: string): string {
  return plain(
    value
      .toLowerCase()
      .replaceAll("@", "a")
      .replaceAll("$", "s")
      .replaceAll("!", "i")
      .replaceAll("0", "o")
      .replaceAll("1", "l")
      .replaceAll("3", "e")
      .replaceAll("4", "a")
      .replaceAll("5", "s")
      .replaceAll("7", "t"),
  );
}

/**
 * Every shape of this password worth comparing against the list. A common word with digits or
 * a repeated character stuck on the end is the same guess with more typing, so those tails
 * come off too; a single trailing character is left alone, because dropping it would call
 * ordinary words common.
 */
function shapes(password: string): string[] {
  const forms = new Set([plain(password), fold(password)]);
  for (const form of [...forms]) {
    forms.add(form.replace(/[0-9]+$/, ""));
    forms.add(form.replace(/(.)\1+$/, ""));
    forms.add(form.replace(/(.)\1+$/, "").replace(/[0-9]+$/, ""));
  }
  return [...forms].filter(Boolean);
}

/** The pieces of an address a password must not be built out of. */
function partsOf(email: string | undefined): string[] {
  if (!email) return [];
  const [local = "", domain = ""] = email.toLowerCase().split("@");
  return [local, domain.split(".")[0] ?? "", ...local.split(/[._+-]/)]
    .map(fold)
    .filter((part) => part.length >= 3);
}

/** What is wrong with this password, or null when nothing is. */
export function passwordProblem(
  password: string,
  email?: string | undefined,
): PasswordProblem | null {
  if (password.length < MIN_PASSWORD_LENGTH) return "too-short";
  if (password.length > MAX_PASSWORD_LENGTH) return "too-long";

  const forms = shapes(password);
  if (forms.some((form) => COMMON.has(form))) return "too-common";
  // One character over and over reads long and is guessed in a moment.
  if (/^(.)\1+$/.test(plain(password))) return "too-common";

  if (forms.some((form) => form.includes("lymi"))) return "from-lymi";
  const parts = partsOf(email);
  if (forms.some((form) => parts.some((part) => form.includes(part)))) return "from-address";
  return null;
}

export type PasswordStrength = "weak" | "fair" | "strong";

/**
 * How much room a password leaves a guesser, as three steps rather than a score nobody can
 * act on. Length carries most of it, because it is what the learner can most easily add.
 */
export function passwordStrength(password: string, email?: string | undefined): PasswordStrength {
  if (passwordProblem(password, email)) return "weak";
  const variety = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((kind) =>
    kind.test(password),
  ).length;
  if (password.length >= 16 || (password.length >= 12 && variety >= 3)) return "strong";
  return "fair";
}
