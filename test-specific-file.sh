#!/usr/bin/env bash
set -e;

filePath="$1"
jsFilePath="$(echo "$filePath" | sed -E 's/.ts$/.js/')"

if [[ "$jsFilePath" != *.test.js ]]; then
    jsFilePath="$(echo "$jsFilePath" | sed -E 's/.js$/.test.js/')"
fi

distPath="dist/$jsFilePath"

npm run compile

if [[ ! -f "$distPath" ]]; then
    echo -e "\033[1;31mThere are no tests for $filePath\033[0m"
    exit 1
fi

test-vir "$distPath"