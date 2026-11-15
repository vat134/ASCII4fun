import { expect, jest, test } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { CompactDestinationCard } from "../../src/web/compact/compact-destination-card";
import { compactArtwork, compactConfiguration } from "./compact-fixtures";

test.each([
  [25, 987, "Fits"],
  [26, 1105, "Over limit"],
  [49, 987, "May wrap"]
])(
  "reports the engine count and width guidance for %i columns",
  (columns, count, status) => {
    render(
      <CompactDestinationCard
        destination={{
          ...compactConfiguration.destinations[0]!,
          limit: 1000,
          unit: "bytes",
          recommendedColumns: 48
        }}
        result={{
          ...compactArtwork,
          widthInCells: columns as number,
          destinationCounts: { steamc: count as number }
        }}
        selected
        onSelect={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Steam" })).toHaveTextContent(
      `${count} / 1000 bytes`
    );
    expect(screen.getByText(status as string)).toBeVisible();
  }
);

test("File has no text or recommended-width limit", () => {
  render(
    <CompactDestinationCard
      destination={{ ...compactConfiguration.destinations[5]!, limit: null }}
      result={{
        ...compactArtwork,
        widthInCells: 200,
        destinationCounts: { plain: 40000 }
      }}
      selected={false}
      onSelect={jest.fn()}
    />
  );
  expect(screen.getByText("Fits")).toBeVisible();
  expect(screen.getByText(/No text limit/)).toBeVisible();
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
});
