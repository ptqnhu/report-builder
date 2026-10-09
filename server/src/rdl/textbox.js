import { xesc, inch } from "./xml.js";

/**
 * Builds an RDL <Textbox>. Options: name, value, fmt, size, bold, color, align, bg,
 * top/bottom/left borders ({color,width}), pad, valign, userSort, pos ({top,left,height,width}).
 */
export function textbox(o) {
  const p = o.pad ?? 4;
  const border = (side, b) => (b ? `<${side}><Color>${b.color}</Color><Style>Solid</Style><Width>${b.width}</Width></${side}>` : "");
  const runStyle =
    `<FontFamily>Segoe UI</FontFamily><FontSize>${o.size || 10}pt</FontSize>` +
    (o.bold ? "<FontWeight>Bold</FontWeight>" : "") +
    (o.color ? `<Color>${xesc(o.color)}</Color>` : "") +
    (o.fmt ? `<Format>${xesc(o.fmt)}</Format>` : "");
  const boxStyle =
    "<Border><Style>None</Style></Border>" +
    border("TopBorder", o.top) + border("BottomBorder", o.bottom) + border("LeftBorder", o.left) +
    (o.bg ? `<BackgroundColor>${xesc(o.bg)}</BackgroundColor>` : "") +
    `<VerticalAlign>${o.valign || "Middle"}</VerticalAlign>` +
    `<PaddingLeft>${o.left ? p + 6 : p}pt</PaddingLeft><PaddingRight>${p}pt</PaddingRight><PaddingTop>${p}pt</PaddingTop><PaddingBottom>${p}pt</PaddingBottom>`;

  return `<Textbox Name="${o.name}">
<CanGrow>true</CanGrow>
<KeepTogether>true</KeepTogether>
<Paragraphs><Paragraph><TextRuns><TextRun><Value>${xesc(o.value)}</Value><Style>${runStyle}</Style></TextRun></TextRuns><Style>${o.align ? `<TextAlign>${o.align}</TextAlign>` : ""}</Style></Paragraph></Paragraphs>
<rd:DefaultName>${o.name}</rd:DefaultName>
${o.userSort ? `<UserSort><SortExpression>${xesc(o.userSort)}</SortExpression></UserSort>` : ""}
${o.pos ? `<Top>${inch(o.pos.top)}</Top><Left>${inch(o.pos.left)}</Left><Height>${inch(o.pos.height)}</Height><Width>${inch(o.pos.width)}</Width>` : ""}
<Style>${boxStyle}</Style>
</Textbox>`;
}
