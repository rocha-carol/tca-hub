import type { ReactNode } from "react";
import { loadStudentPortalData } from "@/app/student/_lib/student-portal-data";
import { StudentPortalSidebar } from "@/components/student/StudentPortalSidebar";
import { StudentProjectHeaderNav } from "@/components/student/StudentProjectHeaderNav";

interface StudentLayoutProps {
  children: ReactNode;
}

export default async function StudentLayout({ children }: StudentLayoutProps) {
  const {
    context,
    projectSections,
    processPhotosCount,
    repertoryItemsCount,
    studentName,
  } = await loadStudentPortalData();

  return (
    <div className="min-h-[calc(100vh-57px)] bg-[#f3f8ef]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:items-start lg:px-6 lg:py-8">
        <StudentPortalSidebar
          hasGroup={Boolean(context.group)}
          group={context.group}
          projectSections={projectSections}
          processPhotosCount={processPhotosCount}
          repertoryItemsCount={repertoryItemsCount}
          studentName={studentName}
        />
        <div className="min-w-0 flex-1 space-y-4">
          <StudentProjectHeaderNav
            group={context.group}
            projectSections={projectSections}
          />
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}