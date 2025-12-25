import fs from "fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import rsync from './rsync';

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
function createContext(hagaFile: string): HagaContext {
    class CLIContext implements HagaContext {
        private errors: Error[] = [];
        private warnings: Error[] = [];
        readonly ruleMap: Map<string, HagaCoreRule> = new Map();

        constructor(private readonly keywordMap: HagaKeywordMapping) {}

        eatKeywork(kwObj: HagaKeyword): string {
            return this.keywordMap[kwObj.keyword];
        }

        reportError(err: Error): void {
            this.errors.push(err);
        }

        reportWarning(warn: Error): void {
            this.warnings.push(warn);
        }

        flushReport(): boolean {
            let success = true;

            for (const err of this.errors) {
                console.error(`[HAGA ERROR] ${err.message}`);
                success = false;
            }
            for (const warn of this.warnings) {
                console.error(`[HAGA WARN] ${warn.message}`);
            }

            this.errors = [];
            this.warnings = [];
            return success;
        }

        debugLog(): void {
            console.log(this.keywordMap);
        }
    }

    const cwd = process.cwd();
    const absPath = path.resolve(cwd, hagaFile);
    const inputSubDir = path.relative(cwd, path.dirname(absPath));

    return new CLIContext({
        INPUT_DIR: cwd,
        OUTPUT_DIR: path.resolve(cwd, 'out'),
        CURRENT_INPUT_DIR: path.resolve(cwd, inputSubDir),
        CURRENT_OUTPUT_DIR: path.resolve(cwd, 'out', inputSubDir),
        BASH_COMMAND: 'bash',
        CLANG_COMMAND: 'clang',
        COPY_COMMAND: 'cp',
        HAGA_COMMAND: path.resolve(cwd, 'haga'),
        HAGA_INPUT_HAGAFILE: hagaFile,
        MAGICK_COMMAND: 'magick',
        TOUCH_COMMAND: 'touch',
    });
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
  deploy            Generate, Build and Deploy
  rsync             Explicit rsync
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
    console.log(`Usage: haga build [INPUT_HAGA_FILE] [TARGETS...]

Description:
  "build" ensures there is an out/build.ninja file, generating one if missing
  by invoking "haga genin". After that, it runs the Ninja build system in the
  out/ directory.

Arguments:
  INPUT_HAGA_FILE   Optional path to a HAGA.ts module (default: ./HAGA.ts)
  TARGETS...        Optional targets to build

Examples:
  haga build
  haga build my_path/HAGA.ts
`);
}

function printDeployHelp() {
    console.log(`Usage: haga deploy [INPUT_HAGA_FILE]

Description:
  Alias for 'haga build INPUT_HAGA_FILE deploy'.

Arguments:
  INPUT_HAGA_FILE   Optional path to a HAGA.ts module (default: ./HAGA.ts)
`);
}

function printRsyncHelp() {
    console.log(`Usage: haga rsync SRC DST [INPUTS...]

Description:
  "rsync" recursively deploys files from the SRC directory to the DST directory.
  The commands sanity-checks that the SRC directory only contains files that are
  explicitly listed in the INPUTS. This is to ensure that unexpected/ignored
  (that may contain sensitive information) isn't accidentally deployed remotely.
  Updated files from DST (which do not exist in SRC) are deleted.

Arguments:
  SRC         Source Directory (must be a local dir)
  DST         Destination Directory (may be local or remote)
  INPUTS...   List of subpaths, relative to SRC, that you want to deploy

Examples:
  haga rsync out/public user@myhost:/home/public index.html style.css code.js
`);
}

//------------------------------------------------------------------------------
// Subcommands
//------------------------------------------------------------------------------
async function runGenin(hagaFile: string, outDir: string | undefined): Promise<void> {
    const ctx = createContext(hagaFile);
    HagaContext.setGlobalContext(ctx);

    const absPath = ctx.eatKeywork(HagaKeyword.HAGA_INPUT_HAGAFILE);
    if (absPath.endsWith(".ts")) {
        require("ts-node").register({
            transpileOnly: true, // faster, we trust the IDE/compiler for type errors
            compilerOptions: {
                module: "commonjs", // since your CLI uses CJS-style require
                esModuleInterop: true
            }
        });
    }

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

    // Build `build.ninja` before all other targets
    const regenTarg = exportData.targets.find(t => t.rule === 'regen');
    if (regenTarg) {
        for (const targ of exportData.targets) {
            if (targ.rule !== 'regen') {
                targ.orderOnly ??= [];
                targ.orderOnly.push(...regenTarg.outputs);
            }
        }
    }

    // Flush errors collected during macro evaluation
    if( ! ctx.flushReport() ) {
        process.exit(1);
    }

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

async function runBuild(hagaFile: string, targets: string[]): Promise<void> {
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
        const proc = spawn("ninja", targets, { cwd: outDir, stdio: "inherit" });

        proc.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`[HAGA ERROR] ninja exited with code ${code}`));
        });
    });
}

async function runRsync(argv: string[]): Promise<void> {
    if (argv.length < 4) {
        throw Error(`incorrect usage: see "./haga help rsync"`);
    }
    const srcDir: string   = argv[1]!;
    const dstDir: string   = argv[2]!;
    const inputs: string[] = argv.splice(3);

    const status = await rsync.run({ srcDir, dstDir, inputs });
    if (status !== 0) {
        throw Error(`rsync command exited with status: ${status}`);
    }
}

//------------------------------------------------------------------------------
// Main dispatcher
//------------------------------------------------------------------------------
async function main(argv: string[]) {
    if (argv.length === 0 || argv[0] === "help") {
        if (argv.length > 1) {
            switch (argv[1]) {
                case "genin":
                    return printGeninHelp();
                case "build":
                    return printBuildHelp();
                case "deploy":
                    return printDeployHelp();
                case "rsync":
                    return printRsyncHelp();
            }
        }
        return printGlobalHelp();
    }

    const [subcommand, ...rest] = argv;

    const hagaFile = path.resolve(process.cwd(), rest[0] ?? 'HAGA.ts')
    switch (subcommand) {
        case "genin":
            return await runGenin(hagaFile, undefined);
        case "build":
            return await runBuild(hagaFile, rest.slice(1));
        case "deploy":
            return await runBuild(hagaFile, ['deploy']);
        case "rsync":
            return await runRsync(argv);
        default:
            throw Error(`Unknown subcommand: ${subcommand}`);
    }
}

// Entry point
main(process.argv.slice(2)).catch((err) => {
    console.error("[HAGA FATAL]", err);
    process.exit(1);
});
