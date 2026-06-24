/**
 * Phase 4 execution types — phase execution, compression, modes, and pipeline results.
 */

import type { Roadmap, RoadmapPhase } from '../roadmap/types.js';

import type { HandoffState } from '../handoff/types.js';

import type { ExecutionMode } from '../../types.js';

import type { PhaseRange, PipelineRunOptions, SessionStatus } from './types.js';

export type PhaseExecutionResultType = 'success' | 'blocked' | 'completed';

export interface ExecutePhaseOptions {
  readonly phase: RoadmapPhase;
  readonly completedTaskIds: readonly string[];
}

export interface PhaseExecutionResult {
  readonly type: PhaseExecutionResultType;
  readonly phaseNumber: number;
  readonly selectedTaskIds: readonly string[];
  readonly alreadyComplete: boolean;
  readonly blockedBy: readonly string[];
  readonly blockerSummary: string | null;
}

export interface HandlePhaseFailureOptions {
  readonly phaseNumber: number;
  readonly errorMessage: string;
  readonly attemptedTaskIds: readonly string[];
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly handoffState: HandoffState;
}

export interface PhaseFailureResult {
  readonly phaseNumber: number;
  readonly errorMessage: string;
  readonly attemptedTaskIds: readonly string[];
  readonly handoffUpdate: HandoffState;
  readonly blockerSummary: string | null;
}

export interface SessionMessage {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
}

export interface CompressionOptions {
  readonly headCount?: number;
  readonly tailCount?: number;
  readonly threshold?: number;
}

export interface ExtractedContext {
  readonly head: readonly SessionMessage[];
  readonly middle: readonly SessionMessage[];
  readonly tail: readonly SessionMessage[];
}

export interface CompressedSession {
  readonly messages: readonly SessionMessage[];
  readonly middleSummary: string;
  readonly compressedCount: number;
  readonly applied: boolean;
}

export class ModeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModeValidationError';
  }
}

export interface ModeResolutionOptions {
  readonly mode: ExecutionMode;
  readonly phase?: number;
  readonly range?: PhaseRange;
  readonly allPhases: readonly number[];
  readonly pendingPhases: readonly number[];
}

export interface ModeResolution {
  readonly phases: readonly number[];
}

export class OrchestrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrchestrationError';
  }
}

export interface PipelineRunInput {
  readonly roadmap: Roadmap;
  readonly requirementsText?: string;
  readonly options: PipelineRunOptions;
  readonly completedTaskIds?: readonly string[];
}

export interface PipelineRunResult {
  readonly sessionId: string;
  readonly executedPhases: readonly number[];
  readonly finalStatus: SessionStatus;
  readonly blockedPhase: number | null;
  readonly failure: PhaseFailureResult | null;
}

export interface RunContinuousInput {
  readonly roadmap: Roadmap;
  readonly completedTaskIds?: readonly string[];
  readonly requirementsText?: string;
}

export interface RunSinglePhaseInput {
  readonly roadmap: Roadmap;
  readonly phase: number;
  readonly completedTaskIds?: readonly string[];
  readonly requirementsText?: string;
}
