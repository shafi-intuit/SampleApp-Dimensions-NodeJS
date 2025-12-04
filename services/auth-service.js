/**
 * @file Auth Service
 *
 * @description
 * Provides simple in-memory storage and access for the OAuth client instance used throughout the app.
 *
 * ## Usage 
 * - Use `setClient(oauthClient)` to store the current OAuth client after successful authentication.
 * - Use `getClient()` to retrieve the stored OAuth client for making authenticated API calls.
 * - The stored client is shared across all requests in the Node.js process (not per-user/session).
 *
 * @example
 *   import { setClient, getClient } from './services/auth-service.js';
 *   setClient(oauthClientInstance);
 *   const client = getClient();
 */
let token = '';
let oauthClient = null;

export const setClient = (incomingOauthClient) => {
    oauthClient = incomingOauthClient;
};

export const getClient = () => oauthClient;