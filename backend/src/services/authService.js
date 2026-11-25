import bcrypt from "bcryptjs";
import { AppError } from "../lib/errors.js";

let dummyHashPromise;

function dummyHash() {
  if (!dummyHashPromise) dummyHashPromise = bcrypt.hash("not-a-real-password", 10);
  return dummyHashPromise;
}

export async function authenticateAdmin(prisma, { email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  const hash = user?.passwordHash || await dummyHash();
  const matches = await bcrypt.compare(password, hash);
  if (!user || !matches || user.role !== "ADMIN") {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export function hashPassword(password, rounds = 12) {
  return bcrypt.hash(password, rounds);
}
