import type { Doc } from "./entities";
import { formJson, formText } from "./form-data";
import type { CheckKind } from "./reveals";

/** Converts submitted reveal form fields into data-layer input. Validation happens in the data layer. */
export function revealFieldsFromForm(form: FormData) {
  const dc = formText(form, "dc");
  return {
    checkKind: formText(form, "checkKind") as CheckKind,
    check: formText(form, "check"),
    // Non-numbers become NaN, which validation rejects.
    dc: dc ? Number(dc) : null,
    successBody: formJson(form, "successBody") as Doc | null,
    failureBody: formJson(form, "failureBody") as Doc | null,
  };
}
