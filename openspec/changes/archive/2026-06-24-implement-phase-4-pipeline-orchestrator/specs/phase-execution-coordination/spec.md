## ADDED Requirements

### Requirement: Execute phase coordination
The system SHALL provide an `executePhase()` function that coordinates a roadmap phase by identifying actionable tasks and returning a structured execution result.

#### Scenario: Execute phase with actionable tasks
- **WHEN** `executePhase()` is called for a phase containing pending tasks whose dependencies are satisfied
- **THEN** it returns a successful execution result containing the phase number and the actionable task IDs selected for execution

#### Scenario: Execute completed phase
- **WHEN** `executePhase()` is called for a phase where every task is already completed
- **THEN** it returns a successful execution result with no selected task IDs and identifies the phase as already complete

#### Scenario: Execute blocked phase
- **WHEN** `executePhase()` is called for a phase where pending tasks have unsatisfied dependencies
- **THEN** it returns a blocked execution result that includes the blocking task IDs or dependency reason

### Requirement: Handle phase failure
The system SHALL provide a `handlePhaseFailure()` function that records phase failure context in handoff-compatible state and returns a structured failure result.

#### Scenario: Record phase failure
- **WHEN** `handlePhaseFailure()` is called with a phase number, error message, and attempted task IDs
- **THEN** it returns a failure result with the phase number, error message, attempted task IDs, and a handoff update describing the failure

#### Scenario: Preserve failure context for human intervention
- **WHEN** phase failure handling reaches the configured retry limit
- **THEN** the returned result includes a blocker summary suitable for later `PIPELINE-ISSUES.md` documentation

### Requirement: Respect coordination boundary
The phase executor SHALL NOT implement source changes, run quality gates, or perform checkpoint rollback.

#### Scenario: Executor does not perform implementation work
- **WHEN** `executePhase()` coordinates a phase with actionable tasks
- **THEN** it returns coordination data without modifying task deliverable files or invoking quality gate commands
