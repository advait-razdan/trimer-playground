import type { Grid, MoveType, CellPosition, Move } from './types';

interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/** Deep-clone a grid (immutable operation helper) */
function cloneGrid(grid: Grid): Grid {
  return grid.map(row => [...row]);
}

/** Check if every cell in the grid has value >= 3 */
export function canApplyMod3(grid: Grid): boolean {
  for (const row of grid) {
    for (const val of row) {
      if (val < 3) return false;
    }
  }
  return true;
}

/** Validate whether a move is legal on the given grid.
 *  @param allowAbove3 - when true, the "< 3" placement rule is relaxed.
 */
export function validateMove(
  grid: Grid,
  moveType: MoveType,
  position?: CellPosition,
  allowAbove3 = false,
): ValidationResult {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  if (moveType === 'mod-3') {
    if (!canApplyMod3(grid)) {
      // Find a cell that's < 3 to explain why
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          if (grid[i][j] < 3) {
            return { valid: false, reason: `Cell (${i},${j}) has value ${grid[i][j]}, which is < 3. All cells must be \u2265 3 for mod-3.` };
          }
        }
      }
    }
    return { valid: true };
  }

  if (!position) {
    return { valid: false, reason: 'No position specified.' };
  }

  const { row, col } = position;

  if (moveType === 'plus-3') {
    if (row < 0 || row >= rows || col < 0 || col >= cols) {
      return { valid: false, reason: `Position (${row},${col}) is out of bounds.` };
    }
    if (!allowAbove3 && grid[row][col] >= 3) {
      return { valid: false, reason: `Cell (${row},${col}) has value ${grid[row][col]}, which is already \u2265 3.` };
    }
    return { valid: true };
  }

  if (moveType === 'horizontal-trimer') {
    if (row < 0 || row >= rows || col < 0 || col + 2 >= cols) {
      return { valid: false, reason: `Horizontal trimer at (${row},${col}) goes out of bounds (need columns ${col}, ${col + 1}, ${col + 2}).` };
    }
    const v0 = grid[row][col];
    const v1 = grid[row][col + 1];
    const v2 = grid[row][col + 2];
    if (!allowAbove3 && (v0 >= 3 || v1 >= 3 || v2 >= 3)) {
      return { valid: false, reason: `Cells are ${v0}, ${v1}, ${v2} \u2014 at least one is \u2265 3.` };
    }
    if (v0 !== v1 || v1 !== v2) {
      return { valid: false, reason: `Cells are ${v0}, ${v1}, ${v2} \u2014 not all equal.` };
    }
    return { valid: true };
  }

  if (moveType === 'vertical-trimer') {
    if (col < 0 || col >= cols || row < 0 || row + 2 >= rows) {
      return { valid: false, reason: `Vertical trimer at (${row},${col}) goes out of bounds (need rows ${row}, ${row + 1}, ${row + 2}).` };
    }
    const v0 = grid[row][col];
    const v1 = grid[row + 1][col];
    const v2 = grid[row + 2][col];
    if (!allowAbove3 && (v0 >= 3 || v1 >= 3 || v2 >= 3)) {
      return { valid: false, reason: `Cells are ${v0}, ${v1}, ${v2} \u2014 at least one is \u2265 3.` };
    }
    if (v0 !== v1 || v1 !== v2) {
      return { valid: false, reason: `Cells are ${v0}, ${v1}, ${v2} \u2014 not all equal.` };
    }
    return { valid: true };
  }

  return { valid: false, reason: `Unknown move type: ${moveType}` };
}

/** Enumerate every legal placement move on the grid: +3 on a single cell,
 *  and horizontal/vertical trimers. Excludes mod-3 (a whole-grid operation). */
export function findLegalMoves(
  grid: Grid,
  allowAbove3 = false,
): { type: MoveType; position: CellPosition }[] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const moves: { type: MoveType; position: CellPosition }[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (validateMove(grid, 'plus-3', { row, col }, allowAbove3).valid) {
        moves.push({ type: 'plus-3', position: { row, col } });
      }
      if (validateMove(grid, 'horizontal-trimer', { row, col }, allowAbove3).valid) {
        moves.push({ type: 'horizontal-trimer', position: { row, col } });
      }
      if (validateMove(grid, 'vertical-trimer', { row, col }, allowAbove3).valid) {
        moves.push({ type: 'vertical-trimer', position: { row, col } });
      }
    }
  }
  return moves;
}

/** Apply a move to the grid, returning a new grid and the Move record. Throws if invalid. */
export function applyMove(
  grid: Grid,
  moveType: MoveType,
  position?: CellPosition,
  allowAbove3 = false,
): { newGrid: Grid; move: Move } {
  const validation = validateMove(grid, moveType, position, allowAbove3);
  if (!validation.valid) {
    throw new Error(validation.reason ?? 'Invalid move');
  }

  const newGrid = cloneGrid(grid);

  if (moveType === 'mod-3') {
    const before: number[] = [];
    const after: number[] = [];
    for (let i = 0; i < newGrid.length; i++) {
      for (let j = 0; j < newGrid[i].length; j++) {
        before.push(newGrid[i][j]);
        newGrid[i][j] = newGrid[i][j] % 3;
        after.push(newGrid[i][j]);
      }
    }
    return { newGrid, move: { type: 'mod-3', before, after } };
  }

  if (moveType === 'plus-3') {
    const { row, col } = position!;
    const before = [grid[row][col]];
    newGrid[row][col] = grid[row][col] + 3;
    const after = [newGrid[row][col]];
    return { newGrid, move: { type: 'plus-3', position, before, after } };
  }

  if (moveType === 'horizontal-trimer') {
    const { row, col } = position!;
    const before = [grid[row][col], grid[row][col + 1], grid[row][col + 2]];
    newGrid[row][col] += 1;
    newGrid[row][col + 1] += 1;
    newGrid[row][col + 2] += 1;
    const after = [newGrid[row][col], newGrid[row][col + 1], newGrid[row][col + 2]];
    return { newGrid, move: { type: 'horizontal-trimer', position, before, after } };
  }

  // vertical-trimer
  const { row, col } = position!;
  const before = [grid[row][col], grid[row + 1][col], grid[row + 2][col]];
  newGrid[row][col] += 1;
  newGrid[row + 1][col] += 1;
  newGrid[row + 2][col] += 1;
  const after = [newGrid[row][col], newGrid[row + 1][col], newGrid[row + 2][col]];
  return { newGrid, move: { type: 'vertical-trimer', position, before, after } };
}
