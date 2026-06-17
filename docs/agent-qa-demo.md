# Agent QA Demo

This project includes an EAS Workflow that follows the Expo AI QA agent pattern:

- calculate native fingerprints
- reuse a compatible build when possible
- repack the latest JavaScript into that build
- boot Android and iOS simulator targets
- run `agent-device` with a small AI SDK QA agent
- post a PR comment with status, screenshots, and findings

## Files

- `.eas/workflows/agent-qa-mobile.yml` defines the EAS Workflow.
- `eas.json` defines `qa-release` and `qa-ios-simulator` build profiles.
- `scripts/agent-qa/index.mjs` is the app-specific AI QA agent.
- `scripts/agent-qa/run-and-export.sh` installs, launches, runs QA, and exports workflow outputs.

## Required EAS Environment

Add these to the `preview` EAS environment:

- `ANTHROPIC_API_KEY`: required by default. The workflow uses `QA_PROVIDER=anthropic` and `QA_MODEL=claude-haiku-4-5`.
- `BLOB_READ_WRITE_TOKEN`: optional, but recommended so PR comments can show uploaded screenshots.

```bash
eas env:create preview \
  --name ANTHROPIC_API_KEY \
  --value "your_anthropic_key_here" \
  --visibility secret \
  --non-interactive
```

You can still use Vercel AI Gateway instead by setting `QA_PROVIDER=gateway`, setting `QA_MODEL` to a gateway model id such as `openai/gpt-5.4-mini`, and adding `AI_GATEWAY_API_KEY`.

The app identifier used by the workflow is `com.abbanmustafa.worldcupnyc`.

## Run

The workflow triggers on pull requests. You can also run it manually after the project is linked to EAS:

```bash
eas workflow:run .eas/workflows/agent-qa-mobile.yml --non-interactive
```

For local smoke testing of report generation without launching a simulator:

```bash
AGENT_QA_BOOTSTRAP_ERROR="local smoke test" QA_PLATFORM=ios APPLICATION_ID=com.abbanmustafa.worldcupnyc npm run agent-qa
```
