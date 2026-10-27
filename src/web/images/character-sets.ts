// Ordered dark to light by convention, not calibrated glyph coverage.
// Braille and quadrants are character ramps, not spatial sub-cell renderers.
export function getCharacterSets(classicRamp: string) {
  return [
    {
      name: "Classic",
      sets: [
        { name: "Standard", ramp: "@#$08Xx+:. " },
        { name: "Classic ASCII", ramp: classicRamp },
        { name: "Ink", ramp: "@&$%#?*+:. " },
        { name: "Minimal", ramp: "█▪ " },
        { name: "Forensic", ramp: "@#*+=-:. " }
      ]
    },
    {
      name: "Blocks",
      sets: [
        { name: "Blocks", ramp: "█▓▒░ " },
        { name: "Bars", ramp: "█▇▆▅▄▃▂▁ " },
        { name: "Quadrants", ramp: "█▙▛▜▟▀▄▌▐▘▝▖▗ " },
        { name: "Braille", ramp: "⣿⣷⣯⣟⡿⢿⣻⣽⣾⣶⣤⣀⠠⠄ " }
      ]
    },
    {
      name: "Coded",
      sets: [
        { name: "Numeric", ramp: "8069453210 " },
        { name: "Binary", ramp: "10 " },
        { name: "Hacker", ramp: "@#10Xx*+:. " },
        { name: "Alpha", ramp: "WMBHAXKOxvi:. " }
      ]
    },
    {
      name: "Glyphs",
      sets: [
        { name: "Dots", ramp: "●◕◐◔○∙·. " },
        { name: "Geometric", ramp: "█◆■▲▼◇△▽. " },
        { name: "Math", ramp: "#ΣΔΨΩ×÷+−· " },
        { name: "Katakana", ramp: "ムミヒリツソノ:. " }
      ]
    }
  ];
}
