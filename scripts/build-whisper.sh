#!/bin/bash
# Builds whisper.cpp (open source, MIT licence) into vendor/whisper/whisper-cli so Reelsmith can
# auto-generate captions locally (offline, on your Mac). Run once:   ./scripts/build-whisper.sh
#
# Requires: git, Xcode command line tools (clang) and cmake.
#   No cmake?  brew install cmake
# Alternative to building: brew install whisper-cpp   (Reelsmith also finds Homebrew's whisper-cli)
#
# Note: this file is plain ASCII and every variable is written as ${NAME}, because macOS's built-in
# bash 3.2 can treat non-ASCII characters right after $NAME as part of the variable name.
set -euo pipefail

VERSION="${WHISPER_VERSION:-v1.9.5}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${TMPDIR:-/tmp}/reelsmith-whisper-build"

if ! command -v cmake >/dev/null 2>&1; then
  echo "cmake not found. Install it with:  brew install cmake"
  exit 1
fi
if ! git --version >/dev/null 2>&1; then
  echo "git is not usable. If you see an Xcode licence message, run:  sudo xcodebuild -license accept"
  echo "If git is missing, run:  xcode-select --install"
  exit 1
fi

rm -rf "${WORK}"
mkdir -p "${WORK}"

echo "Step 1/3: downloading whisper.cpp ${VERSION} ..."
if ! git clone --depth 1 --branch "${VERSION}" https://github.com/ggml-org/whisper.cpp "${WORK}/src"; then
  echo ""
  echo "Could not download whisper.cpp from GitHub."
  echo " - Check your internet connection (and VPN/proxy), then run this script again."
  echo " - If the message above mentions the Xcode licence:  sudo xcodebuild -license accept"
  echo " - Or skip building entirely:  brew install whisper-cpp   (Reelsmith finds it automatically)"
  rm -rf "${WORK}"
  exit 1
fi

echo "Step 2/3: building (Metal GPU acceleration on Apple Silicon) ..."
cmake -S "${WORK}/src" -B "${WORK}/build" -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF \
  -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_SERVER=OFF -DGGML_METAL=ON -DGGML_METAL_EMBED_LIBRARY=ON
cmake --build "${WORK}/build" --config Release -j --target whisper-cli

echo "Step 3/3: installing into the Reelsmith folder ..."
mkdir -p "${ROOT}/vendor/whisper"
cp "${WORK}/build/bin/whisper-cli" "${ROOT}/vendor/whisper/whisper-cli"
cp "${WORK}/src/LICENSE" "${ROOT}/vendor/whisper/LICENSE-whisper.cpp.txt"
echo "${VERSION}" > "${ROOT}/vendor/whisper/VERSION"
rm -rf "${WORK}"

echo ""
echo "Done: vendor/whisper/whisper-cli (${VERSION})."
echo "Restart Reelsmith, then use Captions > Auto-generate."
