import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AsciiType, type WorkspaceMode } from "../workspace/ascii-type";
import { Button } from "../ui/base/button";
import type { CompactConfiguration } from "./compact-types";
import { CompactEditor } from "./compact-editor";

export function CompactWorkspace({
  active,
  maxEncodedBytes,
  onModeChange
}: {
  active: boolean;
  maxEncodedBytes: number;
  onModeChange: (mode: WorkspaceMode) => void;
}) {
  const [configuration, setConfiguration] =
    useState<CompactConfiguration | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const restoreTabFocus = useRef(false);
  useLayoutEffect(() => {
    if (configuration && active && restoreTabFocus.current) {
      document
        .querySelector<HTMLElement>(
          '[data-workspace="mini-art"] [role="tab"][aria-selected="true"]'
        )
        ?.focus();
      restoreTabFocus.current = false;
    }
  }, [configuration, active]);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/compact/options", {
          signal: controller.signal
        });
        if (!response.ok)
          throw new Error(
            "Cannot load Mini art settings. Check the connection and retry."
          );
        const result = (await response.json()) as CompactConfiguration;
        if (!controller.signal.aborted) {
          restoreTabFocus.current =
            document.activeElement?.getAttribute("role") === "tab" &&
            document.activeElement?.getAttribute("aria-selected") === "true";
          setConfiguration(result);
        }
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Cannot load Mini art settings. Retry the connection."
          );
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);
  if (configuration)
    return (
      <CompactEditor
        configuration={configuration}
        maxEncodedBytes={maxEncodedBytes}
        active={active}
        onModeChange={onModeChange}
      />
    );
  return (
    <main className="mx-auto flex w-full max-w-480 flex-1 flex-col gap-4 p-4 sm:p-6 lg:flex-row lg:p-6 xl:p-8">
      <aside className="shrink-0 lg:w-48 xl:w-52 2xl:w-56">
        <AsciiType mode="mini-art" onChange={onModeChange}>
          <p className="text-xs text-muted-foreground">
            Compact, copyable dot art.
          </p>
        </AsciiType>
      </aside>
      <section
        aria-label="Mini art preview"
        className="flex min-h-96 flex-1 items-center justify-center rounded-xl border bg-card p-6"
      >
        {error ? (
          <div className="max-w-sm space-y-4 text-center">
            <p role="alert" className="text-sm">
              {error}
            </p>
            <Button
              onClick={() => {
                setError(null);
                setAttempt((value) => value + 1);
              }}
            >
              Retry connection
            </Button>
          </div>
        ) : (
          <p role="status" className="text-sm text-muted-foreground">
            Opening Mini art…
          </p>
        )}
      </section>
    </main>
  );
}
