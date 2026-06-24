/**
 * Session management — in-memory session lifecycle for orchestrator sessions.
 */

import { randomUUID } from 'node:crypto';

import type {
  CreateSessionOptions,
  SessionState,
  SessionStatus,
} from './types.js';

export { SessionError } from './types.js';
import { SessionError } from './types.js';

const sessionStore = new Map<string, SessionState>();

let lastTimestampMs = 0;

function monotonicTimestamp(): string {
  const now = Date.now();
  const ms = now > lastTimestampMs ? now : lastTimestampMs + 1;
  lastTimestampMs = ms;
  return new Date(ms).toISOString();
}

const TERMINAL_STATUSES: readonly SessionStatus[] = [
  'completed',
  'failed',
  'cancelled',
];

/**
 * Clear the in-memory session store. Intended for test isolation.
 */
export function resetSessionStore(): void {
  sessionStore.clear();
}

/**
 * Create an active orchestrator session.
 * Stores the session in-memory and returns the new SessionState.
 */
export function createSession(options: CreateSessionOptions): SessionState {
  const sessionId = randomUUID();
  const now = monotonicTimestamp();

  const completedPhases = options.phases.filter(
    (p) => p.status === 'completed'
  ).length;

  const currentPhase =
    options.phases.find(
      (p) => p.status === 'pending' || p.status === 'in-progress'
    ) ?? null;

  const state: SessionState = {
    sessionId,
    status: 'active',
    intent: options.intent,
    strategy: options.strategy,
    mode: options.mode,
    currentPhase,
    totalPhases: options.phases.length,
    completedPhases,
    startedAt: now,
    lastActivityAt: now,
    clarificationRoundsUsed: 0,
    maxClarificationRounds: 2,
  };

  sessionStore.set(sessionId, state);
  return state;
}

/**
 * Transition an existing session to a terminal status.
 * Throws SessionError if the session ID does not exist.
 * Does not mutate the original session object.
 */
export function endSession(
  sessionId: string,
  status: SessionStatus
): SessionState {
  const existing = sessionStore.get(sessionId);

  if (!existing) {
    throw new SessionError(sessionId, `Session not found: ${sessionId}`);
  }

  const updated: SessionState = {
    ...existing,
    status,
    lastActivityAt: monotonicTimestamp(),
  };

  sessionStore.set(sessionId, updated);
  return updated;
}

/**
 * Return the current SessionState for a known session ID, or null if unknown.
 */
export function getSessionState(sessionId: string): SessionState | null {
  return sessionStore.get(sessionId) ?? null;
}

/**
 * Whether a session status is terminal (no longer active or paused).
 */
export function isTerminalStatus(status: SessionStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}
