import { NUMERIC, idLike, alignOf } from "@report-builder/shared";
import { xesc, lit, inch, guid, rdlIdent } from "./xml.js";
import { NET_TYPE, NET_DATE, THEME_RDL, DENSITY_RDL, netFormat, colWidth } from "./styles.js";
import { textbox } from "./textbox.js";
import { buildFilters } from "./filters.js";

const DATASET = "MainDataSet";
const DATASOURCE = "MainDataSource";

/** Returns a message if the export settings are incomplete, otherwise "". */
export function validateExport(exp) {
  if (exp.dsMode === "shared") return exp.dsRef.trim() ? "" : "Enter the shared data source path to export.";
  return exp.server.trim() && exp.database.trim() ? "" : "Enter the server and database to export.";
}

/** Things in the query that would break or misbehave in SSRS. */
export function exportWarnings(columns) {
  const w = [];
  columns.forEach((c) => {
    if (c.unnamed) w.push(`Column ${c.name.replace(/^Column/, "")} has no name. Add AS column_name in the query so SSRS can match it to a field.`);
    if (c.dup) w.push(`Two columns are named “${c.name.replace(/_\d+$/, "")}”. Give them different aliases in the query; SSRS needs unique field names.`);
  });
  return w;
}

/**
 * Builds the complete .rdl XML.
 * @param {object} a { sql, columns, effCols, tpl, title, desc, filters, colsByKey, sort, exp }
 */
export function buildRdl({ sql, columns, effCols, tpl, title, desc, filters, colsByKey, sort, exp }) {
  const v2016 = exp.schema !== "2010";
  const fieldOf = {};
  const fieldNames = new Set();
  columns.forEach((c) => { fieldOf[c.key] = rdlIdent(c.name, fieldNames); });
  const itemNames = new Set();
  const nm = (s) => rdlIdent(s, itemNames);

  const th = THEME_RDL[tpl.theme] || THEME_RDL.ledger;
  const dn = DENSITY_RDL[tpl.density] || DENSITY_RDL.normal;
  const portrait = exp.orientation === "portrait";
  const pageW = portrait ? 8.5 : 11, pageH = portrait ? 11 : 8.5, usable = pageW - 1;

  // ----- columns and widths
  const tcols = [];
  if (tpl.rowNumbers) tcols.push({ rn: true, width: 0.45 });
  effCols.forEach((c) => tcols.push({ c, width: colWidth(c) }));
  let tableW = tcols.reduce((a, t) => a + t.width, 0);
  if (tpl.layout === "fit") { const k = usable / tableW; tcols.forEach((t) => (t.width *= k)); tableW = usable; }
  const headerW = Math.min(usable, Math.max(tableW, 4));
  const sectionW = Math.max(tableW, headerW);
  const footW = Math.min(usable, sectionW);

  const align = (c) => ({ left: "Left", right: "Right", center: "Center" })[alignOf(c)];
  const zebra = tpl.zebra ? `=IIF(RowNumber(Nothing) Mod 2 = 0, "${th.zebra}", "White")` : null;
  const rowLine = { color: "#E6EAF0", width: "0.75pt" };

  // ----- totals
  const totals = tpl.totals
    ? Object.fromEntries(effCols.filter((c) => NUMERIC.has(c.type) && !idLike(c.name)).map((c) => [c.key, c.type === "Percentage" ? "Avg" : "Sum"]))
    : {};
  const hasTotals = Object.keys(totals).length > 0;
  const labelIdx = tcols.findIndex((t) => !t.rn && !totals[t.c.key]);
  const totalLabelAt = labelIdx >= 0 ? labelIdx : tpl.rowNumbers ? 0 : -1;

  // ----- table cells
  const headCells = tcols.map((t) => textbox({
    name: nm(t.rn ? "hdr_RowNum" : `hdr_${fieldOf[t.c.key]}`),
    value: t.rn ? "#" : lit(t.c.label),
    bold: true, size: dn.size, color: th.headColor, bg: th.headBg,
    bottom: th.headBorder ? { color: th.headBorder, width: "2pt" } : null,
    align: t.rn ? "Right" : align(t.c), pad: dn.pad, valign: "Bottom",
    userSort: t.rn ? null : `=Fields!${fieldOf[t.c.key]}.Value`,
  }));

  const detailCells = tcols.map((t) => {
    if (t.rn) return textbox({ name: nm("RowNum"), value: "=RowNumber(Nothing)", size: dn.size, color: "#7A859A", align: "Right", pad: dn.pad, bg: zebra, bottom: rowLine, valign: "Top" });
    const c = t.c, F = fieldOf[c.key];
    const value = c.type === "Boolean"
      ? `=IIF(IsNothing(Fields!${F}.Value), "", IIF(CBool(Fields!${F}.Value), "Yes", "No"))`
      : `=Fields!${F}.Value`;
    return textbox({ name: nm(`val_${F}`), value, fmt: netFormat(c, tpl), size: dn.size, align: align(c), pad: dn.pad, bg: zebra, bottom: rowLine, valign: "Top" });
  });

  const totalCells = tcols.map((t, i) => {
    const base = { size: dn.size, bold: true, pad: dn.pad, bg: "#EEF1F6", top: { color: "#18233A", width: "1.5pt" } };
    if (!t.rn && totals[t.c.key]) {
      const F = fieldOf[t.c.key];
      return textbox({ ...base, name: nm(`tot_${F}`), value: `=${totals[t.c.key]}(Fields!${F}.Value)`, fmt: netFormat(t.c, tpl), align: align(t.c) });
    }
    return textbox({ ...base, name: nm(`tot_label_${i + 1}`), value: i === totalLabelAt ? "Total" : "", align: t.rn ? "Right" : "Left" });
  });

  const fl = buildFilters(filters, colsByKey, fieldOf, exp.filterMode, tpl);

  // ----- header block above the table
  let y = 0;
  const head = [];
  const block = (name, value, height, extra = {}) => {
    head.push(textbox({ name: nm(name), value, pad: 2, pos: { top: y, left: 0, height, width: headerW }, ...extra }));
    y += height + 0.03;
  };
  if (tpl.org) block("OrgName", lit(tpl.org), 0.25, { size: 10, bold: true, color: "#4A566E" });
  block("ReportTitle", lit(title || "Report"), 0.42, { size: 18, bold: true, color: "#18233A", left: tpl.theme === "contrast" ? { color: "#2D4FD6", width: "4pt" } : null });
  if (desc) block("ReportDescription", lit(desc), 0.26, { size: 10, color: "#4A566E" });
  if (fl.summary.length) block("FilterSummary", lit("Filters: " + fl.summary.join("; ")), 0.24, { size: 9, color: "#2340B0" });
  block("ReportMeta",
    `="Generated " & Format(Globals!ExecutionTime, "${NET_DATE[tpl.dateFormat]}") & "     " & CountRows("${DATASET}") & " rows"`,
    0.26, { size: 9, color: "#7A859A", bottom: tpl.theme === "ledger" ? { color: "#18233A", width: "2.25pt" } : null });
  y += 0.12;

  // ----- tablix
  const row = (h, cells) =>
    `<TablixRow><Height>${inch(h)}</Height><TablixCells>${cells.map((x) => `<TablixCell><CellContents>${x}</CellContents></TablixCell>`).join("")}</TablixCells></TablixRow>`;
  const sortXml = sort && fieldOf[sort.key] && colsByKey[sort.key]
    ? `<SortExpressions><SortExpression><Value>=Fields!${fieldOf[sort.key]}.Value</Value>${sort.dir === "desc" ? "<Direction>Descending</Direction>" : ""}</SortExpression></SortExpressions>`
    : "";
  const freezeFirst = tpl.layout === "expand" && tpl.stickyFirst;
  const tablixH = 0.32 + dn.h + (hasTotals ? dn.h : 0);

  const tablix = `<Tablix Name="${nm("ReportTable")}">
<TablixBody>
<TablixColumns>${tcols.map((t) => `<TablixColumn><Width>${inch(t.width)}</Width></TablixColumn>`).join("")}</TablixColumns>
<TablixRows>${row(0.32, headCells)}${row(dn.h, detailCells)}${hasTotals ? row(dn.h, totalCells) : ""}</TablixRows>
</TablixBody>
<TablixColumnHierarchy><TablixMembers>${tcols.map((_, i) => (i === 0 && freezeFirst ? "<TablixMember><FixedData>true</FixedData></TablixMember>" : "<TablixMember />")).join("")}</TablixMembers></TablixColumnHierarchy>
<TablixRowHierarchy><TablixMembers>
<TablixMember><FixedData>true</FixedData><KeepWithGroup>After</KeepWithGroup><RepeatOnNewPage>true</RepeatOnNewPage></TablixMember>
<TablixMember><Group Name="Details" />${sortXml}</TablixMember>
${hasTotals ? "<TablixMember><KeepWithGroup>Before</KeepWithGroup></TablixMember>" : ""}
</TablixMembers></TablixRowHierarchy>
<DataSetName>${DATASET}</DataSetName>
<NoRowsMessage>No rows match this report's filters.</NoRowsMessage>
<Top>${inch(y)}</Top><Left>0in</Left><Height>${inch(tablixH)}</Height><Width>${inch(tableW)}</Width>
<Style><Border><Style>None</Style></Border></Style>
</Tablix>`;
  const bodyH = y + tablixH + 0.1;

  // ----- page
  const footer = `<PageFooter><Height>0.35in</Height><PrintOnFirstPage>true</PrintOnFirstPage><PrintOnLastPage>true</PrintOnLastPage><ReportItems>
${tpl.footer ? textbox({ name: nm("FooterNote"), value: lit(tpl.footer), size: 8, color: "#4A566E", pad: 2, pos: { top: 0.08, left: 0, height: 0.22, width: Math.max(footW - 1.7, 1) } }) : ""}
${textbox({ name: nm("PageNumber"), value: `="Page " & Globals!PageNumber & " of " & Globals!TotalPages`, size: 8, color: "#7A859A", align: "Right", pad: 2, pos: { top: 0.08, left: Math.max(footW - 1.6, 0), height: 0.22, width: 1.6 } })}
</ReportItems><Style><Border><Style>None</Style></Border></Style></PageFooter>`;
  const page = `<Page>${footer}<PageHeight>${inch(pageH)}</PageHeight><PageWidth>${inch(pageW)}</PageWidth><LeftMargin>0.5in</LeftMargin><RightMargin>0.5in</RightMargin><TopMargin>0.5in</TopMargin><BottomMargin>0.5in</BottomMargin><Style /></Page>`;
  const body = `<Body><ReportItems>${head.join("")}${tablix}</ReportItems><Height>${inch(bodyH)}</Height><Style /></Body>`;

  // ----- data
  // Credentials are never written into the file. With a SQL login, SSRS asks for them
  // to be stored on the report server after upload (Manage > Data sources).
  const integrated = exp.dsAuth !== "sql";
  const dataSource = exp.dsMode === "shared"
    ? `<DataSourceReference>${xesc(exp.dsRef.trim())}</DataSourceReference>`
    : `<ConnectionProperties><DataProvider>SQL</DataProvider><ConnectString>${xesc(`Data Source=${exp.server.trim()};Initial Catalog=${exp.database.trim()}`)}</ConnectString>${integrated ? "<IntegratedSecurity>true</IntegratedSecurity>" : ""}</ConnectionProperties><rd:SecurityType>${integrated ? "Integrated" : "DataBase"}</rd:SecurityType>`;
  const fieldsXml = columns.map((c) => `<Field Name="${fieldOf[c.key]}"><DataField>${xesc(c.name)}</DataField><rd:TypeName>${NET_TYPE[c.type]}</rd:TypeName></Field>`).join("\n");
  const filtersXml = fl.filters.length
    ? `<Filters>${fl.filters.map((f) => `<Filter><FilterExpression>${xesc(f.expr)}</FilterExpression><Operator>${f.op}</Operator><FilterValues>${f.values.map((v) => `<FilterValue>${xesc(v)}</FilterValue>`).join("")}</FilterValues></Filter>`).join("")}</Filters>`
    : "";

  const paramsXml = fl.params.length
    ? `<ReportParameters>${fl.params.map((p) => `<ReportParameter Name="${p.name}"><DataType>${p.dataType}</DataType><DefaultValue><Values><Value>${xesc(p.def)}</Value></Values></DefaultValue>${p.dataType === "String" ? "<AllowBlank>true</AllowBlank>" : ""}<Prompt>${xesc(p.prompt)}</Prompt></ReportParameter>`).join("")}</ReportParameters>`
    : "";
  const paramsLayoutXml = fl.params.length && v2016
    ? `<ReportParametersLayout><GridLayoutDefinition><NumberOfColumns>4</NumberOfColumns><NumberOfRows>${Math.ceil(fl.params.length / 4)}</NumberOfRows><CellDefinitions>${fl.params.map((p, i) => `<CellDefinition><ColumnIndex>${i % 4}</ColumnIndex><RowIndex>${Math.floor(i / 4)}</RowIndex><ParameterName>${p.name}</ParameterName></CellDefinition>`).join("")}</CellDefinitions></GridLayoutDefinition></ReportParametersLayout>`
    : "";

  const ns = v2016
    ? "http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition"
    : "http://schemas.microsoft.com/sqlserver/reporting/2010/01/reportdefinition";
  const layout = v2016
    ? `<ReportSections><ReportSection>${body}<Width>${inch(sectionW)}</Width>${page}</ReportSection></ReportSections>`
    : `${body}<Width>${inch(sectionW)}</Width>${page}`;

  return `<?xml version="1.0" encoding="utf-8"?>
<Report xmlns="${ns}" xmlns:rd="http://schemas.microsoft.com/SQLServer/reporting/reportdesigner">
<AutoRefresh>0</AutoRefresh>
<DataSources><DataSource Name="${DATASOURCE}">${dataSource}<rd:DataSourceID>${guid()}</rd:DataSourceID></DataSource></DataSources>
<DataSets><DataSet Name="${DATASET}">
<Query><DataSourceName>${DATASOURCE}</DataSourceName><CommandText>${xesc(sql.trim().replace(/;\s*$/, ""))}</CommandText></Query>
<Fields>
${fieldsXml}
</Fields>
${filtersXml}
</DataSet></DataSets>
${layout}
${paramsXml}
${paramsLayoutXml}
<rd:ReportUnitType>Inch</rd:ReportUnitType>
<rd:ReportID>${guid()}</rd:ReportID>
</Report>
`;
}
