/**
 * Router — deterministic intent classification, strategy selection, and model routing.
 */

import type { Intent, Strategy } from './types.js';

import type { TaskComplexity } from '../roadmap/types.js';

import type { ModelTier } from '../../types.js';

const NEW_PROJECT_KEYWORDS: readonly string[] = [
  'create a new',
  'build a new',
  'new application',
  'new app',
  'new project',
  'from scratch',
  'scaffold a',
  'initialize a new',
];

const BUG_FIX_KEYWORDS: readonly string[] = [
  'fix',
  'error',
  'crash',
  'regression',
  'failing',
  'bug',
  'broken',
  'not working',
];

const REFACTOR_KEYWORDS: readonly string[] = [
  'refactor',
  'restructure',
  'clean up',
  'cleanup',
  'simplify',
];

const MIGRATION_KEYWORDS: readonly string[] = [
  'migrate',
  'migration',
  'port to',
  'upgrade to',
  'move to',
];

const INTENT_STRATEGY_MAP: Readonly<Record<Intent, Strategy>> = {
  'new-project': 'full-pipeline',
  'feature-add': 'incremental',
  'bug-fix': 'targeted',
  refactor: 'transformation',
  migration: 'port',
};

function matchesAny(text: string, keywords: readonly string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}

/**
 * Classify incoming requirement text as one of the supported Intent values.
 * Uses keyword-based heuristics and defaults to 'feature-add'.
 */
export function classifyIntent(requirementText: string): Intent {
  const text = requirementText.toLowerCase();

  if (matchesAny(text, NEW_PROJECT_KEYWORDS)) {
    return 'new-project';
  }

  if (matchesAny(text, BUG_FIX_KEYWORDS)) {
    return 'bug-fix';
  }

  if (matchesAny(text, REFACTOR_KEYWORDS)) {
    return 'refactor';
  }

  if (matchesAny(text, MIGRATION_KEYWORDS)) {
    return 'migration';
  }

  return 'feature-add';
}

/**
 * Map every supported Intent to its corresponding Strategy.
 */
export function selectStrategy(intent: Intent): Strategy {
  return INTENT_STRATEGY_MAP[intent];
}

/**
 * Map task complexity to a ModelTier.
 * trivial and simple → cheap, medium → capable, complex → reasoning.
 */
export function routeModelByComplexity(complexity: TaskComplexity): ModelTier {
  switch (complexity) {
    case 'trivial':
    case 'simple':
      return 'cheap';
    case 'medium':
      return 'capable';
    case 'complex':
      return 'reasoning';
  }
}
