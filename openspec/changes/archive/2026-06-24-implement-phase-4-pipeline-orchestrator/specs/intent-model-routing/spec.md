## ADDED Requirements

### Requirement: Classify incoming intent
The system SHALL provide a `classifyIntent()` function that classifies incoming requirement text as one of the existing orchestrator `Intent` values.

#### Scenario: Classify new project intent
- **WHEN** requirement text asks to create or build a new application from scratch
- **THEN** `classifyIntent()` returns `new-project`

#### Scenario: Classify bug fix intent
- **WHEN** requirement text asks to fix an error, crash, regression, or failing behavior
- **THEN** `classifyIntent()` returns `bug-fix`

#### Scenario: Default to feature addition
- **WHEN** requirement text does not match a more specific intent signal
- **THEN** `classifyIntent()` returns `feature-add`

### Requirement: Select strategy for intent
The system SHALL provide a `selectStrategy()` function that maps every `Intent` to its corresponding `Strategy`.

#### Scenario: Map all supported intents
- **WHEN** `selectStrategy()` is called for each supported intent
- **THEN** it returns `full-pipeline` for `new-project`, `incremental` for `feature-add`, `targeted` for `bug-fix`, `transformation` for `refactor`, and `port` for `migration`

### Requirement: Route model tier by complexity
The system SHALL provide a `routeModelByComplexity()` function that maps task complexity to a `ModelTier`.

#### Scenario: Route cheap tasks
- **WHEN** `routeModelByComplexity()` is called with `trivial` or `simple`
- **THEN** it returns `cheap`

#### Scenario: Route capable tasks
- **WHEN** `routeModelByComplexity()` is called with `medium`
- **THEN** it returns `capable`

#### Scenario: Route reasoning tasks
- **WHEN** `routeModelByComplexity()` is called with `complex`
- **THEN** it returns `reasoning`
