const chai = require("chai");
const should = chai.should();

const Mod = require("../Mod");

function satisfies(type, modVersion, depVersion) {
  return new Mod({ name: "one", version: modVersion}).satisfiesDependency({ name: "one", version: depVersion, type });
}

describe("Mod#satisfiesDependency", function() {

  it("should reject dependencies with different names", function() {
    new Mod({ name: "one" }).satisfiesDependency({ name: "two" }).should.equal(false);
  });

  it("should accept dependencies with null versions", function() {
    new Mod({ name: "one" }).satisfiesDependency({ name: "one" }).should.equal(true);
    new Mod({ name: "one" }).satisfiesDependency({ name: "one", version: null }).should.equal(true);
  });

  describe("DependencyType.EqualTo", function() {

    it("should reject higher versions", function() {
      satisfies("=", "0.10.0.1", "0.10.0.0").should.equal(false);
      satisfies("=", "0.10.0.0", "0.8.0.0").should.equal(false);
    });

    it("should reject lower versions", function() {
      satisfies("=", "0.10.0.0", "0.10.0.1").should.equal(false);
      satisfies("=", "0.8.0.0", "0.10.0.0").should.equal(false);
    });

    it("should accept equal versions", function() {
      satisfies("=", "0.10.0.0", "0.10.0.0").should.equal(true);
    });

  });

  describe("DependencyType.GreaterThan", function() {

    it("should accept higher versions", function() {
      satisfies(">", "0.10.0.1", "0.10.0.0").should.equal(true);
      satisfies(">", "0.10.0.0", "0.8.0.0").should.equal(true);
    });

    it("should reject lower versions", function() {
      satisfies(">", "0.10.0.0", "0.10.0.1").should.equal(false);
      satisfies(">", "0.8.0.0", "0.10.0.0").should.equal(false);
    });

    it("should reject equal versions", function() {
      satisfies(">", "0.10.0.0", "0.10.0.0").should.equal(false);
    });

  });

  describe("DependencyType.GreaterThanOrEqual", function() {

    it("should accept higher versions", function() {
      satisfies(">=", "0.10.0.1", "0.10.0.0").should.equal(true);
      satisfies(">=", "0.10.0.0", "0.8.0.0").should.equal(true);
    });

    it("should reject lower versions", function() {
      satisfies(">=", "0.10.0.0", "0.10.0.1").should.equal(false);
      satisfies(">=", "0.8.0.0", "0.10.0.0").should.equal(false);
    });

    it("should accept equal versions", function() {
      satisfies(">=", "0.10.0.0", "0.10.0.0").should.equal(true);
    });

  });

});
