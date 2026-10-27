import { Button } from "../ui/base/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/base/tabs";
import { ImageIcon, TypeIcon, UploadIcon } from "../ui/icons";
import type { SelectedImage } from "./use-image-conversion";

type ImageSourceProps = {
  selection: SelectedImage | null;
  onBrowse: () => void;
};

export function ImageSource({ selection, onBrowse }: ImageSourceProps) {
  return (
    <aside aria-label="Source" className="shrink-0 lg:w-48 xl:w-52 2xl:w-56">
      <Tabs
        defaultValue="media"
        className="gap-0 overflow-hidden rounded-xl border bg-card"
      >
        <div className="space-y-4 p-4">
          <h2 className="text-sm">ASCII type</h2>
          <TabsList className="h-11 w-full">
            <TabsTrigger
              value="text"
              disabled
              title="Text conversion is coming later"
            >
              <TypeIcon aria-hidden="true" /> Text
            </TabsTrigger>
            <TabsTrigger value="media">
              <ImageIcon aria-hidden="true" /> Media
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="media" className="space-y-4 border-t p-4">
          <h3 className="font-mono text-xs text-muted-foreground uppercase">
            Source
          </h3>
          {selection ? (
            <>
              <img
                src={selection.url}
                alt="Uploaded source thumbnail"
                className="max-h-40 w-full rounded-md bg-muted object-contain"
              />
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
              JPEG, PNG or WebP.
              <br />
              One image at a time.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </aside>
  );
}
