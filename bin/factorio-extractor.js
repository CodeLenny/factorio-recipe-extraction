#!/usr/bin/env node

const cli = require("commander");

const defaultOut = "factorio-data.json";

cli.version(require("../package.json").version);

cli.option("-d, --data [path]", "The path to the Factorio directory including 'mods', 'config', 'data', etc.");
cli.option("-o, --output [path]", `The location to write the JSON output.  Defaults to './${defaultOut}'`, defaultOut);

cli.parse(process.argv);

const Extractor = require("../Extractor");

let extractor = new Extractor(cli.data, cli.output);
extractor
  .extract()
  .then(() => {
    console.log("Extracted Factorio data.");
  });
