/**
 * @file Dimension Service
 *
 * @description
 * Provides functions to interact with the QuickBooks Dimensions GraphQL API.
 *
 * @functions
 *   getGraphQLClient(endpoint, token) - Create a GraphQL client with auth headers.
 *   getAllDimensions(client)          - Fetch all custom dimension definitions.
 *   getDimensionsById(client, id)     - Fetch dimension values by definition ID.
 *
 * @usage
 * Import and use in route handlers to fetch dimension data:
 *   import { getGraphQLClient, getAllDimensions, getDimensionsById } from './services/dimension-service.js';
 */
import { GraphQLClient, gql } from 'graphql-request';
import { getAllDimensionsQuery } from '../graphql/dimension/getAllDimensions.js';
import { getDimensionsByIdQuery, getDimensionsByIdVariable } from '../graphql/dimension/getDimensionsById.js';

/**
 * Creates a GraphQL client for communicating with the QuickBooks API.
 * @param {string} endpoint - The GraphQL API endpoint URL.
 * @param {string} token - The OAuth access token for authentication.
 * @returns {object} Configured GraphQL client instance.
 */
export const getGraphQLClient = (endpoint, token) => new GraphQLClient(endpoint, {
    headers: {
        authorization: `Bearer ${token}`,
    }
});

/**
 * Helper function to make a GraphQL request with error handling.
 * @param {object} client - The GraphQL client instance.
 * @param {string} queryData - The GraphQL query string.
 * @param {object} variables - Variables for the GraphQL query.
 * @returns {Promise<object>} The response data or undefined if an error occurs.
 */
const makeRequest = async (client, queryData, variables) => {
    try {
        const query = gql`${queryData}`;
        const response = await client.request(query, variables);
        return response;
    } catch (error) {
        console.log('An Error Occured', error.response.errors || error.response);
    }
}

/**
 * Fetches all custom dimension definitions from QuickBooks using the provided GraphQL client.
 * @param {object} client - The GraphQL client instance.
 * @returns {Promise<object>} The response data containing all dimension definitions.
 */
export const getAllDimensions = async (client) => {
    const query = gql`${getAllDimensionsQuery}`;
    const dimensions = await client.request(query);
    return dimensions;
}

/**
 * Fetches dimension values for a specific definition ID from QuickBooks using the provided GraphQL client.
 * @param {object} client - The GraphQL client instance.
 * @param {string} id - The dimension definition ID.
 * @returns {Promise<object>} The response data containing dimension values for the given ID.
 */
export const getDimensionsById = async (client, id) => {
    const dimension = await makeRequest(client, getDimensionsByIdQuery, getDimensionsByIdVariable(id));
    return dimension;
}