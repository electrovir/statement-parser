import {extname, relative} from 'path';
import {getEnumTypedValues} from '../augments/object';
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

async function runSanitization<SelectedParser extends ParserType>({
    parserType,
    inputPdfFile,
    outputFileName,
    debug,
}: CliArgs<SelectedParser>) {
    const parserInput: StatementPdf<SelectedParser> = {
        parserInput: {
            filePath: relative(repoRootDir, inputPdfFile),
            debug,
        },
        type: parserType,
    };

    const {path, result} = await writeSanitizedTestFile(parserInput, outputFileName);

    return {sanitizedTestFilePath: path, result};
}

type CliArgs<SelectedParser extends ParserType = ParserType> = {
    parserType: SelectedParser;
    inputPdfFile: string;
    outputFileName: string;
    debug: boolean;
};

function getValidatedArgs<SelectedParser extends ParserType = ParserType>(
    args: string[],
): CliArgs<SelectedParser> {
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
        parserType: parserTypeArg as SelectedParser,
        inputPdfFile: inputPdfFilePathArg,
        outputFileName: outputFileNameArg,
        debug: !!debugArg,
    };
}

const helpMessage = `Usage: node ${relative(
    process.cwd(),
    __filename,
)} parser-type input-pdf-file.pdf output-sanitized-text-file.json [--debug]\n`;

/** Exported just so we can test it without running bash scripts */
export async function sanitizeForTestFileCli(args: string[], printHelp = true) {
    let validatedArgs: CliArgs;
    try {
        validatedArgs = getValidatedArgs(args);
    } catch (error) {
        printHelp && console.log(helpMessage);
        throw error;
    }
    return await runSanitization(validatedArgs);
}

// when this script is run directly
// run with "npm run sanitize"
if (require.main === module) {
    sanitizeForTestFileCli(process.argv.slice(2), true)
        .then((output) => {
            console.log('Results:', output.result);
            console.log('Sample file written to:', output.sanitizedTestFilePath);
        })
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}
