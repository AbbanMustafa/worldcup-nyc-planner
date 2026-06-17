import { execFile as execFileCallback } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { anthropic } from '@ai-sdk/anthropic';
import { put } from '@vercel/blob';
import { generateText, gateway, hasToolCall, stepCountIs, tool } from 'ai';
import { z } from 'zod';

const execFile = promisify(execFileCallback);

const ROOT_DIR = process.cwd();
const ARTIFACTS_DIR = path.join(ROOT_DIR, 'artifacts', 'qa');
const SCREENSHOTS_DIR = path.join(tmpdir(), `worldcup-agent-qa-${Date.now()}`);
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'report.json');
const SECTION_PATH = path.join(ARTIFACTS_DIR, 'section.md');
const STATUS_PATH = path.join(ARTIFACTS_DIR, 'status.txt');
const AGENT_DEVICE_BIN = 'agent-device';

const QA_PLATFORM = process.env.QA_PLATFORM === 'ios' ? 'ios' : 'android';
const PLATFORM_LABEL = QA_PLATFORM === 'ios' ? 'iOS' : 'Android';
const HAS_ANTHROPIC_KEY = Boolean(process.env.ANTHROPIC_API_KEY);
const HAS_GATEWAY_KEY = Boolean(process.env.AI_GATEWAY_API_KEY);
const QA_PROVIDER = process.env.QA_PROVIDER || 'anthropic';
const MODEL_ID =
  process.env.QA_MODEL || (QA_PROVIDER === 'anthropic' ? 'claude-haiku-4-5' : 'openai/gpt-5.4-mini');
const BOOTSTRAP_ERROR = process.env.AGENT_QA_BOOTSTRAP_ERROR;
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
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
  screenshotDirectory: SCREENSHOTS_DIR
};

const agentDeviceTrace = [];
let reportWasWritten = false;

await main();

async function main() {
  await mkdir(ARTIFACTS_DIR, { recursive: true });
  await mkdir(SCREENSHOTS_DIR, { recursive: true });

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
        'Capture screenshots as evidence. A report without screenshots is incomplete unless the app cannot launch.',
        'Finish by calling write_report exactly once.'
      ].join('\n'),
      prompt: buildPrompt()
    });

    if (!reportWasWritten) {
      await writeReport({
        overallStatus: 'unsure',
        summary: trim(result.text || 'The model finished without writing a structured report.', 800),
        checked: ['The AI model returned text, but did not call write_report.'],
        issues: ['No structured QA report was produced.'],
        nextSteps: ['Review the raw agent text and rerun with a stronger prompt or more steps.']
      });
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
    '- The app launches to "World Cup stays local." without a redbox/logbox overlay.',
    '- The search field is visible and usable.',
    '- The real NYC map is visible and not blank; native map tiles or Apple/Google map UI should be present.',
    '- Pins and labels update when filters change.',
    '- The Culture filter can be selected and shows culture-first route content.',
    '- Searching for Koreatown surfaces "Koreatown Red Devils Stop".',
    '- Country chips include flag emojis or equivalent flag glyphs next to country names.',
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
    '',
    'Suggested flow:',
    `1. Call app_context and read the app-specific test notes.`,
    '2. Use agent_device with ["react-native", "dismiss-overlay"] if a React Native overlay appears.',
    '3. Use agent_device with ["appstate"], then ["snapshot", "-i"].',
    `4. Capture a home screenshot at ${path.join(SCREENSHOTS_DIR, '01-home.png')}.`,
    '5. Press id="filter-culture"; verify "Culture" content, route cards, and the active pin count.',
    `6. Capture a culture screenshot at ${path.join(SCREENSHOTS_DIR, '02-culture.png')}.`,
    '7. Fill id="search-input" with "Koreatown"; verify the Koreatown card and Korea Republic country chip.',
    `8. Capture a search screenshot at ${path.join(SCREENSHOTS_DIR, '03-search-koreatown.png')}.`,
    '9. Call write_report with a concise status, evidence, issues, next steps, and screenshot labels.',
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
      selectors: [
        'id="worldcup-screen"',
        'id="search-input"',
        'id="filter-culture"',
        'id="map-shell"',
        'id="real-map"',
        'id="spot-detail-card"'
      ],
      expectedText: [
        'World Cup stays local.',
        'NYC culture map',
        'Culture',
        'Koreatown Red Devils Stop',
        'Korea Republic'
      ]
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
        }))
      };
    }
  });
}

async function runAgentDevice(args, options = {}) {
  const command = `${AGENT_DEVICE_BIN} ${args.join(' ')}`;

  try {
    const result = await execFile(AGENT_DEVICE_BIN, args, {
      cwd: ROOT_DIR,
      timeout: 120_000,
      maxBuffer: 6 * 1024 * 1024
    });

    const entry = {
      command,
      ok: true,
      exitCode: 0,
      stdout: trim(result.stdout || ''),
      stderr: trim(result.stderr || '')
    };
    agentDeviceTrace.push(entry);
    return entry;
  } catch (error) {
    const entry = {
      command,
      ok: false,
      exitCode: typeof error?.code === 'number' ? error.code : 1,
      stdout: trim(error?.stdout || ''),
      stderr: trim(error?.stderr || error?.message || '')
    };
    agentDeviceTrace.push(entry);

    if (options.allowFailure) {
      return entry;
    }

    throw error;
  }
}

async function writeReport(input) {
  await mkdir(ARTIFACTS_DIR, { recursive: true });

  const screenshots = await collectScreenshots(input.screenshotLabels || []);
  const report = {
    ...input,
    generatedAt: new Date().toISOString(),
    model: MODEL_ID,
    provider: QA_PROVIDER,
    buildId: context.buildId,
    workflowUrl: context.workflowUrl,
    platform: QA_PLATFORM,
    platformLabel: PLATFORM_LABEL,
    prNumber: context.prNumber,
    screenshots,
    agentDeviceTrace
  };

  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(SECTION_PATH, renderSection(report), 'utf8');
  await writeFile(STATUS_PATH, `${report.overallStatus}\n`, 'utf8');

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
      bytes: fileStat.size,
      label: labelByFileName.get(fileName) || humanizeScreenshotLabel(fileName)
    };

    if (BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(blobPath(fileName), await readFile(absolutePath), {
          access: 'public',
          contentType: fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
          token: BLOB_READ_WRITE_TOKEN
        });
        screenshot.blobUrl = blob.url;
        screenshot.blobDownloadUrl = blob.downloadUrl;
        screenshot.blobPathname = blob.pathname;
      } catch (error) {
        screenshot.uploadError = error instanceof Error ? error.message : String(error);
      }
    }

    screenshots.push(screenshot);
  }

  return screenshots;
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
      const target = screenshot.blobUrl || screenshot.absolutePath;
      lines.push(`- [${screenshot.label || screenshot.fileName}](${target})`);
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

function blobPath(fileName) {
  const prefix = [
    'worldcup-agent-qa',
    context.prNumber ? `pr-${context.prNumber}` : 'manual',
    context.buildId || Date.now().toString(),
    QA_PLATFORM
  ]
    .map(sanitizePathPart)
    .join('/');

  return `${prefix}/${sanitizePathPart(fileName)}`;
}

function sanitizePathPart(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]/g, '-');
}

function humanizeScreenshotLabel(fileName) {
  return fileName
    .replace(/\.[^.]+$/, '')
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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
