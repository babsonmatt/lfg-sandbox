import { run, bench, group, baseline } from "mitata";

// deno
// import { ... } from 'npm:mitata';

// d8/jsc
// import { ... } from '<path to mitata>/src/cli.mjs';

bench("noop", () => {});
bench("noop2", () => {});

group("group", () => {
  baseline("baseline", () => {});
  bench("Date.now()", () => Date.now());
  bench("performance.now()", () => performance.now());
});

await run({
//   units: false, // print small units cheatsheet
  silent: false, // enable/disable stdout output
  avg: true, // enable/disable avg column (default: true)
  json: false, // enable/disable json output (default: false)
  colors: true, // enable/disable colors (default: true)
  min_max: true, // enable/disable min/max column (default: true)
  percentiles: false, // enable/disable percentiles column (default: true)
});
