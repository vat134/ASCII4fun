import type { components } from "../api/generated/http-api";
import type { AsciiPreviewResult } from "../rendering/ascii-preview-result";

export type CompactArtOptions = Required<
  components["schemas"]["CompactArtOptions"]
>;
export type CompactDestination = components["schemas"]["CompactDestination"];
export type CompactConfiguration = Omit<
  components["schemas"]["CompactConfiguration"],
  "defaultOptions"
> & { defaultOptions: CompactArtOptions };
export type CompactPreviewResult = AsciiPreviewResult & {
  payload: components["schemas"]["CompactArtPayload"];
  lookPreviews?: Record<string, string>;
  destinationCounts?: Record<string, number>;
};
export type CompactLayout = components["schemas"]["CompactArtLayout"];
export type CompactRequest =
  | { id: number; type: "load-compact"; bytes: Uint8Array }
  | { id: number; type: "convert-compact"; options: CompactArtOptions };
