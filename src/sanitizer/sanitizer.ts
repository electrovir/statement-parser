import {flatten2dArray} from '../augments/array';
import {allIndexesOf, getLength, replaceStringAtIndex} from '../augments/string';
import {ParserKeyword} from '../parser/parser-options';
import {readPdf} from '../parser/read-pdf';

export async function sanitizePdf(
    filePath: string,
    phrasesToPreserve: ParserKeyword[] = [],
    caseSensitive = false,
    pdfReader: (filePath: string) => string[][] | Promise<string[][]> = (filePath) =>
        readPdf(filePath),
): Promise<string[]> {
    return sanitizeStatementText(
        flatten2dArray(await pdfReader(filePath)),
        phrasesToPreserve,
        caseSensitive,
    );
}

export function sanitizeStatementText(
    text: string[],
    phrasesToPreserve: ParserKeyword[] = [],
    caseSensitive = false,
): string[] {
    // star at a's char code -1 so that the first line replacement happens with 'a'
    let currentLetter = String.fromCharCode('a'.charCodeAt(0) - 1);
    // -1 here so the first replacement happens with '0'
    let currentNumber = -1;
    return text.map((line) => {
        const indexes: number[][] = phrasesToPreserve.map((keyword) => {
            return allIndexesOf(line, keyword, !caseSensitive);
        });
        const indexMapping = Array.from(line).map((_, index) => index);

        const cleanedLine = line
            .replace(/\d+/g, (match, matchIndex) => {
                let previousIndexToCheck = matchIndex - 1;
                if (previousIndexToCheck < 0) {
                    previousIndexToCheck = 0;
                }
                const newIndex = indexMapping[previousIndexToCheck] + 1;

                Array.from(match).forEach((_, letterIndex) => {
                    indexMapping[matchIndex + letterIndex] = newIndex;
                });
                indexMapping.slice(matchIndex + match.length).forEach((_, index) => {
                    indexMapping[matchIndex + match.length + index] = newIndex + 1;
                });

                currentNumber++;
                if (currentNumber > 9) {
                    currentNumber = 0;
                }

                return String(currentNumber);
            })
            .replace(/(?:[^\d\s\W]?[',]?[^\d\s\W])+/g, (match, matchIndex) => {
                let previousIndexToCheck = matchIndex - 1;
                if (previousIndexToCheck < 0) {
                    previousIndexToCheck = 0;
                }
                const newIndex = indexMapping[previousIndexToCheck] + 1;

                Array.from(match).forEach((_, letterIndex) => {
                    indexMapping[matchIndex + letterIndex] = newIndex;
                });
                indexMapping.slice(matchIndex + match.length).forEach((_, index) => {
                    indexMapping[matchIndex + match.length + index] = newIndex + 1;
                });

                currentLetter = String.fromCharCode(currentLetter.charCodeAt(0) + 1);
                if (currentLetter.charCodeAt(0) > 'z'.charCodeAt(0)) {
                    currentLetter = String.fromCharCode('a'.charCodeAt(0));
                }

                return currentLetter;
            });
        const keywordsIncludedLine = phrasesToPreserve.reduce(
            (wholeString: string, currentKeyword, index) => {
                const indexesInOriginalLine = indexes[index];
                return indexesInOriginalLine.reduce(
                    (replaceInHere: string, indexInOriginalLine) => {
                        return replaceStringAtIndex(
                            replaceInHere,
                            indexMapping[indexInOriginalLine] - 1,
                            currentKeyword,
                            indexMapping[
                                indexInOriginalLine + getLength(replaceInHere, currentKeyword)
                            ] - indexMapping[indexInOriginalLine],
                        );
                    },
                    wholeString,
                );
            },
            cleanedLine,
        );
        return keywordsIncludedLine.replace(/ {2,}/g, '  ');
    });
}
