/**
 * Hand-written to match supabase/migrations/0001_init.sql.
 * If you install the Supabase CLI, regenerate with:
 *   npx supabase gen types typescript --project-id <project-ref> > types/database.types.ts
 */
export type SubscriptionStatus = "none" | "active" | "past_due" | "canceled";

export type InvoiceStatus = "unpaid" | "paid" | "canceled";
export type ReminderLogStatus = "sent" | "failed" | "skipped";

type NoRelationships = { Relationships: [] };

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          business_name: string | null;
          email: string;
          currency: string;
          payment_link: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_status: SubscriptionStatus;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          onboarded_at: string | null;
          welcome_email_sent_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      } & NoRelationships;
      customers: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          email: string;
          phone: string | null;
          notes: string | null;
          payment_link: string | null;
          reminder_offsets: number[] | null;
          reminder_enabled: boolean | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["customers"]["Row"]> & {
          user_id: string;
          name: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Row"]>;
      } & NoRelationships;
      invoices: {
        Row: {
          id: string;
          user_id: string;
          customer_id: string;
          invoice_number: string | null;
          amount: number;
          currency: string;
          due_date: string;
          status: InvoiceStatus;
          payment_link: string | null;
          notes: string | null;
          reminder_offsets: number[] | null;
          reminder_enabled: boolean | null;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["invoices"]["Row"]> & {
          user_id: string;
          customer_id: string;
          amount: number;
          due_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["invoices"]["Row"]>;
      } & NoRelationships;
      reminder_settings: {
        Row: {
          user_id: string;
          offsets: number[];
          enabled: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["reminder_settings"]["Row"]> & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["reminder_settings"]["Row"]>;
      } & NoRelationships;
      reminder_logs: {
        Row: {
          id: string;
          invoice_id: string;
          user_id: string;
          offset_days: number;
          status: ReminderLogStatus;
          resend_message_id: string | null;
          error: string | null;
          sent_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["reminder_logs"]["Row"]> & {
          invoice_id: string;
          user_id: string;
          offset_days: number;
          status: ReminderLogStatus;
        };
        Update: Partial<Database["public"]["Tables"]["reminder_logs"]["Row"]>;
      } & NoRelationships;
    };
    Views: Record<string, never>;
    Functions: {
      delete_account: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
  };
}
