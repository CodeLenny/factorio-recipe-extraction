const chai = require("chai");
const should = chai.should();

const path = require("path");
const ModuleLoader = require("../ModuleLoader");
const Mod = require("../Mod");
const FactorioData = require("./assets/FactorioData");

class DummyMod extends Mod {
  static loadFromManifest(manifest) {
    let mod = new DummyMod();
    mod.manifest = manifest;
    return mod;
  }
  constructor() { super({}); }
}

describe("ModuleLoader#vanilla", function() {

  FactorioData.requireVersions(true, 1);

  FactorioData.versions.forEach(data => {

    describe("with Factorio "+data.version, function() {

      it("finds mods", function() {
        let loader = new ModuleLoader({ factorioDataPath: data.path });
        loader.Mod = DummyMod;
        return loader.vanilla(data.path).then(mods => {
          mods.length.should.equal(2);
          mods.forEach(mod => mod.should.be.instanceof(Mod));
          let paths = mods.map(mod => mod.manifest);
          paths.should.include(path.join(data.path, "base/info.json"));
          paths.should.include(path.join(data.path, "core/info.json"));
        });
      });

    });
  });

});
