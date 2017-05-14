const chai = require("chai");
const should = chai.should();

const fs = require("fs-extra");
const tmp = require("tmp-promise");
const path = require("path");
const ModuleLoader = require("../ModuleLoader");
const Mod = require("../Mod");
const FactorioData = require("./assets/FactorioData");

class DummyMod extends Mod {
  static loadFromZip(zip) {
    let mod = new DummyMod();
    mod.zip = zip;
    return mod;
  }
  static loadFromManifest(manifest) {
    let mod = new DummyMod();
    mod.manifest = manifest;
    return mod;
  }
  constructor() { super({}); }
}

describe("ModuleLoader#all", function() {

  let tmpDir = null;
  let files = ["a.zip", "b.zip"];

  beforeEach(function() {
    return tmp.dir({ unsafeCleanup: true })
      .then(o => {
        tmpDir = o;
        return Promise.all(files.map(file => fs.writeFile(path.join(tmpDir.path, file), "")));
      });
  });

  afterEach(function() {
    return tmpDir.cleanup();
  });

  FactorioData.requireVersions(true, 1);

  FactorioData.versions.forEach(data => {

    describe("with Factorio "+data.version, function() {

      it("finds mods", function() {
        let loader = new ModuleLoader({ factorioModPath: tmpDir.path, factorioDataPath: data.path });
        loader.Mod = DummyMod;
        return loader.all().then(mods => {
          mods.length.should.equal(2 + files.length);
          mods.forEach(mod => mod.should.be.instanceof(Mod));
          let manifests = mods.filter(mod => typeof mod.manifest === "string").map(mod => mod.manifest);
          manifests.length.should.equal(2);
          manifests.should.include(path.join(data.path, "base"));
          manifests.should.include(path.join(data.path, "core"));
          let added = mods.filter(mod => typeof mod.zip === "string").map(mod => mod.zip);
          added.length.should.equal(files.length);
          added.forEach(zip => {
            files.indexOf(path.basename(zip)).should.be.above(-1);
          });
        });
      });

    });
  });

});
