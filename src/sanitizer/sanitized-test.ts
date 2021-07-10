import {ensureDir, existsSync, readFileSync, writeFile} from 'fs-extra';
import {dirname, join, relative} from 'path';
import {TestInputObject} from 'test-vir';
import {Overwrite, RequiredBy} from '../augments/type';
import {AllParserOptions, parsers, ParserType} from '../parser/all-parsers';
import {StatementPdf} from '../parser/parse-api';
import {ParsedOutput} from '../parser/parsed-output';
import {repoRootDir, sampleFileDir} from '../repo-paths';
import {sanitizePdf} from './sanitizer';

export type SanitizedTestFile<SelectedParser extends ParserType> = {
    text: string[];
    parserType: ParserType;
    name: string;
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

type RequiredNameStatementPdf<SelectedParser extends ParserType = ParserType> = Overwrite<
    StatementPdf<SelectedParser>,
    {parserInput: RequiredBy<StatementPdf<SelectedParser>['parserInput'], 'name'>}
>;

async function validateSanitizedParsing<SelectedParser extends ParserType>(
    {parserInput, type: parserType}: RequiredNameStatementPdf<SelectedParser>,
    parsedSanitized: ParsedOutput,
): Promise<void> {
    const parser = parsers[parserType];
    const parsedOriginal = await parser.parsePdf(parserInput);

    // quick sanity checks on the sanitized parsing output
    if (parsedSanitized.incomes.length !== parsedOriginal.incomes.length) {
        throw new Error(
            `Sanitized incomes count did not match the original in "${parserInput.name}"`,
        );
    }
    if (parsedSanitized.expenses.length !== parsedOriginal.expenses.length) {
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
}: RequiredNameStatementPdf<SelectedParser>): Promise<SanitizedTestFile<SelectedParser>> {
    const parser = parsers[parserType];

    const sanitizedText = await sanitizePdf(parserInput.filePath, parserType);
    let parsedSanitized: ParsedOutput | undefined;
    let parseError: Error | undefined;
    try {
        parsedSanitized = parser.parseText({
            textLines: sanitizedText,
            ...parserInput,
        });
    } catch (error) {
        parseError = error;
    }

    const sanitizedTestObject: SanitizedTestFile<SelectedParser> = {
        name: parserInput.name,
        parserType,
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

export async function writeSanitizedTestFile<SelectedParser extends ParserType = ParserType>(
    rawStatementPdf: StatementPdf<SelectedParser>,
    outputFileName: string,
) {
    const sampleFilePath = join(sampleFileDir, rawStatementPdf.type, outputFileName);

    const statementPdf: RequiredNameStatementPdf<SelectedParser> = {
        ...rawStatementPdf,
        parserInput: {
            name: getSanitizedName(sampleFilePath),
            ...rawStatementPdf.parserInput,
        },
    };

    const sanitizedTestObject = await createSanitizedTestFileObject(statementPdf);

    // if there was an error, don't try to parse output as there won't be any
    sanitizedTestObject.output &&
        (await validateSanitizedParsing(statementPdf, sanitizedTestObject.output));

    await ensureDir(dirname(sampleFilePath));

    await writeFile(sampleFilePath, JSON.stringify(sanitizedTestObject, null, 4));

    if (!existsSync(sampleFilePath)) {
        throw new Error(`sanitized test file was not written: ${sampleFilePath}`);
    }

    return sampleFilePath;
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
            const reParsedOutput = parser.parseText({
                textLines: testFile.text,
                parserOptions: testFile.parserOptions,
                name: testFile.name,
            });
            return reParsedOutput;
        },
        description: `compared sanitized file "${filePath}"`,
        ...(testFile.output
            ? {expect: testFile.output}
            : {expectError: {errorMessage: testFile.errorMessage}}),
    };

    return testInput;
}
