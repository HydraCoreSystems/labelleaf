// The LabelLeaf mark: a plant label tag, tilted a little, with one leaf rising
// from its center and one gold vein. One drawing, used in the app (icons.tsx)
// and for the app icon, splash, and favicon (scripts/build-assets.ts).
// All numbers are in a 100 by 100 box.

export const MARK = {
  /** The tag, a rounded rectangle wider than it is tall. */
  tag: { x: 8, y: 24, width: 84, height: 54, radius: 11 },
  /** Tilt in degrees around the center of the box. */
  tilt: -6,
  tiltCenter: { x: 50, y: 51 },
  /** The leaf, base at the bottom center, tip rising toward the top of the tag. */
  leafPath: "M50 69 C33 57 35 40 50 29 C65 40 67 57 50 69 Z",
  /** The vein, a single gold line up the leaf. */
  veinPath: "M50 67 L50 37",
  lineWidth: 3.6,
  veinWidth: 2.4,
} as const;
