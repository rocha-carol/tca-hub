// Quando não houver valor, retorna texto vazio para evitar erro na interface.
export function formatDate(dateString?: string) {
  if (!dateString) return "";

  return new Date(dateString).toLocaleDateString("pt-BR");
}