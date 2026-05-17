// ===== STEP NAVIGATION =====
function nextStep(step) {
    document.querySelectorAll('.form-step').forEach(el => el.style.display = 'none');
    document.getElementById('step' + step).style.display = 'block';
}
function prevStep(step) {
    document.querySelectorAll('.form-step').forEach(el => el.style.display = 'none');
    document.getElementById('step' + step).style.display = 'block';
}

// ===== SIDEBAR SUBMENU SWITCHING =====
document.querySelectorAll('.sub-item').forEach(item => {
    item.addEventListener('click', function() {
        // Reset all sub-items
        document.querySelectorAll('.sub-item').forEach(i => { i.style.fontWeight = '400'; i.style.color = '#555'; });
        this.style.fontWeight = '600';
        this.style.color = '#0d3461';

        const text = this.textContent.trim();

        // Hide all sections
        document.getElementById('createReportSection').style.display = 'none';
        document.getElementById('allIncidentSection').style.display = 'none';
        document.getElementById('scheduleSection').style.display = 'none';

        // Show correct section
        if (text === 'Create Report') {
            document.getElementById('createReportSection').style.display = 'block';
            document.getElementById('breadcrumbText').textContent = 'Blotter / Create Report';
        } else if (text === 'All Incident') {
            document.getElementById('allIncidentSection').style.display = 'block';
            document.getElementById('breadcrumbText').textContent = 'Blotter / All Incident';
        } else if (text === 'Schedules') {
            document.getElementById('scheduleSection').style.display = 'block';
            document.getElementById('breadcrumbText').textContent = 'Blotter / My Schedule';
        }
    });
});

// ===== HAMBURGER MENU =====
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

if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });
}

if (overlay) {
    overlay.addEventListener('click', closeSidebar);
}

document.querySelectorAll('.nav-item, .sub-item').forEach(item => {
    item.addEventListener('click', function() {
        if (window.innerWidth <= 768) closeSidebar();
    });
});

// ===== INITIALIZE =====
// Show Schedule by default
document.getElementById('createReportSection').style.display = 'none';
document.getElementById('allIncidentSection').style.display = 'none';
document.getElementById('scheduleSection').style.display = 'block';
document.getElementById('breadcrumbText').textContent = 'Blotter / My Schedule';

document.querySelectorAll('.sub-item').forEach(i => { i.style.fontWeight = '400'; i.style.color = '#555'; });
document.getElementById('subSchedules').style.fontWeight = '600';
document.getElementById('subSchedules').style.color = '#0d3461';

// ===== BLOTTER NUMBER SEQUENCE =====
function getNextBlotterNumber() {
    let lastNumber = parseInt(localStorage.getItem('lastBlotterNumber')) || 0;
    let nextNumber = lastNumber + 1;
    localStorage.setItem('lastBlotterNumber', nextNumber.toString());
    return 'BLT-2026-' + String(nextNumber).padStart(4, '0');
}

function getCurrentBlotterNumber() {
    let lastNumber = parseInt(localStorage.getItem('lastBlotterNumber')) || 0;
    let currentNumber = lastNumber + 1;
    return 'BLT-2026-' + String(currentNumber).padStart(4, '0');
}

// Update the "Bilang ng blotter entry" field on page load
document.addEventListener('DOMContentLoaded', function() {
    const blotterField = document.querySelector('#step1 .filter-input[readonly]');
    if (blotterField) {
        blotterField.value = getCurrentBlotterNumber();
    }
});

// ===== FILE UPLOAD MODAL =====
let pendingFileInput = null;

function openFileUploadModal(inputElement) {
    pendingFileInput = inputElement;
    document.getElementById('fileUploadModal').style.display = 'flex';
}

function closeFileUploadModal() {
    document.getElementById('fileUploadModal').style.display = 'none';
    pendingFileInput = null;
}

document.getElementById('browseFileBtn').addEventListener('click', function() {
    if (pendingFileInput) {
        pendingFileInput.click();
    }
});

document.getElementById('browseFileInput').addEventListener('change', function(e) {
    if (this.files.length > 0 && pendingFileInput) {
        const dt = new DataTransfer();
        for (let file of this.files) {
            dt.items.add(file);
        }
        pendingFileInput.files = dt.files;
        const changeEvent = new Event('change', { bubbles: true });
        pendingFileInput.dispatchEvent(changeEvent);
        closeFileUploadModal();
        setTimeout(() => {
            document.getElementById('uploadSuccessModal').style.display = 'flex';
        }, 300);
    }
});

// ===== SIGNATURE UPLOAD =====
document.getElementById('uploadSignatureBtn').addEventListener('click', function() {
    const input = document.getElementById('signatureUpload');
    openFileUploadModal(input);
});

document.getElementById('signatureUpload').addEventListener('change', function(e) {
    const file = this.files[0];
    if (file) {
        document.getElementById('signatureFileDisplay').value = file.name;
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('signaturePreview');
            preview.src = e.target.result;
            document.getElementById('signaturePreviewContainer').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

// ===== EVIDENCE UPLOAD =====
document.getElementById('uploadEvidenceBtn').addEventListener('click', function() {
    const input = document.getElementById('evidenceUpload');
    openFileUploadModal(input);
});

document.getElementById('evidenceUpload').addEventListener('change', function(e) {
    const files = this.files;
    if (files.length > 0) {
        document.getElementById('evidenceFileDisplay').value = files.length + ' file(s) selected';
        setTimeout(() => {
            document.getElementById('uploadSuccessModal').style.display = 'flex';
        }, 300);
    }
});

// ===== UPLOAD SUCCESS MODAL =====
function closeUploadSuccessModal() {
    document.getElementById('uploadSuccessModal').style.display = 'none';
}

// ===== DISCARD CONFIRMATION =====
document.getElementById('cancelReportBtn').addEventListener('click', function() {
    const hasData = document.querySelectorAll('#step1 input:not([readonly]), #step2 input, #step2 textarea, #step3 input').length > 0;
    const hasFile = document.getElementById('signatureFileDisplay').value !== 'No file chosen' || 
                     document.getElementById('evidenceFileDisplay').value !== 'No file chosen';
    if (hasData || hasFile) {
        document.getElementById('discardModal').style.display = 'flex';
    } else {
        if (confirm('Cancel report?')) {
            resetForm();
        }
    }
});

function closeDiscardModal() {
    document.getElementById('discardModal').style.display = 'none';
}

function confirmDiscard() {
    document.getElementById('discardModal').style.display = 'none';
    resetForm();
}

function resetForm() {
    document.querySelectorAll('.form-step').forEach(el => el.style.display = 'none');
    document.getElementById('step1').style.display = 'block';
    document.getElementById('signaturePreviewContainer').style.display = 'none';
    document.getElementById('signaturePreview').src = '';
    document.getElementById('signatureFileDisplay').value = 'No file chosen';
    document.getElementById('evidenceFileDisplay').value = 'No file chosen';
    document.getElementById('signatureUpload').value = '';
    document.getElementById('evidenceUpload').value = '';
    document.getElementById('browseFileInput').value = '';
    const blotterField = document.querySelector('#step1 .filter-input[readonly]');
    if (blotterField) {
        blotterField.value = getCurrentBlotterNumber();
    }
}

// ===== SUBMIT SUCCESS =====
document.getElementById('submitReportBtn').addEventListener('click', function() {
    const refNum = getNextBlotterNumber();
    document.getElementById('referenceNumberDisplay').textContent = refNum;
    document.getElementById('submitSuccessModal').style.display = 'flex';
});

function closeSubmitSuccessModal() {
    document.getElementById('submitSuccessModal').style.display = 'none';
    resetForm();
}

// ===== CLOSE MODALS ON OUTSIDE CLICK =====
document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.style.display = 'none';
        }
    });
});