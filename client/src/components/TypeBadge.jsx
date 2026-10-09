import { family } from "@report-builder/shared";

export default function TypeBadge({ type, showType = false }) {
  const fam = family(type);
  return <span className={`tb tb-${fam}`}>{showType ? type : fam}</span>;
}
