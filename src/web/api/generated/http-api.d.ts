export interface paths {
  "/api/images/options": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["GetImageOptions"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/images/convert": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["ConvertImage"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/text/fonts": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["GetTextFonts"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/text/fonts/{fontId}/palette": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["GetTextFontPalette"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/text/convert": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** @description The JSON request's format field selects json (default), txt or png. Accept does not select the format. No response is retained. */
    post: operations["ConvertText"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/animations/convert": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** @description Send an acceptable application/x-ndjson Accept entry (q > 0) for newline-delimited event items; otherwise receive binary media. The stream emits progress, then exactly one complete or error event. An error after headers is an event, not a new HTTP status. Disconnect cancels request-owned work. No durable job is created. */
    post: operations["ConvertAnimation"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/videos/prepare": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["PrepareVideo"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/videos/convert": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** @description Send an acceptable application/x-ndjson Accept entry (q > 0) for newline-delimited event items; otherwise receive binary media. The stream emits progress, then exactly one complete or error event. An error after headers is an event, not a new HTTP status. Disconnect cancels request-owned work. No durable job is created. */
    post: operations["ConvertVideo"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    AnimationConversionRequest: {
      /** @description Controls glyph-based conversion of a still image. */
      options: {
        /**
         * Format: int32
         * @description The requested output width measured in character cells.
         */
        outputWidthInCells?: number | string;
        /** @description The well-formed Unicode glyph ramp ordered from darkest to lightest. */
        characterRamp?: string;
        /** @description Selects nearest measured glyph coverage instead of equally spaced ramp positions. Defaults to false. */
        useMeasuredGlyphDensity?: boolean;
        /** @description Uses local tone and spatial matching with a fixed printable-ASCII photo alphabet. Classic remains the default. */
        usePhotoStyle?: boolean;
        /** @description Reverses light and dark glyph mapping. */
        invert?: boolean;
        /** @description Uses sampled source colors, composited over white like luminance analysis. */
        sourceColors?: boolean;
        /**
         * Format: int32
         * @description Contrast around the midpoint; -100 flattens, 0 preserves, +100 increases contrast.
         */
        contrast?: number | string;
        /**
         * Format: int32
         * @description Additive brightness in percentage points; 0 preserves the input.
         */
        brightness?: number | string;
        /**
         * Format: int32
         * @description Lifts shadows with an endpoint-preserving power curve before contrast/brightness; 0 disables, 100 uses exponent 1/3.
         */
        shadowLift?: number | string;
        /**
         * Format: int32
         * @description Opacity of the normalized original photo beneath glyphs, in percent (0..100); 0 retains no photo.
         */
        sourcePhotoOpacity?: number | string;
        /** @description An opaque color with 8-bit sRGB channels. */
        monochromeColor?: {
          /**
           * Format: uint8
           * @description Red channel.
           */
          red?: number | string;
          /**
           * Format: uint8
           * @description Green channel.
           */
          green?: number | string;
          /**
           * Format: uint8
           * @description Blue channel.
           */
          blue?: number | string;
        };
        /** @description An opaque color with 8-bit sRGB channels. */
        backgroundColor?: {
          /**
           * Format: uint8
           * @description Red channel.
           */
          red?: number | string;
          /**
           * Format: uint8
           * @description Green channel.
           */
          green?: number | string;
          /**
           * Format: uint8
           * @description Blue channel.
           */
          blue?: number | string;
        };
      };
      /** @description Shared preview/export timing. Omitted FPS preserves the source frame sequence. */
      playback: {
        /**
         * Format: double
         * @description Playback rate from 0.25 to 4; 2 plays twice as fast.
         */
        speed?: number | string;
        /**
         * Format: int32
         * @description Optional uniform cadence: 1..50 FPS for GIF, 1..60 for video; capped by the source average before speed.
         */
        framesPerSecond?: null | number | string;
      };
    };
    ExportError: {
      message: string;
      /** @enum {string} */
      type: "error";
    };
    ExportProgress: {
      /** Format: int32 */
      completedFrames: number;
      /** @enum {string} */
      type: "progress";
    };
    /** @description A bundled FIGfont available to the shared text converter. */
    FigletFontInfo: {
      /** @description The stable identifier passed to AsciiCanvas FigletConverter.Convert(string text, string fontId, RgbColor? foregroundColor = null, IReadOnlyDictionary&lt;RgbColor, RgbColor&gt;? colorReplacements = null, CancellationToken cancellationToken = default(CancellationToken)). */
      id: string;
      /** @description The font's display name. */
      name: string;
      /** @description The display category for font browsing and filtering. */
      category: string;
      /**
       * @description Whether the default artwork carries authored foreground and background colors.
       * @default false
       */
      hasNativeColors: boolean;
      /** @description Font-specific coverage or display guidance. */
      note: null | string;
    };
    GifExportComplete: {
      /** Format: byte */
      gif: string;
      /** @enum {string} */
      type: "complete";
    };
    /** Format: binary */
    IFormFile: string;
    ImageConfiguration: {
      /** Format: int32 */
      defaultOutputWidthInCells: number;
      /** Format: int32 */
      minOutputWidthInCells: number;
      /** Format: int32 */
      maxOutputWidthInCells: number;
      defaultCharacterRamp: string;
      /** Format: double */
      defaultCharacterCellAspectRatio: number;
      /** Format: int64 */
      maxEncodedBytes: number;
      /** Format: int32 */
      minToneAdjustment: number;
      /** Format: int32 */
      maxToneAdjustment: number;
      defaultMonochromeColor: components["schemas"]["RgbColor"];
      defaultBackgroundColor: components["schemas"]["RgbColor"];
      /** Format: int32 */
      maxPercentage: number;
      requestToken: string;
    };
    ImageConversionResponse: {
      text: string;
      /** Format: int32 */
      widthInCells: number;
      /** Format: int32 */
      heightInCells: number;
      /** Format: byte */
      png: string;
    };
    ProblemDetails: {
      type?: null | string;
      title?: null | string;
      /** Format: int32 */
      status?: null | number;
      detail?: null | string;
      instance?: null | string;
    };
    /** @description An opaque color with 8-bit sRGB channels. */
    RgbColor: {
      /**
       * Format: uint8
       * @description Red channel.
       */
      red: number;
      /**
       * Format: uint8
       * @description Green channel.
       */
      green: number;
      /**
       * Format: uint8
       * @description Blue channel.
       */
      blue: number;
    };
    TextConversionRequest: {
      text: null | string;
      /** @default standard */
      fontId?: string;
      /** @default json */
      format?: string;
      foregroundColor?: null | string;
      colorReplacements?: null | {
        [key: string]: string;
      };
    };
    VideoExportComplete: {
      /** Format: byte */
      video: string;
      /** @enum {string} */
      type: "complete";
    };
    /** @description Validated source video information, before playback retiming. */
    VideoMetadata: {
      /**
       * Format: int32
       * @description Frame width after orientation and sample-aspect normalization.
       */
      widthInPixels: number;
      /**
       * Format: int32
       * @description Frame height after orientation and sample-aspect normalization.
       */
      heightInPixels: number;
      /**
       * Format: double
       * @description Source duration in milliseconds.
       */
      durationMs: number;
      /**
       * Format: double
       * @description Average source frame rate.
       */
      framesPerSecond: number;
      /** @description Whether a source audio track exists. */
      hasAudio: boolean;
      /**
       * Format: int32
       * @description Decoded source frame count.
       */
      frameCount: number;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
  GetImageOptions: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description OK */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ImageConfiguration"];
        };
      };
    };
  };
  ConvertImage: {
    parameters: {
      query?: never;
      header: {
        /** @description Use requestToken from GET /api/images/options and retain that response's antiforgery cookie. */
        "X-CSRF-TOKEN": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "multipart/form-data": {
          image: components["schemas"]["IFormFile"];
        } & {
          /** Format: int32 */
          outputWidthInCells: number | string;
        } & {
          characterRamp: string;
        } & {
          invert: boolean;
        } & {
          /** @default false */
          sourceColors?: boolean;
        } & {
          /**
           * Format: int32
           * @default 0
           */
          contrast?: number | string;
        } & {
          /**
           * Format: int32
           * @default 0
           */
          brightness?: number | string;
        } & {
          monochromeColor?: string;
        } & {
          backgroundColor?: string;
        } & {
          /**
           * Format: int32
           * @default 0
           */
          shadowLift?: number | string;
        } & {
          /**
           * Format: int32
           * @default 0
           */
          sourcePhotoOpacity?: number | string;
        } & {
          /** @default false */
          useMeasuredGlyphDensity?: boolean;
        } & {
          /** @default false */
          usePhotoStyle?: boolean;
        };
      };
    };
    responses: {
      /** @description OK */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ImageConversionResponse"];
        };
      };
      /** @description HTTP 400. Application errors use Problem Details; framework/transport failures may have an empty body. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description HTTP 413. Application errors use Problem Details; framework/transport failures may have an empty body. */
      413: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description HTTP 415. Application errors use Problem Details; framework/transport failures may have an empty body. */
      415: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description HTTP 422. Application errors use Problem Details; framework/transport failures may have an empty body. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description HTTP 429. Application errors use Problem Details; framework/transport failures may have an empty body. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description HTTP 500. Application errors use Problem Details; framework/transport failures may have an empty body. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description Request timeout. The response may have no body. */
      504: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  GetTextFonts: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description OK */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FigletFontInfo"][];
        };
      };
    };
  };
  GetTextFontPalette: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        fontId: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description OK */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": string[];
        };
      };
      /** @description Not Found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description Too Many Requests */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description Gateway Timeout */
      504: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  ConvertText: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["TextConversionRequest"];
      };
    };
    responses: {
      /** @description OK */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ImageConversionResponse"];
          "text/plain": string;
          "image/png": string;
        };
      };
      /** @description HTTP 400. Application errors use Problem Details; framework/transport failures may have an empty body. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description HTTP 413. Application errors use Problem Details; framework/transport failures may have an empty body. */
      413: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description HTTP 415. Application errors use Problem Details; framework/transport failures may have an empty body. */
      415: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description HTTP 429. Application errors use Problem Details; framework/transport failures may have an empty body. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description HTTP 500. Application errors use Problem Details; framework/transport failures may have an empty body. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description Request timeout. The response may have no body. */
      504: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  ConvertAnimation: {
    parameters: {
      query?: never;
      header: {
        /** @description Use requestToken from GET /api/images/options and retain that response's antiforgery cookie. */
        "X-CSRF-TOKEN": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "multipart/form-data": {
          image: components["schemas"]["IFormFile"];
        } & {
          /** @description JSON-encoded AnimationConversionRequest. Send this form field as a string, not a nested multipart object. */
          settings: string;
        };
      };
    };
    responses: {
      /** @description Binary export or a stream of NDJSON event items; not a JSON array. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "image/gif": string;
          "application/x-ndjson":
            | components["schemas"]["ExportProgress"]
            | components["schemas"]["ExportError"]
            | components["schemas"]["GifExportComplete"];
        };
      };
      /** @description HTTP 400. Application errors use Problem Details; framework/transport failures may have an empty body. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description HTTP 413. Application errors use Problem Details; framework/transport failures may have an empty body. */
      413: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description HTTP 415. Application errors use Problem Details; framework/transport failures may have an empty body. */
      415: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description HTTP 422. Application errors use Problem Details; framework/transport failures may have an empty body. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description HTTP 429. Application errors use Problem Details; framework/transport failures may have an empty body. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description HTTP 500. Application errors use Problem Details; framework/transport failures may have an empty body. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description Request timeout. The response may have no body. */
      504: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  PrepareVideo: {
    parameters: {
      query?: never;
      header: {
        /** @description Use requestToken from GET /api/images/options and retain that response's antiforgery cookie. */
        "X-CSRF-TOKEN": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "multipart/form-data": {
          image: components["schemas"]["IFormFile"];
        };
      };
    };
    responses: {
      /** @description Normalized MP4. No source session is retained. */
      200: {
        headers: {
          /** @description JSON-encoded VideoMetadata (see components.schemas.VideoMetadata). */
          "X-Video-Metadata": string;
          [name: string]: unknown;
        };
        content: {
          "video/mp4": string;
        };
      };
      /** @description HTTP 400. Application errors use Problem Details; framework/transport failures may have an empty body. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description HTTP 413. Application errors use Problem Details; framework/transport failures may have an empty body. */
      413: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description HTTP 415. Application errors use Problem Details; framework/transport failures may have an empty body. */
      415: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description HTTP 422. Application errors use Problem Details; framework/transport failures may have an empty body. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description HTTP 429. Application errors use Problem Details; framework/transport failures may have an empty body. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description HTTP 500. Application errors use Problem Details; framework/transport failures may have an empty body. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description Request timeout. The response may have no body. */
      504: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  ConvertVideo: {
    parameters: {
      query?: never;
      header: {
        /** @description Use requestToken from GET /api/images/options and retain that response's antiforgery cookie. */
        "X-CSRF-TOKEN": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "multipart/form-data": {
          image: components["schemas"]["IFormFile"];
        } & {
          /** @description JSON-encoded AnimationConversionRequest. Send this form field as a string, not a nested multipart object. */
          settings: string;
        };
      };
    };
    responses: {
      /** @description Binary export or a stream of NDJSON event items; not a JSON array. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "video/mp4": string;
          "application/x-ndjson":
            | components["schemas"]["ExportProgress"]
            | components["schemas"]["ExportError"]
            | components["schemas"]["VideoExportComplete"];
        };
      };
      /** @description HTTP 400. Application errors use Problem Details; framework/transport failures may have an empty body. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description HTTP 413. Application errors use Problem Details; framework/transport failures may have an empty body. */
      413: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description HTTP 415. Application errors use Problem Details; framework/transport failures may have an empty body. */
      415: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description HTTP 422. Application errors use Problem Details; framework/transport failures may have an empty body. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description HTTP 429. Application errors use Problem Details; framework/transport failures may have an empty body. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description HTTP 500. Application errors use Problem Details; framework/transport failures may have an empty body. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["ProblemDetails"];
        };
      };
      /** @description Request timeout. The response may have no body. */
      504: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
}
