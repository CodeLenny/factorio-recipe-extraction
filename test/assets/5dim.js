const Promise = require("bluebird");
const request = require("request");
const path = require("path");
const fs = require("fs-extra");
const exec = require("child-process-promise").exec;

/**
 * Download a file from a URL, and save it to the file system.
 * @param {String} url the URL to download.
 * @param {String} saveLocation the location on the file system to save the file to.
 * @return {Promise} resolves when the download has finished.
*/
function download(url, saveLocation) {
  return new Promise((resolve, reject) => {
    request(url)
      .pipe(fs.createWriteStream(saveLocation))
      .on("close", () => resolve())
      .on("error", err => {
        fs.unlink(saveLocation);
        reject(err);
      });
  });
}

/**
 * Provides a compressed archive of the given files.
 * @param {String} files the directory to compress
 * @param {String} output the path to use for the created archive.
 * @return {Promise} resolves when the archive has been created.
*/
function zip(files, output) {
  return exec(`cd ${files}; cd ../; zip -r ${output} ${path.basename(files)}`);
}

/**
 * Extract the files from a zip archive.
 * @param {String} archive the path to the file archive to unpack
 * @param {String} outdir the path to the output directory
 * @return {Promise} resolves when the archive has been extracted.
*/
function unzip(archive, outdir) {
  return exec(`unzip -qq -n ${archive} -d ${outdir}`);
}

/**
 * Strip the top level directory, useful when extracting zip files.
 * @param {String} dir the outer directory, which should contain a single directory to remove.
 * @return {Promise} resolves when the directory has been stripped.
*/
function stripDir(dir) {
  let inner = null;
  return fs
    .readdir(dir)
    .then(contents => inner = contents[0])
    .then(inner => exec(`mv ${path.join(dir, inner, "*")} ${dir}`));
}

/**
 * Downloads a copy of 5Dim's mods for testing.
 * @private
*/
class Download5Dim {

  /**
   * Provides a path to a directory to store zipped mods in.
   * @param {String} commit the Git commit that was downloaded
   * @return {String} the complete path to the storage directory
  */
  static zipped(commit) { return path.join(__dirname, "5dim", "zipped", commit.slice(0, 7)); }

  /**
   * Provides a path to a directory to store unzipped copies of the repository in.
   * @param {String} commit the Git commit that was downloaded
   * @return {String} the complete path to the storage directory
  */
  static unpacked(commit) {
    return path.join(__dirname, "5dim", "versions", commit.slice(0, 7));
  }

  /**
   * Provides a path to a directory to store downloaded archives of the repository in.
   * @param {String} commit the Git commit that will be downloaded
   * @return {String} the complete path to download the zip to.
  */
  static downloadZip(commit) {
    return path.join(__dirname, "5dim", "downloaded", commit.slice(0, 7)+".zip");
  }

  /**
   * Provides a download URL for 5Dim's mods.
   * @param {String} commit a branch name or `sha` commit to download.
   * @return {String} the formatted download URL.
  */
  static url(commit) { return `https://github.com/McGuten/5DimsFactorioMods/archive/${commit}.zip`; }

  /**
   * Downloads the zip file for a specific commit
   * @param {String} commit the Git commit to download and unpack.
   * @return {Promise<String>} the path to the downloaded zip.
   * @todo Don't download if it already exists.
  */
  static downloadContent(commit) {
    let downloaded = this.downloadZip(commit);
    if(!this._downloadContent) { this._downloadContent = {}; }
    if(this._downloadContent[commit]) { return this.downloadContent[commit]; }
    return this._downloadContent[commit] = Promise
      .resolve(fs.pathExists(downloaded))
      .then(exists => {
        if(!exists) { return; }
        let err = new Error("File exists.");
        err.exists = true;
        throw err;
      })
      .then(() => fs.ensureDir(path.dirname(downloaded)))
      .then(() => download(this.url(commit), downloaded))
      .catch({ exists: true }, err => true)
      .then(() => downloaded);
  }

  /**
   * Unpacks the files from a download of 5dim's mods.
   * @param {String} commit the Git commit to download and unpack.
   * @return {Promise<String>} the path to the unpacked zip
   * @todo Don't unzip if already unpacked.
  */
  static unpackDownload(commit) {
    if(!this._unpackDownload) { this._unpackDownload = {}; }
    if(this._unpackDownload[commit]) { return this._unpackDownload[commit]; }
    let zipped = null;
    let unpacked = this.unpacked(commit);
    return this._unpackDownload[commit] = Promise
      .resolve(fs.pathExists(unpacked))
      .then(exists => {
        if(!exists) { return; }
        let err = new Error("File exists.");
        err.exists = true;
        throw err;
      })
      .then(() => Promise.all([ this.downloadContent(commit), fs.ensureDir(path.dirname(unpacked)) ]))
      .then(([z]) => zipped = z)
      .then(zipped => unzip(zipped, unpacked))
      .then(() => stripDir(unpacked))
      .catch({ exists: true }, err => true)
      .then(() => unpacked);
  }

  /**
   * Finds the directory containing one of 5dim's mods, downloading the given commit from GitHub if needed.
   * @param {String} submod the 5dim mod to download, e.g. `"core"`, `"ores"`.
   * @param {String} [commit] the Git commit to download.  Defaults to `master`.
   * @return {Promise<String>} the path to the downloaded (and unzipped) sub-mod.
  */
  static modDir(submod, commit) {
    if(!commit) { commit = "master"; }
    let regex = new RegExp(`^5dim_${submod}_[0-9]+\.[0-9]+\.[0-9]+$`, "i");
    let dir = null;
    return this
      .unpackDownload(commit)
      .then(d => dir = d)
      .then(dir => fs.readdir(dir))
      .then(files => files.find(file => file.match(regex)))
      .then(file => path.join(dir, file));
  }

  /**
   * Produces a zipped archive of the given 5dim mod.
   * @param {String} submod the 5dim mod to download, e.g. `"core"`, `"ores"`.
   * @param {String} [commit] the Git commit to download.  Defaults to `master`.
   * @return {Promise<Array<String>>} `[zip, dir]` returns the path to the zipped mod, followed by a directory
   *   containing the unzipped contents of the mod.
   * @todo check if mod already exists
  */
  static zippedMod(submod, commit) {
    if(!commit) { commit = "master"; }
    let outdir = this.zipped(commit);
    let mdir = null;
    let outZip = null;
    return Promise
      .all([ this.modDir(submod, commit), fs.ensureDir(outdir) ])
      .then(([dir]) => {
        mdir = dir;
        let filename = path.basename(dir) + ".zip";
        outZip = path.join(outdir, filename);
        return zip(dir, outZip);
      })
      .then(() => [outZip, mdir]);
  }

}

module.exports = Download5Dim;
