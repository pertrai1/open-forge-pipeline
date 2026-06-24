## ADDED Requirements

### Requirement: Validate execution mode options
The system SHALL provide execution mode handling that validates `single-phase`, `continuous`, and `range` options before phase execution begins.

#### Scenario: Validate single-phase option
- **WHEN** mode is `single-phase` and no phase number is provided
- **THEN** execution mode handling rejects the options with a typed validation error

#### Scenario: Validate continuous option
- **WHEN** mode is `continuous`
- **THEN** execution mode handling accepts the options without requiring a phase number or range

#### Scenario: Validate range option
- **WHEN** mode is `range` and the range start is greater than the range end
- **THEN** execution mode handling rejects the options with a typed validation error

### Requirement: Resolve phases for execution mode
The system SHALL resolve the ordered phase numbers to execute for each supported execution mode.

#### Scenario: Resolve single-phase mode
- **WHEN** mode is `single-phase` with phase 2
- **THEN** the resolved phase list contains only phase 2

#### Scenario: Resolve continuous mode
- **WHEN** mode is `continuous` with a roadmap containing pending phases 2, 3, and 4
- **THEN** the resolved phase list contains phases 2, 3, and 4 in ascending order

#### Scenario: Resolve range mode
- **WHEN** mode is `range` with start 2 and end 4
- **THEN** the resolved phase list contains phases 2, 3, and 4 in ascending order

### Requirement: Reject unknown phases in mode resolution
The execution mode handler SHALL reject mode options that reference phases absent from the roadmap.

#### Scenario: Range includes unknown phase
- **WHEN** mode is `range` with start 2 and end 5 but the roadmap has no phase 5
- **THEN** mode resolution rejects the options with a typed validation error identifying the missing phase
