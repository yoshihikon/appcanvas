import { notFound } from "next/navigation";
import { getProject } from "@/lib/db/repositories/projects";
import { ProjectSettingsRouteView } from "@/components/project-settings-route-view";

export const dynamic = "force-dynamic";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  return <ProjectSettingsRouteView project={project} />;
}
