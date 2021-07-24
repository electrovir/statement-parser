import {parsePdfs, ParserType} from '..';

async function main() {
    const results = await parsePdfs([
        {
            parserInput: {
                filePath: 'my/paypal/file.pdf',
            },
            type: ParserType.Paypal,
        },
    ]);

    // do something with the result

    return results;
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
