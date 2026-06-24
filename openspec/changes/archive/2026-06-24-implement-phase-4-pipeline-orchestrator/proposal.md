## Why

Phase 4 turns the existing roadmap, handoff, helper, and orchestrator type foundations into an executable pipeline coordinator. Without this layer, the package can describe work but cannot manage sessions, route intent, execute phases, compress long-running context, or expose the execution modes promised by the requirements.

## What Changes

- Add session lifecycle management for creating, ending, and inspecting pipeline sessions.
- Add intent classification, strategy selection, and model-tier routing based on task complexity.
- Add phase execution coordination that selects roadmap work, updates handoff state, and handles phase failures.
- Add context compression support for long-running sessions that preserve head and tail context while compacting middle history.
- Add the orchestrator entry points for pipeline, continuous, and single-phase execution.
- Add execution mode handling for `single-phase`, `continuous`, and `range` runs.
- Add orchestrator tests covering the Phase 4 behaviors from `ROADMAP.md`.

## Capabilities

### New Capabilities

- `session-management`: Session lifecycle behavior for creating, ending, and reading orchestrator session state.
- `intent-model-routing`: Intent classification, strategy selection, and model routing behavior for orchestrator decisions.
- `phase-execution-coordination`: Coordination behavior for executing a roadmap phase and handling phase failures through handoff and roadmap helpers.
- `context-compression`: Active context compression behavior for extracting and summarizing middle session context while preserving required session continuity.
- `pipeline-orchestration`: Main pipeline loop behavior for running pipeline work across one or more phases.
- `execution-modes`: Execution mode behavior for single-phase, continuous, and phase-range runs.

### Modified Capabilities

None.

## Impact

- Affected source files: `src/lib/orchestrator/session.ts`, `src/lib/orchestrator/router.ts`, `src/lib/orchestrator/executor.ts`, `src/lib/orchestrator/compressor.ts`, `src/lib/orchestrator/index.ts`, and `src/lib/orchestrator/modes.ts`.
- Affected tests: `tests/orchestrator.test.ts`.
- Depends on existing roadmap helpers, handoff manager behavior, pipeline state types, and orchestrator types.
- No new runtime dependencies are expected.
