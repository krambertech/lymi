import { readdirSync } from "node:fs";
import { defineConfig } from "@lingui/cli";
import { formatter } from "@lingui/format-po";

const LESSONS = "src/components/learn/lessons";
const lessons = readdirSync(new URL(`./${LESSONS}/`, import.meta.url))
  .filter((name) => name.endsWith(".tsx"))
  .map((name) => name.slice(0, -".tsx".length))
  .sort();

const tests = ["**/*.test.ts", "**/*.test.tsx"];

export default defineConfig({
  sourceLocale: "en",
  locales: ["en", "uk", "ru"],
  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}",
      include: ["<rootDir>/src"],
      exclude: [...tests, "**/locales/**", "**/components/learn/**", "**/lib/learn/**"],
    },
    {
      path: "<rootDir>/src/locales/learn/Kit/{locale}",
      include: ["<rootDir>/src/components/learn", "<rootDir>/src/lib/learn"],
      exclude: [...tests, "**/learn/lessons/**"],
    },
    ...lessons.map((name) => ({
      path: `<rootDir>/src/locales/learn/${name}/{locale}`,
      include: [`<rootDir>/${LESSONS}/${name}.tsx`],
    })),
  ],
  format: formatter({ lineNumbers: false, origins: false }),
});
