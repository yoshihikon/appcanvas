import { eq } from "drizzle-orm";
import { openProjectDb } from "@/lib/db/client";
import { screenComponents, type ScreenComponent } from "@/lib/db/schema";

export function listComponents(
  projectId: string,
  screenId: string,
): ScreenComponent[] {
  const db = openProjectDb(projectId);
  return db
    .select()
    .from(screenComponents)
    .where(eq(screenComponents.screenId, screenId))
    .all();
}

/**
 * 画面のコンポーネント一覧を丸ごと置き換える。
 * キャプチャのたびに data-cid から抽出した最新の一覧で更新する。
 * note は本開発向けの手入力なので、既存の同じ component_id があれば引き継ぐ。
 */
export function replaceComponents(
  projectId: string,
  screenId: string,
  items: { componentId: string; name: string; type: string }[],
): void {
  const db = openProjectDb(projectId);
  const prevNotes = new Map(
    listComponents(projectId, screenId).map((c) => [c.componentId, c.note]),
  );
  const now = new Date().toISOString();
  db.delete(screenComponents)
    .where(eq(screenComponents.screenId, screenId))
    .run();
  for (const item of items) {
    db.insert(screenComponents)
      .values({
        id: crypto.randomUUID(),
        screenId,
        componentId: item.componentId,
        name: item.name,
        type: item.type,
        note: prevNotes.get(item.componentId) ?? "",
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }
}
