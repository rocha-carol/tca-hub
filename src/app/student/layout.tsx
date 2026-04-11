import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile, getAuthenticatedUser } from "@/lib/auth/session-service";
import { resolveStudentGroupContext } from "@/app/student/_lib/student-group-context";
import { StudentPortalSidebar } from "@/components/student/StudentPortalSidebar";

interface StudentLayoutProps {
  children: ReactNode;
}

export default async function StudentLayout({ children }: StudentLayoutProps) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/auth/login");
  }

  const profile = await getAuthenticatedProfile();

  if (profile?.role === "coordinator") {
    redirect("/coordinator/dashboard");
  }

  if (profile?.role === "advisor") {
    redirect("/advisor/dashboard");
  }

  const context = await resolveStudentGroupContext(user.id);

  return (
    <div className="min-h-[calc(100vh-57px)] bg-[#f3f8ef]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:items-start lg:px-6 lg:py-8">
        <StudentPortalSidebar hasGroup={Boolean(context.group)} group={context.group} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}