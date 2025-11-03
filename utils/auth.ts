
import type { UserData } from '../types';

const USERS_STORAGE_KEY = 'aet_users';

/**
 * Hashes a password using the Web Crypto API (SHA-256).
 * @param password The plain text password.
 * @returns A promise that resolves to the hex string of the hash.
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Retrieves all users from localStorage.
 * @returns A record of users.
 */
export function getUsers(): Record<string, UserData> {
  try {
    const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
    return usersJson ? JSON.parse(usersJson) : {};
  } catch (error) {
    console.error("Failed to parse users from localStorage", error);
    return {};
  }
}

/**
 * Saves a new user to localStorage.
 * @param username The username.
 * @param userData The user data (hashed password and role).
 */
export function saveUser(username: string, userData: UserData) {
  const users = getUsers();
  users[username] = userData;
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}
