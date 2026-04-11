"use client";

import { useMemo, useState } from "react";

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
    <div className="rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-gray-900">Integrantes do grupo</h2>
        {representative ? (
          <p className="text-sm text-gray-600">
            O Integrante 1 é preenchido automaticamente com o estudante logado. Agora dá para adicionar até {additionalMembersLimit} colega{additionalMembersLimit === 1 ? "" : "s"}.
          </p>
        ) : (
          <p className="text-sm text-amber-800">
            Não foi possível localizar seu cadastro de estudante. Confira seu perfil antes de salvar.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.7fr_1fr_auto] gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">RA ou nome completo</label>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex.: 20240123 ou Maria Silva"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
          <select
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
          >
            <option value="">Selecione</option>
            {CLASS_OPTIONS.map((classOption) => (
              <option key={classOption} value={classOption}>
                {classOption}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleAddMember}
          className="bg-lime-700 hover:bg-lime-800 text-white font-medium px-4 py-2 rounded-md"
        >
          Adicionar integrante
        </button>
      </div>

      {feedback && (
        <p className="text-sm text-gray-700">{feedback}</p>
      )}

      <input type="hidden" name="members_payload" value={JSON.stringify(members)} readOnly />

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 rounded-md">
          <thead className="bg-[#f8fbf6]">
            <tr>
              <th className="text-left text-xs font-semibold uppercase tracking-[0.1em] text-gray-600 px-3 py-2">
                RA ou nome completo
              </th>
              <th className="text-left text-xs font-semibold uppercase tracking-[0.1em] text-gray-600 px-3 py-2">
                Turma
              </th>
              <th className="text-right text-xs font-semibold uppercase tracking-[0.1em] text-gray-600 px-3 py-2">
                Ações
              </th>
            </tr>
          </thead>

          <tbody>
            {representative && (
              <tr className="border-t border-gray-100 bg-[#f8fbf6]">
                <td className="px-3 py-3 text-sm text-gray-800">
                  <p className="font-medium">{representative.name}</p>
                  <p className="text-xs text-gray-500">
                    RA: {representative.registration_code || "Não informado"}
                  </p>
                  <p className="text-xs text-lime-700 font-medium mt-1">Integrante 1 (representante)</p>
                </td>
                <td className="px-3 py-3 text-sm text-gray-700">{representative.grade || "Não informado"}</td>
                <td className="px-3 py-3 text-right text-xs font-medium text-gray-400">Fixo</td>
              </tr>
            )}

            {members.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-3 text-sm text-gray-500">
                  {representative
                    ? "Nenhum colega adicionado ainda."
                    : "Nenhum integrante adicionado ainda."}
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id} className="border-t border-gray-100">
                  <td className="px-3 py-3 text-sm text-gray-800">
                    <p className="font-medium">{member.name}</p>
                    <p className="text-xs text-gray-500">RA: {member.registrationCode}</p>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700">{member.year}</td>
                  <td className="px-3 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditMember(member.id)}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-900 text-xs font-medium px-3 py-1.5 rounded-md"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        className="bg-red-100 hover:bg-red-200 text-red-900 text-xs font-medium px-3 py-1.5 rounded-md"
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
