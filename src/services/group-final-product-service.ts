import { createClient } from "@/lib/supabase/server";
import type {
  GroupFinalProduct,
  UpsertGroupFinalProductData,
} from "@/types/group-final-product";

function isFinalProductTableMissing(message: string) {
  return message.includes("Could not find the table 'public.group_final_product'");
}

function isFinalProductPermissionDenied(message: string, code?: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    code === "42501" ||
    normalizedMessage.includes("permission denied") ||
    normalizedMessage.includes("row-level security")
  );
}

function mapFinalProductError(message: string, code?: string) {
  if (isFinalProductTableMissing(message)) {
    return "Tabela group_final_product ainda não existe no Supabase. Execute o arquivo local database/019_create_group_final_product.sql no SQL Editor.";
  }

  if (isFinalProductPermissionDenied(message, code)) {
    return "Acesso ao módulo de produto final bloqueado por policy/RLS no Supabase. Garanta policies SELECT/INSERT/UPDATE para usuários autenticados.";
  }

  return null;
}

export async function fetchGroupFinalProduct(groupId: string): Promise<GroupFinalProduct | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_final_product")
    .select("*")
    .eq("group_id", groupId)
    .maybeSingle();

  if (error) {
    const mapped = mapFinalProductError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao buscar produto final: ${error.message}`);
  }

  return (data || null) as GroupFinalProduct | null;
}

export async function upsertGroupFinalProduct(data: UpsertGroupFinalProductData): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("group_final_product")
    .upsert({
      group_id: data.group_id,
      title: data.title,
      description: data.description,
      product_format: data.product_format,
      final_link: data.final_link,
      presentation_notes: data.presentation_notes,
      status: data.status,
      author_profile_id: data.author_profile_id,
      author_role: data.author_role,
      author_name: data.author_name,
      updated_at: new Date().toISOString(),
    }, { onConflict: "group_id" });

  if (error) {
    const mapped = mapFinalProductError(error.message, error.code);
    if (mapped) {
      throw new Error(mapped);
    }

    throw new Error(`Erro ao salvar produto final: ${error.message}`);
  }
}
