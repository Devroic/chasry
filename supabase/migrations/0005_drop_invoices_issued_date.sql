-- invoices.issued_date was never read by the reminder engine (which is
-- driven entirely by due_date) and wasn't surfaced in list/sort/filter
-- anywhere — just a rarely-touched form field defaulting to today. Removed
-- from the form and validation first, then dropped here once confirmed
-- unused, same pattern as profiles.timezone (0002_drop_profiles_timezone.sql).
alter table public.invoices drop column if exists issued_date;
