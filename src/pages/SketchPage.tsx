import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SketchCanvas } from "@/components/sketch/SketchCanvas";
import { SketchToolbar } from "@/components/sketch/SketchToolbar";
import { MySketches } from "@/components/sketch/MySketches";
import { toolHint } from "@/lib/sketch/toolMeta";
import { initialSketchState, reduce } from "@/lib/sketch/tools";
import {
  freshId,
  parseConstruction,
  serializeConstruction,
} from "@/lib/sketch/serialize";
import { deleteSketch, loadSketch, saveSketch } from "@/lib/sketch/sketchStore";
import { useSketches } from "@/lib/sketch/useSketches";
import type { Construction } from "@/lib/sketch/types";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function SketchPage() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const { sketches, loading, env, refresh } = useSketches();

  const [state, dispatch] = useReducer(reduce, initialSketchState);
  const [title, setTitle] = useState("Untitled sketch");
  const [currentId, setCurrentId] = useState<string | null>(routeId ?? null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Latest values for the debounced autosave closure + createdAt preservation.
  const createdAtRef = useRef<number>(Date.now());
  const stepsRef = useRef(state.steps);
  const titleRef = useRef(title);
  stepsRef.current = state.steps;
  titleRef.current = title;

  // Load a sketch when the route id changes (deep link / open from the list).
  useEffect(() => {
    if (!routeId || routeId === currentId) return;
    let cancelled = false;
    void loadSketch(env, routeId).then((c) => {
      if (cancelled || !c) return;
      dispatch({ type: "load", steps: c.steps });
      setTitle(c.title);
      setCurrentId(c.id);
      createdAtRef.current = c.createdAt;
      setStatus("idle");
    });
    return () => {
      cancelled = true;
    };
  }, [routeId, env, currentId]);

  const persist = useCallback(
    async (opts?: { silent?: boolean }) => {
      const id = currentId ?? freshId();
      const construction: Construction = {
        id,
        title: titleRef.current.trim() || "Untitled sketch",
        steps: stepsRef.current,
        createdAt: createdAtRef.current,
        updatedAt: Date.now(),
      };
      if (!opts?.silent) setStatus("saving");
      try {
        await saveSketch(env, construction);
        if (currentId !== id) {
          setCurrentId(id);
          navigate(`/sketch/${id}`, { replace: true });
        }
        if (!opts?.silent) setStatus("saved");
        void refresh();
      } catch {
        setStatus("error");
      }
    },
    [currentId, env, navigate, refresh],
  );

  // Debounced autosave once the sketch has been saved at least once.
  useEffect(() => {
    if (currentId == null) return;
    const t = setTimeout(() => void persist({ silent: true }), 1000);
    return () => clearTimeout(t);
  }, [state.steps, title, currentId, persist]);

  const handleNew = () => {
    dispatch({ type: "clear" });
    setTitle("Untitled sketch");
    setCurrentId(null);
    createdAtRef.current = Date.now();
    setStatus("idle");
    navigate("/sketch");
  };

  const handleDelete = async (id: string) => {
    await deleteSketch(env, id);
    await refresh();
    if (id === currentId) handleNew();
  };

  const handleExport = () => {
    const construction: Construction = {
      id: currentId ?? freshId(),
      title: title.trim() || "Untitled sketch",
      steps: state.steps,
      createdAt: createdAtRef.current,
      updatedAt: Date.now(),
    };
    const blob = new Blob([serializeConstruction(construction)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${construction.title.replace(/[^\w-]+/g, "-").toLowerCase()}.sketch.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File) => {
    try {
      const c = parseConstruction(await file.text());
      dispatch({ type: "load", steps: c.steps });
      setTitle(c.title);
      setCurrentId(null); // imported → save creates a new sketch
      createdAtRef.current = Date.now();
      setStatus("idle");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not import that file.");
    }
  };

  const statusLabel =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? env.uid
          ? "Saved to your account"
          : "Saved locally"
        : status === "error"
          ? "Save failed"
          : "";

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-vermilion">Sketch</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">Construct &amp; explore</h1>
        <p className="mt-3 max-w-2xl font-serif text-lg leading-relaxed text-ink-soft">
          A free geometry canvas. Pick a tool, click to build points, lines, and circles, then
          switch to <span className="font-semibold">Move</span> and drag a point to watch the whole
          construction update.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_17rem]">
        <div className="flex flex-col gap-4">
          <SketchToolbar mode={state.mode} onSelect={(mode) => dispatch({ type: "setMode", mode })} />
          <p className="font-serif text-sm text-ink-soft" aria-live="polite">
            {toolHint(state.mode)}
          </p>
          <SketchCanvas steps={state.steps} mode={state.mode} dispatch={dispatch} />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void persist()}
              className="rounded-sm bg-ultramarine px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-paper transition hover:opacity-90"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleNew}
              className="rounded-sm border border-rule px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink-soft transition hover:border-ink-faint hover:text-ink"
            >
              New
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "clear" })}
              className="rounded-sm border border-rule px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink-soft transition hover:border-vermilion hover:text-vermilion"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-sm border border-rule px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink-soft transition hover:border-ink-faint hover:text-ink"
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-sm border border-rule px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink-soft transition hover:border-ink-faint hover:text-ink"
            >
              Import
            </button>
            <span className="ml-auto font-mono text-xs text-ink-faint" aria-live="polite">
              {statusLabel || `${state.steps.length} object${state.steps.length === 1 ? "" : "s"}`}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportFile(file);
                e.target.value = "";
              }}
            />
          </div>
          {error && (
            <p className="font-serif text-sm text-vermilion" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Sketch title"
            className="w-full rounded-sm border border-rule bg-paper px-3 py-2 font-display text-lg text-ink outline-none focus:border-ultramarine"
          />
          <MySketches
            sketches={sketches}
            loading={loading}
            currentId={currentId}
            onOpen={(id) => navigate(`/sketch/${id}`)}
            onDelete={(id) => void handleDelete(id)}
          />
        </div>
      </div>
    </div>
  );
}
