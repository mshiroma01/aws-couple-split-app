// Hardcoded API Gateway URLs for fetch and update operations
const apiUrlFetch = 'APIKEY';
const apiUrlUpdate = 'APIKEY';

let transactionsPerPage = 10; // Default items per page
let currentPage = 1;
let totalItems = 0;
let totalPages = 0;

let groupedTransactions = {}; // Store transactions grouped by mapping_config_name
let allTransactions = []; // Store all fetched transactions locally

let splitCategories = {}; // Store fetched split categories locally

// Enable the Fetch button only when a status is selected
function toggleFetchButton() {
    const statusSelect = document.getElementById('statusSelect').value;
    const fetchButton = document.getElementById('fetchButton');
    fetchButton.disabled = !statusSelect;  // Enable the button if a valid status is selected
}

// Fetch pending or reviewed transactions with optional date range
async function fetchTransactions() {
    // Clear local cache before fetching new data
    allTransactions = [];
    groupedTransactions = {};
    totalItems = 0;

    // Clear the table to show a blank state while fetching new data
    const tablesContainer = document.getElementById('tablesContainer');
    tablesContainer.innerHTML = ''; // This will clear the table immediately
    
    // Ensure the elements exist before accessing their values
    const statusSelect = document.getElementById('statusSelect');
    const userIdInput = '123456789';
    // const userIdInput = document.getElementById('userId');

    if (!statusSelect || !userIdInput) {
        console.error('Required elements (statusSelect, userId) are missing.');
        return;
    }

    const status = statusSelect.value;  // Status selection
    const userid = '123456789';   // User ID
    // const userid = userIdInput.value;   // User ID

    if (!userid) {
        alert('User ID is required.');
        return;
    }

    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    let apiUrlFetchWithParams = `${apiUrlFetch}?status=${encodeURIComponent(status)}&userid=${encodeURIComponent(userid)}`;
    
    if (startDate) apiUrlFetchWithParams += `&startDate=${encodeURIComponent(startDate)}`;
    if (endDate) apiUrlFetchWithParams += `&endDate=${encodeURIComponent(endDate)}`;

    // Get Cognito access token
    const token = localStorage.getItem('accessToken');  // Ensure the token is stored here after login

    // Add the actual fetch call here
    try {
        const response = await fetch(apiUrlFetchWithParams, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,  // Add Cognito token here
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

        // Store transactions locally
        allTransactions = transactions;
        totalItems = allTransactions.length;

        // Group transactions if necessary and render tables
        groupedTransactions = groupByMappingConfig(allTransactions);  
        renderTables(groupedTransactions);
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
    const apiUrlCategories = 'https://cg6071uo5i.execute-api.us-east-1.amazonaws.com/Prod/fetch-categories'; 

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
    // Fetch the categories and ensure it's an array
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
                    <th>Date</th>
                    <th>Category</th> <!-- New Category Column -->
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

        // Populate table with paged transactions and add item count
        pagedTransactions.forEach((transaction, index) => {
            const afterSplitAmount = (transaction.after_split_amount !== null && transaction.after_split_amount !== undefined) 
                ? `$${transaction.after_split_amount.toFixed(2)}` 
                : '';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${startIndex + index + 1}</td> <!-- Item count column -->
                <td>${transaction.hash}</td>
                <td>${transaction.description}</td>
                <td>$${transaction.amount}</td>
                <td>${afterSplitAmount}</td>
                <td>${transaction.transaction_date}</td>
                <td id="category-cell-${transaction.hash}"></td> <!-- Placeholder for category -->
                <td>
                    <select id="split-${transaction.hash}">
                        <option value="" disabled selected>-- Select --</option> <!-- Default option -->
                        <option value="yes" ${transaction.split === true ? "selected" : ""}>Yes</option>
                        <option value="no" ${transaction.split === false ? "selected" : ""}>No</option>
                    </select>
                </td>
            `;

            // Category selection
            const categoryCell = row.querySelector(`#category-cell-${transaction.hash}`);
            if (!transaction.category) {
                const categorySelect = document.createElement('select');
                categorySelect.id = `category-${transaction.hash}`;
                categorySelect.innerHTML = '<option value="" disabled selected>-- Select Category --</option>';
                splitCategories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.category;
                    option.textContent = category.category;
                    categorySelect.appendChild(option);
                });
                categoryCell.appendChild(categorySelect);
            } else {
                categoryCell.textContent = transaction.category; // If a category exists, show it as text
            }

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
    } else if (select.value === 'all') {
        transactionsPerPage = totalItems; // Set to totalItems to show all transactions
        customInput.style.display = 'none'; // Hide custom input
    } else {
        transactionsPerPage = parseInt(select.value, 10);
        customInput.style.display = 'none'; // Hide custom input
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

async function submitChanges() {
    const tablesContainer = document.getElementById('tablesContainer');
    const selects = tablesContainer.querySelectorAll('select');

    const updates = [];

    selects.forEach(select => {
        const transactionId = select.id.split('-')[1]; // Extract transaction ID from select ID
        const splitValue = select.value; // Get the value of the split dropdown

        // Get the selected category from the category dropdown if it exists
        const categorySelect = document.getElementById(`category-${transactionId}`);
        const selectedCategory = categorySelect ? categorySelect.value : null;

        // Find the matching transaction in `allTransactions` to get the amount
        const transaction = allTransactions.find(t => t.hash === transactionId);
        const amount = transaction ? transaction.amount : null;  // Get the transaction amount

        // Get UserID from a global variable, hardcoded value, or another source
        const userid = '123456789'; // Hardcoded for now; replace with actual logic

        // Only push updates if a valid selection was made for split or category
        if ((splitValue === 'yes' || splitValue === 'no') || selectedCategory) {
            updates.push({
                hash: transactionId,
                split: splitValue,  // This will be either 'yes' or 'no'
                category: selectedCategory,  // Include category if updated
                status: 'reviewed',   // Change status to reviewed
                userid: userid,       // Pass the user ID
                amount: amount        // Pass the transaction amount
            });
        }
    });

    if (updates.length === 0) {
        alert('No transactions were selected for update.');
        return;
    }

    // Get Cognito access token
    const token = localStorage.getItem('accessToken');  // Ensure the token is stored here after login

    // Send the updated transactions to the backend API
    try {
        const response = await fetch(apiUrlUpdate, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,  // Add Cognito token here
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });

        if (response.ok) {
            alert('Transactions updated successfully!');
        } else {
            const errorText = await response.text();
            alert(`Error updating transactions: ${errorText}`);
        }
    } catch (error) {
        console.error('Error submitting changes:', error);
        alert('Error submitting changes. Please try again later.');
    }
}
