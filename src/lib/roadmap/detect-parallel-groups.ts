/**
 * Parallel group detector — computes groups of concurrently executable
 * tasks from their dependency graph.
 */

import type { RoadmapTask, ParallelGroup } from './types.js';

const GROUP_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

interface GroupContext {
  readonly tasks: readonly RoadmapTask[];
  readonly taskIds: Set<string>;
}

function getIntraPhaseDeps(task: RoadmapTask, taskIds: Set<string>): string[] {
  return task.dependencies.filter((d) => taskIds.has(d));
}

function collectReadyTasks(ctx: GroupContext, assigned: Set<string>): string[] {
  const { tasks, taskIds } = ctx;
  const ready: string[] = [];
  for (const task of tasks) {
    if (assigned.has(task.id)) {
      continue;
    }
    const intraDeps = getIntraPhaseDeps(task, taskIds);
    if (intraDeps.every((d) => assigned.has(d))) {
      ready.push(task.id);
    }
  }
  return ready;
}

function firstGroupNote(
  ctx: GroupContext,
  groupTaskIds: readonly string[]
): string {
  const { tasks, taskIds } = ctx;
  const allIndependent = groupTaskIds.every((id) => {
    const task = tasks.find((t) => t.id === id)!;
    return getIntraPhaseDeps(task, taskIds).length === 0;
  });
  return allIndependent ? 'all independent' : '';
}

function subsequentGroupNote(
  ctx: GroupContext,
  groupTaskIds: readonly string[]
): string {
  const { tasks, taskIds } = ctx;
  const groupTaskIdSet = new Set(groupTaskIds);
  const depIds = new Set<string>();
  for (const id of groupTaskIds) {
    const task = tasks.find((t) => t.id === id)!;
    const externalDeps = task.dependencies.filter(
      (d) => taskIds.has(d) && !groupTaskIdSet.has(d)
    );
    externalDeps.forEach((dep) => depIds.add(dep));
  }
  return depIds.size > 0 ? `requires ${[...depIds].join(', ')}` : '';
}

function groupLabel(groupIndex: number): string {
  return GROUP_LABELS[groupIndex] ?? `${groupIndex + 1}`;
}

/**
 * Detect parallel groups from a list of tasks based on their dependencies.
 * Only considers intra-phase dependencies (deps referencing tasks in the list).
 * Cross-phase dependencies are ignored.
 */
export function detectParallelGroups(
  tasks: readonly RoadmapTask[]
): ParallelGroup[] {
  if (tasks.length === 0) {
    return [];
  }

  const ctx: GroupContext = {
    tasks,
    taskIds: new Set(tasks.map((t) => t.id)),
  };
  const groups: ParallelGroup[] = [];
  const assigned = new Set<string>();

  let groupIndex = 0;

  while (assigned.size < tasks.length) {
    const groupTaskIds = collectReadyTasks(ctx, assigned);

    if (groupTaskIds.length === 0) {
      // Circular dependency or unreachable — break to avoid infinite loop
      break;
    }

    const note =
      groupIndex === 0
        ? firstGroupNote(ctx, groupTaskIds)
        : subsequentGroupNote(ctx, groupTaskIds);
    const label = groupLabel(groupIndex);

    groups.push({
      name: `Group ${label}`,
      taskIds: groupTaskIds,
      note,
    });

    for (const id of groupTaskIds) {
      assigned.add(id);
    }
    groupIndex++;
  }

  return groups;
}
