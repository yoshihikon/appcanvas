import { notFound } from "next/navigation";
import { getProject } from "@/lib/db/repositories/projects";
import { listScreens } from "@/lib/db/repositories/screens";
import { hasDevCode } from "@/lib/workspace/files";
import { CodeBrowser } from "@/components/code-browser";

export const dynamic = "force-dynamic";

export default async function ProjectCodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!getProject(id)) notFound();
  const generatedScreens = listScreens(id).filter(
    (s) => s.status === "generated",
  ).length;

  return (
    <CodeBrowser
      projectId={id}
      hasCode={hasDevCode(id)}
      generatedScreens={generatedScreens}
    />
  );
}
