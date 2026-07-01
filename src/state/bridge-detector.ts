/**
 * Fat bridge detector for polyomino shapes.
 *
 * A "fat bridge" is a width-1 cell (articulation point) whose removal
 * splits the shape into two pieces, each containing at least one
 * horizontal trimer position AND one vertical trimer position.
 *
 * Spikes/tails don't count because one side of the cut is too thin
 * to support trimers in both directions.
 */

import type { ShapeMask } from './polyomino';

/** Check if a component (set of cell keys "row,col") contains at least one H-trimer position. */
function hasHTrimers(cells: Set<string>, mask: ShapeMask): boolean {
  const cols = mask[0]?.length ?? 0;
  for (const key of cells) {
    const [r, c] = key.split(',').map(Number);
    if (c + 2 < cols && cells.has(`${r},${c + 1}`) && cells.has(`${r},${c + 2}`)) {
      return true;
    }
  }
  return false;
}

/** Check if a component contains at least one V-trimer position. */
function hasVTrimers(cells: Set<string>, mask: ShapeMask): boolean {
  const rows = mask.length;
  for (const key of cells) {
    const [r, c] = key.split(',').map(Number);
    if (r + 2 < rows && cells.has(`${r + 1},${c}`) && cells.has(`${r + 2},${c}`)) {
      return true;
    }
  }
  return false;
}

/** Check if a component has both H and V trimer positions. */
function isFat(cells: Set<string>, mask: ShapeMask): boolean {
  return hasHTrimers(cells, mask) && hasVTrimers(cells, mask);
}

/** 4-connected neighbors. */
function neighbors4(r: number, c: number): [number, number][] {
  return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
}

/** BFS from a start cell through active cells in a mask (excluding removed cells). */
function bfsComponent(
  startR: number, startC: number,
  mask: ShapeMask,
  excluded: Set<string>,
): Set<string> {
  const rows = mask.length;
  const cols = mask[0]?.length ?? 0;
  const visited = new Set<string>();
  const key = (r: number, c: number) => `${r},${c}`;
  const sk = key(startR, startC);
  if (excluded.has(sk) || !mask[startR][startC]) return visited;

  visited.add(sk);
  const queue: [number, number][] = [[startR, startC]];

  while (queue.length > 0) {
    const [cr, cc] = queue.shift()!;
    for (const [nr, nc] of neighbors4(cr, cc)) {
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const nk = key(nr, nc);
      if (!visited.has(nk) && mask[nr][nc] && !excluded.has(nk)) {
        visited.add(nk);
        queue.push([nr, nc]);
      }
    }
  }
  return visited;
}

/** Find connected components of active cells in mask, excluding a set of cells. */
function findComponents(mask: ShapeMask, excluded: Set<string>): Set<string>[] {
  const rows = mask.length;
  const cols = mask[0]?.length ?? 0;
  const visited = new Set<string>();
  const components: Set<string>[] = [];

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const k = `${i},${j}`;
      if (mask[i][j] && !excluded.has(k) && !visited.has(k)) {
        const comp = bfsComponent(i, j, mask, excluded);
        for (const c of comp) visited.add(c);
        components.push(comp);
      }
    }
  }
  return components;
}

export interface BridgeInfo {
  /** Cells that are part of fat bridges. */
  bridgeCells: Set<string>;
  /** Number of distinct fat bridges (connected groups of bridge cells). */
  bridgeCount: number;
}

/**
 * Detect fat bridges in a shape.
 *
 * Algorithm:
 * 1. For each active cell, check if removing it disconnects the shape.
 * 2. If it does, check if ALL resulting components are "fat" (have both H and V trimers).
 * 3. If so, the cell is part of a fat bridge.
 * 4. Group adjacent bridge cells into distinct bridges.
 */
export function detectBridges(mask: ShapeMask): BridgeInfo {
  const rows = mask.length;
  const cols = mask[0]?.length ?? 0;
  const bridgeCells = new Set<string>();

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (!mask[i][j]) continue;
      const cellKey = `${i},${j}`;

      // Remove this cell and find components
      const excluded = new Set([cellKey]);
      const components = findComponents(mask, excluded);

      // Must split into 2+ components (articulation point)
      if (components.length < 2) continue;

      // All components must be fat
      if (components.every(comp => isFat(comp, mask))) {
        bridgeCells.add(cellKey);
      }
    }
  }

  // Count distinct bridges (connected groups of bridge cells)
  const visited = new Set<string>();
  let bridgeCount = 0;

  for (const cell of bridgeCells) {
    if (visited.has(cell)) continue;
    bridgeCount++;
    // BFS through adjacent bridge cells
    const queue = [cell];
    visited.add(cell);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const [cr, cc] = cur.split(',').map(Number);
      for (const [nr, nc] of neighbors4(cr, cc)) {
        const nk = `${nr},${nc}`;
        if (bridgeCells.has(nk) && !visited.has(nk)) {
          visited.add(nk);
          queue.push(nk);
        }
      }
    }
  }

  return { bridgeCells, bridgeCount };
}
