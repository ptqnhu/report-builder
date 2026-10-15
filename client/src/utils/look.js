// Inline styles for the template's changes to parts of the report (tpl.look and tpl.types, see shared/look.js).
// Only what the template sets is applied; everything else keeps the style's own CSS. Sizes are in points, as in SSRS.

/** Text colour, size and weight from a part's or data type's settings. */
export function textStyle(o = {}) {
  const s = {};
  if (o.color) s.color = o.color;
  if (o.size) s.fontSize = `${o.size}pt`;
  if (o.bold !== undefined) s.fontWeight = o.bold ? 700 : 400;
  return s;
}

/** The template's settings for one part of the report, or {}. */
export const part = (tpl, name) => tpl.look?.[name] || {};
