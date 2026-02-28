// Initialize Lucide Icons after DOM is fully loaded to ensure all elements are captured
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initNavigation();
});

// --- Navigation Enhancements ---
function initNavigation() {
    const mobileNavToggle = document.getElementById('mobileNavToggle');
    const closeSidePanel = document.getElementById('closeSidePanel');
    const sidePanel = document.getElementById('sidePanel');
    const sidePanelOverlay = document.getElementById('sidePanelOverlay');
    const sideLinks = document.querySelectorAll('.side-link');
    const desktopLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section');

    function toggleMenu() {
        sidePanel.classList.toggle('open');
        sidePanelOverlay.classList.toggle('open');
        document.body.classList.toggle('overflow-hidden');
    }

    mobileNavToggle.addEventListener('click', toggleMenu);
    closeSidePanel.addEventListener('click', toggleMenu);
    sidePanelOverlay.addEventListener('click', toggleMenu);

    // Close side panel when a link is clicked
    sideLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (sidePanel.classList.contains('open')) {
                toggleMenu();
            }
        });
    });

    // Intersection Observer for Active Section Highlighting
    const observerOptions = {
        root: null,
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');

                // Update Desktop Links
                desktopLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });

                // Update Side Links
                sideLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => observer.observe(section));
}

// --- Database Setup using Dexie.js ---
// We use Dexie to handle IndexedDB locally for offline operations.
const db = new Dexie('ScreenFixProDB');

db.version(1).stores({
    appointments: '++id, name, phoneModel, serviceType, date'
});

// --- Booking System ---
const bookingForm = document.getElementById('bookingForm');
const bookingSuccessMessage = document.getElementById('bookingSuccess');

bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get input values
    const name = document.getElementById('custName').value.trim();
    const phoneModel = document.getElementById('phoneModel').value.trim();
    const serviceType = document.getElementById('serviceType').value;
    const date = document.getElementById('serviceDate').value;

    try {
        // Save to IndexedDB
        await db.appointments.add({
            name,
            phoneModel,
            serviceType,
            date
        });

        // Show success message briefly
        bookingSuccessMessage.classList.remove('hidden');
        setTimeout(() => {
            bookingSuccessMessage.classList.add('hidden');
        }, 3000);

        // Reset the form
        bookingForm.reset();

        // Refresh the Dashboard real-time
        await loadDashboard();

    } catch (error) {
        console.error("Failed to add appointment:", error);
        alert("There was an error saving your booking. Please try again.");
    }
});


// --- Live Dashboard ---
let serviceChartInstance = null; // Store chart instance to destroy/update

async function loadDashboard() {
    const queueList = document.getElementById('queueList');

    // Fetch all appointments from DB
    const allAppointments = await db.appointments.orderBy('date').toArray();

    // Clear existing UI list
    queueList.innerHTML = '';

    if (allAppointments.length === 0) {
        queueList.innerHTML = '<p class="text-gray-500 italic text-center mt-10">No active bookings yet.</p>';
    } else {
        // Populate Queue List
        allAppointments.forEach(app => {
            const item = document.createElement('div');
            item.className = 'glass bg-white/5 p-4 rounded-xl flex justify-between items-center border border-white/5';
            item.innerHTML = `
                <div>
                    <h5 class="font-bold text-white text-lg">${app.name}</h5>
                    <p class="text-sm text-gray-400">${app.phoneModel} &bull; <span class="text-electricblue">${app.serviceType}</span></p>
                </div>
                <div class="text-right">
                    <span class="bg-cybergreen/20 text-cybergreen text-xs font-bold px-3 py-1 rounded-full"><i data-lucide="calendar" class="w-3 h-3 inline mr-1"></i>${app.date}</span>
                </div>
            `;
            queueList.appendChild(item);
        });
        lucide.createIcons(); // re-init icons for new innerHTML
    }

    // Prepare data for Chart.js
    const stats = {
        'Screen Replacement': 0,
        'Battery Swap': 0,
        'Glass Protection': 0,
        'Other': 0
    };

    allAppointments.forEach(app => {
        if (stats[app.serviceType] !== undefined) {
            stats[app.serviceType]++;
        } else {
            stats['Other']++;
        }
    });

    const ctx = document.getElementById('serviceChart').getContext('2d');

    // Destroy previous chart if exists to prevent overlapping
    if (serviceChartInstance) {
        serviceChartInstance.destroy();
    }

    // Chart Data for Visualization
    const hasData = allAppointments.length > 0;
    const chartData = hasData ? Object.values(stats) : [1]; // Show a full circle if empty
    const chartLabels = hasData ? Object.keys(stats) : ['System Ready'];
    const chartColors = hasData ? [
        '#3b82f6', // Electric Blue
        '#10b981', // Cyber Green
        '#8b5cf6', // Purple mix
        '#4b5563'  // Gray
    ] : ['rgba(16, 185, 129, 0.2)']; // Faint green for "Ready" state

    // Create Donut chart
    serviceChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartLabels,
            datasets: [{
                data: chartData,
                backgroundColor: chartColors,
                borderColor: '#121212',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    display: hasData, // Hide legend if no data to keep it clean
                    labels: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        font: { family: 'Inter, sans-serif' }
                    }
                },
                tooltip: {
                    enabled: hasData // Disable tooltips if just showing "Ready"
                }
            },
            cutout: '75%',
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });

    // If empty, add a "Ready" text in the center
    if (!hasData) {
        setTimeout(() => {
            const chart = serviceChartInstance;
            const ctx = chart.ctx;
            const x = chart.width / 2;
            const y = chart.height / 2;
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 14px Inter';
            ctx.fillStyle = '#10b981';
            ctx.fillText('QUEUE READY', x, y);
            ctx.restore();
        }, 300);
    }
}

// Load dashboard immediately upon script execution
loadDashboard();


// --- FAQ Accordion Logic ---
function toggleFaq(item) {
    const allContents = document.querySelectorAll('.accordion-content');
    const allIcons = document.querySelectorAll('.faq-icon');

    const content = item.querySelector('.accordion-content');
    const icon = item.querySelector('.faq-icon');

    // Close others
    allContents.forEach(c => {
        if (c !== content) c.classList.remove('open');
    });
    allIcons.forEach(i => {
        if (i !== icon) i.style.transform = 'rotate(0deg)';
    });

    // Toggle current
    if (content.classList.contains('open')) {
        content.classList.remove('open');
        icon.style.transform = 'rotate(0deg)';
    } else {
        content.classList.add('open');
        icon.style.transform = 'rotate(180deg)';
    }
}


// --- Shop cart function ---
function addToCart(itemName) {
    alert(`Added "${itemName}" to your cart!`);
}

// Smooth scrolling for anchor links to prevent jumping
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});
