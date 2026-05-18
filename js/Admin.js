// ===== TOGGLE SWITCH FUNCTIONALITY =====
document.querySelectorAll('.user-toggle').forEach(toggle => {
    toggle.addEventListener('change', function() {
        const row = this.closest('tr');
        const statusBadge = row.querySelector('.status-badge');
        
        if (this.checked) {
            statusBadge.textContent = 'active';
            statusBadge.className = 'status-badge active';
        } else {
            statusBadge.textContent = 'inactive';
            statusBadge.className = 'status-badge inactive';
        }
    });
});

// ===== DELETE CONFIRMATION =====
document.querySelectorAll('.delete-icon').forEach(icon => {
    icon.addEventListener('click', function() {
        if (confirm('Are you sure you want to delete this user?')) {
            const row = this.closest('tr');
            row.style.transition = 'all 0.3s';
            row.style.opacity = '0';
            setTimeout(() => {
                row.remove();
            }, 300);
        }
    });
});

// ===== TAB SWITCHING =====
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', function() {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.style.display = 'none');
        
        this.classList.add('active');
        const tabId = this.dataset.tab;
        document.getElementById(tabId).style.display = 'block';
    });
});

// ===== HAMBURGER MENU =====
const hamburgerBtn = document.getElementById('hamburgerBtn');
const sidebar = document.querySelector('.sidebar');
const overlay = document.getElementById('sidebarOverlay');

function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('show'); }
function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('show'); }

if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });
}
if (overlay) overlay.addEventListener('click', closeSidebar);

document.querySelectorAll('.nav-item, .sub-item').forEach(item => {
    item.addEventListener('click', function() {
        if (window.innerWidth <= 768) closeSidebar();
    });
});

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('tabUserManagement').style.display = 'block';
    document.getElementById('tabSystemSettings').style.display = 'none';
    document.getElementById('tabDatabase').style.display = 'none';
});