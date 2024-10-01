// Hardcoded API Gateway URLs for fetch and update operations
const apiUrlFetch = 'APIKEY';
const apiUrlUpdate = 'APIKEY';

let transactionsPerPage = 10; // Default items per page
let currentPage = 1;
let totalItems = 0;
let totalPages = 0;
let groupedTransactions = {}; // Store transactions grouped by mapping_config_name

// Fetch pending transactions from the backend API
async function fetchTransactions() {
    try {
        const response = await fetch(apiUrlFetch);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const transactions = await response.json();
        totalItems = transactions.length;
        groupedTransactions = groupByMappingConfig(transactions); // Group transactions
        renderTables(groupedTransactions);
        renderPaginationControls();
    } catch (error) {
        console.error('Error fetching transactions:', error);
        const tablesContainer = document.getElementById('tablesContainer');
        tablesContainer.innerHTML = `<p>Error fetching transactions: ${error.message}</p>`;
    }
}

// Render tables with pagination
function renderTables(groupedTransactions) {
    const tablesContainer = document.getElementById('tablesContainer');
    tablesContainer.innerHTML = ''; // Clear existing tables

    Object.keys(groupedTransactions).forEach(mappingConfigName => {
        const tableContainer = document.createElement('div');
        tableContainer.classList.add('table-container');

        const tableTitle = document.createElement('div');
        tableTitle.classList.add('table-title');
        tableTitle.textContent = `Transactions for ${mappingConfigName}`;
        tableContainer.appendChild(tableTitle);

        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Transaction ID</th>
                    <th>Description</th>
                    <th>Price</th>
                    <th>After Split Amount</th>
                    <th>Date</th>
                    <th>Split</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;
        const tableBody = table.querySelector('tbody');

        // Determine the start and end indexes for pagination
        const startIndex = (currentPage - 1) * transactionsPerPage;
        const endIndex = startIndex + transactionsPerPage;
        const pagedTransactions = groupedTransactions[mappingConfigName].slice(startIndex, endIndex);

        // Populate table with paged transactions
        pagedTransactions.forEach(transaction => {
            const afterSplitAmount = transaction.after_split_amount ? transaction.after_split_amount.toFixed(2) : '-'; // Round to 2 decimals

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${transaction.hash}</td>
                <td>${transaction.description}</td>
                <td>$${transaction.amount}</td>
                <td>$${afterSplitAmount}</td> <!-- Display rounded after_split_amount -->
                <td>${transaction.transaction_date}</td>
                <td>
                    <select id="split-${transaction.hash}">
                        <option value="" disabled selected>-- Select --</option> <!-- Default option -->
                        <option value="yes" ${transaction.split === true ? "selected" : ""}>Yes</option>
                        <option value="no" ${transaction.split === false ? "selected" : ""}>No</option>
                    </select>
                </td>
            `;
            tableBody.appendChild(row);
        });

        tableContainer.appendChild(table);
        tablesContainer.appendChild(tableContainer);
    });
}


// Helper function to group transactions by mapping_config_name
function groupByMappingConfig(transactions) {
    return transactions.reduce((group, transaction) => {
        const mappingConfig = transaction.mapping_config_name || 'Unknown';
        if (!group[mappingConfig]) {
            group[mappingConfig] = [];
        }
        group[mappingConfig].push(transaction);
        return group;
    }, {});
}

// Handle changing the number of items per page
function changeItemsPerPage() {
    const select = document.getElementById('itemsPerPageSelect');
    const customInput = document.getElementById('customItemsPerPage');

    if (select.value === 'custom') {
        customInput.style.display = 'inline-block'; // Show custom input
        const customValue = parseInt(customInput.value, 10);
        if (customValue > 0) {
            transactionsPerPage = customValue;
        }
    } else {
        customInput.style.display = 'none'; // Hide custom input
        transactionsPerPage = parseInt(select.value, 10);
    }

    currentPage = 1; // Reset to the first page
    renderTables(groupedTransactions);
    renderPaginationControls();
}

// Update pagination controls
function renderPaginationControls() {
    totalPages = Math.ceil(totalItems / transactionsPerPage);

    document.getElementById('itemRange').textContent = `${(currentPage - 1) * transactionsPerPage + 1}-${Math.min(currentPage * transactionsPerPage, totalItems)} of ${totalItems} items`;
    document.getElementById('totalPages').textContent = `of ${totalPages}`;
    document.getElementById('currentPageInput').value = currentPage;

    document.getElementById('prevPageButton').disabled = currentPage === 1;
    document.getElementById('firstPageButton').disabled = currentPage === 1;
    document.getElementById('nextPageButton').disabled = currentPage === totalPages;
    document.getElementById('lastPageButton').disabled = currentPage === totalPages;
}

// Pagination functions
function goToFirstPage() {
    currentPage = 1;
    renderTables(groupedTransactions);
    renderPaginationControls();
}

function goToPreviousPage() {
    if (currentPage > 1) {
        currentPage--;
        renderTables(groupedTransactions);
        renderPaginationControls();
    }
}

function goToNextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        renderTables(groupedTransactions);
        renderPaginationControls();
    }
}

function goToLastPage() {
    currentPage = totalPages;
    renderTables(groupedTransactions);
    renderPaginationControls();
}

function goToPage(page) {
    const pageNumber = parseInt(page, 10);
    if (pageNumber >= 1 && pageNumber <= totalPages) {
        currentPage = pageNumber;
        renderTables(groupedTransactions);
        renderPaginationControls();
    }
}

// Send the reviewed transactions to the backend API
async function submitChanges() {
    const tablesContainer = document.getElementById('tablesContainer');
    const selects = tablesContainer.querySelectorAll('select');

    const updates = [];

    selects.forEach(select => {
        const transactionId = select.id.split('-')[1]; // Extract transaction ID from select ID
        const splitValue = select.value; // Get the value of the dropdown
        updates.push({
            hash: transactionId,
            split: splitValue === 'yes',
            status: 'reviewed'
        });
    });

    // Send the updated transactions to the backend API
    await fetch(apiUrlUpdate, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
    });

    alert('Transactions updated successfully!');
}
