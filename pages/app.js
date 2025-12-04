/**
 * Entry point: Initializes authentication, dimensions, and invoice form logic when the page loads.
 */
document.addEventListener('DOMContentLoaded', () => {
    setupAuth();
    setupDimensions();
    setupInvoiceForm();
});

/**
 * Sets up authentication logic for the application UI.
 * - Handles the QuickBooks Connect button click, initiates OAuth login, and redirects to the Intuit login page.
 * - Displays error messages if login fails.
 * - Checks if the user is authenticated on page load and toggles UI elements accordingly.
 * - Shows error messages if token check fails.
 */
function setupAuth() {
    const connectBtn = document.getElementById('connectBtn');
    connectBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/auth/login', { method: 'GET' });
            if (response.ok) {
                const data = await response.json();
                if (data.redirectUrl) window.location.href = data.redirectUrl;
            } else {
                const err = await response.json();
                showError(`Login failed: ${err.error || response.statusText}`);
            }
        } catch (e) {
            showError(`Login failed: ${e.message}`);
        }
    });

    checkToken().then(isAuth => {
        if (isAuth) {
            document.getElementById('tabs').classList.remove('is-hidden');
            document.querySelector('.hero').classList.add('is-hidden');
        }
    }).catch(e => {
        showError(`Token check failed: ${e.message}`);
    });
}

/**
 * Checks if the user is authenticated by requesting the current OAuth token from the server.
 * @returns {Promise<boolean>} True if a token exists, false otherwise.
 */
async function checkToken() {
    const response = await fetch('/api/auth/retrieveToken', { method: 'POST' });
    if (response.ok) {
        const data = await response.json();
        return !!data.token;
    }
    return false;
}

/**
 * Sets up the logic for displaying all dimensions when the user clicks the button.
 * Fetches dimensions from the server and renders them in a table.
 * Shows error messages if the fetch fails.
 */
function setupDimensions() {
    document.getElementById('showDimensionsBtn').addEventListener('click', async () => {
        const tableDiv = document.getElementById('dimensionsTable');
        tableDiv.innerHTML = '<span>Loading...</span>';
        try {
            const response = await fetch('/api/quickbook/dimensions/all');
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.errors || 'Failed to fetch dimensions');
            }
            const data = await response.json();
            const edges = data?.appFoundationsActiveCustomDimensionDefinitions?.edges || [];
            if (edges.length === 0) {
                tableDiv.innerHTML = '<span>No dimensions found.</span>';
                return;
            }
            tableDiv.innerHTML = renderDimensionsTable(edges);
            setupDimensionLinks();
        }
        catch (err) {
            console.error('Error loading dimensions:', err);
            // Try to extract GraphQL error message if present
            let errorMessage = err.message || err.toString();
            if (err.response && Array.isArray(err.response.errors) && err.response.errors.length > 0) {
                errorMessage = err.response.errors[0].message || errorMessage;
            }
            tableDiv.innerHTML = `<span style="color:red;">Error: ${errorMessage}</span>`;
            showError(`Error loading dimensions: ${errorMessage}`);
            res.status(500).json({
                details: errorMessage
            });
        }
    });
}

/**
 * Renders an HTML table of all dimension definitions.
 * @param {Array} edges - Array of dimension edge objects from the API.
 * @returns {string} HTML string for the dimensions table.
 */
function renderDimensionsTable(edges) {
    let html = `<h2 class="title" align="center">Available Dimensions</h2>
        <p class="subtitle" align="center">** Select a Dimension to view all its sub-values upto level 5, (Indicated by Level column).</p>
<table class="dimensions-result-table">
    <thead>
      <tr>
        <th>Definition ID</th>
        <th>Dimension Category</th>
        <th>Active</th>
      </tr>
    </thead>
    <tbody>`;

    for (const edge of edges) {
        const node = edge.node;
        html += `<tr>
      <td><a href="#" class="dimension-id-link" data-id="${node.id}">${node.id}</a></td>
      <td>${node.label}</td>
      <td>${node.active ? 'Yes' : 'No'}</td>
    </tr>`;
    }
    html += '</tbody></table><div id="dimensionDetails"></div>';
    return html;
}

/**
 * Adds click event listeners to dimension ID links in the table.
 * When clicked, shows the invoice form and loads dimension details.
 */
function setupDimensionLinks() {
    document.querySelectorAll('.dimension-id-link').forEach(link => {
        link.addEventListener('click', async function (e) {
            e.preventDefault();
            const id = this.getAttribute('data-id');
            showInvoiceForm(id);
            await showDimensionDetails(id);
        });
    });
}

/**
 * Displays the invoice form and pre-fills the selected dimension ID.
 * Also populates the customer dropdown for invoice creation.
 * @param {string} definitionId - The selected dimension definition ID.
 */
function showInvoiceForm(definitionId) {
    const invoiceFormContainer = document.getElementById('invoiceFormContainer');
    invoiceFormContainer.style.display = '';
    document.getElementById('definitionIdInput').value = definitionId;
    populateCustomerDropdown();
}

/**
 * Fetches the list of customers from the server and populates the dropdown in the invoice form.
 * Shows error messages if the fetch fails or no customers are found.
 */
async function populateCustomerDropdown() {
    const select = document.getElementById('customerSelect');
    select.innerHTML = '<option value="">Loading...</option>';
    try {
        const resp = await fetch('/api/quickbook/customers');
        if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.error || 'Failed to fetch customers');
        }
        const customers = await resp.json();
        if (!customers.length) {
            select.innerHTML = '<option value="">No customers found</option>';
            return;
        }
        select.innerHTML = customers.map(c =>
            `<option value="${c.Id}">${c.FullyQualifiedName || c.DisplayName || c.Id}</option>`
        ).join('');
    } catch (err) {
        select.innerHTML = `<option value="">Error loading customers</option>`;
        showError(`Error loading customers: ${err.message}`);
    }
}

// Update invoice form submit handler to use selected customer ID
/**
 * Sets up the invoice form submission logic.
 * Sends the invoice creation request to the server and displays the result or error.
 */

/**
 * Validates that the associatedValue is one of the valid dimension value IDs for the given definitionId.
 * @param {string} definitionId - The selected dimension definition ID.
 * @param {string} associatedValue - The value to validate.
 * @returns {Promise<{ valid: boolean, error?: string }>}
 */
async function validateAssociatedValue(definitionId, associatedValue) {
    try {
        const resp = await fetch(`/api/quickbook/dimensions/${definitionId}`);
        if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.error || 'Failed to fetch dimension values for validation');
        }
        const details = await resp.json();
        const validValueIds = (details?.appFoundationsActiveCustomDimensionValues?.edges || []).map(edge => edge.node.id);
        if (!validValueIds.includes(associatedValue)) {
            return {
                valid: false,
                error: 'Enter valid Value (Id) for this Dimension from above table.'
            };
        }
        return { valid: true };
    } catch (err) {
        return {
            valid: false,
            error: `Error validating dimension value: ${err.message}`
        };
    }
}

function setupInvoiceForm() {
    document.getElementById('invoiceForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        const customerId = document.getElementById('customerSelect').value;
        const definitionId = document.getElementById('definitionIdInput').value.trim();
        const associatedValue = document.getElementById('associatedValueInput').value.trim();
        const invoiceResult = document.getElementById('invoiceResult');
        invoiceResult.innerHTML = '';

        // Validate associatedValueInput using the new function
        const validation = await validateAssociatedValue(definitionId, associatedValue);
        if (!validation.valid) {
            invoiceResult.innerHTML = `<span style="color:red;">Error: ${validation.error}</span>`;
            showError(validation.error);
            return;
        }

        invoiceResult.innerHTML = '<span>Creating invoice...</span>';
        try {
            const payload = {
                Line: [
                    {
                        Description: "invoice testing using dimension api key-val",
                        Amount: 5,
                        DetailType: "SalesItemLineDetail",
                        CustomExtensions: [
                            {
                                AssociatedValues: [
                                    {
                                        Value: associatedValue,
                                        Key: definitionId
                                    }
                                ],
                                ExtensionType: "DIMENSION"
                            }
                        ],
                        SalesItemLineDetail: {
                            ItemRef: { value: "2" },
                            UnitPrice: 5,
                            Qty: 1
                        }
                    }
                ],
                CustomerRef: { value: customerId }
            };
            const resp = await fetch('/api/quickbook/invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!resp.ok) throw new Error('Failed to create invoice');
            const result = await resp.json();
            const invoice = result.Invoice || result;
            const invoiceId = invoice.Id;
            const txnDate = invoice.TxnDate;
            const customerName = invoice.CustomerRef?.name || '';
            const totalAmt = invoice.TotalAmt;
            let html = '';
            if (invoiceId) {
                const deeplink = `https://qbo.intuit.com/app/invoice?txnId=${invoiceId}`;
                html += `<div style="color:green;font-weight:bold;">Invoice created with dimensions, Invoice id# ${invoiceId}</div>`;
                html += `<div><a href="${deeplink}" target="_blank" title="To view this invoice you must be logged in to the QBO company">Open Invoice in QBO</a></div>`;
                html += `<div>Transaction Date: <b>${txnDate || '-'}</b></div>`;
                html += `<div>Customer Name: <b>${customerName || '-'}</b></div>`;
                html += `<div>Total Amount: <b>${totalAmt || '-'}</b></div>`;
            } else {
                html = `<span style="color:red;">Invoice creation response did not contain an invoice ID.</span><pre>${JSON.stringify(result, null, 2)}</pre>`;
            }
            invoiceResult.innerHTML = html;
        } catch (err) {
            invoiceResult.innerHTML = `<span style="color:red;">Error: ${err.message}</span>`;
        }
    });
}

/**
 * Fetches and displays detailed values for a selected dimension.
 * Renders a drilldown table of dimension values.
 * @param {string} id - The dimension definition ID to fetch details for.
 */
async function showDimensionDetails(id) {
    const detailsDiv = document.getElementById('dimensionDetails');
    detailsDiv.innerHTML = '<span>Loading details...</span>';
    try {
        const resp = await fetch(`/api/quickbook/dimensions/${id}`);
        if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.error || 'Failed to fetch dimension details');
        }
        const details = await resp.json();
        const nodes = (details?.appFoundationsActiveCustomDimensionValues?.edges || []).map(edge => edge.node);
        detailsDiv.innerHTML = renderDrilldownTable(nodes);
        setupDrilldownToggle(detailsDiv);
    } catch (err) {
        detailsDiv.innerHTML = `<span style="color:red;">Error: ${err.message}</span>`;
        showError(`Error loading dimension details: ${err.message}`);
    }
}

/**
 * Renders a drilldown table for dimension values, grouped by parent.
 * @param {Array} nodes - Array of dimension value nodes.
 * @returns {string} HTML string for the drilldown table.
 */
function renderDrilldownTable(nodes) {
    const grouped = {};
    nodes.forEach(node => {
        const parent = node.parentId || 'ROOT';
        if (!grouped[parent]) grouped[parent] = [];
        grouped[parent].push(node);
    });
    let html = `<table class="drilldown-table">
    <thead>
      <tr>
        <th></th>
        <th>Parent ID</th>
        <th>ID</th>
        <th>Name</th>
        <th>Active</th>
        <th>Level</th>
        <th>Fully Qualified Name</th>
      </tr>
    </thead>
    <tbody>`;
    let parentIndex = 0;
    Object.keys(grouped).forEach(parentId => {
        const collapseId = `collapse-${parentIndex}`;
        let parentLabel = '';
        if (parentId !== 'ROOT') {
            const parentNode = nodes.find(n => n.id === parentId);
            parentLabel = parentNode ? parentNode.label : '';
        } else {
            parentLabel = 'Root';
        }
        html += `<tr class="parent-row">
      <td><button class="toggle-btn" data-target="${collapseId}">+</button></td>
      <td colspan="6" style="font-weight:bold;background:#f0f0f0;">${parentId}${parentLabel ? ': ' + parentLabel : ''}</td>
    </tr>`;
        grouped[parentId].forEach(node => {
            html += `<tr class="child-row" data-parent="${collapseId}" style="display:none;">
        <td></td>
        <td></td>
        <td>${node.id}</td>
        <td>${node.label}</td>
        <td>${node.active ? 'Yes' : 'No'}</td>
        <td>${node.level}</td>
        <td>${node.fullyQualifiedLabel}</td>
      </tr>`;
        });
        parentIndex++;
    });
    html += '</tbody></table>';
    return html;
}

/**
 * Adds expand/collapse toggle functionality to parent rows in the drilldown table.
 * @param {HTMLElement} detailsDiv - The container div for the drilldown table.
 */
function setupDrilldownToggle(detailsDiv) {
    detailsDiv.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const target = this.getAttribute('data-target');
            const childRows = detailsDiv.querySelectorAll(`.child-row[data-parent="${target}"]`);
            const isCollapsed = childRows[0] && childRows[0].style.display === 'none';
            childRows.forEach(row => {
                row.style.display = isCollapsed ? '' : 'none';
            });
            this.textContent = isCollapsed ? '-' : '+';
        });
    });
}

/**
 * Displays a global error message at the top of the page for a few seconds.
 * @param {string} message - The error message to display.
 */
function showError(message) {
    let errorDiv = document.getElementById('globalError');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'globalError';
        errorDiv.style = 'color: red; background: #ffeaea; padding: 1em; margin: 1em 0; border-radius: 6px; text-align: center;';
        document.body.prepend(errorDiv);
    }
    errorDiv.textContent = message;
    setTimeout(() => { errorDiv.textContent = ''; }, 8000);
}