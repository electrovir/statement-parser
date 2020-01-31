#!/usr/bin/env node

import {setDebug, DEBUG} from './config';
import {readdirSync} from 'fs';
import {extname} from 'path';
import {StatementPdf, isParserType, ParserType, parsePdfs, DEFAULT_YEAR_PREFIX} from './index';
import {getEnumTypedValues} from './util/object';

type args = {
    debug: boolean;
    files: StatementPdf[];
};

type ParsingStatementPdf = Partial<StatementPdf> & {isDir?: boolean};

function validateAndModifyFile(file: ParsingStatementPdf): file is StatementPdf {
    if (!file.path) {
        throw new Error(`Missing file path.`);
    }

    if (!file.type) {
        throw new Error(`Missing parser type for "${file.path}"`);
    }

    if (file.hasOwnProperty('yearPrefix') && file.yearPrefix == undefined) {
        throw new Error(`Invalid year prefix value given ("${file.yearPrefix}") for "${file.path}"`);
    } else if (!file.hasOwnProperty('yearPrefix')) {
        file.yearPrefix = DEFAULT_YEAR_PREFIX;
    }

    return true;
}

function parseArgs(args: string[]): args {
    const parsedArgs = {
        debug: false,
        files: [] as ParsingStatementPdf[],
    };

    let currentFile: ParsingStatementPdf = {};
    let lastFile = currentFile;

    args.forEach(arg => {
        if (arg === '--debug') {
            parsedArgs.debug = true;
        } else if (arg === '-p') {
            lastFile.yearPrefix = undefined;
        } else if (lastFile.hasOwnProperty('yearPrefix') && lastFile.yearPrefix === undefined) {
            const yearPrefix = Number(arg);
            if (isNaN(yearPrefix)) {
                throw new Error(`Expected number for year prefix but got "${arg}"`);
            }
            lastFile.yearPrefix = Number(arg);
        } else if (arg === '-d') {
            currentFile.isDir = true;
        } else if (currentFile.path === undefined) {
            currentFile.path = arg;
        } else {
            if (!isParserType(arg)) {
                throw new Error(`Expected parser type but got: "${arg}".
    Allowed parser types:
    ${JSON.stringify(getEnumTypedValues(ParserType)).replace(/"\[\]/g, '')}`);
            }
            currentFile.type = arg;
            parsedArgs.files.push(currentFile);
            lastFile = currentFile;
            currentFile = {};
        }
    });

    const dirsToRead: StatementPdf[] = [];

    const finishedFiles = parsedArgs.files.filter((file: ParsingStatementPdf): file is StatementPdf => {
        validateAndModifyFile(file);

        if (file.isDir) {
            dirsToRead.push(file as StatementPdf);
            delete file.isDir;
            return false;
        }

        return true;
    });

    const dirFiles: StatementPdf[] = dirsToRead.reduce((accum: StatementPdf[], dir) => {
        const filePaths = readdirSync(dir.path);
        return accum.concat(
            filePaths
                .filter(path => extname(path).toLowerCase() === 'pdf')
                .map(filePath => ({
                    path: filePath,
                    type: dir.type,
                    yearPrefix: dir.yearPrefix,
                })),
        );
    }, []);

    if (Object.keys(currentFile).length !== 0) {
        if (validateAndModifyFile(currentFile)) {
            // This path likely won't happen. If there is still a file sitting around in currentFile then it's
            // probably invalid and thus will fail validation, which will throw errors.
            finishedFiles.push(currentFile);
        }
    }

    return {
        ...parsedArgs,
        files: finishedFiles.concat(dirFiles),
    };
}

async function run() {
    try {
        const args = parseArgs(process.argv.slice(2));
        if (args.debug) {
            setDebug(true);
            console.info('DEBUG set to true');
        }

        const result = await parsePdfs(args.files);
        if (DEBUG) {
            console.log('file data received:', args.files);
            console.log(JSON.stringify(result, null, 4));
        } else {
            console.log(JSON.stringify(result));
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

run();
