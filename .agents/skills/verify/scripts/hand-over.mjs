const numbered = (steps) => steps.map((action, i) => `    ${i + 1}. ${action}`);

export function handOver({ origin, persona, feature, start, end, entry, steps }) {
  const link = (returnTo, reset = "") =>
    `${origin}/api/dev/sign-in?as=${persona}${reset}&returnTo=${encodeURIComponent(returnTo)}`;
  return [
    `Look at ${feature}:`,
    ...(entry ? ["  Open the pull request's preview link first, for its cookie."] : []),
    `  As the run left it: ${link(end)}`,
    `  From the start: ${link(start, "&reset=1")}`,
    ...numbered(steps),
  ];
}

export function phoneHandOver({ simulator, udid, metroPort, persona, feature, flow }) {
  const metro = encodeURIComponent(`http://127.0.0.1:${metroPort}`);
  const steps = flow
    .filter((line) =>
      /^(?:tap|double tap|long press|input|erase|swipe|scroll|press|open)\b/i.test(line),
    )
    .map((line) => line.replace(/\.{3}\s*[A-Z]+$/, ""));
  return [
    `Look at ${feature} in the Simulator named ${simulator}, signed in as ${persona}:`,
    `  Show it: xcrun simctl boot ${udid}; open -a Simulator --args -CurrentDeviceUDID ${udid}`,
    `  Open Lymi: xcrun simctl openurl ${udid} "exp+lymi://expo-development-client/?url=${metro}"`,
    ...numbered(steps),
  ];
}
