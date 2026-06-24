## Context

Phase 4 builds the first executable orchestration layer on top of the foundations already delivered by earlier phases. The repository currently has shared pipeline state types in `src/types.ts`, orchestrator type definitions in `src/lib/orchestrator/types.ts`, ROADMAP parsing and helper functions, and HANDOFF persistence helpers. The orchestrator module itself currently contains only types, so this change introduces behavior without altering the established public type contracts unless implementation needs small local input/result interfaces.

The requirements describe an orchestrator that classifies intent, selects a strategy, routes model tiers by task complexity, manages long-running sessions, coordinates phase execution, compresses context before exhaustion, and exposes `single-phase`, `continuous`, and `range` execution modes. The Phase 4 roadmap narrows that into six implementation files plus orchestrator tests.

## Goals / Non-Goals

**Goals:**

- Implement deterministic session lifecycle functions for creating, ending, and inspecting in-memory `SessionState` values.
- Implement intent-to-strategy routing and task-complexity-to-model-tier routing using existing `Intent`, `Strategy`, `TaskComplexity`, and `ModelTier` unions.
- Implement phase execution coordination that uses parsed roadmap data and existing HANDOFF helpers to identify actionable work and record failure context.
- Implement context extraction/compression primitives that preserve head and tail context while summarizing middle content in a deterministic, testable way.
- Implement orchestration entry points for whole-pipeline, continuous, and single-phase execution, plus mode validation for `single-phase`, `continuous`, and `range`.
- Keep the implementation small, dependency-free, and covered by `tests/orchestrator.test.ts` scenarios derived from the specs and roadmap tasks.

**Non-Goals:**

- Do not spawn real OpenCode subagents or invoke external model APIs in Phase 4.
- Do not implement quality gates, retry rollback, or checkpoint-aware gate execution; those are covered by later phases.
- Do not change package configuration, CLI commands, or plugin entry points.
- Do not replace existing roadmap, handoff, or type modules.
- Do not add new runtime dependencies.

## Decisions

### Decision: Use Pure Orchestrator Functions With Explicit Inputs

The Phase 4 functions should be implemented as pure or mostly pure functions that receive parsed roadmap, handoff state, and options as inputs rather than reading project files directly.

Rationale: Existing parser and manager modules already own file I/O boundaries. Keeping orchestration functions input-driven makes TDD straightforward, avoids brittle filesystem tests, and keeps later CLI/plugin layers free to decide where files live.

Alternatives considered: Have `runPipeline()` read `ROADMAP.md` and `HANDOFF.md` directly. This would be closer to the eventual CLI behavior but would couple Phase 4 to filesystem conventions before the CLI/config phases define them.

### Decision: Keep Session State In-Memory For This Phase

`createSession()`, `endSession()`, and `getSessionState()` should manage a lightweight in-memory session store keyed by session ID.

Rationale: The existing `SessionState` type does not include a persistence path, and the roadmap deliverable only calls for session management behavior. HANDOFF remains the durable cross-session bridge; persistent session storage can be introduced later if the CLI/plugin layer needs it.

Alternatives considered: Persist session state to a JSON file under `.forge/`. That would add file lifecycle decisions not specified by Phase 4 and overlap with later configuration and execution engine work.

### Decision: Deterministic Routing Heuristics

`classifyIntent()` should use simple keyword-based heuristics and default to `feature-add` when no stronger signal exists. `selectStrategy()` should use the fixed intent-to-strategy mapping. `routeModelByComplexity()` should map `trivial` and `simple` to `cheap`, `medium` to `capable`, and `complex` to `reasoning`.

Rationale: The current project is pre-agent-integration and has no model SDK boundary. Deterministic routing satisfies the behavioral contract, keeps tests stable, and can be replaced behind the same function names later.

Alternatives considered: Use an LLM call for intent classification. That would be premature, introduce external dependency concerns, and make tests nondeterministic.

### Decision: Phase Executor Coordinates, But Does Not Implement Tasks

`executePhase()` should identify executable tasks for a phase, return structured execution outcomes, and update handoff context/logs where needed. It should not generate tests, modify source code for roadmap tasks, or run quality gates.

Rationale: Phase 4 is the coordination layer. Actual per-phase implementation workflow and quality gates are Phase 5 and Phase 6 responsibilities. A narrow executor avoids accidentally implementing future-phase behavior without specs.

Alternatives considered: Make `executePhase()` run all phase task implementations. This conflicts with the roadmap separation and would require agent, gate, and retry systems that do not exist yet.

### Decision: Compression Uses Extractive Summaries For Now

`extractMiddleContext()` should split session messages into preserved head, compressed middle, and preserved tail. `compressSession()` should produce a deterministic summary string from middle entries and return the reconstructed compressed session payload.

Rationale: The requirements describe an auxiliary model eventually summarizing middle history, but Phase 4 can define and test the structural behavior without an external model. Deterministic extractive compression is enough to protect the interface and unblock later integration.

Alternatives considered: Introduce a summarizer callback or model adapter immediately. This may be useful later, but it adds an abstraction before any real model integration exists in the package.

### Decision: Orchestrator Loops Stop At Coordination Boundaries

`runPipeline()`, `runContinuous()`, and `runSinglePhase()` should compose session creation, routing, mode handling, and phase execution into structured run results. Continuous mode should iterate eligible phases until there is no next phase or a failure occurs.

Rationale: This creates a working skeleton for later execution-engine and quality-gate phases while preserving clear boundaries. It also gives CLI work in Phase 10 stable entry points to call.

Alternatives considered: Leave `runPipeline()` as a placeholder until Phase 10. That would make Phase 4 incomplete and delay integration risks until the CLI phase.

## Risks / Trade-offs

- Deterministic intent classification may misclassify vague prompts -> Mitigation: keep classification rules explicit and covered by tests, and allow callers to pass already-classified intent in future options if needed.
- In-memory sessions do not survive process restarts -> Mitigation: rely on HANDOFF for durable cross-session state in this phase and avoid claiming persistent session storage.
- Compression without an auxiliary model may lose nuance -> Mitigation: preserve head and tail verbatim, include stable middle summaries, and keep the compressor boundary replaceable.
- Phase executor may be mistaken for the later execution engine -> Mitigation: keep executor result types focused on coordination and document that task implementation/gates are out of scope.
- Mode handling can silently run the wrong phase range if validation is loose -> Mitigation: validate required `phase` and `range` options and reject invalid ranges before execution.

## Migration Plan

Implement Phase 4 as additive files under `src/lib/orchestrator/` with one test file, so no migration is needed for existing consumers. Existing imports from `src/lib/orchestrator/types.ts` remain valid. Rollback is file-level removal of the new orchestrator modules and tests if the design proves incorrect before downstream phases depend on it.

## Open Questions

- Should `runPipeline()` eventually own file I/O, or should the CLI layer continue to parse files and pass structured inputs into the orchestrator?
- Should session persistence become a `.forge/` artifact later, or is HANDOFF sufficient as the durable session bridge?
- Should the context compressor expose a summarizer callback in Phase 4, or wait until model integration exists?
