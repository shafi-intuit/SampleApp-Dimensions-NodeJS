/**
 * @file Dimension and Invoice API Routes
 *
 * @description
 * Express router for handling QuickBooks Dimensions API and Invoice creation.
 *
 * @routes
 *   GET /api/quickbook/dimensions/all   - Get all custom dimensions.
 *   GET /api/quickbook/dimensions/:id   - Get dimension values by definition ID.
 *   POST /api/quickbook/invoice         - Create an invoice with dimension data.
 *   GET /api/quickbook/customers        - Get customer list for invoice creation.
 *
 * @usage
 * Mount this router at `/api/quickbook` in your Express app.
 *
 * Example:
 *   import dimensionRoutes from './routes/dimension.js';
 *   app.use('/api/quickbook', dimensionRoutes);
 */
import OAuthClient from 'intuit-oauth';
import express from 'express';
import dotenv from 'dotenv';
import { getClient } from '../services/auth-service.js';
import { getGraphQLClient, getAllDimensions } from '../services/dimension-service.js';
import { getDimensionsById } from '../services/dimension-service.js';


dotenv.config();
const router = express.Router();

const sandBoxUrl = 'https://qb-sandbox.api.intuit.com/graphql';
const prodUrl = 'https://qb.api.intuit.com/graphql';
const qbosandBoxUrl = 'https://sandbox-quickbooks.api.intuit.com';
const qboprodUrl = 'https://quickbooks.api.intuit.com';

const getUrl = () =>
    process.env.ENVIRONMENT === 'sandbox'
        ? sandBoxUrl
        : prodUrl;
const getQBOUrl = () =>
    process.env.ENVIRONMENT === 'sandbox'
        ? qbosandBoxUrl
        : qboprodUrl;

const getDimensionsClient = () => {
    const token = getClient().getToken().getToken().access_token;
    const graphqlUrl = getUrl();
    const client = getGraphQLClient(graphqlUrl, token);
    return client;
}

/**
 * GET /dimensions/all
 * Fetches all custom dimensions from QuickBooks using the GraphQL API.
 * Responds with a JSON array of dimension definitions.
 * Returns a 500 error with details if the fetch fails.
 */
router.get('/dimensions/all', async function (req, res) {
    try {
        const client = getDimensionsClient();
        const data = await getAllDimensions(client);
        res.json(data);
    } catch (err) {
        console.error('Error fetching all dimensions:', err);
        res.status(500).json({
            error: 'Failed to fetch all dimensions.',
            details: err.message || err.toString()
        });
    }
});

/**
 * GET /dimensions/:id
 * Fetches detailed values for a specific dimension definition by ID.
 * Responds with a JSON array of dimension values.
 * Returns a 500 error with details if the fetch fails.
 */
router.get('/dimensions/:id', async function (req, res) {
    try {
        const client = getDimensionsClient();
        console.log('Requested definitionId:', req.params.id);
        const data = await getDimensionsById(client, req.params.id);
        console.log('Response from getDimensionsById:', JSON.stringify(data));
        res.json(data);
    } catch (err) {
        console.error('Error fetching dimension by ID:', err);
        res.status(500).json({
            error: `Failed to fetch dimension with ID ${req.params.id}.`,
            details: err.message || err.toString()
        });
    }
});


/**
 * POST /invoice
 * Creates a new invoice in QuickBooks, associating it with a custom dimension.
 * Requires a valid OAuth session and company ID.
 * Responds with the created invoice or error details.
 */
router.post('/invoice', async function (req, res) {
    try {
        // Get OAuth token from existing client
        const client = getClient();
        const companyId = req.session.companyId;
        if (!companyId) {
            return res.status(400).json({ error: 'No company ID found in session. Please reconnect to QuickBooks.' });
        }
        console.log('Company ID:', companyId);
        const token = client.getToken().getToken().access_token;
        const url = `${getQBOUrl()}/v3/company/${companyId}/invoice?minorversion=75`;
        // Prepare headers
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
        // Log request payload
        console.log('QBO Invoice Request:', {
            url,
            headers,
            body: req.body
        });
        // Make API call
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(req.body)
        });
        let result;
        try {
            result = await response.json();
        } catch (jsonErr) {
            // If response is not JSON, log and return as text
            const text = await response.text();
            console.error('QBO Invoice Response (non-JSON):', text);
            return res.status(response.status).send(text);
        }
        // Log response payload
        console.log('QBO Invoice Response:', result);
        if (!response.ok) {
            console.error('QBO API Error:', result);
            return res.status(response.status).json({ error: result });
        }
        res.status(response.status).json(result);
    } catch (err) {
        console.error('Invoice API Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /customers
 * Fetches a list of customers from QuickBooks for use in invoice creation.
 * Requires a valid OAuth session and company ID.
 * Responds with a JSON array of customers or error details.
 */
router.get('/customers', async (req, res) => {
    try {
        // You may need to adjust how you get the token from session/store
        //const token = req.session?.token || process.env.QBO_TOKEN;

        // Get OAuth token from existing client
        const client = getClient();
        const companyId = req.session.companyId;
        if (!companyId) {
            return res.status(400).json({ error: 'No company ID found in session. Please reconnect to QuickBooks.' });
        }
        console.log('Company ID:', companyId);
        const token = client.getToken().getToken().access_token;
        console.log('QBO Token:', token);
        const selectStatement = "select * from Customer Where Active=true order by FullyQualifiedName ASC";
        const url = `${getQBOUrl()}/v3/company/${companyId}/query?query=${encodeURIComponent(selectStatement)}&minorversion=75`;
        console.log('QBO URL:', url);
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/text'
            }
        });
        console.log('QBO Response Customer fetch Status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('QBO Error Response:', errorText);
            throw new Error('Failed to fetch customers: ' + errorText);
        } const data = await response.json();
        const customers = data.QueryResponse?.Customer || [];
        res.json(customers);
    } catch (err) {
        console.error('Customer fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
