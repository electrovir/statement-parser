import {readFileSync} from 'fs-extra';
import {packageJson} from './repo-paths';

const packageVersion: string = JSON.parse(readFileSync(packageJson).toString()).version;
if (!packageVersion) {
    throw new Error(`Package version was not found.`);
}

export function getPackageVersion() {
    return packageVersion;
}
