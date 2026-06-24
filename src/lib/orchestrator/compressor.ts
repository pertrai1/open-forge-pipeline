/**
 * Context compressor — extract and compress middle session context
 * while preserving head and tail messages verbatim.
 */

import type {
  SessionMessage,
  CompressionOptions,
  ExtractedContext,
  CompressedSession,
} from './types.js';

const DEFAULT_HEAD_COUNT = 5;
const DEFAULT_TAIL_COUNT = 5;
const DEFAULT_THRESHOLD = 10;

/**
 * Extract middle context from ordered session messages.
 * Splits into preserved head, middle (to be compressed), and preserved tail.
 * If the message count does not exceed head + tail, all messages are preserved
 * as head and the middle section is empty.
 */
export function extractMiddleContext(
  messages: readonly SessionMessage[],
  options?: CompressionOptions
): ExtractedContext {
  const headCount = options?.headCount ?? DEFAULT_HEAD_COUNT;
  const tailCount = options?.tailCount ?? DEFAULT_TAIL_COUNT;

  if (messages.length <= headCount + tailCount) {
    return {
      head: [...messages],
      middle: [],
      tail: [],
    };
  }

  const head = messages.slice(0, headCount);
  const tail = messages.slice(messages.length - tailCount);
  const middle = messages.slice(headCount, messages.length - tailCount);

  return { head, middle, tail };
}

/**
 * Compress a session by preserving head and tail messages verbatim
 * while replacing middle messages with a deterministic summary.
 * If the message count does not exceed the threshold, compression is not applied.
 */
export function compressSession(
  messages: readonly SessionMessage[],
  options?: CompressionOptions
): CompressedSession {
  const threshold = options?.threshold ?? DEFAULT_THRESHOLD;

  if (messages.length <= threshold) {
    return {
      messages: [...messages],
      middleSummary: '',
      compressedCount: 0,
      applied: false,
    };
  }

  const { head, middle, tail } = extractMiddleContext(messages, options);
  const middleSummary = summarizeMiddle(middle);

  const summaryMessage: SessionMessage = {
    role: 'system',
    content: middleSummary,
  };

  return {
    messages: [...head, summaryMessage, ...tail],
    middleSummary,
    compressedCount: middle.length,
    applied: true,
  };
}

/**
 * Produce a deterministic summary from middle session messages.
 * The summary is extractive — it encodes message roles and content lengths
 * so the same input always yields the same output.
 */
function summarizeMiddle(messages: readonly SessionMessage[]): string {
  if (messages.length === 0) {
    return '';
  }

  const parts = messages.map((m) => `${m.role}:${m.content.length}`);
  return `[Compressed ${messages.length} messages: ${parts.join(', ')}]`;
}
