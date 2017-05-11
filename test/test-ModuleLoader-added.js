const chai = require("chai");
const should = chai.should();

const fs = require("fs-extra");
const tmp = require("tmp-promise");
const path = require("path");
const ModuleLoader = require("../ModuleLoader");
const Mod = require("../Mod");

class DummyMod extends Mod {
  static loadFromZip(zip) {
    let mod = new DummyMod();
    mod.zip = zip;
    return mod;
  }
  constructor() { super({}); }
}

describe("ModuleLoader#added", function() {

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

  it("finds mods", function() {
    let loader = new ModuleLoader({ factorioModPath: tmpDir.path });
    loader.Mod = DummyMod;
    return loader.added(tmpDir.path).then(mods => {
      mods.length.should.equal(files.length);
      mods.forEach(mod => {
        mod.should.be.an.instanceof(Mod);
        files.indexOf(path.basename(mod.zip)).should.be.above(-1);
      });
    });
  });

});
