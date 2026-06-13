import { notFound } from "next/navigation";
import { getProject } from "@/lib/db/repositories/projects";
import { listScreens } from "@/lib/db/repositories/screens";
import { PreviewBrowser } from "@/components/preview-browser";

export const dynamic = "force-dynamic";

export default async function ProjectPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!getProject(id)) notFound();
  const screens = listScreens(id).map((s) => ({
    id: s.id,
    name: s.name,
    device: s.device,
    groupName: s.groupName,
    hasPreview: Boolean(s.htmlPath),
  }));

  return <PreviewBrowser projectId={id} screens={screens} />;
}
