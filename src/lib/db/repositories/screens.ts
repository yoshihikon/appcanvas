import { and, eq } from "drizzle-orm";
import { openProjectDb } from "@/lib/db/client";
import { screens, type Screen, type ScreenStatus } from "@/lib/db/schema";

export function listScreens(projectId: string): Screen[] {
  const db = openProjectDb(projectId);
  return db
    .select()
    .from(screens)
    .where(eq(screens.projectId, projectId))
    .all()
    .toSorted((a, b) => a.sortOrder - b.sortOrder);
}

export function getScreen(projectId: string, screenId: string): Screen | null {
  const db = openProjectDb(projectId);
  const row = db
    .select()
    .from(screens)
    .where(and(eq(screens.projectId, projectId), eq(screens.id, screenId)))
    .get();
  return row ?? null;
}

export function createScreen(
  projectId: string,
  input: {
    name: string;
    description?: string;
    groupName?: string;
    status?: ScreenStatus;
  },
): Screen {
  const db = openProjectDb(projectId);
  const existing = listScreens(projectId);
  const maxOrder = existing.reduce((max, s) => Math.max(max, s.sortOrder), -1);

  const now = new Date().toISOString();
  const screen: Screen = {
    id: crypto.randomUUID(),
    projectId,
    name: input.name,
    description: input.description ?? "",
    status: input.status ?? "proposed",
    sortOrder: maxOrder + 1,
    groupName: input.groupName ?? "",
    codePath: null,
    htmlPath: null,
    thumbnailPath: null,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(screens).values(screen).run();
  return screen;
}

export function updateScreen(
  projectId: string,
  screenId: string,
  patch: Partial<
    Pick<
      Screen,
      | "name"
      | "description"
      | "status"
      | "sortOrder"
      | "groupName"
      | "codePath"
      | "htmlPath"
      | "thumbnailPath"
    >
  >,
): Screen | null {
  const current = getScreen(projectId, screenId);
  if (!current) return null;
  const now = new Date().toISOString();
  const db = openProjectDb(projectId);
  db.update(screens)
    .set({ ...patch, updatedAt: now })
    .where(eq(screens.id, screenId))
    .run();
  return { ...current, ...patch, updatedAt: now };
}

export function deleteScreen(projectId: string, screenId: string): boolean {
  const current = getScreen(projectId, screenId);
  if (!current) return false;
  const db = openProjectDb(projectId);
  db.delete(screens).where(eq(screens.id, screenId)).run();
  return true;
}
