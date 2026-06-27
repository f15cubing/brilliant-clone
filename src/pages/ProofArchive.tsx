import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MathText } from "@/components/MathText";
import { Spinner } from "@/components/Spinner";
import { useAuth } from "@/lib/auth/AuthContext";
import { factLabel } from "@/lib/freeplay/dsl";
import {
  loadLatestSolvedProofs,
  type ArchivedProof,
} from "@/lib/freeplay/proofArchive";
import type { Difficulty } from "@/lib/freeplay/types";

const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  intro: "border-correct/40 bg-correct/10 text-correct",
  core: "border-ultramarine/40 bg-ultramarine/10 text-ultramarine",
  challenge: "border-vermilion/40 bg-vermilion/10 text-vermilion",
};

function formatDate(ms: number): string {
  if (!ms) return "";
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function ProofArchive() {
  const { user, configured, loading: authLoading } = useAuth();
  // `null` = still loading; `[]` = loaded but empty.
  const [proofs, setProofs] = useState<ArchivedProof[] | null>(null);
  const [selected, setSelected] = useState<ArchivedProof | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setProofs(null);
    loadLatestSolvedProofs({ configured, uid: user?.uid ?? null })
      .then((list) => {
        if (!cancelled) setProofs(list);
      })
      .catch(() => {
        if (!cancelled) setProofs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [configured, user, authLoading]);

  return (
    <div className="flex flex-col gap-9">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-vermilion">
          Your proofs
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">
          Solved proofs
        </h1>
        <p className="mt-3 max-w-2xl font-serif text-lg leading-relaxed text-ink-soft">
          Every Freeplay puzzle you have proved, saved here to revisit step by
          step.
          {!configured && " Stored on this device while in guest mode."}
        </p>
      </header>

      {proofs === null ? (
        <div className="grid place-items-center py-20">
          <Spinner label="Loading your proofs…" />
        </div>
      ) : proofs.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="flex flex-col">
          {proofs.map((p) => (
            <li key={p.puzzleId}>
              <button
                type="button"
                onClick={() => setSelected(p)}
                className="group flex w-full flex-col gap-2 border-b border-rule py-5 text-left transition hover:bg-panel-soft"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-sm border px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-wide ${DIFFICULTY_STYLE[p.difficulty]}`}
                  >
                    {p.difficulty}
                  </span>
                  <h2 className="font-display text-xl tracking-tight text-ink">
                    {p.title}
                  </h2>
                  <span className="ml-auto font-mono text-xs text-ink-faint">
                    {p.stepCount} step{p.stepCount === 1 ? "" : "s"}
                    {formatDate(p.solvedAtMillis) &&
                      ` · ${formatDate(p.solvedAtMillis)}`}
                  </span>
                </div>
                <p className="font-serif text-sm text-ink-faint">
                  Goal: <MathText>{factLabel(p.goal)}</MathText>
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <ProofDetailModal proof={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-start gap-4 border border-dashed border-rule bg-panel-soft px-6 py-10">
      <p className="font-serif text-lg text-ink">
        You have not solved any Freeplay proofs yet.
      </p>
      <p className="font-serif text-ink-soft">
        Head to Freeplay, prove a puzzle, and it will show up here.
      </p>
      <Link
        to="/freeplay"
        className="inline-flex items-center gap-2 rounded-sm bg-vermilion px-5 py-2.5 font-semibold text-paper transition hover:bg-vermilion-soft"
      >
        Go to Freeplay <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

function ProofDetailModal({
  proof,
  onClose,
}: {
  proof: ArchivedProof;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-sm border border-rule bg-paper p-6 shadow-[4px_4px_0_0_rgba(27,23,20,0.12)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Proof of ${proof.title}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span
              className={`rounded-sm border px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-wide ${DIFFICULTY_STYLE[proof.difficulty]}`}
            >
              {proof.difficulty}
            </span>
            <h2 className="mt-2 font-display text-2xl tracking-tight text-ink">
              {proof.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-rule px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink-soft transition hover:border-ink-faint hover:text-ink"
          >
            Close
          </button>
        </div>

        {proof.blurb && (
          <p className="mt-2 font-serif text-ink-soft">{proof.blurb}</p>
        )}

        {proof.givens.length > 0 && (
          <section className="mt-5">
            <h3 className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-ink-soft">
              Given
            </h3>
            <ul className="mt-2 flex flex-col gap-1.5 pl-1">
              {proof.givens.map((g, i) => (
                <li key={i} className="font-serif text-ink">
                  <MathText>{factLabel(g)}</MathText>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-5">
          <h3 className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-ink-soft">
            Proof
          </h3>
          <ol className="mt-2 flex list-decimal flex-col gap-2 pl-5">
            {proof.steps.map((s, i) => (
              <li key={i} className="font-serif text-ink">
                <MathText>{s.humanReadable}</MathText>{" "}
                <span className="font-mono text-xs text-ink-faint">
                  — {s.rule}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-5 rounded-sm border border-correct/40 bg-correct/5 p-3">
          <h3 className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-correct">
            Goal reached
          </h3>
          <p className="mt-1 font-serif text-ink">
            <MathText>{factLabel(proof.goal)}</MathText>
          </p>
        </section>

        <div className="mt-6 flex justify-end">
          <Link
            to={`/freeplay/${proof.puzzleId}`}
            className="font-mono text-xs uppercase tracking-wide text-vermilion transition hover:underline"
          >
            Open puzzle →
          </Link>
        </div>
      </div>
    </div>
  );
}
