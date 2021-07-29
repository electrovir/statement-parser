#!/usr/bin/env bash
set -e;

filePath="$1"
filePath="${filePath#"./"}"
filePath="${filePath#"/"}"
jsFilePath="$(echo "$filePath" | sed -E 's/.ts$/.js/')"

if [[ "$jsFilePath" != *.test.js ]]; then
    jsFilePath="$(echo "$jsFilePath" | sed -E 's/.js$/.test.js/')"
fi

distPath="dist/${jsFilePath#"src/"}"


if [[ ! -f "$distPath" ]]; then
    echo -e "\033[1;31mThere are no tests for $filePath\033[0m"
    exit 1
fi

npm run compile
npx test-vir "$distPath"