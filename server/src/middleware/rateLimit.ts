import rateLimit from 'express-rate-limit';
import { env } from '../config';

export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { error: 'Too many requests, please try again later.' },
    skip: () => env.NODE_ENV !== 'production'
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: 'Too many authentication attempts, please try again later.' },
    skip: () => env.NODE_ENV !== 'production'
});
