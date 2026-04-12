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
    <div className="space-y-4 rounded-[26px] border border-[var(--tca-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(248,251,255,0.98)_100%)] px-4 py-4 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.4)]">
      <div>
        <label htmlFor="coordinator-group-student-select" className="tca-form-label">
          Selecionar estudante cadastrado
        </label>
        <select
          id="coordinator-group-student-select"
          value={selectedStudentId}
          onChange={(event) => handleSelectStudent(event.target.value)}
          className="tca-select"
        >
          <option value="">— Selecionar estudante cadastrado —</option>
          {availableStudents.map((student) => (
            <option key={student.id} value={String(student.id)}>
              {student.name} {student.grade ? `— ${student.grade}` : "— Série não informada"}
            </option>
          ))}
        </select>
      </div>

      {feedback && <p className="tca-feedback tca-feedback--warning">{feedback}</p>}

      <div className="rounded-[22px] border border-[var(--tca-border)] bg-[var(--tca-surface-soft)] px-4 py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--foreground)]">Integrantes selecionados</p>
          <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
            {members.length}/{maxMembers}
          </span>
        </div>

        {members.length === 0 ? (
          <p className="text-sm text-[var(--tca-text-muted)]">Nenhum estudante selecionado ainda.</p>
        ) : (
          <ul className="space-y-2">
            {members.map((member, index) => (
              <li key={String(member.id)} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--tca-border)] bg-white px-3 py-3 shadow-[0_10px_20px_-20px_rgba(15,23,42,0.55)]">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{member.name}</p>
                  <p className="text-xs text-[var(--tca-text-muted)]">
                    Integrante {index + 1} • {member.grade || "Série não informada"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveStudent(String(member.id))}
                  className="shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
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