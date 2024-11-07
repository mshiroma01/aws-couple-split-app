// Hardcoded API Gateway URLs for fetch and update operations
const apiUrlFetch = 'https://ID.execute-api.us-east-1.amazonaws.com/Prod/fetch-transactions';
const apiUrlUpdate = 'https://ID.execute-api.us-east-1.amazonaws.com/Prod/update-transactions';

let transactionsPerPage = 10; // Default items per page
let currentPage = 1;
let totalItems = 0;
let totalPages = 0;

let groupedTransactions = {}; // Store transactions grouped by mapping_config_name
let allTransactions = []; // Store all fetched transactions locally

let splitCategories = []; // Store fetched split categories locally
let changedItems = {}; // Object to store changed transactions

// Function to encode IDs safely
function encodeId(id) {
    return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

// Enable the Fetch button only when a status is selected
function toggleFetchButton() {
    const statusSelect = document.getElementById('statusSelect').value;
    const fetchButton = document.getElementById('fetchButton');
    fetchButton.disabled = !statusSelect;  // Enable the button if a valid status is selected
}

// Fetch pending or reviewed transactions with optional date range
async function fetchTransactions() {
    const statusSelect = document.getElementById('statusSelect');
    const userId = localStorage.getItem('userId');  // Get User ID from localStorage

    if (!userId) {
        alert("User ID not found. Please log in first.");
        window.location.href = 'https://ID.cloudfront.net/static-site/index.html';
        return;
    }

    const status = statusSelect.value;

    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    let apiUrlFetchWithParams = `${apiUrlFetch}?status=${encodeURIComponent(status)}&userid=${encodeURIComponent(userId)}`;
    
    if (startDate) apiUrlFetchWithParams += `&startDate=${encodeURIComponent(startDate)}`;
    if (endDate) apiUrlFetchWithParams += `&endDate=${encodeURIComponent(endDate)}`;

    try {
        const response = await fetch(apiUrlFetchWithParams, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const transactions = await response.json();

        if (transactions.length === 0) {
            document.getElementById('tablesContainer').innerHTML = "<p>No transactions available.</p>";
            return;
        }

        allTransactions = transactions;
        totalItems = allTransactions.length;

        groupedTransactions = groupByMappingConfig(allTransactions);
        await renderTables(groupedTransactions); // Await since renderTables is async
        renderPaginationControls();  

    } catch (error) {
        console.error('Error fetching transactions:', error);
        document.getElementById('tablesContainer').innerHTML = `<p>Error fetching transactions: ${error.message}</p>`;
    }
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
    } else if (select.value === 'all') {
        transactionsPerPage = totalItems; // Show all transactions
        customInput.style.display = 'none'; // Hide custom input
    } else {
        transactionsPerPage = parseInt(select.value, 10);
        customInput.style.display = 'none'; // Hide custom input
    }

    currentPage = 1; // Reset to the first page
    renderTables(groupedTransactions); // Reuse the existing groupedTransactions data
    renderPaginationControls();
}

// Fetch categories before rendering tables
async function fetchCategories() {
    const apiUrlCategories = 'https://ID.execute-api.us-east-1.amazonaws.com/Prod/fetch-categories'; 

    try {
        const response = await fetch(`${apiUrlCategories}?userid=123456789`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch categories: ${response.status}`);
        }
        const data = await response.json();
        return data;  // Assume the data returned is an array of categories
    } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
}

// Render tables with category selection dropdown for missing categories
async function renderTables(groupedTransactions) {
    splitCategories = await fetchCategories();
    if (!Array.isArray(splitCategories)) {
        console.error('splitCategories is not an array:', splitCategories);
        splitCategories = [];  // Default to an empty array if fetch fails
    }

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
                    <th>#</th> 
                    <th>Transaction ID</th>
                    <th>Description</th> 
                    <th>Price</th>
                    <th>After Split Amount</th> 
                    <th>Partner Split Amount</th>
                    <th>Date</th>
                    <th>Date CSV Added</th>
                    <th>Category</th>
                    <th>Split</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;
        const tableBody = table.querySelector('tbody');

        const startIndex = (currentPage - 1) * transactionsPerPage;
        const endIndex = startIndex + transactionsPerPage;
        const pagedTransactions = groupedTransactions[mappingConfigName].slice(startIndex, endIndex);

        pagedTransactions.forEach((transaction, index) => {
            const afterSplitAmount = transaction.after_split_amount !== null && transaction.after_split_amount !== undefined
                ? `$${transaction.after_split_amount.toFixed(2)}`
                : '';
            const partnerAfterSplitAmount = transaction.partner_after_split_amount !== null && transaction.partner_after_split_amount !== undefined
                ? `$${transaction.partner_after_split_amount.toFixed(2)}`
                : '';

            const safeHash = encodeId(transaction.hash);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${startIndex + index + 1}</td>
                <td>${transaction.hash.substring(0, 16)}...</td>
                <td>${transaction.description}</td>
                <td>$${transaction.amount}</td>
                <td>${afterSplitAmount}</td>
                <td>${partnerAfterSplitAmount}</td>
                <td>${transaction.transaction_date}</td>
                <td>${transaction.date_csv_added}</td> 
                <td id="category-cell-${safeHash}"></td>
                <td>
                    <select id="split-${safeHash}">
                        <option value="" disabled selected>-- Select --</option>
                        <option value="yes" ${transaction.split === true ? "selected" : ""}>Yes</option>
                        <option value="no" ${transaction.split === false ? "selected" : ""}>No</option>
                    </select>
                </td>
            `;

            const categoryCell = row.querySelector(`#category-cell-${safeHash}`);
            const categorySelect = document.createElement('select');
            categorySelect.id = `category-${safeHash}`;
            categorySelect.innerHTML = '<option value="" disabled selected>-- Select Category --</option>';

            splitCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.category;
                option.textContent = category.category;
                if (transaction.category === category.category) {
                    option.selected = true;
                }
                categorySelect.appendChild(option);
            });

            categoryCell.appendChild(categorySelect);

            // Add event listeners to track changes
            const splitSelect = row.querySelector(`#split-${safeHash}`);
            splitSelect.addEventListener('change', function() {
                if (!changedItems[transaction.hash]) {
                    changedItems[transaction.hash] = {};
                }
                changedItems[transaction.hash].split = splitSelect.value;
            });

            categorySelect.addEventListener('change', function() {
                if (!changedItems[transaction.hash]) {
                    changedItems[transaction.hash] = {};
                }
                changedItems[transaction.hash].category = categorySelect.value;

                // Optionally, update the split select based on category change
                const selectedCategory = splitCategories.find(cat => cat.category === categorySelect.value);
                if (selectedCategory && selectedCategory.split_percent === 0) {
                    splitSelect.value = "no";
                    splitSelect.disabled = true;
                } else {
                    splitSelect.disabled = false;
                }
            });

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

// Submit only changed transactions
async function submitChanges() {
    const userid = localStorage.getItem('userId');  // Get User ID from localStorage

    const updates = [];

    for (const transactionId in changedItems) {
        const changes = changedItems[transactionId];
        const transaction = allTransactions.find(t => t.hash === transactionId);
        if (!transaction) continue; // Should not happen

        const update = {
            hash: transactionId,
            userid: userid,
            status: 'reviewed',
            amount: transaction.amount,
        };

        if ('split' in changes) {
            update.split = changes.split;
        }

        if ('category' in changes) {
            update.category = changes.category;
        }

        updates.push(update);
    }

    if (updates.length === 0) {
        alert('No transactions were selected for update.');
        return;
    }

    // Send the updated transactions to the backend API
    try {
        const response = await fetch(apiUrlUpdate, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });

        if (response.ok) {
            alert('Transactions updated successfully!');
            changedItems = {}; // Clear changed items after successful update
            await fetchTransactions(); // Re-fetch transactions to get the latest data from the backend
            renderTables(groupedTransactions); // Re-render the tables
        } else {
            const errorText = await response.text();
            alert(`Error updating transactions: ${errorText}`);
        }
    } catch (error) {
        console.error('Error submitting changes:', error);
        alert('Error submitting changes. Please try again later.');
    }
}

function goToDashboard() {
    window.location.href = 'https://ID.cloudfront.net/static-site/dashboard.html'; 
}
