#!/usr/bin/env bash
set -euxo pipefail

export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}"
export ANDROID_HOME="${ANDROID_HOME:-$ANDROID_SDK_ROOT}"

SDKMANAGER="${ANDROID_SDK_ROOT}/cmdline-tools/tools/bin/sdkmanager"
AVDMANAGER="${ANDROID_SDK_ROOT}/cmdline-tools/tools/bin/avdmanager"

if [ ! -x "${SDKMANAGER}" ]; then
  SDKMANAGER="${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin/sdkmanager"
  AVDMANAGER="${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin/avdmanager"
fi

SYSTEM_IMAGE="${ANDROID_SYSTEM_IMAGE:-system-images;android-35;google_apis;x86_64}"
AVD_NAME="${AGENT_DEVICE_ANDROID_DEVICE:?AGENT_DEVICE_ANDROID_DEVICE is required}"
AVD_DEVICE="${ANDROID_AVD_DEVICE:-pixel_6}"

set +o pipefail
yes | "${SDKMANAGER}" --licenses >/dev/null
set -o pipefail
"${SDKMANAGER}" "platform-tools" "emulator" "${SYSTEM_IMAGE}"

if ! "${AVDMANAGER}" list avd | grep -q "Name: ${AVD_NAME}"; then
  echo "no" | "${AVDMANAGER}" create avd --force --name "${AVD_NAME}" --package "${SYSTEM_IMAGE}" --device "${AVD_DEVICE}"
fi

agent-device boot --platform android --device "${AVD_NAME}" --headless
