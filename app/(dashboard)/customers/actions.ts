"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { customerSchema } from "@/lib/validations/customer";
import { decodeReminderOverride } from "@/lib/reminder-override";
import type { Translator } from "@/lib/validations/shared";

export type CustomerFormState = { error?: string } | null;

function parseCustomerForm(formData: FormData, t: Translator) {
  return customerSchema(t).safeParse({
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
  const t = await getTranslations("validation");
  const tErrors = await getTranslations("customers.form.errors");

  const parsed = parseCustomerForm(formData, t);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? t("invalidInput") };

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("customers")
    .insert({ ...parsed.data, user_id: user.id })
    .select("id")
    .single();

  if (error || !data) {
    if (isDuplicateEmailError(error)) {
      return { error: tErrors("duplicateEmail") };
    }
    return { error: tErrors("createFailed") };
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
  const t = await getTranslations("validation");
  const tErrors = await getTranslations("customers.form.errors");
  const tCommon = await getTranslations("common");

  const parsed = parseCustomerForm(formData, t);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? t("invalidInput") };

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("customers")
    .update(parsed.data)
    .eq("id", customerId)
    .eq("user_id", user.id);

  if (error) {
    if (isDuplicateEmailError(error)) {
      return { error: tErrors("duplicateEmail") };
    }
    return { error: tCommon("saveFailed") };
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
