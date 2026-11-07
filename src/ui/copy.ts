// Every word the grower reads in the app. House rules: plain words, short
// sentences, US spelling, and no dash or hyphen characters. A test reads this
// whole file's output and fails if a dash slips in.

export const COPY = {
  appName: "LabelLeaf",

  queue: {
    title: "Your labels",
    empty: "No labels yet. Tap Add a name to start.",
    emptyTitle: "Your bench is clear",
    reorder: "Drag to reorder",
    moveTitle: "Move this label",
    moveUp: "Move up",
    moveDown: "Move down",
    add: "Add a name",
    print: "Print labels",
    export: "Export spreadsheet",
    clear: "Clear all",
    clearTitle: "Clear all labels?",
    clearBody: "This removes every label from the list. It cannot be undone.",
    cancel: "Cancel",
    settings: "Settings",
    edit: "Edit",
    cuttings: "Cuttings",
    up: "Up",
    down: "Down",
    remove: "Remove",
    count: (n: number) => (n === 1 ? "1 label" : `${n} labels`),
    exportFailed: "The spreadsheet could not be shared. Try again.",
    tooLongOne: "Too long for the label. Shorten the name.",
    tooLongMany: (n: number) => `${n} labels are too long. Look for the red note.`,
    exportTitle: "LabelLeaf labels",
  },

  add: {
    titleNew: "Add a name",
    titleEdit: "Edit a name",
    prompt: "Type the plant name",
    placeholder: "hoya carnosa krimson queen",
    help: "Type it your way. Pick a suggestion, or keep it exactly as you typed it.",
    suggestions: "Suggestions",
    keep: "Keep exactly as typed",
    nothing: "Start typing to see suggestions.",
    save: "Save",
    keepNote: "You can always keep a name exactly as you typed it.",
    removeFromList: "Remove from list",
    previewTitle: "How it will look",
  },

  badge: {
    format: "Format",
    kew: "Kew",
    cultivar: "Cultivar register",
  },

  cuttings: {
    title: "Add cuttings",
    howMany: "How many cuttings",
    startAt: "First mark number",
    help: "Each cutting gets its own label with its own mark, like C08.",
    add: "Add labels",
    fewer: "Fewer",
    more: "More",
    lower: "Lower",
    higher: "Higher",
    chipCaption: (count: number, last: string | number) =>
      count === 1 ? `1 label. Its mark is ${last}.` : `${count} labels. The last mark is ${last}.`,
    marks: (first: number, last: number) => {
      const m = (n: number) => `C${String(n).padStart(2, "0")}`;
      return first === last ? `This makes ${m(first)}.` : `This makes ${m(first)} to ${m(last)}.`;
    },
  },

  print: {
    title: "Print",
    template: "Label sheet",
    notReady: "Not ready to print yet. This sheet's layout has not been set up. Pick another sheet.",
    start: "Where to start on the sheet",
    startHelp: "Tap the first free slot. Slots before it stay blank.",
    whole: "Whole list",
    one: "One label",
    pickOne: "Tap the label to print",
    plan: (count: number, start: number, blanks: number) =>
      blanks === 0
        ? `${count} ${count === 1 ? "label" : "labels"}, starting at slot ${start}.`
        : `${count} ${count === 1 ? "label" : "labels"}, starting at slot ${start}. ${blanks} ${blanks === 1 ? "slot stays" : "slots stay"} blank.`,
    legendBlank: "Blank",
    legendFill: "Prints",
    legendEmpty: "Unused",
    button: "Print",
    working: "Making your sheet",
    noLabels: "Add a name first.",
    failed: "Printing did not start. Try again.",
    tipTitle: "Before you print",
    tip: "Load the label sheet with the sticky side where your printer expects it. If labels land off center, use Calibrate.",
    // Each part is [words, bold].
    actualSize: [
      ["Print at ", false],
      ["100 percent", true],
      [". Choose ", false],
      ["Actual Size", true],
      [" and turn off Fit to Page.", false],
    ] as readonly (readonly [string, boolean])[],
    calibrate: "Calibrate",
  },

  calibrate: {
    title: "Calibrate",
    intro: "Print the test sheet on plain paper. Hold it against a label sheet to the light. Each cross should sit in the middle of a label.",
    step1: "Print the test sheet.",
    step2: "If a cross sits off center, tap the buttons to move it toward the middle of the label.",
    step3: "Print again until they land in the middle. LabelLeaf remembers your numbers.",
    printTest: "Print test sheet",
    reset: "Go back to the starting numbers",
    sideways: "Sideways",
    vertical: "Up and down",
    moveLeft: "Move left",
    moveRight: "Move right",
    moveUp: "Move up",
    moveDown: "Move down",
    current: "Where the crosses are now",
    axes: "Left and right move it sideways. Up and down move it up and down.",
    steps: "Three steps",
    heading: "LabelLeaf test sheet",
    notReady: "This sheet cannot print yet, so it cannot be calibrated. Pick another sheet in Print.",
    failed: "The test sheet did not start. Try again.",
  },

  settings: {
    title: "Settings",
    benchTitle: "Your bench",
    usualGenus: "Your usual genus",
    usualGenusHelp: "Optional. When you type just a species, LabelLeaf suggests this genus. It never adds it for you.",
    usualGenusPlaceholder: "For example, Hoya",
    guidanceTitle: "Which labels to use",
    guidance: "Paper labels are for dry benches and sale day. Wet benches want weatherproof label stock.",
    dataTitle: "Name checking",
    kewNone: "Kew names are not loaded yet. Names stay as you type them.",
    kewSome: (genera: string[], version: string | null) =>
      `Kew names are loaded for ${genera.join(", ")}${version ? `. Version ${version}.` : "."}`,
    kewVersion: (version: string | null) => (version ? `Kew names version: ${version}.` : "Kew names are not loaded yet."),
    registerNone: "Cultivar registers are not loaded yet.",
    registerSome: (genera: string[]) => `Cultivar registers are loaded for ${genera.join(", ")}.`,
    privacy: "Everything stays on this phone. There is no account and no server.",
  },

  offers: {
    nothing: "No suggestions yet.",
  },
} as const;

/** "Right 0.03 in" style words, so no minus sign ever shows. */
export function describeOffset(xIn: number, yIn: number): { sideways: string; vertical: string } {
  const amount = (n: number) => Math.abs(n).toFixed(2);
  const side = xIn === 0 ? "Centered" : `${xIn > 0 ? "Right" : "Left"} ${amount(xIn)} in`;
  const vert = yIn === 0 ? "Centered" : `${yIn > 0 ? "Down" : "Up"} ${amount(yIn)} in`;
  return { sideways: side, vertical: vert };
}

/** Shorter words for the small center tile on the Calibrate screen. */
export function describeOffsetShort(xIn: number, yIn: number): { sideways: string; vertical: string } {
  const amount = (n: number) => Math.abs(n).toFixed(2);
  return {
    sideways: xIn === 0 ? "Centered" : `${xIn > 0 ? "Right" : "Left"} ${amount(xIn)}`,
    vertical: yIn === 0 ? "Centered" : `${yIn > 0 ? "Down" : "Up"} ${amount(yIn)}`,
  };
}
