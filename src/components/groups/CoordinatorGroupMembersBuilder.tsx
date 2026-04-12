"use client";

import { useMemo, useState } from "react";

interface SearchableStudent {
  id: string | number;
  name: string;
  grade?: string | null;
}

interface CoordinatorGroupMembersBuilderProps {
  students: SearchableStudent[];
  maxMembers: number;
}

export default function CoordinatorGroupMembersBuilder({
  students,
  maxMembers,
}: CoordinatorGroupMembersBuilderProps) {
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [members, setMembers] = useState<SearchableStudent[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const availableStudents = useMemo(
    () => students.filter((student) => !members.some((member) => String(member.id) === String(student.id))),
    [members, students]
  );

  function handleSelectStudent(studentId: string) {
    setSelectedStudentId(studentId);

    if (!studentId) {
      return;
    }

    if (members.length >= maxMembers) {
      setFeedback(`O grupo pode ter no máximo ${maxMembers} integrantes.`);
      return;
    }

    const selectedStudent = students.find((student) => String(student.id) === studentId);

    if (!selectedStudent) {
      setFeedback("Estudante não encontrado na base atual.");
      return;
    }

    if (members.some((member) => String(member.id) === studentId)) {
      setFeedback("Esse estudante já foi adicionado ao grupo.");
      return;
    }

    setMembers((currentMembers) => [...currentMembers, selectedStudent]);
    setSelectedStudentId("");
    setFeedback(null);
  }

  function handleRemoveStudent(studentId: string) {
    setMembers((currentMembers) => currentMembers.filter((member) => String(member.id) !== studentId));
    setFeedback(null);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[#DCEBD5] bg-white px-4 py-4 shadow-sm">
      <div>
        <label htmlFor="coordinator-group-student-select" className="block text-sm font-medium text-gray-700 mb-1">
          Selecionar estudante cadastrado
        </label>
        <select
          id="coordinator-group-student-select"
          value={selectedStudentId}
          onChange={(event) => handleSelectStudent(event.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-lime-500"
        >
          <option value="">— Selecionar estudante cadastrado —</option>
          {availableStudents.map((student) => (
            <option key={student.id} value={String(student.id)}>
              {student.name} {student.grade ? `— ${student.grade}` : "— Série não informada"}
            </option>
          ))}
        </select>
      </div>

      {feedback && <p className="text-sm text-amber-800">{feedback}</p>}

      <div className="rounded-xl border border-gray-100 bg-[#F8FBF6] px-4 py-3">
        <p className="text-sm font-semibold text-[#1F2937] mb-2">Integrantes selecionados</p>

        {members.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum estudante selecionado ainda.</p>
        ) : (
          <ul className="space-y-2">
            {members.map((member, index) => (
              <li key={String(member.id)} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 border border-[#E3EDE0]">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{member.name}</p>
                  <p className="text-xs text-gray-500">
                    Integrante {index + 1} • {member.grade || "Série não informada"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveStudent(String(member.id))}
                  className="shrink-0 rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-900 hover:bg-red-200"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <input type="hidden" name="members_payload" value={JSON.stringify(members)} readOnly />
    </div>
  );
}