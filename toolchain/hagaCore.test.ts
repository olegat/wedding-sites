import { HagaCore, HagaCoreExport } from "./hagaCore";
import { writeFileSync } from "node:fs";

const core: HagaCoreExport = {
  rules: [
    {
      name: "cc",
      commands: [["gcc", "-c", "$in", "-o", "$out"]],
      description: "Compiling $in"
    },
    {
      name: "link",
      commands: [["gcc", "$in", "-o", "$out"], ["echo", "Link complete!"]],
      description: "Linking $out"
    }
  ],
  targets: [
    { inputs: ["foo.c"], outputs: ["foo.o"], rule: "cc" },
    { inputs: ["foo.o"], outputs: ["foo"], rule: "link" }
  ]
};

HagaCore.writeNinjaBuild(core, s => writeFileSync("build.ninja", s, { flag: "a" }));
