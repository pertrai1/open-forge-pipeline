## 1. Test Coverage Setup

- [x] 1.1 Add session management scenarios to `tests/orchestrator.test.ts` for `createSession()`, `endSession()`, and `getSessionState()`.
- [x] 1.2 Add intent and model routing scenarios to `tests/orchestrator.test.ts` for `classifyIntent()`, `selectStrategy()`, and `routeModelByComplexity()`.
- [x] 1.3 Add phase execution coordination scenarios to `tests/orchestrator.test.ts` for `executePhase()` and `handlePhaseFailure()`.
- [x] 1.4 Add context compression scenarios to `tests/orchestrator.test.ts` for `extractMiddleContext()` and `compressSession()`.
- [x] 1.5 Add pipeline orchestration and execution mode scenarios to `tests/orchestrator.test.ts` for `runPipeline()`, `runContinuous()`, `runSinglePhase()`, and mode resolution.

## 2. Core Orchestrator Modules

- [x] 2.1 Implement `src/lib/orchestrator/session.ts` with in-memory session lifecycle behavior and typed session errors.
- [x] 2.2 Implement `src/lib/orchestrator/router.ts` with deterministic intent classification, intent-to-strategy mapping, and complexity-to-model-tier routing.
- [x] 2.3 Implement `src/lib/orchestrator/executor.ts` with phase coordination results, actionable task selection, blocked/completed phase handling, and failure result creation.
- [x] 2.4 Implement `src/lib/orchestrator/compressor.ts` with middle-context extraction and deterministic session compression payloads.

## 3. Pipeline Composition

- [x] 3.1 Implement `src/lib/orchestrator/modes.ts` with validation and ordered phase resolution for `single-phase`, `continuous`, and `range` modes.
- [x] 3.2 Implement `src/lib/orchestrator/index.ts` with `runPipeline()`, `runContinuous()`, and `runSinglePhase()` composed from the session, router, executor, compressor, and mode modules.
- [x] 3.3 Ensure all new relative imports use `.js` extensions and exported types remain compatible with existing `src/lib/orchestrator/types.ts`.

## 4. Verification

- [x] 4.1 Run `npx vitest run tests/orchestrator.test.ts` and confirm orchestrator scenarios pass.
- [x] 4.2 Run `npm run verify` and resolve any typecheck, lint, format, build, or test failures.
- [x] 4.3 Update `ROADMAP.md` Phase 4 task checkboxes only after the corresponding implementation and verification work is complete.
