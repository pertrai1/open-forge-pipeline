/**
 * Orchestrator types — Intent, Strategy, SessionState, and related interfaces.
 */

import type { ExecutionMode, ModelTier, PhaseState } from '../../types.js';

import type { TaskComplexity } from '../roadmap/types.js';

/** Intent classification for incoming requirements. */
export type Intent =
  | 'new-project'
  | 'feature-add'
  | 'bug-fix'
  | 'refactor'
  | 'migration';

/** Strategy mapped to each intent. */
export type Strategy =
  | 'full-pipeline'
  | 'incremental'
  | 'targeted'
  | 'transformation'
  | 'port';

/** Intent-to-strategy mapping. */
export interface IntentStrategyMapping {
  readonly intent: Intent;
  readonly strategy: Strategy;
  readonly description: string;
}

/** Session status. */
export type SessionStatus =
  | 'active'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** State of a single orchestrator session. */
export interface SessionState {
  readonly sessionId: string;
  readonly status: SessionStatus;
  readonly intent: Intent;
  readonly strategy: Strategy;
  readonly mode: ExecutionMode;
  readonly currentPhase: PhaseState | null;
  readonly totalPhases: number;
  readonly completedPhases: number;
  readonly startedAt: string;
  readonly lastActivityAt: string;
  readonly clarificationRoundsUsed: number;
  readonly maxClarificationRounds: number;
}

/** Phase range for range execution mode. */
export interface PhaseRange {
  readonly start: number;
  readonly end: number;
}

/** Options for starting a pipeline run. */
export interface PipelineRunOptions {
  readonly mode: ExecutionMode;
  readonly phase?: number;
  readonly range?: PhaseRange;
  readonly requirementsPath?: string;
  readonly resume?: boolean;
}

/** Options for creating an orchestrator session. */
export interface CreateSessionOptions {
  readonly intent: Intent;
  readonly strategy: Strategy;
  readonly mode: ExecutionMode;
  readonly phases: readonly PhaseState[];
}

/** Typed error for session operations. */
export class SessionError extends Error {
  readonly sessionId: string;

  constructor(sessionId: string, message: string) {
    super(message);
    this.name = 'SessionError';
    this.sessionId = sessionId;
  }
}

/** Re-export TaskComplexity and ModelTier for router consumers. */
export type { TaskComplexity, ModelTier };

// Re-export Phase 4 execution types for compatibility.
export type {
  PhaseExecutionResultType,
  ExecutePhaseOptions,
  PhaseExecutionResult,
  HandlePhaseFailureOptions,
  PhaseFailureResult,
  SessionMessage,
  CompressionOptions,
  ExtractedContext,
  CompressedSession,
  ModeResolutionOptions,
  ModeResolution,
  PipelineRunInput,
  PipelineRunResult,
  RunContinuousInput,
  RunSinglePhaseInput,
} from './execution-types.js';

export { ModeValidationError, OrchestrationError } from './execution-types.js';
