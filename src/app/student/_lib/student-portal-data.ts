import { redirect } from "next/navigation";
import { getAuthenticatedProfile, getAuthenticatedUser } from "@/lib/auth/session-service";
import { ensureGroupProjectSectionsStructure } from "@/services/project-section-service";
import { resolveStudentGroupContext } from "@/app/student/_lib/student-group-context";
import { STUDENT_ROUTES } from "@/lib/utils/constants";
import { fetchGroupProcessPhotos } from "@/services/group-process-photo-service";
import { fetchGroupRepertoryItems } from "@/services/group-repertory-item-service";

function getFirstName(nameOrEmail: string) {
  const baseName = nameOrEmail.includes("@") ? nameOrEmail.split("@")[0] : nameOrEmail;
  const [firstName] = baseName.trim().split(/\s+/);

  return firstName || "estudante";
}

export async function loadStudentPortalData() {
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
  const hasGroup = Boolean(context.group);
  const studentName = profile?.name || user.email || "Estudante";
  const firstName = getFirstName(studentName);
  const nextJourneyHref = context.group
    ? `${STUDENT_ROUTES.HOME}/groups/${context.group.id}/theme-guide`
    : undefined;
  const projectSections = context.group
    ? await ensureGroupProjectSectionsStructure(context.group.id).catch(() => [])
    : [];
  const processPhotosCount = context.group
    ? await fetchGroupProcessPhotos(context.group.id)
        .then((photos) => photos.length)
        .catch(() => 0)
    : 0;
  const repertoryItemsCount = context.group
    ? await fetchGroupRepertoryItems(context.group.id)
        .then((items) => items.length)
        .catch(() => 0)
    : 0;

  return {
    user,
    profile,
    context,
    hasGroup,
    studentName,
    firstName,
    nextJourneyHref,
    projectSections,
    processPhotosCount,
    repertoryItemsCount,
  };
}