# LabelLeaf build status

Version one, iPhone first. Built from LABEL_APP_BUILD_BRIEF_2026-11-06.md.

## Done and tested in software

- Lifted core from Commerce Center lib/nursery, with its original tests. The name composer no longer defaults a blank genus to Hoya.
- Three layer name checker: format, Kew WCVP, cultivar register. It offers corrections and never edits a name on its own. A cross between two species keeps every typed word and is not sent through Kew.
- Queue with add, edit, reorder, remove, cutting runs (marks like C08), and CSV export.
- Exact size US Letter PDF with per template calibration offsets applied inside the PDF. Proof tests read the PDF back and compare against hand written Avery 5160 numbers.
- Slot picker for a partly used sheet, and a plan that warns when a run spills onto a second sheet.
- Phone only storage. No account, server or cloud.
- Screens: queue, add, cuttings, print, calibrate, settings.
- Copy rules enforced by tests: all fixed text lives in src/ui/copy.ts with no dashes.
- iOS bundle compiles with Metro (1,382 modules).

## Waiting on Lotus

- Avery 8257 grid. Registered but not printable, and the app says so. Needs the blank Avery 6870 template PDF. Enter the layout and content box in src/core/templates.ts, then mark 8257 printable.
- Kew data. src/data/kew.json is empty. Run `npm run build:kew` with wcvp_names.csv and the genera to cover.
- Cultivar register data. src/data/cultivars.json is empty. Needs the genera, register names and sources.
- Empty private repo HydraCoreSystems/labelleaf with push access.
- iOS bundle identifier and Apple team, for packaging.

## Only a real device or real print can verify

- pdf-lib running under Hermes on a phone.
- The iOS print dialog keeping exact size (the PDF asks for no scaling).
- Alignment on real label stock, using the calibration screen.
- The lifted font tiers without a QR code. They were tuned for a narrower text block, so the first real print is the point to check them. They have not been re tuned.
- A TestFlight run on Crystal's iPhone.

## Commands

- `npm test` runs the suite.
- `npm run typecheck` runs TypeScript.
- `npm run build:kew` builds src/data/kew.json from a WCVP CSV.
