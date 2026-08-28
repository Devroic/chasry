-- New accounts default to 3/1/on-due/1/3 instead of {-7,-3,1,14}. Only
-- changes the default for new rows; existing users' own schedules are untouched.
alter table public.reminder_settings alter column offsets set default '{-3,-1,0,1,3}';
