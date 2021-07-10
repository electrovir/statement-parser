import {existsSync} from 'fs-extra';
import {extname, relative} from 'path';
import {getEnumTypedValues} from '../augments/object';
import {isParserType, ParserType} from '../parser/all-parsers';
import {StatementPdf} from '../parser/parse-api';
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
    PdfPathNoExist(inputPdfPath: string) {
        return `Given PDF file "${inputPdfPath}" does not exist!`;
    },
    MissingOutputFileName: `Missing output file name`,
    InvalidOutputFileName(inputOutputFileName: string) {
        return `Invalid output file name "${inputOutputFileName}". Missing .json extension.`;
    },
};

async function runSanitization<SelectedParser extends ParserType>({
    parserType,
    inputPdfFile,
    outputFileName,
}: CliArgs<SelectedParser>) {
    const parserInput: StatementPdf<SelectedParser> = {
        parserInput: {
            filePath: relative(repoRootDir, inputPdfFile),
        },
        type: parserType,
    };

    const filePath = await writeSanitizedTestFile(parserInput, outputFileName);

    return {filePath, usageInTest: `To use in test: `};
}

type CliArgs<SelectedParser extends ParserType = ParserType> = {
    parserType: SelectedParser;
    inputPdfFile: string;
    outputFileName: string;
};

function getValidatedArgs<SelectedParser extends ParserType = ParserType>(
    args: string[],
): CliArgs<SelectedParser> {
    const parserTypeArg = args[0];
    const inputPdfFilePathArg = args[1];
    const outputFileNameArg = args[2];

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
    if (!existsSync(inputPdfFilePathArg)) {
        throw new Error(CliErrors.PdfPathNoExist(inputPdfFilePathArg));
    }

    // validate output file input
    if (!outputFileNameArg) {
        throw new Error(CliErrors.MissingOutputFileName);
    }
    if (extname(outputFileNameArg) !== '.json') {
        throw new Error(CliErrors.InvalidOutputFileName(outputFileNameArg));
    }

    return {
        parserType: parserTypeArg as SelectedParser,
        inputPdfFile: inputPdfFilePathArg,
        outputFileName: outputFileNameArg,
    };
}

const helpMessage = `Usage: node ${relative(
    process.cwd(),
    __filename,
)} parser-type input-pdf-file.pdf output-sanitized-text-file.json\n`;

/** Exported just so we can test it without running bash scripts */
export async function sanitizeForTestFileCli(args: string[], printHelp = false) {
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
        .then((results) => console.log(results))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}
