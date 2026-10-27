export type ImageConfiguration = {
  defaultOutputWidthInCells: number;
  minOutputWidthInCells: number;
  maxOutputWidthInCells: number;
  defaultCharacterRamp: string;
  defaultCharacterCellAspectRatio: number;
  maxEncodedBytes: number;
  requestToken: string;
};

export type CharacterImageOptions = {
  outputWidthInCells: number;
  characterRamp: string;
  invert: boolean;
};

export type AsciiText = {
  text: string;
  widthInCells: number;
  heightInCells: number;
};

type ProblemDetails = { title: string; detail?: string };

export async function loadImageConfiguration(
  signal: AbortSignal
): Promise<ImageConfiguration> {
  const response = await fetch("/api/images/options", { signal });
  if (!response.ok) {
    throw new Error(
      "Cannot connect to the conversion server. Check that it is running, then retry."
    );
  }
  return response.json() as Promise<ImageConfiguration>;
}

export async function convertImage(
  file: File,
  options: CharacterImageOptions,
  requestToken: string,
  signal: AbortSignal
): Promise<AsciiText> {
  const body = new FormData();
  body.set("image", file);
  body.set("outputWidthInCells", String(options.outputWidthInCells));
  body.set("characterRamp", options.characterRamp);
  body.set("invert", String(options.invert));

  const response = await fetch("/api/images/convert", {
    method: "POST",
    headers: { "X-CSRF-TOKEN": requestToken },
    body,
    signal
  });
  if (!response.ok) {
    const problem = (await response.json()) as ProblemDetails;
    throw new Error(problem.detail ?? problem.title);
  }
  return response.json() as Promise<AsciiText>;
}
