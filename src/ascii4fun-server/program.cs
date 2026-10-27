using Ascii4Fun.Images;
using Ascii4Fun.Server.Images;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.RateLimiting;

var builder = WebApplication.CreateBuilder(args);
var converter = new StillImageConverter();
// Reserve room for multipart headers and bounded settings alongside the encoded file.
const int multipartOverheadInBytes = 64 * 1024;
var maxRequestBytes = converter.MaxEncodedBytes + multipartOverheadInBytes;

builder.Services.AddHealthChecks();
builder.Services.AddSingleton(converter);
builder.Services.AddProblemDetails();
// Binding failures are client errors in development as well as published builds.
builder.Services.Configure<RouteHandlerOptions>(options => options.ThrowOnBadRequest = false);
builder.Services.AddAntiforgery(options => options.HeaderName = ImageConversionEndpoints.AntiforgeryHeaderName);
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = maxRequestBytes);
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = converter.MaxEncodedBytes;
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
    // Provisional interactive request budget; revise with the performance baseline.
    TimeSpan.FromSeconds(30)));

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseRouting();
app.UseRequestTimeouts();
app.UseRateLimiter();
app.UseAntiforgery();
app.MapHealthChecks("/health");
app.MapImageConversion();

app.Run();

public partial class Program;

