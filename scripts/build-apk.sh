#!/usr/bin/env bash
set -euo pipefail

# ── Usage ────────────────────────────────────────────────────────────
# Debug APK (default):
#   ./scripts/build-apk.sh
#   ./scripts/build-apk.sh --debug
#
# Release APK (requires keystore env vars — see below):
#   ./scripts/build-apk.sh --release
#
# Release keystore env vars (set in shell or .env.release):
#   KEYSTORE_PATH   — absolute path to your .jks / .keystore file
#   KEYSTORE_PASS   — keystore password
#   KEY_ALIAS       — key alias
#   KEY_PASS        — key password

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$ROOT_DIR/frontend"
ANDROID_DIR="$FRONTEND_DIR/android"

# ── Parse args ───────────────────────────────────────────────────────
BUILD_TYPE="debug"
for arg in "$@"; do
  case $arg in
    --release) BUILD_TYPE="release" ;;
    --debug)   BUILD_TYPE="debug"   ;;
  esac
done

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   Kue APK Builder — $BUILD_TYPE        "
echo "╚══════════════════════════════════════╝"
echo ""

# ── Step 1: Vite build ───────────────────────────────────────────────
echo "▶ Step 1/3 — Building web assets..."
cd "$FRONTEND_DIR"
npm run build
echo "  ✓ Web build complete"
echo ""

# ── Step 2: Capacitor sync ───────────────────────────────────────────
echo "▶ Step 2/3 — Syncing Capacitor..."
npx cap sync android
echo "  ✓ Capacitor sync complete"
echo ""

# ── Step 3: Gradle build ─────────────────────────────────────────────
echo "▶ Step 3/3 — Building APK ($BUILD_TYPE)..."
cd "$ANDROID_DIR"

if [ "$BUILD_TYPE" = "release" ]; then
  # Load .env.release if present
  ENV_FILE="$ROOT_DIR/.env.release"
  if [ -f "$ENV_FILE" ]; then
    echo "  Loading $ENV_FILE"
    set -o allexport
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +o allexport
  fi

  # Validate keystore vars
  if [ -z "${KEYSTORE_PATH:-}" ] || [ -z "${KEYSTORE_PASS:-}" ] || \
     [ -z "${KEY_ALIAS:-}" ]    || [ -z "${KEY_PASS:-}" ]; then
    echo ""
    echo "  ✖ Release build requires keystore env vars:"
    echo "      KEYSTORE_PATH, KEYSTORE_PASS, KEY_ALIAS, KEY_PASS"
    echo "  Set them in your shell or create .env.release in the project root."
    exit 1
  fi

  ./gradlew assembleRelease \
    -Pandroid.injected.signing.store.file="$KEYSTORE_PATH" \
    -Pandroid.injected.signing.store.password="$KEYSTORE_PASS" \
    -Pandroid.injected.signing.key.alias="$KEY_ALIAS" \
    -Pandroid.injected.signing.key.password="$KEY_PASS"

  APK_PATH="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
else
  ./gradlew assembleDebug
  APK_PATH="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
fi

echo ""
if [ -f "$APK_PATH" ]; then
  SIZE=$(du -sh "$APK_PATH" | cut -f1)
  echo "  ✓ APK built successfully ($SIZE)"
  echo ""
  echo "  📦 Output: $APK_PATH"
else
  echo "  ✖ APK not found at expected path: $APK_PATH"
  exit 1
fi
echo ""
