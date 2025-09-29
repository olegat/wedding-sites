import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import type { HagaCoreExport, HagaCoreRule } from "./hagaCore";
import { writeNinjaBuild } from "./hagaCore";
import { HagaKeywords, type HagaKeyword } from "./hagaKeyword";

//------------------------------------------------------------------------------
// Context implementation
//------------------------------------------------------------------------------
class CLIContext {
    private errors: Error[] = [];
    readonly ruleMap: Map<string, HagaCoreRule> = new Map();

    eatKeywork(sym: HagaKeyword): string {
        switch (sym) {
            case HagaKeywords.INPUT_DIR:
                return process.cwd();
            case HagaKeywords.OUTPUT_DIR:
                return process.cwd();
            default:
                this.reportError(new Error(`Unknown keyword: ${sym}`));
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

    const inputFile = path.resolve(inputPath);
    if (!fs.existsSync(inputFile)) {
        console.error(`[HAGA ERROR] File not found: ${inputFile}`);
        process.exit(1);
    }

    const ctx = new CLIContext();
    (globalThis as any).ctx = ctx;

    // Dynamic import of the HAGA.ts file
    let mod: any;
    try {
        mod = await import(pathToFileURL(inputFile).href);
    } catch (err) {
        console.error(`[HAGA ERROR] Failed to import ${inputFile}:`, err);
        process.exit(1);
    }

    if (!mod.HAGA) {
        console.error(`[HAGA ERROR] Module ${inputFile} does not export { HAGA }`);
        process.exit(1);
    }

    const exportData: HagaCoreExport = mod.HAGA;

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
