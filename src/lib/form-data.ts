// Small readers for submitted form fields. Validation happens in the data layer.

export function formText(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Rich-text editors submit JSON; anything unparseable is passed on so validation rejects it. */
export function formJson(form: FormData, name: string): unknown {
  const value = formText(form, name);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return { invalid: value };
  }
}
