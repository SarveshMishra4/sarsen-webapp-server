import { env } from '../config/env.js';

// ─── Level Hierarchy ─────────────────────────────────────────────────────────

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'force';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  force: 4, // Highest priority to ensure it always prints
};

const LEVEL_LABELS: Record<LogLevel, string> = {
  debug: 'DEBUG',
  info:  'INFO ',
  warn:  'WARN ',
  error: 'ERROR',
  force: 'FORCE',
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info:  '\x1b[32m', // green
  warn:  '\x1b[33m', // yellow
  error: '\x1b[31m', // red
  force: '\x1b[35m', // magenta
};
const RESET = '\x1b[0m';

// ─── Timestamp ───────────────────────────────────────────────────────────────

const getTimestamp = (): string => {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
};

// ─── Core Log Function ───────────────────────────────────────────────────────

const log = (level: LogLevel, message: string, context?: Record<string, any> | Error): void => {
  const configuredLevel = (env.LOG_LEVEL ?? 'info') as LogLevel;

  // 🚨 FORCE bypass: If level is 'force', we ignore priorities and print anyway.
  if (level !== 'force' && LEVEL_PRIORITY[level] < LEVEL_PRIORITY[configuredLevel]) return;

  const timestamp = getTimestamp();
  const label = LEVEL_LABELS[level];

  // 🚨 NAKED LOG: If we are in 'force' mode, we use a standard console.log prefix 
  // to ensure no ANSI interference in weird terminal environments.
  const prefix = (env.IS_DEVELOPMENT || level === 'force')
    ? `${LEVEL_COLORS[level]}[${timestamp}] [${label}]${RESET}`
    : `[${timestamp}] [${label}]`;

  if (context instanceof Error) {
    console.log(`${prefix} ${message}\n         Message : ${context.message}\n         Stack   : ${context.stack}`);
    return;
  }

  if (context && Object.keys(context).length > 0) {
    const contextStr = JSON.stringify(context, null, 2);
    console.log(`${prefix} ${message}\n${contextStr}`);
    return;
  }

  console.log(`${prefix} ${message}`);
};

// ─── Public Logger Interface ─────────────────────────────────────────────────

export const logger = {
  /**
   * 🚨 EMERGENCY USE: Use this when you are "blind." 
   * It ignores LOG_LEVEL and prints no matter what.
   */
  force: (message: string, context?: Record<string, any>) => log('force', message, context),

  /**
   * Detailed internal logs — only visible when LOG_LEVEL=debug.
   */
  debug: (message: string, context?: Record<string, any>) => log('debug', message, context),

  /**
   * Normal operation logs.
   */
  info: (message: string, context?: Record<string, any>) => log('info', message, context),

  /**
   * Something unexpected but recoverable.
   */
  warn: (message: string, context?: Record<string, any> | Error) => log('warn', message, context),

  /**
   * Something broke. Always pass the Error object.
   */
  error: (message: string, context?: Record<string, any> | Error) => log('error', message, context),

  /**
   * Raw dump of any data to console.log without any prefixing or formatting.
   */
  raw: (label: string, data: any) => {
    console.log(`\n=== RAW DEBUG: ${label} ===`);
    console.dir(data, { depth: null, colors: true });
    console.log(`===========================\n`);
  },

  section: (label: string) => {
    const line = '─'.repeat(20);
    console.log(`\n${line} ${label.toUpperCase()} ${line}\n`);
  },
};