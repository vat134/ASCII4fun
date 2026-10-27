// Parcel 2.16.4 workers exit silently with the project's current Windows and Node setup.
process.env.PARCEL_WORKERS = "0";

if (process.argv[2] === "serve") {
  const { developmentEnvironment } =
    await import("./development-environment.cjs");
  process.argv.push(
    "--port",
    String(developmentEnvironment.ASCII4FUN_WEB_PORT)
  );
}

await import("parcel/lib/bin.js");
