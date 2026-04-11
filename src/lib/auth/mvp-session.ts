import type { UserRole } from "@/types/auth";

export const MVP_SESSION_COOKIE = "tca_mvp_session";

export interface MvpSessionPayload {
  profileId: string;
  role: UserRole;
  name: string;
  email: string;
}

function isUserRole(value: string): value is UserRole {
  return value === "student" || value === "advisor" || value === "coordinator";
}

export function parseMvpSessionCookieValue(value?: string | null): MvpSessionPayload | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<MvpSessionPayload>;

    if (
      !parsed ||
      typeof parsed.profileId !== "string" ||
      !parsed.profileId.trim() ||
      typeof parsed.role !== "string" ||
      !isUserRole(parsed.role) ||
      typeof parsed.name !== "string" ||
      typeof parsed.email !== "string"
    ) {
      return null;
    }

    return {
      profileId: parsed.profileId,
      role: parsed.role,
      name: parsed.name,
      email: parsed.email,
    };
  } catch {
    return null;
  }
}

export function serializeMvpSessionCookieValue(payload: MvpSessionPayload): string {
  return JSON.stringify(payload);
}

export function getRoleHomePath(role: UserRole) {
  if (role === "student") {
    return "/estudante";
  }

  if (role === "advisor") {
    return "/advisor/dashboard";
  }

  return "/coordinator/dashboard";
}
