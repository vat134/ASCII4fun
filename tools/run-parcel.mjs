// Parcel 2.16.4 workers exit silently with the project's current Windows and Node setup.
process.env.PARCEL_WORKERS = "0";

await import("parcel/lib/bin.js");
