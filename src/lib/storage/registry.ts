import fs from "node:fs";
import { getRegistryPath } from "./paths";

/**
 * registry.json — プロジェクトの登録簿。
 * 一覧表示のために各 project.db を開かずに済むようにするための索引で、
 * 正本は各プロジェクトの project.db 側にある。
 */
export type RegistryEntry = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type Registry = {
  version: 1;
  projects: RegistryEntry[];
};

function readRegistry(): Registry {
  const file = getRegistryPath();
  if (!fs.existsSync(file)) {
    return { version: 1, projects: [] };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8")) as Registry;
    return { version: 1, projects: parsed.projects ?? [] };
  } catch {
    // 壊れた registry は空として扱う（project.db が正本なので復元可能）
    return { version: 1, projects: [] };
  }
}

function writeRegistry(registry: Registry): void {
  fs.writeFileSync(getRegistryPath(), JSON.stringify(registry, null, 2));
}

export function listRegistryEntries(): RegistryEntry[] {
  return readRegistry().projects.toSorted((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export function upsertRegistryEntry(entry: RegistryEntry): void {
  const registry = readRegistry();
  const rest = registry.projects.filter((p) => p.id !== entry.id);
  writeRegistry({ ...registry, projects: [...rest, entry] });
}

export function removeRegistryEntry(projectId: string): void {
  const registry = readRegistry();
  writeRegistry({
    ...registry,
    projects: registry.projects.filter((p) => p.id !== projectId),
  });
}

export function touchRegistryEntry(projectId: string, name?: string): void {
  const registry = readRegistry();
  const entry = registry.projects.find((p) => p.id === projectId);
  if (!entry) return;
  entry.updatedAt = new Date().toISOString();
  if (name !== undefined) entry.name = name;
  writeRegistry(registry);
}
