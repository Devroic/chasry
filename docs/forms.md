# Forms & validation

Read this before adding or editing any form (auth, onboarding, or dashboard CRUD).

**Pending state is `<Button loading>`, not `disabled={pending}`.** The shared `Button` takes a
`loading` prop that renders a `Loader2` spinner, sets `aria-busy`, and disables the button. Use
`loading={pending}` on any new async action; keep `disabled` for genuine "not allowed yet" states
(can combine both). Ignored under `asChild`, where the child owns its content.

**Success feedback is a toast, not an inline `<Alert>`** — `lib/use-success-toast.ts`'s
`useSuccessToast(state)`. Keys on the `useActionState` state object's **identity**, not the
message string, so saving twice in a row toasts twice (a `[message]` dependency would swallow
the second one).

**Every form** (auth, onboarding, and dashboard CRUD: customer/invoice/profile/reminder-settings)
uses `react-hook-form` + `zodResolver` **directly in the component**, `mode: "onSubmit"`,
`reValidateMode: "onChange"`, paired with `<FormField>` (`components/ui/form-field.tsx`, label +
input + inline red error text) and `Input`'s `aria-invalid:border-destructive` styling
(`aria-invalid={!!errors.field}` on each input). Don't reintroduce native
`required`/`type="email"` HTML validation or a new form on plain `FormData` without a specific
reason.

> **`mode` must stay `"onSubmit"`, not `"onBlur"`.** `"onBlur"` validates the instant a field is
> left, so navigating away from a half-filled form pops an error on the way out, and errors
> appear one at a time as the user tabs through. `"onSubmit"` means nothing validates until
> submit, and then every field reports at once (zod returns all issues).
> `reValidateMode: "onChange"` clears an error live once fixed, after a failed submit.

Every password field uses `<PasswordInput>` (`components/ui/password-input.tsx`) instead of a
bare `<Input type="password">`, it adds a show/hide eye toggle (`type="button"`, `tabIndex={-1}`)
and forwards every other prop through.

The bridge to the Server Action: `handleSubmit`'s `onValid` callback converts validated data with
`toFormData()` (`lib/utils.ts`) and calls the `useActionState` dispatcher directly as a plain
function.

**Gotcha**: that direct call must be wrapped in
`startTransition(() => formAction(toFormData(data)))` (`import { startTransition } from
"react"`). Without it, React throws "An async function with useActionState was called outside of
a transition", since a plain function call doesn't get the automatic transition wrapping a native
`<form action={formAction}>` binding gets. Any new form on this pattern needs the wrapper.

**Tried and abandoned**: a generic `useZodForm(schema)` wrapper hook. Zod 4's inferred
input/output types (relevant since `optionalUrl`/`optionalText()` in `lib/validations/shared.ts`
transform `""` → `null`, so a schema's input and output shapes differ) don't survive an extra
generic function boundary, TypeScript can't prove `z.infer<Schema>` satisfies RHF's `FieldValues`
that many layers down. Call `useForm<Input, unknown, Output>({ resolver: zodResolver(schema) })`
directly in each component instead (verbose, but every type resolves cleanly), or the 3-generic
form (`z.input<Schema>`/`unknown`/`z.infer<Schema>`) when the schema has a `.transform()`.

**`toFormData()` converts `null` → empty string, `undefined` → omitted.** Every optional-string
schema field must transform blank input to `null`, never `undefined` (see `optionalUrl`/
`optionalText()`), since `undefined` gets dropped entirely and a `.update()` call with a missing
key leaves the old value in place instead of blanking it out on clear.

Forms already on this pattern don't need the hidden-input `Select`/`Switch` workaround from
`ARCHITECTURE.md`'s "Critical gotcha" in the Stack section, react-hook-form's
`Controller`/`watch`/`setValue` read from RHF's own state, not native `FormData`. That gotcha
still applies to any *new* form that stays on plain `FormData`.
