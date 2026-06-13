import fs from "node:fs";
import { getSettingsPath } from "./paths";
import { DEFAULT_MODEL, isModelChoice, type ModelChoice } from "@/lib/agent/models";

/** アプリ全体の設定（settings.json） */
export type AppSettings = {
  /** AIに送信する際のモデル */
  model: ModelChoice;
};

const DEFAULTS: AppSettings = {
  model: DEFAULT_MODEL,
};

export function readSettings(): AppSettings {
  const file = getSettingsPath();
  if (!fs.existsSync(file)) return { ...DEFAULTS };
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    return {
      model: isModelChoice(parsed?.model) ? parsed.model : DEFAULTS.model,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const current = readSettings();
  const next: AppSettings = {
    model: isModelChoice(patch.model) ? patch.model : current.model,
  };
  fs.writeFileSync(getSettingsPath(), JSON.stringify(next, null, 2));
  return next;
}
