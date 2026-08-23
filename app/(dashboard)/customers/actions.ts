"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { customerSchema } from "@/lib/validations/customer";
import { decodeReminderOverride } from "@/lib/reminder-override";

export type CustomerFormState = { error?: string } | null;

function parseCustomerForm(formData: FormData) {
  return customerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    notes: formData.get("notes"),
    payment_link: formData.get("payment_link"),
    ...decodeReminderOverride(formData),
  });
}

/** Postgres unique-violation on `customers_user_id_email_key` → a friendly message. */
function isDuplicateEmailError(error: { code?: string } | null) {
  return error?.code === "23505";
}

export async function createCustomer(
  _prev: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const parsed = parseCustomerForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("customers")
    .insert({ ...parsed.data, user_id: user.id })
    .select("id")
    .single();

  if (error || !data) {
    if (isDuplicateEmailError(error)) {
      return { error: "You already have a client with this email." };
    }
    return { error: "Couldn't save this client. Try again." };
  }

  revalidatePath("/customers");

  const returnTo = formData.get("return_to");
  if (typeof returnTo === "string" && returnTo) {
    redirect(`${returnTo}?new_customer_id=${data.id}`);
  }
  redirect(`/customers/${data.id}`);
}

export async function updateCustomer(
  customerId: string,
  _prev: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const parsed = parseCustomerForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("customers")
    .update(parsed.data)
    .eq("id", customerId)
    .eq("user_id", user.id);

  if (error) {
    if (isDuplicateEmailError(error)) {
      return { error: "You already have a client with this email." };
    }
    return { error: "Couldn't save changes. Try again." };
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}

export async function deleteCustomer(customerId: string) {
  const { supabase, user } = await requireUser();

  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .eq("user_id", user.id);

  if (count && count > 0) {
    redirect(`/customers/${customerId}?error=has_invoices`);
  }

  await supabase.from("customers").delete().eq("id", customerId).eq("user_id", user.id);
  revalidatePath("/customers");
  redirect("/customers");
}
