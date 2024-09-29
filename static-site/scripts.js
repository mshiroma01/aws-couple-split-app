// Import the actual API Gateway URLs from config.js
import { apiUrlFetch, apiUrlUpdate } from './config.js';

// Fetch pending transactions from the backend API
async function fetchTransactions() {
    try {
        const response = await fetch(apiUrlFetch);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const transactions = await response.json();
        const transactionDiv = document.getElementById('transactions');

        if (transactions.length === 0) {
            transactionDiv.innerHTML = "<p>No transactions available.</p>";
        }

        // Populate the transactions div with the list of pending transactions
        transactions.forEach(transaction => {
            const transactionHTML = `
                <div>
                    <p>${transaction.description} - $${transaction.amount}</p>
                    <label>Split?</label>
                    <input type="checkbox" id="split-${transaction.hash}" />
                </div>
            `;
            transactionDiv.innerHTML += transactionHTML;
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        document.getElementById('transactions').innerHTML = `<p>Error fetching transactions: ${error.message}</p>`;
    }
}

// Send the reviewed transactions to the backend API
async function submitChanges() {
    const transactionDiv = document.getElementById('transactions');
    const transactions = transactionDiv.querySelectorAll('div');

    const updates = [];

    transactions.forEach(transactionDiv => {
        const hash = transactionDiv.querySelector('input').id.split('-')[1];
        const isSplitChecked = transactionDiv.querySelector('input').checked;
        updates.push({
            hash: hash,
            split: isSplitChecked,
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
