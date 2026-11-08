import Link from "next/link";
import { RichText } from "@/components/rich-text/rich-text";
import type { MentionEntity } from "@/components/rich-text/mention-chip";
import type { RevealNode } from "@/db/reveals";
import { formatGate, type Branch } from "@/lib/reveals";

type TreeProps = { nodes: RevealNode[]; entities: Map<string, MentionEntity>; entityHref: string };

const controlClass = "text-xs text-muted-foreground hover:text-foreground hover:underline";

/** Prep view of an entry's hidden layers: every layer is shown to the GM, marked with its check. */
export function RevealTree({ nodes, entities, entityHref }: TreeProps) {
  return (
    <ul className="flex flex-col gap-3">
      {nodes.map((node) => (
        <RevealLayer key={node.id} node={node} entities={entities} entityHref={entityHref} />
      ))}
    </ul>
  );
}

function RevealLayer({ node, entities, entityHref }: Omit<TreeProps, "nodes"> & { node: RevealNode }) {
  const gate = formatGate(node);
  return (
    <li aria-label={gate} className="flex flex-col gap-2 rounded-md border border-dashed p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <span aria-hidden>🔒</span>
          {gate}
        </p>
        <Link href={`${entityHref}/reveals/${node.id}/edit`} aria-label={`Edit ${gate}`} className={controlClass}>
          Edit
        </Link>
      </div>
      <Outcome branch="success" node={node} entities={entities} entityHref={entityHref} />
      {(node.failureBody || node.children.failure.length > 0) && (
        <Outcome branch="failure" node={node} entities={entities} entityHref={entityHref} />
      )}
    </li>
  );
}

const OUTCOME = {
  success: { label: "On success", mark: "✓" },
  failure: { label: "On failure", mark: "✗" },
} as const;

function Outcome({
  branch,
  node,
  entities,
  entityHref,
}: Omit<TreeProps, "nodes"> & { branch: Branch; node: RevealNode }) {
  const { label, mark } = OUTCOME[branch];
  const body = branch === "success" ? node.successBody : node.failureBody;
  const nested = node.children[branch];
  return (
    <div aria-label={label} role="group" className="flex flex-col gap-2 border-l-2 pl-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span aria-hidden>{mark} </span>
        {label}
      </p>
      {body ? <RichText doc={body} entities={entities} /> : <p className="text-sm text-muted-foreground">Nothing.</p>}
      {nested.length > 0 && <RevealTree nodes={nested} entities={entities} entityHref={entityHref} />}
    </div>
  );
}
