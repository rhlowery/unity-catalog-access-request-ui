import fs from 'fs';
import path from 'path';
import pino from 'pino';
import { env } from '../config';

const logger = pino({
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
});

const REVOKED_TOKENS_FILE = path.join(process.cwd(), 'data', 'revoked_tokens.json');

let revokedTokens = new Set<string>();

export const loadRevokedTokens = () => {
    if (fs.existsSync(REVOKED_TOKENS_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(REVOKED_TOKENS_FILE, 'utf-8'));
            if (Array.isArray(data)) revokedTokens = new Set(data);
        } catch (e) {
            logger.error({ err: e }, 'Failed to load revoked tokens from disk');
        }
    }
};

export const saveRevokedTokens = () => {
    try {
        const dir = path.dirname(REVOKED_TOKENS_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(REVOKED_TOKENS_FILE, JSON.stringify(Array.from(revokedTokens)));
    } catch (e) {
        logger.error({ err: e }, 'Failed to save revoked tokens');
    }
};

export const revokeToken = (jti: string) => {
    revokedTokens.add(jti);
    saveRevokedTokens();
};

export const isTokenRevoked = (jti: string) => {
    return revokedTokens.has(jti);
};

export const clearOldRevocations = () => {
    revokedTokens.clear();
    saveRevokedTokens();
};

// Initial load
loadRevokedTokens();
