import { redirect } from "next/navigation";

interface CoordinatorManagementPageProps {
  searchParams?: Promise<{
    bind_status?: string;
    bind_group?: string;
  }>;
}

export default async function CoordinatorManagementPage({ searchParams }: CoordinatorManagementPageProps) {
  const params = searchParams ? await searchParams : {};
  const bindStatus = params.bind_status ?? null;
  const bindGroup = params.bind_group ?? null;

  const query = new URLSearchParams();
  if (bindStatus) query.set("bind_status", bindStatus);
  if (bindGroup) query.set("bind_group", bindGroup);

  redirect(`/coordinator/dashboard${query.toString() ? `?${query.toString()}` : ""}`);
}