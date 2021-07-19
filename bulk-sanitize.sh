#!/usr/bin/env bash
set -e;

searchDir="$1"
debug="$2"

npm run compile

for filePath in "$searchDir"/**/*.pdf; do
    parserType="$(basename "$(dirname "$filePath")")"
    npm run sanitize:no-compile "$parserType" "$filePath" "$(basename "$filePath" .pdf).json" -- "$debug"
done