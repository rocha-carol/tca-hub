// Representa uma notificação do sistema.
// Pode ser usada para avisos de conteúdo, orientação e mudanças.
export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at?: string;
}