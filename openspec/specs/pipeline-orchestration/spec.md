## ADDED Requirements

### Requirement: Run pipeline entry point
The system SHALL provide a `runPipeline()` function that creates or uses an orchestrator session, applies routing decisions, delegates execution according to the selected mode, and returns a structured run result.

#### Scenario: Run pipeline in single-phase mode
- **WHEN** `runPipeline()` is called with mode `single-phase` and a valid phase number
- **THEN** it delegates to single-phase execution and returns a result containing the session ID, executed phase numbers, and final status

#### Scenario: Run pipeline stops on failure
- **WHEN** delegated phase execution returns a failure result
- **THEN** `runPipeline()` returns a failed run result and does not continue to later phases

### Requirement: Run continuous execution
The system SHALL provide a `runContinuous()` function that coordinates eligible phases in roadmap order until no eligible phases remain or a failure occurs.

#### Scenario: Continuous run executes phases in order
- **WHEN** `runContinuous()` is called with a roadmap containing multiple pending phases
- **THEN** it executes phases in ascending phase-number order

#### Scenario: Continuous run halts on blocked phase
- **WHEN** a phase execution result is blocked
- **THEN** `runContinuous()` stops and returns the blocked phase number in the run result

### Requirement: Run single phase execution
The system SHALL provide a `runSinglePhase()` function that coordinates exactly one requested phase.

#### Scenario: Single-phase run executes requested phase only
- **WHEN** `runSinglePhase()` is called for phase 4
- **THEN** it executes phase 4 and does not execute other pending phases

#### Scenario: Single-phase run rejects unknown phase
- **WHEN** `runSinglePhase()` is called with a phase number not present in the roadmap
- **THEN** it returns or throws a typed orchestration error identifying the unknown phase
