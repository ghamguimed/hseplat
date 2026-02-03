import * as XLSX from "xlsx";
import type { CountryProfile, Product, ProductRate } from "@/types";

interface ImportResult {
  products: Product[];
  productRates: Record<string, ProductRate>;
}

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const parsePercent = (value: string | number | undefined): { pct: number | null; note?: string } => {
  if (value === undefined || value === null) return { pct: null };
  const raw = String(value).trim();
  if (!raw) return { pct: null };

  const intervalMatch = raw.match(/([0-9]+[\.,]?[0-9]*)\s*%?\s*[-–]\s*([0-9]+[\.,]?[0-9]*)/);
  if (intervalMatch) {
    const minVal = Number(intervalMatch[1].replace(",", "."));
    return { pct: minVal / 100, note: `Interval detected: ${raw}` };
  }

  const numeric = Number(raw.replace("%", "").replace(",", "."));
  if (Number.isNaN(numeric)) return { pct: null };
  return { pct: numeric > 1 ? numeric / 100 : numeric };
};

const normalizeHeader = (value: string): string => value.toLowerCase().replace(/\s+/g, " ");

const getHeaderRowIndex = (rows: unknown[][]): number => {
  return rows.findIndex((row) =>
    row.some((cell) => typeof cell === "string" && cell.toLowerCase().includes("description"))
  );
};

const headerAliases: Record<string, string[]> = {
  description: ["description", "designation", "desc"],
  hsCode: ["hs code", "hs code", "hs", "hs code/hs", "hs code / hs"],
  declaredValue: ["valeur article", "valeur", "prix", "price", "value"],
  dutyPct: ["% de droits", "droits", "droit", "customs duty", "duty"],
  vatPct: ["tva", "vat"],
  extraFees: ["extra fees", "fees", "frais", "charges"]
};

const findColumnIndex = (headers: string[], aliasKey: keyof typeof headerAliases): number => {
  const aliases = headerAliases[aliasKey];
  return headers.findIndex((header) => aliases.some((alias) => header.includes(alias)));
};

export const importUaeXlsx = (arrayBuffer: ArrayBuffer, country: CountryProfile): ImportResult => {
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, blankrows: false }) as unknown[][];

  const headerRowIndex = getHeaderRowIndex(rows);
  if (headerRowIndex === -1) {
    return { products: [], productRates: {} };
  }

  const headerRow = rows[headerRowIndex] as string[];
  const headers = headerRow.map((header) => normalizeHeader(String(header ?? "")));

  const descriptionIndex = findColumnIndex(headers, "description");
  const hsIndex = findColumnIndex(headers, "hsCode");
  const declaredIndex = findColumnIndex(headers, "declaredValue");
  const dutyIndex = findColumnIndex(headers, "dutyPct");
  const vatIndex = findColumnIndex(headers, "vatPct");
  const extraIndex = findColumnIndex(headers, "extraFees");

  const products: Product[] = [];
  const productRates: Record<string, ProductRate> = {};

  rows.slice(headerRowIndex + 1).forEach((row) => {
    const description = String(row[descriptionIndex] ?? "").trim();
    if (!description) return;
    const hsCode = hsIndex >= 0 ? String(row[hsIndex] ?? "").trim() : undefined;
    const declaredValue = declaredIndex >= 0 ? Number(String(row[declaredIndex] ?? "").replace(",", ".")) : undefined;

    const dutyParsed = parsePercent(row[dutyIndex] as string | number | undefined);
    const vatParsed = parsePercent(row[vatIndex] as string | number | undefined);
    const extraFees = extraIndex >= 0 ? Number(String(row[extraIndex] ?? "").replace(",", ".")) : undefined;

    const productId = `${slugify(description)}${hsCode ? `-${hsCode}` : ""}`;

    products.push({
      id: productId,
      label: description,
      hsCode: hsCode || undefined,
      defaultDeclaredValue: Number.isFinite(declaredValue) ? declaredValue : undefined
    });

    productRates[productId] = {
      duty_rate_pct: dutyParsed.pct ?? country.customs.default_duty_rate_pct,
      vat_rate_pct: vatParsed.pct ?? country.customs.default_vat_rate_pct,
      extra_fees_fixed: Number.isFinite(extraFees) ? extraFees : undefined,
      note: dutyParsed.note
    };
  });

  return { products, productRates };
};
