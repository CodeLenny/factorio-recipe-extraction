const chai = require("chai");
const should = chai.should();

const Mod = require("../Mod");

describe("Mod.versionGreater", function() {

  const standard = [
    ["0.1.1.10", "0.1.1.5"],
    ["1.0.0.0", "0.0.0.0"],
    ["0.10.0.0", "0.5.0.0"],
  ];

  /**
   * Ensures that comparison short-circuits.
  */
  const later = [
    ["0.10.0.5", "0.5.0.10"],
    ["10.0.0.5", "5.0.0.10"],
    ["10.3.2.1", "5.1.2.3"],
  ];

  /**
   * Should never come up in real cases, but make sure the method is generic anyways.
  */
  const differentDigits = [
    ["10", "5"],
    ["10.0.0.0", "5"],
    ["0.10.5", "0.5"],
  ];

  describe("returns 'true' when version is larger", function() {
    [
      ...standard,
      ...later,
      ...differentDigits,
    ].forEach(([larger, smaller]) => {
      it(`versionGreater(${larger}, ${smaller}) === true`, function() {
        Mod.versionGreater(larger, smaller).should.equal(true);
      })
    })
  });

  describe("returns 'false' when versions are equal", function() {
    [ "0.0.0.0", "1.1.1.1", "0.1.2.3", "5"].forEach(version => {
      it(`versionGreater(${version}, ${version}) === false`, function() {
        Mod.versionGreater(version, version).should.equal(false);
      });
    });
  });

  describe("returns 'false' when version is smaller", function() {
    [
      ...standard,
      ...later,
      ...differentDigits,
    ].forEach(([larger, smaller]) => {
      it(`versionGreater(${smaller}, ${larger}) === false`, function() {
        Mod.versionGreater(smaller, larger).should.equal(false);
      });
    });
  });

});
