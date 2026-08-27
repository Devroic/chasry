# Theme (dark/light)

Read this before touching `theme-provider.tsx`, `theme-toggle.tsx`, or dark-mode color values.

`components/theme-provider.tsx` wraps `next-themes` with `attribute="class"`,
`defaultTheme="light"`, `enableSystem={false}` — a visitor with no stored preference always sees
light. `enableSystem` is off because `ThemeToggle` only ever sets an explicit `"light"`/`"dark"`
value. Once a user toggles, `next-themes` persists the choice to `localStorage` and it's
respected thereafter.

`components/theme-toggle.tsx` **must never branch on `resolvedTheme` during render** — both
icons and both `sr-only` labels stay in the DOM always, `dark:hidden`/`dark:block` picks one.
`next-themes` injects a blocking inline script that applies the stored theme before React
hydrates, so a render-time branch on `resolvedTheme` produces a real hydration mismatch for any
visitor who'd previously toggled to dark (reproduces only with a stored dark preference, easy to
miss). Reading `resolvedTheme` inside an `onClick` handler is fine, it runs after hydration.
`SiteHeader` and `DashboardShell` each render two `<Image>` logos (`dark:hidden`/`hidden
dark:block`) rather than one, since the brand logo file itself isn't theme-aware. Every
`bg-white`/`text-white`/`from-white` literal must use the `background`/`foreground` semantic
tokens instead, a literal white background doesn't react to the class-based toggle.

**Dark-mode `--brand-primary` is `#7b9bdb`, `--brand-primary-hover` is `#8bacdf`** (both only in
the `.dark` block in `app/globals.css`), chosen for text contrast (6.25:1+ against dark
background/card/tint surfaces, WCAG AA) across the ~25 places that use `text-brand-primary` as a
link/badge/active-nav-item color. The one place `--brand-primary` is used as a *background*
rather than text, `DashboardShell`'s account-menu avatar (`bg-brand-primary text-white`), keeps
an explicit `dark:bg-[#3f63b8]` override instead of the variable, since lightening it there would
break white-text contrast the other way. Any new dark-mode *background* usage of
`--brand-primary` needs the same kind of explicit override, don't assume the variable is
background-safe.
