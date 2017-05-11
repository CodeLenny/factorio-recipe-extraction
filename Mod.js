/**
 * An array of Factorio Mods, useful for documenting return types inside Promises.
 * Use `{Promise<ModArray>}` instead of `{Promise<Array<Mod>>}`.
 * @typedef {Array<Mod>} ModArray
*/

/**
 * A Factorio mod.
*/
class Mod {

  /**
   * Loads a Mod given the path to a manifest (`info.json`) file.
   * @param {String} manifest the path to a manifest file (`info.json`) for a mod.  Must not be inside a zipped
   *   directory.
   * @return {Promise<Mod>}
  */
  static loadFromManifest(manifest) {
    let mod = new Mod();
    mod.manifest = require(manifest);
    return Promise.resolve(mod);
  }

  /**
   * Loads a Mod given the path to the mod's zipped data.
   * @param {String} zip the patht to a zipped mod directory.
   * @return {Promise<Mod>}
  */
  static loadFromZip(zip) {
    let mod = new Mod();
    return Promise.resolve(mod);
  }

  /**
   * @param {Object} manifest the manifest file for this mod.
  */
  constructor(manifest) {
    this.manifest = manifest;
  }

  get name() { return this.manifest.name; }

}

module.exports = Mod;
