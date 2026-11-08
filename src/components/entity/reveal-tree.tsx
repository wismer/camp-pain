import Link from "next/link";
import { moveRevealAction } from "@/app/actions/reveals";
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
      {nodes.map((node, i) => (
        <RevealLayer
          key={node.id}
          node={node}
          entities={entities}
          entityHref={entityHref}
          first={i === 0}
          last={i === nodes.length - 1}
        />
      ))}
    </ul>
  );
}

type LayerProps = Omit<TreeProps, "nodes"> & { node: RevealNode; first: boolean; last: boolean };

function RevealLayer({ node, entities, entityHref, first, last }: LayerProps) {
  const gate = formatGate(node);
  const showFailure = node.failureBody || node.children.failure.length > 0;
  return (
    <li aria-label={gate} className="flex flex-col gap-2 rounded-md border border-dashed p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <span aria-hidden>🔒</span>
          {gate}
        </p>
        <div className="flex items-center gap-3">
          {!first && <MoveButton id={node.id} direction="up" gate={gate} />}
          {!last && <MoveButton id={node.id} direction="down" gate={gate} />}
          <Link
            href={`${entityHref}/reveals/${node.id}/edit`}
            aria-label={`Edit ${gate}`}
            className={controlClass}
          >
            Edit
          </Link>
        </div>
      </div>
      <Outcome branch="success" node={node} entities={entities} entityHref={entityHref} />
      {showFailure ? (
        <Outcome branch="failure" node={node} entities={entities} entityHref={entityHref} />
      ) : (
        <DeeperLink node={node} branch="failure" entityHref={entityHref} />
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
      {body ? (
        <RichText doc={body} entities={entities} unlinkFrom={{ revealId: node.id }} />
      ) : (
        <p className="text-sm text-muted-foreground">Nothing.</p>
      )}
      {nested.length > 0 && <RevealTree nodes={nested} entities={entities} entityHref={entityHref} />}
      <DeeperLink node={node} branch={branch} entityHref={entityHref} />
    </div>
  );
}

function DeeperLink({ node, branch, entityHref }: { node: RevealNode; branch: Branch; entityHref: string }) {
  return (
    <Link
      href={`${entityHref}/reveals/new?parent=${node.id}&branch=${branch}`}
      className={`self-start ${controlClass}`}
    >
      + Deeper on {branch}
    </Link>
  );
}

function MoveButton({ id, direction, gate }: { id: string; direction: "up" | "down"; gate: string }) {
  return (
    <form action={moveRevealAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="direction" value={direction} />
      <button type="submit" aria-label={`Move ${gate} ${direction}`} className={controlClass}>
        {direction === "up" ? "↑" : "↓"}
      </button>
    </form>
  );
}
