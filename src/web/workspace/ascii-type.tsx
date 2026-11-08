import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/base/tabs";
import { ImageIcon, TypeIcon } from "../ui/icons";

export function AsciiType({
  mode,
  onChange,
  children
}: {
  mode: "media" | "text";
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <Tabs
      value={mode}
      onValueChange={(next) => {
        if (next !== mode) onChange();
      }}
      className="gap-0 overflow-hidden rounded-xl border bg-card"
    >
      <div className="space-y-4 p-4">
        <h2 className="text-sm">ASCII type</h2>
        <TabsList className="h-11 w-full" aria-label="ASCII type">
          <TabsTrigger value="text">
            <TypeIcon aria-hidden="true" /> Text
          </TabsTrigger>
          <TabsTrigger value="media">
            <ImageIcon aria-hidden="true" /> Media
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value={mode} className="space-y-4 border-t p-4">
        {children}
      </TabsContent>
    </Tabs>
  );
}
