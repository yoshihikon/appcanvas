import fs from "node:fs";
import { eq } from "drizzle-orm";
import { closeProjectDb, openProjectDb } from "@/lib/db/client";
import { projects, type Project } from "@/lib/db/schema";
import { getProjectDir } from "@/lib/storage/paths";
import {
  listRegistryEntries,
  removeRegistryEntry,
  upsertRegistryEntry,
  type RegistryEntry,
} from "@/lib/storage/registry";
import { initWorkspace, writeClaudeMd } from "@/lib/workspace/init";
import { DEFAULT_SKILLS, sanitizeSkills } from "@/lib/agent/skills";
import { DEFAULT_DEVICE, isDeviceType } from "@/lib/device";

export function listProjects(): RegistryEntry[] {
  return listRegistryEntries();
}

export function getProject(projectId: string): Project | null {
  if (!fs.existsSync(getProjectDir(projectId))) return null;
  const db = openProjectDb(projectId);
  const row = db.select().from(projects).where(eq(projects.id, projectId)).get();
  return row ?? null;
}

export function createProject(input: {
  name: string;
  persona?: string;
  overview?: string;
}): Project {
  const now = new Date().toISOString();
  const project: Project = {
    id: crypto.randomUUID(),
    name: input.name,
    persona: input.persona ?? "",
    overview: input.overview ?? "",
    skills: JSON.stringify(DEFAULT_SKILLS),
    designSystem: "",
    defaultDevice: DEFAULT_DEVICE,
    createdAt: now,
    updatedAt: now,
  };

  const db = openProjectDb(project.id);
  db.insert(projects).values(project).run();
  initWorkspace(project);
  upsertRegistryEntry({
    id: project.id,
    name: project.name,
    createdAt: now,
    updatedAt: now,
  });
  return project;
}

export function updateProject(
  projectId: string,
  patch: {
    name?: string;
    persona?: string;
    overview?: string;
    skills?: string[];
    designSystem?: string;
    defaultDevice?: string;
  },
): Project | null {
  const current = getProject(projectId);
  if (!current) return null;

  const dbPatch: Partial<Project> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.persona !== undefined) dbPatch.persona = patch.persona;
  if (patch.overview !== undefined) dbPatch.overview = patch.overview;
  if (patch.skills !== undefined) {
    dbPatch.skills = JSON.stringify(sanitizeSkills(patch.skills));
  }
  if (patch.designSystem !== undefined) {
    dbPatch.designSystem = patch.designSystem;
  }
  if (patch.defaultDevice !== undefined && isDeviceType(patch.defaultDevice)) {
    dbPatch.defaultDevice = patch.defaultDevice;
  }

  const now = new Date().toISOString();
  const db = openProjectDb(projectId);
  db.update(projects)
    .set({ ...dbPatch, updatedAt: now })
    .where(eq(projects.id, projectId))
    .run();

  const updated = { ...current, ...dbPatch, updatedAt: now };
  // 前提情報の変更はAIコンテキスト(CLAUDE.md)へ即時反映する
  writeClaudeMd(updated);
  upsertRegistryEntry({
    id: projectId,
    name: updated.name,
    createdAt: updated.createdAt,
    updatedAt: now,
  });
  return updated;
}

export function deleteProject(projectId: string): boolean {
  const dir = getProjectDir(projectId);
  if (!fs.existsSync(dir)) {
    removeRegistryEntry(projectId);
    return false;
  }
  closeProjectDb(projectId);
  fs.rmSync(dir, { recursive: true, force: true });
  removeRegistryEntry(projectId);
  return true;
}
