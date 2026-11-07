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

## Data and templates now in

- Kew data: WCVP v16 (extracted June 4, 2026), from wcvp_trade_extract.csv. 17,951 rows, 31 columns, pipe delimited, all checked. Bundled for Hoya plus Dischidia, Ceropegia, Stephanotis, Monstera, Philodendron, Epipremnum, Syngonium, Anthurium, Alocasia, Peperomia, Begonia, Phalaenopsis, Dendrobium, Cattleya and Calathea. The importer treats Artificial Hybrid as accepted, keeps unplaced and misapplied names as listed, and offers nothing when two names share an epithet and point apart.
- Avery 8257 is printable, on the grid from the published Avery 6870 dimensions table. The content box inside each label is a LabelLeaf design choice. A print on a real 8257 sheet is still to do.

## Waiting on Lotus

- Cultivar register data. src/data/cultivars.json is empty. The only sourced register so far is the Hoya cultivar register at hoyacultivars.org (edited by Rachel Conroy). It goes in once its list can be obtained in usable form. Nothing is invented.
- Empty private repo HydraCoreSystems/labelleaf with push access. Blocked on Phil reconnecting GitHub. Commits stay local until then.
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
