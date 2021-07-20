#!/usr/bin/env bash
set -e;

# example usage for all downloads: ./bulk-sanitize.sh files/downloads
# example usage for just paypal: ./bulk-sanitize.sh files/downloads paypal
# example usage with debug: ./bulk-sanitize.sh files/downloads paypal --debug
# example usage with debug: ./bulk-sanitize.sh files/downloads --debug

searchDir="$1"

debug=""
if [[ "$*" == *"--debug"* ]]; then
    debug="--debug"
fi

specificParser=""
# I no good bash
if [[ "$#" -gt 1 && -z "$debug" ]]; then
    specificParser="$2"
elif [[ "$#" -gt 2 && -n "$debug" ]]; then
    if [[ "${*: -1:1}" -eq "--debug" ]]; then
        # if the last argument is --debug then use the second to last argument for specificParser
        specificParser="${*: -2:1}"
    elif [[ "${*: -2:1}" -eq "--debug" ]]; then
        # if the second to last argument is --debug then use the last argument for specificParser
        specificParser="${*: -1:1}"
    else
        echo "Where did you put the --debug flag?"
        exit 1
    fi
fi

echo "search in: $searchDir"
echo "parser:    $specificParser"
echo "deubg:     $debug"

npm run compile

if [ -z "$specificParser" ]; then
    for filePath in "$searchDir"/**/*.pdf; do
        parserType="$(basename "$(dirname "$filePath")")"
        npm run sanitize:no-compile "$parserType" "$filePath" "$(basename "$filePath" .pdf).json" -- "$debug"
    done
else
    for filePath in "$searchDir"/"$specificParser"/*.pdf; do
        npm run sanitize:no-compile "$specificParser" "$filePath" "$(basename "$filePath" .pdf).json" -- "$debug"
    done
fi