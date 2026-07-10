import '../src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import User, { USER_ROLES } from '../src/models/User.js';

const { SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD } = process.env;

const fail = (message) => {
  console.error(message);
  process.exitCode = 1;
};

const seed = async () => {
  if (!SUPER_ADMIN_NAME || !SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) {
    fail('Set SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, and SUPER_ADMIN_PASSWORD before running the seed command.');
    return;
  }
  if (SUPER_ADMIN_PASSWORD.length < 10) {
    fail('SUPER_ADMIN_PASSWORD must contain at least 10 characters.');
    return;
  }

  await connectDatabase();
  const email = SUPER_ADMIN_EMAIL.trim().toLowerCase();
  const existing = await User.findOne({ email });

  if (existing) {
    if (existing.role !== USER_ROLES.SUPER_ADMIN) {
      throw new Error('The configured email is already used by a non-super-admin account.');
    }
    console.log(`Super admin already exists: ${email}`);
    return;
  }

  await User.create({
    name: SUPER_ADMIN_NAME.trim(),
    email,
    password: SUPER_ADMIN_PASSWORD,
    role: USER_ROLES.SUPER_ADMIN,
  });
  console.log(`Super admin created: ${email}`);
};

try {
  await seed();
} catch (error) {
  fail(`Unable to seed super admin: ${error.message}`);
} finally {
  await disconnectDatabase();
}

