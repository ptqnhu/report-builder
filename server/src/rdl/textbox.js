import { xesc, inch } from "./xml.js";

/** <Style> for one run of text. */
function runStyle(r) {
  return `<FontFamily>Segoe UI</FontFamily><FontSize>${r.size || 10}pt</FontSize>` +
    (r.bold ? "<FontWeight>Bold</FontWeight>" : "") +
    (r.color ? `<Color>${xesc(r.color)}</Color>` : "") +
    (r.fmt ? `<Format>${xesc(r.fmt)}</Format>` : "");
}

/**
 * Builds an RDL <Textbox>. Options: name, value, fmt, size, bold, color, align, bg,
 * top/bottom/left borders ({color,width}), pad, valign, userSort, pos ({top,left,height,width}).
 * runs: [{ value, size, bold, color, fmt }] puts several differently styled pieces of text in one line
 * (e.g. a gold label and a white value); when given, it replaces value/fmt/size/bold/color.
 */
export function textbox(o) {
  const p = o.pad ?? 4;
  const border = (side, b) => (b ? `<${side}><Color>${b.color}</Color><Style>Solid</Style><Width>${b.width}</Width></${side}>` : "");
  const runs = o.runs || [{ value: o.value, size: o.size, bold: o.bold, color: o.color, fmt: o.fmt }];
  const boxStyle =
    "<Border><Style>None</Style></Border>" +
    border("TopBorder", o.top) + border("BottomBorder", o.bottom) + border("LeftBorder", o.left) +
    (o.bg ? `<BackgroundColor>${xesc(o.bg)}</BackgroundColor>` : "") +
    `<VerticalAlign>${o.valign || "Middle"}</VerticalAlign>` +
    `<PaddingLeft>${o.left ? p + 6 : p}pt</PaddingLeft><PaddingRight>${p}pt</PaddingRight><PaddingTop>${p}pt</PaddingTop><PaddingBottom>${p}pt</PaddingBottom>`;

  return `<Textbox Name="${o.name}">
<CanGrow>true</CanGrow>
<KeepTogether>true</KeepTogether>
<Paragraphs><Paragraph><TextRuns>${runs.map((r) => `<TextRun><Value>${xesc(r.value)}</Value><Style>${runStyle(r)}</Style></TextRun>`).join("")}</TextRuns><Style>${o.align ? `<TextAlign>${o.align}</TextAlign>` : ""}</Style></Paragraph></Paragraphs>
<rd:DefaultName>${o.name}</rd:DefaultName>
${o.userSort ? `<UserSort><SortExpression>${xesc(o.userSort)}</SortExpression></UserSort>` : ""}
${o.pos ? `<Top>${inch(o.pos.top)}</Top><Left>${inch(o.pos.left)}</Left><Height>${inch(o.pos.height)}</Height><Width>${inch(o.pos.width)}</Width>` : ""}
<Style>${boxStyle}</Style>
</Textbox>`;
}
