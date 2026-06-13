import { notFound } from "next/navigation";
import { getProject } from "@/lib/db/repositories/projects";
import { listScreens } from "@/lib/db/repositories/screens";
import { Canvas } from "@/components/canvas";

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
    <Canvas projectId={id} screens={screens} defaultDevice={project.defaultDevice} />
  );
}
