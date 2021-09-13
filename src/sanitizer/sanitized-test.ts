import {ensureDir, existsSync, readFileSync, writeFile} from 'fs-extra';
import {dirname, join, relative} from 'path';
import {format, resolveConfig} from 'prettier';
import {TestInputObject} from 'test-vir';
import {Overwrite, RequiredBy} from '../augments/type';
import {setSanitizerMode, unsetSanitizerMode} from '../global';
import {getPackageVersion} from '../package-version';
import {AllParserOptions, parsers, ParserType} from '../parser/all-parsers';
import {StatementPdf} from '../parser/parse-api';
import {ParsedOutput} from '../parser/parsed-output';
import {checkThatPdfExists} from '../pdf/read-pdf';
import {prettierConfigPath, repoRootDir, sanitizedFilesDir} from '../repo-paths';
import {sanitizePdf} from './sanitizer';

export type SanitizedTestFile<SelectedParser extends ParserType> = {
    text: string[];
    parserType: ParserType;
    name: string;
    packageVersion: string;
    parserOptions?: AllParserOptions[SelectedParser];
} & (
    | {
          output: ParsedOutput;
          errorMessage?: undefined;
      }
    | {
          output?: undefined;
          errorMessage: string;
      }
);

type SanitizingStatementPdf = Overwrite<
    StatementPdf,
    {parserInput: RequiredBy<StatementPdf['parserInput'], 'name' | 'debug'>}
>;

async function validateSanitizedParsing(
    {parserInput, type: parserType}: SanitizingStatementPdf,
    parsedSanitized: ParsedOutput,
    debug: boolean,
): Promise<void> {
    const parser = parsers[parserType];
    if (debug) {
        console.log('\n/////////////////// parsing original:\n');
    }
    const parsedOriginal = await parser.parsePdf(parserInput);

    // quick sanity checks on the sanitized parsing output
    if (parsedSanitized.incomes.length !== parsedOriginal.incomes.length) {
        if (debug) {
            console.log('/////////////////// sanitized incomes');
            console.log(parsedSanitized.incomes);
            console.log('/////////////////// original incomes');
            console.log(parsedOriginal.incomes);
        }
        throw new Error(
            `Sanitized incomes count did not match the original in "${parserInput.name}"`,
        );
    }

    if (parsedSanitized.expenses.length !== parsedOriginal.expenses.length && debug) {
        console.log('/////////////////// sanitized expenses');
        console.log(parsedSanitized.expenses);
        console.log('/////////////////// original expenses');
        console.log(parsedOriginal.expenses);
        throw new Error(
            `Sanitized expenses count did not match the original in "${parserInput.name}"`,
        );
    }
}

function getSanitizedName(filePath: string): string {
    return `Sanitized ${relative(repoRootDir, filePath)}`;
}

async function createSanitizedTestFileObject<SelectedParser extends ParserType>({
    parserInput,
    type: parserType,
}: SanitizingStatementPdf): Promise<SanitizedTestFile<SelectedParser>> {
    const parser = parsers[parserType];

    const sanitizedText = await sanitizePdf(parserInput.filePath, parserType, parserInput.debug);

    let parsedSanitized: ParsedOutput | undefined;
    let parseError: Error | undefined;
    try {
        setSanitizerMode();
        parsedSanitized = parser.parseText({
            textLines: sanitizedText,
            ...parserInput,
        });
        unsetSanitizerMode();
    } catch (error) {
        parseError = error;
    }

    const sanitizedTestObject: SanitizedTestFile<SelectedParser> = {
        name: parserInput.name,
        parserType,
        packageVersion: getPackageVersion(),
        text: sanitizedText,
        ...(parsedSanitized
            ? {output: parsedSanitized}
            : {
                  errorMessage:
                      parseError?.message ||
                      'Sanitized parser output is undefined but no error was encountered',
              }),
    };

    return sanitizedTestObject;
}

export async function writeSanitizedTestFile(
    rawStatementPdf: StatementPdf,
    outputFileName: string,
    debug: boolean = rawStatementPdf.parserInput.debug || false,
) {
    const sampleFilePath = join(sanitizedFilesDir, rawStatementPdf.type, outputFileName);

    const statementPdf: SanitizingStatementPdf = {
        ...rawStatementPdf,
        parserInput: {
            name: getSanitizedName(sampleFilePath),
            ...rawStatementPdf.parserInput,
            debug,
        },
    };
    checkThatPdfExists(statementPdf.parserInput.filePath);

    // first, make sure the pdf itself passes parsing
    try {
        await parsers[statementPdf.type].parsePdf({...statementPdf.parserInput, debug});
    } catch (error) {
        throw new Error(
            `Failed to parse the original PDF before trying to sanitize it: ${
                error instanceof Error && error.stack ? error.stack : String(error)
            }`,
        );
    }

    const sanitizedTestObject = await createSanitizedTestFileObject(statementPdf);

    // if there was an error, don't try to parse output as there won't be any
    sanitizedTestObject.output &&
        (await validateSanitizedParsing(statementPdf, sanitizedTestObject.output, debug));

    await ensureDir(dirname(sampleFilePath));

    const prettierConfig = await resolveConfig(prettierConfigPath);

    await writeFile(
        sampleFilePath,
        // format the file so it doesn't break format tests
        format(JSON.stringify(sanitizedTestObject, null, 4), {
            ...prettierConfig,
            filepath: sampleFilePath,
        }),
    );

    if (!existsSync(sampleFilePath)) {
        throw new Error(`sanitized test file was not written: ${sampleFilePath}`);
    }

    return {
        path: sampleFilePath,
        result: sanitizedTestObject.output || sanitizedTestObject.errorMessage,
    };
}

export function createSanitizedTestInput<SelectedParser extends ParserType>(
    filePath: string,
): TestInputObject<Readonly<ParsedOutput>, Error> {
    const testFile: SanitizedTestFile<SelectedParser> = JSON.parse(
        readFileSync(filePath).toString(),
    );
    const parser = parsers[testFile.parserType];

    const testInput: TestInputObject<ParsedOutput, Error> = {
        test: () => {
            setSanitizerMode();
            const reParsedOutput = parser.parseText({
                textLines: testFile.text,
                parserOptions: testFile.parserOptions,
                name: testFile.name,
            });
            unsetSanitizerMode();

            /**
             * Make sure all the values are JSON values. For example, properties with the value of
             * undefined are removed and invalid date values are turned into null
             */
            return JSON.parse(JSON.stringify(reParsedOutput));
        },
        description: `compared sanitized file "${filePath}"`,
        ...(testFile.output
            ? {expect: testFile.output}
            : {expectError: {errorMessage: testFile.errorMessage}}),
    };

    return testInput;
}
