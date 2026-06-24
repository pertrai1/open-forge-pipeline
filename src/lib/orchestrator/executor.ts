/**
 * Phase executor — coordinates roadmap phase execution and handles phase failures.
 * Does NOT implement source changes, run quality gates, or perform checkpoint rollback.
 */

import type {
  ExecutePhaseOptions,
  PhaseExecutionResult,
  HandlePhaseFailureOptions,
  PhaseFailureResult,
} from './types.js';

import { updateCurrentState } from '../handoff/manager.js';

/**
 * Execute phase coordination.
 * Identifies actionable tasks and returns a structured execution result.
 */
export function executePhase(
  options: ExecutePhaseOptions
): PhaseExecutionResult {
  const { phase, completedTaskIds } = options;
  const completedSet = new Set(completedTaskIds);

  const pendingTasks = phase.tasks.filter(
    (t) => !t.completed && !completedSet.has(t.id)
  );

  if (pendingTasks.length === 0) {
    return {
      type: 'completed',
      phaseNumber: phase.number,
      selectedTaskIds: [],
      alreadyComplete: true,
      blockedBy: [],
      blockerSummary: null,
    };
  }

  const actionable = pendingTasks.filter((task) =>
    task.dependencies.every((dep) => {
      if (completedSet.has(dep)) {
        return true;
      }
      const depTask = phase.tasks.find((t) => t.id === dep);
      return depTask?.completed ?? false;
    })
  );

  if (actionable.length === 0) {
    const blockedBy = pendingTasks.map((t) => t.id);
    return {
      type: 'blocked',
      phaseNumber: phase.number,
      selectedTaskIds: [],
      alreadyComplete: false,
      blockedBy,
      blockerSummary: `Phase ${phase.number} blocked by unsatisfied dependencies: ${blockedBy.join(', ')}`,
    };
  }

  return {
    type: 'success',
    phaseNumber: phase.number,
    selectedTaskIds: actionable.map((t) => t.id),
    alreadyComplete: false,
    blockedBy: [],
    blockerSummary: null,
  };
}

/**
 * Handle phase failure.
 * Records failure context in handoff-compatible state and returns a structured failure result.
 * Includes a blocker summary for PIPELINE-ISSUES.md when the retry limit is reached.
 */
export function handlePhaseFailure(
  options: HandlePhaseFailureOptions
): PhaseFailureResult {
  const {
    phaseNumber,
    errorMessage,
    attemptedTaskIds,
    retryCount,
    maxRetries,
    handoffState,
  } = options;

  const atRetryLimit = retryCount >= maxRetries;

  const handoffUpdate = updateCurrentState(handoffState, {
    status: 'blocked',
    currentPhase: phaseNumber,
  });

  const blockerSummary = atRetryLimit
    ? `Phase ${phaseNumber} blocked after ${retryCount} retries: ${errorMessage}. Attempted tasks: ${attemptedTaskIds.join(', ')}. Human intervention required.`
    : null;

  return {
    phaseNumber,
    errorMessage,
    attemptedTaskIds,
    handoffUpdate,
    blockerSummary,
  };
}
