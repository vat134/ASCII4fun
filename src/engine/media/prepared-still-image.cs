namespace Ascii4Fun.Media;

internal sealed record PreparedStillImage(RgbaGrid Grid, byte[]? SourcePhotoRgba, RgbaGrid? PhotoSamples = null);
