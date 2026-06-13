import Link from "next/link";
import { listProjects } from "@/lib/db/repositories/projects";
import { NewProjectForm } from "@/components/new-project-form";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProjectListPage() {
  const projects = listProjects();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-ink-faint">
            PROJECTS
          </p>
          <h1 className="mt-1 text-2xl font-bold">プロジェクト一覧</h1>
        </div>
        <NewProjectForm />
      </div>

      {projects.length === 0 ? (
        <div className="canvas-grid rounded-lg border border-dashed border-line bg-surface/60 px-8 py-16 text-center">
          <p className="font-mono text-xs tracking-[0.2em] text-ink-faint">
            NO PROJECTS
          </p>
          <p className="mt-3 text-ink-soft">
            まだプロジェクトがありません。「新規プロジェクト」から作成すると、
            画面を整列させるキャンバスが開きます。
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="group block rounded-lg border border-line bg-surface p-4 transition-colors hover:border-ink-faint focus-visible:outline-2 focus-visible:outline-accent"
              >
                <p className="font-mono text-[10px] tracking-[0.2em] text-ink-faint">
                  PRJ-{String(i + 1).padStart(2, "0")}
                </p>
                <h2 className="mt-1 truncate text-lg font-semibold group-hover:text-accent">
                  {p.name}
                </h2>
                <p className="mt-3 font-mono text-xs text-ink-soft">
                  更新 {formatDate(p.updatedAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
