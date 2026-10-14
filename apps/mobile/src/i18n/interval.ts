import { plural } from "@lingui/core/macro";
import type { Interval } from "@lymi/core";

/** An interval as VoiceOver says it after "next in", "3 days", in the forms that phrase takes in each language; the narrow "3d" is read as letters. */
export function spokenInterval({ value, unit }: Interval): string {
  switch (unit) {
    case "minute":
      return plural(value, { one: "# minute", other: "# minutes" });
    case "hour":
      return plural(value, { one: "# hour", other: "# hours" });
    case "day":
      return plural(value, { one: "# day", other: "# days" });
    case "month":
      return plural(value, { one: "# month", other: "# months" });
    case "year":
      return plural(value, { one: "# year", other: "# years" });
  }
}
