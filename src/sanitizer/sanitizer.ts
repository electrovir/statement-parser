import {allIndexesOf, replaceStringAtIndex} from '../augments/string';
import {parsers, ParserType} from '../parser/all-parsers';
import {ParserKeyword} from '../parser/parser-options';

export async function sanitizePdf(filePath: string, parserType: ParserType): Promise<string[]> {
    const parser = parsers[parserType];

    return sanitizeStatementText(await parser.convertPdfToText(filePath), parser.parserKeywords);
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

        const cleanedLine = line.replace(
            /(?:\d+|(?:[^\d\s\W]?[',]?[^\d\s\W])+|\s+)/g,
            (match, matchIndexInString) => {
                let previousIndexToCheck = matchIndexInString - 1;
                const newIndex =
                    previousIndexToCheck < 0 ? 0 : indexMapping[previousIndexToCheck] + 1;

                let replacement: string;

                // the match is only whitespace
                if (!match.trim()) {
                    replacement = match;
                }
                // the match is only numbers
                else if (!isNaN(Number(match))) {
                    currentNumber++;
                    if (currentNumber > 9) {
                        currentNumber = 0;
                    }

                    replacement = String(currentNumber);
                }
                // the match is text
                else {
                    currentLetter = String.fromCharCode(currentLetter.charCodeAt(0) + 1);
                    if (currentLetter.charCodeAt(0) > 'z'.charCodeAt(0)) {
                        currentLetter = String.fromCharCode('a'.charCodeAt(0));
                    }

                    replacement = currentLetter;
                }

                // map all the indexes from the match to the replacement
                Array.from(match).forEach((_, letterIndex) => {
                    indexMapping[matchIndexInString + letterIndex] =
                        newIndex +
                        (replacement[letterIndex] ? letterIndex : replacement.length - 1);
                });
                // map all the index mappings that follow the remapped indexes above
                indexMapping.slice(matchIndexInString + match.length).forEach((_, index) => {
                    indexMapping[matchIndexInString + match.length + index] =
                        newIndex + replacement.length;
                });

                return replacement;
            },
        );
        const keywordsIncludedLine = phrasesToPreserve.reduce(
            (wholeString: string, currentKeyword, index) => {
                const indexesInOriginalLine = indexes[index];
                return indexesInOriginalLine.reduce(
                    (replaceInHere: string, indexInOriginalLine) => {
                        const currentKeywordMatch =
                            currentKeyword instanceof RegExp
                                ? line.slice(indexInOriginalLine).match(currentKeyword)?.[0]
                                : currentKeyword;
                        if (currentKeywordMatch == undefined) {
                            throw new Error(
                                `"${currentKeywordMatch}" was found in "${line}" initially but wasn't later!??`,
                            );
                        }

                        return replaceStringAtIndex(
                            replaceInHere,
                            indexMapping[indexInOriginalLine],
                            currentKeywordMatch,
                            indexMapping[indexInOriginalLine + currentKeywordMatch.length] -
                                indexMapping[indexInOriginalLine],
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
