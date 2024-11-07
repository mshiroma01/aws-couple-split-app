// Global variable to store fetched data
let dashboardData = []; // Make sure this is accessible in your script

// Initialize date selector and report fetch function
async function fetchReport() {
    const userId = localStorage.getItem('userId');  // Get User ID from localStorage
    const transactionStartDate = document.getElementById('transactionStartDate').value;
    const transactionEndDate = document.getElementById('transactionEndDate').value;
    const csvStartDate = document.getElementById('csvStartDate').value;
    const csvEndDate = document.getElementById('csvEndDate').value;
    const status = "reviewed";  // Set status to 'reviewed' by default

    let apiUrl = `https://ID.execute-api.us-east-1.amazonaws.com/Prod/fetch-transactions?userid=${encodeURIComponent(userId)}&status=${encodeURIComponent(status)}`;
    
    // Add date range filters if they exist
    if (transactionStartDate) {
        apiUrl += `&transactionStartDate=${encodeURIComponent(transactionStartDate)}`;
    }
    if (transactionEndDate) {
        apiUrl += `&transactionEndDate=${encodeURIComponent(transactionEndDate)}`;
    }
    if (csvStartDate) {
        apiUrl += `&csvStartDate=${encodeURIComponent(csvStartDate)}`;
    }
    if (csvEndDate) {
        apiUrl += `&csvEndDate=${encodeURIComponent(csvEndDate)}`;
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        dashboardData = data; // Store data globally
        updateCharts(data);
        updateSummary(data);
        populateTransactionsTable(data);
    } catch (error) {
        console.error("Error fetching report data:", error);
        alert("Failed to fetch data for the selected date range. Please try again.");
    }
}

function updateCharts(data) {
    // Extract categories and amounts for the pie chart
    const categories = {};
    data.forEach(transaction => {
        const category = transaction.category || "Misc";
        if (!categories[category]) {
            categories[category] = 0;
        }
        categories[category] += Math.abs(transaction.amount); // Use absolute value
    });

    const categoryLabels = Object.keys(categories);
    const categoryAmounts = Object.values(categories);

    // Update the pie chart data
    expensePieChart.data.labels = categoryLabels;
    expensePieChart.data.datasets[0].data = categoryAmounts;
    expensePieChart.update();

    // Extract needs and wants amounts for the bar chart
    let needsTotal = 0;
    let wantsTotal = 0;

    data.forEach(transaction => {
        if (transaction.need) {
            needsTotal += Math.abs(transaction.amount); // Use absolute value
        } else {
            wantsTotal += Math.abs(transaction.amount); // Use absolute value
        }
    });

    // Update the bar chart data
    needsWantsBarChart.data.datasets[0].data = [needsTotal, wantsTotal];
    needsWantsBarChart.update();
}

// Update summary section with totals
function updateSummary(data) {
    let partnerOwes = 0;
    let youOwe = 0;

    data.forEach(transaction => {
        if (transaction.split === true) {  // Check if the transaction should be split
            if (typeof transaction.partner_after_split_amount === "undefined"){
                console.log("Undefined Partner amount:", JSON.stringify(transaction, null, 2));
            }
            else {
                partnerOwes += Math.abs(transaction.partner_after_split_amount); 
            }
        } 
        if (typeof transaction.after_split_amount === "undefined"){
            console.log("Undefined amount " + JSON.stringify(transaction, null, 2));
        }
        else {
            youOwe += Math.abs(transaction.after_split_amount);
        }
    });

    document.getElementById('partnerOwes').textContent = partnerOwes.toFixed(2);
    document.getElementById('youOwe').textContent = youOwe.toFixed(2);
}

// Populate the transactions table
function populateTransactionsTable(data) {
    const tableBody = document.getElementById('transactionsTable').querySelector('tbody');
    tableBody.innerHTML = ''; // Clear existing rows

    data.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${transaction.transaction_date}</td>
            <td>${transaction.description}</td>
            <td>${transaction.category || "Misc"}</td>
            <td>$${transaction.amount.toFixed(2)}</td>
            <td>${transaction.split === true ? 'Yes' : 'No'}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Sorting functionality for the table
let sortDirection = {
    transaction_date: 'asc',
    description: 'asc',
    category: 'asc',
    amount: 'asc',
    split: 'asc'
};

document.querySelectorAll('th.sortable').forEach(header => {
    header.addEventListener('click', () => {
        const column = header.getAttribute('data-column');
        sortDirection[column] = sortDirection[column] === 'asc' ? 'desc' : 'asc';

        // Remove 'desc' class from all headers
        document.querySelectorAll('th.sortable').forEach(h => h.classList.remove('desc'));

        if (sortDirection[column] === 'desc') {
            header.classList.add('desc');
        }

        sortTable(column, sortDirection[column]);
    });
});

function sortTable(column, direction) {
    const sortedData = [...dashboardData];

    sortedData.sort((a, b) => {
        let valA = a[column];
        let valB = b[column];

        if (column === 'transaction_date') {
            valA = new Date(valA);
            valB = new Date(valB);
        } else if (column === 'amount') {
            valA = parseFloat(valA);
            valB = parseFloat(valB);
        } else if (column === 'split') {
            valA = a[column] === true ? 'Yes' : 'No';
            valB = b[column] === true ? 'Yes' : 'No';
        } else {
            valA = valA ? valA.toString().toLowerCase() : '';
            valB = valB ? valB.toString().toLowerCase() : '';
        }

        if (direction === 'asc') {
            return valA > valB ? 1 : -1;
        } else {
            return valA < valB ? 1 : -1;
        }
    });

    populateTransactionsTable(sortedData);
}

// Initialize Pie Chart for Expense Categories
const expensePieChartCtx = document.getElementById('expensePieChart').getContext('2d');
const expensePieChart = new Chart(expensePieChartCtx, {
    type: 'pie',
    data: {
        labels: [],  // Start with empty labels, to be populated with actual data
        datasets: [{
            data: [],  // Start with empty data, to be populated with actual data
            backgroundColor: ['#3498db', '#1abc9c', '#9b59b6', '#e74c3c', '#f1c40f', '#e67e22', '#2ecc71', '#e84393']
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            }
        },
        onClick: function(event, elements) {
            if (elements.length > 0) {
                const chartElement = elements[0];
                const category = this.data.labels[chartElement.index];
                // Filter data for the selected category
                const categoryData = dashboardData.filter(transaction => transaction.category === category);

                // Store the category data in localStorage
                localStorage.setItem('categoryData', JSON.stringify(categoryData));

                // Open the new page with the selected category
                window.open(`category-details.html?category=${encodeURIComponent(category)}`, '_blank');
            }
        }
    }
});

// Initialize Bar Chart for Needs vs Wants
const needsWantsBarChartCtx = document.getElementById('needsWantsBarChart').getContext('2d');
const needsWantsBarChart = new Chart(needsWantsBarChartCtx, {
    type: 'bar',
    data: {
        labels: ['Needs', 'Wants'],
        datasets: [{
            label: 'Spending',
            data: [],  // Start with empty data, to be populated with actual data
            backgroundColor: ['#3498db', '#e74c3c']
        }]
    },
    options: {
        responsive: true,
        scales: {
            y: {
                beginAtZero: true
            }
        }
    }
});
