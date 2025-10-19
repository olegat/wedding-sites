import fs from "fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { runGenin } from "./hagaGenin"; // assuming you have this entrypoint

import {
    HagaCore,
    type HagaCoreExport,
    type HagaCoreRule,
} from "./hagaCore";

import {
    HagaKeyword,
    HagaKeywordMapping,
} from "./hagaKeyword";

import {
    HagaContext,
} from "./hagaContext";

import {
    HagaSweet
} from "./hagaSweet";

//------------------------------------------------------------------------------
// Context implementation
//------------------------------------------------------------------------------
class CLIContext implements HagaContext {
    private errors: Error[] = [];
    readonly ruleMap: Map<string, HagaCoreRule> = new Map();

    constructor(private readonly keywordMap: HagaKeywordMapping) {}

    eatKeywork(kwObj: HagaKeyword): string {
        return this.keywordMap[kwObj.keyword];
    }

    reportError(err: Error): void {
        this.errors.push(err);
    }

    flushErrors(): void {
        if (this.errors.length > 0) {
            for (const err of this.errors) {
                console.error(`[HAGA ERROR] ${err.message}`);
            }
            this.errors = [];
        }
    }

    debugLog(): void {
        console.log(this.keywordMap);
    }
}

//------------------------------------------------------------------------------
// Help text
//------------------------------------------------------------------------------
function printGlobalHelp() {
    console.log(`Usage: haga <subcommand> [options]

Available subcommands:
  help              Show this help message
  genin             Generate Ninja build files from a HAGA.ts file
  build             Generate (if missing) and run Ninja in the out/ directory
`);
}

function printGeninHelp() {
    console.log(`Usage: haga genin INPUT_HAGA_FILE

Description:
  "genin" stands for "GEnerate NINja". It takes a HAGA.ts file,
  runs it through the HAGA macros, and outputs a Ninja build.ninja file.

Arguments:
  INPUT_HAGA_FILE   Path to a HAGA.ts module that exports { HAGA }

Examples:
  haga genin HAGA.ts > build.ninja
`);
}

function printBuildHelp() {
    console.log(`Usage: haga build [INPUT_HAGA_FILE]

Description:
  "build" ensures there is an out/build.ninja file, generating one if missing
  by invoking "haga genin". After that, it runs the Ninja build system in the
  out/ directory.

Arguments:
  INPUT_HAGA_FILE   Optional path to a HAGA.ts module (default: ./HAGA.ts)

Examples:
  haga build
  haga build my_path/HAGA.ts
`);
}

//------------------------------------------------------------------------------
// Subcommands
//------------------------------------------------------------------------------
async function runGenin(hagaFile: string, outDir: string | undefined): Promise<void> {
    const cwd = process.cwd();
    const absPath = path.resolve(cwd, hagaFile);
    if (absPath.endsWith(".ts")) {
        require("ts-node").register({
            transpileOnly: true, // faster, we trust the IDE/compiler for type errors
            compilerOptions: {
                module: "commonjs", // since your CLI uses CJS-style require
                esModuleInterop: true
            }
        });
    }

    const inputSubDir = path.relative(cwd, path.dirname(absPath));
    const ctx = new CLIContext({
        INPUT_DIR: cwd,
        OUTPUT_DIR: path.resolve(cwd, 'out'),
        CURRENT_INPUT_DIR: path.resolve(cwd, inputSubDir),
        CURRENT_OUTPUT_DIR: path.resolve(cwd, 'out', inputSubDir),
        COPY_COMMAND: 'cp',
        CPP_COMMAND: 'cpp',
        HAGA_COMMAND: './haga',
        HAGA_INPUT_HAGAFILE: hagaFile,
    });
    HagaContext.setGlobalContext(ctx);

    // Dynamic import of the HAGA.ts file
    let mod: unknown;
    try {
        mod = require(absPath).default;
    } catch (err) {
        console.error(`[HAGA ERROR] Failed to import ${absPath}:`, err);
        process.exit(1);
    }

    // Dynamic import of the HAGA.ts file
    if (!mod) {
        console.error(`[HAGA ERROR] Module ${absPath} does have a default export`);
        process.exit(1);
    }

    const exportData: HagaCoreExport = mod as HagaCoreExport; // TODO: validate

    // Add default rule for regenerating `build.ninja`
    if (!ctx.ruleMap.has('regen')) {
        const defaultRegen = HagaSweet.eatSugar({ targets: [ { type: 'regen' } ]});
        // TODO! Fix eatSugar().rules logic (incorrectly outputs ctx.rulesMap.values()):
        //exportData.rules.push(...defaultRegen.rules);
        for (const rule of defaultRegen.rules) {
            if (rule.name === 'regen') {
                exportData.rules.push(rule);
            }
        }
        exportData.targets.unshift(...defaultRegen.targets);
    }

    // Flush errors collected during macro evaluation
    ctx.flushErrors();

    let outStream: (s: string) => void;
    if (outDir) {
        // Write Ninja to file
        const outPath = path.resolve(outDir, 'build.ninja');
        outStream = s => fs.writeFileSync(outPath, s, { flag: "a" });
    } else {
        // Write Ninja to stdout
        outStream = (s) => process.stdout.write(s);
    }
    HagaCore.writeNinjaBuild(exportData, outStream);
}

async function runBuild(hagaFile: string): Promise<void> {
    const outDir = path.resolve("out");
    const ninjaFile = path.join(outDir, "build.ninja");

    // Step 1. Ensure out/ exists
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    // Step 2. Generate build.ninja if missing
    if (!fs.existsSync(ninjaFile)) {
        await runGenin(hagaFile, outDir);
    }

    // Step 3. Invoke ninja
    await new Promise<void>((resolve, reject) => {
        const proc = spawn("ninja", {
            cwd: outDir,
            stdio: "inherit",
        });

        proc.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`[HAGA ERROR] ninja exited with code ${code}`));
        });
    });
}

//------------------------------------------------------------------------------
// Main dispatcher
//------------------------------------------------------------------------------
async function main(argv: string[]) {
    if (argv.length === 0 || argv[0] === "help") {
        if (argv.length === 2 && argv[1] === "genin") {
            printGeninHelp();
        } else if (argv.length === 2 && argv[1] === "build") {
            printBuildHelp();
        } else {
            printGlobalHelp();
        }
        return;
    }

    const [subcommand, ...rest] = argv;

    const hagaFile = path.resolve(process.cwd(), rest[0] ?? 'HAGA.ts')
    switch (subcommand) {
        case "genin": {
            return await runGenin(hagaFile, undefined);
        }
        case "build": {
            return await runBuild(hagaFile);
        }
        default:
            console.error(`Unknown subcommand: ${subcommand}`);
            printGlobalHelp();
            process.exit(1);
    }
}

// Entry point
main(process.argv.slice(2)).catch((err) => {
    console.error("[HAGA FATAL]", err);
    process.exit(1);
});
