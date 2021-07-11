import {writeFileSync} from 'fs-extra';
import {allIndexesOf, replaceStringAtIndex} from '../augments/string';
import {parsers, ParserType} from '../parser/all-parsers';
import {ParserKeyword} from '../parser/parser-options';
import {temp_sanitizerRawTestFilePath, temp_sanitizerSanitizedTextFilePath} from '../repo-paths';

export async function sanitizePdf(
    filePath: string,
    parserType: ParserType,
    debug: boolean,
): Promise<string[]> {
    const parser = parsers[parserType];

    const rawText = await parser.convertPdfToText(filePath);

    if (debug) {
        writeFileSync(temp_sanitizerRawTestFilePath, rawText.join('\n'));
        console.info(`Pdf text output written (for debugging) to ${temp_sanitizerRawTestFilePath}`);
    }

    const sanitizedText = sanitizeStatementText(rawText, parser.parserKeywords);
    if (debug) {
        writeFileSync(temp_sanitizerSanitizedTextFilePath, sanitizedText.join('\n'));
        console.info(
            `Sanitized PDF text written (for debugging) to ${temp_sanitizerSanitizedTextFilePath}`,
        );
    }

    return sanitizedText;
}

function makeRegExpForWholeLine(input: RegExp): RegExp {
    return new RegExp(`^${input.source}$`, input.flags);
}

const symbolsToPreserveRegExp = /[\$\/\-]/;

const digitsOnlyRegExp = /[\d\.,]+/;

const digitsRegExp = new RegExp(
    `${digitsOnlyRegExp.source}(?:$|${symbolsToPreserveRegExp.source})`,
);
const whitespaceRegExp = /\s+/;
const wordsRegExp = /[\S\w\d\*\#]+/;

const allRegExps = [symbolsToPreserveRegExp, digitsRegExp, whitespaceRegExp, wordsRegExp];

const exclusiveRegExps = new Map<RegExp, RegExp>(
    [...allRegExps, digitsOnlyRegExp].map((regExp) => {
        return [regExp, makeRegExpForWholeLine(regExp)];
    }),
);

const combinedRegExp = new RegExp(
    `(?:${allRegExps.map((regExp) => regExp.source).join('|')})`,
    'g',
);

function getExclusiveRegExp(input: RegExp): RegExp {
    const exclusiveVersion = exclusiveRegExps.get(input);
    if (!exclusiveVersion) {
        throw new Error(`Exclusive RegExp not found for ${input}`);
    }
    return exclusiveVersion;
}

export function sanitizeStatementText(
    text: string[],
    phrasesToPreserve: ParserKeyword[] = [],
): string[] {
    // start at a's char code -1 so that the first line replacement happens with 'a'
    let currentLetter = String.fromCharCode('a'.charCodeAt(0) - 1);
    // -1 here so the first replacement happens with '0'
    let currentNumber = -1;

    return text.map((line) => {
        const keywordIndexes: number[][] = phrasesToPreserve.map((keyword) => {
            return allIndexesOf(line, keyword, false);
        });

        const indexMapping = Array.from(line).map((_, index) => index);

        const cleanedLine = line.replace(combinedRegExp, (match, matchIndexInString) => {
            // the match is ONLY for allowed symbols
            if (match.match(getExclusiveRegExp(symbolsToPreserveRegExp))) {
                return match;
            }
            let previousIndexToCheck = matchIndexInString - 1;
            const newIndex = previousIndexToCheck < 0 ? 0 : indexMapping[previousIndexToCheck] + 1;

            let replacement: string;

            // the match is only whitespace
            if (!match.trim()) {
                replacement = match;
            }
            // the match is number
            else if (match.match(getExclusiveRegExp(digitsRegExp))) {
                currentNumber++;
                if (currentNumber > 9) {
                    currentNumber = 0;
                }

                replacement = match.replace(/\d+/g, String(currentNumber));
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
                    newIndex + (replacement[letterIndex] ? letterIndex : replacement.length - 1);
            });
            // map all the index mappings that follow the remapped indexes above
            indexMapping.slice(matchIndexInString + match.length).forEach((_, index) => {
                indexMapping[matchIndexInString + match.length + index] =
                    newIndex + replacement.length;
            });

            return replacement;
        });

        let firstMatched: string | RegExp | undefined = undefined;
        const keywordsIncludedLine = !!line.trim()
            ? phrasesToPreserve.reduce((wholeString: string, currentKeyword, index) => {
                  const indexesInOriginalLine = keywordIndexes[index];
                  return indexesInOriginalLine.reduce(
                      (replaceInHere: string, indexInOriginalLine) => {
                          if (firstMatched) {
                              throw new Error(
                                  `"${firstMatched}" already matched but also matched "${currentKeyword}" for\n\t"${line}"`,
                              );
                          } else {
                              firstMatched = currentKeyword;
                          }
                          const currentKeywordMatch =
                              currentKeyword instanceof RegExp
                                  ? line.slice(indexInOriginalLine).match(currentKeyword)?.[0]
                                  : currentKeyword;
                          if (currentKeywordMatch == undefined) {
                              throw new Error(
                                  `"${currentKeyword}" was found in "${line}" initially but wasn't later!??`,
                              );
                          }

                          //   // uncomment for debugging
                          //   console.log({
                          //       replaceInHere,
                          //       mappedIndex: indexMapping[indexInOriginalLine],
                          //       indexInOriginalLine,
                          //       currentKeywordMatch,
                          //       length: currentKeywordMatch.length,
                          //       indexMapping,
                          //       end: indexMapping[
                          //           indexInOriginalLine + currentKeywordMatch.length - 1
                          //       ],
                          //       start: indexMapping[indexInOriginalLine],
                          //       replaceLength:
                          //           indexMapping[
                          //               indexInOriginalLine + currentKeywordMatch.length - 1
                          //           ] -
                          //           indexMapping[indexInOriginalLine] +
                          //           1,
                          //   });
                          return replaceStringAtIndex(
                              replaceInHere,
                              indexMapping[indexInOriginalLine],
                              currentKeywordMatch,
                              indexMapping[indexInOriginalLine + currentKeywordMatch.length - 1] -
                                  indexMapping[indexInOriginalLine] +
                                  1,
                          );
                      },
                      wholeString,
                  );
              }, cleanedLine)
            : line;

        return keywordsIncludedLine.replace(/ {2,}/g, '  ');
    });
}
