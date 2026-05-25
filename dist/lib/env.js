import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const AUTODIDACT_ENV = '/Users/eliottgdl/Desktop/Projects/autodidact/backend/.env';
export function readOpenAiKey() {
    if (process.env.OPENAI_API_KEY)
        return process.env.OPENAI_API_KEY;
    const candidates = [
        AUTODIDACT_ENV,
        path.join(os.homedir(), '.config', 'stack-weekly', '.env'),
    ];
    for (const file of candidates) {
        if (!fs.existsSync(file))
            continue;
        const content = fs.readFileSync(file, 'utf8');
        const match = content.match(/^OPENAI_API_KEY=(.+)$/m);
        if (match) {
            const value = match[1].trim().replace(/^["']|["']$/g, '');
            if (value)
                return value;
        }
    }
    throw new Error(`OPENAI_API_KEY not found. Set it in env, or in ${AUTODIDACT_ENV}.`);
}
