/**
 * OAuth Routes for QuickBooks Integration
 *
 * This file defines Express routes for handling OAuth authentication with Intuit QuickBooks.
 *
 * Features:
 * - Initiates OAuth login and redirects users to Intuit for authentication.
 * - Handles OAuth callback and stores company ID in session.
 * - Provides an endpoint to retrieve the current OAuth token.
 * - Includes error handling for all endpoints.
 */
import OAuthClient from 'intuit-oauth';
import bodyParser from 'body-parser';
import express from 'express';
import dotenv from 'dotenv';
import { setClient, getClient } from '../services/auth-service.js';

dotenv.config();
const router = express.Router();

let oauthClient = null;
let token = null;

const urlencodedParser = bodyParser.urlencoded({ extended: false });

/**
 * GET /login
 * Initiates the OAuth login process with Intuit QuickBooks.
 * Responds with a redirect URL for the user to authenticate with Intuit.
 * On error, returns a 500 status and error message.
 */
router.get('/login', urlencodedParser, function (req, res) {
  try {
    oauthClient = new OAuthClient({
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      environment: process.env.ENVIRONMENT,
      redirectUri: process.env.REDIRECT_URI,
      logging: true,
    });

    const dimensions = 'app-foundations.custom-dimensions.read';
    const authUri = oauthClient.authorizeUri({
      scope: [
        OAuthClient.scopes.Accounting,
        OAuthClient.scopes.OpenId,
        OAuthClient.scopes.Profile,
        OAuthClient.scopes.Email,
        dimensions
      ],
    });
    req.oauthClient = oauthClient;
    res.json({ redirectUrl: authUri });
  } catch (err) {
    console.error('OAuth login error:', err);
    res.status(500).json({ error: 'Failed to initiate OAuth login. Please try again.' });
  }
});

/**
 * GET /callback
 * Handles the OAuth callback from Intuit after user authentication.
 * Exchanges the authorization code for an access token and stores the company ID in the session.
 * Redirects to the home page on success, or returns a 500 error on failure.
 */
router.get('/callback', async function (req, res) {
  try {
    const authResponse = await oauthClient.createToken(req.url);
    setClient(oauthClient);
    token = authResponse.json.access_token;
    const realmId = req.query.realmId;
    if (realmId) {
      req.session.companyId = realmId;
    }
    res.redirect('/');
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).send('OAuth callback failed. Please try again.');
  }
});

/**
 * POST /retrieveToken
 * Returns the current OAuth token for the authenticated session.
 * On error, returns a 500 status and error message.
 */
router.post('/retrieveToken', function (req, res) {
  try {
    res.json({ token: (getClient()?.getToken()?.getToken()) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve token.' });
  }
});

export default router;