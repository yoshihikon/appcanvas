import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/db/repositories/projects";
import { getScreen, listScreens } from "@/lib/db/repositories/screens";
import { StatusBadge } from "@/components/status-badge";
import { ScreenMetaForm } from "@/components/screen-meta-form";

export const dynamic = "force-dynamic";

export default async function ScreenDetailPage({
  params,
}: {
  params: Promise<{ id: string; screenId: string }>;
}) {
  const { id, screenId } = await params;
  const project = getProject(id);
  if (!project) notFound();
  const screen = getScreen(id, screenId);
  if (!screen) notFound();

  const number =
    listScreens(id).findIndex((s) => s.id === screenId) + 1;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <nav className="font-mono text-xs tracking-wider text-ink-faint">
            <Link href="/" className="hover:text-ink">
              プロジェクト一覧
            </Link>
            <span className="mx-1.5">/</span>
            <Link href={`/projects/${id}`} className="hover:text-ink">
              {project.name}
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-ink-soft">
              SCR-{String(number).padStart(2, "0")}
            </span>
          </nav>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="truncate text-2xl font-bold">{screen.name}</h1>
            <StatusBadge status={screen.status} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* プレビュー（レンダリングとキャプチャはM2で実装） */}
        <section className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line px-4 py-2">
            <span className="font-mono text-xs tracking-[0.2em] text-ink-faint">
              PREVIEW
            </span>
          </div>
          <div className="canvas-grid flex aspect-[4/3] items-center justify-center bg-paper/60">
            <div className="text-center">
              <p className="font-mono text-xs tracking-[0.2em] text-ink-faint">
                NOT RENDERED
              </p>
              <p className="mt-2 max-w-xs text-sm text-ink-soft">
                画面コードのプレビュー表示はまだ実装されていません（M2で対応予定）
              </p>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          {/* チャット（Claude Code連携はM3で実装） */}
          <section className="rounded-lg border border-line bg-surface">
            <div className="border-b border-line px-4 py-2">
              <span className="font-mono text-xs tracking-[0.2em] text-ink-faint">
                CHAT
              </span>
            </div>
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-ink-soft">
                Claude Code と連携した修正チャットはまだ実装されていません
                （M3で対応予定）
              </p>
            </div>
          </section>

          {/* 画面情報の編集 */}
          <section className="rounded-lg border border-line bg-surface">
            <div className="border-b border-line px-4 py-2">
              <span className="font-mono text-xs tracking-[0.2em] text-ink-faint">
                SCREEN INFO
              </span>
            </div>
            <div className="p-4">
              <ScreenMetaForm projectId={id} screen={screen} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
