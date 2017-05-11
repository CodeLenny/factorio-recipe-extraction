const chai = require("chai");
const should = chai.should();

const Mod = require("../Mod");

const mod = new Mod({ dependencies: [ "base > 0.0.0.0", "core = 0.0.0.0", "one > 0.0.0.0" ]});

const optionalMod = new Mod({ dependencies: [ "base > 0.0.0.0", "core = 0.0.0.0", "? one > 0.0.0.0" ]});

describe("Mod#dependsOn", function() {

  it("should find mods in the dependencies", function() {
    mod.dependsOn( new Mod({ name: "base", version: "0.1.0.0" }) ).should.equal(true);
  });

  it("should include optional mods by default", function() {
    mod.dependsOn( new Mod({ name: "one", version: "0.1.0.0" }) ).should.equal(true);
  })

  it("should return 'false' if the mod isn't in the dependencies", function() {
    mod.dependsOn( new Mod({ name: "two", version: "0.1.0.0" }) ).should.equal(false);
  });

  describe("'ignoreOptional' === true", function() {

    it("should include non-optional mods", function() {
      optionalMod.dependsOn( new Mod({ name: "base", version: "0.1.0.0" }), true ).should.equal(true);
    });

    it("should exclude optional mods", function() {
      optionalMod.dependsOn( new Mod({ name: "one", version: "0.1.0.0" }), true ).should.equal(false);
    });

  });

});
