using Ascii4Fun.Images;
using Ascii4Fun.Server.Animations;
using Ascii4Fun.Server.Figlet;
using Ascii4Fun.Server.Images;
using Ascii4Fun.Server.Videos;
using Ascii4Fun.Videos;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.StaticFiles;

var builder = WebApplication.CreateBuilder(args);
var converter = new StillImageConverter();
// Reserve room for multipart headers and bounded settings alongside the encoded file.
const int multipartOverheadInBytes = 64 * 1024;
// Provisional interactive request budget; revise with the performance baseline.
const int conversionTimeoutInSeconds = 30;
var maxRequestBytes = VideoClip.MaxEncodedBytes + multipartOverheadInBytes;

builder.Services.AddHealthChecks();
builder.Services.AddSingleton(converter);
builder.Services.AddSingleton(new VideoTools(builder.Configuration["Video:FfmpegPath"] ?? "ffmpeg",
    builder.Configuration["Video:FfprobePath"] ?? "ffprobe"));
builder.Services.AddProblemDetails();
// Binding failures are client errors in development as well as published builds.
builder.Services.Configure<RouteHandlerOptions>(options => options.ThrowOnBadRequest = false);
builder.Services.AddAntiforgery(options => options.HeaderName = ImageConversionEndpoints.AntiforgeryHeaderName);
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = maxRequestBytes);
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = VideoClip.MaxEncodedBytes;
    // Keep bounded uploads in memory instead of spilling source images into temporary files.
    options.MemoryBufferThreshold = checked((int)maxRequestBytes);
    options.ValueLengthLimit = multipartOverheadInBytes;
});
builder.Services.AddRateLimiter(options =>
{
    // One active conversion matches the initial single-user local operating model.
    options.AddConcurrencyLimiter(ImageConversionEndpoints.PolicyName, policy =>
    {
        policy.PermitLimit = 1;
        policy.QueueLimit = 0;
    });
    options.OnRejected = async (context, _) => await Results.Problem(
        statusCode: StatusCodes.Status429TooManyRequests,
        title: "Conversion is busy",
        detail: "Wait for the current conversion to finish, then retry.").ExecuteAsync(context.HttpContext);
});
builder.Services.AddRequestTimeouts(options => options.AddPolicy(
    ImageConversionEndpoints.PolicyName,
    TimeSpan.FromSeconds(conversionTimeoutInSeconds)));
builder.Services.AddRequestTimeouts(options => options.AddPolicy(AnimationConversionEndpoints.TimeoutPolicy, TimeSpan.FromMinutes(5)));
builder.Services.AddRequestTimeouts(options => options.AddPolicy(VideoConversionEndpoints.TimeoutPolicy, TimeSpan.FromMinutes(15)));

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseDefaultFiles();
var contentTypes = new FileExtensionContentTypeProvider();
contentTypes.Mappings[".dat"] = "application/octet-stream";
app.UseStaticFiles(new StaticFileOptions { ContentTypeProvider = contentTypes });
app.UseRouting();
app.UseRequestTimeouts();
app.UseRateLimiter();
app.UseAntiforgery();
app.MapHealthChecks("/health");
app.MapImageConversion();
app.MapTextConversion();
app.MapAnimationConversion();
app.MapVideoConversion();

app.Run();

public partial class Program;

