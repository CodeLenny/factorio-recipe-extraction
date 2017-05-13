const chai = require("chai");
const should = chai.should();

const path = require("path");
const Mod = require("../Mod");
const FactorioData = require("./assets/FactorioData");

const mods = [
  {
    name: "core",
  },
  {
    name: "base",
  },
];

describe("Mod.loadFromManifest", function() {

  FactorioData.requireVersions(true, 1);

  FactorioData.versions.forEach(data => {

    describe("with Factorio "+data.version, function() {

      mods.forEach(mod => {

        describe(`'${mod.name}'`, function() {

          let info = null;
          let _mod = null;

          beforeEach(function() {
            info = require(path.join(data.path, mod.name, "info.json"));
            return Mod
              .loadFromManifest(path.join(data.path, mod.name))
              .then(_m => _mod = _m);
          });

          it("reads the manifest file", function() {
            _mod.manifest.should.deep.equal(info);
          });

        });

      });

    });

  });

});
