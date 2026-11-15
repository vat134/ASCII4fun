import type { ReactNode } from "react";
import { Button } from "../base/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../base/tooltip";
import { RotateCcwIcon, SlidersHorizontalIcon } from "../icons";

export function SettingsPanel({
  label,
  resetLabel,
  onReset,
  resetTooltip = true,
  children,
  exportPanel
}: {
  label: string;
  resetLabel: string;
  onReset: () => void;
  resetTooltip?: boolean;
  children: ReactNode;
  exportPanel: ReactNode;
}) {
  const resetButton = (
    <Button
      variant="ghost"
      size="icon"
      aria-label={resetLabel}
      onClick={onReset}
    >
      <RotateCcwIcon aria-hidden="true" />
    </Button>
  );
  return (
    <aside
      aria-label={label}
      className="flex shrink-0 flex-col overflow-hidden rounded-xl border bg-card lg:h-full lg:w-80 xl:w-88"
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-5">
        <h2 className="flex items-center gap-2 text-sm">
          <SlidersHorizontalIcon className="size-4" aria-hidden="true" />{" "}
          Settings
        </h2>
        {resetTooltip ? (
          <Tooltip>
            <TooltipTrigger render={resetButton}>
              <RotateCcwIcon aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>{resetLabel}</TooltipContent>
          </Tooltip>
        ) : (
          resetButton
        )}
      </div>
      <div className="min-h-0 flex-1 divide-y overflow-y-auto overscroll-contain">
        {children}
      </div>
      {exportPanel}
    </aside>
  );
}
