// ===== DATA =====
let reports = [
    
];

// ===== DOM REFS =====
const tbody = document.getElementById('tableBody');
const pendingCount = document.getElementById('pendingCount');
const investigatingCount = document.getElementById('investigatingCount');
const resolvedCount = document.getElementById('resolvedCount');
const resolutionRate = document.getElementById('resolutionRate');
const searchInput = document.getElementById('searchInput');
const typeFilter = document.getElementById('typeFilter');

// ===== STATE TRACKERS =====
let currentStatusFilter = 'All';
let currentTypeFilter = 'All';

// ===== RENDER TABLE =====
function renderTable(data = reports) {
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;padding:36px 12px;">
                    <div class="empty-state">
                        <div class="empty-icon">📄</div>
                        <p>No incident reports found.</p>
                        <span>Reports will appear here once submitted.</span>
                    </div>
                </td>
            </tr>
        `;
        updateStats([]);
        return;
    }

    updateStats(data);

    data.forEach((report, index) => {
        const row = document.createElement('tr');
        const statusClass = report.status === 'Investigating' ? 'badge-inv' :
                            report.status === 'Resolved' ? 'badge-res' : 'badge-pend';
        row.innerHTML = `
            <td>${report.id}</td>
            <td>${formatDate(report.date)}</td>
            <td>${report.type}</td>
            <td>${report.complainant}</td>
            <td>${report.location}</td>
            <td><span class="badge ${statusClass}">${report.status}</span></td>
            <td>
                <div class="action-cell">
                    <span class="action-icon edit-icon" data-index="${index}" title="Edit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                        </svg>
                    </span>
                    <span class="action-icon delete-icon" data-index="${index}" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                    </span>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// ===== UPDATE STATS =====
function updateStats(data) {
    const pending = data.filter(r => r.status === 'Pending').length;
    const investigating = data.filter(r => r.status === 'Investigating').length;
    const resolved = data.filter(r => r.status === 'Resolved').length;
    const total = data.length;
    const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    pendingCount.textContent = pending;
    investigatingCount.textContent = investigating;
    resolvedCount.textContent = resolved;
    resolutionRate.textContent = rate + '%';
}

// ===== UTILITY =====
function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ===== DELETE REPORT =====
function deleteReport(index) {
    const confirmed = confirm('Are you sure you want to delete this record?');
    if (confirmed) {
        reports.splice(index, 1);
        applyFilters();
    }
}

// ===== EDIT REPORT =====
function openEditModal(index) {
    const report = reports[index];
    if (!report) return;

    document.getElementById('modalIncidentId').textContent = report.id;
    document.getElementById('modalDate').textContent = formatDate(report.date);
    document.getElementById('modalType').textContent = report.type;
    document.getElementById('modalComplainant').textContent = report.complainant;
    document.getElementById('modalLocation').textContent = report.location;
    document.getElementById('modalUpdateBy').textContent = 'Staff / Rome';
    document.getElementById('editModal').dataset.editIndex = index;

    const invBadge = document.getElementById('modalStatusBadge');
    const resBadge = document.getElementById('modalResolveBadge');
    invBadge.style.background = report.status === 'Investigating' ? '#dc3545' : '#f57c00';
    resBadge.style.background = report.status === 'Resolved' ? '#43a047' : '#6c757d';

    document.getElementById('editModal').style.display = 'flex';
}

// ===== CLOSE MODAL =====
function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

// ===== FILTERING =====
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusVal = currentStatusFilter;
    const typeVal = currentTypeFilter;

    let filtered = reports.filter(r => {
        const matchSearch = r.id.toLowerCase().includes(searchTerm) ||
                            r.complainant.toLowerCase().includes(searchTerm) ||
                            r.location.toLowerCase().includes(searchTerm);
        const matchStatus = statusVal === 'All' || r.status === statusVal;
        const matchType = typeVal === 'All' || r.type === typeVal;
        return matchSearch && matchStatus && matchType;
    });
    renderTable(filtered);
}

// ===== EVENT LISTENERS =====

// Delete & Edit via event delegation
tbody.addEventListener('click', function(e) {
    const target = e.target.closest('.action-icon');
    if (!target) return;
    const index = parseInt(target.dataset.index);
    if (isNaN(index)) return;

    if (target.classList.contains('delete-icon')) {
        deleteReport(index);
    } else if (target.classList.contains('edit-icon')) {
        openEditModal(index);
    }
});

// Close modal
document.getElementById('closeModalBtn').addEventListener('click', closeModal);
document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
document.getElementById('editModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

// Update button in modal
document.getElementById('modalUpdateBtn').addEventListener('click', function() {
    const index = parseInt(document.getElementById('editModal').dataset.editIndex);
    if (isNaN(index)) return;
    const current = reports[index];
    // Cycle: Pending → Investigating → Resolved → Pending
    if (current.status === 'Pending') {
        current.status = 'Investigating';
    } else if (current.status === 'Investigating') {
        current.status = 'Resolved';
    } else {
        current.status = 'Pending';
    }
    closeModal();
    applyFilters();
});

// Modal status badge click
document.getElementById('modalStatusBadge').addEventListener('click', function() {
    const index = parseInt(document.getElementById('editModal').dataset.editIndex);
    if (isNaN(index)) return;
    reports[index].status = 'Investigating';
    closeModal();
    applyFilters();
});
document.getElementById('modalResolveBadge').addEventListener('click', function() {
    const index = parseInt(document.getElementById('editModal').dataset.editIndex);
    if (isNaN(index)) return;
    reports[index].status = 'Resolved';
    closeModal();
    applyFilters();
});

// Search input
searchInput.addEventListener('input', applyFilters);

// Type filter
typeFilter.addEventListener('change', function() {
    currentTypeFilter = this.value;
    applyFilters();
});

// ===== CUSTOM DROPDOWN WITH AUTO-FLIP =====
const trigger = document.getElementById('statusTrigger');
const menu = document.getElementById('statusMenu');
const label = document.getElementById('statusLabel');

trigger.addEventListener('click', function(e) {
    e.stopPropagation();
    const isOpen = menu.classList.contains('open');

    if (!isOpen) {
        menu.classList.add('open');
        trigger.classList.add('open');

        // Wait a tick to let the browser render the menu
        setTimeout(() => {
            const rect = menu.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;

            // If the menu goes off the screen, flip it up
            if (spaceBelow < 0) {
                menu.classList.add('flip-up');
            } else {
                menu.classList.remove('flip-up');
            }
        }, 10);
    } else {
        menu.classList.remove('open');
        trigger.classList.remove('open');
        menu.classList.remove('flip-up');
    }
});

menu.querySelectorAll('.dropdown-option').forEach(opt => {
    opt.addEventListener('click', function() {
        menu.querySelectorAll('.dropdown-option').forEach(o => o.classList.remove('selected'));
        this.classList.add('selected');
        label.textContent = this.textContent;
        currentStatusFilter = this.dataset.value;
        menu.classList.remove('open');
        trigger.classList.remove('open');
        menu.classList.remove('flip-up');
        applyFilters();
    });
});

document.addEventListener('click', function(e) {
    if (!e.target.closest('#statusContainer')) {
        menu.classList.remove('open');
        trigger.classList.remove('open');
        menu.classList.remove('flip-up');
    }
});

// ===== SIDEBAR & HAMBURGER =====
const hamburgerBtn = document.getElementById('hamburgerBtn');
const sidebar = document.querySelector('.sidebar');
const overlay = document.getElementById('sidebarOverlay');

function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('show');
}
function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
}

hamburgerBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
});

overlay.addEventListener('click', closeSidebar);

document.querySelectorAll('.nav-item, .sub-item').forEach(item => {
    item.addEventListener('click', function() {
        if (window.innerWidth <= 768) closeSidebar();
    });
});

// ===== INIT =====
renderTable();