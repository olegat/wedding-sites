import path from "node:path";
import process from "node:process";

import {
    type HagaCoreExport,
    type HagaCoreRule,
    writeNinjaBuild,
} from "./hagaCore";

import {
    HagaKeywords,
    type HagaKeyword,
} from "./hagaKeyword";

import {
    HagaContext,
} from "./hagaContext";

//------------------------------------------------------------------------------
// Context implementation
//------------------------------------------------------------------------------
class CLIContext implements HagaContext {
    private errors: Error[] = [];
    readonly ruleMap: Map<string, HagaCoreRule> = new Map();

    eatKeywork(sym: HagaKeyword): string {
        switch (sym) {
            case HagaKeywords.INPUT_DIR:
                return process.cwd();
            case HagaKeywords.OUTPUT_DIR:
                return process.cwd();
            default:
                this.reportError(new Error(`Unknown keyword: ${sym.keyword}`));
                return "";
        }
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
}

//------------------------------------------------------------------------------
// Help text
//------------------------------------------------------------------------------
function printGlobalHelp() {
    console.log(`Usage: haga <subcommand> [options]

Available subcommands:
  help              Show this help message
  genin             Generate Ninja build files from a HAGA.ts file
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
  haga genin public/HAGA.ts > build.ninja
`);
}

function printGeninInvalid() {
    console.error("Invalid usage of 'haga genin'");
    console.error("Run 'haga help genin' for usage.");
}

//------------------------------------------------------------------------------
// Subcommands
//------------------------------------------------------------------------------
async function runGenin(args: string[]): Promise<void> {
    const inputPath = args[0];
    if (inputPath == null || args.length !== 1) {
        printGeninInvalid();
        process.exit(1);
    }

    const absPath = path.resolve(process.cwd(), inputPath);
    if (absPath.endsWith(".ts")) {
        require("ts-node").register({
            transpileOnly: true, // faster, we trust the IDE/compiler for type errors
            compilerOptions: {
                module: "commonjs", // since your CLI uses CJS-style require
                esModuleInterop: true
            }
        });
    }

    const ctx = new CLIContext();
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

    // Flush errors collected during macro evaluation
    ctx.flushErrors();

    // Write Ninja to stdout
    writeNinjaBuild(exportData, (s) => process.stdout.write(s));
}

//------------------------------------------------------------------------------
// Main dispatcher
//------------------------------------------------------------------------------
async function main(argv: string[]) {
    if (argv.length === 0 || argv[0] === "help") {
        if (argv.length === 2 && argv[1] === "genin") {
            printGeninHelp();
        } else {
            printGlobalHelp();
        }
        return;
    }

    const [subcommand, ...rest] = argv;
    switch (subcommand) {
        case "genin":
            await runGenin(rest);
            break;
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
