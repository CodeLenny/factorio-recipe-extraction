const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
const path = require("path");
const glob = require("glob-promise");
const Mod = require("./Mod");

/**
 * Options to configure finding modules.
 * @typedef {Object} ModuleLoaderOptions
 * @property {String} factorioPath **Required** The directory where Factorio is installed.
 * @property {String} factorioDataPath the directory containing Factorio's core mods.
 *   Defaults to `factorioPath + "/data"`.
 * @property {String} factorioModPath the directory containing user-added mods.  Defaults to `factorioPath + "/mods"`
 * @property {String} factorioModList the JSON file listing which mods are enabled.  Defaults to
 *   `factorioModPath + "/mod-list.json"`
 * @property {Boolean} vanilla if `true`, the vanilla game components will be added to the output.  Defaults to `true`.
 * @property {Boolean} added if `true`, user-added mods will be added to the output.  Defaults to `true`.
*/

/**
 * Locates Factorio modules, determines dependencies, and filters by enabled mods.
*/
class ModuleLoader {

  /**
   * The `Mod` class to use when creating new `Mod` instances.  Can be overridden for testing, etc.
  */
  get Mod() {
    return this._Mod || Mod;
  }

  set Mod(_Mod) { this._Mod = _Mod; }

  /**
   * The default loading options.
   * @type {ModuleLoaderOptions}
   * @private
  */
  static get defaultLoadOptions() {
    return {
      vanilla: true,
      added: true,
    };
  }

  /**
   * @param {ModuleLoaderOptions} loadOpts default options to use when searching for mods.
  */
  constructor(loadOpts) {
    /**
     * The default options to use when searching for mods.
     * @type {ModuleLoaderOptions}
     * @private
    */
    this._loadOpts = loadOpts;
  }

  /**
   * Merge the temporary options with the default options for this class instance and the global default options,
   * including processing dependent options (like `factorioDataPath` defaulting to `factorioPath + "/data"`)
   * @param {ModuleLoaderOptions} opts the current instance options
   * @return {ModuleLoaderOptions} the merged options
   * @private
  */
  parseOpts(opts) {
    /** @type {ModuleLoaderOptions} */
    opts = Object.assign({}, this.constructor.defaultLoadOptions, this._loadOpts, opts);
    /*if(!opts.factorioPath) {
      throw new ReferenceError("'factorioPath' is a required option for the module loader, yet was not provided.");
    }*/
    if(!opts.factorioDataPath && opts.factorioPath) {
      opts.factorioDataPath = opts.factorioPath + "/data";
    }
    if(!opts.factorioModPath && opts.factorioPath) {
      opts.factorioModPath = opts.factorioPath + "/mods";
    }
    if(!opts.factorioModList && opts.factorioModPath) {
      opts.factorioModList = opts.factorioModPath + "/mod-list.json";
    }
    return opts;
  }

  /**
   * Find all Factorio Mods installed.
   * @param {ModuleLoaderOptions} opts options to control searching for mods.
   * @return {Promise<ModArray>} all mods installed.
   * @todo Test returning only `vanilla` or only `added`
  */
  all(opts) {
    opts = this.parseOpts(opts);
    return Promise
      .all([
        opts.vanilla ? this.vanilla(opts.factorioDataPath) : [],
        opts.added ? this.added(opts.factorioModPath) : [],
      ])
      .then((...args) => {
        let groups = [].concat(...args);
        return [].concat(...groups);
      });
  }

  /**
   * Find all Factorio Mods that are enabled.
   * @param {ModArray} [mods] **Optional** The mods to filter.  Defaults to searching for all mods.
   * @param {ModuleLoaderOptions} [opts] options to control searching for mods.
   * @return {Promise<ModArray>} all mods installed and enabled.
   * @todo Test
  */
  enabled(mods, opts) {
    opts = this.parseOpts(opts);
    if(!mods) { mods = this.all(opts); }
    let modList = require(opts.factorioModList);
    let enabled = modList.mods.filter(mod => mod.enabled).map(mod => mod.name);
    return Promise
      .resolve(mods)
      .then((mods) => mods.filter(mod => enabled.indexOf(mod.name) > -1));
  }

  /**
   * Sort Factorio mods (by unknown sorting method)
   * @param {ModArray} [mods] **Optional** The mods to sort.  Defaults to searching for all mods.
   * @return {Promise<ModArray>} resolves to a sorted list of the given mods.
   * @see {@link https://bitbucket.org/Nicksaurus/foreman/src/46053df/Foreman/DependencyGraph.cs#DependencyGraph.cs-43}
   * @todo figure out sorting order
  */
  sortedDependencies(mods) {
    if(!mods) { mods = this.all(); }
    return Promise
      .resolve(mods)
      .then((mods) => {

        let sorted = [];

        let adjacencyMatrix = mods.map(i => mods.map(j => i.dependsOn(j) ? 1 : 0));

        // Get all mods with no incoming dependencies
        let s = mods.filter((mod, i) => mods.every((mod2, j) => adjacencyMatrix[j][i] !== 1 ));

        /**
         * Loop through mods that have no dependencies, or have dependencies already resolved.
         * Add each to a sorted array, and see if any dependencies in the matrix now have resolved dependencies.
        */
        while(s.length > 0) {
          let mod = s.shift();
          sorted.push(mod);
          let modIndex = mods.indexOf(mod);

          /**
           * Loop through all mods.  If they were dependent on us, we've already been added to the sorted list and they
           * should no longer be waiting for us.
           * So, remove that dependency if we find one.  Now that they are waiting for one less item, see if all of the
           * dependencies have been added.  If so, they can be added to the list of resolved mods (`s`) and added to the
           * output in a later round.
          */
          for(let m = 0; m < mods.length; m++) {
            if(adjacencyMatrix[modIndex][m] === 0) { continue; }
            adjacencyMatrix[modIndex][m] = 0;
            let resolved = mods.every((_, i) => adjacencyMatrix[i][m] === 0);
            if(resolved) { s.push(mods[m]); }
          }
        }

        return sorted.reverse();

      });
  }

  /**
   * Finds the vanilla game components.
   * @param {String} dataPath the path to the `data` directory inside a Factorio install, where internal mods are
   *   located.
   * @return {Promise<ModArray>}
   * @private
  */
  vanilla(dataPath) {
    return glob
      .promise("./*/info.json", { cwd: dataPath })
      .then(manifests =>
        Promise.all( manifests.map(manifest => this.Mod.loadFromManifest(path.join(dataPath, manifest))) )
      );
  }

  /**
   * Finds user-added game components.
   * @return {Promise<ModArray>}
   * @private
  */
  added(modPath) {
    return glob
      .promise("./*.zip", { cwd: modPath })
      .then(zips =>
        Promise.all( zips.map(zip => this.Mod.loadFromZip(path.join(modPath, zip))) )
      );
  }

}

module.exports = ModuleLoader;
