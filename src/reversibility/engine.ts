/**
 * Return-recipe engine for the Reversibility tab.
 *
 * Pure, UI-free port of the verified Python reference implementation (500
 * randomized trials). Given a starting grid A (values in {0,1,2}), the ordered
 * forward move log, and the current grid B, it mechanically writes down a
 * sequence of further legal moves that continues B back to A. No search, no
 * randomness: same inputs always produce the same recipe.
 *
 * Why it works: plus-3 moves and renormalizations change nothing mod 3, and a
 * triple played three times total adds +3 to each of its cells — also invisible
 * after a renormalization. So each forward triple is undone by playing the same
 * triple two more times, in reverse order, inserting deterministic scaffolding
 * (+3 to every cell below 3, then −3 to all) whenever a value of 3+ blocks a move.
 *
 * Note on renormalization: the interactive engine's mod-3 move applies `% 3`,
 * this engine applies `− 3`. Under strict rules no cell ever exceeds 5 (a +3
 * needs the cell ≤ 2, a triple needs all three ≤ 2), so whenever renorm is
 * legal (all cells ≥ 3) every value is in [3,5] and the two are identical.
 */

import type { Grid, CellPosition, MoveType } from '../state/types';

/** The three cells covered by a trimer, in placement order. */
export type TripleCells = [CellPosition, CellPosition, CellPosition];

export type RecipeStep =
  | {
      kind: 'triple';
      cells: TripleCells;
      /** Index into the full forward move log of the move this replays. */
      forwardIndex: number;
      /** First or second of the two extra plays that erase the forward move. */
      replay: 1 | 2;
    }
  | { kind: 'plus3'; cell: CellPosition; scaffoldRound: number }
  | { kind: 'renorm'; scaffoldRound: number };

export type TripleStep = Extract<RecipeStep, { kind: 'triple' }>;

/** Grouped view: each scaffold round collapses into a single step. */
export type GroupedRecipeStep =
  | TripleStep
  | { kind: 'scaffold'; scaffoldRound: number; steps: RecipeStep[] };

export interface RecipeStats {
  /** Number of triple moves in the forward log. */
  forwardTriples: number;
  /** Number of triple replay steps in the recipe (always 2 × forwardTriples). */
  replaySteps: number;
  scaffoldRounds: number;
  /** Total step count with every plus-3 and renorm shown individually. */
  expandedStepCount: number;
  /** Total step count with each scaffold round collapsed into one step. */
  groupedStepCount: number;
}

export interface Recipe {
  steps: RecipeStep[];
  groupedSteps: GroupedRecipeStep[];
  stats: RecipeStats;
}

/** A forward move as recorded in the move log (subset of the app's Move). */
export interface ForwardMove {
  type: MoveType;
  position?: CellPosition;
}

function cloneGrid(grid: Grid): Grid {
  return grid.map(row => [...row]);
}

/** The three cells a trimer move covers, or null for non-trimer moves. */
export function tripleCellsOf(move: ForwardMove): TripleCells | null {
  if (!move.position) return null;
  const { row, col } = move.position;
  if (move.type === 'horizontal-trimer') {
    return [{ row, col }, { row, col: col + 1 }, { row, col: col + 2 }];
  }
  if (move.type === 'vertical-trimer') {
    return [{ row, col }, { row: row + 1, col }, { row: row + 2, col }];
  }
  return null;
}

/** Strict legality: all three cells equal and ≤ 2. */
export function isLegalTriple(grid: Grid, cells: TripleCells): boolean {
  const [a, b, c] = cells.map(p => grid[p.row][p.col]);
  return a === b && b === c && a <= 2;
}

/** Legality of a single recipe step on a grid, per the strict move model. */
export function isLegalStep(grid: Grid, step: RecipeStep): boolean {
  if (step.kind === 'triple') return isLegalTriple(grid, step.cells);
  if (step.kind === 'plus3') return grid[step.cell.row][step.cell.col] <= 2;
  // renorm: every cell must be ≥ 3
  return grid.every(row => row.every(v => v >= 3));
}

/** Apply one recipe step, returning a new grid. Does not validate. */
export function applyRecipeStep(grid: Grid, step: RecipeStep): Grid {
  const next = cloneGrid(grid);
  if (step.kind === 'triple') {
    for (const { row, col } of step.cells) next[row][col] += 1;
  } else if (step.kind === 'plus3') {
    next[step.cell.row][step.cell.col] += 3;
  } else {
    for (const row of next) {
      for (let j = 0; j < row.length; j++) row[j] -= 3;
    }
  }
  return next;
}

/** Apply one grouped step, returning a new grid. Does not validate. */
export function applyGroupedStep(grid: Grid, step: GroupedRecipeStep): Grid {
  if (step.kind === 'triple') return applyRecipeStep(grid, step);
  return step.steps.reduce(applyRecipeStep, grid);
}

/** Cell-for-cell equality on raw values. */
export function gridsEqual(a: Grid, b: Grid): boolean {
  return (
    a.length === b.length &&
    a.every((row, i) => row.length === b[i].length && row.every((v, j) => v === b[i][j]))
  );
}

/**
 * Compute the return recipe taking `currentGrid` (= B, raw values) back to `A`.
 *
 * Replays the forward triples in reverse order, each twice, inserting a
 * deterministic scaffold round (row-major +3 on every cell ≤ 2, then −3 on all)
 * whenever a replay is blocked, and finishing with scaffolding until every cell
 * is back below 3. Throws if an internal invariant fails — that would mean a
 * bug in the engine, not a property of the input.
 */
export function computeRecipe(A: Grid, moveLog: ForwardMove[], currentGrid: Grid): Recipe {
  const triples: TripleStep[] = [];
  moveLog.forEach((move, forwardIndex) => {
    const cells = tripleCellsOf(move);
    if (cells) triples.push({ kind: 'triple', cells, forwardIndex, replay: 1 });
  });

  const G = cloneGrid(currentGrid);
  const steps: RecipeStep[] = [];
  const groupedSteps: GroupedRecipeStep[] = [];
  let scaffoldRounds = 0;

  /** One scaffold round: +3 on every cell ≤ 2 (row-major), then −3 on all. Changes nothing mod 3. */
  const scaffold = () => {
    const round = scaffoldRounds++;
    const roundSteps: RecipeStep[] = [];
    for (let i = 0; i < G.length; i++) {
      for (let j = 0; j < G[i].length; j++) {
        if (G[i][j] <= 2) {
          G[i][j] += 3;
          roundSteps.push({ kind: 'plus3', cell: { row: i, col: j }, scaffoldRound: round });
        }
      }
    }
    for (const row of G) {
      for (let j = 0; j < row.length; j++) row[j] -= 3;
    }
    roundSteps.push({ kind: 'renorm', scaffoldRound: round });
    steps.push(...roundSteps);
    groupedSteps.push({ kind: 'scaffold', scaffoldRound: round, steps: roundSteps });
  };

  let replaySteps = 0;
  for (let t = triples.length - 1; t >= 0; t--) {
    const { cells, forwardIndex } = triples[t];
    for (const replay of [1, 2] as const) {
      if (!isLegalTriple(G, cells)) {
        scaffold();
        if (!isLegalTriple(G, cells)) {
          // Guaranteed by the mod-3 invariant; firing means the engine has a bug.
          throw new Error(
            `Reversibility engine bug: triple for forward move #${forwardIndex + 1} still blocked after scaffolding.`,
          );
        }
      }
      for (const { row, col } of cells) G[row][col] += 1;
      const step: TripleStep = { kind: 'triple', cells, forwardIndex, replay };
      steps.push(step);
      groupedSteps.push(step);
      replaySteps++;
    }
  }

  while (G.some(row => row.some(v => v >= 3))) {
    scaffold();
  }

  if (!gridsEqual(G, A)) {
    throw new Error('Reversibility engine bug: recipe did not return the grid to A.');
  }

  return {
    steps,
    groupedSteps,
    stats: {
      forwardTriples: triples.length,
      replaySteps,
      scaffoldRounds,
      expandedStepCount: steps.length,
      groupedStepCount: groupedSteps.length,
    },
  };
}
