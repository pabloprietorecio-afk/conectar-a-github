#!/usr/bin/env bash
set -euo pipefail
GODOT="${GODOT:-godot}"
mkdir -p build/android
"$GODOT" --headless --path . --import
"$GODOT" --headless --path . --export-debug "Android Debug" build/android/Football-Cards-debug.apk
printf 'APK: %s\n' "$(pwd)/build/android/Football-Cards-debug.apk"
