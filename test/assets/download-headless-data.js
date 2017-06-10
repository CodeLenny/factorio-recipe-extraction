/**
 * Downloads headless copies of Factorio, and extracts the `data` directory into `test/assets/factorio-data` for usage
 * during automated testing.
*/

const Promise = require("bluebird");
const fs = require("fs-extra");
const http = require("http");
const path = require("path");
const request = require("request-promise");
const tmp = require("tmp-promise");
const cheerio = require("cheerio");
const exec = require("child-process-promise").exec;

// `null` to download all
const versions = [
  /0\.14.*/,
];

/**
 * Given the versions available from the Factorio download page,
 * filter out versions that aren't selected to download (listed in `versions`)
 * @param {Array<String>} given the Factorio versions given as possible downloads
 * @return {Array<String>} the versions that should be downloaded, if any.
*/
function filterVersions(given) {
  if(versions) {
    return given.filter(url => versions.some(version => version.test(url)));
  }
  return versions;
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    let out = fs.createWriteStream(dest);
    let req = http.get(url, res => {
      res.pipe(out);
      out.on("finish", () => {
        out.close(() => {
          resolve(dest);
        });
      });
    });
    req.on("error", err => {
      fs.unlink(out);
      reject(err);
    });
  });
}

let urls = request("https://www.factorio.com/download-headless")
  .then(cheerio.load)
  .then($ => $("a[href^='/get-download/']").map((i, el) => $(el).attr("href")).get())
  .then(filterVersions)
  .then(versions => versions.map(version => `https://www.factorio.com/${version}`))

let outDir = null;

function downloadVersion(url) {
  let version = url.match(/\/([0-9]+\.[0-9]+\.[0-9]+)\//)[1];
  console.log(`Downloading v${version}`);
  //return download(url, path.join(outDir.path, `${version}.tar.gz`))
  return Promise
    .all([
      exec(`wget -O '${outDir.path}/${version}.tar.gz' '${url}'`),
      fs.ensureDir(`${outDir.path}/${version}`),
    ])
    .then(() => {
      return exec(`tar xvf '${outDir.path}/${version}.tar.gz' -C '${outDir.path}/${version}'`);
    })
    .then(res => {
      return exec(`mv '${outDir.path}/${version}/factorio/data' '${__dirname}/factorio-data/${version}'`);
    });
}

Promise
  .all([tmp.dir({ keep: true, unsafeCleanup: true }), urls, fs.ensureDir(`${__dirname}/factorio-data`)])
  .then(([o, urls]) => {
    outDir = o;
    return Promise.all(urls.map(downloadVersion));
  })
  .catch(err => console.log(err.stack))
  .finally(() => {
    //outDir.cleanup();
  });
