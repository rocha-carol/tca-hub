import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getAuthenticatedProfile, getAuthenticatedUser } from "@/lib/auth/session-service";
import { resolveStudentGroupContext } from "@/app/student/_lib/student-group-context";
import { fetchAllAdvisors } from "@/services/advisor-service";
import { fetchGroupAdvisorPreferences, replaceGroupAdvisorPreferences } from "@/services/group-advisor-preference-service";
import { suggestPrimaryAdvisorByPreference } from "@/services/advisor-indication-service";
import { initiateAdvisorIndication } from "@/services/group-service";
import { STUDENT_ROUTES } from "@/lib/utils/constants";

interface StudentAdvisorIndicationPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    indication?: string;
    pref_error?: string;
    pref_success?: string;
  }>;
}

function normalizeSelectedAdvisorId(value: FormDataEntryValue | null) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return null;
  }

  return /^\d+$/.test(rawValue) ? Number(rawValue) : rawValue;
}

function idsAreEqual(left: string | number | null | undefined, right: string | number | null | undefined) {
  return String(left ?? "") === String(right ?? "");
}

function getAdvisorRoleLabel(roleTitle: string | null | undefined) {
  const normalized = typeof roleTitle === "string" ? roleTitle.trim() : "";
  return normalized.length > 0 ? normalized : "Função não informada";
}

function getAdvisorOptionLabel(name: string, roleTitle: string | null | undefined) {
  const roleLabel = getAdvisorRoleLabel(roleTitle);
  return `${name} — ${roleLabel}`;
}

function getAdvisorAvailabilityMeta(
  advisor: Awaited<ReturnType<typeof fetchAllAdvisors>>[number] | undefined,
  group: NonNullable<Awaited<ReturnType<typeof resolveStudentGroupContext>>["group"]>,
  preferenceOrder: number
) {
  if (!advisor) {
    return {
      label: "Selecione um orientador",
      helper: "A ordem de preferência será salva nesta linha.",
      badgeVariant: "gray" as const,
    };
  }

  if (group.indication_status === "pendente" && idsAreEqual(group.indicated_advisor_id, advisor.id)) {
    return {
      label: "Aguardando confirmação do orientador",
      helper: "A solicitação já foi enviada para este orientador.",
      badgeVariant: "yellow" as const,
    };
  }

  if (group.indication_status === "aceita" && idsAreEqual(group.primary_advisor_id, advisor.id)) {
    return {
      label: "Aceite confirmado",
      helper: "Este orientador confirmou o acompanhamento do grupo.",
      badgeVariant: "green" as const,
    };
  }

  if (group.indication_status === "recusada" && preferenceOrder === 1) {
    return {
      label: "Orientador indisponível",
      helper: "A primeira solicitação não pôde seguir para esta orientação.",
      badgeVariant: "gray" as const,
    };
  }

  return {
    label: "Aguardando confirmação",
    helper:
      preferenceOrder === 1
        ? "Esta orientação depende da resposta do orientador selecionado."
        : "Esta preferência fica registrada para reordenação, se necessário.",
    badgeVariant: "yellow" as const,
  };
}

export default async function StudentAdvisorIndicationPage({
  params,
  searchParams,
}: StudentAdvisorIndicationPageProps) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
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

  if (!context.group || context.group.id !== id) {
    redirect(STUDENT_ROUTES.HOME);
  }

  async function handleSaveAdvisorPreferences(formData: FormData) {
    "use server";

    const user = await getAuthenticatedUser();
    if (!user) {
      redirect("/auth/login");
    }

    const profile = await getAuthenticatedProfile();
    if (profile?.role !== "student") {
      redirect(`/estudante/groups/${id}/advisor-indication`);
    }

    const studentContext = await resolveStudentGroupContext(user.id);
    if (!studentContext.group || studentContext.group.id !== id) {
      redirect(STUDENT_ROUTES.HOME);
    }

    const preference1 = normalizeSelectedAdvisorId(formData.get("preference_1"));
    const preference2 = normalizeSelectedAdvisorId(formData.get("preference_2"));
    const preference3 = normalizeSelectedAdvisorId(formData.get("preference_3"));

    const orderedPreferences = [preference1, preference2, preference3].filter(
      (value): value is string | number => value !== null
    );

    const uniqueIds = new Set(orderedPreferences.map((value) => String(value)));
    if (uniqueIds.size !== orderedPreferences.length) {
      redirect(`/estudante/groups/${id}/advisor-indication?pref_error=duplicate`);
    }

    try {
      await replaceGroupAdvisorPreferences(id, orderedPreferences);
    } catch {
      redirect(`/estudante/groups/${id}/advisor-indication?pref_error=save`);
    }

    const firstPreferenceId = orderedPreferences[0];

    if (!firstPreferenceId) {
      revalidatePath(`/estudante/groups/${id}/advisor-indication`);
      revalidatePath(`/student/groups/${id}/advisor-indication`);
      revalidatePath(`/groups/${id}`);
      revalidatePath(STUDENT_ROUTES.HOME);
      revalidatePath(STUDENT_ROUTES.LEGACY_NAMESPACE_HOME);
      revalidatePath("/groups");
      revalidatePath("/dashboard");
      redirect(STUDENT_ROUTES.HOME);
    }

    const result = await suggestPrimaryAdvisorByPreference(id);
    const firstAdvisorCheck = result.checked.find((item) => idsAreEqual(item.advisor.id, firstPreferenceId));

    if (!firstAdvisorCheck || !firstAdvisorCheck.available) {
      revalidatePath(`/estudante/groups/${id}/advisor-indication`);
      revalidatePath(`/student/groups/${id}/advisor-indication`);
      revalidatePath(`/groups/${id}`);
      revalidatePath(STUDENT_ROUTES.HOME);
      revalidatePath(STUDENT_ROUTES.LEGACY_NAMESPACE_HOME);
      revalidatePath("/groups");
      revalidatePath("/dashboard");
      redirect(STUDENT_ROUTES.HOME);
    }

    await initiateAdvisorIndication(id, String(firstPreferenceId));

    revalidatePath(`/estudante/groups/${id}/advisor-indication`);
    revalidatePath(`/student/groups/${id}/advisor-indication`);
    revalidatePath(`/groups/${id}`);
    revalidatePath(STUDENT_ROUTES.HOME);
    revalidatePath(STUDENT_ROUTES.LEGACY_NAMESPACE_HOME);
    revalidatePath("/groups");
    revalidatePath("/dashboard");
    redirect(STUDENT_ROUTES.HOME);
  }

  let advisors = [] as Awaited<ReturnType<typeof fetchAllAdvisors>>;
  let advisorsError: string | null = null;
  try {
    advisors = await fetchAllAdvisors();
  } catch (error) {
    advisorsError = error instanceof Error ? error.message : "Erro ao carregar orientadores.";
  }

  let advisorPreferences = [] as Awaited<ReturnType<typeof fetchGroupAdvisorPreferences>>;
  let advisorPreferencesError: string | null = null;
  try {
    advisorPreferences = await fetchGroupAdvisorPreferences(id);
  } catch (error) {
    advisorPreferencesError = error instanceof Error ? error.message : "Erro ao carregar preferências de orientadores.";
  }

  const group = context.group;
  const indicatedAdvisor = advisors.find((advisor) => idsAreEqual(advisor.id, group.indicated_advisor_id));
  const preferenceAdvisor1 = advisorPreferences.find((item) => item.preference_order === 1);
  const preferenceAdvisor2 = advisorPreferences.find((item) => item.preference_order === 2);
  const preferenceAdvisor3 = advisorPreferences.find((item) => item.preference_order === 3);
  const preferredAdvisor1 = advisors.find((advisor) => idsAreEqual(advisor.id, preferenceAdvisor1?.advisor_id));
  const preferredAdvisor2 = advisors.find((advisor) => idsAreEqual(advisor.id, preferenceAdvisor2?.advisor_id));
  const preferredAdvisor3 = advisors.find((advisor) => idsAreEqual(advisor.id, preferenceAdvisor3?.advisor_id));

  return (
    <main className="min-h-screen bg-transparent">
      <section className="max-w-5xl mx-auto px-6 py-7 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tca-title-guide">Indicação de orientadores</h1>
            <p className="text-gray-600 mt-1.5">
              Defina a ordem de preferência do grupo e envie a indicação para acompanhamento pedagógico.
            </p>
          </div>

          <Link href={STUDENT_ROUTES.HOME} className="text-sm font-medium text-[#2F6F35] hover:underline">
            ← Voltar para a área do estudante
          </Link>
        </div>

        <Card className="border border-[#E5E7EB] bg-white/90">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-[#1F2937]">Situação da indicação</p>
              <p className="text-sm text-[#374151]">
                <span className="font-medium">Grupo:</span> {group.theme || `Grupo ${String(group.id).slice(0, 8)}`}
              </p>
              <p className="text-sm text-[#374151]">
                <span className="font-medium">Status:</span>{" "}
                {group.indication_status === "pendente" ? "Aguardando confirmação do orientador" : group.indication_status === "aceita" ? "Indicação aceita" : group.indication_status === "recusada" ? "Orientador indisponível" : "Sem indicação ativa"}
              </p>
              <p className="text-sm text-[#374151]">
                <span className="font-medium">Orientador indicado:</span>{" "}
                {indicatedAdvisor
                  ? `${indicatedAdvisor.name} — ${getAdvisorRoleLabel(indicatedAdvisor.role_title)}`
                  : "Ainda não definido"}
              </p>
            </div>

            <Badge variant={group.indication_status === "aceita" ? "green" : group.indication_status === "pendente" ? "yellow" : "gray"}>
              {group.indication_status === "aceita" ? "Acompanhamento definido" : group.indication_status === "pendente" ? "Aguardando confirmação" : group.indication_status === "recusada" ? "Indisponível" : "Ação do grupo"}
            </Badge>
          </div>
        </Card>

        <Card accent="green" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1F2937]">Preferências do grupo</h2>
            <p className="text-sm text-[#4B5563] mt-1">
              Organize até três nomes por ordem de preferência. Ao salvar, o sistema envia a solicitação para o primeiro orientador da lista e o status só muda depois da resposta dele.
            </p>
          </div>

          {query.pref_error === "duplicate" && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              O mesmo orientador foi selecionado em mais de uma posição. Escolha nomes diferentes.
            </div>
          )}

          {query.pref_error === "save" && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Não foi possível salvar as preferências agora. Tente novamente.
            </div>
          )}

          {query.pref_success === "1" && query.indication === "pending" && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Preferências salvas e solicitação enviada ao primeiro orientador da lista. Agora a indicação está aguardando resposta.
            </div>
          )}

          {query.pref_success === "1" && query.indication !== "pending" && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Ordem de preferência salva com sucesso.
            </div>
          )}

          {query.indication === "unavailable" && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Orientador indisponível para essa orientação. Ajuste a ordem de preferência e tente novamente.
            </div>
          )}

          {advisorPreferencesError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {advisorPreferencesError}
            </div>
          )}

          <form action={handleSaveAdvisorPreferences} className="space-y-4">
            <div>
              <div className="overflow-x-auto rounded-xl border border-[#DCEBD5]">
                <table className="min-w-full divide-y divide-[#DCEBD5] bg-white">
                  <thead className="bg-[#F8FBF6]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#4B5563]">Ordem</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#4B5563]">Orientador</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#4B5563]">Função</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#4B5563]">Disponibilidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2E8]">
                    {[
                      { order: 1, fieldName: "preference_1", advisor: preferredAdvisor1 },
                      { order: 2, fieldName: "preference_2", advisor: preferredAdvisor2 },
                      { order: 3, fieldName: "preference_3", advisor: preferredAdvisor3 },
                    ].map(({ order, fieldName, advisor }) => {
                      const availability = getAdvisorAvailabilityMeta(advisor, group, order);

                      return (
                        <tr key={fieldName} className="align-top">
                          <td className="px-4 py-4 text-sm font-semibold text-[#1F2937] whitespace-nowrap">
                            {order}ª preferência
                          </td>
                          <td className="px-4 py-4 min-w-[260px]">
                            <select
                              id={fieldName}
                              name={fieldName}
                              defaultValue={advisor ? String(advisor.id) : ""}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-lime-500 text-sm"
                            >
                              <option value="">— Nenhum —</option>
                              {advisors.map((currentAdvisor) => (
                                <option key={currentAdvisor.id} value={String(currentAdvisor.id)}>
                                  {getAdvisorOptionLabel(currentAdvisor.name, currentAdvisor.role_title)}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-4 text-sm text-[#374151] min-w-[180px]">
                            {advisor ? getAdvisorRoleLabel(advisor.role_title) : "—"}
                          </td>
                          <td className="px-4 py-4 min-w-[220px]">
                            <div className="flex flex-col gap-1.5">
                              <Badge variant={availability.badgeVariant} className="w-fit">
                                {availability.label}
                              </Badge>
                              <p className="text-xs text-[#6B7280]">{availability.helper}</p>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {advisorsError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {advisorsError}
              </div>
            )}

            <div className="rounded-xl border border-[#F3E2A3] bg-[#FFFDF5] px-4 py-4 text-sm text-[#374151] leading-relaxed">
              <p>
                Ao salvar, o sistema guarda a ordem de preferência e já envia a solicitação para o primeiro orientador da lista.
              </p>
              <p className="mt-2">
                A coluna de disponibilidade permanece em <strong>“Aguardando confirmação”</strong> até o orientador registrar <strong>aceite</strong> ou <strong>indisponibilidade</strong>.
              </p>
            </div>

            <button
              type="submit"
              className="bg-lime-700 hover:bg-lime-800 text-white font-medium px-4 py-2 rounded-md text-sm"
            >
              Salvar preferências e enviar solicitação
            </button>
          </form>
        </Card>
      </section>
    </main>
  );
}
