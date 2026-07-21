import { describe, it, expect } from 'vitest';
import type { Grid } from '../src/state/types';
import { applyMove, validateMove, canApplyMod3, findLegalMoves } from '../src/state/moves';
import {
  computeRecipe,
  applyRecipeStep,
  applyGroupedStep,
  isLegalStep,
  tripleCellsOf,
  gridsEqual,
  type ForwardMove,
  type RecipeStep,
} from '../src/reversibility/engine';

/** Deterministic RNG (mulberry32) so failures are reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function randomA(rng: () => number, rows: number, cols: number): Grid {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => randInt(rng, 0, 2)),
  );
}

function cloneGrid(grid: Grid): Grid {
  return grid.map(row => [...row]);
}

/**
 * Play a random legal forward sequence using the app's real move engine
 * (moves.ts), so the log is exactly what the UI would produce. Picks a move
 * type first among those currently legal (mod-3 included whenever legal), then
 * a random move of that type, so all four types genuinely mix.
 */
function randomForwardPlay(
  rng: () => number,
  A: Grid,
  moveCount: number,
): { moveLog: ForwardMove[]; grid: Grid } {
  let grid = cloneGrid(A);
  const moveLog: ForwardMove[] = [];

  for (let i = 0; i < moveCount; i++) {
    const placements = findLegalMoves(grid, false);
    const types = [...new Set(placements.map(m => m.type))];
    if (canApplyMod3(grid)) types.push('mod-3');
    expect(types.length).toBeGreaterThan(0); // a legal move always exists

    const type = types[randInt(rng, 0, types.length - 1)];
    let move: ForwardMove;
    if (type === 'mod-3') {
      move = { type: 'mod-3' };
    } else {
      const ofType = placements.filter(m => m.type === type);
      move = ofType[randInt(rng, 0, ofType.length - 1)];
    }

    const result = applyMove(grid, move.type, move.position, false);
    grid = result.newGrid;
    moveLog.push({ type: move.type, position: move.position });

    // Domain bound that makes the engine's renorm (−3) identical to the app's
    // mod-3 (% 3): under strict rules no cell ever exceeds 5.
    for (const row of grid) {
      for (const v of row) expect(v).toBeLessThanOrEqual(5);
    }
  }

  return { moveLog, grid };
}

/** Check a recipe step's legality against the app's real move engine too. */
function isLegalStepPerApp(grid: Grid, step: RecipeStep): boolean {
  if (step.kind === 'triple') {
    const [c0, c1] = step.cells;
    const type = c0.row === c1.row ? 'horizontal-trimer' : 'vertical-trimer';
    return validateMove(grid, type, c0, false).valid;
  }
  if (step.kind === 'plus3') {
    return validateMove(grid, 'plus-3', step.cell, false).valid;
  }
  return canApplyMod3(grid);
}

/** Apply every step, asserting each is legal (per engine AND app) when applied. */
function applyRecipeChecked(start: Grid, steps: RecipeStep[]): Grid {
  let grid = start;
  for (const step of steps) {
    expect(isLegalStep(grid, step)).toBe(true);
    expect(isLegalStepPerApp(grid, step)).toBe(true);
    grid = applyRecipeStep(grid, step);
  }
  return grid;
}

describe('reversibility engine: randomized round-trip property', () => {
  it('300 random trials: every recipe step is legal when applied and the grid returns to A', () => {
    const rng = mulberry32(0x5eed);
    for (let trial = 0; trial < 300; trial++) {
      const rows = randInt(rng, 2, 10);
      const cols = randInt(rng, 2, 10);
      const A = randomA(rng, rows, cols);
      const { moveLog, grid: B } = randomForwardPlay(rng, A, randInt(rng, 20, 45));

      const recipe = computeRecipe(A, moveLog, B);
      const final = applyRecipeChecked(B, recipe.steps);
      expect(gridsEqual(final, A)).toBe(true);

      // Stats agree with the step lists.
      const forwardTriples = moveLog.filter(m => tripleCellsOf(m) !== null).length;
      expect(recipe.stats.forwardTriples).toBe(forwardTriples);
      expect(recipe.stats.replaySteps).toBe(2 * forwardTriples);
      expect(recipe.stats.expandedStepCount).toBe(recipe.steps.length);
      expect(recipe.stats.groupedStepCount).toBe(recipe.groupedSteps.length);
      expect(recipe.steps.filter(s => s.kind === 'triple').length).toBe(2 * forwardTriples);
    }
  });

  it('replays the forward triples in reverse order, each twice', () => {
    const rng = mulberry32(42);
    const A = randomA(rng, 4, 5);
    const { moveLog, grid: B } = randomForwardPlay(rng, A, 30);
    const recipe = computeRecipe(A, moveLog, B);

    const tripleSteps = recipe.steps.filter(s => s.kind === 'triple');
    const forwardIndices = moveLog
      .map((m, i) => (tripleCellsOf(m) ? i : -1))
      .filter(i => i >= 0);
    const expected = [...forwardIndices].reverse().flatMap(i => [
      { forwardIndex: i, replay: 1 },
      { forwardIndex: i, replay: 2 },
    ]);
    expect(tripleSteps.map(s => ({ forwardIndex: s.forwardIndex, replay: s.replay }))).toEqual(
      expected,
    );
  });
});

describe('reversibility engine: determinism', () => {
  it('same inputs produce the identical step list', () => {
    const rng = mulberry32(7);
    const A = randomA(rng, 5, 4);
    const { moveLog, grid: B } = randomForwardPlay(rng, A, 35);

    const r1 = computeRecipe(A, moveLog, B);
    const r2 = computeRecipe(A, moveLog, B);
    expect(r2.steps).toEqual(r1.steps);
    expect(r2.groupedSteps).toEqual(r1.groupedSteps);
    expect(r2.stats).toEqual(r1.stats);
  });
});

describe('reversibility engine: edge cases', () => {
  it('empty move log: recipe ends equal to A with no triple replays', () => {
    const A: Grid = [
      [0, 1, 2],
      [2, 0, 1],
    ];
    const recipe = computeRecipe(A, [], cloneGrid(A));
    expect(recipe.steps.filter(s => s.kind === 'triple')).toHaveLength(0);
    const final = applyRecipeChecked(cloneGrid(A), recipe.steps);
    expect(gridsEqual(final, A)).toBe(true);
    // A is already in range, so no scaffolding is needed either.
    expect(recipe.steps).toHaveLength(0);
  });

  it('forward log of only plus-threes and renorms: no triple replays, ends at A', () => {
    const A: Grid = [
      [1, 2],
      [0, 1],
    ];
    let grid = cloneGrid(A);
    const moveLog: ForwardMove[] = [];
    // +3 every cell, renorm, then two more +3s.
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const move: ForwardMove = { type: 'plus-3', position: { row: i, col: j } };
        grid = applyMove(grid, move.type, move.position, false).newGrid;
        moveLog.push(move);
      }
    }
    grid = applyMove(grid, 'mod-3', undefined, false).newGrid;
    moveLog.push({ type: 'mod-3' });
    for (const position of [{ row: 0, col: 0 }, { row: 1, col: 1 }]) {
      grid = applyMove(grid, 'plus-3', position, false).newGrid;
      moveLog.push({ type: 'plus-3', position });
    }

    const recipe = computeRecipe(A, moveLog, grid);
    expect(recipe.steps.filter(s => s.kind === 'triple')).toHaveLength(0);
    const final = applyRecipeChecked(grid, recipe.steps);
    expect(gridsEqual(final, A)).toBe(true);
  });

  it('a single triple played once: recipe is that triple twice, plus scaffolding', () => {
    const A: Grid = [
      [0, 0, 0],
      [1, 2, 1],
    ];
    const move: ForwardMove = { type: 'horizontal-trimer', position: { row: 0, col: 0 } };
    const B = applyMove(A, move.type, move.position, false).newGrid;

    const recipe = computeRecipe(A, [move], B);
    const tripleSteps = recipe.steps.filter(s => s.kind === 'triple');
    expect(tripleSteps).toHaveLength(2);
    expect(tripleSteps.map(s => s.replay)).toEqual([1, 2]);
    expect(tripleSteps.every(s => s.forwardIndex === 0)).toBe(true);
    const final = applyRecipeChecked(B, recipe.steps);
    expect(gridsEqual(final, A)).toBe(true);
  });

  it('a triple played three times forward (net zero): recipe still returns to A', () => {
    const A: Grid = [
      [0, 0, 0],
      [2, 1, 0],
    ];
    const move: ForwardMove = { type: 'horizontal-trimer', position: { row: 0, col: 0 } };
    let grid = cloneGrid(A);
    const moveLog: ForwardMove[] = [];
    for (let i = 0; i < 3; i++) {
      grid = applyMove(grid, move.type, move.position, false).newGrid;
      moveLog.push(move);
    }
    expect(grid[0]).toEqual([3, 3, 3]);

    const recipe = computeRecipe(A, moveLog, grid);
    expect(recipe.steps.filter(s => s.kind === 'triple')).toHaveLength(6);
    const final = applyRecipeChecked(grid, recipe.steps);
    expect(gridsEqual(final, A)).toBe(true);
  });
});

describe('reversibility engine: grouping consistency', () => {
  it('expanded steps and grouped steps produce identical final grids', () => {
    const rng = mulberry32(1234);
    for (let trial = 0; trial < 25; trial++) {
      const rows = randInt(rng, 2, 6);
      const cols = randInt(rng, 2, 6);
      const A = randomA(rng, rows, cols);
      const { moveLog, grid: B } = randomForwardPlay(rng, A, randInt(rng, 20, 45));

      const recipe = computeRecipe(A, moveLog, B);
      const viaExpanded = recipe.steps.reduce(applyRecipeStep, B);
      const viaGrouped = recipe.groupedSteps.reduce(applyGroupedStep, B);
      expect(gridsEqual(viaExpanded, viaGrouped)).toBe(true);
      expect(gridsEqual(viaExpanded, A)).toBe(true);

      // The grouped list is the expanded list with each scaffold round packaged whole.
      const flattened = recipe.groupedSteps.flatMap(s =>
        s.kind === 'scaffold' ? s.steps : [s],
      );
      expect(flattened).toEqual(recipe.steps);
    }
  });
});
