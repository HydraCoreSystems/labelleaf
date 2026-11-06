# LabelLeaf

A plant label maker. A grower types a plant name, the app offers corrections toward botanical convention, accepted names collect in a queue, and the app prints sheets of labels on standard Avery stock in a regular printer.

Expo and TypeScript. iPhone first. Android follows from the same codebase when testers exist.

## Status

Version one is in progress. See BUILD_STATUS.md for what is done and what is waiting.

## Where the core came from

The pure TypeScript core under src/core was lifted from HydraCoreSystems/gm-commerce, lib/nursery. Nothing in that repo was changed.

| New file | Lifted from | Notes |
| --- | --- | --- |
| src/core/naming.ts | hoya-naming.ts | A blank genus no longer defaults to Hoya |
| src/core/labels.ts | labels.ts | QR and scan code left behind |
| src/core/templates.ts | avery-calibration.ts and the old print styles | Every calibration number lives here only |
| src/core/propagation.ts | propagation.ts | Source type narrowed from a donor row |
| src/core/types.ts | types.ts | Trade name field left behind |

The old tests came across with their assertions unchanged. The only edits are import paths, one mock type annotation, and the removal of the two scan URL assertions that tested code left behind.

## Commands

    npm test          run the suite
    npm run typecheck type check
