#!/bin/sh
# Runs TLC on one model of this skill. Usage: [WORKERS=auto] check.sh [Model] [extra TLC config file]
set -eu
here=$(cd "$(dirname "$0")/.." && pwd)
model=${1:-WriteQueue}
config=${2:-$here/models/$model.cfg}
# The run happens in a scratch folder, so a config given by a relative path is resolved first.
config=$(cd "$(dirname "$config")" && pwd)/$(basename "$config")
version=1.7.4
sum=936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88
jar=${TLA2TOOLS:-${XDG_CACHE_HOME:-$HOME/.cache}/lymi/tla2tools-$version.jar}
if [ ! -f "$jar" ]; then
  mkdir -p "$(dirname "$jar")"
  curl -fsSL --retry 5 --retry-all-errors -o "$jar.part" "https://github.com/tlaplus/tlaplus/releases/download/v$version/tla2tools.jar"
  echo "$sum  $jar.part" | shasum -a 256 -c - >/dev/null || { echo "tla2tools.jar failed its checksum" >&2; rm -f "$jar.part"; exit 1; }
  mv "$jar.part" "$jar"
fi
java=${JAVA:-java}
"$java" -version >/dev/null 2>&1 || java=/opt/homebrew/opt/openjdk/bin/java
"$java" -version >/dev/null 2>&1 || { echo "Java 11 or later is needed: brew install openjdk, or set JAVA" >&2; exit 1; }
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cp "$here/models/$model.tla" "$work/"
cd "$work"
exec "$java" -XX:+UseParallelGC -cp "$jar" tlc2.TLC -workers "${WORKERS:-1}" -config "$config" -metadir "$work/states" "$model.tla"
