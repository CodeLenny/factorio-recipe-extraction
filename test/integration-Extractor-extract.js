const chai = require("chai");
const should = chai.should();

const Promise = require("bluebird");
const tmp = require("tmp-promise");
const fs = require("fs-extra");
const path = require("path");
const Extractor = require("../Extractor");
const FactorioData = require("./assets/FactorioData");
const Download5Dim = require("./assets/5dim");

function camelCase(str) {
  return str.replace(/([-_][a-zA-Z])/g, (s) => s[1].toUpperCase());
}

describe("[integration] Extractor#extract", function() {

  FactorioData.requireVersions(true, 1);

  FactorioData.versions.forEach(data => {

    describe("with Factorio "+data.version, function() {

      let extractor = null;

      let tmpDir = null;

      /**
       * The path to the 5dim_core zip file.
      */
      let coreMod = null;

      /**
       * The path to the 5dim_ores zip file.
      */
      let oresMod = null;

      let json = null;

      before(function() {
        this.timeout(2 * 60 * 1000);
        console.log("Setting up integration test.");
        return Promise.resolve()
          .then(() => Promise.all([
            tmp.dir({ unsafeCleanup: true }),
            Download5Dim.zippedMod("core", "6e180bafb4ae2c57e78fb450255b6b2b7b16a944"),
            Download5Dim.zippedMod("ores", "6e180bafb4ae2c57e78fb450255b6b2b7b16a944"),
          ]))
          .then(([o, [core], [ore]]) => [tmpDir, coreMod, oresMod] = [o, core, ore])
          .then(() => console.log("Downloaded 5dim mod."))
          .then(() => Promise.all([
            fs.copy(data.path, path.join(tmpDir.path, "data")),
            fs.ensureDir(path.join(tmpDir.path, "mods")),
          ]))
          .then(() => console.log("Copied Factorio 'data' directory.  Copying 5dim files."))
          .then(() => Promise.all([
            fs.copy(coreMod, path.join(tmpDir.path, "mods", path.basename(coreMod))),
            fs.copy(oresMod, path.join(tmpDir.path, "mods", path.basename(oresMod))),
            fs.writeFile(path.join(tmpDir.path, "mods", "mod-list.json"), JSON.stringify({
              mods: [
                { name: "base", enabled: true },
                { name: "5dim_core", enabled: true },
                { name: "5dim_ores", enabled: true },
              ],
            }))
          ]))
          .then(() => console.log("Factorio save setup.  Starting extraction."))
          .then(() => extractor = new Extractor(tmpDir.path, path.join(tmpDir.path, "output.json")))
          .then(() => extractor.extract())
          .then(() => json = require(path.join(tmpDir.path, "output.json")));
      });

      after(function() {
        return tmpDir.cleanup();
      });

      it("should create a JSON file", function() {
        json.should.be.an.object;
      });

      Extractor.dataTypes.forEach(type => {
        type = camelCase(type)+"s";
        it(`should include ${type}`, function() {
          json.should.have.property(type);
          json[type].should.be.an.object;
          json[type].should.not.be.an.array;
          Object.keys(json[type]).length.should.be.at.least(3);
        });
      });

    });

  });

});
