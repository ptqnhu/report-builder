// Line art for the LoanMart header band: "LM" drawn as one continuous rounded line (the L comes down from the top
// edge, turns into the two arches of the M, then bends down out of the band like a road), plus a frame line that
// enters from the top and leaves at the bottom. Soft light green, low opacity, so it sits quietly in the band.
// Placed to the right of the title: as tall as the band, its right edge at
// BAND_LINES_RIGHT of the band's width. The preview draws it as SVG (ReportDocument.jsx); the .rdl gets it baked into
// the band's background image (server/src/rdl/bandImage.js). Both read the paths and colour from here.

export const BAND_LINES_SIZE = { w: 380, h: 120 }; // drawing units (px at 1x)
export const BAND_LINES_RIGHT = 0.72;

export const BAND_LINES_PATHS = [
  // L, then M (arch, valley, arch), then the road bending down out of the band
  "M36 -10V78A18 18 0 0 0 54 96H110A18 18 0 0 0 128 78V44A18 18 0 0 1 164 44V56A18 18 0 0 0 200 56V44A18 18 0 0 1 236 44V78A18 18 0 0 0 254 96H322A18 18 0 0 1 340 114V132",
  // frame line: in from the top, along the top, down the right side and out
  "M70 -10V-2A14 14 0 0 0 84 12H352A22 22 0 0 1 374 34V132",
];

/** The colour of the lines: light green at low opacity, so they blend into the band. Edit here. */
export const BAND_LINES_STROKE = { color: "#8FD3A8", opacity: 0.3, width: 2.4 };
