const LABELS: Record<string, string> = {
  climate: "Climate",
  government: "Government",
  kind: "Kind",
  role: "Role",
  ancestry: "Ancestry",
  pronouns: "Pronouns",
  motivations: "Motivations",
  rarity: "Rarity",
  goals: "Goals",
};

export function AttributeList({ attributes }: { attributes: Record<string, unknown> }) {
  const entries = Object.entries(attributes).filter(
    ([, v]) => v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0),
  );
  if (entries.length === 0) return null;

  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
      {entries.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="text-muted-foreground">{LABELS[key] ?? key}</dt>
          <dd>
            {Array.isArray(value) ? (
              <ul className="list-disc pl-4">
                {value.map((v, i) => (
                  <li key={i}>{String(v)}</li>
                ))}
              </ul>
            ) : (
              String(value)
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
