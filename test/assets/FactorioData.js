const fs = require("fs");
const path = require("path");

/**
 * Provides copies of the `data` directory located inside a Factorio installation.
 * Configured via environment variables.
*/
class FactorioData {

  constructor(version, path) {
    /**
     * The version number that this directory came from.
     * @type {String}
    */
    this.version = version;
    /**
     * The path to the data directory.
     * @type {String}
    */
    this.path = path;
  }

  /**
   * Throws an error if there aren't enough versions to test.
   * @param {Boolean} mocha if `true`, runs test inside a Mocha `it` block.  Defaults to `false`.
   * @param {Number} min the minimum number of Factorio versions to test.  Defaults to `1`.
  */
  static requireVersions(mocha, min) {
    if(typeof mocha === "number") { [mocha, min] = [false, mocha]; }
    if(typeof min !== "number") { min = 1; }
    let found = this.versions.length;
    if(mocha) {
      let it = (found < min && process.env.FACTORIO_DATA === "none") ? require("mocha").it.skip : require("mocha").it;
      it(`should have ${min} versions of Factorio for testing`, function() {
        require("chai").expect(found).to.be.at.least(min, `Should have at least ${min} versions, but found ${found}`);
      });
    }
    else {
      if(found < (min || 1)) {
        throw new ReferenceError(`At least ${min || 1} copy of Factorio data is required.  Found ${found}.`);
      }
    }
  }

  /**
   * The default directory to look for versions in.
   * @return {String}
  */
  static get versionsPath() {
    return process.env.FACTORIO_DATA_PATH || path.resolve(__dirname, "./factorio-data");
  }

  /**
   * Provides Factorio versions that should be tested by looking at the files in 'versionsPath'.
   * @return {Array<FactorioData>}
  */
  static get detectedVersions() {
    let dir = this.versionsPath;
    try {
      return fs.readdirSync(dir).map(version => new FactorioData(version, path.resolve(dir, version)));
    }
    catch (e) {
      return [];
    }
  }

  /**
   * Provides the different Factorio versions that should be tested.
   * @return {Array<FactorioData>}
  */
  static get versions() {
    if(process.env.FACTORIO_DATA === "none") { return []; }
    if(typeof process.env.FACTORIO_DATA === "undefined" || process.env.FACTORIO_DATA === "detect") {
      return this.detectedVersions;
    }
    let defs = process.env.FACTORIO_DATA.split(";");
    return defs.map(def => {
      if(def.indexOf(":") > -1) {
        [version, path] = def.split(":");
        return new FactorioData(version, path);
      }
      else {
        return new FactorioData(version, path.join(this.versionsPath, def));
      }
    });
  }

}

module.exports = FactorioData;
