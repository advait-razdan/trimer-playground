# Trimer Fingerprint Playground

An interactive web tool for exploring trimer-based reachability on polyomino shapes. Built with React + TypeScript + Vite + Tailwind.

## Tabs

### Rectangular Base
The original rectangular grid playground. Four canonical fingerprints (F1-F4) determine reachability between any two profiles on an m x n rectangle.

### Polyomino Base
Extends the playground to arbitrary polyomino shapes (L, T, plus, staircase, dumbbell, etc.). Key differences:

- **Word length depends on the shape.** Some shapes use 2 fingerprints, some 4, some 6 or more.
- **Extra fingerprints (E1, E2, ...)** appear on shapes with width-1 bridges between fat lobes.
- **Collapsed canonicals** (F2, F3, or F4) may evaluate to 0 on shapes with limited coordinate variation.

Features:
- Shape editor with 7 presets (rectangle, L, T, plus, staircase, P-shape, dumbbell)
- Live fingerprint panel with step-by-step working for both canonical and extra fingerprints
- "Prove" button: BFS move-sequence for reachable pairs, exhaustive/algebraic proof for unreachable
- Bridge highlighter showing width-1 fat bridges on the shape canvas
- Shape walker for exploring how toggling cells changes the fingerprint count
- Glossary, guided tour, and diagnostic popovers for in-app learning

## Rule Toggles (both tabs)

- **Allow trimer placement on cells with value >= 3**: relaxes the `< 3` placement rule
- **Allow start grid cells with value >= 3**: allows initial cell values beyond 0/1/2

## Development

```bash
npm install
npm run dev     # Start dev server
npm run build   # Production build
npm test        # Run tests (128 tests across 8 files)
```

## Tech Stack

React 19 + TypeScript + Vite + Tailwind CSS. All math (GF(3) linear algebra, invariant computation, BFS, proof logic) runs in the browser.
