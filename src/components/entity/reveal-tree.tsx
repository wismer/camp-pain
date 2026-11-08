import { RichText } from "@/components/rich-text/rich-text";
import type { MentionEntity } from "@/components/rich-text/mention-chip";
import type { RevealNode } from "@/db/reveals";
import { formatGate } from "@/lib/reveals";

/** Prep view of an entry's hidden layers: every layer is shown to the GM, marked with its check. */
export function RevealTree({
  nodes,
  entities,
}: {
  nodes: RevealNode[];
  entities: Map<string, MentionEntity>;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {nodes.map((node) => (
        <RevealLayer key={node.id} node={node} entities={entities} />
      ))}
    </ul>
  );
}

function RevealLayer({ node, entities }: { node: RevealNode; entities: Map<string, MentionEntity> }) {
  const gate = formatGate(node);
  return (
    <li aria-label={gate} className="flex flex-col gap-2 rounded-md border border-dashed p-3">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <span aria-hidden>🔒</span>
        {gate}
      </p>
      <Outcome
        label="On success"
        mark="✓"
        body={node.successBody}
        nested={node.children.success}
        entities={entities}
      />
      {(node.failureBody || node.children.failure.length > 0) && (
        <Outcome
          label="On failure"
          mark="✗"
          body={node.failureBody}
          nested={node.children.failure}
          entities={entities}
        />
      )}
    </li>
  );
}

type OutcomeProps = {
  label: string;
  mark: string;
  body: RevealNode["successBody"];
  nested: RevealNode[];
  entities: Map<string, MentionEntity>;
};

function Outcome({ label, mark, body, nested, entities }: OutcomeProps) {
  return (
    <div aria-label={label} role="group" className="flex flex-col gap-2 border-l-2 pl-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span aria-hidden>{mark} </span>
        {label}
      </p>
      {body ? (
        <RichText doc={body} entities={entities} />
      ) : (
        <p className="text-sm text-muted-foreground">Nothing.</p>
      )}
      {nested.length > 0 && <RevealTree nodes={nested} entities={entities} />}
    </div>
  );
}
