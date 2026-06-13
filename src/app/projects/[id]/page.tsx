import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/db/repositories/projects";
import { listScreens } from "@/lib/db/repositories/screens";
import { Canvas } from "@/components/canvas";
import { ProjectSettingsButton } from "@/components/project-settings-button";

export const dynamic = "force-dynamic";

export default async function ProjectCanvasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();
  const screens = listScreens(id);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <nav className="font-mono text-xs tracking-wider text-ink-faint">
            <Link href="/" className="hover:text-ink">
              プロジェクト一覧
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-ink-soft">キャンバス</span>
          </nav>
          <h1 className="mt-1 truncate text-2xl font-bold">{project.name}</h1>
        </div>
        <ProjectSettingsButton project={project} />
      </div>

      <Canvas projectId={id} screens={screens} />
    </div>
  );
}
