# Changelog

## v2.0.0 (2026-06-30)

### Added
- **Polyomino Base tab**: full interactive playground for arbitrary polyomino shapes
  - Shape editor with toggle cells, connectivity/hole validation, 7 presets
  - GF(3) null-space fingerprint computation (canonical F1-F4 + extra E1, E2, ...)
  - Live fingerprint panel with expandable working for canonicals and extras
  - Prove feature: BFS move-sequence for reachable, exhaustive/algebraic proof for unreachable
  - Bridge detector identifying width-1 fat bridges that cause extras
  - Bridge highlighter on shape canvas
  - Shape walker tool for exploring fingerprint count changes
  - Profile presets (P-shape Image 2, Dumbbell extras demo)
  - Save/load state with shape mask encoding
- **Teaching surface**: welcome card, 5-step guided tour, searchable glossary drawer, inline tooltips, shape diagnostic popovers, reference pattern table
- **Two shared rule toggles** on both tabs: "Allow placement >= 3" and "Allow start >= 3"
- **Tabbed navigation** with React Router (Rectangular Base / Polyomino Base)
- **Mobile-responsive layout** (panels stack below 768px)
- 128 tests across 8 test files

### Changed
- Existing rectangular playground wrapped in tabbed shell as "Rectangular Base" tab
- No functional changes to v1 behavior with default toggle settings
