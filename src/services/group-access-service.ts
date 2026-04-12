import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedProfile } from "@/lib/auth/session-service";
import { fetchGroupById } from "@/services/group-service";
import { resolveStudentByAuthIdentity } from "@/services/student-service";
import type { Group } from "@/types/group";
import type { Profile } from "@/types/profile";
import { STUDENT_ROUTES } from "@/lib/utils/constants";

export type GroupAccessRole = "student-member" | "advisor-linked" | "coordinator";

export interface GroupAccessContext {
  profile: Profile | null;
  group: Group | null;
  accessRole: GroupAccessRole | null;
}

function idsAreEqual(left: string | number | null | undefined, right: string | number | null | undefined) {
  return String(left ?? "") === String(right ?? "");
}

function isStudentLinkedToGroup(group: Group, studentId: string | number) {
  return [group.student_1_id, group.student_2_id, group.student_3_id, group.student_4_id, group.student_5_id]
    .some((value) => idsAreEqual(value, studentId));
}

function isAdvisorLinkedToGroup(group: Group, advisorId: string | number) {
  return (
    idsAreEqual(group.primary_advisor_id, advisorId) ||
    idsAreEqual(group.co_advisor_id, advisorId) ||
    (group.indication_status === "pendente" && idsAreEqual(group.indicated_advisor_id, advisorId))
  );
}

async function fetchStudentIdByProfileId(profileId: string): Promise<string | number | null> {
  const student = await resolveStudentByAuthIdentity({ profileId });
  return student?.id ?? null;
}

async function fetchAdvisorIdByProfileId(profileId: string): Promise<string | number | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("advisors")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao validar vínculo do orientador com o grupo: ${error.message}`);
  }

  return data?.id ?? null;
}

function getForbiddenRedirectPath(profile: Profile | null) {
  if (!profile) {
    return "/auth/login";
  }

  if (profile.role === "student") {
    return STUDENT_ROUTES.HOME;
  }

  if (profile.role === "advisor") {
    return "/advisor/dashboard";
  }

  if (profile.role === "coordinator") {
    return "/coordinator/dashboard";
  }

  return "/dashboard";
}

export async function resolveGroupAccessContext(groupId: string): Promise<GroupAccessContext> {
  const profile = await getAuthenticatedProfile();

  if (!profile) {
    return {
      profile: null,
      group: null,
      accessRole: null,
    };
  }

  const group = await fetchGroupById(groupId);

  if (!group) {
    return {
      profile,
      group: null,
      accessRole: null,
    };
  }

  if (profile.role === "coordinator") {
    return {
      profile,
      group,
      accessRole: "coordinator",
    };
  }

  if (profile.role === "student") {
    const studentId = await fetchStudentIdByProfileId(profile.id);

    if (studentId !== null && isStudentLinkedToGroup(group, studentId)) {
      return {
        profile,
        group,
        accessRole: "student-member",
      };
    }
  }

  if (profile.role === "advisor") {
    const advisorId = await fetchAdvisorIdByProfileId(profile.id);

    if (advisorId !== null && isAdvisorLinkedToGroup(group, advisorId)) {
      return {
        profile,
        group,
        accessRole: "advisor-linked",
      };
    }
  }

  return {
    profile,
    group,
    accessRole: null,
  };
}

export async function requireGroupAccess(groupId: string) {
  const context = await resolveGroupAccessContext(groupId);

  if (!context.profile) {
    redirect("/auth/login");
  }

  if (!context.group) {
    notFound();
  }

  if (!context.accessRole) {
    redirect(getForbiddenRedirectPath(context.profile));
  }

  return {
    profile: context.profile,
    group: context.group,
    accessRole: context.accessRole,
  };
}