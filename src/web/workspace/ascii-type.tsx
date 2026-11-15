import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/base/tabs";
import { Grid2X2Icon, ImageIcon, TypeIcon } from "../ui/icons";

export type WorkspaceMode = "media" | "text" | "mini-art";

export function AsciiType({
  mode,
  onChange,
  children
}: {
  mode: WorkspaceMode;
  onChange: (mode: WorkspaceMode) => void;
  children: ReactNode;
}) {
  return (
    <Tabs
      value={mode}
      onValueChange={(next) => {
        if (next === "media" || next === "text" || next === "mini-art")
          onChange(next);
      }}
      className="gap-0 overflow-hidden rounded-xl border bg-card"
    >
      <div className="space-y-4 p-4">
        <h2 className="text-sm">ASCII type</h2>
        <TabsList
          className="grid h-auto w-full grid-cols-2 group-data-horizontal/tabs:h-auto"
          aria-label="ASCII type"
        >
          <TabsTrigger value="text" className="h-10">
            <TypeIcon aria-hidden="true" /> Text
          </TabsTrigger>
          <TabsTrigger value="media" className="h-10">
            <ImageIcon aria-hidden="true" /> Media
          </TabsTrigger>
          <TabsTrigger value="mini-art" className="col-span-2 h-10">
            <Grid2X2Icon aria-hidden="true" /> Mini art
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value={mode} className="space-y-4 border-t p-4">
        {children}
      </TabsContent>
    </Tabs>
  );
}
