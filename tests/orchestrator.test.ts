import {
  createSession,
  endSession,
  getSessionState,
  resetSessionStore,
  SessionError,
} from '../src/lib/orchestrator/session.js';

import {
  classifyIntent,
  selectStrategy,
  routeModelByComplexity,
} from '../src/lib/orchestrator/router.js';

import {
  executePhase,
  handlePhaseFailure,
} from '../src/lib/orchestrator/executor.js';

import {
  extractMiddleContext,
  compressSession,
} from '../src/lib/orchestrator/compressor.js';

import {
  validateModeOptions,
  resolvePhases,
  ModeValidationError,
} from '../src/lib/orchestrator/modes.js';

import {
  runPipeline,
  runContinuous,
  runSinglePhase,
  OrchestrationError,
} from '../src/lib/orchestrator/index.js';

import type {
  CreateSessionOptions,
  ExecutePhaseOptions,
  HandlePhaseFailureOptions,
  SessionMessage,
  CompressionOptions,
  ModeResolutionOptions,
  PipelineRunInput,
} from '../src/lib/orchestrator/types.js';

import type { PhaseState } from '../src/types.js';

import type {
  Roadmap,
  RoadmapPhase,
  RoadmapTask,
} from '../src/lib/roadmap/types.js';

import type { HandoffState } from '../src/lib/handoff/types.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makePhaseState(overrides: Partial<PhaseState> = {}): PhaseState {
  return {
    phaseNumber: 1,
    phaseName: 'Foundation',
    status: 'pending',
    pendingTasks: ['1.1', '1.2'],
    completedTasks: [],
    qualityGatesPassed: false,
    retryCount: 0,
    maxRetries: 3,
    ...overrides,
  };
}

function makeTask(
  id: string,
  overrides: Partial<RoadmapTask> = {}
): RoadmapTask {
  return {
    id,
    description: `Task ${id}`,
    dependencies: [],
    deliverable: `src/${id}.ts`,
    completed: false,
    complexity: 'simple',
    ...overrides,
  };
}

function makePhase(overrides: Partial<RoadmapPhase> = {}): RoadmapPhase {
  return {
    number: 1,
    name: 'Foundation',
    goal: 'Set up the project',
    tasks: [makeTask('1.1'), makeTask('1.2')],
    parallelGroups: [],
    ...overrides,
  };
}

function makeRoadmap(phases: RoadmapPhase[] = []): Roadmap {
  return {
    title: 'Test Project',
    overview: 'A test project',
    phases,
  };
}

function makeHandoffState(overrides: Partial<HandoffState> = {}): HandoffState {
  return {
    sessionId: 'ses-001',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    currentState: {
      tasksCompleted: [],
      packagesTouched: ['src/lib/orchestrator'],
      branch: 'main',
      currentPhase: 1,
      status: 'in-progress',
    },
    goalContext: {
      problem: 'Build pipeline',
      userStory: 'As a dev',
      specRequirement: 'Req 1',
      currentTask: 'Implement orchestrator',
    },
    conventions: [],
    architectureDecisions: [],
    openIssues: [],
    taskLog: [],
    compressedHistory: [],
    ...overrides,
  };
}

function messageRole(i: number): 'system' | 'user' | 'assistant' {
  if (i === 0) return 'system';
  if (i % 2 === 1) return 'user';
  return 'assistant';
}

function makeMessages(count: number): SessionMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    role: messageRole(i),
    content: `Message ${i + 1}`,
  }));
}

function makeCreateSessionOptions(
  overrides: Partial<CreateSessionOptions> = {}
): CreateSessionOptions {
  return {
    intent: 'feature-add',
    strategy: 'incremental',
    mode: 'single-phase',
    phases: [makePhaseState({ phaseNumber: 1, status: 'pending' })],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1.1 Session management scenarios
// ---------------------------------------------------------------------------

describe('Session management', () => {
  beforeEach(() => {
    resetSessionStore();
  });

  describe('createSession()', () => {
    it('should create an active session with unique ID and matching fields', () => {
      const options = makeCreateSessionOptions({
        intent: 'feature-add',
        strategy: 'incremental',
        mode: 'single-phase',
        phases: [makePhaseState({ phaseNumber: 1 })],
      });

      const state = createSession(options);

      expect(state.sessionId).toBeTruthy();
      expect(state.status).toBe('active');
      expect(state.intent).toBe('feature-add');
      expect(state.strategy).toBe('incremental');
      expect(state.mode).toBe('single-phase');
      expect(state.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(state.lastActivityAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(state.totalPhases).toBe(1);
      expect(state.completedPhases).toBe(0);
    });

    it('should produce unique session IDs for separate calls', () => {
      const options = makeCreateSessionOptions();
      const state1 = createSession(options);
      const state2 = createSession(options);

      expect(state1.sessionId).not.toBe(state2.sessionId);
    });

    it('should set currentPhase to the first pending or in-progress phase', () => {
      const options = makeCreateSessionOptions({
        phases: [
          makePhaseState({ phaseNumber: 1, status: 'completed' }),
          makePhaseState({ phaseNumber: 2, status: 'pending' }),
          makePhaseState({ phaseNumber: 3, status: 'pending' }),
        ],
      });

      const state = createSession(options);

      expect(state.currentPhase).not.toBeNull();
      expect(state.currentPhase!.phaseNumber).toBe(2);
    });

    it('should set currentPhase to the first in-progress phase if no pending', () => {
      const options = makeCreateSessionOptions({
        phases: [
          makePhaseState({ phaseNumber: 1, status: 'completed' }),
          makePhaseState({ phaseNumber: 2, status: 'in-progress' }),
        ],
      });

      const state = createSession(options);

      expect(state.currentPhase).not.toBeNull();
      expect(state.currentPhase!.phaseNumber).toBe(2);
    });

    it('should set currentPhase to null when all phases are completed', () => {
      const options = makeCreateSessionOptions({
        phases: [
          makePhaseState({ phaseNumber: 1, status: 'completed' }),
          makePhaseState({ phaseNumber: 2, status: 'completed' }),
        ],
      });

      const state = createSession(options);

      expect(state.currentPhase).toBeNull();
    });

    it('should count completed phases from the roadmap state', () => {
      const options = makeCreateSessionOptions({
        phases: [
          makePhaseState({ phaseNumber: 1, status: 'completed' }),
          makePhaseState({ phaseNumber: 2, status: 'completed' }),
          makePhaseState({ phaseNumber: 3, status: 'pending' }),
        ],
      });

      const state = createSession(options);

      expect(state.totalPhases).toBe(3);
      expect(state.completedPhases).toBe(2);
    });
  });

  describe('endSession()', () => {
    it('should transition an active session to completed', () => {
      const state = createSession(makeCreateSessionOptions());
      const ended = endSession(state.sessionId, 'completed');

      expect(ended.status).toBe('completed');
      expect(ended.sessionId).toBe(state.sessionId);
    });

    it('should update lastActivityAt on end', () => {
      const state = createSession(makeCreateSessionOptions());
      const ended = endSession(state.sessionId, 'completed');

      expect(ended.lastActivityAt).not.toBe(state.lastActivityAt);
      expect(ended.lastActivityAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should not mutate the original session object', () => {
      const state = createSession(makeCreateSessionOptions());
      const originalStatus = state.status;
      endSession(state.sessionId, 'completed');

      expect(state.status).toBe(originalStatus);
      expect(state.status).toBe('active');
    });

    it('should throw SessionError for a missing session ID', () => {
      expect(() => endSession('nonexistent', 'completed')).toThrow(
        SessionError
      );
    });

    it('should include the missing session ID in the error', () => {
      try {
        endSession('missing-id', 'failed');
        expect.fail('should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionError);
        expect((error as SessionError).sessionId).toBe('missing-id');
      }
    });

    it('should update the store so getSessionState reflects the new status', () => {
      const state = createSession(makeCreateSessionOptions());
      endSession(state.sessionId, 'cancelled');

      const stored = getSessionState(state.sessionId);
      expect(stored).not.toBeNull();
      expect(stored!.status).toBe('cancelled');
    });
  });

  describe('getSessionState()', () => {
    it('should return the matching SessionState for a known ID', () => {
      const state = createSession(makeCreateSessionOptions());
      const result = getSessionState(state.sessionId);

      expect(result).not.toBeNull();
      expect(result!.sessionId).toBe(state.sessionId);
      expect(result!.intent).toBe(state.intent);
    });

    it('should return null for an unknown session ID', () => {
      const result = getSessionState('does-not-exist');
      expect(result).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// 1.2 Intent and model routing scenarios
// ---------------------------------------------------------------------------

describe('Intent and model routing', () => {
  describe('classifyIntent()', () => {
    it('should classify new project intent', () => {
      expect(classifyIntent('Create a new application from scratch')).toBe(
        'new-project'
      );
      expect(classifyIntent('Build a new web app')).toBe('new-project');
    });

    it('should classify bug fix intent', () => {
      expect(classifyIntent('Fix the crash on startup')).toBe('bug-fix');
      expect(classifyIntent('There is an error in the parser')).toBe('bug-fix');
      expect(classifyIntent('Fix the failing test regression')).toBe('bug-fix');
    });

    it('should default to feature-add when no stronger signal exists', () => {
      expect(classifyIntent('Add a dark mode toggle')).toBe('feature-add');
      expect(classifyIntent('I want to update the profile page')).toBe(
        'feature-add'
      );
    });

    it('should prefer new-project over bug-fix when both signals present', () => {
      expect(
        classifyIntent('Create a new project that handles parsing errors')
      ).toBe('new-project');
    });
  });

  describe('selectStrategy()', () => {
    it('should map new-project to full-pipeline', () => {
      expect(selectStrategy('new-project')).toBe('full-pipeline');
    });

    it('should map feature-add to incremental', () => {
      expect(selectStrategy('feature-add')).toBe('incremental');
    });

    it('should map bug-fix to targeted', () => {
      expect(selectStrategy('bug-fix')).toBe('targeted');
    });

    it('should map refactor to transformation', () => {
      expect(selectStrategy('refactor')).toBe('transformation');
    });

    it('should map migration to port', () => {
      expect(selectStrategy('migration')).toBe('port');
    });
  });

  describe('routeModelByComplexity()', () => {
    it('should route trivial tasks to cheap', () => {
      expect(routeModelByComplexity('trivial')).toBe('cheap');
    });

    it('should route simple tasks to cheap', () => {
      expect(routeModelByComplexity('simple')).toBe('cheap');
    });

    it('should route medium tasks to capable', () => {
      expect(routeModelByComplexity('medium')).toBe('capable');
    });

    it('should route complex tasks to reasoning', () => {
      expect(routeModelByComplexity('complex')).toBe('reasoning');
    });
  });
});

// ---------------------------------------------------------------------------
// 1.3 Phase execution coordination scenarios
// ---------------------------------------------------------------------------

describe('Phase execution coordination', () => {
  describe('executePhase()', () => {
    it('should return a successful result with actionable task IDs', () => {
      const phase = makePhase({
        number: 2,
        tasks: [
          makeTask('2.1', { dependencies: [] }),
          makeTask('2.2', { dependencies: ['1.1'] }),
          makeTask('2.3', { dependencies: ['1.1'] }),
        ],
      });

      const options: ExecutePhaseOptions = {
        phase,
        completedTaskIds: ['1.1'],
      };

      const result = executePhase(options);

      expect(result.type).toBe('success');
      expect(result.phaseNumber).toBe(2);
      expect(result.selectedTaskIds).toEqual(['2.1', '2.2', '2.3']);
      expect(result.alreadyComplete).toBe(false);
      expect(result.blockedBy).toEqual([]);
      expect(result.blockerSummary).toBeNull();
    });

    it('should select only tasks whose dependencies are satisfied', () => {
      const phase = makePhase({
        number: 2,
        tasks: [
          makeTask('2.1', { dependencies: [] }),
          makeTask('2.2', { dependencies: ['1.2'] }),
        ],
      });

      const options: ExecutePhaseOptions = {
        phase,
        completedTaskIds: [],
      };

      const result = executePhase(options);

      expect(result.type).toBe('success');
      expect(result.selectedTaskIds).toEqual(['2.1']);
    });

    it('should return a completed result with no selected task IDs', () => {
      const phase = makePhase({
        number: 1,
        tasks: [
          makeTask('1.1', { completed: true }),
          makeTask('1.2', { completed: true }),
        ],
      });

      const options: ExecutePhaseOptions = {
        phase,
        completedTaskIds: ['1.1', '1.2'],
      };

      const result = executePhase(options);

      expect(result.type).toBe('completed');
      expect(result.phaseNumber).toBe(1);
      expect(result.selectedTaskIds).toEqual([]);
      expect(result.alreadyComplete).toBe(true);
      expect(result.blockedBy).toEqual([]);
    });

    it('should return a blocked result when dependencies are unsatisfied', () => {
      const phase = makePhase({
        number: 3,
        tasks: [
          makeTask('3.1', { dependencies: ['2.1'] }),
          makeTask('3.2', { dependencies: ['2.2'] }),
        ],
      });

      const options: ExecutePhaseOptions = {
        phase,
        completedTaskIds: [],
      };

      const result = executePhase(options);

      expect(result.type).toBe('blocked');
      expect(result.phaseNumber).toBe(3);
      expect(result.selectedTaskIds).toEqual([]);
      expect(result.alreadyComplete).toBe(false);
      expect(result.blockedBy).toContain('3.1');
      expect(result.blockedBy).toContain('3.2');
      expect(result.blockerSummary).not.toBeNull();
      expect(result.blockerSummary).toContain('3');
    });
  });

  describe('handlePhaseFailure()', () => {
    it('should return a failure result with phase number and error message', () => {
      const handoff = makeHandoffState();
      const options: HandlePhaseFailureOptions = {
        phaseNumber: 2,
        errorMessage: 'Tests failed during execution',
        attemptedTaskIds: ['2.1', '2.2'],
        retryCount: 0,
        maxRetries: 3,
        handoffState: handoff,
      };

      const result = handlePhaseFailure(options);

      expect(result.phaseNumber).toBe(2);
      expect(result.errorMessage).toBe('Tests failed during execution');
      expect(result.attemptedTaskIds).toEqual(['2.1', '2.2']);
    });

    it('should include a handoff update describing the failure', () => {
      const handoff = makeHandoffState();
      const options: HandlePhaseFailureOptions = {
        phaseNumber: 3,
        errorMessage: 'Build error',
        attemptedTaskIds: ['3.1'],
        retryCount: 1,
        maxRetries: 3,
        handoffState: handoff,
      };

      const result = handlePhaseFailure(options);

      expect(result.handoffUpdate).toBeDefined();
      expect(result.handoffUpdate.currentState.status).toBe('blocked');
      expect(result.handoffUpdate.currentState.currentPhase).toBe(3);
    });

    it('should include a blocker summary when retry limit is reached', () => {
      const handoff = makeHandoffState();
      const options: HandlePhaseFailureOptions = {
        phaseNumber: 4,
        errorMessage: 'Persistent type error',
        attemptedTaskIds: ['4.1'],
        retryCount: 3,
        maxRetries: 3,
        handoffState: handoff,
      };

      const result = handlePhaseFailure(options);

      expect(result.blockerSummary).not.toBeNull();
      expect(result.blockerSummary).toContain('4');
      expect(result.blockerSummary).toContain('Persistent type error');
    });

    it('should not include a blocker summary when retry limit is not reached', () => {
      const handoff = makeHandoffState();
      const options: HandlePhaseFailureOptions = {
        phaseNumber: 4,
        errorMessage: 'Minor lint error',
        attemptedTaskIds: ['4.1'],
        retryCount: 0,
        maxRetries: 3,
        handoffState: handoff,
      };

      const result = handlePhaseFailure(options);

      expect(result.blockerSummary).toBeNull();
    });
  });

  describe('Respect coordination boundary', () => {
    it('should return coordination data without modifying deliverable files', () => {
      const phase = makePhase({
        number: 1,
        tasks: [makeTask('1.1', { deliverable: 'src/lib/test.ts' })],
      });

      const result = executePhase({ phase, completedTaskIds: [] });

      expect(result.type).toBe('success');
      expect(result.selectedTaskIds).toEqual(['1.1']);
    });
  });
});

// ---------------------------------------------------------------------------
// 1.4 Context compression scenarios
// ---------------------------------------------------------------------------

describe('Context compression', () => {
  describe('extractMiddleContext()', () => {
    it('should split long sessions into head, middle, and tail', () => {
      const messages = makeMessages(20);
      const result = extractMiddleContext(messages, {
        headCount: 3,
        tailCount: 3,
      });

      expect(result.head).toHaveLength(3);
      expect(result.tail).toHaveLength(3);
      expect(result.middle).toHaveLength(14);
      expect(result.head[0].content).toBe('Message 1');
      expect(result.head[2].content).toBe('Message 3');
      expect(result.tail[0].content).toBe('Message 18');
      expect(result.tail[2].content).toBe('Message 20');
      expect(result.middle[0].content).toBe('Message 4');
      expect(result.middle[13].content).toBe('Message 17');
    });

    it('should return all messages as preserved context for short sessions', () => {
      const messages = makeMessages(5);
      const result = extractMiddleContext(messages, {
        headCount: 3,
        tailCount: 3,
      });

      expect(result.head).toHaveLength(5);
      expect(result.middle).toHaveLength(0);
      expect(result.tail).toHaveLength(0);
    });

    it('should return empty middle when message count equals head plus tail', () => {
      const messages = makeMessages(6);
      const result = extractMiddleContext(messages, {
        headCount: 3,
        tailCount: 3,
      });

      expect(result.head).toHaveLength(6);
      expect(result.middle).toHaveLength(0);
      expect(result.tail).toHaveLength(0);
    });

    it('should use default head and tail counts when options omitted', () => {
      const messages = makeMessages(20);
      const result = extractMiddleContext(messages);

      expect(result.head.length).toBeGreaterThan(0);
      expect(result.tail.length).toBeGreaterThan(0);
      expect(result.middle.length).toBeGreaterThan(0);
      expect(
        result.head.length + result.middle.length + result.tail.length
      ).toBe(20);
    });
  });

  describe('compressSession()', () => {
    it('should compress long sessions with head, summary, and tail', () => {
      const messages = makeMessages(20);
      const result = compressSession(messages, {
        headCount: 3,
        tailCount: 3,
        threshold: 10,
      });

      expect(result.applied).toBe(true);
      expect(result.compressedCount).toBe(14);
      expect(result.middleSummary).toBeTruthy();
      expect(result.messages.length).toBeLessThan(20);
      expect(result.messages.length).toBe(3 + 1 + 3);
    });

    it('should not compress sessions below the threshold', () => {
      const messages = makeMessages(5);
      const result = compressSession(messages, {
        headCount: 3,
        tailCount: 3,
        threshold: 10,
      });

      expect(result.applied).toBe(false);
      expect(result.compressedCount).toBe(0);
      expect(result.middleSummary).toBe('');
      expect(result.messages).toEqual(messages);
    });

    it('should preserve head messages verbatim', () => {
      const messages = makeMessages(20);
      const result = compressSession(messages, {
        headCount: 3,
        tailCount: 3,
        threshold: 10,
      });

      expect(result.messages[0]).toEqual(messages[0]);
      expect(result.messages[1]).toEqual(messages[1]);
      expect(result.messages[2]).toEqual(messages[2]);
    });

    it('should preserve tail messages verbatim', () => {
      const messages = makeMessages(20);
      const result = compressSession(messages, {
        headCount: 3,
        tailCount: 3,
        threshold: 10,
      });

      const tailStart = result.messages.length - 3;
      expect(result.messages[tailStart]).toEqual(messages[17]);
      expect(result.messages[tailStart + 1]).toEqual(messages[18]);
      expect(result.messages[tailStart + 2]).toEqual(messages[19]);
    });

    it('should produce a deterministic summary for the same input', () => {
      const messages = makeMessages(20);
      const options: CompressionOptions = {
        headCount: 3,
        tailCount: 3,
        threshold: 10,
      };

      const result1 = compressSession(messages, options);
      const result2 = compressSession(messages, options);

      expect(result1.middleSummary).toBe(result2.middleSummary);
      expect(result1.compressedCount).toBe(result2.compressedCount);
    });
  });
});

// ---------------------------------------------------------------------------
// 1.5 Pipeline orchestration and execution mode scenarios
// ---------------------------------------------------------------------------

describe('Execution modes', () => {
  describe('validateModeOptions()', () => {
    it('should reject single-phase mode without a phase number', () => {
      const options: ModeResolutionOptions = {
        mode: 'single-phase',
        allPhases: [1, 2, 3],
        pendingPhases: [1, 2, 3],
      };

      expect(() => validateModeOptions(options)).toThrow(ModeValidationError);
    });

    it('should accept continuous mode without a phase number or range', () => {
      const options: ModeResolutionOptions = {
        mode: 'continuous',
        allPhases: [1, 2, 3],
        pendingPhases: [1, 2, 3],
      };

      expect(() => validateModeOptions(options)).not.toThrow();
    });

    it('should reject range mode when start is greater than end', () => {
      const options: ModeResolutionOptions = {
        mode: 'range',
        range: { start: 5, end: 2 },
        allPhases: [1, 2, 3, 4, 5],
        pendingPhases: [2, 3, 4, 5],
      };

      expect(() => validateModeOptions(options)).toThrow(ModeValidationError);
    });

    it('should reject range mode when a referenced phase is absent from roadmap', () => {
      const options: ModeResolutionOptions = {
        mode: 'range',
        range: { start: 2, end: 5 },
        allPhases: [1, 2, 3, 4],
        pendingPhases: [2, 3, 4],
      };

      expect(() => validateModeOptions(options)).toThrow(ModeValidationError);
    });
  });

  describe('resolvePhases()', () => {
    it('should resolve single-phase mode to only the specified phase', () => {
      const options: ModeResolutionOptions = {
        mode: 'single-phase',
        phase: 2,
        allPhases: [1, 2, 3],
        pendingPhases: [1, 2, 3],
      };

      const result = resolvePhases(options);

      expect(result.phases).toEqual([2]);
    });

    it('should resolve continuous mode to all pending phases in ascending order', () => {
      const options: ModeResolutionOptions = {
        mode: 'continuous',
        allPhases: [1, 2, 3, 4],
        pendingPhases: [4, 2, 3],
      };

      const result = resolvePhases(options);

      expect(result.phases).toEqual([2, 3, 4]);
    });

    it('should resolve range mode to phases in ascending order', () => {
      const options: ModeResolutionOptions = {
        mode: 'range',
        range: { start: 2, end: 4 },
        allPhases: [1, 2, 3, 4, 5],
        pendingPhases: [2, 3, 4, 5],
      };

      const result = resolvePhases(options);

      expect(result.phases).toEqual([2, 3, 4]);
    });

    it('should reject range mode referencing an unknown phase', () => {
      const options: ModeResolutionOptions = {
        mode: 'range',
        range: { start: 2, end: 5 },
        allPhases: [1, 2, 3, 4],
        pendingPhases: [2, 3, 4],
      };

      expect(() => resolvePhases(options)).toThrow(ModeValidationError);
    });
  });
});

describe('Pipeline orchestration', () => {
  beforeEach(() => {
    resetSessionStore();
  });

  describe('runPipeline()', () => {
    it('should run in single-phase mode and return session ID and executed phases', () => {
      const roadmap = makeRoadmap([
        makePhase({
          number: 1,
          tasks: [makeTask('1.1')],
        }),
        makePhase({
          number: 2,
          tasks: [makeTask('2.1')],
        }),
      ]);

      const input: PipelineRunInput = {
        roadmap,
        requirementsText: 'Add a new feature',
        options: { mode: 'single-phase', phase: 2 },
        completedTaskIds: ['1.1'],
      };

      const result = runPipeline(input);

      expect(result.sessionId).toBeTruthy();
      expect(result.executedPhases).toContain(2);
      expect(result.executedPhases).not.toContain(1);
      expect(result.finalStatus).toBe('completed');
    });

    it('should stop on failure and not continue to later phases', () => {
      const roadmap = makeRoadmap([
        makePhase({
          number: 1,
          tasks: [makeTask('1.1')],
        }),
        makePhase({
          number: 2,
          tasks: [makeTask('2.1', { dependencies: ['1.5'] })],
        }),
        makePhase({
          number: 3,
          tasks: [makeTask('3.1')],
        }),
      ]);

      const input: PipelineRunInput = {
        roadmap,
        requirementsText: 'Add a feature',
        options: { mode: 'continuous' },
        completedTaskIds: [],
      };

      const result = runPipeline(input);

      expect(result.executedPhases).toContain(1);
      expect(result.blockedPhase).not.toBeNull();
      expect(result.executedPhases).not.toContain(3);
    });
  });

  describe('runContinuous()', () => {
    it('should execute phases in ascending phase-number order', () => {
      const roadmap = makeRoadmap([
        makePhase({
          number: 1,
          tasks: [makeTask('1.1')],
        }),
        makePhase({
          number: 2,
          tasks: [makeTask('2.1', { dependencies: ['1.1'] })],
        }),
        makePhase({
          number: 3,
          tasks: [makeTask('3.1', { dependencies: ['2.1'] })],
        }),
      ]);

      const result = runContinuous({
        roadmap,
        completedTaskIds: [],
      });

      expect(result.executedPhases).toEqual([1, 2, 3]);
      expect(result.finalStatus).toBe('completed');
    });

    it('should halt on a blocked phase and return the blocked phase number', () => {
      const roadmap = makeRoadmap([
        makePhase({
          number: 1,
          tasks: [makeTask('1.1')],
        }),
        makePhase({
          number: 2,
          tasks: [makeTask('2.1', { dependencies: ['9.9'] })],
        }),
        makePhase({
          number: 3,
          tasks: [makeTask('3.1')],
        }),
      ]);

      const result = runContinuous({
        roadmap,
        completedTaskIds: [],
      });

      expect(result.executedPhases).toContain(1);
      expect(result.blockedPhase).toBe(2);
      expect(result.executedPhases).not.toContain(3);
    });
  });

  describe('runSinglePhase()', () => {
    it('should execute only the requested phase', () => {
      const roadmap = makeRoadmap([
        makePhase({
          number: 1,
          tasks: [makeTask('1.1')],
        }),
        makePhase({
          number: 4,
          tasks: [makeTask('4.1')],
        }),
        makePhase({
          number: 5,
          tasks: [makeTask('5.1')],
        }),
      ]);

      const result = runSinglePhase({
        roadmap,
        phase: 4,
        completedTaskIds: [],
      });

      expect(result.executedPhases).toEqual([4]);
      expect(result.executedPhases).not.toContain(1);
      expect(result.executedPhases).not.toContain(5);
    });

    it('should throw OrchestrationError for an unknown phase number', () => {
      const roadmap = makeRoadmap([
        makePhase({ number: 1, tasks: [makeTask('1.1')] }),
      ]);

      expect(() =>
        runSinglePhase({ roadmap, phase: 99, completedTaskIds: [] })
      ).toThrow(OrchestrationError);
    });
  });
});
