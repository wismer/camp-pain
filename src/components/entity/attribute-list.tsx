import { ATTRIBUTE_FIELDS, type EntityType } from "@/lib/entities";

export function AttributeList({
  type,
  attributes,
}: {
  type: EntityType;
  attributes: Record<string, unknown>;
}) {
  const entries = ATTRIBUTE_FIELDS[type]
    .map((field) => ({ ...field, value: attributes[field.key] }))
    .filter(
      ({ value }) => value !== undefined && value !== "" && !(Array.isArray(value) && value.length === 0),
    );
  if (entries.length === 0) return null;

  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
      {entries.map(({ key, label, value }) => (
        <div key={key} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
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
