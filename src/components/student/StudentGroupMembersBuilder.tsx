"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";

const CLASS_OPTIONS = ["9ºA", "9ºB", "9ºC"];

interface SearchableStudent {
  id: string | number;
  name: string;
  registration_code?: string | null;
  grade?: string | null;
}

interface AddedMember {
  id: string;
  name: string;
  registrationCode: string;
  year: string;
}

interface StudentGroupMembersBuilderProps {
  representative?: SearchableStudent | null;
  students: SearchableStudent[];
  maxMembers: number;
}

/**
 * Construtor visual de integrantes para criação de grupo.
 *
 * Permite adicionar, editar e excluir integrantes via RA ou nome completo + turma.
 */
export default function StudentGroupMembersBuilder({
  representative = null,
  students,
  maxMembers,
}: StudentGroupMembersBuilderProps) {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const [members, setMembers] = useState<AddedMember[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const additionalMembersLimit = representative ? Math.max(maxMembers - 1, 0) : maxMembers;

  const normalizedStudents = useMemo(
    () =>
      students.map((student) => ({
        ...student,
        normalizedName: (student.name || "").trim().toLowerCase(),
        normalizedRegistrationCode: (student.registration_code || "").trim().toLowerCase(),
        normalizedGrade: (student.grade || "").trim().toLowerCase(),
      })),
    [students]
  );

  const resolveStudent = () => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedYear = year.trim().toLowerCase();

    if (!normalizedQuery) {
      setFeedback("Informe RA ou nome completo para adicionar um integrante.");
      return null;
    }

    const found =
      normalizedStudents.find((student) => {
        const matchesQuery =
          student.normalizedRegistrationCode === normalizedQuery ||
          student.normalizedName === normalizedQuery;

        if (!matchesQuery) {
          return false;
        }

        if (!normalizedYear) {
          return true;
        }

        return student.normalizedGrade === normalizedYear;
      }) ?? null;

    if (!found) {
      setFeedback("Integrante não encontrado. Verifique RA/nome completo e turma.");
      return null;
    }

    return found;
  };

  const handleAddMember = () => {
    if (members.length >= additionalMembersLimit) {
      setFeedback(
        representative
          ? `Você pode adicionar até ${additionalMembersLimit} colegas além de você.`
          : `Você pode adicionar até ${maxMembers} integrantes.`
      );
      return;
    }

    const found = resolveStudent();
    if (!found) {
      return;
    }

    const foundId = String(found.id);
    if (members.some((member) => member.id === foundId)) {
      setFeedback("Esse integrante já foi adicionado.");
      return;
    }

    setMembers((previous) => [
      ...previous,
      {
        id: foundId,
        name: found.name,
        registrationCode: found.registration_code || "Não informado",
        year: found.grade || year.trim() || "Não informado",
      },
    ]);

    setQuery("");
    setYear("");
    setFeedback("Integrante adicionado ao grupo.");
  };

  const handleEditMember = (memberId: string) => {
    const member = members.find((item) => item.id === memberId);
    if (!member) {
      return;
    }

    setQuery(member.registrationCode !== "Não informado" ? member.registrationCode : member.name);
    setYear(member.year !== "Não informado" ? member.year : "");
    setMembers((previous) => previous.filter((item) => item.id !== memberId));
    setFeedback("Integrante carregado para edição.");
  };

  const handleRemoveMember = (memberId: string) => {
    setMembers((previous) => previous.filter((item) => item.id !== memberId));
    setFeedback("Integrante removido.");
  };

  return (
    <div className="space-y-4 rounded-[26px] border border-[var(--tca-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(248,251,255,0.98)_100%)] p-4 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.4)]">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Integrantes do grupo</h2>
          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {members.length + (representative ? 1 : 0)}/{maxMembers} integrantes
          </span>
        </div>
        {representative ? (
          <p className="text-sm leading-relaxed text-[var(--tca-text-soft)]">
            O Integrante 1 é preenchido automaticamente com o estudante logado. Agora dá para adicionar até {additionalMembersLimit} colega{additionalMembersLimit === 1 ? "" : "s"}.
          </p>
        ) : (
          <p className="tca-feedback tca-feedback--warning">
            Não foi possível localizar seu cadastro de estudante. Confira seu perfil antes de salvar.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.7fr_1fr_auto] gap-3 items-end">
        <div>
          <label className="tca-form-label">RA ou nome completo</label>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex.: 20240123 ou Maria Silva"
            className="tca-input"
          />
        </div>

        <div>
          <label className="tca-form-label">Turma</label>
          <select
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className="tca-select"
          >
            <option value="">Selecione</option>
            {CLASS_OPTIONS.map((classOption) => (
              <option key={classOption} value={classOption}>
                {classOption}
              </option>
            ))}
          </select>
        </div>

        <Button
          type="button"
          onClick={handleAddMember}
          className="w-full md:w-auto"
        >
          Adicionar integrante
        </Button>
      </div>

      {feedback && (
        <p className="tca-feedback tca-feedback--warning">{feedback}</p>
      )}

      <input type="hidden" name="members_payload" value={JSON.stringify(members)} readOnly />

      <div className="overflow-x-auto">
        <table className="min-w-full overflow-hidden rounded-[22px] border border-[var(--tca-border)] bg-white">
          <thead className="bg-[var(--tca-surface-soft)]">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-[var(--tca-text-muted)]">
                RA ou nome completo
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-[var(--tca-text-muted)]">
                Turma
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.1em] text-[var(--tca-text-muted)]">
                Ações
              </th>
            </tr>
          </thead>

          <tbody>
            {representative && (
              <tr className="border-t border-[var(--tca-border)] bg-[var(--tca-surface-soft)]">
                <td className="px-3 py-3 text-sm text-[var(--foreground)]">
                  <p className="font-semibold">{representative.name}</p>
                  <p className="text-xs text-[var(--tca-text-muted)]">
                    RA: {representative.registration_code || "Não informado"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[var(--tca-primary)]">Integrante 1 (representante)</p>
                </td>
                <td className="px-3 py-3 text-sm text-[var(--tca-text-soft)]">{representative.grade || "Não informado"}</td>
                <td className="px-3 py-3 text-right text-xs font-medium text-[var(--tca-text-muted)]">Fixo</td>
              </tr>
            )}

            {members.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-sm text-[var(--tca-text-muted)]">
                  {representative
                    ? "Nenhum colega adicionado ainda."
                    : "Nenhum integrante adicionado ainda."}
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id} className="border-t border-[var(--tca-border)]">
                  <td className="px-3 py-3 text-sm text-[var(--foreground)]">
                    <p className="font-semibold">{member.name}</p>
                    <p className="text-xs text-[var(--tca-text-muted)]">RA: {member.registrationCode}</p>
                  </td>
                  <td className="px-3 py-3 text-sm text-[var(--tca-text-soft)]">{member.year}</td>
                  <td className="px-3 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditMember(member.id)}
                        className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
