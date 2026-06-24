## ADDED Requirements

### Requirement: Create orchestrator session
The system SHALL provide a `createSession()` function that creates an active `SessionState` for a pipeline run using the selected intent, strategy, execution mode, and roadmap phase information.

#### Scenario: Create active session
- **WHEN** `createSession()` is called with intent `feature-add`, strategy `incremental`, mode `single-phase`, and roadmap phase data
- **THEN** it returns a `SessionState` with a unique `sessionId`, status `active`, matching intent, matching strategy, matching mode, an ISO 8601 `startedAt`, an ISO 8601 `lastActivityAt`, and phase counters derived from the roadmap state

#### Scenario: Create session with first current phase
- **WHEN** `createSession()` is called with roadmap state containing pending phases
- **THEN** the returned `SessionState.currentPhase` references the first pending or in-progress phase state

### Requirement: End orchestrator session
The system SHALL provide an `endSession()` function that transitions an existing session to a terminal status without mutating the original session object.

#### Scenario: End active session as completed
- **WHEN** `endSession()` is called for an active session with status `completed`
- **THEN** the returned `SessionState` has status `completed` and an updated `lastActivityAt`

#### Scenario: End missing session
- **WHEN** `endSession()` is called with a session ID that does not exist
- **THEN** the function throws a typed session error that includes the missing session ID

### Requirement: Read orchestrator session state
The system SHALL provide a `getSessionState()` function that returns the current state for a known session ID.

#### Scenario: Get existing session
- **WHEN** `getSessionState()` is called with a session ID created by `createSession()`
- **THEN** it returns the matching `SessionState`

#### Scenario: Get unknown session
- **WHEN** `getSessionState()` is called with an unknown session ID
- **THEN** it returns `null`
