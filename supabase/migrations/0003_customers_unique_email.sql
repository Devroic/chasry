-- A user could otherwise create two client records with the identical email
-- by mistake — confusing when picking a client on the invoice form, and no
-- way to tell which one an old invoice belongs to. Scoped per-user (not
-- globally unique), since two different Chasry accounts may legitimately
-- share a client.
alter table public.customers
  add constraint customers_user_id_email_key unique (user_id, email);
