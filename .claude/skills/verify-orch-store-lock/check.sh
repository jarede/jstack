#!/bin/sh
# Runs TLC on the orch store lock model with both configs and reports whether
# Mutex holds. Exits 0 when both hold, 1 when any config violates Mutex, and 2
# when TLC or Java cannot be found or a run fails for another reason.
#
# Set TLA2TOOLS to tla2tools.jar and JAVA to a java binary to skip the lookup,
# as the statechart skill does.

set -u

TLC_TOOL='github:tlaplus/tlaplus[asset_pattern=tla2tools.jar,checksum=sha256:936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88]@1.7.4'
JAVA_TOOL='java@temurin-25'

here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd) || exit 2

install_command() {
  printf 'cd "$(mktemp -d)" && MISE_CEILING_PATHS="$PWD" mise install %s %s\n' \
    "'$JAVA_TOOL'" "'$TLC_TOOL'"
}

work=$(mktemp -d "${TMPDIR:-/tmp}/orch-store-lock.XXXXXX") || {
  echo "cannot create a temporary folder" >&2
  exit 2
}
trap 'rm -rf "$work"' EXIT HUP INT TERM

# mise reads no file above this folder, so a repo below the spec cannot change
# what it resolves.
empty="$work/mise-empty"
mkdir -p "$empty"
MISE_CEILING_PATHS="$empty"
export MISE_CEILING_PATHS

jar=${TLA2TOOLS:-}
java=${JAVA:-}

if [ -z "$jar" ] || [ -z "$java" ]; then
  if ! command -v mise >/dev/null 2>&1; then
    echo "cannot find TLC or Java: mise is not installed." >&2
    echo "Install mise (https://mise.jdx.dev), then run:" >&2
    install_command >&2
    exit 2
  fi
fi

if [ -z "$jar" ]; then
  home=$( cd "$empty" && mise where "$TLC_TOOL" 2>/dev/null ) || home=
  if [ -n "$home" ] && [ -f "$home/tla2tools.jar" ]; then
    jar="$home/tla2tools.jar"
  fi
fi

if [ -z "$java" ]; then
  found=$( cd "$empty" && mise which java --tool "$JAVA_TOOL" 2>/dev/null ) || found=
  if [ -n "$found" ] && [ -x "$found" ]; then
    java="$found"
  fi
fi

if [ -z "${jar:-}" ] || [ -z "${java:-}" ]; then
  echo "cannot find TLC 1.7.4 or Java (set TLA2TOOLS to tla2tools.jar and JAVA to a java binary)." >&2
  echo "Install both with:" >&2
  install_command >&2
  exit 2
fi

if [ ! -f "$jar" ]; then
  echo "TLA2TOOLS is $jar, which does not exist." >&2
  exit 2
fi
if [ ! -x "$java" ] && ! command -v "$java" >/dev/null 2>&1; then
  echo "JAVA is $java, which does not exist." >&2
  exit 2
fi

failed=0

check() {
  name=$1
  cfg=$2
  meta="$work/meta-$name"
  log="$work/$name.log"
  mkdir -p "$meta"

  ( cd "$here" && "$java" -cp "$jar" tlc2.TLC \
      -config "$cfg" -metadir "$meta" OrchStoreLock.tla ) >"$log" 2>&1
  status=$?

  states=$(sed -n 's/.*, \([0-9][0-9,]*\) distinct states found.*/\1/p' "$log" |
    tail -n 1 | tr -d ',')

  if grep -q '^Error: Invariant Mutex is violated' "$log"; then
    echo "$name: Mutex VIOLATED (${states:-?} states)"
    sed -n '/^Error: Invariant Mutex is violated/,/^[0-9][0-9,]* states generated/p' "$log" |
      sed '$d'
    failed=1
  elif [ "$status" -eq 0 ] && grep -q 'No error has been found' "$log"; then
    echo "$name: Mutex holds (${states:-?} states)"
  else
    echo "$name: TLC failed" >&2
    cat "$log" >&2
    exit 2
  fi
}

check NoCrash NoCrash.cfg
check OrchStoreLock OrchStoreLock.cfg

exit "$failed"
