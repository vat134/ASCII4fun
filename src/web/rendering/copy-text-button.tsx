import { useEffect, useState } from "react";
import { Button } from "../ui/base/button";
import { CheckIcon, CopyIcon } from "../ui/icons";

const copiedFeedbackDurationMs = 1500;

export function CopyTextButton({ text }: { text: string | null }) {
  const [status, setStatus] = useState<{
    text: string;
    kind: "copying" | "copied" | "error";
  } | null>(null);
  const current = status?.text === text ? status.kind : null;

  useEffect(() => {
    if (status?.kind !== "copied") return;
    const timer = window.setTimeout(
      () => setStatus(null),
      copiedFeedbackDurationMs
    );
    return () => window.clearTimeout(timer);
  }, [status]);

  async function copy() {
    if (text === null) return;
    setStatus({ text, kind: "copying" });
    try {
      await navigator.clipboard.writeText(text);
      setStatus({ text, kind: "copied" });
    } catch {
      setStatus({ text, kind: "error" });
    }
  }

  return (
    <div className="flex max-w-40 flex-col items-end gap-1 py-2">
      <Button
        variant="ghost"
        disabled={text === null || current === "copying"}
        aria-label="Copy text"
        onClick={() => void copy()}
      >
        {current === "copied" ? (
          <CheckIcon aria-hidden="true" />
        ) : (
          <CopyIcon aria-hidden="true" />
        )}
        <span aria-live="polite">
          {current === "copied" ? "Copied" : "Copy text"}
        </span>
      </Button>
      {current === "error" && (
        <p role="alert" className="text-xs text-destructive">
          Copy blocked. Allow clipboard access and retry.
        </p>
      )}
    </div>
  );
}
