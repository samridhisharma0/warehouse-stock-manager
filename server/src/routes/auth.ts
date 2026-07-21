import { Router } from 'express';
import bcrypt from 'bcryptjs';
import type { AuthResponse } from '@shared/types';
import { store } from '../db/store.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth, signToken, type AuthedRequest } from '../middleware/auth.js';

export const authRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email ?? '').trim();
    const password = String(req.body?.password ?? '');

    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Please enter a valid email address.');
    if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters.');
    if (store.findUserByEmail(email)) {
      throw new HttpError(409, 'An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = store.createUser(email, passwordHash);
    const token = signToken(user.id);
    const body: AuthResponse = { token, user };
    res.status(201).json(body);
  }),
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email ?? '').trim();
    const password = String(req.body?.password ?? '');

    const record = store.findUserByEmail(email);
    // Same error whether the email is unknown or the password is wrong, so we
    // don't leak which emails are registered.
    const ok = record ? await bcrypt.compare(password, record.passwordHash) : false;
    if (!record || !ok) throw new HttpError(401, 'Invalid email or password.');

    const token = signToken(record.id);
    const body: AuthResponse = {
      token,
      user: { id: record.id, email: record.email, createdAt: record.createdAt },
    };
    res.json(body);
  }),
);

// With stateless JWTs there is no server session to destroy; the client drops
// the token. The endpoint exists so the client has a clear action to call and
// so a future cookie/blacklist implementation has a home.
authRouter.post('/logout', (_req, res) => {
  res.json({ ok: true });
});

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = store.findUserById(req.userId!);
    if (!user) throw new HttpError(401, 'Account no longer exists.');
    res.json({ user });
  }),
);
