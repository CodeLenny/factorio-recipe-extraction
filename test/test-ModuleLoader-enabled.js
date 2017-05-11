const chai = require("chai");
const should = chai.should();

const fs = require("fs-extra");
const tmp = require("tmp-promise");
const Mod = require("../Mod");
const ModuleLoader = require("../ModuleLoader");

describe("ModuleLoader#enabled", function() {

  mods = [
    new Mod({ name: "enabled-mod-1" }),
    new Mod({ name: "disabled-mod-1" }),
    new Mod({ name: "unlisted-mod-1" }),
  ];

  modListMods = [
    { name: "enabled-mod-1", enabled: true },
    { name: "disabled-mod-1", enabled: false },
  ];

  let modList = null;

  beforeEach(function() {
    return tmp
      .file({ postfix: ".json" })
      .then(o => modList = o)
      .then(() => fs.writeFile(modList.path, JSON.stringify({ mods: modListMods })));
  });

  afterEach(function() {
    return modList.cleanup();
  });

  describe("given a ModArray", function() {

    it("includes enabled mods", function() {
      return new ModuleLoader( { factorioModList: modList.path } )
        .enabled(mods)
        .then(mods => {
          let names = mods.map(mod => mod.name);
          names.should.include("enabled-mod-1");
        });
    });

    it("excludes mods listed with 'enabled: false'", function() {
      return new ModuleLoader( { factorioModList: modList.path } )
        .enabled(mods)
        .then(mods => {
          let names = mods.map(mod => mod.name);
          names.should.not.include("disabled-mod-1");
        });
    });

    it("excludes mods not listed in 'mod-list.json'", function() {
      return new ModuleLoader( { factorioModList: modList.path } )
        .enabled(mods)
        .then(mods => {
          let names = mods.map(mod => mod.name);
          names.should.not.include("unlisted-mod-1");
        });
    });

  });

  describe("looking up mods", function() {

    class MockModuleLoader extends ModuleLoader {
      vanilla() { return mods.slice(1); }
      added() { return [mods[0]]; }
    }

    it("should use options in the constructor", function() {
      return new MockModuleLoader( { factorioModList: modList.path } )
        .enabled()
        .then(mods => {
          let names = mods.map(mod => mod.name);
          names.should.include("enabled-mod-1");
          names.should.not.include("disabled-mod-1");
          names.should.not.include("unlisted-mod-1");
        });
    });

    it("should accept options directly", function() {
      return new MockModuleLoader()
        .enabled(null, { factorioModList: modList.path })
        .then(mods => {
          let names = mods.map(mod => mod.name);
          names.should.include("enabled-mod-1");
          names.should.not.include("disabled-mod-1");
          names.should.not.include("unlisted-mod-1");
        });
    });

  });

});
