
import { SqlJsDatabase, User } from '../types';

// --- Secure Password Hashing using Web Crypto API ---
// IMPORTANT: This uses the browser's built-in crypto API. PBKDF2 is a strong, standard
// key derivation function that is much more secure than a simple SHA-256 hash for passwords.

// Helper to convert ArrayBuffer to Hex string
const bufferToHex = (buffer: ArrayBuffer): string => {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Helper to convert Hex string to Uint8Array
const hexToBuffer = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
};

const PBKDF2_ITERATIONS = 100000;

/**
 * Hashes a password using PBKDF2 with a new random salt.
 * @param password The password string to hash.
 * @returns A promise that resolves to an object containing the hex-encoded hash and salt.
 */
async function hashPasswordPbkdf2(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256 // 256 bits
  );

  const hash = bufferToHex(derivedBits);
  return { hash, salt: bufferToHex(salt) };
}

/**
 * Verifies a password against a stored hash and salt using PBKDF2.
 * @param password The password to verify.
 * @param storedHash The hex-encoded hash from the database.
 * @param storedSalt The hex-encoded salt from the database.
 * @returns A promise that resolves to true if the password is correct, false otherwise.
 */
async function verifyPasswordPbkdf2(password: string, storedHash: string, storedSalt: string): Promise<boolean> {
  const salt = hexToBuffer(storedSalt);
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hash = bufferToHex(derivedBits);
  return hash === storedHash;
}

/**
 * (Legacy) Hashes a password using SHA-256 for migration purposes.
 * @param password The password string to hash.
 * @returns A promise that resolves to the hex-encoded hash string.
 */
async function hashPasswordSha256(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}


// --- User Management Functions ---

/**
 * Authenticates a user, with on-the-fly migration for legacy passwords.
 * @param db The database instance.
 * @param username The username.
 * @param password The password.
 * @param t The translation function.
 * @param setDbDirty Function to mark the database as needing to be saved.
 * @returns A promise that resolves to the user object if successful.
 * @throws An error if login fails.
 */
export const login = async (
    db: SqlJsDatabase, 
    username: string, 
    password: string, 
    t: (key: string, options?: any) => string,
    setDbDirty: (isDirty: boolean) => void
): Promise<User> => {
  const stmt = db.prepare("SELECT id, username, password_hash, salt FROM users WHERE username = ?");
  stmt.bind([username]);
  
  try {
    if (stmt.step()) {
        const result = stmt.get();
        const user = { id: result[0] as number, username: result[1] as string };
        const storedHash = result[2] as string;
        const storedSalt = result[3] as string | null;

        let passwordIsValid = false;

        if (storedSalt) {
            // New user with PBKDF2 hash
            passwordIsValid = await verifyPasswordPbkdf2(password, storedHash, storedSalt);
        } else {
            // Legacy user with SHA-256 hash, attempt migration
            const legacyHash = await hashPasswordSha256(password);
            if (legacyHash === storedHash) {
                passwordIsValid = true;
                // --- MIGRATION STEP ---
                // Re-hash with the new, secure method and update the database record.
                try {
                    const { hash: newHash, salt: newSalt } = await hashPasswordPbkdf2(password);
                    const updateStmt = db.prepare("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?");
                    updateStmt.run([newHash, newSalt, user.id]);
                    updateStmt.free();
                    setDbDirty(true); // Mark DB for saving
                    console.log(`User '${user.username}' password migrated to PBKDF2.`);
                } catch (e) {
                    console.error("Failed to migrate user password:", e);
                }
            }
        }

        if (passwordIsValid) {
            return user;
        }
    }
  } finally {
      stmt.free();
  }
  
  // If we reach here, either the user was not found or the password was incorrect.
  throw new Error(t('login.invalidCredentials'));
};

/**
 * Retrieves a list of all users.
 * @param db The database instance.
 * @returns A promise that resolves to an array of user objects.
 */
export const getUsers = async (db: SqlJsDatabase): Promise<User[]> => {
    const results = db.exec("SELECT id, username FROM users ORDER BY username");
    if (results.length === 0 || results[0].values.length === 0) return [];

    return results[0].values.map(row => ({
        id: row[0] as number,
        username: row[1] as string,
    }));
};

/**
 * Adds a new user to the database with a securely hashed password.
 * @param db The database instance.
 * @param username The new user's username.
 * @param password The new user's password.
 * @throws An error if the username already exists.
 */
export const addUser = async (db: SqlJsDatabase, username: string, password: string, t: (key: string, options: any) => string): Promise<void> => {
    try {
        const { hash, salt } = await hashPasswordPbkdf2(password);
        const stmt = db.prepare("INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)");
        stmt.run([username, hash, salt]);
        stmt.free();
    } catch (e: any) {
        if (e.message.includes('UNIQUE constraint failed')) {
            throw new Error(t('settings.userManagement.notifications.userExists', { username }));
        }
        throw e;
    }
};

/**
 * Removes a user from the database.
 * @param db The database instance.
 * @param userId The ID of the user to remove.
 */
export const removeUser = async (db: SqlJsDatabase, userId: number): Promise<void> => {
    const stmt = db.prepare("DELETE FROM users WHERE id = ?");
    stmt.run([userId]);
    stmt.free();
};

/**
 * Resets a user's password with a new securely hashed password.
 * @param db The database instance.
 * @param userId The ID of the user.
 * @param newPassword The new password.
 */
export const resetPassword = async (db: SqlJsDatabase, userId: number, newPassword: string): Promise<void> => {
    const { hash, salt } = await hashPasswordPbkdf2(newPassword);
    const stmt = db.prepare("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?");
    stmt.run([hash, salt, userId]);
    stmt.free();
};