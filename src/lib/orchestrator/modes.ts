/**
 * Execution mode handler — validation and ordered phase resolution
 * for single-phase, continuous, and range modes.
 */

import type { ModeResolutionOptions, ModeResolution } from './types.js';

import { ModeValidationError } from './types.js';

export { ModeValidationError };

/**
 * Validate execution mode options before phase execution begins.
 * Throws ModeValidationError for invalid options.
 */
export function validateModeOptions(options: ModeResolutionOptions): void {
  const { mode, phase, range, allPhases } = options;
  const allSet = new Set(allPhases);

  if (mode === 'single-phase') {
    if (phase === undefined) {
      throw new ModeValidationError(
        'single-phase mode requires a phase number'
      );
    }
    if (!allSet.has(phase)) {
      throw new ModeValidationError(`Phase ${phase} not found in roadmap`);
    }
  }

  if (mode === 'range') {
    if (!range) {
      throw new ModeValidationError(
        'range mode requires a range with start and end'
      );
    }
    if (range.start > range.end) {
      throw new ModeValidationError(
        `Range start ${range.start} is greater than end ${range.end}`
      );
    }
    for (let p = range.start; p <= range.end; p++) {
      if (!allSet.has(p)) {
        throw new ModeValidationError(`Phase ${p} not found in roadmap`);
      }
    }
  }
}

/**
 * Resolve the ordered phase numbers to execute for the given execution mode.
 * Validates options first, then resolves phases in ascending order.
 */
export function resolvePhases(options: ModeResolutionOptions): ModeResolution {
  validateModeOptions(options);

  const { mode, phase, range, allPhases, pendingPhases } = options;

  if (mode === 'single-phase') {
    return { phases: [phase!] };
  }

  if (mode === 'range') {
    const resolved = allPhases
      .filter((p) => p >= range!.start && p <= range!.end)
      .sort((a, b) => a - b);
    return { phases: resolved };
  }

  const sortedPending = [...pendingPhases].sort((a, b) => a - b);
  return { phases: sortedPending };
}
