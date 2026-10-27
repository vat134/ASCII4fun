import { Button } from "../ui/base/button";
import { Input } from "../ui/base/input";
import { LinkIcon, UploadIcon } from "../ui/icons";

type ImageUploadPromptProps = {
  maxEncodedBytes: number;
  onBrowse: () => void;
};

export function ImageUploadPrompt({
  maxEncodedBytes,
  onBrowse
}: ImageUploadPromptProps) {
  return (
    <div className="w-full max-w-sm space-y-6 px-5 text-center">
      <Button
        variant="ghost"
        className="h-auto w-full flex-col gap-4 rounded-xl border border-dashed border-border px-6 py-10 hover:border-foreground"
        onClick={onBrowse}
      >
        <UploadIcon
          className="size-7 text-muted-foreground"
          aria-hidden="true"
        />
        <span>Drop an image here</span>
        <span className="font-mono text-xs text-muted-foreground">
          or click to browse
        </span>
      </Button>
      <p className="font-mono text-xs text-muted-foreground">
        JPEG / PNG / WebP · up to {maxEncodedBytes / (1024 * 1024)} MiB
      </p>
      <div className="relative">
        <LinkIcon
          className="absolute top-3.5 left-3 size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          aria-label="Media URL"
          disabled
          placeholder="Paste media URL · coming later"
          className="h-11 pl-10 font-mono text-xs"
        />
      </div>
    </div>
  );
}
