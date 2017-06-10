const Promise = require("bluebird");
const fs = require("fs-extra");
const path = require("path");
const ModuleLoader = require("./ModuleLoader");
const nodelua = require("nodelua");

/**
 * `Array.map()` for objects.  Walks through each property in the object and creates an object after running each key
 * through `cb`.
 * @param {Object} obj the object to iterate through.
 * @param {Function} cb called for each property in `obj`.  Return `undefined` to remove a key.  Otherwise, the returned
 *   value will be added to the output object under the same key.
 * @return {Object} The result of running each property in `obj` through `cb`.
 * @todo Move to a static method or seperate file.
 * @todo Write unit tests.
*/
function objMap(obj, cb) {
  let out = {};
  for(const k in obj) {
    if(!obj.hasOwnProperty(k)) { continue; }
    const val = cb(k, obj[k], obj);
    if(val !== undefined) { out[k] = val; }
  }
  return out;
}

/**
 * Creates a camel-cased version of a string.
 * @param {String} str the incoming text
 * @return {String} a camel-cased version of the string.
 * @todo Move to a static method or seperate file.
 * @todo Write unit tests.
*/
function camelCase(str) {
  return str.replace(/([-_][a-zA-Z])/g, (s) => s[1].toUpperCase());
}

/**
 * Extracts data from a Factorio save.
*/
class Extractor {

  /**
   * A script that shims Factorio core utilities.
   * Adapted from Foreman's
   * {@link https://bitbucket.org/Nicksaurus/foreman/src/46053df/Foreman/DataCache.cs#DataCache.cs-103|DataCache.cs}
   * @type {String}
   * @private
  */
  static get utilScript() {
    return `
      function module(modname, ...)
      end

      require "util"
      util = {}
      util.table = {}
      util.table.deepcopy = table.deepcopy
      util.multiplystripes = multiplystripes
      util.by_pixel = by_pixel
      util.format_number = format_number
      util.increment = increment

      function log(...)
      end

      defines = {}
      defines.difficulty_settings = {}
      defines.difficulty_settings.recipe_difficulty = {}
      defines.difficulty_settings.technology_difficulty = {}
      defines.difficulty_settings.recipe_difficulty.normal = 1
      defines.difficulty_settings.technology_difficulty.normal = 1
      defines.direction = {}
      defines.direction.north = 1
      defines.direction.east = 2
      defines.direction.south = 3
      defines.direction.west = 4

      data.raw["gui-style"] = {}
      data.raw["gui-style"]["default"] = {}`;
  }

  /**
   * The Lua scripts that contain data information.
   * @type {Array<String>}
  */
  static get dataFiles() {
    return this._dataFiles || [
      "data.lua",
      "data-updates.lua",
      "data-final-fixes.lua",
    ];
  }

  //static set dataFiles(files) { this._dataFiles = files; }

  /**
   * The different categories of items in Factorio.
   * @type {Array<String>}
  */
  static get itemTypes() {
    return [ "item", "fluid", "capsule", "module", "ammo", "gun", "armor", "blueprint", "deconstruction-item",
      "mining-tool", "repair-tool", "tool" ];
  }

  static get dataTypes() {
    return [ "recipe", "assembling-machine", "furnace", "mining-drill", "resource", "module" ];
  }

  /**
   * @param {String} gamePath the path to the Factorio directory - contains "mods", "config", "data", etc.
   * @param {String} output the target output directory to dump a JSON of the Factorio data into.
   * @todo Write unit tests.
  */
  constructor(gamePath, output) {
    this.gamePath = gamePath;
    this.output = output || path.join(__dirname, "_extracted.json");
    this.lua = Promise.promisifyAll(new nodelua.LuaState("lua"));
    this._mods = [];
  }

  /**
   * Extract all of the game data, and save into a `json` file.
   * @return {Promise} resolves once all tasks have been run.
   * @todo Include list of mods in output.
   * @todo Parse images linked by resources, and (optionally) load them into the data.
  */
  extract() {
    let basePath;
    let lualib = path.join(this.gamePath, "data", "core", "lualib");
    let dataloader = path.join(lualib, "dataloader.lua");
    let moduleLoader = new ModuleLoader({ factorioPath: this.gamePath });
    return Promise.resolve()
      .then(() => this.addLuaPath(lualib))
      .then(() => this.getLuaPath())
      .then(path => basePath = path)
      .then(() => this.lua.doFileAsync(dataloader))
      .then(() => this.lua.doStringAsync(this.constructor.utilScript))
      .then(() => moduleLoader.enabled())
      .then(mods => moduleLoader.sortedDependencies(mods))
      .then(mods => {
        this._mods = mods;
        this._luaErrors = 0;
        let task = Promise.resolve();
        for(const dataFile of this.constructor.dataFiles) {
          console.log(`Running ${dataFile}`);
          for(const mod of mods) {
            let scriptPath = path.join(mod.dir, dataFile);
            task = task
              .then(() => this.setLuaPath(basePath))
              .then(() => this.addLuaPath(mod.dir))
              .then(() => this.clearLoadedPackages())
              .then(() => fs.readFile(scriptPath, "utf8"))
              .then((script) => this.lua.doStringAsync(script))
              .catch({code: "ENOENT"}, () => { return true; })
              .catch((e) => {
                this._luaErrors++;
                console.log(e.message);
                console.log("Continuing.");
                return true;
              });
          }
        }
        return task;
      })
      .then(() => console.log(`Ignorning ${this._luaErrors} Lua errors.`))
      .then(() => {
        const raw = this.lua.getGlobal("data").raw;
        let data = {
          items: {},
        };
        for(const type of this.constructor.itemTypes) {
          data.items[type] = this.filterFields(raw[type], { type: type, subgroup: type });
        }
        for(const type of this.constructor.dataTypes) {
          data[camelCase(type)+"s"] = this.filterFields(raw[type], { type: type });
        }
        return data;
      })
      .then(data => fs.writeFile(this.output, JSON.stringify(data)))
      .finally(() => Promise.all(this._mods.map(mod => mod.cleanup())));
  }

  /**
   * Add a path to the Lua package lookup.
   * @param {String} addition the Lua source file, without a file extension.
   * @return {Promise} resolves when the path has been added to the current Lua scope.
   * @todo Write unit tests.
  */
  addLuaPath(addition) {
    return this.lua.doStringAsync(`package.path = package.path .. ';${addition}/?.lua'`);
  }

  /**
   * Set the Lua path.
   * @param {String} path the new package path.
   * @return {Promise} resolves when the Lua path has been set.
   * @todo Write unit tests.
  */
  setLuaPath(path) {
    this.lua.setGlobal("package.path", path);
    return Promise.resolve();
  }

  /**
   * Get the current Lua path.
   * @return {Promise<String>} the current Lua package path.
   * @todo Write unit tests.
  */
  getLuaPath() {
    return Promise.resolve(this.lua.getGlobal("package.path"));
  }

  /**
   * Because many mods use the same path to refer to different files, we need to clear the 'loaded' table so Lua doesn't
   * think they're already loaded
   * @return {Promise} resolves when all packages have been cleared.
   * @todo Write unit tests.
  */
  clearLoadedPackages() {
    return this.lua.doStringAsync(`
      for k, v in pairs(package.loaded) do
        package.loaded[k] = false
      end`);
  }

  /**
   * Filters out repetitive fields to reduce the file output size.
   * @param {Object} objs the object to filter
   * @param {Object} filters fields to filter out.  `{<key>: <value>}` any keys matching `key` will be checked against
   *   `value`.  If `value` is a string and matches, then the key/value will be deleted from `obj`.  If `value` is a
   *   function, it will be provided the current value in the object, and it's return value will be used as the new
   *   value in `obj`.  Return `undefined` to delete the property from `obj`.
   * @return {Object} `obj` after the filters have been executed.
   * @todo Write unit tests.
  */
  filterFields(objs, filters) {
    return objMap(objs, (i, item) => {
      return objMap(item, (k, v) => {
        if(k === "name" && v === i) { return undefined; }
        if(typeof filters[k] === "string" && v === filters[k]) { return undefined; }
        if(typeof filters[k] === "function") { return filters[k](v); }
        return v;
      });
    });
  }

}

module.exports = Extractor;
