import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/db/repositories/projects";
import { ProjectSettingsForm } from "@/components/project-settings-form";

export const dynamic = "force-dynamic";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <nav className="font-mono text-xs tracking-wider text-ink-faint">
          <Link href="/" className="hover:text-ink">
            プロジェクト一覧
          </Link>
          <span className="mx-1.5">/</span>
          <Link href={`/projects/${id}`} className="hover:text-ink">
            {project.name}
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-ink-soft">設定</span>
        </nav>
        <h1 className="mt-1 text-2xl font-bold">プロジェクト設定</h1>
        <p className="mt-2 text-sm text-ink-soft">
          ここに書いた前提情報は、画面を生成・修正するAI（Claude
          Code）のコンテキストとして常に参照されます。
        </p>
      </div>

      <ProjectSettingsForm project={project} />

      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="font-mono text-xs tracking-[0.2em] text-ink-faint">
          INPUTS
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          企画書などのインプット投入と、AIによる画面一覧の提案はまだ実装されていません（M3で対応予定）
        </p>
      </section>
    </div>
  );
}
