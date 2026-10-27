import { useEffect, useState } from "react";
import { ImageWorkspace } from "./images/image-workspace";
import {
  loadImageConfiguration,
  type ImageConfiguration
} from "./images/image-conversion";
import { AsciiSpinner } from "./ui/ascii-spinner";
import { Button } from "./ui/base/button";

export function App() {
  const [configuration, setConfiguration] = useState<ImageConfiguration | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    loadImageConfiguration(controller.signal).then(
      (result) => {
        if (!controller.signal.aborted) setConfiguration(result);
      },
      (reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Cannot connect to the conversion server."
          );
        }
      }
    );
    return () => controller.abort();
  }, [attempt]);

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      <header className="h-14 shrink-0 border-b" aria-label="ASCII4fun">
        <h1 className="sr-only">ASCII4fun</h1>
      </header>
      {configuration ? (
        <ImageWorkspace configuration={configuration} />
      ) : (
        <main className="grid flex-1 place-items-center p-6">
          <div className="max-w-sm space-y-5 text-center text-sm">
            {error ? (
              <>
                <p role="alert">{error}</p>
                <Button
                  onClick={() => {
                    setError(null);
                    setAttempt((value) => value + 1);
                  }}
                >
                  Retry connection
                </Button>
              </>
            ) : (
              <p role="status" className="flex items-center gap-3">
                <AsciiSpinner /> Opening workspace
              </p>
            )}
          </div>
        </main>
      )}
    </div>
  );
}
