import fs from 'fs';
import path from 'path';
import pino from 'pino';
import { env } from '../config';

export const logger = pino({
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
});

const STORAGE_DIR = path.join(process.cwd(), 'data');
const REQUESTS_FILE = path.join(STORAGE_DIR, 'requests.json');
const APPROVERS_FILE = path.join(STORAGE_DIR, 'approvers.json');
const AUDIT_FILE = path.join(STORAGE_DIR, 'audit.json');

// Ensure storage directory exists
export const initStorage = () => {
    if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }

    [REQUESTS_FILE, APPROVERS_FILE, AUDIT_FILE].forEach(file => {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, JSON.stringify(file === APPROVERS_FILE ? {} : [], null, 2));
        }
    });
};

export const readRequests = (): any[] => {
    try {
        const data = fs.readFileSync(REQUESTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        logger.error({ err }, 'Failed to read requests file');
        return [];
    }
};

export const writeRequests = (requests: any[]) => {
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify(requests, null, 2));
};

export const readApprovers = (): any => {
    try {
        const data = fs.readFileSync(APPROVERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        logger.error({ err }, 'Failed to read approvers file');
        return {};
    }
};

export const writeApprovers = (approvers: any) => {
    fs.writeFileSync(APPROVERS_FILE, JSON.stringify(approvers, null, 2));
};

export const readAuditLogs = (): any[] => {
    try {
        const data = fs.readFileSync(AUDIT_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        logger.error({ err }, 'Failed to read audit file');
        return [];
    }
};

export const writeAuditLogs = (logs: any[]) => {
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(logs, null, 2));
};

export const checkStorageHealth = () => {
    return fs.existsSync(STORAGE_DIR);
};

// Auto-init
initStorage();
