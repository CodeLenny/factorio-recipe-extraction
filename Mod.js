const Promise = require("bluebird");
const fs = require("fs-extra");
const path = require("path");
const tmp = require("tmp-promise");
const unzip = require("unzipper");

/**
 * An array of Factorio Mods, useful for documenting return types inside Promises.
 * Use `{Promise<ModArray>}` instead of `{Promise<Array<Mod>>}`.
 * @typedef {Array<Mod>} ModArray
*/

/**
 * The possible types of a module dependency.
 * @enum {String}
 * @readonly
*/
const DependencyType = {
  EqualTo: "=",
  GreaterThan: ">",
  GreaterThanOrEqual: ">=",
};

/**
 * The details of a mod dependency.
 * @typedef {Object} ModDependency
 * @property {Boolean} optional `true` if the mod dependency is optional.
 * @property {String} name the name of the required mod.
 * @property {DependencyType} type the type of dependency.
 * @property {String} version the version dependency of the mod.  Defaults to `"0.0.0.0"`.
*/

/**
 * A Factorio mod.
*/
class Mod {

  /**
   * Loads an unpacked {@link Mod} by path.
   * @param {String} dir the directory containing a manifest (`info.json`) file.
   *   directory.
   * @return {Promise<Mod>}
  */
  static loadFromManifest(dir) {
    let mod = new Mod(require(path.join(dir, "info.json")), dir);
    return Promise.resolve(mod);
  }

  /**
   * Loads a Mod given the path to the mod's zipped data.
   * @param {String} zip the patht to a zipped mod directory.
   * @return {Promise<Mod>}
  */
  static loadFromZip(zip) {
    let tmpDir = null;
    return tmp
      .dir({ keep: true, unsafeCleanup: true })
      .then(o => tmpDir = o)
      .then(tmpDir => {
        return fs
          .createReadStream(zip)
          .pipe(unzip.Extract({ path: tmpDir.path }))
          .promise();
        })
      .then(() => fs.readdir(tmpDir.path))
      .then(files => files[0])
      .then(dir => {
        let mod = new Mod(require(path.join(tmpDir.path, dir, "info.json")), path.join(tmpDir.path, dir));
        mod.addCleanup(tmpDir.cleanup);
        return mod;
      });
  }

  /**
   * Checks that the version is larger than the test version.
   * @param {String} version the version that should be larger.
   * @param {String} test the version that should be smaller.
   * @return {Boolean} `true` if `version` is larger than `test`.
  */
  static versionGreater(version, test) {
    version = version.split(".");
    test = test.split(".");
    for(let i = 0; i < test.length; i++) {
      let v = parseInt(version[i], 10);
      let t = parseInt(test[i], 10);
      if(v > t) { return true; }
      if(v < t) { return false; }
    }
    return false; // versions are equal.
  }

  /**
   * @param {Object} manifest the manifest file for this mod.
   * @param {String} directory the location for mod files.
  */
  constructor(manifest, directory) {
    this.manifest = manifest;
    this.dir = directory;
    /**
     * Other mods that this mod is dependent on.
     * @type {Array<ModDependency>}
    */
    this._parsedDependencies = this.parseDependencies();
    /**
     * A list of cleanup tasks that will remove temporary files.  Tasks can return a `Promise` for longer-running tasks.
     * @type {Array<Function>}
    */
    this._cleanupTasks = [];
  }

  get name() { return this.manifest.name; }

  get version() { return this.manifest.version || "0.0.0.0"; }

  get dependencies() {
    let extra = [];
    if(this.name === "base") { extra.push("core"); }
    return this.manifest.dependencies ? this.manifest.dependencies.concat(extra) : extra;
  }

  /**
   * Add a task to execute when cleaning up this {@link Mod}.
   * @param {Function} task the additional task to run during cleanup.  Can return a `Promise` for longer tasks.
  */
  addCleanup(task) {
    this._cleanupTasks.push(task);
  }

  /**
   * Run all cleanup tasks to remove temporary files used when creating the mod.
   * @return {Promise} resolves when all temporary files have been cleaned up.
  */
  cleanup() {
    return Promise.all(this._cleanupTasks.map(task => task()));
  }

  /**
   * Determines if this mod satisfies the given dependency selection.
   * @param {ModDependency} dep the dependency to check against.
   * @return {Boolean} `true` if the mod satisfies the dependency.
  */
  satisfiesDependency(dep) {
    return this.name === dep.name && (
      typeof dep.version !== "string" ||
      (
        (dep.type === DependencyType.EqualTo || dep.type === DependencyType.GreaterThanOrEqual) &&
        dep.version === this.version
      ) ||
      (
        (dep.type === DependencyType.GreaterThan || dep.type === DependencyType.GreaterThanOrEqual) &&
        this.constructor.versionGreater(this.version, dep.version)
      )
    );
  }

  /**
   * Determines if this mod depends on the given mod.
   * @param {Mod} mod the mod to compare
   * @param {Boolean} ignoreOptional if `true`, optional dependencies are not compared.  Defaults to `false`.
   * @return {Boolean} `true` if this mod depends on the given mod.
  */
  dependsOn(mod, ignoreOptional) {
    let deps = ignoreOptional ? this._parsedDependencies.filter(dep => !dep.optional) : this._parsedDependencies;
    return deps.some(dep => mod.satisfiesDependency(dep));
  }

  /**
   * Parse the dependencies listed for this mod.
   * @return {Array<ModDependency>}
   * @private
  */
  parseDependencies() {
    return this.dependencies.map(d => {
      let dep = d.split(" ");
      let optional = false;
      let name, type, version;
      if(dep[0] === "?") {
        optional = true;
        dep.shift();
      }
      [name, type, version] = dep;
      if(!version) { version = "0.0.0.0"; }
      return {optional, name, type, version};
    });
  }

}

module.exports = Mod;
