// verdicts.mjs: the fixed verdict vocabulary (decided before any run) and the table renderer.
export const VERDICTS = ["confirmed defect", "confirmed, out of contract", "refuted", "needs owner decision"];
const esc = (s) => String(s).replaceAll("|", "\\|").replaceAll("\n", " ");
export function table(rows) {
  const head = "| id | repo | anchor | verdict | observed | contract judged against |\n|---|---|---|---|---|---|\n";
  return head + rows.map((r) => `| ${esc(r.id)} | ${esc(r.repo)} | ${esc(r.anchor)} | ${esc(r.verdict)} | ${esc(r.observed)} | ${esc(r.contract)} |`).join("\n") + "\n";
}
