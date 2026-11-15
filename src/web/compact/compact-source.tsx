import { AsciiType, type WorkspaceMode } from "../workspace/ascii-type";
import { Button } from "../ui/base/button";
import { UploadIcon } from "../ui/icons";

export function CompactSource({
  file,
  sourceUrl,
  onBrowse,
  onClear,
  onModeChange
}: {
  file: File | null;
  sourceUrl: string | null;
  onBrowse: () => void;
  onClear: () => void;
  onModeChange: (mode: WorkspaceMode) => void;
}) {
  return (
    <aside
      aria-label="Mini art source"
      className="shrink-0 lg:w-48 xl:w-52 2xl:w-56"
    >
      <AsciiType mode="mini-art" onChange={onModeChange}>
        <h3 className="font-mono text-xs text-muted-foreground uppercase">
          Source
        </h3>
        {file ? (
          <>
            {sourceUrl && (
              <img
                src={sourceUrl}
                alt="Mini art source thumbnail"
                className="max-h-64 w-full rounded-md bg-muted object-contain"
              />
            )}
            <p className="break-all font-mono text-xs leading-relaxed">
              {file.name}
            </p>
            <Button
              variant="outline"
              className="h-10 w-full"
              onClick={onBrowse}
            >
              <UploadIcon aria-hidden="true" /> Replace
            </Button>
            <Button variant="ghost" className="h-10 w-full" onClick={onClear}>
              Remove image
            </Button>
          </>
        ) : (
          <>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Make compact, copyable dot art from a JPEG, PNG or WebP image.
            </p>
            <Button
              variant="outline"
              className="h-10 w-full"
              onClick={onBrowse}
            >
              <UploadIcon aria-hidden="true" /> Choose image
            </Button>
          </>
        )}
      </AsciiType>
    </aside>
  );
}
