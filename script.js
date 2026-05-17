// ===== DATA =====
let reports = [
    { id: "BLT-2026-0003", date: "2026-04-30", type: "Theft", complainant: "Juan Delacruz", location: "Alley II", status: "Investigating" },
    { id: "BLT-2026-0004", date: "2026-04-27", type: "Loss Item", complainant: "Juan Delacruz", location: "Alley II", status: "Pending" },
    { id: "BLT-2026-0005", date: "2026-04-30", type: "Violence", complainant: "Juan Delacruz", location: "Alley II", status: "Pending" }
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
                    <!-- ===== THREE DOT DROPDOWN ===== -->
                    <div class="action-dropdown-wrapper">
                        <span class="action-dropdown-trigger" data-index="${index}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                                <circle cx="12" cy="12" r="2" />
                                <circle cx="19" cy="12" r="2" />
                                <circle cx="5" cy="12" r="2" />
                            </svg>
                        </span>
                        <div class="action-dropdown-menu">
                            <div class="action-dropdown-item view-detail-item" data-index="${index}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                                View Details
                            </div>
                        </div>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Attach event listeners for edit icons
    document.querySelectorAll('.edit-icon').forEach(icon => {
        icon.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            openEditModal(index);
        });
    });

    // Attach event listeners for delete icons
    document.querySelectorAll('.delete-icon').forEach(icon => {
        icon.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            if (confirm('Are you sure you want to delete this record?')) {
                reports.splice(index, 1);
                applyFilters();
            }
        });
    });

    // Attach event listeners for three-dot triggers
    document.querySelectorAll('.action-dropdown-trigger').forEach(trigger => {
        trigger.addEventListener('click', function(e) {
            e.stopPropagation();
            const menu = this.nextElementSibling;
            const isOpen = menu.classList.contains('show');
            // Close all other menus
            document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));
            if (!isOpen) {
                menu.classList.add('show');
            }
        });
    });

    // Attach event listeners for view detail items
    document.querySelectorAll('.view-detail-item').forEach(item => {
        item.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            // Close dropdown
            this.closest('.action-dropdown-menu').classList.remove('show');
            openDetailModal(index);
        });
    });

    // Close dropdowns when clicking elsewhere
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.action-dropdown-wrapper')) {
            document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));
        }
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

// ===== OPEN EDIT MODAL =====
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

// ===== CLOSE EDIT MODAL =====
function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

// ===== OPEN DETAIL MODAL =====
function openDetailModal(index) {
    const report = reports[index];
    if (!report) return;

    document.getElementById('detailIncidentId').textContent = report.id;
    document.getElementById('detailDate').textContent = formatDate(report.date);
    document.getElementById('detailType').textContent = report.type;
    document.getElementById('detailComplainant').textContent = report.complainant;
    document.getElementById('detailLocation').textContent = report.location;
    
    const statusBadge = document.getElementById('detailStatus');
    const statusClass = report.status === 'Investigating' ? 'badge-inv' :
                        report.status === 'Resolved' ? 'badge-res' : 'badge-pend';
    statusBadge.className = `badge ${statusClass}`;
    statusBadge.textContent = report.status;

    document.getElementById('detailDescription').textContent = report.description || 'No description provided.';

    const sigImg = document.getElementById('detailSignatureImg');
    const sigNone = document.getElementById('detailSignatureNone');
    if (report.signature) {
        sigImg.src = report.signature;
        sigImg.style.display = 'block';
        sigNone.style.display = 'none';
    } else {
        sigImg.style.display = 'none';
        sigNone.style.display = 'block';
    }

    const evidenceList = document.getElementById('detailEvidenceList');
    const evidenceNone = document.getElementById('detailEvidenceNone');
    evidenceList.innerHTML = '';
    if (report.evidence && report.evidence.length > 0) {
        report.evidence.forEach(file => {
            const li = document.createElement('li');
            li.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" style="color:#666;">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                </svg>
                <span style="font-size:13px;color:#333;">${file}</span>
            `;
            evidenceList.appendChild(li);
        });
        evidenceList.style.display = 'block';
        evidenceNone.style.display = 'none';
    } else {
        evidenceList.style.display = 'none';
        evidenceNone.style.display = 'block';
    }

    document.getElementById('detailModal').style.display = 'flex';
}

// ===== CLOSE DETAIL MODAL =====
function closeDetailModal() {
    document.getElementById('detailModal').style.display = 'none';
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

// Close edit modal
document.getElementById('closeModalBtn').addEventListener('click', closeModal);
document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
document.getElementById('editModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

// Close detail modal
document.getElementById('closeDetailModalBtn').addEventListener('click', closeDetailModal);
document.getElementById('detailCloseBtn').addEventListener('click', closeDetailModal);
document.getElementById('detailModal').addEventListener('click', function(e) {
    if (e.target === this) closeDetailModal();
});

// Update button in edit modal
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

// Modal status badge click (edit modal)
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