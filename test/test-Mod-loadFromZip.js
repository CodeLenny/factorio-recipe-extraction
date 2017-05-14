const chai = require("chai");
const should = chai.should();

const fs = require("fs-extra");
const path = require("path");
const Mod = require("../Mod");
const Download5Dim = require("./assets/5dim");

describe("Mod.loadFromZip", function() {

  let modzip = null;
  let modcontents = null;
  let mod = null;

  before(function() {
    this.timeout(2 * 60 * 1000);
    return Download5Dim
      .zippedMod("core", "6e180bafb4ae2c57e78fb450255b6b2b7b16a944")
      .then(([z, c]) => [modzip, modcontents] = [z, c]);
  });

  it("loads", function() {
    let info = require(`${modcontents}/info.json`);
    return Mod
      .loadFromZip(modzip)
      .then(m => {
        mod = m;
        mod.should.be.an.instanceof(Mod);
        mod.manifest.should.deep.equal(info);
        mod.cleanup();
      })
      .then(() => fs.pathExists(mod.dir))
      .then(exists => exists.should.equal(false));
  });

});
