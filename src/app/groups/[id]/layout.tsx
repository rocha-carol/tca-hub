import type { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import GroupContextPanel from "@/components/layout/GroupContextPanel";
import { getAuthenticatedProfile } from "@/lib/auth/session-service";

interface GroupLayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default async function GroupLayout({ children, params }: GroupLayoutProps) {
  const { id } = await params;
  const profile = await getAuthenticatedProfile();

  return (
    <div className="flex min-h-[calc(100vh-57px)] bg-[#f3f8ef]">
      <Sidebar groupId={id} role={profile?.role ?? null} />
      <div className="flex flex-1 gap-6 px-4 py-6 lg:px-6 lg:py-8">
        <div className="min-w-0 flex-1 overflow-x-hidden">
          {children}
        </div>
        <GroupContextPanel groupId={id} />
      </div>
    </div>
  );
}
