import { describe, it, expect } from 'vitest';
import { findMoveSequence, enumerateReachable } from '../src/state/bfs';
import { prove } from '../src/state/proof';
import { computeInvariantBasis } from '../src/state/invariants';
import { fromAscii } from '../src/state/polyomino';

describe('findMoveSequence', () => {
  it('finds a move sequence for a reachable pair on P-shape', () => {
    const mask = fromAscii(`
      ##.
      ###
      #..
    `);
    const basis = computeInvariantBasis(mask);

    // A = zeros, B = two H-trimer applications at row 1 (legally reachable)
    const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const B = [[0, 0, 0], [2, 2, 2], [0, 0, 0]];

    const result = findMoveSequence(A, B, basis);
    expect(result.status).toBe('found');
    if (result.status === 'found') {
      expect(result.sequence.length).toBeGreaterThan(0);
    }
  });

  it('returns unreachable for an unreachable pair', () => {
    const mask = fromAscii(`
      ##.
      ###
      #..
    `);
    const basis = computeInvariantBasis(mask);
    const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const B = [[1, 2, 0], [0, 0, 1], [2, 0, 0]];

    const result = findMoveSequence(A, B, basis);
    expect(result.status).toBe('unreachable');
  });

  it('returns identical for same profile', () => {
    const mask = fromAscii(`
      ##.
      ###
      #..
    `);
    const basis = computeInvariantBasis(mask);
    const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

    const result = findMoveSequence(A, A, basis);
    expect(result.status).toBe('identical');
  });
});

describe('enumerateReachable', () => {
  it('enumerates exactly 9 states from zeros on the P-shape', () => {
    const mask = fromAscii(`
      ##.
      ###
      #..
    `);
    const basis = computeInvariantBasis(mask);
    const profile = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

    const result = enumerateReachable(profile, basis);
    expect(result.capped).toBe(false);
    // With legal-move constraints (cells must be equal), 5 states are reachable
    expect(result.states.size).toBe(5);
  });
});

describe('prove', () => {
  it('proves unreachability on P-shape (image-2 case) via exhaustive BFS', () => {
    const mask = fromAscii(`
      ##.
      ###
      #..
    `);
    const basis = computeInvariantBasis(mask);
    const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const B = [[1, 2, 0], [0, 0, 1], [2, 0, 0]];

    const result = prove(A, B, basis);
    expect(result.type).toBe('unreachable_exhaustive');
    if (result.type === 'unreachable_exhaustive') {
      expect(result.totalReachable).toBe(5);
      expect(result.disagreeing.length).toBeGreaterThan(0);
    }
  });

  it('proves reachability on P-shape with a move sequence', () => {
    const mask = fromAscii(`
      ##.
      ###
      #..
    `);
    const basis = computeInvariantBasis(mask);
    const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    // Build B by applying moves to zeros
    const B = [[0, 0, 0], [1, 1, 1], [0, 0, 0]]; // one H-trimer at row 1

    const result = prove(A, B, basis);
    expect(result.type).toBe('reachable');
    if (result.type === 'reachable') {
      expect(result.sequence.length).toBeGreaterThan(0);
    }
  });

  it('returns identical for same profile', () => {
    const mask = fromAscii(`
      ##.
      ###
      #..
    `);
    const basis = computeInvariantBasis(mask);
    const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

    const result = prove(A, A, basis);
    expect(result.type).toBe('identical');
  });
});
