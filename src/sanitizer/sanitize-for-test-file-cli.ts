import {getEnumTypedValues} from 'augment-vir';
import {extname, relative} from 'path';
import {isParserType, ParserType} from '../parser/all-parsers';
import {StatementPdf} from '../parser/parse-api';
import {checkThatPdfExists} from '../pdf/read-pdf';
import {repoRootDir} from '../repo-paths';
import {writeSanitizedTestFile} from './sanitized-test';

const parserArgExpected = `Expected one of the following: ${getEnumTypedValues(ParserType).join(
    ', ',
)}`;

export const CliErrors = {
    MissingParserType: `Missing parser type arg. ${parserArgExpected}`,
    InvalidParserType(inputParserType: string) {
        return `Invalid parser type "${inputParserType}". ${parserArgExpected}`;
    },
    MissingPdfPath: `Missing input PDF file path.`,
    InvalidPdfPath(inputPdfPath: string) {
        return `Invalid PDF file path "${inputPdfPath}". Missing .pdf extension.`;
    },
    MissingOutputFileName: `Missing output file name`,
    InvalidOutputFileName(inputOutputFileName: string) {
        return `Invalid output file name "${inputOutputFileName}". Missing .json extension.`;
    },
    InvalidDebugFlag(inputDebugFlag: string) {
        return `Invalid debug flag "${inputDebugFlag}". Expected --debug.`;
    },
};

async function runSanitization({parserType, inputPdfFile, outputFileName, debug}: CliArgs) {
    const parserInput: StatementPdf = {
        parserInput: {
            filePath: relative(repoRootDir, inputPdfFile),
            debug,
        },
        type: parserType,
    };

    const {path, result} = await writeSanitizedTestFile(parserInput, outputFileName, debug);

    return {sanitizedTestFilePath: path, result};
}

type CliArgs = {
    parserType: ParserType;
    inputPdfFile: string;
    outputFileName: string;
    debug: boolean;
};

function getValidatedArgs(args: string[]): CliArgs {
    const parserTypeArg = args[0];
    const inputPdfFilePathArg = args[1];
    const outputFileNameArg = args[2];
    const debugArg = args[3];

    // validate parser type input
    if (!parserTypeArg) {
        throw new Error(CliErrors.MissingParserType);
    }
    if (!isParserType(parserTypeArg)) {
        throw new Error(CliErrors.InvalidParserType(parserTypeArg));
    }

    // validate pdf file input
    if (!inputPdfFilePathArg) {
        throw new Error(CliErrors.MissingPdfPath);
    }
    if (extname(inputPdfFilePathArg) !== '.pdf') {
        throw new Error(CliErrors.InvalidPdfPath(inputPdfFilePathArg));
    }
    checkThatPdfExists(inputPdfFilePathArg);

    // validate output file input
    if (!outputFileNameArg) {
        throw new Error(CliErrors.MissingOutputFileName);
    }
    if (extname(outputFileNameArg) !== '.json') {
        throw new Error(CliErrors.InvalidOutputFileName(outputFileNameArg));
    }

    if (debugArg && debugArg !== '--debug') {
        throw new Error(CliErrors.InvalidDebugFlag(debugArg));
    }

    return {
        parserType: parserTypeArg,
        inputPdfFile: inputPdfFilePathArg,
        outputFileName: outputFileNameArg,
        debug: !!debugArg,
    };
}

const helpMessage = `Usage: npm run sanitize parser-type input-pdf-file.pdf output-sanitized-text-file.json [-- --debug]\nMake sure to pass -- before the debug input, like so: npm sanitize x x x -- --debug`;

/** Exported just so we can test it without running bash scripts */
export async function sanitizeForTestFileCli(args: string[], printHelp = true) {
    if (args.includes('-h') || args.includes('help') || args.includes('--help')) {
        return helpMessage;
    }

    let validatedArgs: CliArgs;
    try {
        validatedArgs = getValidatedArgs(args);
    } catch (error) {
        printHelp && console.log(helpMessage);
        throw error;
    }
    validatedArgs.debug && console.log({validatedArgs});

    const results = await runSanitization(validatedArgs);

    validatedArgs.debug && console.log('Results:', results.result);
    return results;
}

// when this script is run directly
// run with "npm run sanitize"
if (require.main === module) {
    sanitizeForTestFileCli(process.argv.slice(2), true)
        .then((output) => {
            if (typeof output === 'string') {
                console.log(output);
            } else {
                console.log('Sample file written to:', output.sanitizedTestFilePath);
            }
        })
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}
