const chai = require("chai");
const should = chai.should();

const Mod = require("../Mod");

describe("Mod#dependencies", function() {

  let dependencies = [ "one", "two" ];

  it("returns the dependencies from the manifest", function() {

    new Mod({ name: "third-party", dependencies }).dependencies.should.deep.equal(dependencies);

  });

  it("includes 'core' when name === 'base'", function() {

    let deps = new Mod({ name: "base", dependencies }).dependencies;
    deps.should.include("core");
    deps.should.include(dependencies[0]);

  });

});
