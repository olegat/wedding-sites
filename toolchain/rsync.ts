import type { Stats } from 'fs';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';

//------------------------------------------------------------------------------
// Types:
//------------------------------------------------------------------------------
type RSyncOptions = {
    inputs: string[];
    srcDir: string;
    dstDir: string;
};

enum RSyncErrorCode {
    SUCCESS = 'SUCCESS',

    CONFIG_INVALID_SCHEMA = 'CONFIG_INVALID_SCHEMA',
    CONFIG_PARSE_ERROR = 'CONFIG_PARSE_ERROR',
    CONFIG_READ_ERROR = 'CONFIG_READ_ERROR',
    CONFIG_WRITE_ERROR = 'CONFIG_WRITE_ERROR',
    INPUT_IS_DIRECTORY = 'INPUT_IS_DIRECTORY',
    INPUT_NOT_FOUND = 'INPUT_NOT_FOUND',
    INPUT_OUTSIDE_SRC_DIR = 'INPUT_OUTSIDE_SRC_DIR',
    SRC_DIR_NOT_DIRECTORY = 'SRC_DIR_NOT_DIRECTORY',
    SRC_DIR_NOT_FOUND = 'SRC_DIR_NOT_FOUND',
    UNEXPECTED_FILE = 'UNEXPECTED_FILE',
}

type RSyncError = {
    errorCode: RSyncErrorCode;
    msg: string;
};

type RSyncConfig = {
    dstDir: string;
};

type RSyncReadConfigResult_Success = {
    errorCode: RSyncErrorCode.SUCCESS;
    config: RSyncConfig;
};
type RSyncReadConfigResult_Failure = {
    errorCode: Exclude<RSyncErrorCode, RSyncErrorCode.SUCCESS>;
    config?: never;
};
type RSyncReadConfigResult =
    | RSyncReadConfigResult_Success
    | RSyncReadConfigResult_Failure
;

//------------------------------------------------------------------------------
// Implementation:
//------------------------------------------------------------------------------
async function validateOptions(opts: RSyncOptions): Promise<RSyncError[]> {
    async function noThrowStat(path: string): Promise<Stats | undefined> {
        try {
            return await fs.promises.stat(path);
        } catch {
            return undefined;
        }
    }

    const errors: RSyncError[] = [];

    // Validate srcDir
    const srcDir = path.resolve(opts.srcDir);
    const srcStat = await noThrowStat(srcDir);
    if (srcStat === undefined) {
        return [{
            errorCode: RSyncErrorCode.SRC_DIR_NOT_FOUND,
            msg: `Source directory does not exist: ${srcDir}`,
        }];
    }
    if (!srcStat.isDirectory()) {
        return [{
            errorCode: RSyncErrorCode.SRC_DIR_NOT_DIRECTORY,
            msg: `Source path is not a directory: ${srcDir}`,
        }];
    }

    // Collect all regular files under srcDir
    const allFiles = new Set<string>();
    async function walk(dir: string): Promise<void> {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const absPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                await walk(absPath);
            } else if (entry.isFile()) {
                const relPath = path.relative(srcDir, absPath);
                allFiles.add(relPath);
            }
        }
    }
    await walk(srcDir);

    // Validate inputs (files only, explicitly listed)
    const inputFiles = new Set<string>();
    for (const input of opts.inputs) {
        const resolved = path.resolve(srcDir, input);

        // Prevent ../ escape
        if (!resolved.startsWith(srcDir + path.sep) && resolved !== srcDir) {
            errors.push({
                errorCode: RSyncErrorCode.INPUT_OUTSIDE_SRC_DIR,
                msg: `Input path escapes srcDir: ${input}`,
            });
            continue;
        }

        const stat = await noThrowStat(resolved);
        if (stat === undefined) {
            errors.push({
                errorCode: RSyncErrorCode.INPUT_NOT_FOUND,
                msg: `Input does not exist: ${input}`,
            });
            continue;
        }
        if (stat.isDirectory()) {
            errors.push({
                errorCode: RSyncErrorCode.INPUT_IS_DIRECTORY,
                msg: `Input must be a file, not a directory: ${input}`,
            });
            continue;
        }
        if (!stat.isFile()) {
            // Non-regular files (FIFO, socket, etc.) are implicitly rejected
            errors.push({
                errorCode: RSyncErrorCode.INPUT_NOT_FOUND,
                msg: `Input is not a regular file: ${input}`,
            });
            continue;
        }

        inputFiles.add(path.relative(srcDir, resolved));
    }

    // Detect unexpected files in srcDir
    const unexpectedFiles = [...allFiles].filter(f => !inputFiles.has(f));
    if (unexpectedFiles.length > 0) {
        errors.push({
            errorCode: RSyncErrorCode.UNEXPECTED_FILE,
            msg:
                `Unexpected files found in srcDir that would be copied by rsync:\n` +
                unexpectedFiles.map(f => `  - ${f}`).join('\n'),
        });
    }

    return errors;
}

function withTrailingSlash(p: string): string {
    return p.endsWith(path.sep) ? p : p + path.sep;
}

async function run(opts: RSyncOptions): Promise<number> {
    // Validate options
    const errors = await validateOptions(opts);
    if (errors.length > 0) {
        for (const err of errors) {
            console.error(`[${err.errorCode}] ${err.msg}`);
        }
        return 1;
    }

    // Normalize paths to force rsync "content copy" semantics
    const srcDir = withTrailingSlash(path.resolve(opts.srcDir));
    const dstDir = path.resolve(opts.dstDir);

    // Execute rsync
    const result = child_process.spawnSync(
        'rsync',
        [ '-v', '--archive', '--delete', srcDir, dstDir ],
        { stdio: 'inherit' }
    );
    if (result.error) {
        console.error(`Failed to execute rsync: ${result.error.message}`);
        return 1;
    }

    return result.status ?? 1;
}

function readConfig(path: string): RSyncReadConfigResult {
    // Read file
    let raw: string;
    try {
        raw = fs.readFileSync(path, 'utf8');
    } catch {
        return { errorCode: RSyncErrorCode.CONFIG_READ_ERROR };
    }

    // Parse JSON
    let data: unknown;
    try {
        data = JSON.parse(raw);
    } catch {
        return { errorCode: RSyncErrorCode.CONFIG_PARSE_ERROR };
    }

    // Validate root object
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return { errorCode: RSyncErrorCode.CONFIG_INVALID_SCHEMA };
    }

    const obj = data as Record<string, unknown>;
    const keys = Object.keys(obj);

    // Reject unknown properties
    if (keys.length !== 1 || keys[0] !== 'dstDir') {
        return { errorCode: RSyncErrorCode.CONFIG_INVALID_SCHEMA };
    }

    // Validate dstDir
    if (typeof obj.dstDir !== 'string') {
        return { errorCode: RSyncErrorCode.CONFIG_INVALID_SCHEMA };
    }

    return {
        errorCode: RSyncErrorCode.SUCCESS,
        config: { dstDir: obj.dstDir },
    };
}

function writeConfig(path: string, config: RSyncConfig): RSyncErrorCode {
    try {
        fs.writeFileSync(path, JSON.stringify(config, null, 2));
    } catch {
        return RSyncErrorCode.CONFIG_WRITE_ERROR;
    }
    return RSyncErrorCode.SUCCESS;
}

//------------------------------------------------------------------------------
// Exports:
//------------------------------------------------------------------------------
export type {
    RSyncConfig,
    RSyncErrorCode,
};

export default {
    RSyncErrorCode,
    run,
    readConfig,
    writeConfig,
};
