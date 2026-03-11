import bcrypt from 'bcrypt';
import { Admin } from './admin.model.js';
import { AppError } from '../../core/errors/AppError.js';
import { generateToken } from '../../core/utils/generateToken.js';

const SALT_ROUNDS = 12;

export const adminService = {

  /**
   * Login an admin by email + password.
   * Returns JWT (7 days) and sanitized admin object.
   */
  async login(email: string, password: string): Promise<{ token: string; admin: object }> {
    const admin = await Admin.findOne({ email: email.toLowerCase().trim() }).select('+hashedPassword');
    if (!admin) throw new AppError('Invalid credentials', 401);

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) throw new AppError('Invalid credentials', 401);

    const token = generateToken(
      { id: admin._id.toString(), role: 'admin', email: admin.email },
      '7d'
    );

    return { token, admin: admin.toJSON() };
  },

  /**
   * Seed a single admin account.
   * Called from seed.ts for each admin entry in config.
   * Skips silently if email already exists — safe to re-run.
   */
  async seedAdmin(email: string, password: string): Promise<void> {
    const existing = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      console.log(`[Seed] Admin already exists, skipping: ${email}`);
      return;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await Admin.create({ email: email.toLowerCase().trim(), hashedPassword });
    console.log(`[Seed] Admin created: ${email}`);
  },
};
