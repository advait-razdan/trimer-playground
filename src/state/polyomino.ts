/**
 * Polyomino shape utilities — mask type, connectivity check, no-holes check, cell indexing.
 */

/** A shape mask: true = active cell, false = inactive. Row-major [row][col]. */
export type ShapeMask = boolean[][];

/** A cell coordinate in the shape. */
export interface Cell {
  row: number;
  col: number;
}

/** Result of shape validation. */
export interface ShapeValidation {
  valid: boolean;
  reason?: string;
}

/** Create an all-active (rectangular) mask. */
export function createFullMask(rows: number, cols: number): ShapeMask {
  return Array.from({ length: rows }, () => Array(cols).fill(true));
}

/** Count active cells in a mask. */
export function countActiveCells(mask: ShapeMask): number {
  let count = 0;
  for (const row of mask) {
    for (const val of row) {
      if (val) count++;
    }
  }
  return count;
}

/** Get list of active cells in row-major order. */
export function getActiveCells(mask: ShapeMask): Cell[] {
  const cells: Cell[] = [];
  for (let i = 0; i < mask.length; i++) {
    for (let j = 0; j < mask[i].length; j++) {
      if (mask[i][j]) cells.push({ row: i, col: j });
    }
  }
  return cells;
}

/** Build a cell index map: cellIndex[row][col] = index in active cells list, or -1 if inactive. */
export function buildCellIndex(mask: ShapeMask): number[][] {
  const index: number[][] = [];
  let k = 0;
  for (let i = 0; i < mask.length; i++) {
    index.push([]);
    for (let j = 0; j < mask[i].length; j++) {
      if (mask[i][j]) {
        index[i].push(k++);
      } else {
        index[i].push(-1);
      }
    }
  }
  return index;
}

/** 4-connected neighbors of (row, col). */
function neighbors4(row: number, col: number, rows: number, cols: number): Cell[] {
  const result: Cell[] = [];
  if (row > 0) result.push({ row: row - 1, col });
  if (row < rows - 1) result.push({ row: row + 1, col });
  if (col > 0) result.push({ row, col: col - 1 });
  if (col < cols - 1) result.push({ row, col: col + 1 });
  return result;
}

/**
 * BFS/flood fill from a starting cell through cells that satisfy a predicate.
 * Returns the set of visited cell keys ("row,col").
 */
function floodFill(
  startRow: number,
  startCol: number,
  rows: number,
  cols: number,
  predicate: (r: number, c: number) => boolean,
): Set<string> {
  const visited = new Set<string>();
  const queue: Cell[] = [{ row: startRow, col: startCol }];
  const key = (r: number, c: number) => `${r},${c}`;
  visited.add(key(startRow, startCol));

  while (queue.length > 0) {
    const cell = queue.shift()!;
    for (const nb of neighbors4(cell.row, cell.col, rows, cols)) {
      const k = key(nb.row, nb.col);
      if (!visited.has(k) && predicate(nb.row, nb.col)) {
        visited.add(k);
        queue.push(nb);
      }
    }
  }
  return visited;
}

/**
 * Check if the active cells in the mask form a single 4-connected component.
 */
export function isConnected(mask: ShapeMask): boolean {
  const rows = mask.length;
  if (rows === 0) return true;
  const cols = mask[0].length;

  // Find first active cell
  let startRow = -1, startCol = -1;
  let totalActive = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (mask[i][j]) {
        totalActive++;
        if (startRow === -1) {
          startRow = i;
          startCol = j;
        }
      }
    }
  }

  if (totalActive <= 1) return true;

  const visited = floodFill(startRow, startCol, rows, cols, (r, c) => mask[r][c]);
  return visited.size === totalActive;
}

/**
 * Check if the mask has a hole — an inactive region completely surrounded by active cells.
 * A hole is detected by flood-filling from the border through inactive cells;
 * any inactive cell not reached is inside a hole.
 */
export function hasHoles(mask: ShapeMask): boolean {
  const rows = mask.length;
  if (rows === 0) return false;
  const cols = mask[0].length;

  // Flood fill from all border inactive cells
  const reachableInactive = new Set<string>();
  const queue: Cell[] = [];
  const key = (r: number, c: number) => `${r},${c}`;

  // Seed with all border inactive cells
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (!mask[i][j] && (i === 0 || i === rows - 1 || j === 0 || j === cols - 1)) {
        const k = key(i, j);
        if (!reachableInactive.has(k)) {
          reachableInactive.add(k);
          queue.push({ row: i, col: j });
        }
      }
    }
  }

  // BFS through inactive cells
  while (queue.length > 0) {
    const cell = queue.shift()!;
    for (const nb of neighbors4(cell.row, cell.col, rows, cols)) {
      const k = key(nb.row, nb.col);
      if (!reachableInactive.has(k) && !mask[nb.row][nb.col]) {
        reachableInactive.add(k);
        queue.push(nb);
      }
    }
  }

  // Check if any inactive cell is NOT reachable from the border
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (!mask[i][j] && !reachableInactive.has(key(i, j))) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Validate whether toggling a cell would produce a valid shape.
 * Returns { valid, reason } if the resulting shape would be invalid.
 */
export function validateToggle(mask: ShapeMask, row: number, col: number): ShapeValidation {
  // Create a copy with the toggle applied
  const newMask = mask.map(r => [...r]);
  newMask[row][col] = !newMask[row][col];

  // Must have at least 1 active cell
  if (countActiveCells(newMask) === 0) {
    return { valid: false, reason: 'Shape must have at least one cell.' };
  }

  // Check connectivity
  if (!isConnected(newMask)) {
    return { valid: false, reason: 'That would disconnect the shape — disallowed.' };
  }

  // Check no holes
  if (hasHoles(newMask)) {
    return { valid: false, reason: 'Shapes with holes are not yet supported — disallowed.' };
  }

  return { valid: true };
}

/**
 * Parse a shape mask from ASCII art. '#' = filled, anything else = empty.
 * Matches the Python from_ascii helper.
 */
export function fromAscii(s: string, fill = '#'): ShapeMask {
  const lines = s.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Strip common leading whitespace
  const minIndent = Math.min(...lines.map(l => l.length - l.trimStart().length));
  const stripped = lines.map(l => l.slice(minIndent));

  const rows = stripped.length;
  const cols = Math.max(...stripped.map(l => l.length));

  const mask: ShapeMask = [];
  for (let i = 0; i < rows; i++) {
    const row: boolean[] = [];
    for (let j = 0; j < cols; j++) {
      row.push(j < stripped[i].length && stripped[i][j] === fill);
    }
    mask.push(row);
  }
  return mask;
}
