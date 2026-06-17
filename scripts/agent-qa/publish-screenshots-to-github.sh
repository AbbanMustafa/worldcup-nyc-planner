#!/usr/bin/env bash
set -uo pipefail

ROOT_DIR="$(pwd)"
REPORT_PATH="${REPORT_PATH:-artifacts/qa/report.json}"
SCREENSHOTS_DIR="${SCREENSHOTS_DIR:-artifacts/qa/screenshots}"
ARTIFACT_BRANCH="${QA_ARTIFACT_BRANCH:-qa-artifacts}"
REPOSITORY="${QA_ARTIFACT_REPOSITORY:-${GITHUB_REPOSITORY:-}}"
COMMIT_SHA="${QA_ARTIFACT_COMMIT_SHA:-}"
PR_NUMBER="${QA_ARTIFACT_PR_NUMBER:-}"
PLATFORM="${QA_PLATFORM:-ios}"

case "${REPORT_PATH}" in
  /*) ;;
  *) REPORT_PATH="${ROOT_DIR}/${REPORT_PATH}" ;;
esac

case "${SCREENSHOTS_DIR}" in
  /*) ;;
  *) SCREENSHOTS_DIR="${ROOT_DIR}/${SCREENSHOTS_DIR}" ;;
esac

if [ -z "${COMMIT_SHA}" ]; then
  COMMIT_SHA="$(git rev-parse HEAD 2>/dev/null || true)"
fi

if [ -z "${COMMIT_SHA}" ]; then
  COMMIT_SHA="manual-$(date +%s)"
fi

if [ -z "${REPOSITORY}" ]; then
  ORIGIN_URL="$(git remote get-url origin 2>/dev/null || true)"
  REPOSITORY="$(printf '%s' "${ORIGIN_URL}" | sed -E 's#^git@github.com:##; s#^https://github.com/##; s#^https://[^@]+@github.com/##; s#\.git$##')"
fi

emit_output() {
  local name="$1"
  local value="$2"

  if command -v set-output >/dev/null 2>&1; then
    set-output "${name}" "${value}"
  fi
}

sanitize_path_part() {
  printf '%s' "$1" | tr -c 'A-Za-z0-9._-' '-' | sed -E 's/^-+//; s/-+$//'
}

set_preview_unavailable() {
  local message="$1"
  emit_output screenshots_preview "${message}"
  emit_output screenshots_published "false"
  emit_output screenshots_publish_error "${message}"
}

SCREENSHOT_LIST="$(mktemp)"
WORKTREE_DIR=""

cleanup() {
  rm -f "${SCREENSHOT_LIST}"
  if [ -n "${WORKTREE_DIR}" ]; then
    rm -rf "${WORKTREE_DIR}"
  fi
}
trap cleanup EXIT

{ find "${SCREENSHOTS_DIR}" -maxdepth 1 -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' \) 2>/dev/null || true; } | sort > "${SCREENSHOT_LIST}"

if [ ! -s "${SCREENSHOT_LIST}" ]; then
  set_preview_unavailable "No screenshots captured."
  exit 0
fi

if [ -z "${REPOSITORY}" ] || [ "${REPOSITORY}" = "${ORIGIN_URL:-}" ]; then
  set_preview_unavailable "Inline previews unavailable: could not determine the GitHub repository for screenshot publishing."
  exit 0
fi

SAFE_COMMIT="$(sanitize_path_part "${COMMIT_SHA}")"
SAFE_PLATFORM="$(sanitize_path_part "${PLATFORM}")"
SAFE_PR="$(sanitize_path_part "${PR_NUMBER}")"

DEST_PREFIX="qa/${SAFE_COMMIT}/${SAFE_PLATFORM}"
if [ -n "${SAFE_PR}" ]; then
  DEST_PREFIX="qa/pr-${SAFE_PR}/${SAFE_COMMIT}/${SAFE_PLATFORM}"
fi

REMOTE_URL="$(git remote get-url origin 2>/dev/null || true)"
AUTH_TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
if [ -n "${AUTH_TOKEN}" ]; then
  REMOTE_URL="https://x-access-token:${AUTH_TOKEN}@github.com/${REPOSITORY}.git"
fi

if [ -z "${REMOTE_URL}" ]; then
  set_preview_unavailable "Inline previews unavailable: could not determine a Git remote for screenshot publishing."
  exit 0
fi

WORKTREE_DIR="$(mktemp -d)"
PUBLISH_LOG="${WORKTREE_DIR}/publish.log"

publish_screenshots() {
  git init "${WORKTREE_DIR}" >>"${PUBLISH_LOG}" 2>&1 || return 1
  cd "${WORKTREE_DIR}" || return 1

  git config user.name "EAS Agent QA" || return 1
  git config user.email "eas-agent-qa@users.noreply.github.com" || return 1
  git remote add origin "${REMOTE_URL}" || return 1

  if git fetch --depth=1 origin "${ARTIFACT_BRANCH}" >>"${PUBLISH_LOG}" 2>&1; then
    git checkout -B "${ARTIFACT_BRANCH}" FETCH_HEAD >>"${PUBLISH_LOG}" 2>&1 || return 1
  else
    git checkout --orphan "${ARTIFACT_BRANCH}" >>"${PUBLISH_LOG}" 2>&1 || return 1
    git rm -rf . >>"${PUBLISH_LOG}" 2>&1 || true
    printf '# QA Artifacts\n\nGenerated simulator QA screenshots for pull request comments.\n' > README.md
    git add README.md || return 1
    git commit -m "Initialize QA artifacts [skip eas]" >>"${PUBLISH_LOG}" 2>&1 || return 1
  fi

  rm -rf "${DEST_PREFIX}"
  mkdir -p "${DEST_PREFIX}" || return 1

  while IFS= read -r screenshot_path; do
    cp "${screenshot_path}" "${DEST_PREFIX}/$(basename "${screenshot_path}")" || return 1
  done < "${SCREENSHOT_LIST}"

  git add "${DEST_PREFIX}" || return 1
  if git diff --cached --quiet; then
    return 0
  fi

  git commit -m "Add QA screenshots for ${SAFE_COMMIT} [skip eas]" >>"${PUBLISH_LOG}" 2>&1 || return 1
  git push origin "HEAD:${ARTIFACT_BRANCH}" >>"${PUBLISH_LOG}" 2>&1 || return 1
}

if [ "${QA_ARTIFACT_DRY_RUN:-}" = "1" ]; then
  PUBLISH_OK="1"
elif publish_screenshots; then
  PUBLISH_OK="1"
else
  PUBLISH_OK="0"
fi

if [ "${PUBLISH_OK}" != "1" ]; then
  ERROR_DETAIL="$(tail -20 "${PUBLISH_LOG}" 2>/dev/null | tr '\n' ' ' | sed -E 's/[[:space:]]+/ /g; s#https://x-access-token:[^@]+@github.com/#https://x-access-token:***@github.com/#g' | cut -c 1-220)"
  set_preview_unavailable "Inline previews unavailable: could not push screenshots to \`${ARTIFACT_BRANCH}\`${ERROR_DETAIL:+ (${ERROR_DETAIL})}."
  exit 0
fi

PREVIEW_SCRIPT="${WORKTREE_DIR}/render-preview.js"
cat > "${PREVIEW_SCRIPT}" <<'NODE'
const fs = require('fs');

const [, , reportPath, repository, branch, destinationPrefix] = process.argv;
const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
const encodePath = (value) => String(value).split('/').map(encodeURIComponent).join('/');

let screenshots = [];
try {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  screenshots = report.screenshots || [];
} catch {
  screenshots = [];
}

if (!screenshots.length) {
  process.stdout.write('Screenshots were published, but the QA report did not list them.');
  process.exit(0);
}

const baseUrl = `https://github.com/${repository}/raw/${encodeURIComponent(branch)}/${encodePath(destinationPrefix)}`;
process.stdout.write(
  screenshots
    .slice(0, 4)
    .map((screenshot) => {
      const label = escapeHtml(screenshot.label || screenshot.fileName);
      const url = `${baseUrl}/${encodeURIComponent(screenshot.fileName)}`;
      return `<a href="${url}"><img src="${url}" width="220" alt="${label}" /></a>`;
    })
    .join('\n\n')
);
NODE

PREVIEW_MARKDOWN="$(node "${PREVIEW_SCRIPT}" "${REPORT_PATH}" "${REPOSITORY}" "${ARTIFACT_BRANCH}" "${DEST_PREFIX}")"

emit_output screenshots_preview "${PREVIEW_MARKDOWN}"
emit_output screenshots_published "true"
emit_output screenshots_artifact_branch "${ARTIFACT_BRANCH}"
emit_output screenshots_artifact_path "${DEST_PREFIX}"
