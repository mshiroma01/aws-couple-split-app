// Get the category from the query parameters
function getQueryParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

const category = getQueryParameter('category');
document.getElementById('categoryName').textContent = category;

// Global variable to hold fetched data
let data = [];

// Retrieve the data from localStorage
function getCategoryTransactions() {
    const categoryData = localStorage.getItem('categoryData');
    if (categoryData) {
        data = JSON.parse(categoryData);
        updateVendorChart(data);
        populateTransactionsTable(data);
    } else {
        console.error("No category data found in localStorage.");
        alert("No data available for the selected category.");
    }
}

// Consolidate similar vendor names
function consolidateVendors(transactions) {
    const vendorMapping = {};

    // Define rules for consolidating vendors
    const vendorRules = [
        { regex: /Target/i, name: 'Target' },
        { regex: /Walmart/i, name: 'Walmart' },
        { regex: /Starbucks/i, name: 'Starbucks' },
        { regex: /Amazon/i, name: 'Amazon' },
        // Add more rules as needed
    ];

    transactions.forEach(transaction => {
        let vendor = transaction.description || "Unknown";
        let consolidated = false;

        // Check if vendor matches any rule
        for (const rule of vendorRules) {
            if (rule.regex.test(vendor)) {
                vendor = rule.name;
                consolidated = true;
                break;
            }
        }

        if (!consolidated) {
            // Optionally, you can add more logic to handle other cases
            vendor = vendor.trim(); // Remove extra whitespace
        }

        if (!vendorMapping[vendor]) {
            vendorMapping[vendor] = 0;
        }
        vendorMapping[vendor] += Math.abs(transaction.amount);
    });

    return vendorMapping;
}

// Update the vendor bar chart
function updateVendorChart(data) {
    const vendorData = consolidateVendors(data);

    // Sort vendors by amount from most to least
    const sortedVendors = Object.entries(vendorData).sort((a, b) => b[1] - a[1]);

    // Truncate vendor labels if they are too long
    const maxLabelLength = 15; // Adjust this value as needed
    const vendorLabels = sortedVendors.map(entry => {
        const label = entry[0];
        if (label.length > maxLabelLength) {
            return label.substring(0, maxLabelLength - 3) + '...';
        } else {
            return label;
        }
    });
    const vendorAmounts = sortedVendors.map(entry => entry[1]);

    // Calculate the maximum value for the x-axis
    const maxAmount = Math.max(...vendorAmounts);

    // Update chart data and options
    vendorBarChart.data.labels = vendorLabels;
    vendorBarChart.data.datasets[0].data = vendorAmounts;

    // Adjust the chart's scales
    vendorBarChart.options.scales.x.max = Math.ceil(maxAmount / 50) * 50; // Round up to nearest 50
    vendorBarChart.options.scales.x.ticks.stepSize = 50; // Set interval to 50

    // Increase bar thickness
    vendorBarChart.options.elements.bar.thickness = 20; // Adjust thickness as needed

    vendorBarChart.update();
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
    amount: 'asc'
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
    const sortedData = [...data];

    sortedData.sort((a, b) => {
        let valA = a[column];
        let valB = b[column];

        if (column === 'transaction_date') {
            valA = new Date(valA);
            valB = new Date(valB);
        } else if (column === 'amount') {
            valA = parseFloat(valA);
            valB = parseFloat(valB);
        } else if (column === 'description') {
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

// Register the ChartDataLabels plugin
Chart.register(ChartDataLabels);

// Initialize Vendor Bar Chart
const vendorBarChartCtx = document.getElementById('vendorBarChart').getContext('2d');
const vendorBarChart = new Chart(vendorBarChartCtx, {
    type: 'bar',
    data: {
        labels: [],
        datasets: [{
            label: 'Amount',
            data: [],
            backgroundColor: '#3498db'
        }]
    },
    options: {
        indexAxis: 'y', // Display horizontal bar chart
        responsive: true,
        maintainAspectRatio: false, // Allow chart to fill container
        scales: {
            x: {
                beginAtZero: true,
                max: undefined, // Will be set dynamically
                ticks: {
                    font: {
                        size: 16 // Increase x-axis labels font size
                    },
                    callback: function(value) {
                        return `$${value}`;
                    },
                    stepSize: 50, // Set interval to 50
                },
                title: {
                    display: true,
                    text: 'Amount ($)',
                    font: {
                        size: 18
                    }
                },
                grid: {
                    display: true,
                    drawBorder: true,
                    drawOnChartArea: false,
                    drawTicks: true,
                },
            },
            y: {
                ticks: {
                    font: {
                        size: 16 // Increase y-axis labels font size
                    },
                    // Removed the callback function here
                }
            }
        },
        elements: {
            bar: {
                thickness: 20 // Increase bar thickness
            }
        },
        plugins: {
            legend: {
                display: false // Hide the legend
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const value = context.parsed.x;
                        return `$${value.toFixed(2)}`;
                    }
                },
                bodyFont: {
                    size: 16
                }
            },
            datalabels: {
                anchor: 'end',
                align: 'right',
                formatter: function(value) {
                    return `$${value.toFixed(2)}`;
                },
                color: 'black',
                font: {
                    size: 14
                },
                clip: true // Ensure labels don't overflow the chart area
            }
        }
    },
    plugins: [ChartDataLabels]
});

// Fetch and display data on page load
getCategoryTransactions();
