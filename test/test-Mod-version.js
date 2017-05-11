const chai = require("chai");
const should = chai.should();

const Mod = require("../Mod");

describe("Mod#version", function() {

  it("gets the version from the manifest", function() {
    new Mod({ version: "0.1.2.3"}).version.should.equal("0.1.2.3");
  });

  it("defaults to '0.0.0.0'", function() {
    new Mod({}).version.should.equal("0.0.0.0");
  });

});
