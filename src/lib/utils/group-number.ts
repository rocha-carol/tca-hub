import type { Group } from "@/types/group";

export function parseGeneratedGroupNumber(theme: string | null | undefined): number | null {
  const normalizedTheme = theme?.trim() ?? "";
  const match = normalizedTheme.match(/^Grupo\s+(\d+)$/i);

  if (!match) {
    return null;
  }

  return Number(match[1]);
}

export function getNextGeneratedGroupNumber(groups: Pick<Group, "theme">[]): number {
  const highestNumber = groups.reduce((maxNumber, group) => {
    const parsedNumber = parseGeneratedGroupNumber(group.theme);
    return parsedNumber && parsedNumber > maxNumber ? parsedNumber : maxNumber;
  }, 0);

  return highestNumber + 1;
}

export function buildStableGroupNumberMap(groups: Pick<Group, "id" | "created_at">[]): Map<string, number> {
  return new Map(
    [...groups]
      .sort((left, right) => {
        const leftDate = left.created_at ? new Date(left.created_at).getTime() : 0;
        const rightDate = right.created_at ? new Date(right.created_at).getTime() : 0;

        if (leftDate === rightDate) {
          return String(left.id).localeCompare(String(right.id));
        }

        return leftDate - rightDate;
      })
      .map((group, index) => [String(group.id), index + 1])
  );
}