#!/usr/bin/env bash
# Runs the phone's Maestro flows against a local Worker on a booted Simulator with the app installed.
# Usage: API_URL=http://localhost:5241 DEVICE=<simulator udid> apps/mobile/e2e/run.sh
set -euo pipefail

: "${API_URL:?API_URL names the local Worker the app was built against}"
: "${DEVICE:?DEVICE names the Simulator}"
root="$(cd "$(dirname "$0")/../../.." && pwd)"
email="learner@lymi.local"
# The personas' password is fixed and public, and only a loopback Worker accepts it.
password="$(sed -n 's/^export const DEV_PASSWORD = "\(.*\)";$/\1/p' "$root/apps/web/src/server/dev/personas.ts")"
jar="$(mktemp)"
trap 'rm -f "$jar"' EXIT

# A fresh copy of the persona, nine cards due.
curl -fsS -c "$jar" -X POST "$API_URL/api/dev/sign-in?as=learner&reset=1" >/dev/null
before="$(curl -fsS -b "$jar" "$API_URL/api/stats/streak" | node -pe 'JSON.parse(require("fs").readFileSync(0)).today.attempts')"

maestro --device "$DEVICE" test \
  --format junit --output "${MAESTRO_REPORT:-$root/apps/mobile/e2e/report.xml}" \
  -e EMAIL="$email" -e PASSWORD="$password" \
  "$root/apps/mobile/e2e/flows"

# The screen moves on before the outbox sends, so the Worker holding the grades is the real proof.
attempts() {
  curl -fsS -b "$jar" "$API_URL/api/stats/streak" | node -pe 'JSON.parse(require("fs").readFileSync(0)).today.attempts'
}
for _ in $(seq 1 15); do
  after="$(attempts)"
  (( after - before >= 3 )) && break
  sleep 1
done
if (( after - before < 3 )); then
  echo "Expected three grades on the Worker, found $((after - before))" >&2
  exit 1
fi
echo "Three grades reached the Worker."
