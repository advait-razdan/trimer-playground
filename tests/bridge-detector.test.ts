import { describe, it, expect } from 'vitest';
import { detectBridges } from '../src/state/bridge-detector';
import { fromAscii } from '../src/state/polyomino';

describe('bridge-detector', () => {
  it('rectangle has no bridges', () => {
    const mask = fromAscii(`
      ###
      ###
      ###
    `);
    const { bridgeCells, bridgeCount } = detectBridges(mask);
    expect(bridgeCount).toBe(0);
    expect(bridgeCells.size).toBe(0);
  });

  it('L-shape has no bridges', () => {
    const mask = fromAscii(`
      ##.
      ###
      ###
    `);
    const { bridgeCount } = detectBridges(mask);
    expect(bridgeCount).toBe(0);
  });

  it('plus sign has no bridges', () => {
    const mask = fromAscii(`
      .#.
      ###
      .#.
    `);
    const { bridgeCount } = detectBridges(mask);
    expect(bridgeCount).toBe(0);
  });

  it('dumbbell (3x3 lobes, bridge len 2) has 1 fat bridge', () => {
    // Two 3x3 lobes connected by a width-1 bridge of length 2
    const mask = fromAscii(`
      ###..###
      ########
      ###..###
    `);
    const { bridgeCells, bridgeCount } = detectBridges(mask);
    expect(bridgeCount).toBe(1);
    // The bridge cells should be (1,3) and (1,4)
    expect(bridgeCells.has('1,3')).toBe(true);
    expect(bridgeCells.has('1,4')).toBe(true);
  });

  it('P-shape has no bridges', () => {
    const mask = fromAscii(`
      ##.
      ###
      #..
    `);
    const { bridgeCount } = detectBridges(mask);
    expect(bridgeCount).toBe(0);
  });

  it('1x5 strip has no fat bridges (spike, not fat)', () => {
    // A 1xN strip has no V-trimers, so no lobe qualifies as "fat"
    const mask = fromAscii(`
      #####
    `);
    const { bridgeCount } = detectBridges(mask);
    expect(bridgeCount).toBe(0);
  });

  it('staircase (n=4) has no bridges', () => {
    const mask = fromAscii(`
      ####
      ###.
      ##..
      #...
    `);
    const { bridgeCount } = detectBridges(mask);
    expect(bridgeCount).toBe(0);
  });

  it('double dumbbell (3 lobes, 2 bridges) has 2 bridges', () => {
    // Three 3x3 lobes connected by two width-1 bridges
    const mask = fromAscii(`
      ###..###..###
      #############
      ###..###..###
    `);
    const { bridgeCount } = detectBridges(mask);
    expect(bridgeCount).toBe(2);
  });

  it('T-shape with spike has no bridges (spike is not fat)', () => {
    // A T-shape: one side of a potential "bridge" is a 1-cell-wide spike
    const mask = fromAscii(`
      ####
      .#..
      .#..
      .#..
    `);
    const { bridgeCount } = detectBridges(mask);
    expect(bridgeCount).toBe(0);
  });
});
