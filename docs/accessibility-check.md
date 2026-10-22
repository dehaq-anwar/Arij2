# Manual accessibility check (keyboard and screen readers)

[Deutsch](accessibility-check.de.md)

Before launch (OPERATIONS.md §11) and after larger design changes. The automated tests cannot
judge what a person hears and whether the order makes sense. This check does. It takes about
two hours. Record every finding in the table at the end, with page, language, tool and what
happened.

## What the automated tests already cover

They run in CI on every commit (`npm run test:e2e`):

- axe (WCAG 2.1 A and AA rules) on every page in all three languages, light and dark theme, and
  on the open mobile menu.
- One `h1` per page and no skipped heading level.
- No sideways scrolling at 320 CSS pixels (WCAG 1.4.10, reflow).
- The skip link is the first stop of the Tab key and moves focus to the main content.
- The mobile menu is a modal dialog: Escape closes it and focus returns to the menu button.
- Forms: error summary with links to the fields, focus on the summary after a failed attempt,
  without JavaScript too; motion is off with "reduce motion"; colour contrast of every colour
  pair of the design (`npm run lint`).

## Setup

| Tool | Where |
|---|---|
| NVDA (current version) with Firefox or Chrome | Windows |
| VoiceOver with Safari | macOS (Cmd+F5) and iPhone (Settings → Accessibility) |
| TalkBack with Chrome (optional) | Android |
| Keyboard only, no mouse or touchpad | any browser |

Use the test server with the real content, not the placeholders (`npm run check:content`).

## 1. Keyboard only (website)

On the home page, a project, the membership form and the contact form, in German and Arabic:

- [ ] Tab reaches every link, button and field, in the order they appear on screen (in Arabic
      from right to left).
- [ ] The focus outline is visible on every element, in light and in dark mode.
- [ ] The first Tab shows "Zum Inhalt springen" / "Skip to content" / its Arabic text; Enter
      jumps past the header.
- [ ] Narrow window (or 400 % zoom): the menu button opens the menu; Tab stays inside it; Escape
      closes it and focus is back on the menu button.
- [ ] Language bar: each language can be reached and chosen with Enter; the page opens in that
      language.
- [ ] Forms: every field, checkbox and radio button works with Tab, Space and the arrow keys.
      Send the empty form: focus moves to the error summary; each link in it moves focus to its
      field.
- [ ] Nothing moves by itself for more than five seconds without a way to stop it.

## 2. Screen reader (website)

The same pages with NVDA and with VoiceOver:

- [ ] The page title is read when the page opens and names the page.
- [ ] The heading list (NVDA: Insert+F7; VoiceOver: rotor) shows a sensible outline of the page.
- [ ] Landmarks: header, navigation (main menu and languages, with different names), main,
      footer.
- [ ] Images: each meaningful image has a description that says what it shows; decorative
      images are skipped.
- [ ] Links make sense out of context (the link list of the screen reader), e.g. no row of
      "more".
- [ ] Forms: each field's label, whether it is required, its hint and, after a failed attempt,
      its error are read. The error summary is read when it appears. After sending, the
      confirmation is read.
- [ ] Arabic pages: the screen reader switches to an Arabic voice, and German or English names in
      Arabic text are read in their own language (they carry a `lang` attribute).
- [ ] Pages that exist only in German show a notice; the German text is read with a German voice.

## 3. Control Center

With a test account of each role, never on production data (CONTROL-CENTER.md):

- [ ] Sign-in, the code from the authenticator app and the recovery code work with the keyboard;
      errors are read.
- [ ] The step-up dialog (code before sensitive actions) takes focus, can be closed with Escape,
      and focus returns to the button that opened it.
- [ ] Navigation, lists (sorting, filters, pages), the edit screens of a page and of an
      application, and the notifications work with the keyboard and are read with sensible names.
- [ ] Arabic interface: the order of Tab and of the screen reader follows the text from right
      to left.

## 4. Display settings

- [ ] Browser zoom 200 % and 400 %: nothing is cut off or overlaps; no sideways scrolling except
      wide tables in the Control Center.
- [ ] Text spacing (WCAG 1.4.12), e.g. with a bookmarklet that sets line height 1.5, paragraph
      spacing 2, letter spacing 0.12 and word spacing 0.16: no text is cut off.
- [ ] Windows high-contrast mode (forced colours): buttons, fields, focus and the menu stay
      visible.
- [ ] "Reduce motion" in the operating system: no intros, no smooth scrolling.

## Findings

| Date | Page | Language | Tool | What happened | Severity | Fixed in |
|---|---|---|---|---|---|---|
| | | | | | | |

Severity: **blocker** (a task cannot be completed), **serious** (possible only with
difficulty), **minor**.
