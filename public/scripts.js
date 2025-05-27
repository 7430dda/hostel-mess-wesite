// API URL - change this to your server address
const API_URL = 'http://localhost:3000/api';

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const paymentModal = document.getElementById('paymentModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const paymentForm = document.getElementById('paymentForm');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');
const closeButtons = document.querySelectorAll('.close');
const tabButtons = document.querySelectorAll('.tab-btn');
const menuCards = document.querySelectorAll('.menu-card');
const buyButtons = document.querySelectorAll('.buy-btn');
const menuDate = document.getElementById('menuDate');
const onlinePayment = document.getElementById('online');
const cashPayment = document.getElementById('cash');
const onlinePaymentDetails = document.getElementById('onlinePaymentDetails');
const feedbackForm = document.getElementById('feedbackForm') || null;



// Set current date as default for menu date
if (menuDate) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    menuDate.value = `${year}-${month}-${day}`;
}

// Set current date as default for feedback date
const feedbackDate = document.getElementById('feedbackDate');
if (feedbackDate) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    feedbackDate.value = `${year}-${month}-${day}`;
}

// Initialize the app
function initializeApp() {
    checkUserLoggedIn();
    updateCouponCounts();
    loadMessMenu();
    
    // Initialize dashboard if on dashboard page
    const dashboardSection = document.querySelector('.dashboard-section');
    if (dashboardSection) {
        initializeDashboard();
    }
    
    // Initialize feedback if on feedback page
    const feedbackSection = document.querySelector('.feedback-section');
    if (feedbackSection) {
        loadRecentFeedback();
    }
}

// Check if user is logged in
function checkUserLoggedIn() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    if (currentUser) {
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        
        // Update user name on dashboard if on dashboard page
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = currentUser.name;
        }
    } else {
        loginBtn.style.display = 'inline-block';
        registerBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
    }
}

// Update coupon counts
// async function updateCouponCounts() {
//     try {
//         const response = await fetch(`${API_URL}/coupons`);
//         if (!response.ok) {
//             throw new Error('Failed to fetch coupon counts');
//         }
        
//         const coupons = await response.json();
        
//         const breakfastCoupons = document.getElementById('breakfast-coupons');
//         const lunchCoupons = document.getElementById('lunch-coupons');
//         const snacksCoupons = document.getElementById('snacks-coupons');
//         const dinnerCoupons = document.getElementById('dinner-coupons');
        
//         if (breakfastCoupons) breakfastCoupons.textContent = coupons.breakfast;
//         if (lunchCoupons) lunchCoupons.textContent = coupons.lunch;
//         if (snacksCoupons) snacksCoupons.textContent = coupons.snacks;
//         if (dinnerCoupons) dinnerCoupons.textContent = coupons.dinner;
//     } catch (error) {
//         console.error('Error updating coupon counts:', error);
//     }
// }
async function updateCouponCounts() {
    try {
        const response = await fetch(`${API_URL}/coupons`);
        if (!response.ok) {
            throw new Error('Failed to fetch coupon counts');
        }

        const coupons = await response.json();

        document.getElementById('breakfast-coupons').textContent = coupons.breakfast;
        document.getElementById('lunch-coupons').textContent = coupons.lunch;
        document.getElementById('snacks-coupons').textContent = coupons.snacks;
        document.getElementById('dinner-coupons').textContent = coupons.dinner;
    } catch (error) {
        console.error('Error updating coupon counts:', error);
    }
}


//Load mess menu
async function loadMessMenu() {
    const date = new Date(document.getElementById('menuDate').value);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

    try {
        const res = await fetch(`${API_URL}/menu?day=${dayName}`);
        const menu = await res.json();

        ['breakfast', 'lunch', 'snacks', 'dinner'].forEach(meal => {
            const container = document.querySelector(`#${meal} .menu-items`);
            if (container && menu[meal]) {
                container.innerHTML = menu[meal].map(item =>
                    `<p><i class="fas fa-utensils"></i> ${item}</p>`).join('');
            }
        });
    } catch (err) {
        console.error('Failed to load mess menu:', err);
    }
}


// Initialize dashboard
function initializeDashboard() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    if (!currentUser) {
        // Redirect to home if not logged in
        window.location.href = 'index.html';
        return;
    }
    
    loadTransactions();
    loadActiveCoupons();
    updateStatistics();
    
    // Add event listener for filter
    const filterMonth = document.getElementById('filterMonth');
    if (filterMonth) {
        filterMonth.addEventListener('change', loadTransactions);
    }
}

// Load transactions
async function loadTransactions() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const transactionBody = document.getElementById('transactionBody');
    const noTransactions = document.getElementById('noTransactions');
    const filterMonth = document.getElementById('filterMonth');
    
    if (!transactionBody || !noTransactions) return;
    
    // Clear previous transactions
    transactionBody.innerHTML = '';
    
    try {
        const response = await fetch(`${API_URL}/users/${currentUser.id}/transactions`);
        if (!response.ok) {
            throw new Error('Failed to fetch transactions');
        }
        
        let transactions = await response.json();
        
        // Filter by month if selected
        if (filterMonth && filterMonth.value !== 'all') {
            const selectedMonth = parseInt(filterMonth.value);
            transactions = transactions.filter(transaction => {
                const transactionDate = new Date(transaction.date);
                return transactionDate.getMonth() + 1 === selectedMonth;
            });
        }
        
        if (transactions.length === 0) {
            noTransactions.style.display = 'block';
            return;
        }
        
        noTransactions.style.display = 'none';
        
        // Add transactions to table
        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            
            const dateCell = document.createElement('td');
            const date = new Date(transaction.date);
            dateCell.textContent = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
            
            const mealCell = document.createElement('td');
            mealCell.textContent = transaction.meal.charAt(0).toUpperCase() + transaction.meal.slice(1);
            
            const amountCell = document.createElement('td');
            amountCell.textContent = `₹${transaction.amount}`;
            
            const paymentMethodCell = document.createElement('td');
            paymentMethodCell.textContent = transaction.payment_method.charAt(0).toUpperCase() + transaction.payment_method.slice(1);
            
            row.appendChild(dateCell);
            row.appendChild(mealCell);
            row.appendChild(amountCell);
            row.appendChild(paymentMethodCell);
            
            transactionBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading transactions:', error);
        noTransactions.style.display = 'block';
    }
}

// Load active coupons
async function loadActiveCoupons() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const activeCoupons = document.getElementById('activeCoupons');
    const noCoupons = document.getElementById('noCoupons');
    
    if (!activeCoupons || !noCoupons) return;
    
    // Clear previous coupons
    activeCoupons.innerHTML = '';
    
    try {
        const response = await fetch(`${API_URL}/users/${currentUser.id}/transactions`);
        if (!response.ok) {
            throw new Error('Failed to fetch transactions');
        }
        
        let transactions = await response.json();
        
        // Get today's date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Filter transactions for today
        const todayTransactions = transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            transactionDate.setHours(0, 0, 0, 0);
            return transactionDate.getTime() === today.getTime();
        });
        
        if (todayTransactions.length === 0) {
            noCoupons.style.display = 'block';
            activeCoupons.style.display = 'none';
            return;
        }
        
        noCoupons.style.display = 'none';
        activeCoupons.style.display = 'grid';
        
        // Add coupons to list
        todayTransactions.forEach(transaction => {
            const couponItem = document.createElement('div');
            couponItem.className = 'coupon-item';
            
            const couponTitle = document.createElement('h4');
            couponTitle.textContent = transaction.meal.charAt(0).toUpperCase() + transaction.meal.slice(1) + ' Coupon';
            
            const couponDate = document.createElement('p');
            const date = new Date(transaction.date);
            couponDate.textContent = `Date: ${date.toLocaleDateString()}`;
            
            const couponPrice = document.createElement('p');
            couponPrice.textContent = `Price: ₹${transaction.amount}`;
            
            const couponId = document.createElement('p');
            couponId.textContent = `Coupon ID: ${transaction.id.substring(0, 8)}`;
            
            couponItem.appendChild(couponTitle);
            couponItem.appendChild(couponDate);
            couponItem.appendChild(couponPrice);
            couponItem.appendChild(couponId);
            
            activeCoupons.appendChild(couponItem);
        });
    } catch (error) {
        console.error('Error loading active coupons:', error);
        noCoupons.style.display = 'block';
    }
}

// Update statistics
async function updateStatistics() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    const totalCoupons = document.getElementById('totalCoupons');
    const totalSpent = document.getElementById('totalSpent');
    const monthlySpent = document.getElementById('monthlySpent');
    
    if (!totalCoupons || !totalSpent || !monthlySpent) return;
    
    try {
        const response = await fetch(`${API_URL}/users/${currentUser.id}/transactions`);
        if (!response.ok) {
            throw new Error('Failed to fetch transactions');
        }
        
        const transactions = await response.json();
        
        // Calculate total coupons
        totalCoupons.textContent = transactions.length;
        
        // Calculate total spent
        const total = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
        totalSpent.textContent = total;
        
        // Calculate monthly spent
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const monthlyTransactions = transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
        });
        
        const monthly = monthlyTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
        monthlySpent.textContent = monthly;
    } catch (error) {
        console.error('Error updating statistics:', error);
    }
}

// Load recent feedback
async function loadRecentFeedback() {
    const recentFeedback = document.getElementById('recentFeedback');
    const noFeedback = document.getElementById('noFeedback');
    
    if (!recentFeedback || !noFeedback) return;
    
    // Clear previous feedback
    recentFeedback.innerHTML = '';
    
    try {
        const response = await fetch(`${API_URL}/feedback`);
        if (!response.ok) {
            throw new Error('Failed to fetch feedback');
        }
        
        const feedback = await response.json();
        
        if (feedback.length === 0) {
            noFeedback.style.display = 'block';
            recentFeedback.style.display = 'none';
            return;
        }
        
        noFeedback.style.display = 'none';
        recentFeedback.style.display = 'grid';
        
        // Add feedback to list
        feedback.forEach(item => {
            const feedbackItem = document.createElement('div');
            feedbackItem.className = 'feedback-item';
            
            const feedbackHeader = document.createElement('div');
            feedbackHeader.className = 'feedback-item-header';
            
            const feedbackTitle = document.createElement('h4');
            feedbackTitle.textContent = item.meal.charAt(0).toUpperCase() + item.meal.slice(1);
            
            const feedbackRating = document.createElement('div');
            feedbackRating.className = 'feedback-rating';
            
            for (let i = 0; i < 5; i++) {
                const star = document.createElement('i');
                star.className = i < item.rating ? 'fas fa-star' : 'far fa-star';
                feedbackRating.appendChild(star);
            }
            
            feedbackHeader.appendChild(feedbackTitle);
            feedbackHeader.appendChild(feedbackRating);
            
            const feedbackDate = document.createElement('p');
            feedbackDate.textContent = `Date: ${new Date(item.date).toLocaleDateString()}`;
            
            const feedbackComments = document.createElement('p');
            feedbackComments.textContent = item.comments ? `"${item.comments}"` : 'No comments provided';
            
            feedbackItem.appendChild(feedbackHeader);
            feedbackItem.appendChild(feedbackDate);
            feedbackItem.appendChild(feedbackComments);
            
            recentFeedback.appendChild(feedbackItem);
        });
    } catch (error) {
        console.error('Error loading feedback:', error);
        noFeedback.style.display = 'block';
    }
}

// Event Listeners
// Open login modal
if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        loginModal.style.display = 'block';
    });
}

// Open register modal
if (registerBtn) {
    registerBtn.addEventListener('click', () => {
        registerModal.style.display = 'block';
    });
}

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('currentUser');
        checkUserLoggedIn();
        window.location.href = 'index.html';
    });
}

// Close modals
closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        loginModal.style.display = 'none';
        registerModal.style.display = 'none';
        paymentModal.style.display = 'none';
    });
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === loginModal) {
        loginModal.style.display = 'none';
    }
    if (event.target === registerModal) {
        registerModal.style.display = 'none';
    }
    if (event.target === paymentModal) {
        paymentModal.style.display = 'none';
    }
});

// Switch to register form
if (showRegister) {
    showRegister.addEventListener('click', (event) => {
        event.preventDefault();
        loginModal.style.display = 'none';
        registerModal.style.display = 'block';
    });
}

// Switch to login form
if (showLogin) {
    showLogin.addEventListener('click', (event) => {
        event.preventDefault();
        registerModal.style.display = 'none';
        loginModal.style.display = 'block';
    });
}

// Tab switching
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons and cards
        tabButtons.forEach(btn => btn.classList.remove('active'));
        menuCards.forEach(card => card.classList.remove('active'));
        
        // Add active class to clicked button and corresponding card
        button.classList.add('active');
        const meal = button.dataset.meal;
        document.getElementById(meal).classList.add('active');
    });
});

// Buy coupon buttons
buyButtons.forEach(button => {
    button.addEventListener('click', () => {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        
        if (!currentUser) {
            alert('Please login to buy coupons');
            loginModal.style.display = 'block';
            return;
        }
        
        const meal = button.dataset.meal;
        const price = parseInt(button.dataset.price);
        
        // Open payment modal
        paymentModal.style.display = 'block';
        
        // Set payment details
        document.getElementById('paymentMeal').textContent = meal.charAt(0).toUpperCase() + meal.slice(1);
        document.getElementById('paymentPrice').textContent = price;
        
        // Store meal and price in payment form
        paymentForm.dataset.meal = meal;
        paymentForm.dataset.price = price;
    });
});

// Toggle payment method details
if (onlinePayment && cashPayment && onlinePaymentDetails) {
    onlinePayment.addEventListener('change', () => {
        onlinePaymentDetails.style.display = 'block';
    });
    
    cashPayment.addEventListener('change', () => {
        onlinePaymentDetails.style.display = 'none';
    });
}

// Login form submission
if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const response = await fetch(`${API_URL}/users/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            if (!response.ok) {
                throw new Error('Invalid email or password');
            }
            
            const user = await response.json();
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            
            loginModal.style.display = 'none';
            checkUserLoggedIn();
            window.location.reload();
        } catch (error) {
            alert(error.message);
        }
    });
}

// Register form submission
if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        
        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/users/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Registration failed');
            }
            
            const user = await response.json();
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            
            registerModal.style.display = 'none';
            checkUserLoggedIn();
            window.location.reload();
        } catch (error) {
            alert(error.message);
        }
    });
}

// Payment form submission
if (paymentForm) {
    paymentForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        const meal = paymentForm.dataset.meal;
        const price = parseInt(paymentForm.dataset.price);
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
        
        try {
            const response = await fetch(`${API_URL}/transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: currentUser.id,
                    meal,
                    amount: price,
                    paymentMethod
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to purchase coupon');
            }
            
            await response.json();
            
            paymentModal.style.display = 'none';
            updateCouponCounts();
            
            alert(`${meal.charAt(0).toUpperCase() + meal.slice(1)} coupon purchased successfully!`);
        } catch (error) {
            alert(error.message);
        }
    });
}

// Feedback form submission
if (feedbackForm) {
    feedbackForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        
        if (!currentUser) {
            alert('Please login to submit feedback');
            window.location.href = 'index.html';
            return;
        }
        
        const date = document.getElementById('feedbackDate').value;
        const meal = document.getElementById('feedbackMeal').value;
        const rating = document.querySelector('input[name="foodQuality"]:checked').value;
        const comments = document.getElementById('feedbackComments').value;
        const suggestions = document.getElementById('feedbackSuggestions').value;
        
        try {
            const response = await fetch(`${API_URL}/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: currentUser.id,
                    userName: currentUser.name,
                    date,
                    meal,
                    rating: parseInt(rating),
                    comments,
                    suggestions
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to submit feedback');
            }
            
            await response.json();
            
            // Reset form
            feedbackForm.reset();
            
            // Set current date
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            feedbackDate.value = `${year}-${month}-${day}`;
            
            // Update feedback list
            loadRecentFeedback();
            
            alert('Feedback submitted successfully!');
        } catch (error) {
            alert(error.message);
        }
    });
}

// Initialize the app when DOM is loaded
// document.addEventListener('DOMContentLoaded', initializeApp);
// const menuDateInput = document.getElementById('menuDate');
//     if (menuDateInput) {
//         menuDateInput.addEventListener('change', loadMessMenu);
//     }
// });
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    
    const menuDateInput = document.getElementById('menuDate');
    if (menuDateInput) {
        menuDateInput.addEventListener('change', loadMessMenu);
    }
    const menuDate = document.getElementById('menuDate');
    if (menuDate) {
        menuDate.addEventListener('change', () => {
            updateCouponCounts();      
            loadMessMenu();            
        });
    }
});