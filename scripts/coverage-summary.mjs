// Affiche un récapitulatif de couverture lisible dans la sortie CI
// et l'ajoute au résumé de job GitHub Actions.
import { readFileSync, appendFileSync, existsSync } from "node:fs";

const file = "coverage/coverage-summary.json";

if (!existsSync(file)) {
  const msg = "Aucun rapport de couverture trouvé (coverage/coverage-summary.json).";
  console.log(msg);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, msg + "\n");
  }
  process.exit(0);
}

const total = JSON.parse(readFileSync(file, "utf8")).total;

const labels = {
  lines: "Lignes",
  statements: "Instructions",
  functions: "Fonctions",
  branches: "Branches",
};

const rows = Object.entries(labels).map(([key, label]) => {
  const m = total[key] ?? { pct: 0, covered: 0, total: 0 };
  return `| ${label} | ${m.pct}% | ${m.covered}/${m.total} |`;
});

const md = [
  "## Couverture de tests",
  "",
  "| Métrique | Couverture | Couvert / Total |",
  "| --- | --- | --- |",
  ...rows,
  "",
].join("\n");

console.log(md);

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
}
