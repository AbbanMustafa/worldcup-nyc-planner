#!/usr/bin/env bash
set -uo pipefail

APP_PATH="${1:?Usage: run-and-export.sh <app-artifact-path>}"
export APP_PATH

: "${APPLICATION_ID:?APPLICATION_ID is required}"
: "${QA_PLATFORM:?QA_PLATFORM is required}"

mkdir -p artifacts/qa

BOOTSTRAP_ERROR=""

if [ "${AGENT_QA_SKIP_BOOTSTRAP:-}" != "1" ]; then
  if [ "${QA_PLATFORM}" = "android" ]; then
    agent-device install "${APPLICATION_ID}" "${APP_PATH}" || agent-device reinstall "${APPLICATION_ID}" "${APP_PATH}" || BOOTSTRAP_ERROR="Unable to install Android app artifact."
  else
    agent-device reinstall "${APPLICATION_ID}" "${APP_PATH}" || BOOTSTRAP_ERROR="Unable to reinstall iOS app artifact."
  fi

  if [ -z "${BOOTSTRAP_ERROR}" ]; then
    agent-device open "${APPLICATION_ID}" --relaunch || BOOTSTRAP_ERROR="App installed but could not be launched."
  fi
fi

if [ -n "${BOOTSTRAP_ERROR}" ]; then
  export AGENT_QA_BOOTSTRAP_ERROR="${BOOTSTRAP_ERROR}"
fi

npm run agent-qa
AGENT_EXIT=$?

STATUS_PATH="artifacts/qa/status.txt"
REPORT_PATH="artifacts/qa/report.json"
SECTION_PATH="artifacts/qa/section.md"

if [ -f "${STATUS_PATH}" ]; then
  STATUS="$(tr -d '\n' < "${STATUS_PATH}")"
else
  STATUS="blocked"
fi

STATUS_LABEL="$(node -e "const s=process.argv[1]; const labels={passed:'passed',failed:'failed',blocked:'blocked',not_tested:'not tested',unsure:'unsure'}; process.stdout.write(labels[s]||s)" "${STATUS}")"

if [ -f "${REPORT_PATH}" ]; then
  TOP_ISSUE="$(node -e "const fs=require('fs'); const r=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); const issue=(r.issues&&r.issues[0])||r.summary||'No issues reported.'; process.stdout.write(String(issue).replace(/\\s+/g,' ').slice(0,240));" "${REPORT_PATH}")"
  SCREENSHOTS_CELL="$(node -e "const fs=require('fs'); const r=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); const shots=r.screenshots||[]; if(!shots.length){process.stdout.write('None captured'); process.exit(0);} process.stdout.write(shots.slice(0,3).map((s)=>s.blobUrl?'<img src=\"'+s.blobUrl+'\" width=\"180\" alt=\"'+(s.label||s.fileName)+'\" />':(s.label||s.fileName)).join('<br>'));" "${REPORT_PATH}")"
  RECORDINGS_CELL="$(node -e "const fs=require('fs'); const r=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); const recs=r.recordings||[]; const fmt=(bytes)=>{ if(!Number.isFinite(bytes)||bytes<=0) return '0 B'; const units=['B','KB','MB','GB']; let value=bytes; let index=0; while(value>=1024&&index<units.length-1){value/=1024; index+=1;} return (value>=10||index===0?value.toFixed(0):value.toFixed(1))+' '+units[index]; }; if(!recs.length){process.stdout.write('None captured'); process.exit(0);} process.stdout.write(recs.slice(0,4).map((r)=>String(r.label||r.fileName)+' ('+fmt(Number(r.bytes||0))+')').join('<br>'));" "${REPORT_PATH}")"
else
  TOP_ISSUE="No QA report was produced."
  SCREENSHOTS_CELL="None captured"
  RECORDINGS_CELL="None captured"
fi

if [ -f "${SECTION_PATH}" ]; then
  SECTION_BODY="$(cat "${SECTION_PATH}")"
else
  SECTION_BODY="No QA section was produced."
fi

if command -v set-output >/dev/null 2>&1; then
  set-output status "${STATUS}"
  set-output status_label "${STATUS_LABEL}"
  set-output top_issue "${TOP_ISSUE}"
  set-output screenshots_cell "${SCREENSHOTS_CELL}"
  set-output recordings_cell "${RECORDINGS_CELL}"
  set-output section_body "${SECTION_BODY}"
fi

exit "${AGENT_EXIT}"
