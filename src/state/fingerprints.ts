import type { Grid, Fingerprints, WorkingTrace } from './types';

/** Modulo that always returns non-negative */
function mod3(n: number): number {
  return ((n % 3) + 3) % 3;
}

/** F1 = (sum of all values) mod 3 */
export function computeF1(grid: Grid): number {
  let total = 0;
  for (const row of grid) {
    for (const val of row) {
      total += val;
    }
  }
  return mod3(total);
}

/** F2 = (sum of i * value) mod 3 */
export function computeF2(grid: Grid): number {
  let total = 0;
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      total += i * grid[i][j];
    }
  }
  return mod3(total);
}

/** F3 = (sum of j * value) mod 3 */
export function computeF3(grid: Grid): number {
  let total = 0;
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      total += j * grid[i][j];
    }
  }
  return mod3(total);
}

/** F4 = (sum of i * j * value) mod 3 */
export function computeF4(grid: Grid): number {
  let total = 0;
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      total += i * j * grid[i][j];
    }
  }
  return mod3(total);
}

/** Compute all four fingerprints */
export function computeFingerprints(grid: Grid): Fingerprints {
  return {
    f1: computeF1(grid),
    f2: computeF2(grid),
    f3: computeF3(grid),
    f4: computeF4(grid),
  };
}

// --- Working trace generation ---

export function traceF1(grid: Grid): WorkingTrace {
  const lines: string[] = [];
  let total = 0;
  const allValues: string[] = [];
  for (let i = 0; i < grid.length; i++) {
    const rowValues = grid[i].map(String);
    allValues.push(...rowValues);
    for (const val of grid[i]) {
      total += val;
    }
  }
  lines.push(`Sum of all cells: ${allValues.join(' + ')} = ${total}`);
  lines.push(`${total} mod 3 = ${mod3(total)}`);
  return { label: 'F1 = (sum of all values) mod 3', lines, total, result: mod3(total) };
}

export function traceF2(grid: Grid): WorkingTrace {
  const lines: string[] = [];
  let total = 0;
  for (let i = 0; i < grid.length; i++) {
    const rowSum = grid[i].reduce((a, b) => a + b, 0);
    const rowContribution = i * rowSum;
    total += rowContribution;
    lines.push(`Row ${i} (i=${i}):  ${i} \u00d7 (${grid[i].join('+')}) = ${i} \u00d7 ${rowSum} = ${rowContribution}`);
  }
  lines.push(`Total = ${total}`);
  lines.push(`${total} mod 3 = ${mod3(total)}`);
  return { label: 'F2 = \u03a3 (i \u00b7 value), mod 3', lines, total, result: mod3(total) };
}

export function traceF3(grid: Grid): WorkingTrace {
  const lines: string[] = [];
  let total = 0;
  const cols = grid[0]?.length ?? 0;
  for (let j = 0; j < cols; j++) {
    let colSum = 0;
    const colValues: string[] = [];
    for (let i = 0; i < grid.length; i++) {
      colSum += grid[i][j];
      colValues.push(String(grid[i][j]));
    }
    const colContribution = j * colSum;
    total += colContribution;
    lines.push(`Col ${j} (j=${j}):  ${j} \u00d7 (${colValues.join('+')}) = ${j} \u00d7 ${colSum} = ${colContribution}`);
  }
  lines.push(`Total = ${total}`);
  lines.push(`${total} mod 3 = ${mod3(total)}`);
  return { label: 'F3 = \u03a3 (j \u00b7 value), mod 3', lines, total, result: mod3(total) };
}

export function traceF4(grid: Grid): WorkingTrace {
  const lines: string[] = [];
  let total = 0;
  lines.push('(Cells with i=0 or j=0 contribute 0.)');
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      const val = grid[i][j];
      const contribution = i * j * val;
      if (i === 0 || j === 0) continue;
      if (val === 0) continue;
      total += contribution;
      lines.push(`(${i},${j}): ${i} \u00b7 ${j} \u00b7 ${val} = ${contribution}`);
    }
  }
  // Also compute total correctly (including zero-contribution cells for accuracy)
  let realTotal = 0;
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      realTotal += i * j * grid[i][j];
    }
  }
  lines.push(`Total = ${realTotal}`);
  lines.push(`${realTotal} mod 3 = ${mod3(realTotal)}`);
  return { label: 'F4 = \u03a3 (i \u00b7 j \u00b7 value), mod 3', lines, total: realTotal, result: mod3(realTotal) };
}

export function computeAllTraces(grid: Grid): WorkingTrace[] {
  return [traceF1(grid), traceF2(grid), traceF3(grid), traceF4(grid)];
}
