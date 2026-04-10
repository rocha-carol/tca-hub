"use client";

import { useMemo, useState } from "react";

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
  students: SearchableStudent[];
  maxMembers: number;
}

/**
 * Construtor visual de integrantes para criação de grupo.
 *
 * Permite adicionar, editar e excluir integrantes via RA ou nome completo + ano.
 */
export default function StudentGroupMembersBuilder({
  students,
  maxMembers,
}: StudentGroupMembersBuilderProps) {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const [members, setMembers] = useState<AddedMember[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

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
      setFeedback("Integrante não encontrado. Verifique RA/nome completo e ano.");
      return null;
    }

    return found;
  };

  const handleAddMember = () => {
    if (members.length >= maxMembers) {
      setFeedback(`Você pode adicionar até ${maxMembers} integrantes.`);
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
      <h2 className="text-lg font-semibold text-gray-900">Adicionar integrantes</h2>
      <p className="text-sm text-gray-600">
        Você pode adicionar até {maxMembers} integrantes.
      </p>

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
          <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
          <input
            type="text"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            placeholder="Ex.: 9º ano"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
          />
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
                Ano
              </th>
              <th className="text-right text-xs font-semibold uppercase tracking-[0.1em] text-gray-600 px-3 py-2">
                Ações
              </th>
            </tr>
          </thead>

          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-3 text-sm text-gray-500">
                  Nenhum integrante adicionado ainda.
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
