import { Button } from "../ui/base/button";
import { ArrowDownToLineIcon } from "../ui/icons";

export function ArtworkExport({
  canExport,
  error,
  dimensions,
  onExport
}: {
  canExport: boolean;
  error: string | null;
  dimensions: string;
  onExport: (format: "txt" | "png") => void;
}) {
  return (
    <footer className="shrink-0 space-y-4 border-t bg-card p-5">
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm">Export</h3>
        <span className="font-mono text-xs text-muted-foreground">
          {dimensions}
        </span>
      </div>
      <Button
        className="h-11 w-full"
        disabled={!canExport}
        onClick={() => onExport("png")}
      >
        <ArrowDownToLineIcon aria-hidden="true" /> Download PNG
      </Button>
      <Button
        variant="outline"
        className="h-11 w-full"
        disabled={!canExport}
        onClick={() => onExport("txt")}
      >
        <ArrowDownToLineIcon aria-hidden="true" /> Download .txt
      </Button>
      <p className="text-center font-mono text-xs text-muted-foreground">
        PNG matches preview · TXT saves characters only
      </p>
    </footer>
  );
}
