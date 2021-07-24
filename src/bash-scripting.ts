import {exec} from 'child_process';

export async function runBashCommand(command: string, acceptStderr = false): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        exec(command, {shell: 'bash'}, (error, stdout, stderr) => {
            if (error) {
                return reject(error);
            } else if (stderr) {
                if (acceptStderr) {
                    return resolve(stderr);
                } else {
                    return reject(stderr);
                }
            } else {
                return resolve(stdout);
            }
        });
    });
}
