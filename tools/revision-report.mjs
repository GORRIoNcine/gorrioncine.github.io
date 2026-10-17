#!/usr/bin/env node
/* Une reports/links.json y reports/lighthouse.json en reports/resumen.md y anota problemas=N en GITHUB_OUTPUT. */
import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
const rd = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null);
const L = rd("reports/links.json"), H = rd("reports/lighthouse.json");
const nl = L ? L.problemas || 0 : 0, nh = H ? H.problemas || 0 : 0, total = nl + nh;
const part = (f) => (existsSync(f) ? readFileSync(f, "utf8") : "");
const fecha = new Date().toLocaleDateString("es-ES", { timeZone: "America/Havana", dateStyle: "long" });
const md = [`# Revisión semanal · ${fecha}`, "", total ? `Se encontraron **${total}** cosas por revisar (${nl} de enlaces, ${nh} de velocidad).` : "✅ Todo en orden: sin enlaces rotos y con buena velocidad.", "", part("reports/links.md"), "", part("reports/lighthouse.md"), "", "_Informes completos: sección «Artifacts» de la ejecución en Actions._"].join("\n");
writeFileSync("reports/resumen.md", md + "\n");
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `problemas=${total}\n`);
console.log(md.slice(0, 1500));
