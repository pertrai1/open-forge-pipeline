## ADDED Requirements

### Requirement: Extract middle context
The system SHALL provide an `extractMiddleContext()` function that splits ordered session messages into preserved head, middle, and preserved tail sections.

#### Scenario: Extract middle from long session
- **WHEN** `extractMiddleContext()` is called with more messages than the configured head and tail counts
- **THEN** it returns the first head-count messages as head, the last tail-count messages as tail, and all intervening messages as middle

#### Scenario: Short session needs no middle extraction
- **WHEN** `extractMiddleContext()` is called with a message count less than or equal to the configured head plus tail counts
- **THEN** it returns all messages as preserved context and an empty middle section

### Requirement: Compress session context
The system SHALL provide a `compressSession()` function that returns a compressed session payload preserving head and tail messages while replacing middle messages with a deterministic summary.

#### Scenario: Compress long session
- **WHEN** `compressSession()` is called with a long ordered session message list
- **THEN** it returns a payload containing preserved head messages, a middle summary, preserved tail messages, and metadata about the number of compressed messages

#### Scenario: Compression not needed
- **WHEN** `compressSession()` is called with a session message list that does not exceed the compression threshold
- **THEN** it returns the original messages unchanged and marks compression as not applied

### Requirement: Preserve session continuity during compression
The compressor SHALL preserve enough context for orchestration to continue after compression.

#### Scenario: Head and tail are preserved verbatim
- **WHEN** a session is compressed
- **THEN** system instructions and initial context in the head remain byte-identical, and the most recent tail messages remain byte-identical
