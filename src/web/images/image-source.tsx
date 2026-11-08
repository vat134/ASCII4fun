import { Button } from "../ui/base/button";
import { AsciiType } from "../workspace/ascii-type";
import { UploadIcon } from "../ui/icons";
import type { SelectedImage } from "./use-image-conversion";
import { SourceThumbnail } from "./source-thumbnail";
import { isVideo } from "../videos/prepare-video";

type ImageSourceProps = {
  selection: SelectedImage | null;
  onBrowse: () => void;
  onTextMode: () => void;
};

export function ImageSource({
  selection,
  onBrowse,
  onTextMode
}: ImageSourceProps) {
  return (
    <aside aria-label="Source" className="shrink-0 lg:w-48 xl:w-52 2xl:w-56">
      <AsciiType mode="media" onChange={onTextMode}>
        <h3 className="font-mono text-xs text-muted-foreground uppercase">
          Source
        </h3>
        {selection ? (
          <>
            {isVideo(selection.file) ? (
              <video
                src={selection.url}
                muted
                playsInline
                preload="metadata"
                aria-label="Uploaded video thumbnail"
                className="max-h-64 w-full rounded-md bg-muted object-contain"
              />
            ) : selection.file.type === "image/gif" ||
              /\.gif$/iu.test(selection.file.name) ? (
              <SourceThumbnail key={selection.url} selection={selection} />
            ) : (
              <img
                src={selection.url}
                alt="Uploaded source thumbnail"
                className="max-h-64 w-full rounded-md bg-muted object-contain"
              />
            )}
            <p className="break-all font-mono text-xs leading-relaxed">
              {selection.file.name}
            </p>
            <Button
              className="h-10 w-full"
              variant="outline"
              onClick={onBrowse}
            >
              <UploadIcon aria-hidden="true" /> Replace
            </Button>
          </>
        ) : (
          <p className="font-mono text-xs leading-relaxed text-muted-foreground">
            JPEG, PNG, WebP, GIF, MP4, WebM or MOV.
            <br />
            One file at a time. Video up to 60 seconds.
          </p>
        )}
      </AsciiType>
    </aside>
  );
}
