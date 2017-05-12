const chai = require("chai");
const should = chai.should();

const Mod = require("../Mod");
const ModuleLoader = require("../ModuleLoader");

describe("ModuleLoader#sortedDependencies", function() {

  it("shouldn't change an empty array", function() {
    return new ModuleLoader().sortedDependencies([]).then(mods => mods.should.deep.equal([]));
  });

  it("shouldn't change independent mods", function() {
    let mods = [ new Mod({ name: "one" }), new Mod({ name: "two" }), new Mod({ name: "three" }) ];
    return new ModuleLoader().sortedDependencies(mods).then(sorted => {
      sorted.length.should.equal(mods.length);
      outNames = sorted.map(m => m.name).sort();
      outNames.should.deep.equal(mods.map(m => m.name).sort());
      sorted.forEach(m => mods.indexOf(m).should.be.above(-1));
    });
  });

  describe("should list independents before mods with dependencies", function() {
    let independent = new Mod({ name: "ind", version: "0.0.0.0" });
    let dependent = new Mod({ name: "dep", version: "0.0.0.0", dependencies: ["ind = 0.0.0.0"] });
    let deeplyDependent = new Mod({ name: "deepDep", dependencies: ["dep = 0.0.0.0"] });
    let allMods = { independent, dependent, deeplyDependent };
    let loader = new ModuleLoader();

    let options = [
      { name: "[independent, dependent]", mods: [independent, dependent], expect: [independent, dependent] },
      { name: "[dependent, independent]", mods: [dependent, independent], expect: [independent, dependent] },
    ];

    for(const one in allMods) {
      if (!allMods.hasOwnProperty(one)) { continue; }
      for(const two in allMods) {
        if(!allMods.hasOwnProperty(two) || one === two) { continue; }
        for(const three in allMods) {
          if(!allMods.hasOwnProperty(three) || one === three || two === three) { continue; }
          options.push({
            name: `[${one}, ${two}, ${three}]`,
            mods: [ allMods[one], allMods[two], allMods[three] ],
            expect: [ independent, dependent, deeplyDependent ],
          });
        }
      }
    }

    options.forEach(({name, mods, expect}) => {
      it(`sortedDependencies(${name})`, function() {
        return loader.sortedDependencies(mods).then(list => {
          list.length.should.equal(mods.length);
          list.should.deep.equal(expect);
        });
      });
    });

  });

  it("should work with parallel dependency trees", function() {

    let a1 = new Mod({ name: "a1", version: "0.0.0.0" });
    let a2 = new Mod({ name: "a2", dependencies: ["a1 = 0.0.0.0"] });
    let b1 = new Mod({ name: "b1", version: "0.0.0.0" });
    let b2 = new Mod({ name: "b2", dependencies: ["b1 = 0.0.0.0"] });

    return new ModuleLoader().sortedDependencies([ b1, a1, a2, b2 ]).then(list => {
      list.length.should.equal(4);
      list.indexOf(a1).should.be.below(list.indexOf(a2));
      list.indexOf(b1).should.be.below(list.indexOf(b2));
    });

  });

});
