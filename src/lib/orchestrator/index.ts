/**
 * Orchestrator entry points — runPipeline, runContinuous, and runSinglePhase.
 * Composes session, router, executor, compressor, and mode modules.
 */

import type { RoadmapPhase } from '../roadmap/types.js';

import type { PhaseState, PhaseStatus } from '../../types.js';

import type {
  Intent,
  PipelineRunInput,
  PipelineRunResult,
  RunContinuousInput,
  RunSinglePhaseInput,
} from './types.js';

import { OrchestrationError } from './types.js';

import { createSession, endSession } from './session.js';
import { classifyIntent, selectStrategy } from './router.js';
import { executePhase } from './executor.js';
import { resolvePhases } from './modes.js';

export { OrchestrationError };

const DEFAULT_MAX_RETRIES = 3;

interface ExecutePhasesOptions {
  readonly sessionId: string;
  readonly phaseNumbers: readonly number[];
  readonly roadmapPhases: readonly RoadmapPhase[];
  readonly initialCompletedTaskIds: readonly string[];
}

/**
 * Run the pipeline according to the selected execution mode.
 * Creates a session, applies routing decisions, delegates execution,
 * and returns a structured run result.
 */
export function runPipeline(input: PipelineRunInput): PipelineRunResult {
  const { roadmap, options, completedTaskIds = [] } = input;

  const intent = input.requirementsText
    ? classifyIntent(input.requirementsText)
    : 'feature-add';
  const strategy = selectStrategy(intent);

  const phaseStates = roadmapToPhaseStates(roadmap.phases);
  const session = createSession({
    intent,
    strategy,
    mode: options.mode,
    phases: phaseStates,
  });

  const allPhases = getAllPhaseNumbers(roadmap.phases);
  const pendingPhases = getPendingPhaseNumbers(roadmap.phases);

  const resolution = resolvePhases({
    mode: options.mode,
    phase: options.phase,
    range: options.range,
    allPhases,
    pendingPhases,
  });

  return executePhasesInOrder({
    sessionId: session.sessionId,
    phaseNumbers: resolution.phases,
    roadmapPhases: roadmap.phases,
    initialCompletedTaskIds: completedTaskIds,
  });
}

/**
 * Run continuous execution — coordinates eligible phases in roadmap order
 * until no eligible phases remain or a failure occurs.
 */
export function runContinuous(input: RunContinuousInput): PipelineRunResult {
  const { roadmap, completedTaskIds = [] } = input;

  const intent: Intent = input.requirementsText
    ? classifyIntent(input.requirementsText)
    : 'feature-add';
  const strategy = selectStrategy(intent);

  const phaseStates = roadmapToPhaseStates(roadmap.phases);
  const session = createSession({
    intent,
    strategy,
    mode: 'continuous',
    phases: phaseStates,
  });

  const pendingPhases = getPendingPhaseNumbers(roadmap.phases);

  return executePhasesInOrder({
    sessionId: session.sessionId,
    phaseNumbers: [...pendingPhases].sort((a, b) => a - b),
    roadmapPhases: roadmap.phases,
    initialCompletedTaskIds: completedTaskIds,
  });
}

/**
 * Run single-phase execution — coordinates exactly one requested phase.
 * Throws OrchestrationError if the phase number is not in the roadmap.
 */
export function runSinglePhase(input: RunSinglePhaseInput): PipelineRunResult {
  const { roadmap, phase, completedTaskIds = [] } = input;

  const allPhases = getAllPhaseNumbers(roadmap.phases);
  if (!allPhases.includes(phase)) {
    throw new OrchestrationError(`Phase ${phase} not found in roadmap`);
  }

  const intent: Intent = input.requirementsText
    ? classifyIntent(input.requirementsText)
    : 'feature-add';
  const strategy = selectStrategy(intent);

  const phaseStates = roadmapToPhaseStates(roadmap.phases);
  const session = createSession({
    intent,
    strategy,
    mode: 'single-phase',
    phases: phaseStates,
  });

  return executePhasesInOrder({
    sessionId: session.sessionId,
    phaseNumbers: [phase],
    roadmapPhases: roadmap.phases,
    initialCompletedTaskIds: completedTaskIds,
  });
}

function executePhasesInOrder(
  options: ExecutePhasesOptions
): PipelineRunResult {
  const { sessionId, phaseNumbers, roadmapPhases, initialCompletedTaskIds } =
    options;
  const executedPhases: number[] = [];
  const completedTaskIds = new Set(initialCompletedTaskIds);

  for (const phaseNumber of phaseNumbers) {
    const phase = roadmapPhases.find((p) => p.number === phaseNumber);
    if (!phase) {
      continue;
    }

    const result = executePhase({
      phase,
      completedTaskIds: [...completedTaskIds],
    });

    if (result.type === 'blocked') {
      endSession(sessionId, 'paused');
      return {
        sessionId,
        executedPhases,
        finalStatus: 'paused',
        blockedPhase: phaseNumber,
        // TODO: failure is populated once Phase 5 execution engine integration
        // surfaces runtime errors through handlePhaseFailure().
        failure: null,
      };
    }

    if (result.type === 'success') {
      for (const taskId of result.selectedTaskIds) {
        completedTaskIds.add(taskId);
      }
    }

    executedPhases.push(phaseNumber);
  }

  endSession(sessionId, 'completed');
  return {
    sessionId,
    executedPhases,
    finalStatus: 'completed',
    blockedPhase: null,
    // TODO: failure is populated once Phase 5 execution engine integration
    // surfaces runtime errors through handlePhaseFailure().
    failure: null,
  };
}

function roadmapToPhaseStates(phases: readonly RoadmapPhase[]): PhaseState[] {
  return phases.map((phase) => {
    const pendingTasks = phase.tasks
      .filter((t) => !t.completed)
      .map((t) => t.id);
    const completedTasks = phase.tasks
      .filter((t) => t.completed)
      .map((t) => t.id);

    const status: PhaseStatus =
      pendingTasks.length === 0 ? 'completed' : 'pending';

    return {
      phaseNumber: phase.number,
      phaseName: phase.name,
      status,
      pendingTasks,
      completedTasks,
      qualityGatesPassed: false,
      retryCount: 0,
      maxRetries: DEFAULT_MAX_RETRIES,
    };
  });
}

function getAllPhaseNumbers(phases: readonly RoadmapPhase[]): number[] {
  return phases.map((p) => p.number);
}

function getPendingPhaseNumbers(phases: readonly RoadmapPhase[]): number[] {
  return phases
    .filter((phase) => phase.tasks.some((t) => !t.completed))
    .map((p) => p.number);
}
