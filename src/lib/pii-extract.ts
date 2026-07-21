/**
 * Configurable PII field extraction.
 *
 * Field definitions live in data/pii-fields.json — add an entry there to
 * extract a new PII field; no code change is required. The file is read on
 * every request, so config edits take effect immediately in dev.
 *
 * Confidence rules:
 *  - a field with a valuePattern gets "high" if the value matches, "low" if not
 *  - a field without a valuePattern gets "medium" (a human should verify it)
 */

import fs from "fs";
import path from "path";
import type { ExtractedEvidenceField } from "@/types";

export interface PiiFieldDef {
  key: string;
  label: string;
  aliases: string[];
  valuePattern?: string;
  stopBefore?: string[];
  enabled: boolean;
}

const CONFIG_PATH = path.join(process.cwd(), "data", "pii-fields.json");

export function loadPiiFieldDefs(): PiiFieldDef[] {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as { pii_fields?: PiiFieldDef[] };
    return (parsed.pii_fields ?? []).filter((f) => f.enabled);
  } catch (err) {
    console.error("[pii-extract] Failed to load pii-fields.json:", err);
    return [];
  }
}

/**
 * Re-join words the PDF text layer broke across lines
 * ("Customer Reference N\number" → "Customer Reference Number").
 * A line ending in a letter followed by a line starting with a lowercase
 * letter is treated as a mid-word wrap.
 */
export function rejoinWrappedLines(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // "(?!o\s)" keeps lowercase "o " bullet-list markers on their own line
    .replace(/([A-Za-z])\n(?!o\s)([a-z])/g, "$1$2");
}

/** Cut the captured value at the first stop token (e.g. a trailing "Tel: …"). */
function truncateAtStops(value: string, stops: string[]): string {
  let out = value;
  for (const stop of stops) {
    const i = out.toLowerCase().indexOf(stop.toLowerCase());
    if (i !== -1) out = out.slice(0, i);
  }
  return out.trim();
}

/**
 * Extract the configured PII fields from raw document text.
 * For each field, aliases are tried longest-first; the value is the remainder
 * of the matched line, or the next non-empty line when the label sits alone.
 */
export function extractPiiFields(rawText: string): ExtractedEvidenceField[] {
  if (!rawText || rawText.trim().length === 0) return [];

  const defs = loadPiiFieldDefs();
  if (defs.length === 0) return [];

  const text = rejoinWrappedLines(rawText).replace(/[ \t]{2,}/g, " ");
  const lines = text.split("\n").map((l) => l.trim());

  const fields: ExtractedEvidenceField[] = [];

  for (const def of defs) {
    const aliases = [...def.aliases].sort((a, b) => b.length - a.length);
    let value = "";

    outer: for (const alias of aliases) {
      const aliasLower = alias.toLowerCase();
      for (let i = 0; i < lines.length; i++) {
        const idx = lines[i].toLowerCase().indexOf(aliasLower);
        if (idx === -1) continue;

        let rest = lines[i]
          .slice(idx + alias.length)
          .replace(/^[\s:.\-–]+/, "")
          .trim();

        if (!rest) {
          for (let j = i + 1; j < lines.length; j++) {
            if (lines[j]) {
              rest = lines[j];
              break;
            }
          }
        }

        rest = truncateAtStops(rest, def.stopBefore ?? []);
        if (rest) {
          value = rest;
          break outer;
        }
      }
    }

    if (!value) continue;

    let confidence: "high" | "medium" | "low" = "medium";
    if (def.valuePattern) {
      confidence = new RegExp(def.valuePattern).test(value) ? "high" : "low";
    }

    fields.push({
      key: def.key,
      label: def.label,
      value,
      confidence,
      pii: true,
    });
  }

  return fields;
}
