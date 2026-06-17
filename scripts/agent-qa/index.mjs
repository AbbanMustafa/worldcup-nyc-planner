import { execFile as execFileCallback } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText, gateway, hasToolCall, stepCountIs, tool } from 'ai';
import { z } from 'zod';

const execFile = promisify(execFileCallback);

const ROOT_DIR = process.cwd();
const ARTIFACTS_DIR = path.join(ROOT_DIR, 'artifacts', 'qa');
const SCREENSHOTS_DIR = path.join(ARTIFACTS_DIR, 'screenshots');
const RECORDINGS_DIR = path.join(ARTIFACTS_DIR, 'recordings');
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'report.json');
const SECTION_PATH = path.join(ARTIFACTS_DIR, 'section.md');
const STATUS_PATH = path.join(ARTIFACTS_DIR, 'status.txt');
const AGENT_DEVICE_BIN = 'agent-device';

const QA_PLATFORM = process.env.QA_PLATFORM === 'ios' ? 'ios' : 'android';
const RECORDING_PATH = path.join(RECORDINGS_DIR, `${QA_PLATFORM}-agent-qa.mp4`);
const PLATFORM_LABEL = QA_PLATFORM === 'ios' ? 'iOS' : 'Android';
const HAS_ANTHROPIC_KEY = Boolean(process.env.ANTHROPIC_API_KEY);
const HAS_GATEWAY_KEY = Boolean(process.env.AI_GATEWAY_API_KEY);
const QA_PROVIDER = process.env.QA_PROVIDER || 'anthropic';
const MODEL_ID =
  process.env.QA_MODEL || (QA_PROVIDER === 'anthropic' ? 'claude-haiku-4-5' : 'openai/gpt-5.4-mini');
const BOOTSTRAP_ERROR = process.env.AGENT_QA_BOOTSTRAP_ERROR;
const pr = parseJson(process.env.PR_JSON, {});

const context = {
  platform: QA_PLATFORM,
  platformLabel: PLATFORM_LABEL,
  model: MODEL_ID,
  applicationId: process.env.APPLICATION_ID || '',
  appPath: process.env.APP_PATH || '',
  buildId: process.env.BUILD_ID || '',
  workflowUrl: process.env.WORKFLOW_URL || '',
  prNumber: Number(pr?.number || 0),
  prTitle: pr?.title || '',
  provider: QA_PROVIDER,
  screenshotDirectory: SCREENSHOTS_DIR,
  recordingsDirectory: RECORDINGS_DIR
};

const agentDeviceTrace = [];
const qaChecks = [];
const launchAttempts = [];
const recordingState = {
  started: false,
  stopped: false
};
let reportWasWritten = false;

await main();

async function main() {
  await mkdir(ARTIFACTS_DIR, { recursive: true });
  await mkdir(SCREENSHOTS_DIR, { recursive: true });
  await mkdir(RECORDINGS_DIR, { recursive: true });

  if (BOOTSTRAP_ERROR) {
    await writeReport({
      overallStatus: 'blocked',
      summary: `The ${PLATFORM_LABEL} app could not be installed or launched before QA started.`,
      checked: ['Build artifact was downloaded by EAS.'],
      issues: [BOOTSTRAP_ERROR],
      nextSteps: ['Inspect the EAS build artifact and the agent-device install/open logs.']
    });
    return;
  }

  const authIssue = getAuthIssue();
  if (authIssue) {
    await writeReport({
      overallStatus: 'blocked',
      summary: 'AI QA did not run because the configured model provider is missing credentials.',
      checked: ['Workflow scripts and build bootstrap reached the QA agent.'],
      issues: [authIssue],
      nextSteps: [
        'Add ANTHROPIC_API_KEY to the preview EAS environment, or set QA_PROVIDER=gateway and add AI_GATEWAY_API_KEY.'
      ]
    });
    return;
  }

  try {
    await prepareDeviceForQa();
    await startScreenRecording();
    await runDeterministicSmoke();

    const result = await generateText({
      model: createModel(),
      temperature: 0.2,
      stopWhen: [hasToolCall('write_report'), stepCountIs(14)],
      tools: {
        app_context: appContextTool(),
        agent_device: agentDeviceTool(),
        write_report: writeReportTool()
      },
      system: [
        'You are a mobile QA agent running inside an EAS Workflow.',
        'Use agent-device to inspect and interact with the simulator or emulator.',
        'Prefer accessibility text and React Native testID selectors over coordinates.',
        'Do not pass --session, --platform, --device, --udid, or --serial flags; the workflow already binds the target device.',
        'Capture screenshots as evidence. A report without screenshots is incomplete unless the app cannot launch.',
        'Do not narrate intermediate plans in the final response.',
        'Finish by calling write_report exactly once. Returning plain text instead of write_report is a QA failure.'
      ].join('\n'),
      prompt: buildPrompt()
    });

    if (!reportWasWritten) {
      await writeFallbackReport(result.text);
    }
  } catch (error) {
    await writeReport({
      overallStatus: 'blocked',
      summary: 'AI QA failed while running the model or device tools.',
      checked: ['The app was bootstrapped before the AI agent started.'],
      issues: [error instanceof Error ? error.message : String(error)],
      nextSteps: ['Inspect the EAS job logs and rerun the workflow after fixing the agent failure.']
    });
    console.error(error);
    process.exitCode = 1;
  }
}

function getAuthIssue() {
  if (QA_PROVIDER === 'anthropic') {
    return HAS_ANTHROPIC_KEY ? null : 'Missing ANTHROPIC_API_KEY for QA_PROVIDER=anthropic.';
  }

  if (QA_PROVIDER === 'gateway') {
    return HAS_GATEWAY_KEY ? null : 'Missing AI_GATEWAY_API_KEY for QA_PROVIDER=gateway.';
  }

  return `Unsupported QA_PROVIDER "${QA_PROVIDER}". Use "anthropic" or "gateway".`;
}

function createModel() {
  if (QA_PROVIDER === 'anthropic') {
    return anthropic(MODEL_ID.replace(/^anthropic\//, ''));
  }

  return gateway(MODEL_ID);
}

function buildPrompt() {
  return [
    `Test the World Cup NYC Planner on ${PLATFORM_LABEL}.`,
    '',
    'App purpose:',
    '- Helps New Yorkers find 2026 World Cup watch parties and neighborhoods tied to teams and cultures.',
    '- The UI should feel Airbnb-like: search, filter pills, map pins, detail cards, and polished itinerary cards.',
    '',
    'Critical acceptance checks:',
    '- The demo label "Simulator QA demo" is visible in the header.',
    '- The app launches to "World Cup stays local." without a redbox/logbox overlay.',
    '- The search field is visible and usable.',
    '- The real NYC map is visible and not blank; OpenStreetMap raster tiles or native map UI should be present.',
    '- Pins and labels update when filters change.',
    '- The Culture filter can be selected and shows culture-first route content.',
    '- Searching for Koreatown surfaces "Koreatown Red Devils Stop".',
    '- Country chips include flag emojis or equivalent flag glyphs next to country names.',
    '- Matchday Passports are visible and the Argentina passport opens an itinerary with a watch-party plan.',
    '',
    'Stable selectors you may use:',
    '- id="worldcup-screen"',
    '- id="search-input"',
    '- id="filter-all"',
    '- id="filter-watch"',
    '- id="filter-culture"',
    '- id="filter-stadium"',
    '- id="filter-final"',
    '- id="map-shell"',
    '- id="real-map"',
    '- id="spot-detail-card"',
    '- id="matchday-passports"',
    '- id="passport-card-argentina-passport"',
    '- id="passport-detail-argentina-passport"',
    '',
    'Suggested flow:',
    `1. Call app_context and read the deterministic smoke evidence plus app-specific test notes.`,
    '2. Use agent_device with ["react-native", "dismiss-overlay"] if a React Native overlay appears.',
    '3. Use agent_device with ["appstate"], then ["snapshot", "-i"].',
    `4. Capture a home screenshot at ${path.join(SCREENSHOTS_DIR, '01-home.png')}.`,
    '5. Press id="filter-culture"; verify "Culture" content, route cards, and the active pin count.',
    `6. Capture a culture screenshot at ${path.join(SCREENSHOTS_DIR, '02-culture.png')}.`,
    '7. Fill id="search-input" with "Koreatown"; verify the Koreatown card and Korea Republic country chip.',
    `8. Capture a search screenshot at ${path.join(SCREENSHOTS_DIR, '03-search-koreatown.png')}.`,
    '9. Scroll down to Matchday Passports; select id="passport-card-argentina-passport" and verify "Queens football bar near Roosevelt Av".',
    `10. Capture an Argentina passport screenshot at ${path.join(SCREENSHOTS_DIR, '04-argentina-passport.png')}.`,
    '11. Call write_report with a concise status, evidence, issues, next steps, and screenshot labels.',
    '',
    'Use only the provided tools. Do not invent results. If the map is blank, report failed.'
  ].join('\n');
}

function appContextTool() {
  return tool({
    description: 'Return app-specific QA context, stable selectors, and expected flows.',
    inputSchema: z.object({}),
    execute: async () => ({
      appName: 'World Cup NYC Planner',
      platform: PLATFORM_LABEL,
      applicationId: context.applicationId,
      screenshotDirectory: SCREENSHOTS_DIR,
      recordingsDirectory: RECORDINGS_DIR,
      selectors: [
        'id="worldcup-screen"',
        'id="search-input"',
        'id="filter-culture"',
        'id="map-shell"',
        'id="real-map"',
        'id="spot-detail-card"',
        'id="matchday-passports"',
        'id="passport-card-argentina-passport"',
        'id="passport-detail-argentina-passport"'
      ],
      expectedText: [
        'World Cup stays local.',
        'Simulator QA demo',
        'NYC culture map',
        'Culture',
        'Koreatown Red Devils Stop',
        'Korea Republic',
        'Matchday passports',
        'Argentina Matchday Passport',
        'Queens football bar near Roosevelt Av'
      ],
      deterministicChecks: qaChecks,
      launchAttempts
    })
  });
}

function agentDeviceTool() {
  return tool({
    description: [
      'Run an agent-device command against the active simulator/emulator.',
      'Pass argv as an array, for example ["snapshot", "-i"], ["press", "id=\\"filter-culture\\""],',
      `or ["screenshot", "${path.join(SCREENSHOTS_DIR, '01-home.png')}"].`
    ].join(' '),
    inputSchema: z.object({
      args: z.array(z.string()).min(1).describe('Arguments passed after the agent-device binary.')
    }),
    execute: async ({ args }) => runAgentDevice(args, { allowFailure: true })
  });
}

function writeReportTool() {
  return tool({
    description: 'Write the final QA report. Call this once after testing is complete.',
    inputSchema: z.object({
      overallStatus: z.enum(['passed', 'failed', 'blocked', 'not_tested', 'unsure']),
      summary: z.string().min(1),
      checked: z.array(z.string()).default([]),
      issues: z.array(z.string()).default([]),
      nextSteps: z.array(z.string()).default([]),
      screenshotLabels: z
        .array(
          z.object({
            fileName: z.string().min(1),
            label: z.string().min(1)
          })
        )
        .default([])
    }),
    execute: async (input) => {
      const report = await writeReport(input);
      reportWasWritten = true;
      return {
        ok: true,
        status: report.overallStatus,
        reportPath: REPORT_PATH,
        sectionPath: SECTION_PATH,
        screenshots: report.screenshots.map((screenshot) => ({
          fileName: screenshot.fileName,
          label: screenshot.label,
          blobUrl: screenshot.blobUrl,
          uploadError: screenshot.uploadError
        })),
        recordings: report.recordings.map((recording) => ({
          fileName: recording.fileName,
          label: recording.label,
          relativePath: recording.relativePath,
          bytes: recording.bytes
        }))
      };
    }
  });
}

async function runAgentDevice(args, options = {}) {
  const sanitizedArgs = sanitizeAgentDeviceArgs(args);
  const command = formatCommand(sanitizedArgs);
  const originalCommand = formatCommand(args);

  try {
    const result = await execFile(AGENT_DEVICE_BIN, sanitizedArgs, {
      cwd: ROOT_DIR,
      timeout: 120_000,
      maxBuffer: 6 * 1024 * 1024
    });

    const entry = {
      command,
      ok: true,
      exitCode: 0,
      stdout: trim(result.stdout || ''),
      stderr: trim(result.stderr || ''),
      ...(command !== originalCommand ? { sanitizedFrom: originalCommand } : {})
    };
    agentDeviceTrace.push(entry);
    return entry;
  } catch (error) {
    const entry = {
      command,
      ok: false,
      exitCode: typeof error?.code === 'number' ? error.code : 1,
      stdout: trim(error?.stdout || ''),
      stderr: trim(error?.stderr || error?.message || ''),
      ...(command !== originalCommand ? { sanitizedFrom: originalCommand } : {})
    };
    agentDeviceTrace.push(entry);

    if (options.allowFailure) {
      return entry;
    }

    throw error;
  }
}

async function runDeterministicSmoke() {
  const launched = await ensureAppOpen('Initial app launch');
  await runAgentDevice(['react-native', 'dismiss-overlay'], { allowFailure: true });

  const homeCheck = await recordQaCheck({
    name: 'Home title visible',
    args: ['wait', 'text', 'World Cup stays local.', '8000'],
    critical: true
  });

  const demoLabelCheck = await recordQaCheck({
    name: 'Demo label visible',
    args: ['wait', 'text', 'Simulator QA demo', '3000'],
    critical: true
  });

  if (!launched || homeCheck.status === 'failed' || demoLabelCheck.status === 'failed') {
    await collectDebugEvidence('Home screen did not appear; skipping deeper UI checks.');
    return;
  }

  await recordQaCheck({
    name: 'Search input visible',
    args: ['is', 'visible', 'id="search-input"'],
    critical: true
  });
  await recordQaCheck({
    name: 'Real map component mounted',
    args: ['is', 'visible', 'id="real-map"'],
    critical: true
  });
  await recordQaCheck({
    name: 'Home screenshot captured',
    args: ['screenshot', path.join(SCREENSHOTS_DIR, '01-home.png')]
  });
  await recordQaCheck({
    name: 'Culture filter selectable',
    args: ['press', 'id="filter-culture"'],
    critical: true
  });
  await recordQaCheck({
    name: 'Culture result visible',
    args: ['wait', 'text', 'Little Senegal Walk', '3000'],
    critical: true
  });
  await recordQaCheck({
    name: 'Culture screenshot captured',
    args: ['screenshot', path.join(SCREENSHOTS_DIR, '02-culture.png')]
  });
  await recordQaCheck({
    name: 'Koreatown search can be entered',
    args: ['fill', 'id="search-input"', 'Koreatown'],
    critical: true
  });
  await recordQaCheck({
    name: 'Koreatown result visible',
    args: ['wait', 'text', 'Koreatown Red Devils Stop', '3000'],
    critical: true
  });
  await recordQaCheck({
    name: 'Koreatown search screenshot captured',
    args: ['screenshot', path.join(SCREENSHOTS_DIR, '03-search-koreatown.png')]
  });

  await runAgentDevice(['keyboard', 'dismiss'], { allowFailure: true });
  if (context.applicationId) {
    await runAgentDevice(['open', context.applicationId, '--relaunch'], { allowFailure: true });
    await runAgentDevice(['wait', '1000'], { allowFailure: true });
  }

  await recordQaCheck({
    name: 'Scrolled toward Matchday Passports',
    args: ['scroll', 'down', '0.9']
  });
  await recordQaCheck({
    name: 'Scrolled to Matchday Passports',
    args: ['scroll', 'down', '0.9'],
    critical: true
  });
  await recordQaCheck({
    name: 'Argentina passport card visible',
    args: ['wait', 'text', 'Argentina Matchday Passport', '3000'],
    critical: true
  });
  await recordQaCheck({
    name: 'Argentina passport selectable',
    args: ['press', 'id="passport-card-argentina-passport"'],
    critical: true
  });
  await recordQaCheck({
    name: 'Argentina passport watch party visible',
    args: ['wait', 'text', 'Queens football bar near Roosevelt Av', '3000'],
    critical: true
  });
  await recordQaCheck({
    name: 'Argentina passport screenshot captured',
    args: ['screenshot', path.join(SCREENSHOTS_DIR, '04-argentina-passport.png')]
  });
}

async function recordQaCheck({ name, args, critical = false }) {
  let result = await runAgentDevice(args, { allowFailure: true });
  let retried = false;

  if (critical && !result.ok && shouldRetryAfterOpen(result)) {
    await ensureAppOpen(`Retry before ${name}`);
    result = await runAgentDevice(args, { allowFailure: true });
    retried = true;
  }

  const check = {
    name,
    status: result.ok ? 'passed' : 'failed',
    critical,
    command: result.command,
    detail: trim(result.ok ? result.stdout || 'Command completed.' : result.stderr || result.stdout, 300),
    ...(retried ? { retried: true } : {})
  };
  qaChecks.push(check);
  return check;
}

async function prepareDeviceForQa() {
  await runAgentDevice(['logs', 'clear', '--restart'], { allowFailure: true });
  await runAgentDevice(['logs', 'mark', `Starting ${PLATFORM_LABEL} agent QA`], { allowFailure: true });
}

async function startScreenRecording() {
  if (process.env.AGENT_QA_RECORD_SCREEN === '0') {
    qaChecks.push({
      name: 'Screen recording',
      status: 'passed',
      critical: false,
      command: 'agent-device record start',
      detail: 'Screen recording disabled by AGENT_QA_RECORD_SCREEN=0.'
    });
    return;
  }

  await mkdir(RECORDINGS_DIR, { recursive: true });
  const result = await runAgentDevice(['record', 'start', RECORDING_PATH, '--quality', '6'], {
    allowFailure: true
  });
  recordingState.started = result.ok;

  qaChecks.push({
    name: 'Screen recording started',
    status: result.ok ? 'passed' : 'failed',
    critical: false,
    command: result.command,
    detail: trim(result.ok ? result.stdout || RECORDING_PATH : result.stderr || result.stdout, 500)
  });
}

async function stopScreenRecording() {
  if (!recordingState.started || recordingState.stopped) {
    return;
  }

  recordingState.stopped = true;
  const result = await runAgentDevice(['record', 'stop'], { allowFailure: true });
  qaChecks.push({
    name: 'Screen recording stopped',
    status: result.ok ? 'passed' : 'failed',
    critical: false,
    command: result.command,
    detail: trim(result.ok ? result.stdout || 'Recording stopped.' : result.stderr || result.stdout, 500)
  });
}

async function ensureAppOpen(reason) {
  if (!context.applicationId) {
    return false;
  }

  const openResult = await runAgentDevice(['open', context.applicationId, '--relaunch'], { allowFailure: true });
  await runAgentDevice(['wait', '2500'], { allowFailure: true });
  const appState = await runAgentDevice(['appstate'], { allowFailure: true });
  const screenshotFile = `${String(launchAttempts.length).padStart(2, '0')}-after-open.png`;
  await runAgentDevice(['screenshot', path.join(SCREENSHOTS_DIR, screenshotFile)], { allowFailure: true });

  const appStateText = `${appState.stdout || ''}\n${appState.stderr || ''}`;
  const foregrounded =
    openResult.ok &&
    (appStateText.includes(context.applicationId) ||
      appStateText.toLowerCase().includes('worldcup') ||
      appStateText.toLowerCase().includes('world cup'));

  const attempt = {
    reason,
    status: foregrounded ? 'passed' : 'failed',
    command: openResult.command,
    appStateCommand: appState.command,
    detail: trim(appStateText || openResult.stderr || openResult.stdout, 500),
    screenshotFile
  };
  launchAttempts.push(attempt);
  qaChecks.push({
    name: `${reason} foreground state`,
    status: attempt.status,
    critical: true,
    command: appState.command,
    detail: attempt.detail
  });

  return foregrounded;
}

async function collectDebugEvidence(reason) {
  const logsPathResult = await runAgentDevice(['logs', 'path'], { allowFailure: true });
  const logTail = await readAgentDeviceLogTail(logsPathResult);

  qaChecks.push({
    name: 'Debug evidence collection',
    status: 'passed',
    critical: false,
    command: 'agent-device appstate; agent-device logs path; agent-device logs doctor',
    detail: logTail ? `${reason} Log tail: ${logTail}` : reason
  });
  await runAgentDevice(['appstate'], { allowFailure: true });
  await runAgentDevice(['logs', 'doctor'], { allowFailure: true });
}

async function readAgentDeviceLogTail(logsPathResult) {
  const logsPath = extractFirstAbsolutePath(`${logsPathResult.stdout || ''}\n${logsPathResult.stderr || ''}`);
  if (!logsPath || !existsSync(logsPath)) {
    return '';
  }

  try {
    const logText = await readFile(logsPath, 'utf8');
    const interestingLines = logText
      .split(/\r?\n/g)
      .filter((line) =>
        /worldcup|abbanmustafa|fatal|exception|error|crash|reactnative|google maps|api key|js/i.test(line)
      );
    const lines = interestingLines.length > 0 ? interestingLines : logText.split(/\r?\n/g);
    return trim(lines.slice(-30).join('\n'), 1400);
  } catch (error) {
    return `Unable to read ${logsPath}: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function extractFirstAbsolutePath(value) {
  return value.match(/(?:\/[^\s:]+)+/)?.[0] || '';
}

function shouldRetryAfterOpen(result) {
  const text = `${result.stderr || ''}\n${result.stdout || ''}`.toLowerCase();
  return (
    text.includes('session_not_found') ||
    text.includes('no active session') ||
    text.includes('wait timed out') ||
    text.includes('current surface')
  );
}

async function writeFallbackReport(modelText) {
  const criticalFailures = qaChecks.filter((check) => check.critical && check.status === 'failed');
  const summary =
    criticalFailures.length > 0
      ? `Deterministic ${PLATFORM_LABEL} smoke QA found ${criticalFailures.length} critical failure(s). The AI model returned text but did not call write_report, so this report was generated from simulator evidence.`
      : `Deterministic ${PLATFORM_LABEL} smoke QA covered launch, search, map mounting, the Culture filter, Koreatown search, and the Argentina Matchday Passport. The AI model returned text but did not call write_report, so this report was generated from simulator evidence.`;

  await writeReport({
    overallStatus: criticalFailures.length > 0 ? 'failed' : 'passed',
    summary,
    checked: [
      ...qaChecks.map(formatQaCheck),
      `AI fallback: ${trim(modelText || 'The model returned no text.', 500)}`
    ],
    issues: criticalFailures.map(formatQaCheck),
    nextSteps:
      criticalFailures.length > 0
        ? ['Fix the failing deterministic checks above, then rerun the EAS workflow.']
        : ['Keep the deterministic smoke report as the source of truth if the AI model omits write_report.']
  });
}

async function writeReport(input) {
  await mkdir(ARTIFACTS_DIR, { recursive: true });
  await stopScreenRecording();

  const screenshots = await collectScreenshots(input.screenshotLabels || []);
  const recordings = await collectRecordings();
  const criticalFailures = qaChecks.filter((check) => check.critical && check.status === 'failed');
  const checked = dedupe([...qaChecks.map(formatQaCheck), ...(input.checked || [])]);
  const issues = dedupe([...criticalFailures.map(formatQaCheck), ...(input.issues || [])]);
  const overallStatus =
    criticalFailures.length > 0 && input.overallStatus === 'passed' ? 'failed' : input.overallStatus;
  const report = {
    ...input,
    overallStatus,
    checked,
    issues,
    generatedAt: new Date().toISOString(),
    model: MODEL_ID,
    provider: QA_PROVIDER,
    buildId: context.buildId,
    workflowUrl: context.workflowUrl,
    platform: QA_PLATFORM,
    platformLabel: PLATFORM_LABEL,
    prNumber: context.prNumber,
    screenshots,
    recordings,
    qaChecks,
    launchAttempts,
    agentDeviceTrace
  };

  const section = renderSection(report);
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(SECTION_PATH, section, 'utf8');
  await writeFile(STATUS_PATH, `${report.overallStatus}\n`, 'utf8');
  console.log(`\n--- QA REPORT (${PLATFORM_LABEL}) ---\n${section}--- END QA REPORT ---\n`);

  return report;
}

async function collectScreenshots(screenshotLabels) {
  const labelByFileName = new Map(screenshotLabels.map((item) => [item.fileName, item.label]));

  let entries = [];
  try {
    entries = await readdir(SCREENSHOTS_DIR);
  } catch {
    return [];
  }

  const screenshots = [];

  for (const fileName of entries.filter((name) => /\.(png|jpe?g)$/i.test(name)).sort()) {
    const absolutePath = path.join(SCREENSHOTS_DIR, fileName);
    const fileStat = await stat(absolutePath);
    const screenshot = {
      fileName,
      absolutePath,
      relativePath: path.relative(ROOT_DIR, absolutePath),
      bytes: fileStat.size,
      label: labelByFileName.get(fileName) || humanizeScreenshotLabel(fileName)
    };

    screenshots.push(screenshot);
  }

  return screenshots;
}

async function collectRecordings() {
  const recordingPaths = await collectFiles(RECORDINGS_DIR, /\.(mp4|mov|webm)$/i);
  const recordings = [];

  for (const absolutePath of recordingPaths.sort()) {
    const fileStat = await stat(absolutePath);
    const fileName = path.basename(absolutePath);
    recordings.push({
      fileName,
      absolutePath,
      relativePath: path.relative(ROOT_DIR, absolutePath),
      bytes: fileStat.size,
      label: humanizeArtifactLabel(fileName)
    });
  }

  return recordings;
}

async function collectFiles(directory, matcher) {
  let entries = [];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath, matcher)));
      continue;
    }

    if (entry.isFile() && matcher.test(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files;
}

function renderSection(report) {
  const lines = [
    `### ${report.platformLabel}`,
    '',
    `**Status:** ${statusLabel(report.overallStatus)}`,
    '',
    `**Summary:** ${report.summary}`,
    ''
  ];

  appendList(lines, 'Checked', report.checked);
  appendList(lines, 'Issues', report.issues.length ? report.issues : ['No issues reported.']);
  appendList(lines, 'Next steps', report.nextSteps);

  if (report.screenshots.length > 0) {
    lines.push('**Screenshots**', '');
    for (const screenshot of report.screenshots) {
      const target = screenshot.blobUrl || screenshot.relativePath || screenshot.absolutePath;
      lines.push(`- [${screenshot.label || screenshot.fileName}](${target})`);
    }
    lines.push('');
  }

  if (report.recordings.length > 0) {
    lines.push('**Screen recordings**', '');
    for (const recording of report.recordings) {
      lines.push(
        `- ${recording.label || recording.fileName}: \`${recording.relativePath}\` (${formatBytes(recording.bytes)})`
      );
    }
    lines.push('');
  }

  if (report.agentDeviceTrace.length > 0) {
    lines.push('**agent-device trace**', '');
    for (const entry of report.agentDeviceTrace.slice(-8)) {
      lines.push(`- ${entry.ok ? 'ok' : 'failed'}: \`${entry.command}\``);
    }
    lines.push('');
  }

  return `${lines.join('\n').trim()}\n`;
}

function formatQaCheck(check) {
  const detail = check.detail ? ` - ${check.detail.replace(/\s+/g, ' ')}` : '';
  return `${check.status}: ${check.name} via \`${check.command}\`${detail}`;
}

function sanitizeAgentDeviceArgs(args) {
  const rawArgs = args.map(String);
  const sanitized = [];
  const flagsWithValues = new Set([
    '--session',
    '--platform',
    '--device',
    '--udid',
    '--serial',
    '--android-device-allowlist',
    '--ios-simulator-device-set',
    '--session-lock',
    '--session-lock-conflicts',
    '--tenant',
    '--run-id',
    '--lease-id',
    '--lease-backend'
  ]);
  const flagsWithoutValues = new Set(['--session-locked']);

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (index === 0 && arg === AGENT_DEVICE_BIN) {
      continue;
    }

    if (flagsWithValues.has(arg)) {
      index += 1;
      continue;
    }

    if ([...flagsWithValues].some((flag) => arg.startsWith(`${flag}=`)) || flagsWithoutValues.has(arg)) {
      continue;
    }

    if (/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(arg)) {
      sanitized.push(...arg.split(','));
      continue;
    }

    sanitized.push(arg);
  }

  return sanitized.length > 0 ? sanitized : ['snapshot'];
}

function formatCommand(args) {
  return [AGENT_DEVICE_BIN, ...args.map(String)].map(shellQuote).join(' ');
}

function shellQuote(value) {
  if (/^[a-zA-Z0-9_./:=@-]+$/.test(value)) {
    return value;
  }

  return `'${value.replaceAll("'", "'\\''")}'`;
}

function dedupe(values) {
  return [...new Set(values.filter(Boolean))];
}

function appendList(lines, title, values = []) {
  if (!values.length) {
    return;
  }

  lines.push(`**${title}**`, '');
  for (const value of values) {
    lines.push(`- ${value}`);
  }
  lines.push('');
}

function statusLabel(status) {
  return (
    {
      passed: 'passed',
      failed: 'failed',
      blocked: 'blocked',
      not_tested: 'not tested',
      unsure: 'unsure'
    }[status] || status
  );
}

function humanizeArtifactLabel(fileName) {
  return humanizeScreenshotLabel(fileName.replace(/-agent-qa/g, '-qa'));
}

function humanizeScreenshotLabel(fileName) {
  return fileName
    .replace(/\.[^.]+$/, '')
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

function parseJson(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function trim(value, max = 6000) {
  const text = String(value);
  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, max)}\n...`;
}

if (!existsSync(ROOT_DIR)) {
  throw new Error(`Project root does not exist: ${ROOT_DIR}`);
}
