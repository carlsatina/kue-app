#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./scripts/bump-version.sh <version|major|minor|patch> [--code <int>] [--dry-run]

Examples:
  ./scripts/bump-version.sh patch
  ./scripts/bump-version.sh minor
  ./scripts/bump-version.sh 0.2.0
  ./scripts/bump-version.sh 0.2.1 --code 12
  ./scripts/bump-version.sh patch --dry-run
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" || $# -lt 1 ]]; then
  usage
  exit 0
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is required." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
ANDROID_GRADLE="$FRONTEND_DIR/android/app/build.gradle"

if [[ ! -f "$FRONTEND_DIR/package.json" ]]; then
  echo "Error: missing $FRONTEND_DIR/package.json" >&2
  exit 1
fi

if [[ ! -f "$ANDROID_GRADLE" ]]; then
  echo "Error: missing $ANDROID_GRADLE" >&2
  exit 1
fi

target="$1"
shift

code_override=""
dry_run="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --code)
      if [[ $# -lt 2 ]]; then
        echo "Error: --code requires an integer value." >&2
        exit 1
      fi
      code_override="$2"
      shift 2
      ;;
    --dry-run)
      dry_run="true"
      shift
      ;;
    *)
      echo "Error: unknown argument '$1'" >&2
      usage
      exit 1
      ;;
  esac
done

current_web_version="$(node -p "require('$FRONTEND_DIR/package.json').version")"
current_android_code="$(sed -n 's/^[[:space:]]*versionCode[[:space:]]*\([0-9][0-9]*\).*/\1/p' "$ANDROID_GRADLE" | head -n 1)"
current_android_name="$(sed -n 's/^[[:space:]]*versionName[[:space:]]*"\([^"]*\)".*/\1/p' "$ANDROID_GRADLE" | head -n 1)"

if [[ -z "$current_android_code" || -z "$current_android_name" ]]; then
  echo "Error: could not read current Android version from $ANDROID_GRADLE" >&2
  exit 1
fi

if [[ "$target" == "major" || "$target" == "minor" || "$target" == "patch" ]]; then
  next_version="$(node -e '
const [ver, bump] = process.argv.slice(1);
const parts = ver.split(".").map((x) => Number(x));
if (parts.length !== 3 || parts.some(Number.isNaN)) {
  console.error("Current package.json version is not x.y.z:", ver);
  process.exit(1);
}
if (bump === "major") {
  parts[0] += 1;
  parts[1] = 0;
  parts[2] = 0;
} else if (bump === "minor") {
  parts[1] += 1;
  parts[2] = 0;
} else if (bump === "patch") {
  parts[2] += 1;
} else {
  process.exit(1);
}
console.log(parts.join("."));
' "$current_web_version" "$target")"
else
  if [[ ! "$target" =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$ ]]; then
    echo "Error: '$target' is not a valid version. Use x.y.z or x.y.z-suffix." >&2
    exit 1
  fi
  next_version="$target"
fi

if [[ -n "$code_override" ]]; then
  if [[ ! "$code_override" =~ ^[0-9]+$ ]]; then
    echo "Error: --code must be a positive integer." >&2
    exit 1
  fi
  next_android_code="$code_override"
else
  next_android_code="$((current_android_code + 1))"
fi

if (( next_android_code <= current_android_code )); then
  echo "Error: Android versionCode must increase. Current: $current_android_code, next: $next_android_code" >&2
  exit 1
fi

echo "Current web version:      $current_web_version"
echo "Current Android version:  $current_android_name ($current_android_code)"
echo "Next web version:         $next_version"
echo "Next Android version:     $next_version ($next_android_code)"

if [[ "$dry_run" == "true" ]]; then
  echo
  echo "Dry run only. No files changed."
  exit 0
fi

(cd "$FRONTEND_DIR" && npm version "$next_version" --no-git-tag-version --allow-same-version)

perl -0pi -e "s/versionCode\\s+\\d+/versionCode $next_android_code/; s/versionName\\s+\"[^\"]+\"/versionName \"$next_version\"/;" "$ANDROID_GRADLE"

echo
echo "Updated files:"
echo "- $FRONTEND_DIR/package.json"
echo "- $FRONTEND_DIR/package-lock.json"
echo "- $ANDROID_GRADLE"
