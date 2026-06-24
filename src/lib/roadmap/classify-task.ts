/**
 * Task complexity classifier — heuristic classification based on
 * dependency count and description keywords.
 */

import type { TaskComplexity } from './types.js';

const COMPLEX_KEYWORDS = [
  'architect',
  'redesign',
  'migration',
  'migrate',
  'rewrite',
  'overhaul',
];

const DEP_THRESHOLD_SIMPLE = 2;
const DEP_THRESHOLD_MEDIUM = 4;

export interface ClassifyTaskInput {
  readonly description: string;
  readonly dependencies: readonly string[];
  readonly _deliverable: string;
}

/**
 * Classify task complexity based on dependency count (primary) and
 * description keywords (secondary, can only elevate).
 *
 * Dependency count thresholds:
 *   0 deps → trivial
 *   1-2 deps → simple
 *   3-4 deps → medium
 *   5+ deps → complex
 *
 * Keywords can elevate but never lower the classification.
 */
export function classifyTask(input: ClassifyTaskInput): TaskComplexity {
  const { description, dependencies } = input;
  const depCount = dependencies.length;

  let base: TaskComplexity;
  if (depCount === 0) {
    base = 'trivial';
  } else if (depCount <= DEP_THRESHOLD_SIMPLE) {
    base = 'simple';
  } else if (depCount <= DEP_THRESHOLD_MEDIUM) {
    base = 'medium';
  } else {
    base = 'complex';
  }

  // Keyword elevation (never lowers)
  const lowerDesc = description.toLowerCase();
  const hasComplexKeyword = COMPLEX_KEYWORDS.some((kw) =>
    lowerDesc.includes(kw)
  );

  if (hasComplexKeyword && base !== 'complex') {
    return 'complex';
  }

  return base;
}
