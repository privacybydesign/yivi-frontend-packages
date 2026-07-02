/**
 * Widget translation strings.
 *
 * HTML-rendering contract — READ BEFORE POPULATING FROM DYNAMIC DATA:
 * All `string` fields below are injected into the DOM as raw HTML (via
 * `innerHTML`) so that intentional markup — e.g. the `<i>`/`<a>`/`<br>` in the
 * default `header`, `helper` and `timeout` strings — renders. These strings are
 * therefore a trusted, developer-controlled template. NEVER build them from
 * user input or any other untrusted source: doing so introduces (stored) XSS in
 * the embedding page. Ship them as static constants (as the bundled `en`/`nl`
 * do), or HTML-escape any dynamic value before interpolating it.
 *
 * Exception — `pairingFailed`: its return value is rendered as plain text
 * (`textContent`), not HTML, because it interpolates the user-entered pairing
 * code. Markup in a custom `pairingFailed` translation is shown literally rather
 * than parsed, and any `code` passed in is safe by construction.
 */
export interface Translations {
  header: string;
  helper: string;
  loading: string;
  button: string;
  qrCode: string;
  app: string;
  retry: string;
  back: string;
  cancelled: string;
  timeout: string;
  error: string;
  browser: string;
  success: string;
  cancel: string;
  pairing: string;
  pairingFailed: (code: string) => string;
}
