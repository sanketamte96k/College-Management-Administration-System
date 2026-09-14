// ============================================================
// STUDENT RECORDS - VIEW.JS
// ============================================================

// Global array of students loaded from Flask REST API
let students = [];

// ============================================================
// HTML ESCAPE HELPER
// ============================================================

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ============================================================
// DOM ELEMENTS
// ============================================================

const tbody = document.getElementById("studentTableBody");
const searchInput = document.getElementById("searchInput");

const viewModal = document.getElementById("viewModal");
const modalDetails = document.getElementById("modalDetails");
const closeModal = document.getElementById("closeModal");
const closeModalFooter = document.getElementById("closeModalFooter");

const statusFilter = document.getElementById("statusFilter");
const deptFilter = document.getElementById("deptFilter");
const admissionTypeFilter = document.getElementById("admissionTypeFilter");
const genderFilter = document.getElementById("genderFilter");


// ============================================================
// FETCH ALL STUDENTS
// ============================================================

function fetchStudents() {

    fetch("/api/students")
        .then(response => {

            if (!response.ok) {
                throw new Error("Failed to fetch records from server");
            }

            return response.json();
        })

        .then(data => {

            console.log("Students API response:", data);

            /*
             * Backend supports two response formats:
             *
             * 1. Array:
             *    [student1, student2, ...]
             *
             * 2. Object:
             *    {
             *       students: [...],
             *       total: ...
             *    }
             *
             * Handle both safely.
             */

            if (Array.isArray(data)) {
                students = data;
            }
            else if (data && Array.isArray(data.students)) {
                students = data.students;
            }
            else {
                students = [];
            }

            console.log("Students loaded:", students.length);

            renderStudents();
            updateDashboard();
        })

        .catch(err => {

            console.error("API Fetch Error:", err);

            students = [];

            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="empty-state">
                            <div class="empty-icon">⚠️</div>
                            <p>Unable to load student records.</p>
                        </td>
                    </tr>
                `;
            }
        });
}


// ============================================================
// RENDER STUDENTS
// ============================================================

function renderStudents() {

    if (!tbody) {
        console.error("studentTableBody element not found.");
        return;
    }

    tbody.innerHTML = "";

    const nameQuery =
        searchInput
            ? searchInput.value.toLowerCase().trim()
            : "";

    const statusVal =
        statusFilter
            ? statusFilter.value.trim()
            : "";

    const deptVal =
        deptFilter
            ? deptFilter.value.trim()
            : "";

    const typeVal =
        admissionTypeFilter
            ? admissionTypeFilter.value.trim()
            : "";

    const genderVal =
        genderFilter
            ? genderFilter.value.trim()
            : "";


    // ========================================================
    // FILTER STUDENTS
    // ========================================================

    const filteredStudents = students.filter(student => {

        const matchesName =
            (student.fullName || "")
                .toLowerCase()
                .includes(nameQuery);

        const matchesStatus =
            !statusVal ||
            (student.status === statusVal) ||
            (!student.status && statusVal === "Pending Verification");

        const matchesDept =
            !deptVal ||
            student.department === deptVal;

        const matchesType =
            !typeVal ||
            student.admissionType === typeVal;

        const matchesGender =
            !genderVal ||
            student.gender === genderVal;

        return (
            matchesName &&
            matchesStatus &&
            matchesDept &&
            matchesType &&
            matchesGender
        );
    });


    // ========================================================
    // EMPTY STATE
    // ========================================================

    if (filteredStudents.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">

                    <div class="empty-icon">
                        📂
                    </div>

                    <p>
                        No matching student records found.
                    </p>

                </td>
            </tr>
        `;

        return;
    }


    // ========================================================
    // RENDER TABLE ROWS
    // ========================================================

    filteredStudents.forEach((student, index) => {

        const studentId = Number(student.id);

        let statusBadgeClass = "badge-status-pending";
        let statusIcon = "⌛";
        const currentStatus = student.status || "Pending Verification";

        if (currentStatus === "Verified") {
            statusBadgeClass = "badge-status-verified";
            statusIcon = "✅";
        } else if (currentStatus === "Under Review") {
            statusBadgeClass = "badge-status-review";
            statusIcon = "🔍";
        } else if (currentStatus === "Rejected") {
            statusBadgeClass = "badge-status-rejected";
            statusIcon = "❌";
        }

        const tr = document.createElement("tr");

        tr.innerHTML = `

            <td>
                ${index + 1}
            </td>

            <td>
                <strong>
                    ${escapeHtml(student.fullName)}
                </strong>
            </td>

            <td>
                ${escapeHtml(student.department)}
            </td>

            <td>
                ${escapeHtml(student.mobile)}
            </td>

            <td>
                ${escapeHtml(student.email)}
            </td>

            <td>
                <span class="badge badge-academic">
                    ${escapeHtml(student.percentage12)}%
                </span>
            </td>

            <td>
                <span class="badge badge-score">
                    ${escapeHtml(student.entranceScore)}
                </span>
            </td>

            <td>
                <span class="badge-status ${statusBadgeClass}">
                    <span>${statusIcon}</span>
                    <span>${escapeHtml(currentStatus)}</span>
                </span>
            </td>

            <td class="action-cell">

                <button
                    class="btn btn-view"
                    onclick="openViewModal(${studentId})"
                    title="View Details">
                    👁 View
                </button>

                <button
                    class="btn btn-edit"
                    onclick="editStudent(${studentId})"
                    title="Edit Record">
                    ✏ Edit
                </button>

                <button
                    class="btn btn-download"
                    onclick="downloadPDF(${studentId})"
                    title="Download Admission Form PDF">
                    📥 Download PDF
                </button>

                <button
                    class="btn btn-delete"
                    onclick="deleteStudent(${studentId})"
                    title="Delete Record">
                    🗑 Delete
                </button>

            </td>
        `;

        tbody.appendChild(tr);
    });
}


// ============================================================
// FILTER EVENTS
// ============================================================

[
    searchInput,
    statusFilter,
    deptFilter,
    admissionTypeFilter,
    genderFilter
].forEach(element => {

    if (!element) {
        return;
    }

    element.addEventListener("input", renderStudents);
    element.addEventListener("change", renderStudents);

});


// ============================================================
// OPEN VIEW MODAL
// ============================================================

function openViewModal(studentId) {

    if (!viewModal || !modalDetails) {
        console.error("View modal elements not found.");
        return;
    }

    modalDetails.innerHTML = `

        <div style="
            text-align:center;
            padding:40px;
            color:#64748b;
        ">

            ⌛ Loading student details...

        </div>
    `;

    viewModal.style.display = "flex";


    fetch(`/api/students/${studentId}`)

        .then(response => {

            if (!response.ok) {
                throw new Error(
                    "Failed to fetch student details"
                );
            }

            return response.json();
        })

        .then(student => {

            console.log(
                "Student details:",
                student
            );

            populateViewModal(student);

        })

        .catch(err => {

            console.error(
                "Error fetching student details:",
                err
            );

            const cachedStudent =
                students.find(
                    s => Number(s.id) === Number(studentId)
                );

            if (cachedStudent) {

                populateViewModal(cachedStudent);

            }
            else {

                modalDetails.innerHTML = `

                    <div style="
                        color:#ef4444;
                        padding:20px;
                    ">

                        ⚠️ Error loading student record.

                    </div>

                `;
            }
        });
}


// ============================================================
// POPULATE VIEW MODAL
// ============================================================

function renderDocumentCard(label, filename, icon = "📄") {
    if (!filename) {
        return `
            <div class="document-item-card">
                <div class="document-item-header">
                    <span>${icon}</span>
                    <span>${escapeHtml(label)}</span>
                </div>
                <span class="doc-btn doc-btn-disabled">Document Not Uploaded</span>
            </div>
        `;
    }

    const fileUrl = `/uploads/${encodeURIComponent(filename)}`;
    return `
        <div class="document-item-card">
            <div class="document-item-header">
                <span>${icon}</span>
                <span>${escapeHtml(label)}</span>
            </div>
            <div class="doc-btn-group">
                <a href="${fileUrl}" target="_blank" class="doc-action-btn btn-doc-preview" title="Preview Document">
                    👁 Preview
                </a>
                <a href="${fileUrl}" target="_blank" class="doc-action-btn btn-doc-open" title="Open in New Tab">
                    ↗ Open
                </a>
                <a href="${fileUrl}" download="${escapeHtml(filename)}" class="doc-action-btn btn-doc-download" title="Download File">
                    📥 Download
                </a>
            </div>
        </div>
    `;
}

function handleModalStatusChange() {
    const statusSelect = document.getElementById("modalVerificationStatus");
    const requiredTag = document.getElementById("remarksRequiredTag");
    if (statusSelect && requiredTag) {
        requiredTag.style.display = (statusSelect.value === "Rejected") ? "inline" : "none";
    }
}

async function saveVerificationDecision(studentId) {
    const statusSelect = document.getElementById("modalVerificationStatus");
    const remarksTextarea = document.getElementById("modalVerificationRemarks");
    const saveBtn = document.getElementById("saveVerificationBtn");

    if (!statusSelect) return;

    const newStatus = statusSelect.value;
    const remarks = remarksTextarea ? remarksTextarea.value.trim() : "";

    if (newStatus === "Rejected" && !remarks) {
        showToast("Please provide verification remarks explaining the reason for rejection.", "error");
        if (remarksTextarea) remarksTextarea.focus();
        return;
    }

    try {
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = "Saving Decision...";
        }

        const endpoint = `/api/students/${studentId}/verification`;
        const response = await fetch(endpoint, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                status: newStatus,
                admissionStatus: newStatus,
                remarks: remarks,
                verificationRemarks: remarks
            })
        });

        const contentType = response.headers.get("content-type") || "";
        let data = {};

        if (contentType.includes("application/json")) {
            data = await response.json();
        } else {
            const text = await response.text();
            throw new Error(
                `Server returned non-JSON response (${response.status}): ${text.substring(0, 150)}`
            );
        }

        if (!response.ok) {
            if (response.status === 401) {
                showToast("Session expired. Redirecting to admin login...", "error");
                setTimeout(() => { window.location.href = "login.html"; }, 1500);
                return;
            }
            throw new Error(
                data.error ||
                data.message ||
                `Request failed with status ${response.status}`
            );
        }

        let toastMsg = data.message || `Admission status updated to '${newStatus}' successfully.`;
        if (data.email_status === "sent") {
            toastMsg += " Notification email sent to student.";
        } else if (data.email_status === "failed") {
            toastMsg += " (Note: Notification email could not be delivered)";
        }

        showToast(toastMsg, "success");

        // Update local student in students array
        const localStudent = students.find(s => Number(s.id) === Number(studentId));
        if (localStudent && data.student) {
            Object.assign(localStudent, data.student);
        }

        // Re-render table rows
        renderStudents();

        // Update dashboard metrics
        updateDashboard();

        // Refresh single student details in modal
        if (data.student) {
            populateViewModal(data.student);
        }

    } catch (err) {
        console.error("Verification save error:", err);
        let errorMsg = err.message || "Unknown error";
        if (err.name === "TypeError" && errorMsg.toLowerCase().includes("fetch")) {
            errorMsg = "Network connection error: Unable to reach backend server. Please verify Flask server is running.";
        }
        showToast("Failed to save verification decision: " + errorMsg, "error");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "💾 Save Verification Decision";
        }
    }
}

function populateViewModal(student) {
    const currentStatus = student.status || "Pending Verification";

    const photoHtml = student.photo
        ? `
            <div class="passport-photo-wrapper">
                <img
                    src="/uploads/${escapeHtml(student.photo)}"
                    alt="Passport Photo"
                    class="passport-photo-img"
                >
            </div>
          `
        : `
            <div class="passport-photo-wrapper">
                <span class="passport-photo-placeholder">
                    👤
                </span>
            </div>
          `;

    const photoCard = renderDocumentCard("Passport Photo", student.photo, "🖼️");
    const marksheet10Card = renderDocumentCard("10th Marksheet", student.marksheet10, "📄");
    const marksheet12Card = renderDocumentCard("12th Marksheet", student.marksheet12, "📄");
    const lcCard = renderDocumentCard("Leaving Certificate", student.leavingCertificate, "📜");

    modalDetails.innerHTML = `
        <!-- APPLICATION & VERIFICATION WORKFLOW CARD -->
        <div class="verification-decision-card">
            <div class="verification-decision-header">
                <h4>📋 Application Details & Verification Decision</h4>
                <div class="verification-meta">
                    <span>App ID: <strong>#${student.id}</strong></span> |
                    <span>Date: ${escapeHtml(student.created_at || "N/A")}</span>
                    ${student.verified_by ? ` | <span>Verified By: <strong>${escapeHtml(student.verified_by)}</strong> (${escapeHtml(student.verified_at || '')})</span>` : ''}
                </div>
            </div>

            <div class="verification-form-grid">
                <div class="verification-input-group">
                    <label for="modalVerificationStatus">Admission Status:</label>
                    <select id="modalVerificationStatus" class="verification-status-select" onchange="handleModalStatusChange()">
                        <option value="Pending Verification" ${currentStatus === "Pending Verification" ? "selected" : ""}>⌛ Pending Verification</option>
                        <option value="Under Review" ${currentStatus === "Under Review" ? "selected" : ""}>🔍 Under Review</option>
                        <option value="Verified" ${currentStatus === "Verified" ? "selected" : ""}>✅ Verified / Approved</option>
                        <option value="Rejected" ${currentStatus === "Rejected" ? "selected" : ""}>❌ Rejected</option>
                    </select>
                </div>

                <div class="verification-input-group">
                    <label for="modalVerificationRemarks">
                        Verification Remarks:
                        <span id="remarksRequiredTag" style="display:${currentStatus === 'Rejected' ? 'inline' : 'none'}; color:#dc2626; font-size:12px;">(Required for Rejection)</span>
                    </label>
                    <textarea id="modalVerificationRemarks" class="verification-remarks-textarea" placeholder="Enter verification notes, document inspection remarks, or rejection reason...">${escapeHtml(student.verification_remarks || "")}</textarea>
                </div>
            </div>

            <div style="display: flex; justify-content: flex-end; margin-top: 12px;">
                <button id="saveVerificationBtn" class="verification-btn-save" onclick="saveVerificationDecision(${student.id})">
                    💾 Save Verification Decision
                </button>
            </div>
        </div>

        <div class="modal-profile-card">
            ${photoHtml}
            <div class="modal-profile-info">
                <h3>${escapeHtml(student.fullName)}</h3>
                ${(student.zprn || student.enrollment_number) ? `
                    <div style="margin:4px 0 6px 0; font-size:13px; font-weight:800; color:#2563EB; font-family:monospace; background:#EFF6FF; border:1px solid #BFDBFE; display:inline-block; padding:4px 12px; border-radius:6px;">
                        🆔 ZPRN: ${escapeHtml(student.zprn || student.enrollment_number)}
                    </div>
                ` : ''}
                <p>🎓 ${escapeHtml(student.department)} | ${escapeHtml(student.admissionType)} Admission</p>
                <p>📧 ${escapeHtml(student.email)} | 📱 ${escapeHtml(student.mobile)}</p>
            </div>
        </div>

        <div class="detail-section">
            <h4>👤 Personal Information</h4>
            <div class="detail-grid">
                <div><strong>Full Name:</strong> ${escapeHtml(student.fullName)}</div>
                <div><strong>Father's Name:</strong> ${escapeHtml(student.fatherName)}</div>
                <div><strong>Mother's Name:</strong> ${escapeHtml(student.motherName)}</div>
                <div><strong>Date of Birth:</strong> ${escapeHtml(student.dob)}</div>
                <div><strong>Gender:</strong> ${escapeHtml(student.gender)}</div>
                <div><strong>Blood Group:</strong> ${escapeHtml(student.bloodGroup)}</div>
            </div>
        </div>

        <div class="detail-section">
            <h4>📞 Contact Information</h4>
            <div class="detail-grid">
                <div><strong>Mobile:</strong> ${escapeHtml(student.mobile)}</div>
                <div><strong>Alt Mobile:</strong> ${escapeHtml(student.altMobile || "N/A")}</div>
                <div><strong>Email:</strong> ${escapeHtml(student.email)}</div>
                <div><strong>Aadhaar:</strong> ${escapeHtml(student.aadhaar)}</div>
                <div><strong>Address:</strong> ${escapeHtml(student.address)}</div>
                <div><strong>City:</strong> ${escapeHtml(student.city)}</div>
                <div><strong>State:</strong> ${escapeHtml(student.state)}</div>
                <div><strong>Pincode:</strong> ${escapeHtml(student.pincode)}</div>
                <div><strong>Nationality:</strong> ${escapeHtml(student.nationality)}</div>
            </div>
        </div>

        <div class="detail-section">
            <h4>🎓 Academic Information</h4>
            <div class="detail-grid">
                <div><strong>10th Board:</strong> ${escapeHtml(student.board10)}</div>
                <div><strong>10th Percentage:</strong> ${escapeHtml(student.percentage10)}%</div>
                <div><strong>12th Board:</strong> ${escapeHtml(student.board12)}</div>
                <div><strong>12th Percentage:</strong> ${escapeHtml(student.percentage12)}%</div>
                <div><strong>Entrance Exam:</strong> ${escapeHtml(student.entranceExam)}</div>
                <div><strong>Entrance Score:</strong> ${escapeHtml(student.entranceScore)}</div>
            </div>
        </div>

        <div class="detail-section">
            <h4>📚 Course & Admission Information</h4>
            <div class="detail-grid">
                <div><strong>ZPRN Number:</strong> <strong style="font-family:monospace; color:#2563EB;">${escapeHtml(student.zprn || student.enrollment_number || "Not Assigned (Pending Enrollment)")}</strong></div>
                <div><strong>Department:</strong> ${escapeHtml(student.department)}</div>
                <div><strong>Admission Type:</strong> ${escapeHtml(student.admissionType)}</div>
                <div><strong>Application Status:</strong> <strong>${escapeHtml(currentStatus)}</strong></div>
            </div>
        </div>

        <div class="detail-section">
            <h4>📁 Uploaded Documents</h4>
            <div class="document-grid">
                ${photoCard}
                ${marksheet10Card}
                ${marksheet12Card}
                ${lcCard}
            </div>
        </div>

        <!-- FEES & PAYMENT MANAGEMENT SECTION IN MODAL -->
        <div class="fee-management-card" style="margin-top: 20px;">
            <div class="fee-card-header">
                <h4>💳 Fees & Payment Management</h4>
                <span id="modalFeeStatusBadge" class="fee-badge fee-badge-pending">🔴 Pending</span>
            </div>

            <!-- KPI Tiles -->
            <div class="fee-kpi-grid">
                <div class="fee-kpi-tile kpi-total">
                    <div class="kpi-label">Total Fee</div>
                    <div class="kpi-value" id="mTotalFee">₹ 0</div>
                </div>
                <div class="fee-kpi-tile kpi-paid">
                    <div class="kpi-label">Amount Paid</div>
                    <div class="kpi-value" id="mPaidAmount">₹ 0</div>
                </div>
                <div class="fee-kpi-tile kpi-pending">
                    <div class="kpi-label">Pending Dues</div>
                    <div class="kpi-value" id="mPendingAmount">₹ 0</div>
                </div>
                <div class="fee-kpi-tile kpi-status">
                    <div class="kpi-label">Status</div>
                    <div class="kpi-value" id="mFeeStatusText" style="font-size: 15px; color: #8b5cf6;">Pending</div>
                </div>
            </div>

            <!-- Fee Breakdown Pills -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 15px;">
                <strong style="color: #1e3a8a; font-size: 12px;">Fee Breakdown:</strong>
                <div id="mFeeBreakdownPills" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                    <!-- Breakdown items -->
                </div>
            </div>

            <!-- Record Payment Form -->
            <div class="record-payment-card">
                <h5 style="margin: 0 0 12px 0; color: #1e3a8a; font-size: 14px;">➕ Record Student Fee Payment</h5>
                <form id="recordPaymentForm" onsubmit="event.preventDefault(); recordStudentPayment(${student.id});">
                    <div class="record-payment-grid">
                        <div class="pay-input-group">
                            <label for="adminPayAmount">Amount (₹) *</label>
                            <input type="number" id="adminPayAmount" placeholder="e.g. 25000" min="1" step="0.01" required>
                        </div>
                        <div class="pay-input-group">
                            <label for="adminPayFeeType">Fee Category *</label>
                            <select id="adminPayFeeType" required>
                                <option value="Tuition Fee">Tuition Fee</option>
                                <option value="Development Fee">Development Fee</option>
                                <option value="Examination Fee">Examination Fee</option>
                                <option value="Library Fee">Library Fee</option>
                                <option value="Laboratory Fee">Laboratory Fee</option>
                                <option value="Other Fee">Other Fee</option>
                            </select>
                        </div>
                        <div class="pay-input-group">
                            <label for="adminPayMethod">Payment Method *</label>
                            <select id="adminPayMethod" required>
                                <option value="UPI">UPI</option>
                                <option value="Cash">Cash</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Online Payment">Online Payment</option>
                                <option value="Demand Draft">Demand Draft</option>
                            </select>
                        </div>
                        <div class="pay-input-group">
                            <label for="adminPayTxnId">Transaction / Ref ID (Optional)</label>
                            <input type="text" id="adminPayTxnId" placeholder="Auto-generated if empty">
                        </div>
                    </div>
                    <div class="pay-input-group" style="margin-top: 10px;">
                        <label for="adminPayRemarks">Remarks / Notes</label>
                        <input type="text" id="adminPayRemarks" placeholder="Optional payment remarks, receipt notes...">
                    </div>
                    <div style="display: flex; justify-content: flex-end; margin-top: 12px;">
                        <button type="submit" id="adminPaySubmitBtn" class="btn-record-payment">
                            💳 Record Payment
                        </button>
                    </div>
                </form>
            </div>

            <!-- Payment History in Modal -->
            <h5 style="color: #1e3a8a; font-size: 14px; margin: 18px 0 10px 0;">📜 Payment Transactions History</h5>
            <div class="fee-table-wrapper">
                <table class="fee-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Fee Category</th>
                            <th>Amount</th>
                            <th>Method</th>
                            <th>Txn ID</th>
                            <th>Status</th>
                            <th>Recorded By</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="mPaymentHistoryBody">
                        <tr>
                            <td colspan="8" style="text-align: center; color: #64748b; padding: 14px;">Loading payment history...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    viewModal.style.display = "flex";
    loadStudentModalFees(student.id, student.fullName);
}


// ============================================================
// EDIT STUDENT
// ============================================================

function editStudent(studentId) {

    window.location.href =
        `index.html?edit=${studentId}`;
}


// ============================================================
// GET IMAGE DATA URL
// ============================================================

function getImageDataUrl(url) {

    return new Promise(resolve => {

        const img = new Image();

        img.crossOrigin = "Anonymous";

        img.onload = function () {

            try {

                const canvas =
                    document.createElement("canvas");

                canvas.width = img.width;
                canvas.height = img.height;

                const ctx =
                    canvas.getContext("2d");

                ctx.drawImage(img, 0, 0);

                const dataURL =
                    canvas.toDataURL("image/jpeg");

                resolve(dataURL);

            }
            catch (error) {

                console.error(
                    "Image conversion error:",
                    error
                );

                resolve(null);
            }
        };


        img.onerror = function () {

            resolve(null);

        };


        img.src = url;
    });
}


// ============================================================
// DOWNLOAD PDF
// ============================================================

async function downloadPDF(studentId) {

    const student =
        students.find(
            s => Number(s.id) === Number(studentId)
        );

    if (!student) {

        showToast(
            "Student record not found.",
            "error"
        );

        return;
    }


    if (
        !window.jspdf ||
        !window.jspdf.jsPDF
    ) {

        showToast(
            "jsPDF library failed to load. Please check internet connection.",
            "error"
        );

        return;
    }


    const { jsPDF } =
        window.jspdf;


    const doc = new jsPDF({

        orientation: "p",
        unit: "mm",
        format: "a4"

    });


    // ========================================================
    // PAGE BORDER
    // ========================================================

    doc.setDrawColor(
        30,
        58,
        138
    );

    doc.setLineWidth(0.8);

    doc.rect(
        6,
        6,
        198,
        285
    );


    doc.setDrawColor(
        203,
        213,
        225
    );

    doc.setLineWidth(0.3);

    doc.rect(
        7.5,
        7.5,
        195,
        282
    );


    // ========================================================
    // HEADER
    // ========================================================

    doc.setFillColor(
        30,
        58,
        138
    );

    doc.rect(
        8,
        8,
        194,
        28,
        "F"
    );


    doc.setFillColor(
        255,
        255,
        255
    );

    doc.circle(
        20,
        22,
        9,
        "F"
    );


    doc.setFontSize(14);

    doc.setTextColor(
        30,
        58,
        138
    );

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.text(
        "Z",
        18.5,
        26.5
    );


    doc.setTextColor(
        255,
        255,
        255
    );

    doc.setFontSize(16);

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.text(
        "ZEAL COLLEGE OF ENGINEERING",
        34,
        19
    );


    doc.setFontSize(10);

    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.text(
        "Online Admission System & Student Record",
        34,
        26
    );


    // ========================================================
    // APPLICATION INFO
    // ========================================================

    doc.setFillColor(
        241,
        245,
        249
    );

    doc.rect(
        8,
        36,
        194,
        10,
        "F"
    );


    doc.setFontSize(9);

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setTextColor(
        30,
        58,
        138
    );

    doc.text(
        `Application ID: #${student.id}`,
        12,
        42.5
    );


    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setTextColor(
        71,
        85,
        105
    );

    doc.text(
        `Date of Application: ${student.created_at ||
        new Date().toISOString().slice(0, 10)
        }`,
        130,
        42.5
    );


    // ========================================================
    // PASSPORT PHOTO
    // ========================================================

    let photoLoaded = false;

    if (student.photo) {

        const photoUrl =
            `/uploads/${student.photo}`;

        const photoDataUrl =
            await getImageDataUrl(photoUrl);

        if (photoDataUrl) {

            try {

                doc.setDrawColor(
                    30,
                    58,
                    138
                );

                doc.setLineWidth(0.5);

                doc.rect(
                    162,
                    50,
                    30,
                    36
                );

                doc.addImage(
                    photoDataUrl,
                    "JPEG",
                    162.5,
                    50.5,
                    29,
                    35
                );

                photoLoaded = true;

            }
            catch (error) {

                photoLoaded = false;

            }
        }
    }


    if (!photoLoaded) {

        doc.setDrawColor(
            148,
            163,
            184
        );

        doc.setLineWidth(0.4);

        doc.rect(
            162,
            50,
            30,
            36
        );

        doc.setFillColor(
            248,
            250,
            252
        );

        doc.rect(
            162.5,
            50.5,
            29,
            35,
            "F"
        );

        doc.setFontSize(8);

        doc.setTextColor(
            148,
            163,
            184
        );

        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.text(
            "PASSPORT",
            170,
            66
        );

        doc.text(
            "PHOTO",
            173,
            71
        );
    }


    // ========================================================
    // SECTION RENDERER
    // ========================================================

    let y = 50;

    function renderSection(
        title,
        data,
        customWidth = 148
    ) {

        doc.setFillColor(
            30,
            58,
            138
        );

        doc.rect(
            10,
            y,
            customWidth,
            6.5,
            "F"
        );


        doc.setFontSize(9);

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.setTextColor(
            255,
            255,
            255
        );

        doc.text(
            title,
            13,
            y + 4.5
        );


        y += 9.5;


        doc.setFontSize(8.5);

        doc.setTextColor(
            51,
            65,
            85
        );


        for (
            let i = 0;
            i < data.length;
            i += 2
        ) {

            const item1 = data[i];
            const item2 = data[i + 1];


            if (item1 && item1[0]) {

                doc.setFont(
                    "helvetica",
                    "bold"
                );

                doc.text(
                    `${item1[0]}:`,
                    12,
                    y
                );

                doc.setFont(
                    "helvetica",
                    "normal"
                );

                const val1 =
                    String(
                        item1[1] || "-"
                    );

                doc.text(
                    val1,
                    44,
                    y
                );
            }


            if (item2 && item2[0]) {

                doc.setFont(
                    "helvetica",
                    "bold"
                );

                doc.text(
                    `${item2[0]}:`,
                    82,
                    y
                );

                doc.setFont(
                    "helvetica",
                    "normal"
                );

                const val2 =
                    String(
                        item2[1] || "-"
                    );

                doc.text(
                    val2,
                    114,
                    y
                );
            }


            y += 5.5;
        }


        y += 3;
    }


    // ========================================================
    // PERSONAL
    // ========================================================

    renderSection(
        "1. PERSONAL INFORMATION",
        [
            ["Full Name", student.fullName],
            ["Father's Name", student.fatherName],
            ["Mother's Name", student.motherName],
            ["Date of Birth", student.dob],
            ["Gender", student.gender],
            ["Blood Group", student.bloodGroup]
        ],
        148
    );


    y = Math.max(y, 90);


    // ========================================================
    // CONTACT
    // ========================================================

    renderSection(
        "2. CONTACT INFORMATION",
        [
            ["Mobile Number", student.mobile],
            ["Alt Mobile", student.altMobile || "N/A"],
            ["Email Address", student.email],
            ["Aadhaar Number", student.aadhaar],
            ["City", student.city],
            ["State", student.state],
            ["Pincode", student.pincode],
            ["Nationality", student.nationality],
            ["Address", student.address],
            ["", ""]
        ],
        190
    );


    // ========================================================
    // ACADEMIC
    // ========================================================

    renderSection(
        "3. ACADEMIC INFORMATION",
        [
            ["10th Board", student.board10],
            ["10th Percentage", `${student.percentage10}%`],
            ["12th Board", student.board12],
            ["12th Percentage", `${student.percentage12}%`],
            ["Entrance Exam", student.entranceExam],
            ["Entrance Score", student.entranceScore]
        ],
        190
    );


    // ========================================================
    // COURSE
    // ========================================================

    renderSection(
        "4. COURSE INFORMATION",
        [
            ["Department", student.department],
            ["Admission Type", student.admissionType]
        ],
        190
    );


    // ========================================================
    // DOCUMENT CHECKLIST
    // ========================================================

    doc.setFillColor(
        30,
        58,
        138
    );

    doc.rect(
        10,
        y,
        190,
        6.5,
        "F"
    );


    doc.setFontSize(9);

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setTextColor(
        255,
        255,
        255
    );

    doc.text(
        "5. UPLOADED DOCUMENTS CHECKLIST",
        13,
        y + 4.5
    );


    y += 9.5;

    doc.setFontSize(8.5);


    const docItems = [

        ["Passport Photo", student.photo],

        ["10th Marksheet", student.marksheet10],

        ["12th Marksheet", student.marksheet12],

        ["Leaving Certificate", student.leavingCertificate]

    ];


    for (
        let i = 0;
        i < docItems.length;
        i += 2
    ) {

        const item1 =
            docItems[i];

        const item2 =
            docItems[i + 1];


        if (item1) {

            const status1 =
                item1[1]
                    ? "[ YES ] Uploaded"
                    : "[ NO ] Not Uploaded";


            doc.setFont(
                "helvetica",
                "bold"
            );

            doc.setTextColor(
                item1[1] ? 5 : 220,
                item1[1] ? 150 : 38,
                item1[1] ? 105 : 38
            );


            doc.text(
                `${item1[0]}:`,
                12,
                y
            );


            doc.setFont(
                "helvetica",
                "normal"
            );


            doc.text(
                status1,
                48,
                y
            );
        }


        if (item2) {

            const status2 =
                item2[1]
                    ? "[ YES ] Uploaded"
                    : "[ NO ] Not Uploaded";


            doc.setFont(
                "helvetica",
                "bold"
            );


            doc.setTextColor(
                item2[1] ? 5 : 220,
                item2[1] ? 150 : 38,
                item2[1] ? 38 : 38
            );


            doc.text(
                `${item2[0]}:`,
                104,
                y
            );


            doc.setFont(
                "helvetica",
                "normal"
            );


            doc.text(
                status2,
                140,
                y
            );
        }


        y += 5.5;
    }


    y += 4;


    // ========================================================
    // DECLARATION
    // ========================================================

    doc.setDrawColor(
        203,
        213,
        225
    );

    doc.setFillColor(
        248,
        250,
        252
    );


    doc.rect(
        10,
        y,
        190,
        15,
        "F"
    );


    doc.setFontSize(8);

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setTextColor(
        30,
        58,
        138
    );


    doc.text(
        "DECLARATION:",
        13,
        y + 4.5
    );


    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setTextColor(
        71,
        85,
        105
    );


    doc.text(
        "I hereby declare that all information provided in this admission form is true, correct, and complete to the best of my knowledge.",
        13,
        y + 8.5
    );


    doc.text(
        "This official document is generated automatically by the Zeal College Admission Management Portal.",
        13,
        y + 12.5
    );


    y += 26;


    // ========================================================
    // SIGNATURE
    // ========================================================

    doc.setDrawColor(
        71,
        85,
        105
    );

    doc.setLineWidth(0.4);


    doc.line(
        20,
        y,
        75,
        y
    );


    doc.line(
        135,
        y,
        190,
        y
    );


    doc.setFontSize(9);

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setTextColor(
        30,
        58,
        138
    );


    doc.text(
        "Student Signature",
        32,
        y + 5
    );


    doc.text(
        "Admission Officer",
        148,
        y + 5
    );


    // ========================================================
    // FOOTER
    // ========================================================

    doc.setFontSize(8);

    doc.setFont(
        "helvetica",
        "italic"
    );

    doc.setTextColor(
        148,
        163,
        184
    );


    doc.text(
        "Page 1 of 1",
        12,
        286
    );


    doc.text(
        "Zeal College Admission System - Official Record",
        105,
        286,
        {
            align: "center"
        }
    );


    // ========================================================
    // SAVE PDF
    // ========================================================

    const safeName =
        (student.fullName || "Student")
            .trim()
            .replace(/\s+/g, "_");


    const fileName =
        `Admission_${safeName}.pdf`;


    doc.save(fileName);


    showToast(
        `Downloaded ${fileName}`,
        "success"
    );
}


// Global Chart.js Instances
let deptChartInstance = null;
let genderChartInstance = null;
let monthlyChartInstance = null;
let admissionTypeChartInstance = null;

// ============================================================
// UPDATE DASHBOARD (ENTERPRISE ERP ANALYTICS)
// ============================================================

function updateDashboard() {
    // 1. Dynamic Greeting & Current Date
    updateDashboardHeaderTime();

    fetch("/api/dashboard")
        .then(res => {
            if (!res.ok) {
                throw new Error("Dashboard API returned status " + res.status);
            }
            return res.json();
        })
        .then(stats => {
            console.log("Dashboard stats received:", stats);

            // ==================================================
            // 1. PRIMARY KPI TILES (TOP 6 CARDS)
            // ==================================================
            const totalCount = document.getElementById("totalCount");
            const monthCount = document.getElementById("monthCount");
            const dashTodayAttRate = document.getElementById("dashTodayAttRate");
            const dashTodayAttBar = document.getElementById("dashTodayAttBar");
            const dashPendingFees = document.getElementById("dashPendingFees");
            const dashPendingFeesBar = document.getElementById("dashPendingFeesBar");
            const dashPendingApps = document.getElementById("dashPendingApps");
            const dashPendingAppsBar = document.getElementById("dashPendingAppsBar");
            const totalDeptsCount = document.getElementById("totalDeptsCount");

            if (totalCount) totalCount.textContent = stats.total || 0;
            if (monthCount) monthCount.textContent = stats.month_admissions || stats.total || 0;

            const attRate = stats.attendance_summary ? stats.attendance_summary.attendance_rate : 100.0;
            if (dashTodayAttRate) dashTodayAttRate.textContent = `${attRate}%`;
            if (dashTodayAttBar) dashTodayAttBar.style.width = `${Math.min(100, Math.max(0, attRate))}%`;

            const pendingFeesNum = Number(stats.total_pending_fees || 0);
            if (dashPendingFees) dashPendingFees.textContent = `₹ ${pendingFeesNum.toLocaleString("en-IN")}`;
            if (dashPendingFeesBar) {
                const totalExp = Number(stats.total_fees_expected || 1);
                const pendPct = Math.min(100, Math.round((pendingFeesNum / totalExp) * 100));
                dashPendingFeesBar.style.width = `${pendPct}%`;
            }

            const pendingAppsCount = (stats.pending_count || 0) + (stats.review_count || 0);
            if (dashPendingApps) dashPendingApps.textContent = pendingAppsCount;
            if (dashPendingAppsBar) {
                const totalApps = Number(stats.total || 1);
                const appPct = Math.min(100, Math.round((pendingAppsCount / totalApps) * 100));
                dashPendingAppsBar.style.width = `${appPct}%`;
            }

            if (totalDeptsCount) totalDeptsCount.textContent = stats.total_departments || 7;

            // Department Counters
            const compCount = document.getElementById("compCount");
            const itCount = document.getElementById("itCount");
            const aidsCount = document.getElementById("aidsCount");
            if (compCount) compCount.textContent = stats.comp || 0;
            if (itCount) itCount.textContent = stats.it || 0;
            if (aidsCount) aidsCount.textContent = stats.aids || 0;

            // ==================================================
            // 2. OPERATIONS & RECONCILIATIONS
            // ==================================================
            // Fee Collection
            const expFees = document.getElementById("dashTotalFeesExpected");
            const collFees = document.getElementById("dashTotalFeesCollected");
            const pendFees = document.getElementById("dashTotalFeesPending");
            const feeRateTxt = document.getElementById("dashFeeRateText");
            const feeRateBar = document.getElementById("dashFeeRateBar");

            const totalExpected = Number(stats.total_fees_expected || 0);
            const totalCollected = Number(stats.total_fees_collected || 0);
            const feeRate = stats.fee_collection_rate !== undefined ? stats.fee_collection_rate : (totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0);

            if (expFees) expFees.textContent = `₹ ${totalExpected.toLocaleString("en-IN")}`;
            if (collFees) collFees.textContent = `₹ ${totalCollected.toLocaleString("en-IN")}`;
            if (pendFees) pendFees.textContent = `₹ ${pendingFeesNum.toLocaleString("en-IN")}`;
            if (feeRateTxt) feeRateTxt.textContent = `${feeRate}%`;
            if (feeRateBar) feeRateBar.style.width = `${Math.min(100, feeRate)}%`;

            // Attendance Overview
            const attPres = document.getElementById("dashAttPresentCount");
            const attAbs = document.getElementById("dashAttAbsentCount");
            const attMarked = document.getElementById("dashAttMarkedCount");
            const attRatePct = document.getElementById("dashAttRatePct");
            const attProgBar = document.getElementById("dashAttProgressBar");

            if (attPres) attPres.textContent = stats.attendance_summary ? stats.attendance_summary.present_today : 0;
            if (attAbs) attAbs.textContent = stats.attendance_summary ? stats.attendance_summary.absent_today : 0;
            if (attMarked) attMarked.textContent = stats.attendance_summary ? (stats.attendance_summary.marked_today || stats.total || 0) : (stats.total || 0);
            if (attRatePct) attRatePct.textContent = `${attRate}%`;
            if (attProgBar) attProgBar.style.width = `${Math.min(100, attRate)}%`;

            // Department Overview List
            renderDashboardDeptOverview(stats.department_overview || []);

            // ==================================================
            // 3. RECENT DATA TABLES
            // ==================================================
            renderDashboardRecentAdmissions(stats.recent_admissions || []);
            renderDashboardRecentPayments(stats.recent_payments || []);

            // ==================================================
            // 4. ATTENTION REQUIRED & ACTIVITY STREAM
            // ==================================================
            renderDashboardAlerts(stats.alerts || []);
            renderDashboardActivity(stats.activity || []);
            updateHeaderNotifications(stats.alerts || []);

            // ==================================================
            // 5. CHARTS (4 BALANCED MATRICES)
            // ==================================================
            if (window.Chart) {
                renderAnalyticsCharts(stats);
            }
        })
        .catch(err => {
            console.error("Error fetching dashboard analytics:", err);
            const alertBox = document.getElementById("dashAlertsList");
            if (alertBox) {
                alertBox.innerHTML = `
                    <div class="dash-alert-item danger">
                        <div class="alert-icon">⚠️</div>
                        <div class="alert-content">
                            <strong>Unable to load live dashboard analytics</strong>
                            <p>${escapeHtml(err.message || 'Please check server connection.')}</p>
                        </div>
                        <button type="button" class="btn-alert-action" onclick="updateDashboard()">Retry</button>
                    </div>
                `;
            }
        });
}

// Update Dynamic Greeting and Live Formatted Date
function updateDashboardHeaderTime() {
    const greetingEl = document.getElementById("dashGreetingText");
    const dateEl = document.getElementById("dashCurrentDate");
    const now = new Date();

    if (greetingEl) {
        const hour = now.getHours();
        if (hour < 12) {
            greetingEl.textContent = "Good morning";
        } else if (hour < 17) {
            greetingEl.textContent = "Good afternoon";
        } else {
            greetingEl.textContent = "Good evening";
        }
    }

    if (dateEl) {
        const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        dateEl.textContent = now.toLocaleDateString('en-IN', options);
    }
}

// Render Department Overview Widget
function renderDashboardDeptOverview(deptList) {
    const container = document.getElementById("dashDeptOverviewList");
    if (!container) return;

    if (!deptList || deptList.length === 0) {
        container.innerHTML = `
            <div class="dash-dept-row-item">
                <span class="dash-d-name">Computer Engineering</span>
                <span class="dash-d-meta"><strong>0</strong> students</span>
            </div>
            <div class="dash-dept-row-item">
                <span class="dash-d-name">Information Technology</span>
                <span class="dash-d-meta"><strong>0</strong> students</span>
            </div>
            <div class="dash-dept-row-item">
                <span class="dash-d-name">AI & Data Science</span>
                <span class="dash-d-meta"><strong>0</strong> students</span>
            </div>
        `;
        return;
    }

    container.innerHTML = deptList.slice(0, 5).map(d => `
        <div class="dash-dept-row-item">
            <span class="dash-d-name">${escapeHtml(d.name)}</span>
            <span class="dash-d-meta"><strong>${d.students_count || 0}</strong> students (${d.attendance_rate || 100}% att)</span>
        </div>
    `).join("");
}

// Render Recent Admissions Mini Table
function renderDashboardRecentAdmissions(admissions) {
    const tbody = document.getElementById("dashRecentAdmissionsBody");
    if (!tbody) return;

    if (!admissions || admissions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty-cell">No recent student admissions recorded.</td></tr>`;
        return;
    }

    tbody.innerHTML = admissions.slice(0, 6).map(s => {
        const status = s.status || "Pending Verification";
        let statusBadge = `<span class="att-status-pill pill-amber">⌛ Pending</span>`;
        if (status === "Verified") {
            statusBadge = `<span class="att-status-pill pill-green">✓ Verified</span>`;
        } else if (status === "Under Review") {
            statusBadge = `<span class="att-status-pill pill-blue">🔍 Review</span>`;
        } else if (status === "Rejected") {
            statusBadge = `<span class="att-status-pill pill-red">✕ Rejected</span>`;
        }

        const initials = (s.fullName || "Student").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

        return `
            <tr>
                <td>
                    <div class="dash-student-cell">
                        <div class="dash-avatar-circle" style="background: linear-gradient(135deg, #2563EB, #4F46E5);">${initials}</div>
                        <strong>${escapeHtml(s.fullName)}</strong>
                    </div>
                </td>
                <td><code class="dash-id-code">#${s.id}</code></td>
                <td><span class="dash-dept-pill">${escapeHtml(s.department || '-')}</span></td>
                <td><small style="color: #64748b;">${escapeHtml(s.created_at || 'Today')}</small></td>
                <td>${statusBadge}</td>
            </tr>
        `;
    }).join("");
}

// Render Recent Payments Mini Table
function renderDashboardRecentPayments(payments) {
    const tbody = document.getElementById("dashRecentPaymentsBody");
    if (!tbody) return;

    if (!payments || payments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty-cell">No fee payment receipts recorded yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = payments.slice(0, 6).map(p => {
        const amount = Number(p.amount || 0);
        return `
            <tr>
                <td><strong>${escapeHtml(p.student_name || 'Student')}</strong></td>
                <td><code class="dash-id-code">${escapeHtml(p.transaction_id || `PAY-${p.id}`)}</code></td>
                <td><strong style="color: #059669;">₹ ${amount.toLocaleString("en-IN")}</strong></td>
                <td><span class="dash-dept-pill">${escapeHtml(p.payment_method || 'UPI')}</span></td>
                <td><span class="att-status-pill pill-green">✓ Paid</span></td>
            </tr>
        `;
    }).join("");
}

// Render Attention Required Alerts
function renderDashboardAlerts(alerts) {
    const container = document.getElementById("dashAlertsList");
    if (!container) return;

    if (!alerts || alerts.length === 0) {
        container.innerHTML = `
            <div class="dash-empty-alert-state">
                <span class="empty-check">✓</span> Everything is up to date and in academic compliance.
            </div>
        `;
        return;
    }

    container.innerHTML = alerts.map(a => {
        const typeClass = a.type || "warning";
        const icon = typeClass === "danger" ? "🚨" : (typeClass === "info" ? "💳" : "⚠️");
        return `
            <div class="dash-alert-item ${typeClass}">
                <div class="alert-icon">${icon}</div>
                <div class="alert-content">
                    <strong>${escapeHtml(a.title)} (${a.count || 0})</strong>
                    <p>${escapeHtml(a.description)}</p>
                </div>
                <button type="button" class="btn-alert-action" onclick="switchAdminSection('${a.action_target || 'pane-dashboard'}', null, '${a.title}')">
                    ${escapeHtml(a.action_text || 'Review')}
                </button>
            </div>
        `;
    }).join("");
}

// Render Recent Administrative Activity Timeline
function renderDashboardActivity(activity) {
    const container = document.getElementById("dashActivityTimeline");
    if (!container) return;

    if (!activity || activity.length === 0) {
        container.innerHTML = `<div class="dash-activity-empty">No institutional activity logged yet.</div>`;
        return;
    }

    container.innerHTML = activity.map(item => `
        <div class="activity-timeline-item">
            <div class="activity-icon-bullet" style="background: ${item.color || '#2563EB'};">
                ${item.icon || '📌'}
            </div>
            <div class="activity-details">
                <strong>${escapeHtml(item.title)}</strong>
                <p>${escapeHtml(item.description)}</p>
                <small>${escapeHtml(item.timestamp || 'Recently')}</small>
            </div>
        </div>
    `).join("");
}

// Header Notification Menu Handling
function toggleNotificationMenu(force) {
    const menu = document.getElementById("headerNotifDropdown");
    if (!menu) return;

    if (force === true) {
        menu.style.display = "block";
    } else if (force === false) {
        menu.style.display = "none";
    } else {
        menu.style.display = menu.style.display === "none" ? "block" : "none";
    }
}

function updateHeaderNotifications(alerts) {
    const badge = document.getElementById("headerNotifCount");
    const container = document.getElementById("notifDropdownBody");
    if (!badge) return;

    const count = (alerts || []).length;
    badge.textContent = count;
    badge.style.display = count > 0 ? "inline-flex" : "none";

    if (container) {
        if (!alerts || alerts.length === 0) {
            container.innerHTML = `<div class="notif-empty-state">No unread notifications</div>`;
        } else {
            container.innerHTML = alerts.map(a => `
                <div class="notif-item" onclick="toggleNotificationMenu(false); switchAdminSection('${a.action_target || 'pane-dashboard'}', null, '${a.title}')">
                    <span class="notif-item-icon">🔔</span>
                    <div class="notif-item-text">
                        <strong>${escapeHtml(a.title)}</strong>
                        <small>${escapeHtml(a.description)}</small>
                    </div>
                </div>
            `).join("");
        }
    }
}

function markAllNotificationsRead() {
    const badge = document.getElementById("headerNotifCount");
    const container = document.getElementById("notifDropdownBody");
    if (badge) {
        badge.textContent = "0";
        badge.style.display = "none";
    }
    if (container) {
        container.innerHTML = `<div class="notif-empty-state">All notifications marked as read ✓</div>`;
    }
    showToast("All notifications marked as read.", "success");
}

// Executive PDF Report Export
function exportDashboardExecutiveReport() {
    window.print();
}

// ============================================================
// RENDER ANALYTICS CHARTS (PROFESSIONAL RESPONSIVE PALETTE)
// ============================================================

function renderAnalyticsCharts(stats) {
    // 1. MONTHLY ADMISSIONS TREND (SMOOTH GRADIENT LINE)
    const monthlyCtx = document.getElementById("monthlyChart");
    if (monthlyCtx) {
        const trends = stats.monthly_trends || [];
        const monthLabels = trends.map(t => t.month);
        const monthData = trends.map(t => t.count);

        if (monthlyChartInstance) {
            monthlyChartInstance.destroy();
        }

        monthlyChartInstance = new Chart(monthlyCtx, {
            type: "line",
            data: {
                labels: monthLabels.length ? monthLabels : ["Mar 2026", "Apr 2026", "May 2026", "Jun 2026", "Jul 2026", "Aug 2026"],
                datasets: [{
                    label: "Admissions",
                    data: monthData.length ? monthData : [0, 0, 0, 0, 0, stats.total || 0],
                    borderColor: "#2563EB",
                    backgroundColor: "rgba(37, 99, 235, 0.08)",
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: "#2563EB",
                    pointBorderColor: "#FFFFFF",
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: "#172033",
                        titleFont: { family: "'Plus Jakarta Sans', sans-serif", weight: "700" },
                        bodyFont: { family: "'Inter', sans-serif" },
                        padding: 10,
                        cornerRadius: 6
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: "#F1F5F9" },
                        ticks: { font: { family: "'Inter', sans-serif", size: 11 }, precision: 0 }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: "'Inter', sans-serif", size: 11 } }
                    }
                }
            }
        });
    }

    // 2. DEPARTMENT DISTRIBUTION (ENTERPRISE BAR CHART)
    const deptCtx = document.getElementById("deptChart");
    if (deptCtx) {
        const deptLabels = Object.keys(stats.dept_stats || {});
        const deptData = Object.values(stats.dept_stats || {});

        if (deptChartInstance) {
            deptChartInstance.destroy();
        }

        deptChartInstance = new Chart(deptCtx, {
            type: "bar",
            data: {
                labels: deptLabels.length ? deptLabels.map(l => l.replace(" Engineering", "").replace("Artificial Intelligence & Data Science", "AI & DS")) : ["Computer", "IT", "AI & DS", "E&TC", "Mechanical", "Civil", "Electrical"],
                datasets: [{
                    label: "Enrolled Students",
                    data: deptData.length ? deptData : [0, 0, 0, 0, 0, 0, 0],
                    backgroundColor: [
                        "#2563EB", // Computer
                        "#0891B2", // IT
                        "#7C3AED", // AI&DS
                        "#059669", // ENTC
                        "#EA580C", // Mech
                        "#DC2626", // Civil
                        "#D97706"  // Elec
                    ],
                    borderRadius: 6,
                    barThickness: 22
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: "#172033",
                        padding: 10,
                        cornerRadius: 6
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: "#F1F5F9" },
                        ticks: { font: { family: "'Inter', sans-serif", size: 11 }, precision: 0 }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: "'Inter', sans-serif", size: 11 } }
                    }
                }
            }
        });
    }

    // 3. ADMISSION VERIFICATION STATUS DOUGHNUT
    const typeCtx = document.getElementById("admissionTypeChart");
    if (typeCtx) {
        const sStats = stats.status_stats || {
            "Verified": 0,
            "Pending Verification": 0,
            "Under Review": 0,
            "Rejected": 0
        };

        if (admissionTypeChartInstance) {
            admissionTypeChartInstance.destroy();
        }

        admissionTypeChartInstance = new Chart(typeCtx, {
            type: "doughnut",
            data: {
                labels: ["Verified", "Pending Verification", "Under Review", "Rejected"],
                datasets: [{
                    data: [
                        sStats["Verified"] || 0,
                        sStats["Pending Verification"] || 0,
                        sStats["Under Review"] || 0,
                        sStats["Rejected"] || 0
                    ],
                    backgroundColor: [
                        "#059669", // Verified (Green)
                        "#D97706", // Pending (Amber)
                        "#2563EB", // Under Review (Blue)
                        "#DC2626"  // Rejected (Red)
                    ],
                    borderWidth: 2,
                    borderColor: "#FFFFFF"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "68%",
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            font: { family: "'Inter', sans-serif", size: 11, weight: "600" },
                            padding: 10,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    // 4. GENDER RATIO DOUGHNUT
    const genderCtx = document.getElementById("genderChart");
    if (genderCtx) {
        const gStats = stats.gender_stats || { Male: 0, Female: 0, Other: 0 };

        if (genderChartInstance) {
            genderChartInstance.destroy();
        }

        genderChartInstance = new Chart(genderCtx, {
            type: "doughnut",
            data: {
                labels: ["Male", "Female", "Other"],
                datasets: [{
                    data: [
                        gStats.Male || 0,
                        gStats.Female || 0,
                        gStats.Other || 0
                    ],
                    backgroundColor: [
                        "#2563EB", // Male
                        "#EC4899", // Female
                        "#64748B"  // Other
                    ],
                    borderWidth: 2,
                    borderColor: "#FFFFFF"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "68%",
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            font: { family: "'Inter', sans-serif", size: 11, weight: "600" },
                            padding: 10,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }
}


// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

const toastContainer = document.getElementById("toastContainer");

function showToast(message, type = "success") {
    const container = toastContainer || document.getElementById("toastContainer");
    if (!container) {
        console.log(`[Toast ${type}]:`, message);
        return;
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const icon = type === "success" ? "✅" : "⚠️";

    toast.innerHTML = `
        <span>${icon}</span>
        <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("toast-fade-out");
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        }, 300);
    }, 3500);
}


// ============================================================
// DELETE STUDENT SYSTEM
// ============================================================

let pendingDeleteStudentId = null;

function getDeleteElements() {
    return {
        modal: document.getElementById("deleteModal"),
        message: document.getElementById("deleteModalMessage"),
        cancelButton: document.getElementById("cancelDeleteBtn"),
        confirmButton: document.getElementById("confirmDeleteBtn")
    };
}

function deleteStudent(studentId) {
    const id = Number(studentId);
    console.log("Delete button clicked. Student ID:", id);

    if (!Number.isInteger(id) || id <= 0) {
        showToast("Invalid student ID.", "error");
        return;
    }

    // Find student from currently loaded students
    const student = Array.isArray(students)
        ? students.find(s => Number(s.id) === id)
        : null;

    const {
        modal,
        message,
        confirmButton
    } = getDeleteElements();

    if (!modal) {
        alert("Delete confirmation modal was not found.");
        console.error("Element #deleteModal not found.");
        return;
    }

    // Store selected student ID
    pendingDeleteStudentId = id;

    // Show student name
    if (message) {
        const studentName = student && student.fullName ? `"${student.fullName}"` : `record #${id}`;
        message.textContent = `Are you sure you want to delete the admission record for ${studentName}? This action cannot be undone.`;
    }

    // Show modal
    modal.style.display = "flex";
    modal.classList.add("show");

    // Reset confirm button
    if (confirmButton) {
        confirmButton.disabled = false;
        confirmButton.textContent = "Delete";
    }

    console.log("Delete confirmation opened for student:", id);
}

function hideDeleteModal() {
    const { modal } = getDeleteElements();
    pendingDeleteStudentId = null;

    if (modal) {
        modal.style.display = "none";
        modal.classList.remove("show");
    }

    console.log("Delete modal closed.");
}

function cancelStudentDelete() {
    console.log("Delete cancelled.");
    hideDeleteModal();
}

async function confirmStudentDelete() {
    const id = pendingDeleteStudentId;
    console.log("Confirm delete clicked. Student ID:", id);

    if (!id) {
        showToast("No student selected for deletion.", "error");
        return;
    }

    const { confirmButton } = getDeleteElements();

    try {
        if (confirmButton) {
            confirmButton.disabled = true;
            confirmButton.textContent = "Deleting...";
        }

        console.log(`Sending DELETE request to /api/students/${id}`);

        const response = await fetch(`/api/students/${id}`, {
            method: "DELETE",
            headers: {
                "Accept": "application/json"
            }
        });

        console.log("DELETE response status:", response.status);

        let data = {};
        try {
            data = await response.json();
        } catch (jsonError) {
            console.warn("Server did not return JSON.");
        }

        console.log("DELETE response data:", data);

        if (!response.ok) {
            throw new Error(data.error || data.message || `Delete failed. HTTP ${response.status}`);
        }

        // Close modal
        hideDeleteModal();

        // Show toast feedback
        showToast(data.message || "Student deleted successfully.", "success");

        // Remove student from local array
        if (Array.isArray(students)) {
            students = students.filter(student => Number(student.id) !== Number(id));
        }

        // Refresh student table
        if (typeof renderStudents === "function") {
            renderStudents();
        }

        // Refresh dashboard
        if (typeof updateDashboard === "function") {
            updateDashboard();
        }

        // Reload data from backend
        if (typeof fetchStudents === "function") {
            await fetchStudents();
        }

        console.log("Student deleted successfully:", id);

    } catch (error) {
        console.error("DELETE STUDENT ERROR:", error);
        showToast("Unable to delete student: " + error.message, "error");
    } finally {
        if (confirmButton) {
            confirmButton.disabled = false;
            confirmButton.textContent = "Delete";
        }
    }
}

function initializeDeleteSystem() {
    const {
        modal,
        cancelButton,
        confirmButton
    } = getDeleteElements();

    if (!modal) {
        console.warn("Delete modal not found.");
        return;
    }

    if (cancelButton) {
        cancelButton.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();
            cancelStudentDelete();
        };
    }

    if (confirmButton) {
        confirmButton.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();
            confirmStudentDelete();
        };
    }

    modal.onclick = function (event) {
        if (event.target === modal) {
            hideDeleteModal();
        }
    };

    console.log("Delete system initialized successfully.");
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeDeleteSystem);
} else {
    initializeDeleteSystem();
}


// ============================================================
// VIEW MODAL CLOSE & GLOBAL EVENT HANDLERS
// ============================================================

function hideModal() {
    if (viewModal) {
        viewModal.style.display = "none";
    }
}

if (closeModal) {
    closeModal.addEventListener("click", hideModal);
}

if (closeModalFooter) {
    closeModalFooter.addEventListener("click", hideModal);
}

window.addEventListener("click", function (event) {
    if (viewModal && event.target === viewModal) {
        hideModal();
    }
    const delModal = document.getElementById("deleteModal");
    if (delModal && event.target === delModal) {
        hideDeleteModal();
    }
});

window.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") {
        return;
    }
    if (viewModal && viewModal.style.display === "flex") {
        hideModal();
    }
    const delModal = document.getElementById("deleteModal");
    if (delModal && delModal.style.display === "flex") {
        hideDeleteModal();
    }
});


// ============================================================
// EXPORT TO EXCEL / CSV
// ============================================================

function exportToExcel() {

    if (students.length === 0) {

        alert(
            "No student records available to export!"
        );

        return;
    }


    const headers = [

        "Sr No",
        "Full Name",
        "Father's Name",
        "Mother's Name",
        "DOB",
        "Gender",
        "Blood Group",
        "Mobile",
        "Alt Mobile",
        "Email",
        "Aadhaar No",
        "Address",
        "City",
        "State",
        "Pincode",
        "Nationality",
        "10th Board",
        "10th %",
        "12th Board",
        "12th %",
        "Entrance Exam",
        "Entrance Score",
        "Department",
        "Admission Type"

    ];


    let csvContent =
        "\uFEFF";


    csvContent +=
        headers
            .map(
                h =>
                    `"${h.replace(
                        /"/g,
                        '""'
                    )}"`
            )
            .join(",") +
        "\r\n";


    students.forEach(
        (student, index) => {

            const row = [

                index + 1,

                student.fullName || "",

                student.fatherName || "",

                student.motherName || "",

                student.dob || "",

                student.gender || "",

                student.bloodGroup || "",

                student.mobile || "",

                student.altMobile || "",

                student.email || "",

                student.aadhaar || "",

                student.address || "",

                student.city || "",

                student.state || "",

                student.pincode || "",

                student.nationality || "",

                student.board10 || "",

                student.percentage10 || "",

                student.board12 || "",

                student.percentage12 || "",

                student.entranceExam || "",

                student.entranceScore || "",

                student.department || "",

                student.admissionType || ""

            ];


            csvContent +=

                row
                    .map(
                        val =>
                            `"${String(val)
                                .replace(
                                    /"/g,
                                    '""'
                                )}"`
                    )
                    .join(",") +
                "\r\n";

        }
    );


    const blob =
        new Blob(
            [csvContent],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.setAttribute(
        "href",
        url
    );


    link.setAttribute(
        "download",
        `Student_Admission_Records_${new Date()
            .toISOString()
            .slice(0, 10)
        }.csv`
    );


    document.body.appendChild(
        link
    );


    link.click();


    document.body.removeChild(
        link
    );


    URL.revokeObjectURL(
        url
    );
}


// ============================================================
// INITIAL API LOAD
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {
        checkAdminAuth();
        fetchStudents();
        initAttendanceModule();
    }
);


// ============================================================
// ADMIN LOGOUT
// ============================================================

function logoutAdmin() {

    fetch(
        "/api/logout",
        {
            method: "POST"
        }
    )

        .then(res =>
            res.json()
        )

        .then(() => {

            window.location.href =
                "login.html";

        })

        .catch(err => {

            console.error(
                "Logout error:",
                err
            );


            window.location.href =
                "login.html";

        });
}

// ============================================================
// MODAL FEE MANAGEMENT FUNCTIONS
// ============================================================

let currentModalStudentName = "Student";

function loadStudentModalFees(studentId, studentName = "Student") {
    currentModalStudentName = studentName;
    fetch(`/api/students/${studentId}/fees`)
        .then(res => {
            if (!res.ok) throw new Error("Failed to load student fee summary");
            return res.json();
        })
        .then(feeData => {
            renderModalFeeDetails(feeData);
        })
        .catch(err => {
            console.error("Error loading modal fees:", err);
            const historyBody = document.getElementById("mPaymentHistoryBody");
            if (historyBody) {
                historyBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #ef4444; padding: 14px;">Unable to load fee summary.</td></tr>`;
            }
        });
}

function renderModalFeeDetails(feeData) {
    const totalEl = document.getElementById("mTotalFee");
    const paidEl = document.getElementById("mPaidAmount");
    const pendEl = document.getElementById("mPendingAmount");
    const statusTextEl = document.getElementById("mFeeStatusText");
    const statusBadgeEl = document.getElementById("modalFeeStatusBadge");
    const pillsContainer = document.getElementById("mFeeBreakdownPills");
    const historyBody = document.getElementById("mPaymentHistoryBody");

    const total = Number(feeData.total_fee || 0);
    const paid = Number(feeData.paid_amount || 0);
    const pending = Number(feeData.pending_amount || 0);
    const status = feeData.payment_status || "Pending";

    if (totalEl) totalEl.textContent = `₹ ${total.toLocaleString("en-IN")}`;
    if (paidEl) paidEl.textContent = `₹ ${paid.toLocaleString("en-IN")}`;
    if (pendEl) pendEl.textContent = `₹ ${pending.toLocaleString("en-IN")}`;
    if (statusTextEl) statusTextEl.textContent = status;

    if (statusBadgeEl) {
        if (status === "Paid") {
            statusBadgeEl.className = "fee-badge fee-badge-paid";
            statusBadgeEl.innerHTML = "🟢 Paid";
        } else if (status === "Partially Paid") {
            statusBadgeEl.className = "fee-badge fee-badge-partial";
            statusBadgeEl.innerHTML = "🟡 Partially Paid";
        } else {
            statusBadgeEl.className = "fee-badge fee-badge-pending";
            statusBadgeEl.innerHTML = "🔴 Pending";
        }
    }

    if (pillsContainer && feeData.fee_breakdown) {
        pillsContainer.innerHTML = Object.entries(feeData.fee_breakdown).map(([k, v]) => `
            <span style="background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; font-size: 11px;">
                <span style="color: #64748b;">${k}:</span> <strong style="color: #0f172a;">₹ ${Number(v).toLocaleString("en-IN")}</strong>
            </span>
        `).join("");
    }

    if (historyBody) {
        const payments = feeData.payments || [];
        if (payments.length === 0) {
            historyBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #64748b; padding: 16px;">No fee payments recorded yet.</td></tr>`;
        } else {
            historyBody.innerHTML = payments.map(p => `
                <tr>
                    <td><strong>${p.payment_date || p.created_at || '-'}</strong></td>
                    <td>${p.fee_type || 'Tuition Fee'}</td>
                    <td style="font-weight: 700; color: #059669;">₹ ${Number(p.amount).toLocaleString('en-IN')}</td>
                    <td><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${p.payment_method || 'UPI'}</span></td>
                    <td><code style="font-size: 11px;">${p.transaction_id || '-'}</code></td>
                    <td><span style="color: #15803d; font-weight: 600;">✓ ${p.status || 'SUCCESS'}</span></td>
                    <td><small style="color: #64748b;">${p.recorded_by || 'admin'}</small></td>
                    <td>
                        <button type="button" class="doc-action-btn btn-doc-download" onclick="downloadAdminPaymentReceipt(${JSON.stringify(p).replace(/"/g, '&quot;')}, '${escapeHtml(currentModalStudentName)}')">
                            📥 Receipt
                        </button>
                    </td>
                </tr>
            `).join("");
        }
    }
}

async function recordStudentPayment(studentId) {
    const amountInput = document.getElementById("adminPayAmount");
    const feeTypeSelect = document.getElementById("adminPayFeeType");
    const methodSelect = document.getElementById("adminPayMethod");
    const txnIdInput = document.getElementById("adminPayTxnId");
    const remarksInput = document.getElementById("adminPayRemarks");
    const submitBtn = document.getElementById("adminPaySubmitBtn");

    const amountVal = parseFloat(amountInput.value);
    if (isNaN(amountVal) || amountVal <= 0) {
        showToast("Please enter a valid payment amount greater than zero.", "error");
        amountInput.focus();
        return;
    }

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Processing...";
        }

        const payload = {
            amount: amountVal,
            fee_type: feeTypeSelect.value,
            payment_method: methodSelect.value,
            transaction_id: txnIdInput ? txnIdInput.value.trim() : "",
            remarks: remarksInput ? remarksInput.value.trim() : ""
        };

        const response = await fetch(`/api/students/${studentId}/payments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify(payload)
        });

        const contentType = response.headers.get("content-type") || "";
        let data = {};
        if (contentType.includes("application/json")) {
            data = await response.json();
        } else {
            const text = await response.text();
            throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
        }

        if (!response.ok) {
            throw new Error(data.error || data.message || `HTTP Error ${response.status}`);
        }

        showToast(data.message || "Payment recorded successfully!", "success");

        // Clear input form
        amountInput.value = "";
        if (txnIdInput) txnIdInput.value = "";
        if (remarksInput) remarksInput.value = "";

        // Reload modal fee card
        if (data.summary) {
            renderModalFeeDetails(data.summary);
        } else {
            loadStudentModalFees(studentId, currentModalStudentName);
        }

        // Refresh global dashboard analytics
        updateDashboard();

    } catch (err) {
        console.error("Record payment error:", err);
        showToast("Failed to record payment: " + err.message, "error");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "💳 Record Payment";
        }
    }
}

function downloadAdminPaymentReceipt(payment, studentName) {
    if (!payment || !payment.id) {
        showToast("Invalid payment record selected.", "error");
        return;
    }

    showToast("Downloading official fee receipt PDF...", "success");
    const link = document.createElement("a");
    link.href = `/api/payments/${payment.id}/receipt`;
    link.target = "_blank";
    link.download = `${payment.receipt_number || 'Receipt_' + payment.id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ============================================================
// ATTENDANCE MANAGEMENT MODULE (ADMIN / FACULTY)
// ============================================================

let currentAttendanceRoster = [];

const DEPARTMENT_ICONS = {
    "Computer Engineering": "💻",
    "Information Technology": "🌐",
    "Artificial Intelligence & Data Science": "🤖",
    "Electronics & Telecommunication": "📡",
    "Mechanical Engineering": "⚙️",
    "Civil Engineering": "🏗️",
    "Electrical Engineering": "⚡"
};

function initAttendanceModule() {
    const dateInput = document.getElementById("attDateFilter");
    if (dateInput && !dateInput.value) {
        const today = new Date().toISOString().slice(0, 10);
        dateInput.value = today;
    }

    const todayDisplay = document.getElementById("attTodayDisplay");
    if (todayDisplay) {
        const now = new Date();
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        todayDisplay.textContent = now.toLocaleDateString('en-GB', options);
    }

    const deptSelect = document.getElementById("attDeptFilter");
    if (deptSelect && deptSelect.value) {
        selectAttendanceDepartment(deptSelect.value);
    } else {
        resetAttendanceDepartmentSelection();
    }
}

function exportAttendanceReport() {
    const deptSelect = document.getElementById("attDeptFilter");
    const department = deptSelect ? deptSelect.value : "";
    const dateInput = document.getElementById("attDateFilter");
    const dateVal = dateInput && dateInput.value ? dateInput.value : new Date().toISOString().slice(0, 10);

    if (!department) {
        showToast("Please select a department first to export attendance.", "warning");
        return;
    }

    if (!currentAttendanceRoster || currentAttendanceRoster.length === 0) {
        showToast("No student attendance data loaded to export.", "error");
        return;
    }

    // Generate CSV data for enterprise export
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Zeal College ERP - Daily Attendance Sheet\n`;
    csvContent += `Department: ${department}\n`;
    csvContent += `Date: ${dateVal}\n\n`;
    csvContent += `Sr,Student ID,Student Name,Department,Quota,Status,Remarks\n`;

    currentAttendanceRoster.forEach((s, idx) => {
        const statusEl = document.getElementById(`attStatus_${s.student_id}`);
        const remarksEl = document.getElementById(`attRemarks_${s.student_id}`);
        const status = statusEl ? statusEl.value : (s.status || "Present");
        const remarks = remarksEl ? remarksEl.value.replace(/,/g, ";") : (s.remarks || "");

        csvContent += `${idx + 1},${s.student_id},"${s.fullName || ''}","${s.department || ''}","${s.admissionType || 'CAP'}",${status},"${remarks}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_${department.replace(/\s+/g, '_')}_${dateVal}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Attendance report exported as CSV!`, "success");
}

function selectAttendanceDepartment(deptName) {
    if (!deptName) {
        resetAttendanceDepartmentSelection();
        return;
    }

    const deptSelect = document.getElementById("attDeptFilter");
    if (deptSelect) deptSelect.value = deptName;

    const activeDeptTitle = document.getElementById("attActiveDeptTitle");
    if (activeDeptTitle) activeDeptTitle.textContent = deptName;

    const activeDeptIcon = document.getElementById("attActiveDeptIcon");
    if (activeDeptIcon) activeDeptIcon.textContent = DEPARTMENT_ICONS[deptName] || "🎓";

    const selectionView = document.getElementById("attDeptSelectionView");
    const activeView = document.getElementById("attDeptActiveView");

    if (selectionView) selectionView.style.display = "none";
    if (activeView) activeView.style.display = "block";

    loadAttendanceSheet();
}

function resetAttendanceDepartmentSelection() {
    const deptSelect = document.getElementById("attDeptFilter");
    if (deptSelect) deptSelect.value = "";

    const searchInput = document.getElementById("attSearchInput");
    if (searchInput) searchInput.value = "";

    currentAttendanceRoster = [];

    const selectionView = document.getElementById("attDeptSelectionView");
    const activeView = document.getElementById("attDeptActiveView");

    if (selectionView) selectionView.style.display = "block";
    if (activeView) activeView.style.display = "none";
}

function onDeptDropdownChange() {
    const deptSelect = document.getElementById("attDeptFilter");
    const deptName = deptSelect ? deptSelect.value : "";
    if (!deptName) {
        resetAttendanceDepartmentSelection();
    } else {
        selectAttendanceDepartment(deptName);
    }
}

async function loadAttendanceSheet() {
    const deptSelect = document.getElementById("attDeptFilter");
    const dateInput = document.getElementById("attDateFilter");
    const tableBody = document.getElementById("attendanceTableBody");

    if (!tableBody) return;

    const department = deptSelect ? deptSelect.value : "";
    if (!department) {
        resetAttendanceDepartmentSelection();
        return;
    }

    const dateVal = dateInput && dateInput.value ? dateInput.value : new Date().toISOString().slice(0, 10);

    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #64748b; padding: 16px;">Loading attendance roster for ${escapeHtml(department)}...</td></tr>`;

    try {
        const url = `/api/attendance?department=${encodeURIComponent(department)}&date=${encodeURIComponent(dateVal)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load attendance (HTTP ${res.status})`);

        const data = await res.json();
        currentAttendanceRoster = data.students || [];

        renderAttendanceSheet(currentAttendanceRoster);
        updateAttendanceKpis(data);
        loadAttendanceReport(department, dateVal);

    } catch (err) {
        console.error("Error loading attendance sheet:", err);
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ef4444; padding: 16px;">Failed to load attendance sheet: ${escapeHtml(err.message)}</td></tr>`;
    }
}

function renderAttendanceSheet(students) {
    const tableBody = document.getElementById("attendanceTableBody");
    if (!tableBody) return;

    const deptSelect = document.getElementById("attDeptFilter");
    const currentDeptName = deptSelect && deptSelect.value ? deptSelect.value : "this department";

    if (!students || students.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: #64748b; padding: 36px 16px;">
                    <div style="font-size: 38px; margin-bottom: 10px;">📋</div>
                    <strong style="color: #1e293b; font-size: 15px; display: block;">No students enrolled in ${escapeHtml(currentDeptName)} yet.</strong>
                    <div style="font-size: 13px; color: #94a3b8; margin: 4px 0 16px 0;">Admitted students for this branch will appear here automatically.</div>
                    <button type="button" class="att-back-btn" onclick="resetAttendanceDepartmentSelection()">← Select Another Department</button>
                </td>
            </tr>
        `;
        return;
    }

    function getInitials(name) {
        if (!name) return "ST";
        const parts = name.trim().split(" ");
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    const avatarGradients = [
        "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
        "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
        "linear-gradient(135deg, #059669 0%, #047857 100%)",
        "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
        "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
        "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)"
    ];

    tableBody.innerHTML = students.map((s, index) => {
        const isPresent = s.status === "Present";
        const statusClass = isPresent ? "att-status-present" : "att-status-absent";
        const avatarBg = avatarGradients[index % avatarGradients.length];
        const initials = getInitials(s.fullName);
        const quotaKey = (s.admissionType || 'cap').toLowerCase().replace(/[^a-z]/g, '');

        return `
            <tr id="attRow_${s.student_id}">
                <td style="font-weight: 700; color: #64748b; text-align: center;">${index + 1}</td>
                <td><code class="att-id-badge">#${s.student_id}</code></td>
                <td>
                    <div class="att-student-cell">
                        <div class="att-avatar" style="background: ${avatarBg};">${initials}</div>
                        <div class="att-student-meta">
                            <strong class="att-student-name">${escapeHtml(s.fullName)}</strong>
                            <span class="att-student-sub">${escapeHtml(s.email || s.mobile || 'Roll #' + s.student_id)}</span>
                        </div>
                    </div>
                </td>
                <td><span class="att-dept-badge">${escapeHtml(s.department || '-')}</span></td>
                <td><span class="att-quota-badge quota-${quotaKey}">${escapeHtml(s.admissionType || 'CAP')}</span></td>
                <td>
                    <select id="attStatus_${s.student_id}" class="att-status-select ${statusClass}" onchange="onStatusSelectChange(${s.student_id})" aria-label="Attendance status for ${escapeHtml(s.fullName)}">
                        <option value="Present" ${isPresent ? "selected" : ""}>✓ Present</option>
                        <option value="Absent" ${!isPresent ? "selected" : ""}>✕ Absent</option>
                    </select>
                </td>
                <td>
                    <input type="text" id="attRemarks_${s.student_id}" class="att-remarks-input" placeholder="Optional notes (e.g. Medical, On Duty)..." value="${escapeHtml(s.remarks || '')}" aria-label="Remarks for ${escapeHtml(s.fullName)}">
                </td>
            </tr>
        `;
    }).join("");
}

function onStatusSelectChange(studentId) {
    const sel = document.getElementById(`attStatus_${studentId}`);
    if (!sel) return;
    if (sel.value === "Present") {
        sel.className = "att-status-select att-status-present";
    } else {
        sel.className = "att-status-select att-status-absent";
    }
    recalcAttendanceSheetKpis();
}

function markAllAttendance(targetStatus) {
    const selects = document.querySelectorAll(".att-status-select");
    selects.forEach(sel => {
        sel.value = targetStatus;
        if (targetStatus === "Present") {
            sel.className = "att-status-select att-status-present";
        } else {
            sel.className = "att-status-select att-status-absent";
        }
    });
    recalcAttendanceSheetKpis();
    showToast(`Marked all displayed students as ${targetStatus}`, "success");
}

function applyAttendanceVisualStats(total, present, absent, rate) {
    const kpiTotal = document.getElementById("attKpiTotal");
    const kpiPresent = document.getElementById("attKpiPresent");
    const kpiAbsent = document.getElementById("attKpiAbsent");
    const kpiRate = document.getElementById("attKpiRate");
    const heroRate = document.getElementById("heroAttRate");
    const kpiPresentBar = document.getElementById("kpiPresentBar");
    const kpiAbsentBar = document.getElementById("kpiAbsentBar");
    const kpiRateBar = document.getElementById("kpiRateBar");
    const ratioPresentPct = document.getElementById("ratioPresentPct");
    const ratioAbsentPct = document.getElementById("ratioAbsentPct");
    const stackedPresentBar = document.getElementById("stackedPresentBar");
    const stackedAbsentBar = document.getElementById("stackedAbsentBar");

    if (kpiTotal) kpiTotal.textContent = total;
    if (kpiPresent) kpiPresent.textContent = present;
    if (kpiAbsent) kpiAbsent.textContent = absent;
    if (kpiRate) kpiRate.textContent = `${rate}%`;
    if (heroRate) heroRate.textContent = `${rate}%`;

    const presentPct = total > 0 ? Math.round((present / total) * 100) : 0;
    const absentPct = total > 0 ? (100 - presentPct) : 0;

    if (kpiPresentBar) kpiPresentBar.style.width = `${presentPct}%`;
    if (kpiAbsentBar) kpiAbsentBar.style.width = `${absentPct}%`;
    if (kpiRateBar) kpiRateBar.style.width = `${rate}%`;

    if (ratioPresentPct) ratioPresentPct.textContent = `${presentPct}%`;
    if (ratioAbsentPct) ratioAbsentPct.textContent = `${absentPct}%`;
    if (stackedPresentBar) stackedPresentBar.style.width = `${presentPct}%`;
    if (stackedAbsentBar) stackedAbsentBar.style.width = `${absentPct}%`;
}

function recalcAttendanceSheetKpis() {
    const selects = Array.from(document.querySelectorAll(".att-status-select"));
    const total = selects.length;
    const present = selects.filter(s => s.value === "Present").length;
    const absent = total - present;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    applyAttendanceVisualStats(total, present, absent, rate);
}

function updateAttendanceKpis(data) {
    const total = data.total_students || 0;
    const present = data.present_count || 0;
    const absent = data.absent_count || 0;
    const rate = data.marked_count > 0 ? Math.round((present / data.marked_count) * 100) : (total > 0 ? 100 : 0);

    applyAttendanceVisualStats(total, present, absent, rate);
}

async function loadAttendanceReport(department, dateVal) {
    const alertBox = document.getElementById("attLowAlertBox");
    const studentsList = document.getElementById("attLowStudentsList");
    if (!alertBox || !studentsList) return;

    try {
        const res = await fetch(`/api/attendance/report?department=${encodeURIComponent(department)}&date=${encodeURIComponent(dateVal)}`);
        if (!res.ok) return;

        const rep = await res.json();
        const lowStudents = rep.low_attendance_students || [];

        if (lowStudents.length > 0) {
            alertBox.style.display = "block";
            studentsList.innerHTML = lowStudents.map(s => `
                <span style="background: white; border: 1px solid #fca5a5; padding: 3px 8px; border-radius: 6px; font-weight: 600;">
                    ${escapeHtml(s.fullName)} (${s.attendance_percentage}% attendance)
                </span>
            `).join("");
        } else {
            alertBox.style.display = "none";
        }
    } catch (e) {
        console.error("Error loading attendance report:", e);
    }
}

function filterAttendanceTable() {
    const input = document.getElementById("attSearchInput");
    const filter = input ? input.value.toLowerCase().trim() : "";
    const rows = document.querySelectorAll("#attendanceTableBody tr");

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(filter)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
}

async function saveBulkAttendance() {
    const dateInput = document.getElementById("attDateFilter");
    const saveBtn = document.getElementById("saveAttendanceBtn");

    if (!dateInput || !dateInput.value) {
        showToast("Please choose a valid attendance date.", "error");
        return;
    }

    const attendance_date = dateInput.value;
    const records = [];

    currentAttendanceRoster.forEach(s => {
        const statusEl = document.getElementById(`attStatus_${s.student_id}`);
        const remarksEl = document.getElementById(`attRemarks_${s.student_id}`);

        if (statusEl) {
            records.push({
                student_id: s.student_id,
                status: statusEl.value,
                remarks: remarksEl ? remarksEl.value.trim() : ""
            });
        }
    });

    if (records.length === 0) {
        showToast("No students to submit attendance for.", "error");
        return;
    }

    try {
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = "Saving...";
        }

        const res = await fetch("/api/attendance", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                attendance_date: attendance_date,
                records: records
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save attendance");

        showToast(data.message || "Attendance saved successfully!", "success");
        loadAttendanceSheet();

    } catch (err) {
        console.error("Save attendance error:", err);
        showToast("Failed to save attendance: " + err.message, "error");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = "💾 Save Attendance";
        }
    }
}

// ============================================================
// ADMIN ERP SHELL NAVIGATION & SECTION SWITCHING
// ============================================================

function switchAdminSection(paneId, btnEl, pageTitle = "Dashboard Overview") {
    // 1. Update navigation items
    document.querySelectorAll(".sidebar-nav .nav-link").forEach(link => {
        link.classList.remove("active");
    });

    if (btnEl) {
        btnEl.classList.add("active");
    } else {
        // Find matching link by paneId
        const matchLink = document.querySelector(`[onclick*="${paneId}"]`);
        if (matchLink) matchLink.classList.add("active");
    }

    // 2. Update visible pane
    document.querySelectorAll(".erp-section-pane").forEach(pane => {
        pane.classList.remove("active");
        pane.style.display = "none";
    });

    const targetPane = document.getElementById(paneId);
    if (targetPane) {
        targetPane.classList.add("active");
        targetPane.style.display = "block";
    }

    // 3. Update breadcrumb and header title
    const headerTitleEl = document.getElementById("headerPageTitle");
    if (headerTitleEl) {
        headerTitleEl.textContent = pageTitle;
    }

    // 4. Close mobile sidebar if open
    toggleMobileSidebar(false);

    // 5. Trigger lazy loaders based on selected section
    if (paneId === "pane-fees") {
        loadFees();
    } else if (paneId === "pane-attendance") {
        const deptSelect = document.getElementById("attDeptFilter");
        if (deptSelect && deptSelect.value) {
            loadAttendanceSheet();
        } else {
            resetAttendanceDepartmentSelection();
        }
    } else if (paneId === "pane-admissions") {
        loadAdmissionsPortal();
    } else if (paneId === "pane-dashboard") {
        if (!students || students.length === 0) {
            fetchStudents();
        } else {
            renderStudents();
        }
    } else if (paneId === "pane-students") {
        fetchStudentsModule(1);
        fetchStudentKpiStats();
    } else if (paneId === "pane-departments") {
        loadDepartments();
    } else if (paneId === "pane-examinations") {
        loadExaminations();
    } else if (paneId === "pane-reports") {
        loadReportsAnalytics();
    } else if (paneId === "pane-library") {
        loadLibrary();
    } else if (paneId === "pane-transport") {
        loadTransport();
    } else if (paneId === "pane-notices") {
        fetchNoticesModule(1);
        fetchNoticeKpiStats();
    } else if (paneId === "pane-settings") {
        loadSettingsModule();
    }


    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Backwards-compatible alias for any existing switchAdminTab calls
function switchAdminTab(tabId, btnEl) {
    const paneMap = {
        "sec-admissions": { id: "pane-admissions", title: "Student Admissions & Verification" },
        "sec-fees": { id: "pane-fees", title: "Fee & Payment Management" },
        "sec-attendance": { id: "pane-attendance", title: "Attendance Management" },
        "pane-dashboard": { id: "pane-dashboard", title: "Dashboard Overview" },
        "pane-admissions": { id: "pane-admissions", title: "Student Admissions & Verification" },
        "pane-fees": { id: "pane-fees", title: "Fee & Payment Management" },
        "pane-attendance": { id: "pane-attendance", title: "Attendance Management" }
    };

    const target = paneMap[tabId] || { id: tabId, title: "Admin Portal" };
    switchAdminSection(target.id, btnEl, target.title);
}

// Mobile sidebar drawer toggle
function toggleMobileSidebar(force) {
    const sidebar = document.getElementById("adminSidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    if (!sidebar || !backdrop) return;

    if (force === true) {
        sidebar.classList.add("mobile-open");
        backdrop.classList.add("active");
    } else if (force === false) {
        sidebar.classList.remove("mobile-open");
        backdrop.classList.remove("active");
    } else {
        const isOpen = sidebar.classList.toggle("mobile-open");
        if (isOpen) {
            backdrop.classList.add("active");
        } else {
            backdrop.classList.remove("active");
        }
    }
}

// Administrator Profile Dropdown Menu Toggle
function toggleAdminProfileMenu(force) {
    const menu = document.getElementById("headerUserMenu");
    if (!menu) return;

    if (force === true) {
        menu.style.display = "block";
    } else if (force === false) {
        menu.style.display = "none";
    } else {
        menu.style.display = menu.style.display === "none" ? "block" : "none";
    }
}

// Close user dropdown and notifications dropdown when clicking outside
document.addEventListener("click", function(e) {
    const userDropdown = document.getElementById("headerUserDropdownContainer");
    const userMenu = document.getElementById("headerUserMenu");
    if (userDropdown && userMenu && !userDropdown.contains(e.target)) {
        userMenu.style.display = "none";
    }

    const notifDropdown = document.getElementById("headerNotificationWrapper");
    const notifMenu = document.getElementById("headerNotifDropdown");
    if (notifDropdown && notifMenu && !notifDropdown.contains(e.target)) {
        notifMenu.style.display = "none";
    }
});

// Check Admin Authentication and sync Admin Profile info
async function checkAdminAuth() {
    try {
        const res = await fetch("/api/check-auth");
        if (!res.ok) {
            window.location.href = "login.html";
            return;
        }
        const data = await res.json();
        if (data.authenticated && data.user_type === "admin") {
            const adminName = data.username || "Administrator";
            const adminRole = data.role || "Administrator";
            const avatarSrc = data.avatar || "images/admin-avatar.svg";

            const headerName = document.getElementById("headerAdminName");
            const sidebarName = document.getElementById("sidebarAdminName");
            const menuName = document.getElementById("menuAdminName");
            const headerRole = document.getElementById("headerAdminRole");
            const sidebarRole = document.getElementById("sidebarAdminRole");
            const menuRole = document.getElementById("menuAdminRole");
            const dashGreeting = document.getElementById("dashAdminGreeting");

            if (headerName) headerName.textContent = adminName;
            if (sidebarName) sidebarName.textContent = adminName;
            if (menuName) menuName.textContent = adminName;
            if (dashGreeting) dashGreeting.textContent = adminName;

            if (headerRole) headerRole.textContent = adminRole;
            if (sidebarRole) sidebarRole.textContent = adminRole;
            if (menuRole) menuRole.textContent = adminRole;

            const headerImg = document.getElementById("headerAvatarImg");
            const sidebarImg = document.getElementById("sidebarAvatarImg");
            const menuImg = document.getElementById("menuAvatarImg");

            if (headerImg) headerImg.src = avatarSrc;
            if (sidebarImg) sidebarImg.src = avatarSrc;
            if (menuImg) menuImg.src = avatarSrc;
        } else {
            window.location.href = "login.html";
        }
    } catch (err) {
        console.warn("Auth check warning:", err);
    }
}

// Global Quick Search Handler
function handleGlobalSearch(query) {
    const q = (query || "").toLowerCase().trim();
    const activePane = document.querySelector(".erp-section-pane.active");

    if (!activePane || activePane.id === "pane-dashboard" || activePane.id === "pane-admissions" || activePane.id === "pane-students") {
        const searchInput = document.getElementById("searchInput");
        if (searchInput) {
            searchInput.value = q;
            renderStudents();
        }
    } else if (activePane.id === "pane-fees") {
        const feeInput = document.getElementById("feeSearchInput");
        if (feeInput) {
            feeInput.value = q;
            filterFeeLedgerTable();
        }
    } else if (activePane.id === "pane-attendance") {
        const attInput = document.getElementById("attSearchInput");
        if (attInput) {
            attInput.value = q;
            filterAttendanceTable();
        }
    }
}

async function loadFeeLedger() {
    const tableBody = document.getElementById("feeLedgerTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #64748b; padding: 16px;">Loading student fee ledger...</td></tr>`;

    try {
        const res = await fetch("/api/students");
        if (!res.ok) throw new Error("Failed to load students");
        const students = await res.json();

        if (students.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #64748b; padding: 16px;">No students found.</td></tr>`;
            return;
        }

        const feePromises = students.map(s =>
            fetch(`/api/students/${s.id}/fees`)
                .then(r => r.ok ? r.json() : null)
                .catch(() => null)
        );

        const feeResults = await Promise.all(feePromises);

        tableBody.innerHTML = students.map((s, index) => {
            const feeData = feeResults[index] || {};
            const total = Number(feeData.total_fee || 110000);
            const paid = Number(feeData.paid_amount || 0);
            const pending = Number(feeData.pending_amount !== undefined ? feeData.pending_amount : (total - paid));
            const status = feeData.payment_status || (paid >= total ? "Paid" : (paid > 0 ? "Partially Paid" : "Pending"));

            let badgeHtml = `<span style="background: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">🔴 Pending</span>`;
            if (status === "Paid") {
                badgeHtml = `<span style="background: #dcfce7; color: #15803d; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">🟢 Paid</span>`;
            } else if (status === "Partially Paid") {
                badgeHtml = `<span style="background: #fef3c7; color: #b45309; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">🟡 Partial</span>`;
            }

            return `
                <tr>
                    <td style="font-weight: 600; color: #64748b;">${index + 1}</td>
                    <td><code style="font-size: 11px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">#${s.id}</code></td>
                    <td><strong style="color: #0f172a;">${escapeHtml(s.fullName)}</strong></td>
                    <td><span style="font-size: 12px; color: #475569;">${escapeHtml(s.department || '-')}</span></td>
                    <td><span style="font-size: 11px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 2px 6px; border-radius: 4px;">${escapeHtml(s.admissionType || '-')}</span></td>
                    <td style="font-weight: 600; color: #334155;">₹ ${total.toLocaleString("en-IN")}</td>
                    <td style="font-weight: 700; color: #059669;">₹ ${paid.toLocaleString("en-IN")}</td>
                    <td style="font-weight: 700; color: ${pending > 0 ? '#dc2626' : '#15803d'};">₹ ${pending.toLocaleString("en-IN")}</td>
                    <td>${badgeHtml}</td>
                    <td>
                        <button type="button" class="btn-fee-manage" onclick="viewStudentDetails(${s.id})" title="Manage Student Fee & Record Payment">
                            <span>💳</span> Manage Fee
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

    } catch (err) {
        console.error("Error loading fee ledger:", err);
        tableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #ef4444; padding: 16px;">Failed to load fee ledger: ${escapeHtml(err.message)}</td></tr>`;
    }
}

function filterFeeLedgerTable() {
    const input = document.getElementById("feeSearchInput");
    const filter = input ? input.value.toLowerCase().trim() : "";
    const rows = document.querySelectorAll("#feeLedgerTableBody tr");

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(filter)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
}

// ============================================================
// ADMISSIONS MODULE CONTROLLERS & LOGIC
// ============================================================
let admCurrentPage = 1;
let admTotalPages = 1;
let admTotalCount = 0;
let admLimit = 20;
let admActivePipelineStage = "";
let admChartDeptInstance = null;
let admChartStatusInstance = null;

function loadAdmissionsPortal(page = 1) {
    admCurrentPage = page;
    fetchAdmissions(page);
    fetchAdmissionsAnalytics();
}

function fetchAdmissions(page = 1) {
    admCurrentPage = page;
    const searchVal = document.getElementById("admSearchInput") ? document.getElementById("admSearchInput").value.trim() : "";
    const deptVal = document.getElementById("admDeptFilter") ? document.getElementById("admDeptFilter").value.trim() : "";
    const courseVal = document.getElementById("admCourseFilter") ? document.getElementById("admCourseFilter").value.trim() : "";
    const statusVal = admActivePipelineStage || (document.getElementById("admStatusFilter") ? document.getElementById("admStatusFilter").value.trim() : "");
    const yearVal = document.getElementById("admYearFilter") ? document.getElementById("admYearFilter").value.trim() : "";
    const fromDate = document.getElementById("admFromDate") ? document.getElementById("admFromDate").value : "";
    const toDate = document.getElementById("admToDate") ? document.getElementById("admToDate").value : "";

    const params = new URLSearchParams({
        page: admCurrentPage,
        limit: admLimit,
        search: searchVal,
        dept: deptVal,
        course: courseVal,
        status: statusVal,
        academic_year: yearVal,
        from_date: fromDate,
        to_date: toDate
    });

    const tbody = document.getElementById("admissionsTableBody") || document.getElementById("studentTableBody");
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:#64748B;">⌛ Loading admissions records...</td></tr>`;
    }

    fetch(`/api/students?${params.toString()}`)
        .then(res => {
            if (!res.ok) throw new Error("Failed to load admissions from server");
            return res.json();
        })
        .then(data => {
            if (Array.isArray(data)) {
                students = data;
                admTotalCount = data.length;
                admTotalPages = 1;
            } else if (data && Array.isArray(data.students)) {
                students = data.students;
                admTotalCount = data.total || data.students.length;
                admTotalPages = data.pages || 1;
            } else {
                students = [];
                admTotalCount = 0;
                admTotalPages = 1;
            }
            renderAdmissionsTable();
            renderAdmissionsPagination();
        })
        .catch(err => {
            console.error("Fetch admissions error:", err);
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color:#EF4444;">⚠️ Unable to load applications. <button class="btn-sm btn-primary" onclick="fetchAdmissions(1)" style="margin-left:8px;">Retry</button></td></tr>`;
            }
        });
}

function renderAdmissionsTable() {
    const tbody = document.getElementById("admissionsTableBody") || document.getElementById("studentTableBody");
    if (!tbody) return;

    if (!students || students.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 48px 20px; color: #64748B;">
                    <div style="font-size: 40px; margin-bottom: 8px;">📂</div>
                    <strong style="font-size: 16px; color: #1E293B; display:block;">No applications found.</strong>
                    <p style="margin: 4px 0 16px 0; font-size: 13px;">Try changing your filter settings or submit a new candidate application.</p>
                    <a href="index.html" class="btn-adm-primary" style="display:inline-flex; align-items:center; text-decoration:none; gap:6px;">+ New Application</a>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = students.map(s => {
        const appId = s.application_id || `ADM-2026-${String(s.id).padStart(4, '0')}`;
        const fullName = escapeHtml(s.fullName || 'N/A');
        const email = escapeHtml(s.email || 'N/A');
        const mobile = escapeHtml(s.mobile || 'N/A');
        const dept = escapeHtml(s.department || 'N/A');
        const course = escapeHtml(s.course || `B.Tech in ${dept}`);
        const dateStr = escapeHtml(s.created_at ? s.created_at.split(' ')[0] : 'N/A');
        const status = s.status || 'Pending Verification';

        let statusClass = 'badge-pending';
        let statusIcon = '⌛';
        if (status === 'Approved' || status === 'Verified') {
            statusClass = 'badge-approved';
            statusIcon = '✅';
        } else if (status === 'Under Review') {
            statusClass = 'badge-review';
            statusIcon = '🔍';
        } else if (status === 'Rejected') {
            statusClass = 'badge-rejected';
            statusIcon = '❌';
        } else if (status === 'Enrolled') {
            statusClass = 'badge-enrolled';
            statusIcon = '🎓';
        } else if (status === 'Documents Verified') {
            statusClass = 'badge-doc';
            statusIcon = '📄';
        }

        const photoChip = s.doc_status_photo === 'Verified'
            ? '<span class="doc-chip doc-chip-verified">✓ Photo</span>'
            : (s.doc_status_photo === 'Rejected' ? '<span class="doc-chip doc-chip-rejected">❌ Photo</span>' : '<span class="doc-chip doc-chip-pending">⌛ Photo</span>');

        const doc10Chip = s.doc_status_10th === 'Verified'
            ? '<span class="doc-chip doc-chip-verified">✓ 10th</span>'
            : (s.doc_status_10th === 'Rejected' ? '<span class="doc-chip doc-chip-rejected">❌ 10th</span>' : '<span class="doc-chip doc-chip-pending">⌛ 10th</span>');

        const doc12Chip = s.doc_status_12th === 'Verified'
            ? '<span class="doc-chip doc-chip-verified">✓ 12th</span>'
            : (s.doc_status_12th === 'Rejected' ? '<span class="doc-chip doc-chip-rejected">❌ 12th</span>' : '<span class="doc-chip doc-chip-pending">⌛ 12th</span>');

        const isApproved = (status === 'Approved' || status === 'Verified' || status === 'Documents Verified');
        const isEnrolled = s.is_enrolled || status === 'Enrolled';

        return `
            <tr>
                <td><span class="adm-id-badge">${appId}</span></td>
                <td>
                    <div class="adm-user-cell">
                        <div class="adm-avatar">${fullName.charAt(0).toUpperCase()}</div>
                        <div>
                            <strong class="adm-user-name">${fullName}</strong>
                            ${s.enrollment_number ? `<small style="color:#059669; font-weight:700; display:block;">ENR: ${escapeHtml(s.enrollment_number)}</small>` : ''}
                        </div>
                    </div>
                </td>
                <td>
                    <div><a href="mailto:${email}" class="adm-link">${email}</a></div>
                    <small class="adm-subtext">📞 ${mobile}</small>
                </td>
                <td>
                    <strong class="adm-dept-title">${dept}</strong>
                    <div class="adm-subtext">${course}</div>
                </td>
                <td><span class="adm-date-badge">📅 ${dateStr}</span></td>
                <td>
                    <div class="adm-doc-chips">
                        ${photoChip}
                        ${doc10Chip}
                        ${doc12Chip}
                    </div>
                </td>
                <td>
                    <span class="adm-status-badge ${statusClass}">
                        <span>${statusIcon}</span> ${escapeHtml(status)}
                    </span>
                </td>
                <td style="text-align: right;">
                    <div class="adm-action-group">
                        <button class="btn-adm-table btn-table-view" onclick="openViewModal(${s.id})" title="View Complete Details">👁 View</button>
                        ${!isEnrolled && (status === 'Pending Verification' || status === 'Under Review') ? `
                            <button class="btn-adm-table btn-table-approve" onclick="quickApproveApplication(${s.id})" title="Verify &amp; Approve Candidate">✓ Verify</button>
                        ` : ''}
                        ${!isEnrolled && isApproved ? `
                            <button class="btn-adm-table btn-table-convert" onclick="openConvertModal(${s.id})" title="Convert to Enrolled Student">🎓 Convert</button>
                        ` : ''}
                        ${!isEnrolled && status !== 'Rejected' ? `
                            <button class="btn-adm-table btn-table-reject" onclick="openRejectionModal(${s.id})" title="Reject Candidate Application">❌ Reject</button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderAdmissionsPagination() {
    const infoEl = document.getElementById("admPaginationInfo");
    const controlsEl = document.getElementById("admPaginationControls");
    const toolbarCountEl = document.getElementById("admToolbarCount");
    if (!infoEl || !controlsEl) return;

    const start = admTotalCount === 0 ? 0 : (admCurrentPage - 1) * admLimit + 1;
    const end = Math.min(admCurrentPage * admLimit, admTotalCount);

    const infoText = `Showing ${start}–${end} of ${admTotalCount} applications`;
    infoEl.textContent = infoText;
    if (toolbarCountEl) toolbarCountEl.textContent = infoText;

    let btnsHtml = `
        <button class="page-btn" ${admCurrentPage <= 1 ? 'disabled' : ''} onclick="fetchAdmissions(${admCurrentPage - 1})">◀ Previous</button>
    `;

    for (let p = 1; p <= admTotalPages; p++) {
        if (p === 1 || p === admTotalPages || (p >= admCurrentPage - 1 && p <= admCurrentPage + 1)) {
            btnsHtml += `<button class="page-btn ${p === admCurrentPage ? 'active' : ''}" onclick="fetchAdmissions(${p})">${p}</button>`;
        } else if (p === admCurrentPage - 2 || p === admCurrentPage + 2) {
            btnsHtml += `<span style="padding:4px 8px; color:#64748B;">...</span>`;
        }
    }

    btnsHtml += `
        <button class="page-btn" ${admCurrentPage >= admTotalPages ? 'disabled' : ''} onclick="fetchAdmissions(${admCurrentPage + 1})">Next ▶</button>
    `;

    controlsEl.innerHTML = btnsHtml;
}

function fetchAdmissionsAnalytics() {
    fetch('/api/admissions/analytics')
        .then(res => {
            if (!res.ok) throw new Error("Analytics API error");
            return res.json();
        })
        .then(data => {
            if (document.getElementById("admKpiTotal")) document.getElementById("admKpiTotal").textContent = data.total_applications || 0;
            if (document.getElementById("admKpiPending")) document.getElementById("admKpiPending").textContent = data.pending_review || 0;
            if (document.getElementById("admKpiReview")) document.getElementById("admKpiReview").textContent = data.under_review || 0;
            if (document.getElementById("admKpiApproved")) document.getElementById("admKpiApproved").textContent = data.approved || 0;
            if (document.getElementById("admKpiRejected")) document.getElementById("admKpiRejected").textContent = data.rejected || 0;
            if (document.getElementById("admKpiRate")) document.getElementById("admKpiRate").textContent = `${data.admission_rate || 0}%`;

            if (data.pipeline) {
                const p = data.pipeline;
                if (document.getElementById("pipeCountAll")) document.getElementById("pipeCountAll").textContent = data.total_applications || 0;
                if (document.getElementById("pipeCountNew")) document.getElementById("pipeCountNew").textContent = p.new || 0;
                if (document.getElementById("pipeCountReview")) document.getElementById("pipeCountReview").textContent = p.under_review || 0;
                if (document.getElementById("pipeCountDoc")) document.getElementById("pipeCountDoc").textContent = p.documents_verification || 0;
                if (document.getElementById("pipeCountApproved")) document.getElementById("pipeCountApproved").textContent = p.approved || 0;
                if (document.getElementById("pipeCountEnrolled")) document.getElementById("pipeCountEnrolled").textContent = p.enrolled || 0;
            }

            const attContent = document.getElementById("admAttentionContent");
            if (attContent && data.attention_required) {
                const att = data.attention_required;
                let attHtml = '';
                if (att.pending_documents > 0) {
                    attHtml += `<div class="att-chip att-chip-amber"><span class="att-chip-icon">📁</span> <span><strong>${att.pending_documents}</strong> candidate document verifications pending</span></div>`;
                }
                if (att.awaiting_review > 0) {
                    attHtml += `<div class="att-chip att-chip-amber"><span class="att-chip-icon">⌛</span> <span><strong>${att.awaiting_review}</strong> applications awaiting review</span></div>`;
                }
                if (att.approved_awaiting_enrollment > 0) {
                    attHtml += `<div class="att-chip att-chip-purple"><span class="att-chip-icon">🎓</span> <span><strong>${att.approved_awaiting_enrollment}</strong> approved candidates awaiting enrollment conversion</span></div>`;
                }
                if (!attHtml) {
                    attHtml = `<div class="att-chip" style="color:#059669; border-color:#A7F3D0; background:#ECFDF5;"><span class="att-chip-icon">✅</span> <span>No admission issues require attention. System running clean.</span></div>`;
                }
                attContent.innerHTML = attHtml;
            }

            renderAdmissionsCharts(data);
        })
        .catch(err => {
            console.error("Fetch analytics error:", err);
        });
}

function renderAdmissionsCharts(data) {
    if (typeof Chart === 'undefined') return;

    const deptCtx = document.getElementById("admDeptChart");
    if (deptCtx && data.by_department) {
        const labels = Object.keys(data.by_department);
        const totals = labels.map(k => data.by_department[k].total);
        const approveds = labels.map(k => data.by_department[k].approved);

        if (admChartDeptInstance) admChartDeptInstance.destroy();
        admChartDeptInstance = new Chart(deptCtx, {
            type: 'bar',
            data: {
                labels: labels.map(l => l.replace(' Engineering', '')),
                datasets: [
                    { label: 'Total Applications', data: totals, backgroundColor: '#2563EB', borderRadius: 4 },
                    { label: 'Approved', data: approveds, backgroundColor: '#059669', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
            }
        });
    }

    const statusCtx = document.getElementById("admStatusChart");
    if (statusCtx && data.pipeline) {
        const p = data.pipeline;
        if (admChartStatusInstance) admChartStatusInstance.destroy();
        admChartStatusInstance = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['New', 'Under Review', 'Doc Verified', 'Approved', 'Rejected', 'Enrolled'],
                datasets: [{
                    data: [p.new, p.under_review, p.documents_verification, p.approved, p.rejected, p.enrolled],
                    backgroundColor: ['#F59E0B', '#3B82F6', '#8B5CF6', '#10B981', '#EF4444', '#14B8A6']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } }
            }
        });
    }
}

function filterPipelineStage(stage) {
    admActivePipelineStage = stage;

    document.querySelectorAll(".adm-pipe-card").forEach(el => el.classList.remove("active"));
    if (stage === "") {
        if (document.getElementById("pipeStageAll")) document.getElementById("pipeStageAll").classList.add("active");
    } else if (stage === "Pending Verification") {
        if (document.getElementById("pipeStageNew")) document.getElementById("pipeStageNew").classList.add("active");
    } else if (stage === "Under Review") {
        if (document.getElementById("pipeStageReview")) document.getElementById("pipeStageReview").classList.add("active");
    } else if (stage === "Documents Verified") {
        if (document.getElementById("pipeStageDoc")) document.getElementById("pipeStageDoc").classList.add("active");
    } else if (stage === "Approved") {
        if (document.getElementById("pipeStageApproved")) document.getElementById("pipeStageApproved").classList.add("active");
    } else if (stage === "Enrolled") {
        if (document.getElementById("pipeStageEnrolled")) document.getElementById("pipeStageEnrolled").classList.add("active");
    }

    const statusFilter = document.getElementById("admStatusFilter");
    if (statusFilter) statusFilter.value = stage;

    fetchAdmissions(1);
}

function applyAdmissionsFilters() {
    fetchAdmissions(1);
}

function resetAdmissionsFilters() {
    if (document.getElementById("admSearchInput")) document.getElementById("admSearchInput").value = "";
    if (document.getElementById("admDeptFilter")) document.getElementById("admDeptFilter").value = "";
    if (document.getElementById("admCourseFilter")) document.getElementById("admCourseFilter").value = "";
    if (document.getElementById("admStatusFilter")) document.getElementById("admStatusFilter").value = "";
    if (document.getElementById("admYearFilter")) document.getElementById("admYearFilter").value = "2026-27";
    if (document.getElementById("admFromDate")) document.getElementById("admFromDate").value = "";
    if (document.getElementById("admToDate")) document.getElementById("admToDate").value = "";
    admActivePipelineStage = "";
    document.querySelectorAll(".pipeline-stage").forEach(el => el.classList.remove("active"));
    document.getElementById("pipeStageAll").classList.add("active");
    fetchAdmissions(1);
}

function openNewAdmissionModal() {
    window.location.href = "index.html";
}

function closeNewAdmissionModal() {
    const modal = document.getElementById("newAdmissionModal");
    if (modal) modal.style.display = "none";
}

function autoFillCourseOptions(dept) {
    const courseInput = document.getElementById("newCourse");
    if (courseInput && dept) {
        courseInput.value = `B.Tech in ${dept}`;
    }
}

function handleNewAdmissionSubmit(e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append("fullName", document.getElementById("newFullName").value.trim());
    formData.append("fatherName", document.getElementById("newFatherName").value.trim());
    formData.append("motherName", document.getElementById("newMotherName").value.trim());
    formData.append("dob", document.getElementById("newDob").value);
    formData.append("gender", document.getElementById("newGender").value);
    formData.append("bloodGroup", document.getElementById("newBloodGroup").value);
    formData.append("email", document.getElementById("newEmail").value.trim());
    formData.append("mobile", document.getElementById("newMobile").value.trim());
    formData.append("altMobile", document.getElementById("newAltMobile").value.trim());
    formData.append("aadhaar", document.getElementById("newAadhaar").value.trim());
    formData.append("nationality", document.getElementById("newNationality").value.trim());
    formData.append("address", document.getElementById("newAddress").value.trim());
    formData.append("city", document.getElementById("newCity").value.trim());
    formData.append("state", document.getElementById("newState").value.trim());
    formData.append("pincode", document.getElementById("newPincode").value.trim());

    formData.append("board10", document.getElementById("newBoard10").value.trim());
    formData.append("percentage10", document.getElementById("newPercentage10").value);
    formData.append("board12", document.getElementById("newBoard12").value.trim());
    formData.append("percentage12", document.getElementById("newPercentage12").value);
    formData.append("entranceExam", document.getElementById("newEntranceExam").value);
    formData.append("entranceScore", document.getElementById("newEntranceScore").value);

    formData.append("department", document.getElementById("newDepartment").value);
    formData.append("course", document.getElementById("newCourse").value.trim());
    formData.append("admissionType", document.getElementById("newAdmissionType").value);
    formData.append("academic_year", document.getElementById("newAcademicYear").value);

    const photoFile = document.getElementById("newPhoto").files[0];
    const doc10File = document.getElementById("newMarksheet10").files[0];
    const doc12File = document.getElementById("newMarksheet12").files[0];
    const lcFile = document.getElementById("newLeavingCert").files[0];

    if (photoFile) formData.append("photo", photoFile);
    if (doc10File) formData.append("marksheet10", doc10File);
    if (doc12File) formData.append("marksheet12", doc12File);
    if (lcFile) formData.append("leavingCertificate", lcFile);

    fetch('/api/students', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json().then(data => ({ ok: res.ok, status: res.status, data })))
    .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || "Failed to submit application");
        showToast("New admission application submitted successfully! Application ID: #" + (data.student ? data.student.id : ""), "success");
        closeNewAdmissionModal();
        document.getElementById("newAdmissionForm").reset();
        loadAdmissionsPortal();
    })
    .catch(err => {
        console.error("New admission submit error:", err);
        showToast(err.message, "error");
    });
}

function quickApproveApplication(id) {
    if (!confirm("Are you sure you want to approve this candidate application?")) return;

    fetch(`/api/admissions/${id}/approve`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.error || "Approval failed");
            showToast(data.message || "Application approved successfully!", "success");
            loadAdmissionsPortal(admCurrentPage);
        })
        .catch(err => {
            console.error("Approval error:", err);
            showToast(err.message, "error");
        });
}

let activeRejectionId = null;
function openRejectionModal(id) {
    activeRejectionId = id;
    document.getElementById("rejectionReasonInput").value = "";
    document.getElementById("rejectionModal").style.display = "flex";
}

function closeRejectionModal() {
    activeRejectionId = null;
    document.getElementById("rejectionModal").style.display = "none";
}

function submitApplicationRejection() {
    if (!activeRejectionId) return;
    const reason = document.getElementById("rejectionReasonInput").value.trim();
    if (!reason) {
        alert("Please provide a reason for rejecting the application.");
        return;
    }

    fetch(`/api/admissions/${activeRejectionId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
    })
    .then(res => res.json())
    .then(data => {
        if (!data.success) throw new Error(data.error || "Rejection failed");
        showToast("Application rejected successfully.", "success");
        closeRejectionModal();
        loadAdmissionsPortal(admCurrentPage);
    })
    .catch(err => {
        console.error("Rejection error:", err);
        showToast(err.message, "error");
    });
}

let activeConvertId = null;
function openConvertModal(id) {
    activeConvertId = id;
    const student = students.find(s => Number(s.id) === Number(id));
    const bodyEl = document.getElementById("convertModalBody");
    if (student && bodyEl) {
        bodyEl.innerHTML = `
            <div style="background:#F8FAFC; border-radius:8px; padding:12px; margin-bottom:16px;">
                <strong style="color:#0F172A; font-size:16px;">${escapeHtml(student.fullName)}</strong>
                <div style="font-size:13px; color:#64748B; margin-top:4px;">
                    Department: <strong>${escapeHtml(student.department)}</strong> | App ID: <strong>${student.application_id || '#'+student.id}</strong>
                </div>
            </div>
            <p style="font-size:13.5px; color:#334155;">This action will convert this approved candidate into an officially enrolled student, generate their unique Enrollment Number, and update the department seat matrix.</p>
            <div style="margin-top:16px; display:flex; justify-content:flex-end; gap:10px;">
                <button type="button" class="btn-secondary" onclick="closeConvertModal()">Cancel</button>
                <button type="button" class="btn-success" onclick="confirmConvertToStudent(${student.id})" style="background:#059669; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer;">Confirm Enrollment</button>
            </div>
        `;
    }
    document.getElementById("convertModal").style.display = "flex";
}

function closeConvertModal() {
    activeConvertId = null;
    document.getElementById("convertModal").style.display = "none";
}

function confirmConvertToStudent(id) {
    fetch(`/api/admissions/${id}/convert-to-student`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.error || "Conversion failed");
            const zprnCode = data.zprn || data.enrollment_number || "Generated";
            showToast(`Candidate converted to enrolled student! Official ZPRN: ${zprnCode}`, "success");
            closeConvertModal();
            loadAdmissionsPortal(admCurrentPage);
        })
        .catch(err => {
            console.error("Convert error:", err);
            showToast(err.message, "error");
        });
}

function exportAdmissionsReport() {
    const searchVal = document.getElementById("admSearchInput") ? document.getElementById("admSearchInput").value.trim() : "";
    const deptVal = document.getElementById("admDeptFilter") ? document.getElementById("admDeptFilter").value.trim() : "";
    const courseVal = document.getElementById("admCourseFilter") ? document.getElementById("admCourseFilter").value.trim() : "";
    const statusVal = document.getElementById("admStatusFilter") ? document.getElementById("admStatusFilter").value.trim() : "";

    const params = new URLSearchParams({ search: searchVal, dept: deptVal, course: courseVal, status: statusVal });
    window.location.href = `/api/admissions/export?${params.toString()}`;
}

// ============================================================
// STUDENTS MODULE MANAGEMENT LOGIC
// ============================================================

let stuCurrentPage = 1;
let stuLimit = 20;
let stuTotalCount = 0;
let stuDbTotalCount = 0;

async function fetchStudentsModule(page = 1) {
    stuCurrentPage = page;
    const searchVal = document.getElementById("stuSearchInput") ? document.getElementById("stuSearchInput").value.trim() : "";
    const deptVal = document.getElementById("stuDeptFilter") ? document.getElementById("stuDeptFilter").value.trim() : "";
    const courseVal = document.getElementById("stuCourseFilter") ? document.getElementById("stuCourseFilter").value.trim() : "";
    const yearVal = document.getElementById("stuYearFilter") ? document.getElementById("stuYearFilter").value.trim() : "";
    const genderVal = document.getElementById("stuGenderFilter") ? document.getElementById("stuGenderFilter").value.trim() : "";
    const statusVal = document.getElementById("stuStatusFilter") ? document.getElementById("stuStatusFilter").value.trim() : "";

    const queryParams = {
        page: stuCurrentPage,
        limit: stuLimit
    };
    if (searchVal) queryParams.search = searchVal;
    if (deptVal) queryParams.dept = deptVal;
    if (courseVal) queryParams.course = courseVal;
    if (yearVal) queryParams.academic_year = yearVal;
    if (genderVal) queryParams.gender = genderVal;
    if (statusVal) queryParams.status = statusVal;

    const params = new URLSearchParams(queryParams);

    const tbodyEl = document.getElementById("studentTableBody");
    if (tbodyEl) {
        tbodyEl.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #64748B;">
                    <div style="font-size: 24px; margin-bottom: 8px;">⌛</div>
                    <div>Loading student directory from database...</div>
                </td>
            </tr>
        `;
    }

    try {
        const response = await fetch(`/api/students?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch students data");
        const data = await response.json();

        console.log("Students API response:", data);

        let studentsList = [];
        if (Array.isArray(data)) {
            studentsList = data;
            stuTotalCount = data.length;
        } else if (data && Array.isArray(data.students)) {
            studentsList = data.students;
            stuTotalCount = (data.total !== undefined) ? data.total : data.students.length;
        } else {
            studentsList = [];
            stuTotalCount = 0;
        }

        console.log("Students loaded count:", studentsList.length);
        console.log("Active filters:", { search: searchVal, dept: deptVal, course: courseVal, academic_year: yearVal, gender: genderVal, status: statusVal });
        console.log("Filtered students count:", studentsList.length);

        renderStudentsTableFromData(studentsList);
        renderStudentsPagination();

    } catch (err) {
        console.error("fetchStudentsModule error:", err);
        if (tbodyEl) {
            tbodyEl.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 30px; color: #EF4444;">
                        ⚠️ Unable to load student records.
                    </td>
                </tr>
            `;
        }
    }
}

async function fetchStudentKpiStats() {
    try {
        const response = await fetch("/api/students/stats");
        if (!response.ok) return;
        const stats = await response.json();

        stuDbTotalCount = stats.total_students || 0;

        const totalEl = document.getElementById("stuKpiTotal");
        const activeEl = document.getElementById("stuKpiActive");
        const maleEl = document.getElementById("stuKpiMale");
        const femaleEl = document.getElementById("stuKpiFemale");
        const newEl = document.getElementById("stuKpiNew");

        if (totalEl) totalEl.textContent = stats.total_students || 0;
        if (activeEl) activeEl.textContent = stats.active_students || 0;
        if (maleEl) maleEl.textContent = stats.male_students || 0;
        if (femaleEl) femaleEl.textContent = stats.female_students || 0;
        if (newEl) newEl.textContent = stats.new_students || 0;

    } catch (err) {
        console.error("fetchStudentKpiStats error:", err);
    }
}

function renderStudentsTableFromData(list) {
    const tbodyEl = document.getElementById("studentTableBody");
    const countEl = document.getElementById("stuToolbarCount");
    if (!tbodyEl) return;

    const totalDisplayCount = stuDbTotalCount || stuTotalCount || (list ? list.length : 0);

    if (countEl) {
        countEl.textContent = `Showing ${list.length} of ${totalDisplayCount} records`;
    }

    if (!list || list.length === 0) {
        tbodyEl.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #64748B;">
                    <div style="font-size: 28px; margin-bottom: 8px;">📂</div>
                    <div style="font-weight: 600; color: #1E293B;">No matching student records found.</div>
                    <small>Try clearing search filters or selecting a different department/academic year.</small>
                </td>
            </tr>
        `;
        return;
    }

    tbodyEl.innerHTML = list.map((s, idx) => {
        const fullName = escapeHtml(s.fullName || 'Unknown Student');
        const email = escapeHtml(s.email || 'N/A');
        const mobile = escapeHtml(s.mobile || 'N/A');
        const dept = escapeHtml(s.department || 'General');
        const course = escapeHtml(s.course || `B.Tech in ${dept}`);
        const year = escapeHtml(s.academic_year || '2026-27');
        const gender = escapeHtml(s.gender || 'Not Specified');
        const status = s.status || 'Pending Verification';
        const dateStr = s.created_at ? s.created_at.split(' ')[0] : 'N/A';

        const displayId = s.enrollment_number ? s.enrollment_number : `ADM-2026-${String(s.id).padStart(4, '0')}`;

        const nameParts = fullName.split(' ').filter(Boolean);
        const initials = nameParts.length >= 2
            ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
            : fullName.substring(0, 2).toUpperCase();

        const avatarHtml = s.photo
            ? `<img src="/uploads/${escapeHtml(s.photo)}" class="stu-avatar-img" alt="${fullName}">`
            : `<div class="stu-avatar-initials">${initials}</div>`;

        let statusClass = 'badge-pending';
        let statusIcon = '⌛';
        if (status === 'Enrolled') {
            statusClass = 'badge-enrolled';
            statusIcon = '🎓';
        } else if (status === 'Approved' || status === 'Verified' || status === 'Documents Verified') {
            statusClass = 'badge-approved';
            statusIcon = '✅';
        } else if (status === 'Under Review') {
            statusClass = 'badge-review';
            statusIcon = '🔍';
        } else if (status === 'Rejected') {
            statusClass = 'badge-rejected';
            statusIcon = '❌';
        }

        const genderClass = gender === 'Male' ? 'stu-gender-male' : (gender === 'Female' ? 'stu-gender-female' : 'stu-gender-other');

        return `
            <tr>
                <td><span class="stu-id-badge">${displayId}</span></td>
                <td>
                    <div class="stu-user-cell">
                        ${avatarHtml}
                        <div>
                            <strong class="stu-user-name">${fullName}</strong>
                            ${s.enrollment_number ? `<small class="stu-enr-tag">ENR: ${escapeHtml(s.enrollment_number)}</small>` : ''}
                        </div>
                    </div>
                </td>
                <td>
                    <div><a href="mailto:${email}" class="stu-link">${email}</a></div>
                    <small class="stu-subtext">📞 ${mobile}</small>
                </td>
                <td>
                    <strong class="stu-dept-title">${dept}</strong>
                    <div class="stu-subtext">${course}</div>
                </td>
                <td><span class="stu-year-badge">${year}</span></td>
                <td><span class="stu-gender-badge ${genderClass}">${gender}</span></td>
                <td><span class="stu-date-badge">📅 ${dateStr}</span></td>
                <td>
                    <span class="adm-status-badge ${statusClass}">
                        <span>${statusIcon}</span> ${escapeHtml(status)}
                    </span>
                </td>
                <td style="text-align: right;">
                    <div class="stu-action-group">
                        <button type="button" class="btn-stu-tbl btn-tbl-view" onclick="openViewModal(${s.id})" title="View Complete Profile">👁 View</button>
                        <button type="button" class="btn-stu-tbl btn-tbl-edit" onclick="openStudentEditModal(${s.id})" title="Edit Student Record">✏️ Edit</button>
                        <button type="button" class="btn-stu-tbl btn-tbl-delete" onclick="deleteStudent(${s.id})" title="Delete Record">🗑 Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderStudentsPagination() {
    const infoEl = document.getElementById("stuPaginationInfo");
    const controlsEl = document.getElementById("stuPaginationControls");
    if (!infoEl || !controlsEl) return;

    const start = stuTotalCount === 0 ? 0 : (stuCurrentPage - 1) * stuLimit + 1;
    const end = Math.min(stuCurrentPage * stuLimit, stuTotalCount);
    const totalPages = Math.ceil(stuTotalCount / stuLimit) || 1;

    infoEl.textContent = `Showing ${start}–${end} of ${stuTotalCount} students`;

    controlsEl.innerHTML = `
        <button type="button" class="stu-page-btn" ${stuCurrentPage <= 1 ? 'disabled' : ''} onclick="fetchStudentsModule(${stuCurrentPage - 1})">
            ◀ Prev
        </button>
        <span class="stu-page-active">Page ${stuCurrentPage} of ${totalPages}</span>
        <button type="button" class="stu-page-btn" ${stuCurrentPage >= totalPages ? 'disabled' : ''} onclick="fetchStudentsModule(${stuCurrentPage + 1})">
            Next ▶
        </button>
    `;
}

function applyStudentFilters() {
    fetchStudentsModule(1);
    fetchStudentKpiStats();
}

function resetStudentFilters() {
    if (document.getElementById("stuSearchInput")) document.getElementById("stuSearchInput").value = "";
    if (document.getElementById("stuDeptFilter")) document.getElementById("stuDeptFilter").value = "";
    if (document.getElementById("stuCourseFilter")) document.getElementById("stuCourseFilter").value = "";
    if (document.getElementById("stuYearFilter")) document.getElementById("stuYearFilter").value = "";
    if (document.getElementById("stuGenderFilter")) document.getElementById("stuGenderFilter").value = "";
    if (document.getElementById("stuStatusFilter")) document.getElementById("stuStatusFilter").value = "";

    fetchStudentsModule(1);
    fetchStudentKpiStats();
}

function openStudentEditModal(studentId) {
    fetch(`/api/students/${studentId}`)
        .then(res => {
            if (!res.ok) throw new Error("Student not found");
            return res.json();
        })
        .then(s => {
            document.getElementById("editStudentId").value = s.id;
            document.getElementById("editFullName").value = s.fullName || "";
            document.getElementById("editEmail").value = s.email || "";
            document.getElementById("editMobile").value = s.mobile || "";
            document.getElementById("editGender").value = s.gender || "Male";
            document.getElementById("editDepartment").value = s.department || "Computer Engineering";
            document.getElementById("editCourse").value = s.course || `B.Tech in ${s.department || 'Computer Engineering'}`;
            document.getElementById("editAcademicYear").value = s.academic_year || "2026-27";
            document.getElementById("editStatus").value = s.status || "Enrolled";

            document.getElementById("stuEditModal").style.display = "flex";
        })
        .catch(err => {
            console.error("openStudentEditModal error:", err);
            showToast("Failed to load student details for editing", "error");
        });
}

function closeStudentEditModal() {
    document.getElementById("stuEditModal").style.display = "none";
}

async function saveStudentEdits(event) {
    event.preventDefault();
    const studentId = document.getElementById("editStudentId").value;
    const saveBtn = document.getElementById("saveEditStudentBtn");

    const payload = {
        fullName: document.getElementById("editFullName").value.trim(),
        email: document.getElementById("editEmail").value.trim(),
        mobile: document.getElementById("editMobile").value.trim(),
        gender: document.getElementById("editGender").value.trim(),
        department: document.getElementById("editDepartment").value.trim(),
        course: document.getElementById("editCourse").value.trim(),
        academic_year: document.getElementById("editAcademicYear").value.trim(),
        status: document.getElementById("editStatus").value.trim()
    };

    try {
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = "Saving...";
        }

        const res = await fetch(`/api/students/${studentId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update student");

        showToast("Student record updated successfully!", "success");
        closeStudentEditModal();
        fetchStudentsModule(stuCurrentPage);
        fetchStudentKpiStats();

    } catch (err) {
        console.error("saveStudentEdits error:", err);
        showToast(err.message, "error");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Changes";
        }
    }
}

function exportStudentsReport() {
    exportAdmissionsReport();
}

// ============================================================
// DEPARTMENT MANAGEMENT MODULE LOGIC
// ============================================================

let cachedDepartments = [];

async function loadDepartments() {
    const searchVal = document.getElementById("dptSearchInput") ? document.getElementById("dptSearchInput").value.trim() : "";
    const statusVal = document.getElementById("dptStatusFilter") ? document.getElementById("dptStatusFilter").value.trim() : "";

    const params = new URLSearchParams({ search: searchVal, status: statusVal });
    const gridContainer = document.getElementById("departmentsGridContainer");

    if (gridContainer) {
        gridContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 50px; color: #64748B;">
                <div style="font-size: 28px; margin-bottom: 8px;">⌛</div>
                <div>Loading department directory from database...</div>
            </div>
        `;
    }

    try {
        const response = await fetch(`/api/departments?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch department data");
        const data = await response.json();

        cachedDepartments = data.departments || [];

        // Update KPI metrics
        if (data.summary) {
            if (document.getElementById("dptKpiTotal")) document.getElementById("dptKpiTotal").textContent = data.summary.total_departments || 0;
            if (document.getElementById("dptKpiActive")) document.getElementById("dptKpiActive").textContent = data.summary.active_departments || 0;
            if (document.getElementById("dptKpiStudents")) document.getElementById("dptKpiStudents").textContent = data.summary.total_students || 0;
            if (document.getElementById("dptKpiCourses")) document.getElementById("dptKpiCourses").textContent = data.summary.total_courses || 0;
        }

        renderDepartmentsGrid(cachedDepartments);

    } catch (err) {
        console.error("loadDepartments error:", err);
        if (gridContainer) {
            gridContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #EF4444;">
                    ⚠️ Unable to load departments. Please ensure backend server is running.
                </div>
            `;
        }
    }
}

// Backwards-compatible alias
function fetchDepartmentsModule() {
    return loadDepartments();
}

function renderDepartmentsGrid(list) {
    const container = document.getElementById("departmentsGridContainer");
    if (!container) return;

    if (!list || list.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 50px; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0;">
                <div style="font-size: 32px; margin-bottom: 8px;">🏢</div>
                <h4 style="margin: 0 0 4px 0; color: #0F172A;">No matching departments found</h4>
                <p style="margin: 0; font-size: 13px; color: #64748B;">Try clearing search filters or adding a new academic department.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = list.map(d => {
        const id = d.id;
        const name = escapeHtml(d.name);
        const code = escapeHtml(d.code);
        const hod = escapeHtml(d.hod_name || 'To Be Appointed');
        const hodEmail = escapeHtml(d.hod_email || '');
        const desc = escapeHtml(d.description || 'Standard Engineering Degree Program');
        const totalSeats = d.total_seats || 60;
        const studentCount = d.student_count || 0;
        const courseCount = d.course_count || 1;
        const occupancy = d.occupancy_rate || 0;
        const status = d.status || 'Active';
        const isInactive = status === 'Inactive';

        const barColor = isInactive ? '#94A3B8' : (occupancy >= 90 ? '#DC2626' : (occupancy >= 70 ? '#D97706' : '#2563EB'));

        return `
            <div class="dept-card dpt-card ${isInactive ? 'dpt-card-inactive' : ''}">
                <div class="dept-card-header dpt-card-top">
                    <div class="dpt-code-badge">${code}</div>
                    <span class="dpt-status-badge ${isInactive ? 'status-inactive' : 'status-active'}">
                        <span>${isInactive ? '⏸' : '✓'}</span> ${status}
                    </span>
                </div>

                <h3 class="dpt-card-title">${name}</h3>
                <p class="dpt-card-desc">${desc}</p>

                <div class="dpt-hod-box">
                    <div class="dpt-hod-avatar">👤</div>
                    <div class="dpt-hod-info">
                        <small>HEAD OF DEPARTMENT (HOD)</small>
                        <strong>${hod}</strong>
                        ${hodEmail ? `<a href="mailto:${hodEmail}" class="dpt-hod-email">${hodEmail}</a>` : ''}
                    </div>
                </div>

                <div class="dpt-stats-row">
                    <div class="dpt-stat-item">
                        <small>ENROLLED STUDENTS</small>
                        <strong>👥 ${studentCount}</strong>
                    </div>
                    <div class="dpt-stat-item">
                        <small>COURSES</small>
                        <strong>🎓 ${courseCount} B.Tech</strong>
                    </div>
                    <div class="dpt-stat-item">
                        <small>INTAKE SEATS</small>
                        <strong>🪑 ${totalSeats}</strong>
                    </div>
                </div>

                <div class="dpt-occupancy-wrap">
                    <div class="dpt-occupancy-header">
                        <span>Seat Capacity Utilization</span>
                        <strong>${occupancy}% (${studentCount}/${totalSeats})</strong>
                    </div>
                    <div class="dpt-occupancy-bar">
                        <div class="dpt-occupancy-fill" style="width: ${Math.min(occupancy, 100)}%; background: ${barColor};"></div>
                    </div>
                </div>

                <div class="dept-actions dpt-card-actions">
                    <button type="button" class="btn-dpt-card btn-card-view" onclick="openViewDepartmentModal(${id})" title="View Department Details">👁 View</button>
                    <button type="button" class="btn-dpt-card btn-card-edit" onclick="openEditDepartmentModal(${id})" title="Edit Department Info">✏️ Edit</button>
                    <button type="button" class="btn-dpt-card btn-card-delete" onclick="confirmDeleteDepartment(${id})" title="Delete Department">🗑 Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function resetDepartmentFilters() {
    if (document.getElementById("dptSearchInput")) document.getElementById("dptSearchInput").value = "";
    if (document.getElementById("dptStatusFilter")) document.getElementById("dptStatusFilter").value = "";
    fetchDepartmentsModule();
}

function openAddDepartmentModal() {
    if (document.getElementById("dptAddForm")) document.getElementById("dptAddForm").reset();
    document.getElementById("dptAddModal").style.display = "flex";
}

function closeAddDepartmentModal() {
    document.getElementById("dptAddModal").style.display = "none";
}

async function submitNewDepartment(event) {
    event.preventDefault();
    const saveBtn = document.getElementById("saveNewDptBtn");

    const payload = {
        name: document.getElementById("addDptName").value.trim(),
        code: document.getElementById("addDptCode").value.trim().toUpperCase(),
        hod_name: document.getElementById("addDptHodName").value.trim(),
        hod_email: document.getElementById("addDptHodEmail").value.trim(),
        total_seats: parseInt(document.getElementById("addDptSeats").value) || 60,
        status: document.getElementById("addDptStatus").value,
        description: document.getElementById("addDptDesc").value.trim()
    };

    try {
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = "Creating...";
        }

        const res = await fetch("/api/departments", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create department");

        showToast(data.message || "Department created successfully!", "success");
        closeAddDepartmentModal();
        fetchDepartmentsModule();

    } catch (err) {
        console.error("submitNewDepartment error:", err);
        showToast(err.message, "error");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Create Department";
        }
    }
}

function openEditDepartmentModal(deptId) {
    fetch(`/api/departments/${deptId}`)
        .then(res => {
            if (!res.ok) throw new Error("Department not found");
            return res.json();
        })
        .then(d => {
            document.getElementById("editDptId").value = d.id;
            document.getElementById("editDptName").value = d.name || "";
            document.getElementById("editDptCode").value = d.code || "";
            document.getElementById("editDptHodName").value = d.hod_name || "";
            document.getElementById("editDptHodEmail").value = d.hod_email || "";
            document.getElementById("editDptSeats").value = d.total_seats || 60;
            document.getElementById("editDptStatus").value = d.status || "Active";
            document.getElementById("editDptDesc").value = d.description || "";

            document.getElementById("dptEditModal").style.display = "flex";
        })
        .catch(err => {
            console.error("openEditDepartmentModal error:", err);
            showToast("Failed to load department details for editing", "error");
        });
}

function closeEditDepartmentModal() {
    document.getElementById("dptEditModal").style.display = "none";
}

async function submitEditDepartment(event) {
    event.preventDefault();
    const deptId = document.getElementById("editDptId").value;
    const saveBtn = document.getElementById("saveEditDptBtn");

    const payload = {
        name: document.getElementById("editDptName").value.trim(),
        code: document.getElementById("editDptCode").value.trim().toUpperCase(),
        hod_name: document.getElementById("editDptHodName").value.trim(),
        hod_email: document.getElementById("editDptHodEmail").value.trim(),
        total_seats: parseInt(document.getElementById("editDptSeats").value) || 60,
        status: document.getElementById("editDptStatus").value,
        description: document.getElementById("editDptDesc").value.trim()
    };

    try {
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = "Saving...";
        }

        const res = await fetch(`/api/departments/${deptId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update department");

        showToast(data.message || "Department updated successfully!", "success");
        closeEditDepartmentModal();
        fetchDepartmentsModule();

    } catch (err) {
        console.error("submitEditDepartment error:", err);
        showToast(err.message, "error");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Changes";
        }
    }
}

function openViewDepartmentModal(deptId) {
    const modalBody = document.getElementById("dptViewModalBody");
    if (!modalBody) return;

    modalBody.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #64748B;">
            <div style="font-size: 24px; margin-bottom: 8px;">⌛</div>
            <div>Loading department metrics...</div>
        </div>
    `;

    document.getElementById("dptViewModal").style.display = "flex";

    fetch(`/api/departments/${deptId}`)
        .then(res => {
            if (!res.ok) throw new Error("Department details not available");
            return res.json();
        })
        .then(d => {
            const isInactive = d.status === 'Inactive';
            modalBody.innerHTML = `
                <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 20px; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="font-family: monospace; font-size: 13px; font-weight: 800; background: #2563EB; color: white; padding: 3px 10px; border-radius: 4px;">${escapeHtml(d.code)}</span>
                        <span style="font-size: 12px; font-weight: 700; color: ${isInactive ? '#64748B' : '#059669'}; background: ${isInactive ? '#F1F5F9' : '#ECFDF5'}; padding: 3px 10px; border-radius: 12px; border: 1px solid ${isInactive ? '#CBD5E1' : '#A7F3D0'};">
                            ${isInactive ? '⏸ Inactive' : '✓ Active Branch'}
                        </span>
                    </div>
                    <h3 style="margin: 0 0 6px 0; color: #0F172A; font-size: 20px;">${escapeHtml(d.name)}</h3>
                    <p style="margin: 0; color: #475569; font-size: 13.5px; line-height: 1.5;">${escapeHtml(d.description || 'Standard Engineering Degree Program')}</p>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                    <div style="border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; background: white;">
                        <small style="font-size: 10.5px; font-weight: 700; color: #64748B; display: block; margin-bottom: 4px;">HEAD OF DEPARTMENT (HOD)</small>
                        <strong style="font-size: 14px; color: #0F172A; display: block;">👤 ${escapeHtml(d.hod_name)}</strong>
                        ${d.hod_email ? `<small style="color: #2563EB; font-weight: 600;">📧 ${escapeHtml(d.hod_email)}</small>` : ''}
                    </div>

                    <div style="border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; background: white;">
                        <small style="font-size: 10.5px; font-weight: 700; color: #64748B; display: block; margin-bottom: 4px;">SEATING CAPACITY & ENROLLMENT</small>
                        <strong style="font-size: 14px; color: #0F172A; display: block;">👥 ${d.student_count || 0} Enrolled / ${d.total_seats || 60} Seats</strong>
                        <small style="color: #059669; font-weight: 600;">📊 ${d.occupancy_rate || 0}% Capacity Utilization</small>
                    </div>
                </div>

                <div style="border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; background: white;">
                    <small style="font-size: 10.5px; font-weight: 700; color: #64748B; display: block; margin-bottom: 8px;">DEGREE PROGRAMS OFFERED</small>
                    <div style="display: flex; align-items: center; gap: 10px; background: #F1F5F9; padding: 10px 14px; border-radius: 6px;">
                        <span style="font-size: 20px;">🎓</span>
                        <div>
                            <strong style="font-size: 13px; color: #1E293B; display: block;">Bachelor of Technology (B.Tech in ${escapeHtml(d.name)})</strong>
                            <small style="color: #64748B;">4 Years Full-Time Undergraduate Degree Program</small>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
                    <button type="button" class="btn-secondary" onclick="closeViewDepartmentModal()">Close</button>
                </div>
            `;
        })
        .catch(err => {
            console.error("openViewDepartmentModal error:", err);
            modalBody.innerHTML = `<div style="color: #DC2626; padding: 20px;">⚠️ Failed to load department details.</div>`;
        });
}

function closeViewDepartmentModal() {
    document.getElementById("dptViewModal").style.display = "none";
}

async function confirmDeleteDepartment(deptId) {
    const dept = cachedDepartments.find(d => Number(d.id) === Number(deptId));
    const deptName = dept ? dept.name : "this department";

    if (!confirm(`Are you sure you want to delete the department "${deptName}"?\n\nNote: Safe deletion checks will prevent deleting departments that currently have active student records.`)) {
        return;
    }

    try {
        const res = await fetch(`/api/departments/${deptId}`, {
            method: "DELETE",
            headers: {
                "Accept": "application/json"
            }
        });

        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || "Failed to delete department", "error");
            return;
        }

        showToast(data.message || "Department deleted successfully!", "success");
        fetchDepartmentsModule();

    } catch (err) {
        console.error("confirmDeleteDepartment error:", err);
        showToast("Error deleting department: " + err.message, "error");
    }
}

/* ============================================================ */
/* COURSES & CURRICULUM MODULE JAVASCRIPT                       */
/* ============================================================ */

let currentCurriculumData = null;

async function loadCourses() {
    const container = document.getElementById("coursesCurriculumContainer");
    if (container) {
        container.innerHTML = `
            <div style="text-align:center; padding:60px 20px;">
                <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem; border: 4px solid #E2E8F0; border-top-color: #2563EB; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px;"></div>
                <h4 style="color:#1E293B; font-weight:700;">Loading Curriculum & Academic Programs...</h4>
                <p style="color:#64748B; font-size:13px;">Fetching year-wise and semester-wise subject rosters from database.</p>
            </div>
        `;
    }

    const dept = document.getElementById("courseDeptFilter")?.value || "";
    const program = document.getElementById("courseProgramFilter")?.value || "";
    const year = document.getElementById("courseYearFilter")?.value || "";
    const sem = document.getElementById("courseSemFilter")?.value || "";
    const search = document.getElementById("courseSearchInput")?.value || "";

    const params = new URLSearchParams();
    if (dept) params.append("department", dept);
    if (program) params.append("program", program);
    if (year) params.append("academic_year", year);
    if (sem) params.append("semester", sem);
    if (search) params.append("search", search);

    try {
        const response = await fetch(`/api/courses?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        currentCurriculumData = data;
        renderCurriculumView(data);
    } catch (err) {
        console.error("Failed to load curriculum:", err);
        if (container) {
            container.innerHTML = `
                <div style="background:#FEF2F2; border:1px solid #FCA5A5; border-radius:10px; padding:30px; text-align:center; color:#991B1B;">
                    <div style="font-size:32px; margin-bottom:8px;">⚠️</div>
                    <h3 style="margin:0 0 6px 0; font-weight:700;">Unable to Load Curriculum</h3>
                    <p style="margin:0 0 16px 0; font-size:13px; color:#B91C1C;">${err.message || "Network error fetching data."}</p>
                    <button type="button" onclick="loadCourses()" style="background:#DC2626; color:white; border:none; padding:8px 18px; border-radius:6px; font-weight:700; cursor:pointer;">Retry</button>
                </div>
            `;
        }
    }
}

function renderCurriculumView(data) {
    const summary = data.summary || {};
    const curriculum = data.curriculum || [];

    // 1. Update KPI Metrics
    const programsEl = document.getElementById("crsKpiPrograms");
    if (programsEl) programsEl.textContent = summary.total_programs || 0;

    const subjectsEl = document.getElementById("crsKpiSubjects");
    if (subjectsEl) subjectsEl.textContent = summary.total_subjects || 0;

    const creditsEl = document.getElementById("crsKpiCredits");
    if (creditsEl) creditsEl.textContent = summary.total_credits || 0;

    const typesEl = document.getElementById("crsKpiTypes");
    if (typesEl) typesEl.textContent = `${summary.core_subjects || 0} Core / ${summary.elective_subjects || 0} Elec`;

    const container = document.getElementById("coursesCurriculumContainer");
    if (!container) return;

    if (!curriculum || curriculum.length === 0) {
        container.innerHTML = `
            <div style="background:#FFFFFF; border:1px dashed #CBD5E1; border-radius:12px; padding:50px 20px; text-align:center; color:#64748B;">
                <div style="font-size:40px; margin-bottom:10px;">🎓</div>
                <h3 style="color:#1E293B; font-weight:700; margin:0 0 8px 0;">No Curriculum Records Found</h3>
                <p style="font-size:13px; margin:0 0 20px 0;">No subjects match the selected filters or search parameters.</p>
                <button type="button" onclick="openAddCourseModal()" style="background:#2563EB; color:white; border:none; padding:10px 20px; border-radius:6px; font-weight:700; cursor:pointer;">+ Add New Course Program</button>
            </div>
        `;
        return;
    }

    let html = '';

    curriculum.forEach(yearGroup => {
        const yearNum = yearGroup.academic_year;
        const yearName = yearGroup.year_name;
        const sems = yearGroup.semesters || [];

        html += `
            <div class="course-year crs-year-section" style="margin-bottom: 28px;">
                <div class="crs-year-header" style="display:flex; align-items:center; gap:12px; margin-bottom:14px; padding-bottom:8px; border-bottom:2px solid #E2E8F0;">
                    <div style="background:#2563EB; color:white; font-weight:800; font-size:12px; padding:4px 12px; border-radius:6px; text-transform:uppercase; letter-spacing:0.5px;">
                        YEAR ${yearNum}
                    </div>
                    <h3 style="margin:0; font-size:17px; font-weight:800; color:#0F172A;">${yearName} Curriculum</h3>
                </div>

                <div class="crs-semesters-grid" style="display:grid; grid-template-columns: repeat(2, 1fr); gap:16px;">
        `;

        sems.forEach(sem => {
            const semNum = sem.semester_number;
            const subCount = sem.subject_count;
            const credits = sem.total_credits;
            const coreCount = sem.core_count;
            const elecCount = sem.elective_count;
            const subjects = sem.subjects || [];

            html += `
                <div class="course-semester course-semester-card crs-sem-card" style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; padding:20px; box-shadow:0 2px 6px rgba(0,0,0,0.02); display:flex; flex-direction:column; justify-content:space-between; transition:all 0.2s ease;">
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                            <span style="font-size:13px; font-weight:800; color:#2563EB; background:#EFF6FF; padding:4px 10px; border-radius:6px; border:1px solid #BFDBFE;">
                                Semester ${semNum}
                            </span>
                            <span style="font-size:11.5px; font-weight:700; color:#64748B;">
                                🏅 ${credits} Credits
                            </span>
                        </div>

                        <h4 style="margin:0 0 6px 0; font-size:15px; font-weight:800; color:#1E293B;">
                            ${sem.semester_name}
                        </h4>

                        <div style="display:flex; gap:12px; font-size:12px; color:#475569; margin-bottom:14px;">
                            <span>📘 <strong>${subCount}</strong> Subjects</span>
                            <span>✓ <strong>${coreCount}</strong> Core</span>
                            <span>⭐ <strong>${elecCount}</strong> Elective</span>
                        </div>

                        <div style="background:#F8FAFC; border-radius:8px; padding:10px; margin-bottom:16px;">
                            <small style="font-size:10px; font-weight:700; color:#94A3B8; text-transform:uppercase; display:block; margin-bottom:6px;">Sample Subjects:</small>
                            ${subjects.length > 0 ? `
                                <ul style="margin:0; padding-left:16px; font-size:12px; color:#334155;">
                                    ${subjects.slice(0, 3).map(s => `<li><strong>${s.code}</strong> — ${s.name} (${s.credits} cr)</li>`).join('')}
                                    ${subjects.length > 3 ? `<li style="color:#64748B; font-style:italic;">+ ${subjects.length - 3} more subjects...</li>` : ''}
                                </ul>
                            ` : '<span style="font-size:12px; color:#94A3B8; font-style:italic;">No subjects defined for this semester.</span>'}
                        </div>
                    </div>

                    <div class="course-actions crs-sem-actions" style="display:flex; gap:8px;">
                        <button type="button" onclick="viewSemesterSubjects(${yearNum}, ${semNum})" style="flex:1; height:34px; background:#F1F5F9; color:#1E293B; border:1px solid #CBD5E1; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer; transition:all 0.15s ease;">
                            👁 View Subjects
                        </button>
                        <button type="button" onclick="openAddSubjectModal('', '', ${yearNum}, ${semNum})" style="height:34px; padding:0 12px; background:#2563EB; color:white; border:none; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer;">
                            + Add Subject
                        </button>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function resetCourseFilters() {
    const dept = document.getElementById("courseDeptFilter");
    const prog = document.getElementById("courseProgramFilter");
    const yr = document.getElementById("courseYearFilter");
    const sem = document.getElementById("courseSemFilter");
    const search = document.getElementById("courseSearchInput");

    if (dept) dept.value = "";
    if (prog) prog.value = "";
    if (yr) yr.value = "";
    if (sem) sem.value = "";
    if (search) search.value = "";

    loadCourses();
}

// ============================================================
// SEMESTER SUBJECTS INSPECTOR MODAL
// ============================================================

function viewSemesterSubjects(yearNum, semNum) {
    const modal = document.getElementById("semesterSubjectsModal");
    const titleEl = document.getElementById("semModalTitle");
    const bodyEl = document.getElementById("semModalBody");

    if (!currentCurriculumData || !currentCurriculumData.curriculum) return;

    let targetSem = null;
    currentCurriculumData.curriculum.forEach(y => {
        if (y.academic_year === yearNum) {
            y.semesters.forEach(s => {
                if (s.semester_number === semNum) {
                    targetSem = s;
                }
            });
        }
    });

    if (!targetSem) return;

    if (titleEl) {
        titleEl.textContent = `📚 ${targetSem.semester_name} Subjects Roster (${yearNum}st/nd/rd/th Year)`;
    }

    const subs = targetSem.subjects || [];

    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; padding-bottom:10px; border-bottom:1px solid #E2E8F0;">
            <div>
                <span style="font-size:13px; font-weight:700; color:#475569;">Total Subjects: <strong>${subs.length}</strong></span> |
                <span style="font-size:13px; font-weight:700; color:#475569;">Total Credits: <strong>${targetSem.total_credits}</strong></span>
            </div>
            <button type="button" onclick="openAddSubjectModal('', '', ${yearNum}, ${semNum})" style="background:#2563EB; color:white; border:none; padding:6px 14px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer;">
                + Add Subject to Sem ${semNum}
            </button>
        </div>
    `;

    if (subs.length === 0) {
        html += `
            <div style="text-align:center; padding:30px; color:#64748B;">
                <p>No subjects added for Semester ${semNum} yet.</p>
            </div>
        `;
    } else {
        html += `
            <div style="overflow-x:auto;">
                <table class="course-subject-table" style="width:100%; border-collapse:collapse; font-size:12.5px;">
                    <thead>
                        <tr style="background:#F8FAFC; border-bottom:2px solid #E2E8F0; text-align:left;">
                            <th style="padding:10px; color:#475569; font-weight:700;">CODE</th>
                            <th style="padding:10px; color:#475569; font-weight:700;">SUBJECT NAME</th>
                            <th style="padding:10px; color:#475569; font-weight:700;">CREDITS</th>
                            <th style="padding:10px; color:#475569; font-weight:700;">TYPE</th>
                            <th style="padding:10px; color:#475569; font-weight:700;">STATUS</th>
                            <th style="padding:10px; color:#475569; font-weight:700; text-align:right;">ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${subs.map(s => `
                            <tr style="border-bottom:1px solid #F1F5F9;">
                                <td style="padding:10px; font-weight:800; color:#2563EB;">${s.code}</td>
                                <td style="padding:10px;">
                                    <strong style="color:#0F172A;">${s.name}</strong>
                                    ${s.description ? `<br><small style="color:#64748B;">${s.description}</small>` : ''}
                                </td>
                                <td style="padding:10px; font-weight:700;">${s.credits}</td>
                                <td style="padding:10px;">
                                    <span style="font-size:11px; font-weight:700; padding:2px 8px; border-radius:10px; background:${s.subject_type === 'Core' ? '#EFF6FF' : '#FEF3C7'}; color:${s.subject_type === 'Core' ? '#2563EB' : '#D97706'};">
                                        ${s.subject_type}
                                    </span>
                                </td>
                                <td style="padding:10px;">
                                    <span style="font-size:11px; font-weight:700; color:${s.status === 'Active' ? '#16A34A' : '#94A3B8'};">
                                        ${s.status}
                                    </span>
                                </td>
                                <td style="padding:10px; text-align:right;">
                                    <button type="button" onclick="openEditSubjectModal(${s.id})" style="background:#EFF6FF; color:#2563EB; border:1px solid #BFDBFE; border-radius:4px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer; margin-right:4px;">✏️ Edit</button>
                                    <button type="button" onclick="confirmDeleteSubject(${s.id})" style="background:#FEF2F2; color:#DC2626; border:1px solid #FECACA; border-radius:4px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer;">🗑 Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    if (bodyEl) bodyEl.innerHTML = html;
    if (modal) modal.style.display = "block";
}

function closeSemesterSubjectsModal() {
    const modal = document.getElementById("semesterSubjectsModal");
    if (modal) modal.style.display = "none";
}

// ============================================================
// COURSE PROGRAM MODAL
// ============================================================

function openAddCourseModal() {
    const modal = document.getElementById("courseAddEditModal");
    const form = document.getElementById("courseForm");
    const title = document.getElementById("courseModalTitle");

    if (form) form.reset();
    document.getElementById("courseModalId").value = "";
    if (title) title.textContent = "🎓 Add New Academic Program";

    if (modal) modal.style.display = "block";
}

function closeCourseModal() {
    const modal = document.getElementById("courseAddEditModal");
    if (modal) modal.style.display = "none";
}

async function submitCourseForm(e) {
    e.preventDefault();

    const id = document.getElementById("courseModalId").value;
    const name = document.getElementById("crsModalName").value;
    const code = document.getElementById("crsModalCode").value;
    const department = document.getElementById("crsModalDept").value;
    const degree_type = document.getElementById("crsModalDegree").value;
    const duration_years = document.getElementById("crsModalYears").value;
    const total_credits = document.getElementById("crsModalCredits").value;
    const description = document.getElementById("crsModalDesc").value;

    const payload = {
        name, code, department, degree_type,
        duration_years: parseInt(duration_years),
        total_credits: parseInt(total_credits),
        description
    };

    const url = id ? `/api/courses/${id}` : "/api/courses";
    const method = id ? "PUT" : "POST";

    try {
        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
            alert(`Error: ${data.error || "Failed to save program."}`);
            return;
        }

        alert(data.message || "Program saved successfully!");
        closeCourseModal();
        loadCourses();
    } catch (err) {
        console.error("Save program error:", err);
        alert("Failed to submit program request.");
    }
}

// ============================================================
// SUBJECT MODAL
// ============================================================

function openAddSubjectModal(dept = "", program = "", year = 1, sem = 1) {
    const modal = document.getElementById("subjectAddEditModal");
    const form = document.getElementById("subjectForm");
    const title = document.getElementById("subjectModalTitle");

    if (form) form.reset();
    document.getElementById("subModalId").value = "";
    if (title) title.textContent = "📘 Add New Subject";

    if (dept) document.getElementById("subModalDept").value = dept;
    if (program) document.getElementById("subModalProgram").value = program;
    if (year) document.getElementById("subModalYear").value = year;
    if (sem) document.getElementById("subModalSem").value = sem;

    if (modal) modal.style.display = "block";
}

function closeSubjectModal() {
    const modal = document.getElementById("subjectAddEditModal");
    if (modal) modal.style.display = "none";
}

async function openEditSubjectModal(subId) {
    try {
        const res = await fetch(`/api/subjects/${subId}`);
        if (!res.ok) throw new Error("Subject not found");
        const sub = await res.json();

        document.getElementById("subModalId").value = sub.id;
        document.getElementById("subModalCode").value = sub.code;
        document.getElementById("subModalName").value = sub.name;
        document.getElementById("subModalDept").value = sub.department;
        document.getElementById("subModalProgram").value = sub.program;
        document.getElementById("subModalYear").value = sub.academic_year;
        document.getElementById("subModalSem").value = sub.semester;
        document.getElementById("subModalCredits").value = sub.credits;
        document.getElementById("subModalType").value = sub.subject_type;
        document.getElementById("subModalDesc").value = sub.description || "";

        document.getElementById("subjectModalTitle").textContent = `✏️ Edit Subject (${sub.code})`;
        document.getElementById("subjectAddEditModal").style.display = "block";
    } catch (err) {
        alert("Failed to fetch subject details: " + err.message);
    }
}

async function submitSubjectForm(e) {
    e.preventDefault();

    const id = document.getElementById("subModalId").value;
    const code = document.getElementById("subModalCode").value;
    const name = document.getElementById("subModalName").value;
    const department = document.getElementById("subModalDept").value;
    const program = document.getElementById("subModalProgram").value;
    const academic_year = parseInt(document.getElementById("subModalYear").value);
    const semester = parseInt(document.getElementById("subModalSem").value);
    const credits = parseInt(document.getElementById("subModalCredits").value);
    const subject_type = document.getElementById("subModalType").value;
    const description = document.getElementById("subModalDesc").value;

    const payload = {
        code, name, department, program,
        academic_year, semester, credits,
        subject_type, description
    };

    const url = id ? `/api/subjects/${id}` : "/api/subjects";
    const method = id ? "PUT" : "POST";

    try {
        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
            alert(`Error: ${data.error || "Failed to save subject."}`);
            return;
        }

        alert(data.message || "Subject saved successfully!");
        closeSubjectModal();
        closeSemesterSubjectsModal();
        loadCourses();
    } catch (err) {
        console.error("Save subject error:", err);
        alert("Failed to save subject record.");
    }
}

async function confirmDeleteSubject(subId) {
    if (!confirm("Are you sure you want to delete this subject?")) return;

    try {
        const res = await fetch(`/api/subjects/${subId}`, { method: "DELETE" });
        const data = await res.json();

        if (!res.ok) {
            alert(`Delete Blocked: ${data.error || "Failed to delete subject."}`);
            return;
        }

        alert(data.message || "Subject deleted successfully.");
        closeSemesterSubjectsModal();
        loadCourses();
    } catch (err) {
        alert("Failed to delete subject: " + err.message);
    }
}

/* ============================================================ */
/* EXAMINATIONS & GRADES MODULE JAVASCRIPT                     */
/* ============================================================ */

let currentExamTab = 'roster';
let currentExamData = [];

async function loadExaminations() {
    const container = document.getElementById("examRosterContainer");
    if (container && currentExamTab === 'roster') {
        container.innerHTML = `
            <div style="text-align:center; padding:50px 20px;">
                <div class="spinner-border text-primary" role="status" style="width:2.5rem; height:2.5rem; border:4px solid #E2E8F0; border-top-color:#2563EB; border-radius:50%; animation:spin 0.8s linear infinite; margin:0 auto 12px;"></div>
                <h4 style="color:#1E293B; font-weight:700;">Loading Examinations & Assessments...</h4>
                <p style="color:#64748B; font-size:13px;">Fetching exam schedules, subjects, and results ledger from database.</p>
            </div>
        `;
    }

    const dept = document.getElementById("examDeptFilter")?.value || "";
    const program = document.getElementById("examProgramFilter")?.value || "";
    const year = document.getElementById("examYearFilter")?.value || "";
    const sem = document.getElementById("examSemFilter")?.value || "";
    const examType = document.getElementById("examTypeFilter")?.value || "";
    const status = document.getElementById("examStatusFilter")?.value || "";
    const search = document.getElementById("examSearchInput")?.value || "";

    const params = new URLSearchParams();
    if (dept) params.append("department", dept);
    if (program) params.append("program", program);
    if (year) params.append("academic_year", year);
    if (sem) params.append("semester", sem);
    if (examType) params.append("exam_type", examType);
    if (status) params.append("status", status);
    if (search) params.append("search", search);

    try {
        const response = await fetch(`/api/examinations?${params.toString()}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();
        currentExamData = data.examinations || [];

        // Update KPI metrics
        const summary = data.summary || {};
        if (document.getElementById("exmKpiTotal")) document.getElementById("exmKpiTotal").textContent = summary.total_exams || 0;
        if (document.getElementById("exmKpiUpcoming")) document.getElementById("exmKpiUpcoming").textContent = summary.upcoming_exams || 0;
        if (document.getElementById("exmKpiCompleted")) document.getElementById("exmKpiCompleted").textContent = summary.completed_exams || 0;
        if (document.getElementById("exmKpiPublished")) document.getElementById("exmKpiPublished").textContent = summary.published_results || 0;

        if (currentExamTab === 'roster') {
            renderExaminationsTable(currentExamData);
        } else {
            renderExamSchedule(currentExamData);
        }
    } catch (err) {
        console.error("Failed to load examinations:", err);
        if (container) {
            container.innerHTML = `
                <div style="background:#FEF2F2; border:1px solid #FCA5A5; border-radius:10px; padding:30px; text-align:center; color:#991B1B;">
                    <div style="font-size:32px; margin-bottom:8px;">⚠️</div>
                    <h3 style="margin:0 0 6px 0; font-weight:700;">Unable to Load Examinations</h3>
                    <p style="margin:0 0 16px 0; font-size:13px; color:#B91C1C;">${err.message || "Network error fetching data."}</p>
                    <button type="button" onclick="loadExaminations()" style="background:#DC2626; color:white; border:none; padding:8px 18px; border-radius:6px; font-weight:700; cursor:pointer;">Retry</button>
                </div>
            `;
        }
    }
}

function switchExamTab(tab) {
    currentExamTab = tab;

    const rosterBtn = document.getElementById("tabBtnExmRoster");
    const scheduleBtn = document.getElementById("tabBtnExmSchedule");
    const rosterBox = document.getElementById("examRosterContainer");
    const scheduleBox = document.getElementById("examScheduleContainer");

    if (tab === 'roster') {
        if (rosterBtn) rosterBtn.classList.add("active");
        if (scheduleBtn) scheduleBtn.classList.remove("active");
        if (rosterBox) rosterBox.style.display = "block";
        if (scheduleBox) scheduleBox.style.display = "none";
        renderExaminationsTable(currentExamData);
    } else {
        if (scheduleBtn) scheduleBtn.classList.add("active");
        if (rosterBtn) rosterBtn.classList.remove("active");
        if (rosterBox) rosterBox.style.display = "none";
        if (scheduleBox) scheduleBox.style.display = "block";
        renderExamSchedule(currentExamData);
    }
}

function renderExaminationsTable(exams) {
    const container = document.getElementById("examRosterContainer");
    if (!container) return;

    if (!exams || exams.length === 0) {
        container.innerHTML = `
            <div style="background:#FFFFFF; border:1px dashed #CBD5E1; border-radius:12px; padding:50px 20px; text-align:center; color:#64748B;">
                <div style="font-size:40px; margin-bottom:10px;">📑</div>
                <h3 style="color:#1E293B; font-weight:700; margin:0 0 8px 0;">No Examinations Found</h3>
                <p style="font-size:13px; margin:0 0 20px 0;">No examination records match the selected filters.</p>
                <button type="button" onclick="openCreateExamModal()" style="background:#2563EB; color:white; border:none; padding:10px 20px; border-radius:6px; font-weight:700; cursor:pointer;">+ Create Examination</button>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.02);">
            <div style="overflow-x:auto;">
                <table class="exam-table" style="width:100%; border-collapse:collapse; font-size:12.5px;">
                    <thead>
                        <tr style="background:#F8FAFC; border-bottom:2px solid #E2E8F0; text-align:left;">
                            <th style="padding:12px; color:#475569; font-weight:700;">EXAM NAME & SUBJECT</th>
                            <th style="padding:12px; color:#475569; font-weight:700;">DEPARTMENT & PROGRAM</th>
                            <th style="padding:12px; color:#475569; font-weight:700;">YEAR / SEM</th>
                            <th style="padding:12px; color:#475569; font-weight:700;">TYPE</th>
                            <th style="padding:12px; color:#475569; font-weight:700;">DATE & TIME</th>
                            <th style="padding:12px; color:#475569; font-weight:700;">STATUS</th>
                            <th style="padding:12px; color:#475569; font-weight:700; text-align:right;">ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${exams.map(e => {
                            let badgeStyle = "background:#F1F5F9; color:#475569;";
                            if (e.status === "Scheduled") badgeStyle = "background:#EFF6FF; color:#2563EB;";
                            else if (e.status === "Ongoing") badgeStyle = "background:#FEF3C7; color:#D97706;";
                            else if (e.status === "Completed") badgeStyle = "background:#E0E7FF; color:#4F46E5;";
                            else if (e.status === "Results Pending") badgeStyle = "background:#F3E8FF; color:#9333EA;";
                            else if (e.status === "Published") badgeStyle = "background:#DCFCE7; color:#16A34A;";
                            else if (e.status === "Cancelled") badgeStyle = "background:#FEE2E2; color:#DC2626;";

                            return `
                                <tr style="border-bottom:1px solid #F1F5F9;">
                                    <td style="padding:12px;">
                                        <strong style="color:#0F172A; font-size:13px; display:block;">${e.name}</strong>
                                        <span style="font-size:11.5px; font-weight:700; color:#2563EB;">📘 ${e.subject_code} — ${e.subject_name}</span>
                                    </td>
                                    <td style="padding:12px;">
                                        <span style="color:#1E293B; font-weight:600; display:block;">🏢 ${e.department}</span>
                                        <small style="color:#64748B;">${e.program}</small>
                                    </td>
                                    <td style="padding:12px;">
                                        <span style="font-weight:700; color:#475569;">Year ${e.academic_year}</span>
                                        <small style="color:#64748B; display:block;">Sem ${e.semester}</small>
                                    </td>
                                    <td style="padding:12px;">
                                        <span style="font-size:11px; font-weight:700; padding:2px 8px; border-radius:10px; background:#F1F5F9; color:#334155;">
                                            ${e.exam_type}
                                        </span>
                                    </td>
                                    <td style="padding:12px;">
                                        <span style="font-weight:700; color:#0F172A; display:block;">📅 ${e.exam_date}</span>
                                        <small style="color:#64748B;">⏰ ${e.start_time} - ${e.end_time}</small>
                                    </td>
                                    <td style="padding:12px;">
                                        <span style="font-size:11.5px; font-weight:700; padding:3px 10px; border-radius:12px; ${badgeStyle}">
                                            ${e.status}
                                        </span>
                                    </td>
                                    <td style="padding:12px; text-align:right;">
                                        <div style="display:flex; justify-content:flex-end; gap:4px;">
                                            <button type="button" onclick="openExamMarksModal(${e.id})" style="background:#EFF6FF; color:#2563EB; border:1px solid #BFDBFE; border-radius:4px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer;" title="Enter Marks & Evaluate">
                                                📊 Evaluate
                                            </button>
                                            <button type="button" onclick="openExamDetailsModal(${e.id})" style="background:#F1F5F9; color:#334155; border:1px solid #CBD5E1; border-radius:4px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer;" title="View Details">
                                                👁 View
                                            </button>
                                            <button type="button" onclick="confirmDeleteExam(${e.id})" style="background:#FEF2F2; color:#DC2626; border:1px solid #FECACA; border-radius:4px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer;" title="Delete Exam">
                                                🗑
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderExamSchedule(exams) {
    const container = document.getElementById("examScheduleContainer");
    if (!container) return;

    if (!exams || exams.length === 0) {
        container.innerHTML = `
            <div style="background:#FFFFFF; border:1px dashed #CBD5E1; border-radius:12px; padding:40px; text-align:center; color:#64748B;">
                <p>No scheduled exams found for timetable view.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; padding:24px;">
            <h3 style="margin:0 0 16px 0; font-size:17px; font-weight:800; color:#0F172A;">📅 Academic Examination Timetable Schedule</h3>
            <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:16px;">
                ${exams.map(e => `
                    <div style="border:1px solid #E2E8F0; border-left:4px solid #2563EB; border-radius:8px; padding:16px; background:#F8FAFC;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                            <span style="font-size:11px; font-weight:800; color:#2563EB; background:#EFF6FF; padding:2px 8px; border-radius:4px;">
                                ${e.department} — Year ${e.academic_year} Sem ${e.semester}
                            </span>
                            <span style="font-size:11px; font-weight:700; color:#64748B;">${e.exam_type}</span>
                        </div>
                        <h4 style="margin:0 0 4px 0; font-size:14px; font-weight:800; color:#1E293B;">${e.name}</h4>
                        <p style="margin:0 0 8px 0; font-size:12px; font-weight:700; color:#334155;">📘 ${e.subject_code}: ${e.subject_name}</p>
                        <div style="display:flex; gap:16px; font-size:11.5px; color:#475569;">
                            <span>📅 <strong>${e.exam_date}</strong></span>
                            <span>⏰ <strong>${e.start_time} - ${e.end_time}</strong></span>
                            <span>💯 Max: <strong>${e.max_marks}</strong></span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function resetExamFilters() {
    if (document.getElementById("examDeptFilter")) document.getElementById("examDeptFilter").value = "";
    if (document.getElementById("examProgramFilter")) document.getElementById("examProgramFilter").value = "";
    if (document.getElementById("examYearFilter")) document.getElementById("examYearFilter").value = "";
    if (document.getElementById("examSemFilter")) document.getElementById("examSemFilter").value = "";
    if (document.getElementById("examTypeFilter")) document.getElementById("examTypeFilter").value = "";
    if (document.getElementById("examStatusFilter")) document.getElementById("examStatusFilter").value = "";
    if (document.getElementById("examSearchInput")) document.getElementById("examSearchInput").value = "";

    loadExaminations();
}

// Cascading subject dropdown handler for Create Exam Modal
async function onExamDeptYearSemChange() {
    const dept = document.getElementById("exmModalDept")?.value || "";
    const year = document.getElementById("exmModalYear")?.value || "";
    const sem = document.getElementById("exmModalSem")?.value || "";
    const select = document.getElementById("exmModalSubjectSelect");

    if (!select) return;

    select.innerHTML = `<option value="">Loading subjects for Sem ${sem}...</option>`;

    try {
        const params = new URLSearchParams();
        if (dept) params.append("department", dept);
        if (year) params.append("academic_year", year);
        if (sem) params.append("semester", sem);

        const res = await fetch(`/api/courses?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch subjects");

        const data = await res.json();
        let matchedSubjects = [];

        if (data.curriculum) {
            data.curriculum.forEach(y => {
                if (y.academic_year == year) {
                    y.semesters.forEach(s => {
                        if (s.semester_number == sem) {
                            matchedSubjects = s.subjects || [];
                        }
                    });
                }
            });
        }

        if (matchedSubjects.length === 0) {
            select.innerHTML = `<option value="">No subjects found for Semester ${sem}</option>`;
        } else {
            select.innerHTML = matchedSubjects.map(s => `
                <option value="${s.code}" data-name="${s.name}">${s.code} — ${s.name} (${s.credits} credits)</option>
            `).join('');
        }
    } catch (err) {
        select.innerHTML = `<option value="">Error loading subjects</option>`;
    }
}

function openCreateExamModal() {
    const modal = document.getElementById("examCreateEditModal");
    const form = document.getElementById("examForm");
    const title = document.getElementById("examModalTitle");

    if (form) form.reset();
    document.getElementById("examModalId").value = "";
    if (title) title.textContent = "📝 Create New Examination";

    onExamDeptYearSemChange();
    if (modal) modal.style.display = "block";
}

function closeCreateExamModal() {
    const modal = document.getElementById("examCreateEditModal");
    if (modal) modal.style.display = "none";
}

async function submitExamForm(e) {
    e.preventDefault();

    const id = document.getElementById("examModalId").value;
    const name = document.getElementById("exmModalName").value;
    const department = document.getElementById("exmModalDept").value;
    const program = document.getElementById("exmModalProgram").value;
    const academic_year = parseInt(document.getElementById("exmModalYear").value);
    const semester = parseInt(document.getElementById("exmModalSem").value);

    const subSelect = document.getElementById("exmModalSubjectSelect");
    const subject_code = subSelect.value;
    const selectedOpt = subSelect.options[subSelect.selectedIndex];
    const subject_name = selectedOpt ? selectedOpt.getAttribute("data-name") || selectedOpt.text : subject_code;

    const exam_type = document.getElementById("exmModalType").value;
    const exam_date = document.getElementById("exmModalDate").value;
    const start_time = document.getElementById("exmModalStartTime").value;
    const end_time = document.getElementById("exmModalEndTime").value;
    const max_marks = parseInt(document.getElementById("exmModalMaxMarks").value);
    const passing_marks = parseInt(document.getElementById("exmModalPassMarks").value);
    const status = document.getElementById("exmModalStatus").value;
    const instructions = document.getElementById("exmModalInstructions").value;

    const payload = {
        name, department, program, academic_year, semester,
        subject_code, subject_name, exam_type, exam_date,
        start_time, end_time, max_marks, passing_marks, status, instructions
    };

    const url = id ? `/api/examinations/${id}` : "/api/examinations";
    const method = id ? "PUT" : "POST";

    try {
        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
            alert(`Error: ${data.error || "Failed to save examination."}`);
            return;
        }

        alert(data.message || "Examination saved successfully!");
        closeCreateExamModal();
        loadExaminations();
    } catch (err) {
        console.error("Save exam error:", err);
        alert("Failed to submit examination request.");
    }
}

// ============================================================
// MARKS EVALUATION & RESULT PUBLICATION MODAL
// ============================================================

async function openExamMarksModal(examId) {
    const modal = document.getElementById("examMarksEvaluationModal");
    const titleEl = document.getElementById("marksModalTitle");
    const bodyEl = document.getElementById("marksModalBody");

    if (bodyEl) {
        bodyEl.innerHTML = `<div style="text-align:center; padding:40px;"><div class="spinner-border text-primary" role="status"></div><p>Loading student marks roster...</p></div>`;
    }

    if (modal) modal.style.display = "block";

    try {
        const res = await fetch(`/api/examinations/${examId}/marks`);
        if (!res.ok) throw new Error("Failed to fetch marks roster");

        const data = await res.json();
        const exam = data.examination;
        const marks = data.marks || [];

        if (titleEl) titleEl.textContent = `📊 Evaluation Ledger — ${exam.name} (${exam.subject_code})`;

        let html = `
            <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:14px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h4 style="margin:0 0 4px 0; color:#0F172A; font-weight:800;">${exam.name}</h4>
                    <span style="font-size:12px; color:#475569;">
                        🏢 ${exam.department} | Year ${exam.academic_year} Sem ${exam.semester} | 💯 Max Marks: <strong>${exam.max_marks}</strong> (Pass: ${exam.passing_marks})
                    </span>
                </div>
                <div style="display:flex; gap:8px;">
                    <button type="button" onclick="saveExamMarks(${exam.id})" style="background:#2563EB; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:700; cursor:pointer;">
                        💾 Save Marks Draft
                    </button>
                    ${exam.status === 'Published' ? `
                        <button type="button" onclick="unpublishExamResults(${exam.id})" style="background:#F59E0B; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:700; cursor:pointer;">
                            ↩ Unpublish Results
                        </button>
                    ` : `
                        <button type="button" onclick="publishExamResults(${exam.id})" style="background:#16A34A; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:700; cursor:pointer;">
                            🚀 Publish Results
                        </button>
                    `}
                </div>
            </div>

            <div style="overflow-x:auto;">
                <table class="exam-marks-table" style="width:100%; border-collapse:collapse; font-size:12.5px;">
                    <thead>
                        <tr style="background:#F1F5F9; border-bottom:2px solid #CBD5E1; text-align:left;">
                            <th style="padding:10px;">ROLL NO / APP NO</th>
                            <th style="padding:10px;">STUDENT NAME</th>
                            <th style="padding:10px;">MARKS OBTAINED (${exam.max_marks})</th>
                            <th style="padding:10px; text-align:center;">ABSENT?</th>
                            <th style="padding:10px;">GRADE</th>
                            <th style="padding:10px;">RESULT</th>
                            <th style="padding:10px;">REMARKS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${marks.map(m => `
                            <tr style="border-bottom:1px solid #F1F5F9;">
                                <td style="padding:10px; font-weight:700; color:#2563EB;">${m.roll_no}</td>
                                <td style="padding:10px; font-weight:700; color:#0F172A;">${m.student_name}</td>
                                <td style="padding:10px;">
                                    <input type="number" min="0" max="${exam.max_marks}" step="0.5" id="mark_val_${m.student_id}" value="${m.marks_obtained !== null && m.marks_obtained !== undefined ? m.marks_obtained : ''}" ${m.is_absent ? 'disabled' : ''} style="width:90px; height:34px; padding:0 8px; border:1px solid #CBD5E1; border-radius:4px; font-weight:700;">
                                </td>
                                <td style="padding:10px; text-align:center;">
                                    <input type="checkbox" id="mark_absent_${m.student_id}" ${m.is_absent ? 'checked' : ''} onchange="document.getElementById('mark_val_${m.student_id}').disabled = this.checked;">
                                </td>
                                <td style="padding:10px; font-weight:800; color:#4F46E5;">${m.grade}</td>
                                <td style="padding:10px;">
                                    <span style="font-size:11px; font-weight:700; padding:2px 8px; border-radius:10px; background:${m.result_status === 'Pass' ? '#DCFCE7' : (m.result_status === 'Fail' ? '#FEE2E2' : '#F1F5F9')}; color:${m.result_status === 'Pass' ? '#16A34A' : (m.result_status === 'Fail' ? '#DC2626' : '#64748B')};">
                                        ${m.result_status}
                                    </span>
                                </td>
                                <td style="padding:10px;">
                                    <input type="text" id="mark_rem_${m.student_id}" value="${m.remarks || ''}" placeholder="Remarks..." style="width:100%; height:34px; padding:0 8px; border:1px solid #CBD5E1; border-radius:4px;">
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        if (bodyEl) bodyEl.innerHTML = html;
    } catch (err) {
        if (bodyEl) bodyEl.innerHTML = `<div style="color:red; padding:20px;">Error: ${err.message}</div>`;
    }
}

function closeExamMarksModal() {
    const modal = document.getElementById("examMarksEvaluationModal");
    if (modal) modal.style.display = "none";
}

async function saveExamMarks(examId) {
    const inputs = document.querySelectorAll(`[id^="mark_val_"]`);
    const marksData = [];

    inputs.forEach(input => {
        const studentId = input.id.replace("mark_val_", "");
        const absentCb = document.getElementById(`mark_absent_${studentId}`);
        const remInput = document.getElementById(`mark_rem_${studentId}`);

        marksData.push({
            student_id: parseInt(studentId),
            marks_obtained: input.value !== "" ? parseFloat(input.value) : null,
            is_absent: absentCb ? absentCb.checked : false,
            remarks: remInput ? remInput.value : ""
        });
    });

    try {
        const res = await fetch(`/api/examinations/${examId}/marks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ marks: marksData })
        });

        const data = await res.json();
        if (!res.ok) {
            alert(`Save Marks Error: ${data.error || "Failed to save marks."}`);
            return;
        }

        alert(data.message || "Marks saved successfully!");
        openExamMarksModal(examId);
        loadExaminations();
    } catch (err) {
        alert("Failed to save marks: " + err.message);
    }
}

async function publishExamResults(examId) {
    if (!confirm("Are you sure you want to publish results for this examination?")) return;

    try {
        const res = await fetch(`/api/examinations/${examId}/publish`, { method: "POST" });
        const data = await res.json();

        if (!res.ok) {
            alert(`Publish Error: ${data.error || "Failed to publish results."}`);
            return;
        }

        alert(data.message || "Results published successfully!");
        closeExamMarksModal();
        loadExaminations();
    } catch (err) {
        alert("Failed to publish results: " + err.message);
    }
}

async function unpublishExamResults(examId) {
    if (!confirm("Unpublish results for this examination?")) return;

    try {
        const res = await fetch(`/api/examinations/${examId}/unpublish`, { method: "POST" });
        const data = await res.json();

        if (!res.ok) {
            alert(`Unpublish Error: ${data.error || "Failed to unpublish results."}`);
            return;
        }

        alert(data.message || "Results unpublished.");
        closeExamMarksModal();
        loadExaminations();
    } catch (err) {
        alert("Failed to unpublish results: " + err.message);
    }
}

async function openExamDetailsModal(examId) {
    const modal = document.getElementById("examViewDetailsModal");
    const bodyEl = document.getElementById("examDetailsModalBody");

    if (bodyEl) bodyEl.innerHTML = `<div style="padding:30px; text-align:center;"><div class="spinner-border text-primary"></div></div>`;
    if (modal) modal.style.display = "block";

    try {
        const res = await fetch(`/api/examinations/${examId}`);
        if (!res.ok) throw new Error("Failed to fetch examination details");

        const exam = await res.json();
        const ev = exam.evaluation_summary || {};

        bodyEl.innerHTML = `
            <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:16px; margin-bottom:16px;">
                <h3 style="margin:0 0 6px 0; color:#0F172A; font-weight:800;">${exam.name}</h3>
                <p style="margin:0 0 10px 0; font-size:13px; color:#475569;">📘 Subject: <strong>${exam.subject_code} — ${exam.subject_name}</strong></p>
                <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; font-size:12px; color:#334155;">
                    <div>🏢 <strong>${exam.department}</strong></div>
                    <div>🎓 <strong>${exam.program}</strong></div>
                    <div>📅 Date: <strong>${exam.exam_date}</strong></div>
                    <div>⏰ Time: <strong>${exam.start_time} - ${exam.end_time}</strong></div>
                    <div>💯 Max Marks: <strong>${exam.max_marks}</strong></div>
                    <div>✓ Pass Marks: <strong>${exam.passing_marks}</strong></div>
                </div>
            </div>

            <h4 style="margin:0 0 10px 0; font-size:14px; font-weight:800; color:#1E293B;">📊 Evaluation & Class Performance Analytics</h4>
            <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; margin-bottom:16px;">
                <div style="background:#EFF6FF; border:1px solid #BFDBFE; border-radius:8px; padding:12px; text-align:center;">
                    <small style="color:#2563EB; font-weight:700;">TOTAL STUDENTS</small>
                    <h3 style="margin:4px 0 0 0; color:#1E3A8A;">${ev.total_students || 0}</h3>
                </div>
                <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:8px; padding:12px; text-align:center;">
                    <small style="color:#16A34A; font-weight:700;">PASSED</small>
                    <h3 style="margin:4px 0 0 0; color:#14532D;">${ev.passed_count || 0} (${ev.pass_percentage || 0}%)</h3>
                </div>
                <div style="background:#FEF2F2; border:1px solid #FECACA; border-radius:8px; padding:12px; text-align:center;">
                    <small style="color:#DC2626; font-weight:700;">FAILED</small>
                    <h3 style="margin:4px 0 0 0; color:#7F1D1D;">${ev.failed_count || 0}</h3>
                </div>
                <div style="background:#FAF5FF; border:1px solid #E9D5FF; border-radius:8px; padding:12px; text-align:center;">
                    <small style="color:#9333EA; font-weight:700;">AVG SCORE</small>
                    <h3 style="margin:4px 0 0 0; color:#581C87;">${ev.average_score || 0}</h3>
                </div>
            </div>

            ${exam.instructions ? `
                <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:8px; padding:12px; font-size:12.5px; color:#92400E;">
                    <strong>Instructions:</strong> ${exam.instructions}
                </div>
            ` : ''}
        `;
    } catch (err) {
        bodyEl.innerHTML = `<div style="color:red;">Error loading details: ${err.message}</div>`;
    }
}

function closeExamDetailsModal() {
    const modal = document.getElementById("examViewDetailsModal");
    if (modal) modal.style.display = "none";
}

async function confirmDeleteExam(examId) {
    if (!confirm("Are you sure you want to delete this examination?")) return;

    try {
        const res = await fetch(`/api/examinations/${examId}`, { method: "DELETE" });
        const data = await res.json();

        if (!res.ok) {
            alert(`Delete Blocked: ${data.error || "Failed to delete examination."}`);
            return;
        }

        alert(data.message || "Examination deleted successfully.");
        loadExaminations();
    } catch (err) {
        alert("Failed to delete examination: " + err.message);
    }
}

/* ============================================================ */
/* FEES & PAYMENTS MODULE JAVASCRIPT                           */
/* ============================================================ */

let currentFeeTab = 'roster';
let currentStudentFeeData = [];
let masterPaymentHistoryData = [];

async function loadFees() {
    const container = document.getElementById("feesRosterContainer");
    if (container && currentFeeTab === 'roster') {
        container.innerHTML = `
            <div style="text-align:center; padding:50px 20px;">
                <div class="spinner-border text-primary" role="status" style="width:2.5rem; height:2.5rem; border:4px solid #E2E8F0; border-top-color:#2563EB; border-radius:50%; animation:spin 0.8s linear infinite; margin:0 auto 12px;"></div>
                <h4 style="color:#1E293B; font-weight:700;">Loading Fee Ledgers & Collection Stats...</h4>
                <p style="color:#64748B; font-size:13px;">Calculating student balances, breakdown, and payment transactions.</p>
            </div>
        `;
    }

    try {
        // Fetch dashboard KPI metrics
        const dashRes = await fetch('/api/fees/dashboard');
        if (dashRes.ok) {
            const dash = await dashRes.json();
            if (document.getElementById("feeKpiExpected")) document.getElementById("feeKpiExpected").textContent = `₹${(dash.total_expected || 0).toLocaleString('en-IN')}`;
            if (document.getElementById("feeKpiCollected")) document.getElementById("feeKpiCollected").textContent = `₹${(dash.total_collected || 0).toLocaleString('en-IN')}`;
            if (document.getElementById("feeKpiPending")) document.getElementById("feeKpiPending").textContent = `₹${(dash.total_pending || 0).toLocaleString('en-IN')}`;
            if (document.getElementById("feeKpiMonth")) document.getElementById("feeKpiMonth").textContent = `₹${(dash.this_month_collection || 0).toLocaleString('en-IN')}`;
        }

        if (currentFeeTab === 'roster') {
            const dept = document.getElementById("feeDeptFilter")?.value || "";
            const status = document.getElementById("feeStatusFilter")?.value || "";
            const search = document.getElementById("feeSearchInput")?.value || "";

            const params = new URLSearchParams();
            if (dept) params.append("department", dept);
            if (status) params.append("status", status);
            if (search) params.append("search", search);

            const rosterRes = await fetch(`/api/fees/students?${params.toString()}`);
            if (!rosterRes.ok) throw new Error("Failed to fetch student fee roster");

            currentStudentFeeData = await rosterRes.json();
            renderFeesTable(currentStudentFeeData);
        } else {
            const historyRes = await fetch(`/api/fees/history`);
            if (!historyRes.ok) throw new Error("Failed to fetch payment history");

            masterPaymentHistoryData = await historyRes.json();
            renderFeeHistoryLog(masterPaymentHistoryData);
        }
    } catch (err) {
        console.error("Failed to load fees:", err);
        if (container) {
            container.innerHTML = `
                <div style="background:#FEF2F2; border:1px solid #FCA5A5; border-radius:10px; padding:30px; text-align:center; color:#991B1B;">
                    <div style="font-size:32px; margin-bottom:8px;">⚠️</div>
                    <h3 style="margin:0 0 6px 0; font-weight:700;">Unable to Load Fee Records</h3>
                    <p style="margin:0 0 16px 0; font-size:13px; color:#B91C1C;">${err.message || "Network error fetching fee data."}</p>
                    <button type="button" onclick="loadFees()" style="background:#DC2626; color:white; border:none; padding:8px 18px; border-radius:6px; font-weight:700; cursor:pointer;">Retry</button>
                </div>
            `;
        }
    }
}

function switchFeeTab(tab) {
    currentFeeTab = tab;

    const rosterBtn = document.getElementById("tabBtnFeeRoster");
    const historyBtn = document.getElementById("tabBtnFeeHistory");
    const rosterBox = document.getElementById("feesRosterContainer");
    const historyBox = document.getElementById("feesHistoryContainer");

    if (tab === 'roster') {
        if (rosterBtn) rosterBtn.classList.add("active");
        if (historyBtn) historyBtn.classList.remove("active");
        if (rosterBox) rosterBox.style.display = "block";
        if (historyBox) historyBox.style.display = "none";
        loadFees();
    } else {
        if (historyBtn) historyBtn.classList.add("active");
        if (rosterBtn) rosterBtn.classList.remove("active");
        if (rosterBox) rosterBox.style.display = "none";
        if (historyBox) historyBox.style.display = "block";
        loadFees();
    }
}

function renderFeesTable(students) {
    const container = document.getElementById("feesRosterContainer");
    if (!container) return;

    if (!students || students.length === 0) {
        container.innerHTML = `
            <div style="background:#FFFFFF; border:1px dashed #CBD5E1; border-radius:12px; padding:50px 20px; text-align:center; color:#64748B;">
                <div style="font-size:40px; margin-bottom:10px;">💳</div>
                <h3 style="color:#1E293B; font-weight:700; margin:0 0 8px 0;">No Student Fee Ledgers Found</h3>
                <p style="font-size:13px; margin:0 0 20px 0;">No student fee records match the current filter parameters.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.02);">
            <div style="overflow-x:auto;">
                <table class="fee-table" style="width:100%; border-collapse:collapse; font-size:12.5px;">
                    <thead>
                        <tr style="background:#F8FAFC; border-bottom:2px solid #E2E8F0; text-align:left;">
                            <th style="padding:12px; color:#475569; font-weight:700;">STUDENT & ENROLLMENT NO</th>
                            <th style="padding:12px; color:#475569; font-weight:700;">DEPARTMENT & PROGRAM</th>
                            <th style="padding:12px; color:#475569; font-weight:700;">TOTAL FEE</th>
                            <th style="padding:12px; color:#475569; font-weight:700;">PAID AMOUNT</th>
                            <th style="padding:12px; color:#475569; font-weight:700;">PENDING DUES</th>
                            <th style="padding:12px; color:#475569; font-weight:700;">STATUS</th>
                            <th style="padding:12px; color:#475569; font-weight:700; text-align:right;">ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${students.map(s => {
                            let badgeStyle = "background:#FEF3C7; color:#D97706;";
                            if (s.status === "Paid") badgeStyle = "background:#DCFCE7; color:#16A34A;";
                            else if (s.status === "Partially Paid") badgeStyle = "background:#EFF6FF; color:#2563EB;";
                            else if (s.status === "Overdue") badgeStyle = "background:#FEE2E2; color:#DC2626;";

                            return `
                                <tr style="border-bottom:1px solid #F1F5F9;">
                                    <td style="padding:12px;">
                                        <strong style="color:#0F172A; font-size:13px; display:block;">${s.student_name}</strong>
                                        <span style="font-size:11.5px; font-weight:700; color:#2563EB;">🆔 ${s.enrollment_number}</span>
                                    </td>
                                    <td style="padding:12px;">
                                        <span style="color:#1E293B; font-weight:600; display:block;">🏢 ${s.department}</span>
                                        <small style="color:#64748B;">${s.course}</small>
                                    </td>
                                    <td style="padding:12px; font-weight:700; color:#0F172A;">
                                        ₹${(s.total_fee || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td style="padding:12px; font-weight:800; color:#16A34A;">
                                        ₹${(s.paid_amount || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td style="padding:12px; font-weight:800; color:${s.pending_amount > 0 ? '#DC2626' : '#64748B'};">
                                        ₹${(s.pending_amount || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td style="padding:12px;">
                                        <span style="font-size:11.5px; font-weight:700; padding:3px 10px; border-radius:12px; ${badgeStyle}">
                                            ${s.status}
                                        </span>
                                    </td>
                                    <td style="padding:12px; text-align:right;">
                                        <div style="display:flex; justify-content:flex-end; gap:4px;">
                                            <button type="button" onclick="openRecordPaymentModal(${s.student_id})" style="background:#EFF6FF; color:#2563EB; border:1px solid #BFDBFE; border-radius:4px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer;" title="Record Payment">
                                                💳 Pay
                                            </button>
                                            <button type="button" onclick="openStudentFeeDetailsModal(${s.student_id})" style="background:#F1F5F9; color:#334155; border:1px solid #CBD5E1; border-radius:4px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer;" title="View Details">
                                                👁 Details
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderFeeHistoryLog(history) {
    const container = document.getElementById("feesHistoryContainer");
    if (!container) return;

    if (!history || history.length === 0) {
        container.innerHTML = `
            <div style="background:#FFFFFF; border:1px dashed #CBD5E1; border-radius:12px; padding:40px; text-align:center; color:#64748B;">
                <p>No payment transactions recorded yet.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; padding:20px;">
            <h3 style="margin:0 0 16px 0; font-size:16px; font-weight:800; color:#0F172A;">📜 Master Payment Transactions Ledger</h3>
            <div style="overflow-x:auto;">
                <table class="fee-table" style="width:100%; border-collapse:collapse; font-size:12.5px;">
                    <thead>
                        <tr style="background:#F8FAFC; border-bottom:2px solid #E2E8F0; text-align:left;">
                            <th style="padding:10px;">RECEIPT NO</th>
                            <th style="padding:10px;">DATE</th>
                            <th style="padding:10px;">STUDENT</th>
                            <th style="padding:10px;">FEE TYPE</th>
                            <th style="padding:10px;">AMOUNT</th>
                            <th style="padding:10px;">METHOD</th>
                            <th style="padding:10px;">REF ID</th>
                            <th style="padding:10px;">ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${history.map(p => `
                            <tr style="border-bottom:1px solid #F1F5F9;">
                                <td style="padding:10px; font-weight:800; color:#2563EB;">${p.receipt_number}</td>
                                <td style="padding:10px; color:#475569;">${p.payment_date}</td>
                                <td style="padding:10px; font-weight:700; color:#0F172A;">${p.student_name}</td>
                                <td style="padding:10px;"><span style="font-weight:700; color:#475569;">${p.fee_type}</span></td>
                                <td style="padding:10px; font-weight:800; color:#16A34A;">₹${(p.amount || 0).toLocaleString('en-IN')}</td>
                                <td style="padding:10px;">${p.payment_method}</td>
                                <td style="padding:10px; font-size:11.5px; color:#64748B;">${p.transaction_id}</td>
                                <td style="padding:10px;">
                                    <button type="button" onclick="downloadReceiptPdf(${p.id})" style="background:#DCFCE7; color:#16A34A; border:1px solid #86EFAC; border-radius:4px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer;" title="Download PDF Receipt">
                                        📄 PDF Receipt
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function resetFeeFilters() {
    if (document.getElementById("feeDeptFilter")) document.getElementById("feeDeptFilter").value = "";
    if (document.getElementById("feeStatusFilter")) document.getElementById("feeStatusFilter").value = "";
    if (document.getElementById("feeSearchInput")) document.getElementById("feeSearchInput").value = "";

    loadFees();
}

async function openRecordPaymentModal(studentId = null) {
    const modal = document.getElementById("recordPaymentModal");
    const form = document.getElementById("recordPaymentForm");
    const select = document.getElementById("payModalStudentSelect");

    if (form) form.reset();
    document.getElementById("payModalDate").value = new Date().toISOString().split('T')[0];

    // Populate student select dropdown
    try {
        const res = await fetch("/api/students?limit=200");
        if (res.ok) {
            const data = await res.json();
            const students = Array.isArray(data) ? data : (data.students || []);
            select.innerHTML = `<option value="">-- Select Student --</option>` + students.map(s => `
                <option value="${s.id}" ${studentId && String(s.id) === String(studentId) ? 'selected' : ''}>${s.fullName || s.name} (${s.department || s.course || 'Enrolled'})</option>
            `).join('');
            if (studentId) {
                select.value = studentId;
            }
        }
    } catch (err) {
        console.error("Failed to load students for payment modal:", err);
    }

    if (studentId) {
        onPaymentStudentSelectChange(studentId);
    }

    if (modal) modal.style.display = "block";
}

function closeRecordPaymentModal() {
    const modal = document.getElementById("recordPaymentModal");
    if (modal) modal.style.display = "none";
}

async function onPaymentStudentSelectChange(preselectedId = null) {
    const studentId = preselectedId || document.getElementById("payModalStudentSelect")?.value;
    const noticeEl = document.getElementById("payModalBalanceNotice");
    if (!studentId || !noticeEl) {
        if (noticeEl) noticeEl.style.display = "none";
        return;
    }

    try {
        const res = await fetch(`/api/students/${studentId}/fees`);
        if (res.ok) {
            const summary = await res.json();
            noticeEl.style.display = "block";
            noticeEl.innerHTML = `
                📌 <strong>Candidate:</strong> ${summary.student_name} | Total Fee: <strong>₹${(summary.total_fee || 0).toLocaleString('en-IN')}</strong> |
                Paid: <strong style="color:#16A34A;">₹${(summary.paid_amount || 0).toLocaleString('en-IN')}</strong> |
                Outstanding Dues: <strong style="color:#DC2626;">₹${(summary.pending_amount || 0).toLocaleString('en-IN')}</strong>
            `;

            if (!preselectedId) {
                document.getElementById("payModalAmount").value = summary.pending_amount > 0 ? summary.pending_amount : "";
            }
        }
    } catch (err) {
        noticeEl.style.display = "none";
    }
}

async function submitPaymentForm(e) {
    e.preventDefault();

    const studentId = document.getElementById("payModalStudentSelect").value;
    const amount = document.getElementById("payModalAmount").value;
    const fee_type = document.getElementById("payModalFeeType").value;
    const payment_method = document.getElementById("payModalMethod").value;
    const transaction_id = document.getElementById("payModalTxnId").value;
    const payment_date = document.getElementById("payModalDate").value;
    const remarks = document.getElementById("payModalRemarks").value;

    if (!studentId || !amount) {
        alert("Student selection and payment amount are required.");
        return;
    }

    const payload = {
        amount: parseFloat(amount),
        fee_type,
        payment_method,
        transaction_id,
        payment_date,
        remarks
    };

    try {
        const res = await fetch(`/api/students/${studentId}/payments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
            alert(`Payment Error: ${data.error || "Failed to record payment."}`);
            return;
        }

        alert(data.message || "Payment recorded successfully!");
        closeRecordPaymentModal();

        // Offer instant receipt PDF download
        if (data.payment && data.payment.id) {
            if (confirm("Payment recorded! Download official PDF Fee Receipt now?")) {
                downloadReceiptPdf(data.payment.id);
            }
        }

        loadFees();
    } catch (err) {
        alert("Failed to submit payment: " + err.message);
    }
}

async function openStudentFeeDetailsModal(studentId) {
    const modal = document.getElementById("studentFeeDetailsModal");
    const bodyEl = document.getElementById("feeDetailsModalBody");

    if (bodyEl) bodyEl.innerHTML = `<div style="text-align:center; padding:40px;"><div class="spinner-border text-primary"></div><p>Loading fee ledger...</p></div>`;
    if (modal) modal.style.display = "block";

    try {
        const res = await fetch(`/api/students/${studentId}/fees`);
        if (!res.ok) throw new Error("Failed to fetch student fee details");

        const summary = await res.json();
        const breakdown = summary.fee_breakdown || {};
        const payments = summary.payments || [];

        bodyEl.innerHTML = `
            <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:16px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h3 style="margin:0 0 4px 0; color:#0F172A; font-weight:800;">${summary.student_name}</h3>
                    <span style="font-size:12px; color:#475569;">
                        🏢 Department: <strong>${summary.department}</strong> | Quota: <strong>${summary.admission_type}</strong>
                    </span>
                </div>
                <div>
                    <button type="button" onclick="openRecordPaymentModal(${summary.student_id})" style="background:#2563EB; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:700; cursor:pointer;">
                        + Record Payment
                    </button>
                </div>
            </div>

            <h4 style="margin:0 0 10px 0; font-size:14px; font-weight:800; color:#1E293B;">📊 Fee Collection & Balance Summary</h4>
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; margin-bottom:16px;">
                <div style="background:#EFF6FF; border:1px solid #BFDBFE; border-radius:8px; padding:12px; text-align:center;">
                    <small style="color:#2563EB; font-weight:700;">TOTAL ANNUAL FEE</small>
                    <h3 style="margin:4px 0 0 0; color:#1E3A8A;">₹${(summary.total_fee || 0).toLocaleString('en-IN')}</h3>
                </div>
                <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:8px; padding:12px; text-align:center;">
                    <small style="color:#16A34A; font-weight:700;">PAID AMOUNT</small>
                    <h3 style="margin:4px 0 0 0; color:#14532D;">₹${(summary.paid_amount || 0).toLocaleString('en-IN')}</h3>
                </div>
                <div style="background:#FEF2F2; border:1px solid #FECACA; border-radius:8px; padding:12px; text-align:center;">
                    <small style="color:#DC2626; font-weight:700;">OUTSTANDING DUES</small>
                    <h3 style="margin:4px 0 0 0; color:#7F1D1D;">₹${(summary.pending_amount || 0).toLocaleString('en-IN')}</h3>
                </div>
            </div>

            <h4 style="margin:0 0 10px 0; font-size:14px; font-weight:800; color:#1E293B;">🏷 Prescribed Fee Category Breakdown</h4>
            <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:8px; overflow:hidden; margin-bottom:16px;">
                <table style="width:100%; border-collapse:collapse; font-size:12.5px;">
                    <tbody>
                        ${Object.entries(breakdown).map(([cat, val]) => `
                            <tr style="border-bottom:1px solid #F1F5F9;">
                                <td style="padding:8px 12px; font-weight:700; color:#334155;">${cat}</td>
                                <td style="padding:8px 12px; font-weight:800; color:#0F172A; text-align:right;">₹${(val || 0).toLocaleString('en-IN')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <h4 style="margin:0 0 10px 0; font-size:14px; font-weight:800; color:#1E293B;">📜 Payment Transactions History</h4>
            <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:8px; overflow:hidden;">
                <table style="width:100%; border-collapse:collapse; font-size:12px;">
                    <thead>
                        <tr style="background:#F8FAFC; border-bottom:1px solid #E2E8F0; text-align:left;">
                            <th style="padding:8px 10px;">RECEIPT NO</th>
                            <th style="padding:8px 10px;">DATE</th>
                            <th style="padding:8px 10px;">FEE TYPE</th>
                            <th style="padding:8px 10px;">AMOUNT</th>
                            <th style="padding:8px 10px;">METHOD</th>
                            <th style="padding:8px 10px; text-align:right;">ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.length > 0 ? payments.map(p => `
                            <tr style="border-bottom:1px solid #F1F5F9;">
                                <td style="padding:8px 10px; font-weight:700; color:#2563EB;">${p.receipt_number}</td>
                                <td style="padding:8px 10px; color:#475569;">${p.payment_date}</td>
                                <td style="padding:8px 10px;">${p.fee_type}</td>
                                <td style="padding:8px 10px; font-weight:800; color:#16A34A;">₹${(p.amount || 0).toLocaleString('en-IN')}</td>
                                <td style="padding:8px 10px;">${p.payment_method}</td>
                                <td style="padding:8px 10px; text-align:right;">
                                    <button type="button" onclick="downloadReceiptPdf(${p.id})" style="background:#DCFCE7; color:#16A34A; border:1px solid #86EFAC; border-radius:4px; padding:2px 8px; font-size:11px; font-weight:700; cursor:pointer;">
                                        📄 PDF Receipt
                                    </button>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr><td colspan="6" style="padding:15px; text-align:center; color:#94A3B8;">No payments recorded yet for this candidate.</td></tr>
                        `}
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {
        bodyEl.innerHTML = `<div style="color:red;">Error loading details: ${err.message}</div>`;
    }
}

function closeStudentFeeDetailsModal() {
    const modal = document.getElementById("studentFeeDetailsModal");
    if (modal) modal.style.display = "none";
}

function downloadReceiptPdf(paymentId) {
    window.open(`/api/payments/${paymentId}/receipt`, '_blank');
}

// Backward compatibility alias for fee details
window.viewStudentDetails = openStudentFeeDetailsModal;

// ============================================================
// REPORTS & ANALYTICS MODULE
// ============================================================

let reportsAnalyticsData = null;
let repChartDeptInstance = null;
let repChartYearInstance = null;
let repChartSemInstance = null;

async function loadReportsAnalytics() {
    const loadingEl = document.getElementById("repLoadingState");
    const contentEl = document.getElementById("repDashboardContent");
    if (loadingEl) loadingEl.style.display = "block";

    try {
        const yearVal = document.getElementById("repFilterAcadYear")?.value || "all";
        const semVal = document.getElementById("repFilterSemester")?.value || "all";
        const deptVal = document.getElementById("repFilterDepartment")?.value || "all";
        const progVal = document.getElementById("repFilterProgram")?.value || "all";

        const params = new URLSearchParams({
            academic_year: yearVal,
            semester: semVal,
            department: deptVal,
            program: progVal
        });

        const res = await fetch(`/api/analytics/reports?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch reports analytics payload");

        const data = await res.json();
        reportsAnalyticsData = data;
        renderReportsUI(data);
    } catch (err) {
        console.error("Error loading reports analytics:", err);
        if (contentEl) {
            contentEl.innerHTML = `
                <div class="report-error">
                    <h3>⚠️ Unable to Load Reports & Analytics</h3>
                    <p>${err.message || 'Server returned error or network unreachable.'}</p>
                    <button type="button" class="report-btn report-btn-primary" onclick="loadReportsAnalytics()" style="margin-top: 15px;">Retry Loading</button>
                </div>
            `;
        }
    } finally {
        if (loadingEl) loadingEl.style.display = "none";
    }
}

function applyReportFilters() {
    loadReportsAnalytics();
}

function resetReportFilters() {
    if (document.getElementById("repFilterAcadYear")) document.getElementById("repFilterAcadYear").value = "all";
    if (document.getElementById("repFilterSemester")) document.getElementById("repFilterSemester").value = "all";
    if (document.getElementById("repFilterDepartment")) document.getElementById("repFilterDepartment").value = "all";
    if (document.getElementById("repFilterProgram")) document.getElementById("repFilterProgram").value = "all";
    loadReportsAnalytics();
}

function renderReportsUI(data) {
    if (!data) return;

    // SECTION 1 — INSTITUTION OVERVIEW
    const ov = data.overview || {};
    if (document.getElementById("repOverviewTotalStudents")) document.getElementById("repOverviewTotalStudents").textContent = (ov.total_students || 0).toLocaleString();
    if (document.getElementById("repOverviewActiveStudents")) document.getElementById("repOverviewActiveStudents").textContent = (ov.active_students || 0).toLocaleString();
    if (document.getElementById("repOverviewDepts")) document.getElementById("repOverviewDepts").textContent = ov.total_departments || 0;
    if (document.getElementById("repOverviewPrograms")) document.getElementById("repOverviewPrograms").textContent = ov.total_programs || 0;
    if (document.getElementById("repOverviewSubjects")) document.getElementById("repOverviewSubjects").textContent = ov.total_courses_subjects || 0;
    if (document.getElementById("repOverviewNewAdmissions")) document.getElementById("repOverviewNewAdmissions").textContent = ov.new_admissions || 0;

    // SECTION 2 — STUDENT ANALYTICS
    const st = data.student_analytics || {};
    if (document.getElementById("repStudentMaleCount")) document.getElementById("repStudentMaleCount").textContent = st.male_count || 0;
    if (document.getElementById("repStudentFemaleCount")) document.getElementById("repStudentFemaleCount").textContent = st.female_count || 0;
    if (document.getElementById("repStudentOtherCount")) document.getElementById("repStudentOtherCount").textContent = st.other_count || 0;
    const actRate = st.total_students > 0 ? Math.round((st.active_students / st.total_students) * 100) : 0;
    if (document.getElementById("repStudentActiveRate")) document.getElementById("repStudentActiveRate").textContent = `${actRate}%`;

    // Render Student Charts
    renderReportCharts(st);

    // SECTION 3 — DEPARTMENT ANALYTICS
    const deptList = data.department_analytics || [];
    const deptTbody = document.getElementById("repDeptTableBody");
    if (deptTbody) {
        if (deptList.length === 0) {
            deptTbody.innerHTML = `<tr><td colspan="10" class="report-td-empty">No department data available for selected filters.</td></tr>`;
        } else {
            deptTbody.innerHTML = deptList.map(d => `
                <tr>
                    <td><strong>${d.department}</strong></td>
                    <td><code>${d.code}</code></td>
                    <td>${d.hod_name}</td>
                    <td><strong>${d.students}</strong></td>
                    <td>${d.courses}</td>
                    <td>${d.capacity}</td>
                    <td><span class="report-badge badge-blue">${d.occupancy}%</span></td>
                    <td><span class="report-badge ${d.attendance >= 75 ? 'badge-green' : 'badge-amber'}">${d.attendance}%</span></td>
                    <td>${d.avg_performance > 0 ? `${d.avg_performance}%` : 'N/A'}</td>
                    <td><span class="report-badge badge-green">${d.status}</span></td>
                </tr>
            `).join('');
        }
    }

    // SECTION 4 — YEAR & SEMESTER ANALYTICS
    const matrix = data.year_semester_matrix || [];
    const yearSemContainer = document.getElementById("repYearSemContainer");
    if (yearSemContainer) {
        if (matrix.length === 0) {
            yearSemContainer.innerHTML = `<div class="report-empty-box">No year/semester data available for selected filters.</div>`;
        } else {
            yearSemContainer.innerHTML = matrix.map(m => `
                <div class="report-year-card">
                    <div class="report-year-card-header">
                        <h4>${m.academic_year} — ${m.semester_label}</h4>
                        <span class="report-badge badge-blue">${m.students} Students</span>
                    </div>
                    <div class="report-year-card-body">
                        <div class="report-year-metric">
                            <span class="lbl">Attendance</span>
                            <span class="val ${m.attendance >= 75 ? 'text-green' : 'text-amber'}">${m.attendance}%</span>
                        </div>
                        <div class="report-year-metric">
                            <span class="lbl">Average Marks</span>
                            <span class="val text-blue">${m.average_marks !== null ? `${m.average_marks}%` : 'N/A'}</span>
                        </div>
                        <div class="report-year-metric">
                            <span class="lbl">Pass Rate</span>
                            <span class="val text-purple">${m.pass_percentage !== null ? `${m.pass_percentage}%` : 'N/A'}</span>
                        </div>
                        <div class="report-year-metric">
                            <span class="lbl">Fee Collection</span>
                            <span class="val text-green">${m.fee_collection_rate}%</span>
                        </div>
                        <div class="report-year-metric">
                            <span class="lbl">Pending Fees</span>
                            <span class="val text-red">₹${(m.pending_fees || 0).toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    // SECTION 5 — ATTENDANCE ANALYTICS
    const att = data.attendance_analytics || {};
    if (document.getElementById("repAttOverallAvg")) document.getElementById("repAttOverallAvg").textContent = `${att.overall_avg || 0}%`;
    if (document.getElementById("repAttAbove75")) document.getElementById("repAttAbove75").textContent = att.above_75_count || 0;
    if (document.getElementById("repAttBelow75")) document.getElementById("repAttBelow75").textContent = att.below_75_count || 0;
    if (document.getElementById("repAttBelowCritical")) document.getElementById("repAttBelowCritical").textContent = att.critical_below_60_count || 0;

    const subjAttTbody = document.getElementById("repSubjectAttTableBody");
    const subjAttList = att.subject_attendance || [];
    if (subjAttTbody) {
        if (subjAttList.length === 0) {
            subjAttTbody.innerHTML = `<tr><td colspan="6" class="report-td-empty">No subject attendance records found.</td></tr>`;
        } else {
            subjAttTbody.innerHTML = subjAttList.map(s => `
                <tr>
                    <td><code>${s.code}</code></td>
                    <td><strong>${s.name}</strong></td>
                    <td>${s.department}</td>
                    <td>Semester ${s.semester}</td>
                    <td><span class="report-badge ${s.attendance >= 75 ? 'badge-green' : 'badge-amber'}">${s.attendance}%</span></td>
                    <td><span class="report-badge ${s.attendance >= 75 ? 'badge-green' : 'badge-red'}">${s.attendance >= 75 ? 'Satisfactory' : 'Critical Warning'}</span></td>
                </tr>
            `).join('');
        }
    }

}

function renderReportCharts(st) {
    if (typeof Chart === 'undefined') return;

    // Chart 1: Department Distribution
    const deptCtx = document.getElementById("repChartDept");
    if (deptCtx) {
        if (repChartDeptInstance) repChartDeptInstance.destroy();
        const depts = (st.students_by_department || []).map(d => d.department);
        const counts = (st.students_by_department || []).map(d => d.count);

        repChartDeptInstance = new Chart(deptCtx, {
            type: 'bar',
            data: {
                labels: depts.length > 0 ? depts : ['No Data'],
                datasets: [{
                    label: 'Students',
                    data: counts.length > 0 ? counts : [0],
                    backgroundColor: '#2563EB',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
            }
        });
    }

    // Chart 2: Academic Year Distribution
    const yearCtx = document.getElementById("repChartYear");
    if (yearCtx) {
        if (repChartYearInstance) repChartYearInstance.destroy();
        const years = (st.students_by_academic_year || []).map(y => y.year);
        const counts = (st.students_by_academic_year || []).map(y => y.count);

        repChartYearInstance = new Chart(yearCtx, {
            type: 'doughnut',
            data: {
                labels: years,
                datasets: [{
                    data: counts,
                    backgroundColor: ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    // Chart 3: Semester Distribution
    const semCtx = document.getElementById("repChartSem");
    if (semCtx) {
        if (repChartSemInstance) repChartSemInstance.destroy();
        const sems = (st.students_by_semester || []).map(s => s.semester);
        const counts = (st.students_by_semester || []).map(s => s.count);

        repChartSemInstance = new Chart(semCtx, {
            type: 'line',
            data: {
                labels: sems,
                datasets: [{
                    label: 'Students',
                    data: counts,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
            }
        });
    }
}

function getActiveReportFilterParams() {
    const yearVal = document.getElementById("repFilterAcadYear")?.value || "all";
    const semVal = document.getElementById("repFilterSemester")?.value || "all";
    const deptVal = document.getElementById("repFilterDepartment")?.value || "all";
    const progVal = document.getElementById("repFilterProgram")?.value || "all";

    return new URLSearchParams({
        academic_year: yearVal,
        semester: semVal,
        department: deptVal,
        program: progVal
    });
}

function exportReportPDF(reportType) {
    const params = getActiveReportFilterParams();
    params.set("report_type", reportType);
    window.open(`/api/analytics/export/pdf?${params.toString()}`, '_blank');
}

function exportReportCSV(reportType) {
    const params = getActiveReportFilterParams();
    params.set("report_type", reportType);
    window.open(`/api/analytics/export/csv?${params.toString()}`, '_blank');
}

function printReport(reportType) {
    viewReportDetails(reportType);
    setTimeout(() => {
        window.print();
    }, 500);
}

function viewReportDetails(reportType) {
    const modal = document.getElementById("modalReportPreview");
    const body = document.getElementById("reportPreviewBody");
    const title = document.getElementById("reportModalTitle");
    const pdfBtn = document.getElementById("btnModalPdfExport");

    if (!modal || !body || !reportsAnalyticsData) return;

    pdfBtn.onclick = () => exportReportPDF(reportType);
    modal.style.display = "flex";

    const titles = {
        "student": "Student Roster & Enrollment Audit Preview",
        "department": "Department Performance & Capacity Audit Preview",
        "attendance": "Academic Attendance Audit Preview",
        "examination": "Examination Schedule & Evaluation Summary",
        "result": "Student Academic Performance & Result Audit",
        "fee": "Fee Collection & Revenue Audit Preview",
        "pending_fee": "Outstanding Fee Dues Audit Preview"
    };

    title.textContent = titles[reportType] || "Report Preview";

    if (reportType === "student") {
        const st = reportsAnalyticsData.student_analytics || {};
        body.innerHTML = `
            <div style="padding: 10px;">
                <h4 style="margin-bottom:10px; color:#1e3a8a;">Student Roster Summary</h4>
                <p><strong>Total Students:</strong> ${st.total_students} | <strong>Male:</strong> ${st.male_count} | <strong>Female:</strong> ${st.female_count} | <strong>Active:</strong> ${st.active_students}</p>
                <table class="report-table" style="margin-top:15px;">
                    <thead><tr><th>Department</th><th>Students Count</th></tr></thead>
                    <tbody>
                        ${(st.students_by_department || []).map(d => `<tr><td>${d.department}</td><td><strong>${d.count}</strong></td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else if (reportType === "department") {
        const depts = reportsAnalyticsData.department_analytics || [];
        body.innerHTML = `
            <div style="padding: 10px;">
                <h4 style="margin-bottom:10px; color:#1e3a8a;">Department Audit Summary</h4>
                <table class="report-table">
                    <thead><tr><th>Department</th><th>Capacity</th><th>Students</th><th>Occupancy</th><th>Attendance</th></tr></thead>
                    <tbody>
                        ${depts.map(d => `<tr><td>${d.department}</td><td>${d.capacity}</td><td>${d.students}</td><td>${d.occupancy}%</td><td>${d.attendance}%</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else if (reportType === "fee" || reportType === "pending_fee") {
        const fee = reportsAnalyticsData.fee_analytics || {};
        body.innerHTML = `
            <div style="padding: 10px;">
                <h4 style="margin-bottom:10px; color:#1e3a8a;">Financial Ledger Audit</h4>
                <p><strong>Total Expected:</strong> ₹${(fee.total_expected||0).toLocaleString('en-IN')}</p>
                <p><strong>Total Collected:</strong> ₹${(fee.total_collected||0).toLocaleString('en-IN')}</p>
                <p><strong>Total Outstanding:</strong> ₹${(fee.total_outstanding||0).toLocaleString('en-IN')}</p>
                <p><strong>Collection Rate:</strong> ${fee.collection_rate}%</p>
            </div>
        `;
    } else {
        const matrix = reportsAnalyticsData.year_semester_matrix || [];
        body.innerHTML = `
            <div style="padding: 10px;">
                <h4 style="margin-bottom:10px; color:#1e3a8a;">Academic Matrix Summary</h4>
                <table class="report-table">
                    <thead><tr><th>Year</th><th>Semester</th><th>Students</th><th>Attendance %</th><th>Pass Rate %</th></tr></thead>
                    <tbody>
                        ${matrix.map(m => `<tr><td>${m.academic_year}</td><td>${m.semester_label}</td><td>${m.students}</td><td>${m.attendance}%</td><td>${m.pass_percentage !== null ? `${m.pass_percentage}%` : 'N/A'}</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
}

function closeReportPreviewModal() {
    const modal = document.getElementById("modalReportPreview");
    if (modal) modal.style.display = "none";
}

/* ============================================================ */
/* LIBRARY MANAGEMENT MODULE                                    */
/* ============================================================ */

let currentLibTab = "books";
let currentLibData = {
    summary: null,
    books: [],
    members: [],
    transactions: [],
    overdue: []
};

async function loadLibrary() {
    try {
        const sumRes = await fetch('/api/library/dashboard');
        if (sumRes.ok) {
            currentLibData.summary = await sumRes.json();
            renderLibrarySummary(currentLibData.summary);
        }

        const cat = document.getElementById('libCategoryFilter')?.value || '';
        const dept = document.getElementById('libDeptFilter')?.value || '';
        const status = document.getElementById('libStatusFilter')?.value || '';
        const search = document.getElementById('libSearchInput')?.value || '';

        if (currentLibTab === "books") {
            const booksRes = await fetch(`/api/library/books?category=${encodeURIComponent(cat)}&status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`);
            if (booksRes.ok) {
                currentLibData.books = await booksRes.json();
                renderLibraryBooksTable(currentLibData.books);
            }
        } else if (currentLibTab === "members") {
            const memRes = await fetch(`/api/library/members?department=${encodeURIComponent(dept)}&search=${encodeURIComponent(search)}`);
            if (memRes.ok) {
                currentLibData.members = await memRes.json();
                renderLibraryMembersTable(currentLibData.members);
            }
        } else if (currentLibTab === "transactions") {
            const txRes = await fetch(`/api/library/transactions?status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`);
            if (txRes.ok) {
                currentLibData.transactions = await txRes.json();
                renderLibraryTransactionsTable(currentLibData.transactions);
            }
        } else if (currentLibTab === "overdue") {
            const odRes = await fetch('/api/library/overdue');
            if (odRes.ok) {
                currentLibData.overdue = await odRes.json();
                renderLibraryOverdueTable(currentLibData.overdue);
            }
        }
    } catch (err) {
        console.error("Library load error:", err);
        showToast("Error loading library data.", "error");
    }
}

function renderLibrarySummary(s) {
    if (!s) return;
    document.getElementById('libKpiTotal').textContent = s.total_books || 0;
    document.getElementById('libKpiTitles').textContent = `${s.total_titles || 0} unique titles`;
    document.getElementById('libKpiAvailable').textContent = s.available_books || 0;
    document.getElementById('libKpiIssued').textContent = s.issued_books || 0;
    document.getElementById('libKpiOverdue').textContent = s.overdue_books || 0;
    document.getElementById('libKpiMembers').textContent = s.total_members || 0;
    document.getElementById('libKpiFines').textContent = `₹${(s.outstanding_fines || 0).toLocaleString('en-IN')}`;
}

function switchLibraryTab(tabName) {
    currentLibTab = tabName;
    ['tabBtnLibBooks', 'tabBtnLibMembers', 'tabBtnLibTransactions', 'tabBtnLibOverdue'].forEach(btnId => {
        const b = document.getElementById(btnId);
        if (b) b.classList.remove('active');
    });

    const activeBtn = document.getElementById(`tabBtnLib${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    if (activeBtn) activeBtn.classList.add('active');

    ['libBooksContainer', 'libMembersContainer', 'libTransactionsContainer', 'libOverdueContainer'].forEach(cId => {
        const c = document.getElementById(cId);
        if (c) c.style.display = 'none';
    });

    const targetCont = document.getElementById(`lib${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Container`);
    if (targetCont) targetCont.style.display = 'block';

    loadLibrary();
}

function renderLibraryBooksTable(books) {
    const container = document.getElementById('libBooksContainer');
    if (!container) return;

    if (!books || books.length === 0) {
        container.innerHTML = `
            <div style="padding:40px; text-align:center; color:#64748B;">
                <div style="font-size:36px; margin-bottom:10px;">📚</div>
                <h4 style="margin:0; font-size:16px; color:#334155;">No books found.</h4>
                <p style="margin:4px 0 0 0; font-size:13px;">Try clearing filters or adding a new book title.</p>
            </div>`;
        return;
    }

    let html = `
        <div style="overflow-x:auto;">
            <table class="erp-table library-book-table" style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#F8FAFC; border-bottom:2px solid #E2E8F0; text-align:left;">
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569;">ISBN</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569;">Title</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569;">Author</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569;">Category</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569;">Qty</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569;">Avail</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569;">Location</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569;">Status</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569; text-align:right;">Actions</th>
                    </tr>
                </thead>
                <tbody>`;

    books.forEach(b => {
        let badgeColor = b.status === "Available" ? "background:#DCFCE7; color:#166534;" : (b.status === "Partially Available" ? "background:#FEF3C7; color:#92400E;" : "background:#FEE2E2; color:#991B1B;");

        html += `
            <tr style="border-bottom:1px solid #F1F5F9;">
                <td style="padding:12px; font-size:12px; font-family:monospace; font-weight:600; color:#2563EB;">${b.isbn}</td>
                <td style="padding:12px; font-size:13px; font-weight:700; color:#0F172A;">
                    ${b.title}
                    <div style="font-size:11px; color:#64748B; font-weight:400;">${b.publisher} (${b.pub_year}) • ${b.edition}</div>
                </td>
                <td style="padding:12px; font-size:12px; color:#334155;">${b.author}</td>
                <td style="padding:12px; font-size:12px; color:#475569;"><span style="background:#F1F5F9; padding:3px 8px; border-radius:4px;">${b.category}</span></td>
                <td style="padding:12px; font-size:12px; font-weight:700; color:#1E293B;">${b.quantity}</td>
                <td style="padding:12px; font-size:12px; font-weight:700; color:${b.available_qty > 0 ? '#16A34A' : '#DC2626'};">${b.available_qty}</td>
                <td style="padding:12px; font-size:12px; color:#64748B;">${b.location}</td>
                <td style="padding:12px;">
                    <span style="font-size:11px; font-weight:700; padding:4px 8px; border-radius:12px; ${badgeColor}">${b.status}</span>
                </td>
                <td style="padding:12px; text-align:right; white-space:nowrap;">
                    <button type="button" onclick="openEditBookModal(${b.id})" style="background:#EFF6FF; color:#2563EB; border:1px solid #BFDBFE; border-radius:4px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer; margin-right:4px;">✏️ Edit</button>
                    ${b.available_qty > 0 ? `<button type="button" onclick="openIssueBookModal(${b.id})" style="background:#F0FDF4; color:#166534; border:1px solid #BBF7D0; border-radius:4px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer; margin-right:4px;">📖 Issue</button>` : ''}
                    <button type="button" onclick="confirmDeleteBook(${b.id})" style="background:#FEF2F2; color:#DC2626; border:1px solid #FECACA; border-radius:4px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer;">🗑 Delete</button>
                </td>
            </tr>`;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

function renderLibraryMembersTable(members) {
    const container = document.getElementById('libMembersContainer');
    if (!container) return;

    if (!members || members.length === 0) {
        container.innerHTML = `
            <div style="padding:40px; text-align:center; color:#64748B;">
                <div style="font-size:36px; margin-bottom:10px;">👥</div>
                <h4 style="margin:0; font-size:16px; color:#334155;">No student members found.</h4>
            </div>`;
        return;
    }

    let html = `
        <div style="overflow-x:auto;">
            <table class="erp-table library-member-table" style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#F8FAFC; border-bottom:2px solid #E2E8F0; text-align:left;">
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569;">Roll / Reg No</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569;">Student Name</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569;">Department</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569;">Year</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569;">Books Issued</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569;">Overdue</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569;">Pending Fine</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569;">Status</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569; text-align:right;">Actions</th>
                    </tr>
                </thead>
                <tbody>`;

    members.forEach(m => {
        html += `
            <tr style="border-bottom:1px solid #F1F5F9;">
                <td style="padding:12px; font-size:12px; font-family:monospace; font-weight:700; color:#0F172A;">${m.roll_number}</td>
                <td style="padding:12px; font-size:13px; font-weight:700; color:#2563EB;">${m.fullName}</td>
                <td style="padding:12px; font-size:12px; color:#334155;">${m.department}</td>
                <td style="padding:12px; font-size:12px; color:#64748B;">Year ${m.academic_year}</td>
                <td style="padding:12px; font-size:12px; font-weight:700; color:#1E293B;">${m.issued_books_count}</td>
                <td style="padding:12px; font-size:12px; font-weight:700; color:${m.overdue_count > 0 ? '#DC2626' : '#64748B'};">${m.overdue_count}</td>
                <td style="padding:12px; font-size:12px; font-weight:700; color:${m.outstanding_fine > 0 ? '#D97706' : '#16A34A'};">₹${m.outstanding_fine}</td>
                <td style="padding:12px;">
                    <span style="font-size:11px; font-weight:700; padding:4px 8px; border-radius:12px; background:#DCFCE7; color:#166534;">${m.status}</span>
                </td>
                <td style="padding:12px; text-align:right;">
                    <button type="button" onclick="openIssueBookModal(null, ${m.student_id})" style="background:#F0FDF4; color:#166534; border:1px solid #BBF7D0; border-radius:4px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer;">📖 Issue Book</button>
                </td>
            </tr>`;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

function renderLibraryTransactionsTable(txs) {
    const container = document.getElementById('libTransactionsContainer');
    if (!container) return;

    if (!txs || txs.length === 0) {
        container.innerHTML = `
            <div style="padding:40px; text-align:center; color:#64748B;">
                <div style="font-size:36px; margin-bottom:10px;">📜</div>
                <h4 style="margin:0; font-size:16px; color:#334155;">No transactions found.</h4>
            </div>`;
        return;
    }

    let html = `
        <div style="overflow-x:auto;">
            <table class="erp-table library-transaction-table" style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#F8FAFC; border-bottom:2px solid #E2E8F0; text-align:left;">
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569;">Tx ID</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569;">Student Member</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569;">Book Title</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569;">Issue Date</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569;">Due Date</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569;">Return Date</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569;">Status</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569;">Fine</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#475569; text-align:right;">Actions</th>
                    </tr>
                </thead>
                <tbody>`;

    txs.forEach(t => {
        let badgeStyle = t.status === "Returned" ? "background:#DCFCE7; color:#166534;" : (t.status === "Overdue" ? "background:#FEE2E2; color:#991B1B;" : "background:#EFF6FF; color:#1E40AF;");

        html += `
            <tr style="border-bottom:1px solid #F1F5F9;">
                <td style="padding:12px; font-size:12px; font-family:monospace; font-weight:700; color:#64748B;">#LIB-${t.id}</td>
                <td style="padding:12px; font-size:13px; font-weight:700; color:#0F172A;">
                    ${t.student_name}
                    <div style="font-size:11px; color:#64748B; font-weight:400;">${t.student_roll} (${t.department})</div>
                </td>
                <td style="padding:12px; font-size:12px; font-weight:600; color:#2563EB;">
                    ${t.book_title}
                    <div style="font-size:11px; color:#64748B; font-weight:400;">ISBN: ${t.book_isbn}</div>
                </td>
                <td style="padding:12px; font-size:12px; color:#334155;">${t.issue_date}</td>
                <td style="padding:12px; font-size:12px; font-weight:600; color:#334155;">${t.due_date}</td>
                <td style="padding:12px; font-size:12px; color:#64748B;">${t.return_date || '-'}</td>
                <td style="padding:12px;">
                    <span style="font-size:11px; font-weight:700; padding:4px 8px; border-radius:12px; ${badgeStyle}">${t.status}</span>
                </td>
                <td style="padding:12px; font-size:12px; font-weight:700; color:${t.fine_amount > 0 ? '#DC2626' : '#64748B'};">
                    ₹${t.fine_amount}
                    ${t.fine_status !== 'None' ? `<span style="font-size:10px; font-weight:600; display:block; color:#475569;">(${t.fine_status})</span>` : ''}
                </td>
                <td style="padding:12px; text-align:right;">
                    ${t.status !== 'Returned' ? `<button type="button" onclick="openReturnBookModal(${t.id})" style="background:#F0FDF4; color:#166534; border:1px solid #BBF7D0; border-radius:4px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer;">↩️ Return</button>` : '<span style="font-size:12px; color:#94A3B8;">✓ Complete</span>'}
                </td>
            </tr>`;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

function renderLibraryOverdueTable(odList) {
    const container = document.getElementById('libOverdueContainer');
    if (!container) return;

    if (!odList || odList.length === 0) {
        container.innerHTML = `
            <div style="padding:40px; text-align:center; color:#166534; background:#F0FDF4; border-radius:8px; border:1px solid #BBF7D0;">
                <div style="font-size:36px; margin-bottom:10px;">🎉</div>
                <h4 style="margin:0; font-size:16px; color:#166534;">No overdue books!</h4>
                <p style="margin:4px 0 0 0; font-size:13px; color:#15803D;">All borrowed books are returned or within their active due dates.</p>
            </div>`;
        return;
    }

    let html = `
        <div style="overflow-x:auto;">
            <table class="erp-table library-transaction-table" style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#FEF2F2; border-bottom:2px solid #FCA5A5; text-align:left;">
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#991B1B;">Student Member</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#991B1B;">Book Title</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#991B1B;">Issue Date</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#991B1B;">Due Date</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#991B1B;">Days Overdue</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#991B1B;">Accrued Fine</th>
                        <th style="padding:12px; font-size:12px; font-weight:700; color:#991B1B; text-align:right;">Actions</th>
                    </tr>
                </thead>
                <tbody>`;

    odList.forEach(t => {
        html += `
            <tr style="border-bottom:1px solid #FEE2E2;">
                <td style="padding:12px; font-size:13px; font-weight:700; color:#0F172A;">
                    ${t.student_name}
                    <div style="font-size:11px; color:#64748B; font-weight:400;">${t.student_roll} (${t.department})</div>
                </td>
                <td style="padding:12px; font-size:12px; font-weight:600; color:#991B1B;">
                    ${t.book_title}
                    <div style="font-size:11px; color:#64748B; font-weight:400;">ISBN: ${t.book_isbn}</div>
                </td>
                <td style="padding:12px; font-size:12px; color:#334155;">${t.issue_date}</td>
                <td style="padding:12px; font-size:12px; font-weight:700; color:#DC2626;">${t.due_date}</td>
                <td style="padding:12px; font-size:12px; font-weight:700; color:#DC2626;">${t.overdue_days} Days</td>
                <td style="padding:12px; font-size:12px; font-weight:700; color:#B91C1C;">₹${t.fine_amount}</td>
                <td style="padding:12px; text-align:right;">
                    <button type="button" onclick="openReturnBookModal(${t.id})" style="background:#DC2626; color:white; border:none; border-radius:4px; padding:6px 12px; font-size:11px; font-weight:700; cursor:pointer;">↩️ Process Return</button>
                </td>
            </tr>`;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

function resetLibraryFilters() {
    if (document.getElementById('libCategoryFilter')) document.getElementById('libCategoryFilter').value = '';
    if (document.getElementById('libDeptFilter')) document.getElementById('libDeptFilter').value = '';
    if (document.getElementById('libStatusFilter')) document.getElementById('libStatusFilter').value = '';
    if (document.getElementById('libSearchInput')) document.getElementById('libSearchInput').value = '';
    loadLibrary();
}

/* --- BOOK MODAL FUNCTIONS --- */

function openAddBookModal() {
    document.getElementById('libBookForm')?.reset();
    document.getElementById('libBookModalId').value = '';
    document.getElementById('libBookModalTitle').textContent = '📚 Add New Book Title';
    document.getElementById('libBookModal').style.display = 'block';
}

async function openEditBookModal(bookId) {
    try {
        const res = await fetch(`/api/library/books/${bookId}`);
        if (!res.ok) throw new Error("Failed to fetch book");
        const b = await res.json();

        document.getElementById('libBookModalId').value = b.id;
        document.getElementById('libModalIsbn').value = b.isbn;
        document.getElementById('libModalTitle').value = b.title;
        document.getElementById('libModalAuthor').value = b.author;
        document.getElementById('libModalCategory').value = b.category;
        document.getElementById('libModalPublisher').value = b.publisher || '';
        document.getElementById('libModalEdition').value = b.edition || '';
        document.getElementById('libModalPubYear').value = b.pub_year || 2024;
        document.getElementById('libModalQty').value = b.quantity;
        document.getElementById('libModalLocation').value = b.location || '';
        document.getElementById('libModalDesc').value = b.description || '';

        document.getElementById('libBookModalTitle').textContent = `✏️ Edit Book (${b.isbn})`;
        document.getElementById('libBookModal').style.display = 'block';
    } catch (err) {
        showToast(err.message, "error");
    }
}

function closeLibBookModal() {
    const m = document.getElementById('libBookModal');
    if (m) m.style.display = 'none';
}

async function submitLibBookForm(e) {
    e.preventDefault();

    const id = document.getElementById('libBookModalId').value;
    const payload = {
        isbn: document.getElementById('libModalIsbn').value,
        title: document.getElementById('libModalTitle').value,
        author: document.getElementById('libModalAuthor').value,
        category: document.getElementById('libModalCategory').value,
        publisher: document.getElementById('libModalPublisher').value,
        edition: document.getElementById('libModalEdition').value,
        pub_year: document.getElementById('libModalPubYear').value,
        quantity: document.getElementById('libModalQty').value,
        location: document.getElementById('libModalLocation').value,
        description: document.getElementById('libModalDesc').value
    };

    const url = id ? `/api/library/books/${id}` : '/api/library/books';
    const method = id ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || "Failed to save book.", "error");
            return;
        }

        showToast(data.message || "Book saved successfully!", "success");
        closeLibBookModal();
        loadLibrary();
    } catch (err) {
        showToast("Server communication error.", "error");
    }
}

async function confirmDeleteBook(bookId) {
    if (!confirm("Are you sure you want to delete this book from the library catalog?")) return;

    try {
        const res = await fetch(`/api/library/books/${bookId}`, { method: 'DELETE' });
        const data = await res.json();

        if (!res.ok) {
            showToast(data.error || "Delete blocked.", "error");
            return;
        }

        showToast(data.message || "Book deleted successfully.", "success");
        loadLibrary();
    } catch (err) {
        showToast("Failed to delete book.", "error");
    }
}

/* --- ISSUE MODAL FUNCTIONS --- */

async function openIssueBookModal(targetBookId = null, targetStudentId = null) {
    try {
        const bRes = await fetch('/api/library/books?status=Available');
        const books = bRes.ok ? await bRes.json() : [];

        const bSelect = document.getElementById('libIssueBookId');
        if (bSelect) {
            bSelect.innerHTML = '<option value="">-- Select Available Book Title --</option>' +
                books.map(b => `<option value="${b.id}" ${b.id == targetBookId ? 'selected' : ''}>${b.title} (${b.isbn}) - Available: ${b.available_qty}</option>`).join('');
        }

        // Reset ZPRN Verification Fields
        if (document.getElementById('libZprnInput')) document.getElementById('libZprnInput').value = '';
        if (document.getElementById('libZprnMessage')) document.getElementById('libZprnMessage').style.display = 'none';
        if (document.getElementById('libVerifiedStudentBox')) document.getElementById('libVerifiedStudentBox').style.display = 'none';
        if (document.getElementById('libVerifiedStudentId')) document.getElementById('libVerifiedStudentId').value = '';

        const submitBtn = document.getElementById('btnSubmitLibIssue');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.background = '#94A3B8';
            submitBtn.style.cursor = 'not-allowed';
        }

        // Auto-verify if targetStudentId is provided (e.g. from member list row click)
        if (targetStudentId) {
            document.getElementById('libZprnInput').value = targetStudentId;
            await verifyStudentZprn();
        }

        const today = new Date();
        const due = new Date();
        due.setDate(today.getDate() + 14);

        if (document.getElementById('libIssueDate')) document.getElementById('libIssueDate').value = today.toISOString().split('T')[0];
        if (document.getElementById('libDueDate')) document.getElementById('libDueDate').value = due.toISOString().split('T')[0];
        if (document.getElementById('libIssueRemarks')) document.getElementById('libIssueRemarks').value = '';

        document.getElementById('libIssueModal').style.display = 'block';
    } catch (err) {
        showToast("Error preparing issue form.", "error");
    }
}

async function verifyStudentZprn() {
    const zprnInput = document.getElementById('libZprnInput')?.value?.trim();
    const msgBox = document.getElementById('libZprnMessage');
    const studentBox = document.getElementById('libVerifiedStudentBox');
    const submitBtn = document.getElementById('btnSubmitLibIssue');

    if (!zprnInput) {
        if (msgBox) {
            msgBox.style.display = 'block';
            msgBox.style.color = '#DC2626';
            msgBox.textContent = '❌ Please enter ZPRN No. / Enrollment Roll Number.';
        }
        return;
    }

    try {
        const res = await fetch(`/api/library/verify-student/${encodeURIComponent(zprnInput)}`);
        const data = await res.json();

        if (!res.ok) {
            if (msgBox) {
                msgBox.style.display = 'block';
                msgBox.style.color = '#DC2626';
                msgBox.textContent = `❌ ${data.error || 'Student not found in college records'}`;
            }
            if (studentBox) studentBox.style.display = 'none';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.style.background = '#94A3B8';
                submitBtn.style.cursor = 'not-allowed';
            }
            document.getElementById('libVerifiedStudentId').value = '';
            return;
        }

        const s = data.student;
        if (msgBox) {
            msgBox.style.display = 'block';
            msgBox.style.color = '#166534';
            msgBox.textContent = '✓ Student officially verified in college records!';
        }

        document.getElementById('libVerifiedStudentId').value = s.student_id;
        document.getElementById('libCardZprn').textContent = s.zprn;
        document.getElementById('libCardName').textContent = s.fullName;
        document.getElementById('libCardDept').textContent = s.department;
        document.getElementById('libCardCourse').textContent = s.course;
        document.getElementById('libCardYear').textContent = `${s.academic_year} (${s.semester})`;
        document.getElementById('libCardActiveBooks').textContent = `${s.active_issued_books} Books`;

        if (studentBox) studentBox.style.display = 'block';
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.background = '#2563EB';
            submitBtn.style.cursor = 'pointer';
        }
    } catch (err) {
        if (msgBox) {
            msgBox.style.display = 'block';
            msgBox.style.color = '#DC2626';
            msgBox.textContent = '❌ Connection error while verifying ZPRN.';
        }
    }
}

function closeLibIssueModal() {
    const m = document.getElementById('libIssueModal');
    if (m) m.style.display = 'none';
}

async function submitLibIssueForm(e) {
    e.preventDefault();

    const studentId = document.getElementById('libVerifiedStudentId')?.value;
    const bookId = document.getElementById('libIssueBookId')?.value;

    if (!studentId) {
        showToast("Student not verified. Please verify ZPRN first.", "error");
        return;
    }

    if (!bookId) {
        showToast("Please select a book to issue.", "error");
        return;
    }

    const payload = {
        book_id: bookId,
        student_id: studentId,
        issue_date: document.getElementById('libIssueDate').value,
        due_date: document.getElementById('libDueDate').value,
        remarks: document.getElementById('libIssueRemarks').value
    };

    try {
        const res = await fetch('/api/library/issue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || "Issue failed.", "error");
            return;
        }

        showToast(data.message || "Book issued successfully!", "success");
        closeLibIssueModal();
        loadLibrary();
    } catch (err) {
        showToast("Server error during book issue.", "error");
    }
}

/* --- RETURN MODAL FUNCTIONS --- */

async function openReturnBookModal(txId) {
    try {
        const txs = currentLibData.transactions.length ? currentLibData.transactions : (await (await fetch('/api/library/transactions')).json());
        const tx = txs.find(t => t.id === txId);

        if (!tx) throw new Error("Transaction record not found.");

        document.getElementById('libReturnTxId').value = tx.id;
        document.getElementById('libReturnBookTitle').textContent = `📖 ${tx.book_title} (ISBN: ${tx.book_isbn})`;
        document.getElementById('libReturnStudentInfo').textContent = `Student: ${tx.student_name} (${tx.student_roll} • ${tx.department})`;
        document.getElementById('libReturnIssueDate').textContent = tx.issue_date;
        document.getElementById('libReturnDueDate').textContent = tx.due_date;

        const todayStr = new Date().toISOString().split('T')[0];
        document.getElementById('libReturnDate').value = todayStr;
        document.getElementById('libReturnRemarks').value = '';

        calculateReturnFine();

        document.getElementById('libReturnModal').style.display = 'block';
    } catch (err) {
        showToast(err.message, "error");
    }
}

function calculateReturnFine() {
    const dueStr = document.getElementById('libReturnDueDate').textContent;
    const retStr = document.getElementById('libReturnDate').value;
    const fineBox = document.getElementById('libFineCalcBox');

    if (!dueStr || !retStr || dueStr === '-') return;

    const dueDate = new Date(dueStr);
    const retDate = new Date(retStr);

    const diffTime = retDate - dueDate;
    const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    if (diffDays > 0) {
        const fineAmt = (diffDays * 10).toFixed(2);
        document.getElementById('libCalcOverdueDays').textContent = diffDays;
        document.getElementById('libCalcFineAmount').textContent = `₹${fineAmt}`;
        if (fineBox) fineBox.style.display = 'block';
    } else {
        if (fineBox) fineBox.style.display = 'none';
    }
}

function closeLibReturnModal() {
    const m = document.getElementById('libReturnModal');
    if (m) m.style.display = 'none';
}

async function submitLibReturnForm(e) {
    e.preventDefault();

    const txId = document.getElementById('libReturnTxId').value;
    const payload = {
        return_date: document.getElementById('libReturnDate').value,
        fine_status: document.getElementById('libReturnFineStatus')?.value || 'Pending',
        remarks: document.getElementById('libReturnRemarks').value
    };

    try {
        const res = await fetch(`/api/library/return/${txId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || "Return failed.", "error");
            return;
        }

        showToast(data.message || "Book returned successfully!", "success");
        closeLibReturnModal();
        loadLibrary();
    } catch (err) {
        showToast("Server error during book return.", "error");
    }
}

/* --- EXPORT REPORT FUNCTIONS --- */

function exportLibraryPDF(reportType = "inventory") {
    window.open(`/api/library/export/pdf?type=${reportType}`, '_blank');
}

function exportLibraryCSV(reportType = "inventory") {
    window.open(`/api/library/export/csv?type=${reportType}`, '_blank');
}

/* ============================================================ */
/* TRANSPORT MANAGEMENT SUBSYSTEM JS LOGIC                     */
/* ============================================================ */

let currentTransportTab = "vehicles";
let cachedTransportVehicles = [];
let cachedTransportRoutes = [];
let cachedTransportDrivers = [];
let cachedTransportPasses = [];

async function loadTransport() {
    try {
        const [dashRes, vehRes, routeRes, driverRes, passRes] = await Promise.all([
            fetch('/api/transport/dashboard'),
            fetch('/api/transport/vehicles'),
            fetch('/api/transport/routes'),
            fetch('/api/transport/drivers'),
            fetch('/api/transport/assignments')
        ]);

        if (dashRes.ok) {
            const summary = await dashRes.json();
            renderTransportSummary(summary);
        }

        cachedTransportVehicles = vehRes.ok ? await vehRes.json() : [];
        cachedTransportRoutes = routeRes.ok ? await routeRes.json() : [];
        cachedTransportDrivers = driverRes.ok ? await driverRes.json() : [];
        cachedTransportPasses = passRes.ok ? await passRes.json() : [];

        populateTransportDropdowns();
        renderActiveTransportTab();
    } catch (err) {
        console.error("loadTransport error:", err);
        showToast("Error loading transport management data.", "error");
    }
}

function renderTransportSummary(s) {
    if (document.getElementById("trnKpiVehicles")) document.getElementById("trnKpiVehicles").textContent = s.total_vehicles || 0;
    if (document.getElementById("trnKpiActiveVehicles")) document.getElementById("trnKpiActiveVehicles").textContent = s.active_vehicles || 0;
    if (document.getElementById("trnKpiRoutes")) document.getElementById("trnKpiRoutes").textContent = s.total_routes || 0;
    if (document.getElementById("trnKpiDrivers")) document.getElementById("trnKpiDrivers").textContent = s.total_drivers || 0;
    if (document.getElementById("trnKpiStudents")) document.getElementById("trnKpiStudents").textContent = s.total_transport_students || 0;
    if (document.getElementById("trnKpiSeats")) document.getElementById("trnKpiSeats").textContent = s.available_seats || 0;
    if (document.getElementById("trnKpiPendingFees")) document.getElementById("trnKpiPendingFees").textContent = `₹${(s.pending_fees || 0).toLocaleString('en-IN')}`;
}

function populateTransportDropdowns() {
    const routeSelect = document.getElementById("trnRouteFilter");
    if (routeSelect) {
        routeSelect.innerHTML = '<option value="all">All Routes</option>' +
            cachedTransportRoutes.map(r => `<option value="${r.id}">${r.route_code} - ${r.route_name}</option>`).join('');
    }

    const vehDriverSelect = document.getElementById("trnVehDriver");
    if (vehDriverSelect) {
        vehDriverSelect.innerHTML = '<option value="">-- Choose Driver --</option>' +
            cachedTransportDrivers.map(d => `<option value="${d.id}">${d.name} (${d.phone})</option>`).join('');
    }

    const vehRouteSelect = document.getElementById("trnVehRoute");
    if (vehRouteSelect) {
        vehRouteSelect.innerHTML = '<option value="">-- Choose Route --</option>' +
            cachedTransportRoutes.map(r => `<option value="${r.id}">${r.route_code} - ${r.route_name}</option>`).join('');
    }

    const assignRouteSelect = document.getElementById("trnAssignRouteId");
    if (assignRouteSelect) {
        assignRouteSelect.innerHTML = '<option value="">-- Choose Route --</option>' +
            cachedTransportRoutes.map(r => `<option value="${r.id}">${r.route_code} - ${r.route_name} (Avail Seats: ${r.available_seats})</option>`).join('');
    }
}

function switchTransportTab(tabName, btnEl) {
    currentTransportTab = tabName;
    document.querySelectorAll(".trn-tab-btn").forEach(b => b.classList.remove("active"));
    if (btnEl) btnEl.classList.add("active");

    const containers = ["trnVehiclesContainer", "trnRoutesContainer", "trnDriversContainer", "trnPassesContainer", "trnOccupancyContainer"];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });

    renderActiveTransportTab();
}

function renderActiveTransportTab() {
    if (currentTransportTab === "vehicles") {
        document.getElementById("trnVehiclesContainer").style.display = "block";
        renderTransportVehiclesTable(cachedTransportVehicles);
    } else if (currentTransportTab === "routes") {
        document.getElementById("trnRoutesContainer").style.display = "block";
        renderTransportRoutesTable(cachedTransportRoutes);
    } else if (currentTransportTab === "drivers") {
        document.getElementById("trnDriversContainer").style.display = "block";
        renderTransportDriversTable(cachedTransportDrivers);
    } else if (currentTransportTab === "passes") {
        document.getElementById("trnPassesContainer").style.display = "block";
        renderTransportPassesTable(cachedTransportPasses);
    } else if (currentTransportTab === "occupancy") {
        document.getElementById("trnOccupancyContainer").style.display = "block";
        renderTransportOccupancyTable(cachedTransportRoutes);
    }
}

function renderTransportVehiclesTable(list) {
    const c = document.getElementById("trnVehiclesContainer");
    if (!c) return;

    if (!list || list.length === 0) {
        c.innerHTML = `<div style="text-align:center; padding:40px; color:#64748B;">No transport vehicles found. Click "+ Add Vehicle" to register a bus.</div>`;
        return;
    }

    c.innerHTML = `
        <table class="erp-table" style="width:100%;">
            <thead>
                <tr>
                    <th>Vehicle Number</th>
                    <th>Reg Number</th>
                    <th>Type</th>
                    <th>Capacity</th>
                    <th>Driver</th>
                    <th>Assigned Route</th>
                    <th>Status</th>
                    <th>Expiry Dates</th>
                    <th style="text-align:right;">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${list.map(v => `
                    <tr>
                        <td><strong style="color:#0F172A; font-family:monospace;">${v.vehicle_number}</strong></td>
                        <td><small style="color:#64748B; font-weight:700;">${v.registration_number}</small></td>
                        <td><span style="background:#EFF6FF; color:#1E40AF; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:700;">${v.vehicle_type}</span></td>
                        <td><strong>${v.assigned_students} / ${v.capacity}</strong> <small>(${v.available_seats} free)</small></td>
                        <td>${v.driver_name} <br><small style="color:#64748B;">📞 ${v.driver_phone}</small></td>
                        <td><strong style="color:#2563EB;">${v.route_code}</strong> - ${v.route_name}</td>
                        <td>
                            <span style="padding:3px 10px; border-radius:12px; font-size:11px; font-weight:700; background:${v.status === 'Active' ? '#DCFCE7' : v.status === 'Maintenance' ? '#FEF3C7' : '#F1F5F9'}; color:${v.status === 'Active' ? '#166534' : v.status === 'Maintenance' ? '#92400E' : '#475569'};">
                                ${v.status}
                            </span>
                        </td>
                        <td>
                            <small style="display:block;">🛡️ Ins: ${v.insurance_expiry || 'N/A'}</small>
                            <small style="display:block;">🔧 Fit: ${v.fitness_expiry || 'N/A'}</small>
                        </td>
                        <td style="text-align:right;">
                            <button type="button" onclick="openTransportVehicleModal(${v.id})" style="background:#F1F5F9; color:#2563EB; border:1px solid #CBD5E1; border-radius:4px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer; margin-right:4px;">✏️ Edit</button>
                            <button type="button" onclick="deleteTransportVehicle(${v.id})" style="background:#FEF2F2; color:#DC2626; border:1px solid #FCA5A5; border-radius:4px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer;">🗑 Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderTransportRoutesTable(list) {
    const c = document.getElementById("trnRoutesContainer");
    if (!c) return;

    if (!list || list.length === 0) {
        c.innerHTML = `<div style="text-align:center; padding:40px; color:#64748B;">No bus routes found. Click "+ Add Route" to create a route.</div>`;
        return;
    }

    c.innerHTML = `
        <table class="erp-table" style="width:100%;">
            <thead>
                <tr>
                    <th>Code</th>
                    <th>Route Name</th>
                    <th>Start ➔ Destination</th>
                    <th>Distance & Time</th>
                    <th>Stops Count</th>
                    <th>Vehicles</th>
                    <th>Occupancy</th>
                    <th>Status</th>
                    <th style="text-align:right;">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${list.map(r => `
                    <tr>
                        <td><strong style="color:#2563EB; font-family:monospace;">${r.route_code}</strong></td>
                        <td><strong style="color:#0F172A;">${r.route_name}</strong></td>
                        <td>${r.start_point} ➔ ${r.destination}</td>
                        <td>${r.distance_km} km <small>(${r.estimated_time})</small></td>
                        <td><strong>📍 ${r.stops_count} Stops</strong></td>
                        <td><strong>🚌 ${r.vehicles_count} Buses</strong></td>
                        <td><strong>${r.assigned_students} / ${r.total_capacity} Seats</strong></td>
                        <td><span style="padding:3px 8px; border-radius:12px; font-size:11px; font-weight:700; background:#DCFCE7; color:#166534;">${r.status}</span></td>
                        <td style="text-align:right;">
                            <button type="button" onclick="openTransportStopModal(${r.id})" style="background:#F0FDF4; color:#166534; border:1px solid #BBF7D0; border-radius:4px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer; margin-right:4px;">+ Stop</button>
                            <button type="button" onclick="openTransportRouteModal(${r.id})" style="background:#F1F5F9; color:#2563EB; border:1px solid #CBD5E1; border-radius:4px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer; margin-right:4px;">✏️ Edit</button>
                            <button type="button" onclick="deleteTransportRoute(${r.id})" style="background:#FEF2F2; color:#DC2626; border:1px solid #FCA5A5; border-radius:4px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer;">🗑 Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderTransportDriversTable(list) {
    const c = document.getElementById("trnDriversContainer");
    if (!c) return;

    if (!list || list.length === 0) {
        c.innerHTML = `<div style="text-align:center; padding:40px; color:#64748B;">No drivers found. Click "+ Add Driver" to register a driver.</div>`;
        return;
    }

    c.innerHTML = `
        <table class="erp-table" style="width:100%;">
            <thead>
                <tr>
                    <th>Driver Name</th>
                    <th>Phone Number</th>
                    <th>License Number</th>
                    <th>License Expiry</th>
                    <th>Assigned Vehicle</th>
                    <th>Emergency Contact</th>
                    <th>Status</th>
                    <th style="text-align:right;">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${list.map(d => `
                    <tr>
                        <td><strong style="color:#0F172A;">${d.name}</strong></td>
                        <td>📞 ${d.phone}</td>
                        <td><code style="font-weight:700; color:#475569;">${d.license_number}</code></td>
                        <td>${d.license_expiry || 'N/A'}</td>
                        <td><strong style="color:#2563EB;">${d.assigned_vehicle}</strong></td>
                        <td>${d.emergency_contact}</td>
                        <td><span style="padding:3px 8px; border-radius:12px; font-size:11px; font-weight:700; background:${d.status === 'Active' ? '#DCFCE7' : '#F1F5F9'}; color:${d.status === 'Active' ? '#166534' : '#475569'};">${d.status}</span></td>
                        <td style="text-align:right;">
                            <button type="button" onclick="deleteTransportDriver(${d.id})" style="background:#FEF2F2; color:#DC2626; border:1px solid #FCA5A5; border-radius:4px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer;">🗑 Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderTransportPassesTable(list) {
    const c = document.getElementById("trnPassesContainer");
    if (!c) return;

    if (!list || list.length === 0) {
        c.innerHTML = `<div style="text-align:center; padding:40px; color:#64748B;">No active student transport passes. Click "🚌 Register Student" to issue a pass using ZPRN.</div>`;
        return;
    }

    c.innerHTML = `
        <table class="erp-table" style="width:100%;">
            <thead>
                <tr>
                    <th>ZPRN</th>
                    <th>Student Name</th>
                    <th>Department</th>
                    <th>Assigned Route</th>
                    <th>Bus Stop</th>
                    <th>Vehicle</th>
                    <th>Fee Status</th>
                    <th>Pass Status</th>
                    <th style="text-align:right;">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${list.map(p => `
                    <tr>
                        <td><strong style="color:#2563EB; font-family:monospace;">${p.zprn}</strong></td>
                        <td><strong style="color:#0F172A;">${p.student_name}</strong></td>
                        <td>${p.department}</td>
                        <td><strong style="color:#4F46E5;">${p.route_code}</strong> - ${p.route_name}</td>
                        <td>📍 ${p.stop_name}</td>
                        <td>🚌 ${p.vehicle_number}</td>
                        <td><span style="padding:3px 8px; border-radius:12px; font-size:11px; font-weight:700; background:#DCFCE7; color:#166534;">₹${p.fee_amount} (${p.fee_status})</span></td>
                        <td><span style="padding:3px 8px; border-radius:12px; font-size:11px; font-weight:700; background:${p.status === 'Active' ? '#DCFCE7' : '#FEF2F2'}; color:${p.status === 'Active' ? '#166534' : '#DC2626'};">${p.status}</span></td>
                        <td style="text-align:right;">
                            ${p.status === 'Active' ? `<button type="button" class="btn-cancel-pass" onclick="cancelTransportPass(${p.id})">❌ Cancel Pass</button>` : ''}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderTransportOccupancyTable(routes) {
    const c = document.getElementById("trnOccupancyContainer");
    if (!c) return;

    if (!routes || routes.length === 0) {
        c.innerHTML = `<div style="text-align:center; padding:40px; color:#64748B;">No route occupancy data available.</div>`;
        return;
    }

    c.innerHTML = `
        <div style="padding:16px;">
            <h4 style="margin:0 0 16px 0; color:#0F172A;">📊 Route Seat Occupancy & Capacity Utilization</h4>
            ${routes.map(r => {
                const pct = Math.min(100, Math.round((r.assigned_students / (r.total_capacity || 1)) * 100));
                const barColor = pct >= 90 ? '#DC2626' : pct >= 75 ? '#D97706' : '#16A34A';
                return `
                    <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:14px; margin-bottom:14px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <div>
                                <strong style="color:#2563EB; font-family:monospace; font-size:14px;">${r.route_code}</strong> -
                                <strong style="color:#0F172A; font-size:14px;">${r.route_name}</strong>
                                <small style="color:#64748B; margin-left:8px;">(📍 ${r.stops_count} Stops | 🚌 ${r.vehicles_count} Buses)</small>
                            </div>
                            <div>
                                <span style="font-size:13px; font-weight:800; color:${barColor};">${r.assigned_students} / ${r.total_capacity} Seats Occupied (${pct}%)</span>
                            </div>
                        </div>
                        <div style="width:100%; height:12px; background:#E2E8F0; border-radius:6px; overflow:hidden;">
                            <div style="width:${pct}%; height:100%; background:${barColor}; transition:width 0.3s ease;"></div>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-top:6px; font-size:11px; color:#64748B;">
                            <span>Available Free Seats: <strong>${r.available_seats}</strong></span>
                            <span>Status: <strong style="color:#166534;">${r.available_seats > 0 ? 'Seats Available' : 'FULL'}</strong></span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

/* --- TRANSPORT MODAL HANDLERS --- */

function openTransportVehicleModal(vehId = null) {
    document.getElementById('trnVehicleForm').reset();
    document.getElementById('trnVehId').value = '';
    document.getElementById('trnVehModalTitle').textContent = '🚌 Register New Transport Vehicle';

    populateTransportDropdowns();

    if (vehId) {
        const v = cachedTransportVehicles.find(item => item.id == vehId);
        if (v) {
            document.getElementById('trnVehId').value = v.id;
            document.getElementById('trnVehNumber').value = v.vehicle_number;
            document.getElementById('trnRegNumber').value = v.registration_number;
            document.getElementById('trnVehType').value = v.vehicle_type;
            document.getElementById('trnVehCapacity').value = v.capacity;
            document.getElementById('trnVehStatus').value = v.status;
            document.getElementById('trnVehDriver').value = v.assigned_driver_id || '';
            document.getElementById('trnVehRoute').value = v.assigned_route_id || '';
            document.getElementById('trnVehInsExp').value = v.insurance_expiry || '';
            document.getElementById('trnVehFitExp').value = v.fitness_expiry || '';
            document.getElementById('trnVehDesc').value = v.description || '';
            document.getElementById('trnVehModalTitle').textContent = '✏️ Edit Transport Vehicle';
        }
    }

    document.getElementById('transportVehicleModal').style.display = 'block';
}

function closeTransportVehicleModal() {
    document.getElementById('transportVehicleModal').style.display = 'none';
}

async function submitTransportVehicleForm(e) {
    e.preventDefault();
    const vehId = document.getElementById('trnVehId').value;
    const payload = {
        vehicle_number: document.getElementById('trnVehNumber').value,
        registration_number: document.getElementById('trnRegNumber').value,
        vehicle_type: document.getElementById('trnVehType').value,
        capacity: document.getElementById('trnVehCapacity').value,
        status: document.getElementById('trnVehStatus').value,
        assigned_driver_id: document.getElementById('trnVehDriver').value,
        assigned_route_id: document.getElementById('trnVehRoute').value,
        insurance_expiry: document.getElementById('trnVehInsExp').value,
        fitness_expiry: document.getElementById('trnVehFitExp').value,
        description: document.getElementById('trnVehDesc').value
    };

    const url = vehId ? `/api/transport/vehicles/${vehId}` : '/api/transport/vehicles';
    const method = vehId ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || "Vehicle action failed.", "error");
            return;
        }
        showToast(data.message || "Vehicle saved successfully!", "success");
        closeTransportVehicleModal();
        loadTransport();
    } catch (err) {
        showToast("Server error saving vehicle.", "error");
    }
}

async function deleteTransportVehicle(vehId) {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;
    try {
        const res = await fetch(`/api/transport/vehicles/${vehId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || "Delete failed.", "error");
            return;
        }
        showToast(data.message || "Vehicle deleted.", "success");
        loadTransport();
    } catch (err) {
        showToast("Server error deleting vehicle.", "error");
    }
}

function openTransportRouteModal(routeId = null) {
    document.getElementById('trnRouteForm').reset();
    document.getElementById('trnRouteId').value = '';
    document.getElementById('trnRouteModalTitle').textContent = '🗺️ Create Bus Route';

    if (routeId) {
        const r = cachedTransportRoutes.find(item => item.id == routeId);
        if (r) {
            document.getElementById('trnRouteId').value = r.id;
            document.getElementById('trnRouteCode').value = r.route_code;
            document.getElementById('trnRouteName').value = r.route_name;
            document.getElementById('trnRouteStart').value = r.start_point;
            document.getElementById('trnRouteDest').value = r.destination;
            document.getElementById('trnRouteDistance').value = r.distance_km;
            document.getElementById('trnRouteTime').value = r.estimated_time;
            document.getElementById('trnRouteStatus').value = r.status;
            document.getElementById('trnRouteModalTitle').textContent = '✏️ Edit Bus Route';
        }
    }

    document.getElementById('transportRouteModal').style.display = 'block';
}

function closeTransportRouteModal() {
    document.getElementById('transportRouteModal').style.display = 'none';
}

async function submitTransportRouteForm(e) {
    e.preventDefault();
    const routeId = document.getElementById('trnRouteId').value;
    const payload = {
        route_code: document.getElementById('trnRouteCode').value,
        route_name: document.getElementById('trnRouteName').value,
        start_point: document.getElementById('trnRouteStart').value,
        destination: document.getElementById('trnRouteDest').value,
        distance_km: document.getElementById('trnRouteDistance').value,
        estimated_time: document.getElementById('trnRouteTime').value,
        status: document.getElementById('trnRouteStatus').value
    };

    const url = routeId ? `/api/transport/routes/${routeId}` : '/api/transport/routes';
    const method = routeId ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || "Route action failed.", "error");
            return;
        }
        showToast(data.message || "Route saved successfully!", "success");
        closeTransportRouteModal();
        loadTransport();
    } catch (err) {
        showToast("Server error saving route.", "error");
    }
}

async function deleteTransportRoute(routeId) {
    if (!confirm("Are you sure you want to delete this route?")) return;
    try {
        const res = await fetch(`/api/transport/routes/${routeId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || "Delete failed.", "error");
            return;
        }
        showToast(data.message || "Route deleted.", "success");
        loadTransport();
    } catch (err) {
        showToast("Server error deleting route.", "error");
    }
}

function openTransportStopModal(routeId) {
    document.getElementById('trnStopForm').reset();
    document.getElementById('trnStopRouteId').value = routeId;
    document.getElementById('transportStopModal').style.display = 'block';
}

function closeTransportStopModal() {
    document.getElementById('transportStopModal').style.display = 'none';
}

async function submitTransportStopForm(e) {
    e.preventDefault();
    const payload = {
        route_id: document.getElementById('trnStopRouteId').value,
        stop_name: document.getElementById('trnStopName').value,
        sequence_number: document.getElementById('trnStopSeq').value,
        pickup_time: document.getElementById('trnStopPickup').value,
        drop_time: document.getElementById('trnStopDrop').value
    };

    try {
        const res = await fetch('/api/transport/stops', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || "Failed to add stop.", "error");
            return;
        }
        showToast(data.message || "Stop added successfully!", "success");
        closeTransportStopModal();
        loadTransport();
    } catch (err) {
        showToast("Server error adding stop.", "error");
    }
}

function openTransportDriverModal() {
    document.getElementById('trnDriverForm').reset();
    document.getElementById('transportDriverModal').style.display = 'block';
}

function closeTransportDriverModal() {
    document.getElementById('transportDriverModal').style.display = 'none';
}

async function submitTransportDriverForm(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('trnDriverName').value,
        phone: document.getElementById('trnDriverPhone').value,
        license_number: document.getElementById('trnDriverLic').value,
        license_expiry: document.getElementById('trnDriverLicExp').value,
        emergency_contact: document.getElementById('trnDriverEmergency').value
    };

    try {
        const res = await fetch('/api/transport/drivers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || "Driver action failed.", "error");
            return;
        }
        showToast(data.message || "Driver registered successfully!", "success");
        closeTransportDriverModal();
        loadTransport();
    } catch (err) {
        showToast("Server error registering driver.", "error");
    }
}

async function deleteTransportDriver(driverId) {
    if (!confirm("Are you sure you want to delete this driver?")) return;
    try {
        const res = await fetch(`/api/transport/drivers/${driverId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || "Delete failed.", "error");
            return;
        }
        showToast(data.message || "Driver deleted.", "success");
        loadTransport();
    } catch (err) {
        showToast("Server error deleting driver.", "error");
    }
}

function openTransportAssignModal(targetZprn = null) {
    document.getElementById('trnAssignForm').reset();
    document.getElementById('trnZprnInput').value = '';
    document.getElementById('trnZprnMessage').style.display = 'none';
    document.getElementById('trnVerifiedStudentBox').style.display = 'none';
    document.getElementById('trnVerifiedStudentId').value = '';

    const submitBtn = document.getElementById('btnSubmitTrnAssign');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.background = '#94A3B8';
        submitBtn.style.cursor = 'not-allowed';
    }

    populateTransportDropdowns();

    if (targetZprn) {
        document.getElementById('trnZprnInput').value = targetZprn;
        verifyTransportStudentZprn();
    }

    document.getElementById('transportAssignModal').style.display = 'block';
}

function closeTransportAssignModal() {
    document.getElementById('transportAssignModal').style.display = 'none';
}

async function verifyTransportStudentZprn() {
    const zprnInput = document.getElementById('trnZprnInput')?.value?.trim();
    const msgBox = document.getElementById('trnZprnMessage');
    const studentBox = document.getElementById('trnVerifiedStudentBox');
    const submitBtn = document.getElementById('btnSubmitTrnAssign');

    if (!zprnInput) {
        if (msgBox) {
            msgBox.style.display = 'block';
            msgBox.style.color = '#DC2626';
            msgBox.textContent = '❌ Please enter ZPRN No. / Enrollment Roll Number.';
        }
        return;
    }

    try {
        const res = await fetch(`/api/transport/verify-student/${encodeURIComponent(zprnInput)}`);
        const data = await res.json();

        if (!res.ok) {
            if (msgBox) {
                msgBox.style.display = 'block';
                msgBox.style.color = '#DC2626';
                msgBox.textContent = `❌ ${data.error || 'Student not found in college records'}`;
            }
            if (studentBox) studentBox.style.display = 'none';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.style.background = '#94A3B8';
                submitBtn.style.cursor = 'not-allowed';
            }
            document.getElementById('trnVerifiedStudentId').value = '';
            return;
        }

        const s = data.student;
        if (msgBox) {
            msgBox.style.display = 'block';
            msgBox.style.color = '#166534';
            msgBox.textContent = '✓ Student officially verified in college records!';
        }

        document.getElementById('trnVerifiedStudentId').value = s.student_id;
        document.getElementById('trnCardZprn').textContent = s.zprn;
        document.getElementById('trnCardName').textContent = s.fullName;
        document.getElementById('trnCardDept').textContent = s.department;
        document.getElementById('trnCardCourse').textContent = s.course;
        document.getElementById('trnCardYear').textContent = `${s.academic_year} (${s.semester})`;
        document.getElementById('trnCardPassStatus').textContent = s.already_assigned ? `Active (${s.existing_route})` : 'Not Issued';

        if (studentBox) studentBox.style.display = 'block';
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.background = '#16A34A';
            submitBtn.style.cursor = 'pointer';
        }
    } catch (err) {
        if (msgBox) {
            msgBox.style.display = 'block';
            msgBox.style.color = '#DC2626';
            msgBox.textContent = '❌ Connection error while verifying ZPRN.';
        }
    }
}

function onTransportRouteSelectChange() {
    const routeId = document.getElementById('trnAssignRouteId')?.value;
    const stopSelect = document.getElementById('trnAssignStopId');
    const vehSelect = document.getElementById('trnAssignVehicleId');

    if (!routeId || !stopSelect) return;

    const r = cachedTransportRoutes.find(item => item.id == routeId);
    if (r && r.stops) {
        stopSelect.innerHTML = '<option value="">-- Choose Stop --</option>' +
            r.stops.map(s => `<option value="${s.id}">📍 ${s.stop_name} (Pickup: ${s.pickup_time})</option>`).join('');
    } else {
        stopSelect.innerHTML = '<option value="">No stops available for this route</option>';
    }

    if (vehSelect) {
        const routeVehicles = cachedTransportVehicles.filter(v => v.assigned_route_id == routeId && v.status === 'Active');
        vehSelect.innerHTML = '<option value="">Auto-assign route bus</option>' +
            routeVehicles.map(v => `<option value="${v.id}">🚌 ${v.vehicle_number} (Free: ${v.available_seats}/${v.capacity})</option>`).join('');
    }
}

async function submitTransportAssignForm(e) {
    e.preventDefault();

    const zprn = document.getElementById('trnZprnInput')?.value?.trim();
    const routeId = document.getElementById('trnAssignRouteId')?.value;
    const stopId = document.getElementById('trnAssignStopId')?.value;
    const vehicleId = document.getElementById('trnAssignVehicleId')?.value;
    const feeAmount = document.getElementById('trnAssignFee')?.value;

    if (!zprn || !routeId || !stopId) {
        showToast("Please complete ZPRN, Route, and Stop selection.", "error");
        return;
    }

    const payload = {
        zprn: zprn,
        route_id: routeId,
        stop_id: stopId,
        vehicle_id: vehicleId || null,
        fee_amount: feeAmount
    };

    try {
        const res = await fetch('/api/transport/assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || "Transport pass issue failed.", "error");
            return;
        }

        showToast(data.message || "Transport pass issued successfully!", "success");
        closeTransportAssignModal();
        loadTransport();
    } catch (err) {
        showToast("Server error issuing transport pass.", "error");
    }
}

async function cancelTransportPass(passId) {
    if (!confirm("Are you sure you want to cancel this student's transport pass?")) return;
    try {
        const res = await fetch(`/api/transport/assignments/${passId}/cancel`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || "Cancellation failed.", "error");
            return;
        }
        showToast(data.message || "Pass cancelled successfully.", "success");
        loadTransport();
    } catch (err) {
        showToast("Server error cancelling pass.", "error");
    }
}

function exportTransportPDF() {
    window.open('/api/transport/export/pdf?type=vehicle', '_blank');
}

function applyTransportFilters() {
    const searchVal = document.getElementById("trnSearchInput")?.value?.trim().toLowerCase();
    const statusVal = document.getElementById("trnStatusFilter")?.value;
    const routeVal = document.getElementById("trnRouteFilter")?.value;

    if (currentTransportTab === "vehicles") {
        let list = cachedTransportVehicles;
        if (statusVal && statusVal !== "all") list = list.filter(v => v.status === statusVal);
        if (routeVal && routeVal !== "all") list = list.filter(v => v.assigned_route_id == routeVal);
        if (searchVal) list = list.filter(v => v.vehicle_number.toLowerCase().includes(searchVal) || v.registration_number.toLowerCase().includes(searchVal));
        renderTransportVehiclesTable(list);
    } else if (currentTransportTab === "routes") {
        let list = cachedTransportRoutes;
        if (statusVal && statusVal !== "all") list = list.filter(r => r.status === statusVal);
        if (searchVal) list = list.filter(r => r.route_name.toLowerCase().includes(searchVal) || r.route_code.toLowerCase().includes(searchVal));
        renderTransportRoutesTable(list);
    } else if (currentTransportTab === "passes") {
        let list = cachedTransportPasses;
        if (routeVal && routeVal !== "all") list = list.filter(p => p.route_id == routeVal);
        if (searchVal) list = list.filter(p => p.zprn.toLowerCase().includes(searchVal) || p.student_name.toLowerCase().includes(searchVal));
        renderTransportPassesTable(list);
    }
}

function resetTransportFilters() {
    if (document.getElementById("trnSearchInput")) document.getElementById("trnSearchInput").value = "";
    if (document.getElementById("trnStatusFilter")) document.getElementById("trnStatusFilter").value = "all";
    if (document.getElementById("trnDeptFilter")) document.getElementById("trnDeptFilter").value = "all";
    if (document.getElementById("trnRouteFilter")) document.getElementById("trnRouteFilter").value = "all";
    renderActiveTransportTab();
}

// ============================================================
// NOTICE BOARD & ANNOUNCEMENT MANAGEMENT MODULE LOGIC
// ============================================================

let ntcCurrentPage = 1;
let ntcLimit = 20;
let ntcTotalCount = 0;
let ntcDbTotalCount = 0;

async function fetchNoticesModule(page = 1) {
    ntcCurrentPage = page;
    const searchVal = document.getElementById("ntcSearchInput") ? document.getElementById("ntcSearchInput").value.trim() : "";
    const categoryVal = document.getElementById("ntcCategoryFilter") ? document.getElementById("ntcCategoryFilter").value.trim() : "";
    const priorityVal = document.getElementById("ntcPriorityFilter") ? document.getElementById("ntcPriorityFilter").value.trim() : "";
    const statusVal = document.getElementById("ntcStatusFilter") ? document.getElementById("ntcStatusFilter").value.trim() : "";
    const audienceVal = document.getElementById("ntcAudienceFilter") ? document.getElementById("ntcAudienceFilter").value.trim() : "";
    const deptVal = document.getElementById("ntcDeptFilter") ? document.getElementById("ntcDeptFilter").value.trim() : "";

    const queryParams = {
        page: ntcCurrentPage,
        limit: ntcLimit
    };
    if (searchVal) queryParams.search = searchVal;
    if (categoryVal) queryParams.category = categoryVal;
    if (priorityVal) queryParams.priority = priorityVal;
    if (statusVal) queryParams.status = statusVal;
    if (audienceVal) queryParams.audience = audienceVal;
    if (deptVal) queryParams.department = deptVal;

    const params = new URLSearchParams(queryParams);
    const tbodyEl = document.getElementById("noticeTableBody");

    if (tbodyEl) {
        tbodyEl.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #64748B;">
                    <div style="font-size: 24px; margin-bottom: 8px;">⌛</div>
                    <div>Loading campus notices from database...</div>
                </td>
            </tr>
        `;
    }

    try {
        const response = await fetch(`/api/notices?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch notice records");
        const data = await response.json();

        console.log("Notices API response:", data);

        let noticesList = [];
        if (Array.isArray(data)) {
            noticesList = data;
            ntcTotalCount = data.length;
        } else if (data && Array.isArray(data.notices)) {
            noticesList = data.notices;
            ntcTotalCount = (data.total !== undefined) ? data.total : data.notices.length;
        } else {
            noticesList = [];
            ntcTotalCount = 0;
        }

        console.log("Notices loaded count:", noticesList.length);
        renderNoticesTableFromData(noticesList);
        renderNoticesPagination();

    } catch (err) {
        console.error("fetchNoticesModule error:", err);
        if (tbodyEl) {
            tbodyEl.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 30px; color: #EF4444;">
                        ⚠️ Unable to load notices. Please try again.
                    </td>
                </tr>
            `;
        }
    }
}

async function fetchNoticeKpiStats() {
    try {
        const response = await fetch("/api/notices/stats");
        if (!response.ok) return;
        const stats = await response.json();

        ntcDbTotalCount = stats.total_notices || 0;

        const totalEl = document.getElementById("ntcKpiTotal");
        const pubEl = document.getElementById("ntcKpiPublished");
        const draftEl = document.getElementById("ntcKpiDrafts");
        const schedEl = document.getElementById("ntcKpiScheduled");
        const expEl = document.getElementById("ntcKpiExpired");
        const pinEl = document.getElementById("ntcKpiPinned");
        const urgEl = document.getElementById("ntcKpiUrgent");

        if (totalEl) totalEl.textContent = stats.total_notices || 0;
        if (pubEl) pubEl.textContent = stats.published || 0;
        if (draftEl) draftEl.textContent = stats.drafts || 0;
        if (schedEl) schedEl.textContent = stats.scheduled || 0;
        if (expEl) expEl.textContent = stats.expired || 0;
        if (pinEl) pinEl.textContent = stats.pinned || 0;
        if (urgEl) urgEl.textContent = stats.urgent || 0;

    } catch (err) {
        console.error("fetchNoticeKpiStats error:", err);
    }
}

function renderNoticesTableFromData(list) {
    const tbodyEl = document.getElementById("noticeTableBody");
    const countEl = document.getElementById("ntcToolbarCount");
    if (!tbodyEl) return;

    const totalDisplayCount = ntcDbTotalCount || ntcTotalCount || (list ? list.length : 0);

    if (countEl) {
        countEl.textContent = `Showing ${list.length} of ${totalDisplayCount} records`;
    }

    if (!list || list.length === 0) {
        tbodyEl.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #64748B;">
                    <div style="font-size: 28px; margin-bottom: 8px;">📂</div>
                    <div style="font-weight: 600; color: #1E293B;">No notices match the selected filters.</div>
                    <small>Try adjusting your search criteria or resetting filters.</small>
                </td>
            </tr>
        `;
        return;
    }

    tbodyEl.innerHTML = list.map(n => {
        const title = escapeHtml(n.title || "Untitled Notice");
        const category = escapeHtml(n.category || "General");
        const priority = n.priority || "Normal";
        const status = n.status || "Draft";
        const audience = escapeHtml(n.audience || "Everyone");
        const targetDept = escapeHtml(n.department || "");
        const targetYear = escapeHtml(n.academic_year || "");
        const pubDate = n.publish_date ? n.publish_date.substring(0, 16) : "Immediate";
        const expDate = n.expiry_date ? n.expiry_date.substring(0, 16) : "Never";
        const createdBy = escapeHtml(n.created_by || "Admin");
        const isPinned = Boolean(n.is_pinned);

        // Priority Badge styling
        let prioStyle = "background: #F1F5F9; color: #475569; border: 1px solid #CBD5E1;";
        let prioIcon = "⚪";
        if (priority === "Important") {
            prioStyle = "background: #FEF3C7; color: #D97706; border: 1px solid #FCD34D;";
            prioIcon = "⚠️";
        } else if (priority === "Urgent") {
            prioStyle = "background: #FEE2E2; color: #DC2626; border: 1px solid #FCA5A5;";
            prioIcon = "🚨";
        }

        // Status Badge styling
        let statusStyle = "background: #F3E8FF; color: #7E22CE; border: 1px solid #D8B4FE;";
        let statusIcon = "📝";
        if (status === "Published") {
            statusStyle = "background: #DCFCE7; color: #15803D; border: 1px solid #86EFAC;";
            statusIcon = "✅";
        } else if (status === "Scheduled") {
            statusStyle = "background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE;";
            statusIcon = "⏰";
        } else if (status === "Expired") {
            statusStyle = "background: #FEE2E2; color: #DC2626; border: 1px solid #FCA5A5;";
            statusIcon = "⌛";
        } else if (status === "Archived") {
            statusStyle = "background: #E2E8F0; color: #475569; border: 1px solid #94A3B8;";
            statusIcon = "📦";
        }

        const pinnedBadge = isPinned ? `<span style="background:#EEF2FF; color:#4338CA; border:1px solid #C7D2FE; font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px; margin-left:6px;">📌 PINNED</span>` : "";

        return `
            <tr>
                <td>
                    <div style="font-weight: 700; color: #0F172A; font-size: 13.5px; margin-bottom: 3px;">
                        ${title} ${pinnedBadge}
                    </div>
                    <span class="stu-year-badge" style="background: #F1F5F9; color: #475569;">📁 ${category}</span>
                </td>
                <td>
                    <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; ${prioStyle}">
                        <span>${prioIcon}</span> ${priority}
                    </span>
                </td>
                <td>
                    <strong style="color: #334155; font-size: 12.5px;">👥 ${audience}</strong>
                    ${targetDept ? `<div style="font-size: 11px; color: #64748B;">🏛️ ${targetDept}</div>` : ""}
                    ${targetYear ? `<div style="font-size: 11px; color: #64748B;">📅 ${targetYear}</div>` : ""}
                </td>
                <td><span class="stu-date-badge">📅 ${pubDate}</span></td>
                <td><span class="stu-date-badge">⌛ ${expDate}</span></td>
                <td>
                    <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; ${statusStyle}">
                        <span>${statusIcon}</span> ${status}
                    </span>
                </td>
                <td>
                    <div style="font-weight: 600; font-size: 12.5px; color: #1E293B;">👤 ${createdBy}</div>
                    <small style="color: #64748B; font-size: 11px;">ID: #${n.id}</small>
                </td>
                <td style="text-align: right;">
                    <div class="stu-action-group">
                        <button type="button" class="btn-stu-tbl btn-tbl-view" onclick="openNoticeDetailModal(${n.id})" title="View Notice Content">👁 View</button>
                        <button type="button" class="btn-stu-tbl btn-tbl-edit" onclick="editNotice(${n.id})" title="Edit Notice">✏️ Edit</button>
                        <button type="button" class="btn-stu-tbl" style="background:#EEF2FF; color:#4338CA; border:1px solid #C7D2FE;" onclick="togglePinNotice(${n.id})" title="${isPinned ? 'Unpin Notice' : 'Pin Notice'}">${isPinned ? '📌 Unpin' : '📍 Pin'}</button>
                        ${status !== 'Published' ? `<button type="button" class="btn-stu-tbl" style="background:#DCFCE7; color:#15803D; border:1px solid #86EFAC;" onclick="publishNotice(${n.id})" title="Publish Now">🚀 Publish</button>` : ''}
                        ${status !== 'Archived' ? `<button type="button" class="btn-stu-tbl" style="background:#FFFBEB; color:#D97706; border:1px solid #FDE68A;" onclick="archiveNotice(${n.id})" title="Archive Notice">📦 Archive</button>` : ''}
                        <button type="button" class="btn-stu-tbl btn-tbl-delete" onclick="deleteNotice(${n.id})" title="Delete Notice">🗑 Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderNoticesPagination() {
    const infoEl = document.getElementById("ntcPaginationInfo");
    const controlsEl = document.getElementById("ntcPaginationControls");
    if (!infoEl || !controlsEl) return;

    const start = ntcTotalCount === 0 ? 0 : (ntcCurrentPage - 1) * ntcLimit + 1;
    const end = Math.min(ntcCurrentPage * ntcLimit, ntcTotalCount);
    const totalPages = Math.ceil(ntcTotalCount / ntcLimit) || 1;

    infoEl.textContent = `Showing ${start}–${end} of ${ntcTotalCount} notices`;

    controlsEl.innerHTML = `
        <button type="button" class="stu-page-btn" ${ntcCurrentPage <= 1 ? 'disabled' : ''} onclick="fetchNoticesModule(${ntcCurrentPage - 1})">
            ◀ Prev
        </button>
        <span class="stu-page-active">Page ${ntcCurrentPage} of ${totalPages}</span>
        <button type="button" class="stu-page-btn" ${ntcCurrentPage >= totalPages ? 'disabled' : ''} onclick="fetchNoticesModule(${ntcCurrentPage + 1})">
            Next ▶
        </button>
    `;
}

function applyNoticeFilters() {
    fetchNoticesModule(1);
    fetchNoticeKpiStats();
}

function resetNoticeFilters() {
    if (document.getElementById("ntcSearchInput")) document.getElementById("ntcSearchInput").value = "";
    if (document.getElementById("ntcCategoryFilter")) document.getElementById("ntcCategoryFilter").value = "";
    if (document.getElementById("ntcPriorityFilter")) document.getElementById("ntcPriorityFilter").value = "";
    if (document.getElementById("ntcStatusFilter")) document.getElementById("ntcStatusFilter").value = "";
    if (document.getElementById("ntcAudienceFilter")) document.getElementById("ntcAudienceFilter").value = "";
    if (document.getElementById("ntcDeptFilter")) document.getElementById("ntcDeptFilter").value = "";

    fetchNoticesModule(1);
    fetchNoticeKpiStats();
}

function toggleNoticeAudienceFields() {
    const audience = document.getElementById("noticeAudience") ? document.getElementById("noticeAudience").value : "Everyone";
    const deptWrap = document.getElementById("noticeDeptWrap");
    const courseYearRow = document.getElementById("noticeCourseYearRow");

    if (deptWrap) {
        deptWrap.style.display = (audience === "Specific Department" || audience === "Everyone" || audience === "Students" || audience === "Faculty") ? "block" : "block";
    }
    if (courseYearRow) {
        courseYearRow.style.display = "grid";
    }
}

function openNoticeModal(noticeId = null) {
    document.getElementById("noticeForm").reset();
    document.getElementById("noticeId").value = "";
    document.getElementById("noticeModalTitle").textContent = "📢 Advanced Notice & Circular Composer";
    const statusBadge = document.getElementById("ntcFormStatusBadge");
    if (statusBadge) {
        statusBadge.textContent = "Draft";
        statusBadge.style.cssText = "background: #F1F5F9; color: #475569; padding: 2px 8px; border-radius: 4px; border: 1px solid #CBD5E1;";
    }

    switchNoticeFormTab('basic');
    toggleNoticeLivePreview(false);
    updateNoticeCharCounts();

    if (noticeId) {
        fetch(`/api/notices/${noticeId}`)
            .then(res => {
                if (!res.ok) throw new Error("Notice not found");
                return res.json();
            })
            .then(n => {
                document.getElementById("noticeId").value = n.id;
                document.getElementById("noticeModalTitle").textContent = "✏️ Edit Campus Notice & Circular";
                document.getElementById("noticeTitle").value = n.title || "";
                document.getElementById("noticeCategory").value = n.category || "General";
                document.getElementById("noticePriority").value = n.priority || "Normal";
                document.getElementById("noticeAudience").value = n.audience || "Everyone";
                document.getElementById("noticeDept").value = n.department || "";
                document.getElementById("noticeCourse").value = n.course || "";
                document.getElementById("noticeYear").value = n.academic_year || "";
                if (document.getElementById("noticeSemester")) document.getElementById("noticeSemester").value = n.semester || "";
                document.getElementById("noticePublishDate").value = n.publish_date_iso || "";
                document.getElementById("noticeExpiryDate").value = n.expiry_date_iso || "";
                document.getElementById("noticeIsPinned").checked = Boolean(n.is_pinned);
                document.getElementById("noticeContent").value = n.content || "";

                if (statusBadge) {
                    statusBadge.textContent = n.status || "Draft";
                }

                toggleNoticeAudienceFields();
                updateNoticeCharCounts();
                document.getElementById("noticeFormModal").style.display = "flex";
            })
            .catch(err => {
                console.error("openNoticeModal error:", err);
                showToast("Failed to fetch notice data for editing.", "error");
            });
    } else {
        toggleNoticeAudienceFields();
        document.getElementById("noticeFormModal").style.display = "flex";
    }
}

function closeNoticeModal() {
    document.getElementById("noticeFormModal").style.display = "none";
}

function switchNoticeFormTab(tabName) {
    const tabs = ['basic', 'target', 'schedule', 'content'];
    tabs.forEach(t => {
        const paneEl = document.getElementById(`ntcTabPane-${t}`);
        const btnEl = document.getElementById(`ntcTabBtn-${t}`);
        if (paneEl) paneEl.style.display = (t === tabName) ? "block" : "none";
        if (btnEl) {
            if (t === tabName) btnEl.classList.add("active");
            else btnEl.classList.remove("active");
        }
    });
}

function applyNoticeTemplate(type) {
    const templates = {
        exam: {
            title: "Schedule for End-Semester Examinations Summer 2026",
            category: "Examination",
            priority: "Urgent",
            content: "Dear Students,\n\nThe timetable for End-Semester Examinations Summer 2026 has been published.\n\n📅 Exam Dates: May 15, 2026 - May 30, 2026\n📍 Exam Centers: Main Block Auditorium & IT Labs\n\n⚠️ Hall tickets will be issued starting May 10, 2026 at the Examination Cell. Ensure all term-work and fee dues are cleared prior to hall ticket generation.\n\nController of Examinations,\nZeal Education Society"
        },
        placement: {
            title: "Campus Recruitment Drive - Tata Consultancy Services (TCS)",
            category: "Placement",
            priority: "Important",
            content: "Campus Placement Cell Announcement:\n\nTCS (Tata Consultancy Services) will be conducting an on-campus recruitment drive for Final Year B.Tech students.\n\n💼 Eligible Branches: Computer Engineering, IT, AI & Data Science, ENTC\n📅 Date: April 25, 2026 | 09:00 AM\n📍 Venue: Zeal Seminar Hall 1\n\n• Register on T&P Portal before April 20, 2026.\n• Carry 2 printed copies of updated resume, passport photos, and college ID card.\n\nTraining & Placement Officer,\nZeal College of Engineering"
        },
        fee: {
            title: "Important Notice: Fee Payment Deadline & Online Portal Instructions",
            category: "Fees & Payments",
            priority: "Important",
            content: "Notice to All Enrolled Students:\n\nAll students are advised to clear their remaining academic tuition and hostel fee installment for Academic Year 2025-26.\n\n📅 Final Due Date: April 30, 2026\n💳 Payment Portal: Accessible via Accounts / Fee Section on ERP\n\n⚠️ Late payment surcharge will apply for payments made past the deadline. Contact Accounts Department for fee receipt queries.\n\nAccounts & Finance Department"
        },
        event: {
            title: "Invitation to Annual Cultural Fest 'UDAAN 2026'",
            category: "Events",
            priority: "Normal",
            content: "Zeal Cultural Committee invites all students, faculty, and staff to UDAAN 2026 - Annual Cultural Fest!\n\n🎉 Fest Dates: March 28 - March 30, 2026\n📍 Location: College Sports Complex & Main Campus Grounds\n\n• Competitions: Music, Dance, Drama, Hackathon, Short Film Festival\n• Star Night Performance on Day 3!\n\nGet ready for an exciting celebration of talent and culture!\n\nCultural Fest Committee"
        },
        holiday: {
            title: "Campus Holiday Announcement on Account of Public Festival",
            category: "Emergency",
            priority: "Normal",
            content: "Official Circular:\n\nThe college campus, library, and administrative offices will remain closed on account of Public Holiday.\n\n📅 Date of Holiday: April 14, 2026\n\nRegular academic classes and laboratory sessions will resume on the next working day as per regular timetable.\n\nPrincipal,\nZeal College of Engineering"
        }
    };

    const tmpl = templates[type];
    if (!tmpl) return;

    document.getElementById("noticeTitle").value = tmpl.title;
    document.getElementById("noticeCategory").value = tmpl.category;
    document.getElementById("noticePriority").value = tmpl.priority;
    document.getElementById("noticeContent").value = tmpl.content;

    updateNoticeCharCounts();
    switchNoticeFormTab('basic');
    showToast(`Applied ${tmpl.category} template.`, "info");
}

function insertNoticeTextSnippet(prefix, suffix) {
    const textarea = document.getElementById("noticeContent");
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const replacement = prefix + (selectedText || "") + suffix;

    textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
    textarea.focus();
    textarea.selectionStart = start + prefix.length;
    textarea.selectionEnd = start + prefix.length + (selectedText || "").length;

    updateNoticeCharCounts();
}

function toggleNoticeLivePreview(showPreview) {
    const editorWrap = document.getElementById("ntcEditorWrap");
    const previewWrap = document.getElementById("ntcPreviewWrap");
    const writeBtn = document.getElementById("btnNtcWriteMode");
    const previewBtn = document.getElementById("btnNtcPreviewMode");

    if (showPreview) {
        if (editorWrap) editorWrap.style.display = "none";
        if (previewWrap) {
            previewWrap.style.display = "block";
            const title = document.getElementById("noticeTitle").value.trim() || "Untitled Notice";
            const category = document.getElementById("noticeCategory").value || "General";
            const priority = document.getElementById("noticePriority").value || "Normal";
            const content = document.getElementById("noticeContent").value.trim() || "No content provided yet.";

            document.getElementById("prevTitle").textContent = title;
            document.getElementById("prevCategoryBadge").textContent = `📁 ${category}`;

            let prioStyle = "background: #F1F5F9; color: #475569; border: 1px solid #CBD5E1;";
            if (priority === "Important") prioStyle = "background: #FEF3C7; color: #D97706; border: 1px solid #FCD34D;";
            else if (priority === "Urgent") prioStyle = "background: #FEE2E2; color: #DC2626; border: 1px solid #FCA5A5;";

            const prioBadge = document.getElementById("prevPriorityBadge");
            if (prioBadge) {
                prioBadge.textContent = `${priority} Priority`;
                prioBadge.style.cssText = `padding: 3px 10px; border-radius: 999px; font-weight: 700; font-size: 11px; ${prioStyle}`;
            }

            document.getElementById("prevContent").textContent = content;
        }
        if (writeBtn) writeBtn.classList.remove("active");
        if (previewBtn) previewBtn.classList.add("active");
    } else {
        if (editorWrap) editorWrap.style.display = "block";
        if (previewWrap) previewWrap.style.display = "none";
        if (writeBtn) writeBtn.classList.add("active");
        if (previewBtn) previewBtn.classList.remove("active");
    }
}

function updateNoticeCharCounts() {
    const text = document.getElementById("noticeContent") ? document.getElementById("noticeContent").value : "";
    const charCount = text.length;
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const counterEl = document.getElementById("ntcCharCounter");
    if (counterEl) {
        counterEl.textContent = `${charCount} characters | ${wordCount} words`;
    }
}

async function submitNoticeForm(targetStatus = 'Draft') {
    const noticeId = document.getElementById("noticeId").value;
    const title = document.getElementById("noticeTitle").value.trim();
    const content = document.getElementById("noticeContent").value.trim();

    if (!title) {
        showToast("Please enter a notice title.", "error");
        return;
    }
    if (!content) {
        showToast("Please enter notice content.", "error");
        return;
    }

    const pubDate = document.getElementById("noticePublishDate").value;
    const expDate = document.getElementById("noticeExpiryDate").value;

    if (pubDate && expDate && new Date(expDate) < new Date(pubDate)) {
        showToast("Expiry date cannot be before publish date.", "error");
        return;
    }

    const payload = {
        title: title,
        content: content,
        category: document.getElementById("noticeCategory").value,
        priority: document.getElementById("noticePriority").value,
        status: targetStatus,
        audience: document.getElementById("noticeAudience").value,
        department: document.getElementById("noticeDept").value,
        course: document.getElementById("noticeCourse").value,
        academic_year: document.getElementById("noticeYear").value,
        publish_date: pubDate || null,
        expiry_date: expDate || null,
        is_pinned: document.getElementById("noticeIsPinned").checked
    };

    try {
        let res;
        if (noticeId) {
            res = await fetch(`/api/notices/${noticeId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch(`/api/notices`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save notice");

        const msg = noticeId
            ? "Notice updated successfully."
            : (targetStatus === 'Published' ? "Notice published successfully." : "Notice draft saved successfully.");

        showToast(msg, "success");
        closeNoticeModal();
        fetchNoticesModule(ntcCurrentPage);
        fetchNoticeKpiStats();

    } catch (err) {
        console.error("submitNoticeForm error:", err);
        showToast(err.message || "Failed to save notice.", "error");
    }
}

function editNotice(noticeId) {
    openNoticeModal(noticeId);
}

async function publishNotice(noticeId) {
    if (!confirm("Are you sure you want to publish this notice? It will become live on the campus portal.")) return;
    try {
        const res = await fetch(`/api/notices/${noticeId}/publish`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to publish notice");

        showToast("Notice published successfully.", "success");
        fetchNoticesModule(ntcCurrentPage);
        fetchNoticeKpiStats();
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function archiveNotice(noticeId) {
    if (!confirm("Are you sure you want to archive this notice? It will be hidden from active lists.")) return;
    try {
        const res = await fetch(`/api/notices/${noticeId}/archive`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to archive notice");

        showToast("Notice archived successfully.", "success");
        fetchNoticesModule(ntcCurrentPage);
        fetchNoticeKpiStats();
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function togglePinNotice(noticeId) {
    try {
        const res = await fetch(`/api/notices/${noticeId}/pin`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update pin status");

        showToast(data.message || "Notice pin status updated.", "success");
        fetchNoticesModule(ntcCurrentPage);
        fetchNoticeKpiStats();
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function deleteNotice(noticeId) {
    if (!confirm("This notice will be permanently removed. Continue?")) return;
    try {
        const res = await fetch(`/api/notices/${noticeId}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to delete notice");

        showToast("Notice deleted successfully.", "success");
        fetchNoticesModule(ntcCurrentPage);
        fetchNoticeKpiStats();
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function openNoticeDetailModal(noticeId) {
    try {
        const res = await fetch(`/api/notices/${noticeId}`);
        const n = await res.json();
        if (!res.ok) throw new Error(n.error || "Failed to load notice details");

        document.getElementById("ntcDetailTitle").textContent = n.title || "Notice";

        let prioStyle = "background: #F1F5F9; color: #475569; border: 1px solid #CBD5E1;";
        if (n.priority === "Important") prioStyle = "background: #FEF3C7; color: #D97706; border: 1px solid #FCD34D;";
        else if (n.priority === "Urgent") prioStyle = "background: #FEE2E2; color: #DC2626; border: 1px solid #FCA5A5;";

        let statusStyle = "background: #F3E8FF; color: #7E22CE; border: 1px solid #D8B4FE;";
        if (n.status === "Published") statusStyle = "background: #DCFCE7; color: #15803D; border: 1px solid #86EFAC;";
        else if (n.status === "Scheduled") statusStyle = "background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE;";
        else if (n.status === "Expired") statusStyle = "background: #FEE2E2; color: #DC2626; border: 1px solid #FCA5A5;";
        else if (n.status === "Archived") statusStyle = "background: #E2E8F0; color: #475569; border: 1px solid #94A3B8;";

        document.getElementById("ntcDetailBadges").innerHTML = `
            <span style="padding: 4px 12px; border-radius: 999px; font-weight: 700; font-size: 12px; ${statusStyle}">${n.status}</span>
            <span style="padding: 4px 12px; border-radius: 999px; font-weight: 700; font-size: 12px; ${prioStyle}">${n.priority} Priority</span>
            <span style="padding: 4px 12px; border-radius: 999px; font-weight: 700; font-size: 12px; background: #F1F5F9; color: #475569; border: 1px solid #E2E8F0;">📁 ${escapeHtml(n.category)}</span>
            ${n.is_pinned ? `<span style="padding: 4px 12px; border-radius: 999px; font-weight: 800; font-size: 12px; background: #EEF2FF; color: #4338CA; border: 1px solid #C7D2FE;">📌 PINNED</span>` : ''}
        `;

        document.getElementById("ntcDetailMetaGrid").innerHTML = `
            <div><strong>Audience:</strong> ${escapeHtml(n.audience)}</div>
            <div><strong>Target Dept:</strong> ${escapeHtml(n.department || 'All Departments')}</div>
            <div><strong>Published Date:</strong> ${n.publish_date || 'Immediate'}</div>
            <div><strong>Expiry Date:</strong> ${n.expiry_date || 'Never'}</div>
            <div><strong>Created By:</strong> ${escapeHtml(n.created_by)}</div>
            <div><strong>Created At:</strong> ${n.created_at || 'N/A'}</div>
        `;

        document.getElementById("ntcDetailContent").textContent = n.content || "";

        document.getElementById("ntcDetailFooterBtns").innerHTML = `
            <button type="button" class="btn-stu-action btn-reset" onclick="closeNoticeDetailModal()">Close</button>
            <button type="button" class="btn-stu-glass" onclick="closeNoticeDetailModal(); editNotice(${n.id});">✏️ Edit Notice</button>
            ${n.status !== 'Published' ? `<button type="button" class="btn-stu-primary" onclick="closeNoticeDetailModal(); publishNotice(${n.id});">🚀 Publish Now</button>` : ''}
        `;

        document.getElementById("noticeDetailModal").style.display = "flex";
    } catch (err) {
        showToast(err.message, "error");
    }
}

function closeNoticeDetailModal() {
    document.getElementById("noticeDetailModal").style.display = "none";
}

function togglePasswordVisibility(inputId, btnId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    if (!input || !btn) return;
    if (input.type === "password") {
        input.type = "text";
        btn.textContent = "🙈";
    } else {
        input.type = "password";
        btn.textContent = "👁️";
    }
}

/* ============================================================ */
/* SETTINGS MODULE CLIENT LOGIC                                 */
/* ============================================================ */
let currentSettingsGroup = 'general';
let currentSettingsData = {};

function loadSettingsModule() {
    fetch('/api/settings')
        .then(res => {
            if (!res.ok) throw new Error("Failed to load settings");
            return res.json();
        })
        .then(data => {
            currentSettingsData = data.flat || {};
            populateSettingsForms(currentSettingsData);
            fetchAcademicYearsRoster();
            fetchMaintenanceStatus();
            fetchAdminUserProfile();
        })
        .catch(err => {
            console.error("loadSettingsModule error:", err);
            showToast("Unable to load system settings.", "error");
        });
}

function switchSettingsCategory(category) {
    currentSettingsGroup = category;
    const categories = ['general', 'college', 'academic', 'profile', 'security', 'notifications', 'system', 'maintenance'];
    categories.forEach(c => {
        const secEl = document.getElementById(`setSec-${c}`);
        const btnEl = document.getElementById(`setNavBtn-${c}`);
        if (secEl) secEl.style.display = (c === category) ? "block" : "none";
        if (btnEl) {
            if (c === category) btnEl.classList.add("active");
            else btnEl.classList.remove("active");
        }
    });
}

function populateSettingsForms(flat) {
    // General
    if (document.getElementById("setAppName")) document.getElementById("setAppName").value = flat.app_name || "Zeal College ERP";
    if (document.getElementById("setInstName")) document.getElementById("setInstName").value = flat.institution_name || "Zeal College of Engineering and Research";
    if (document.getElementById("setInstEmail")) document.getElementById("setInstEmail").value = flat.institution_email || "contact@zeal.edu.in";
    if (document.getElementById("setInstPhone")) document.getElementById("setInstPhone").value = flat.institution_phone || "+91 20 6720 6000";
    if (document.getElementById("setInstAddress")) document.getElementById("setInstAddress").value = flat.institution_address || "";
    if (document.getElementById("setTimezone")) document.getElementById("setTimezone").value = flat.timezone || "Asia/Kolkata (IST)";
    if (document.getElementById("setDateFormat")) document.getElementById("setDateFormat").value = flat.date_format || "YYYY-MM-DD";
    if (document.getElementById("setCurrency")) document.getElementById("setCurrency").value = flat.currency || "INR (₹)";

    // College Info
    if (document.getElementById("setCollegeCode")) document.getElementById("setCollegeCode").value = flat.college_code || "ZEAL-PUNE-6155";
    if (document.getElementById("setCity")) document.getElementById("setCity").value = flat.city || "Pune";
    if (document.getElementById("setState")) document.getElementById("setState").value = flat.state || "Maharashtra";
    if (document.getElementById("setPincode")) document.getElementById("setPincode").value = flat.pincode || "411041";
    if (document.getElementById("setWebsite")) document.getElementById("setWebsite").value = flat.website || "https://zeal.edu.in";
    if (document.getElementById("setPrincipalName")) document.getElementById("setPrincipalName").value = flat.principal_name || "Dr. A. B. Tech";

    // Academic
    if (document.getElementById("setCurrentSemester")) document.getElementById("setCurrentSemester").value = flat.current_semester || "Semester 1";
    if (document.getElementById("setPaginationLimit")) document.getElementById("setPaginationLimit").value = flat.default_pagination_limit || "20";

    // Notifications
    if (document.getElementById("setNotifyEmail")) document.getElementById("setNotifyEmail").checked = flat.notify_email !== "false";
    if (document.getElementById("setNotifyNotices")) document.getElementById("setNotifyNotices").checked = flat.notify_notices !== "false";
    if (document.getElementById("setNotifyAdmissions")) document.getElementById("setNotifyAdmissions").checked = flat.notify_admissions !== "false";
    if (document.getElementById("setNotifyFees")) document.getElementById("setNotifyFees").checked = flat.notify_fees !== "false";
    if (document.getElementById("setNotifyAttendance")) document.getElementById("setNotifyAttendance").checked = flat.notify_attendance !== "false";
    if (document.getElementById("setNotifyExams")) document.getElementById("setNotifyExams").checked = flat.notify_exams !== "false";

    // System
    if (document.getElementById("setSystemTheme")) document.getElementById("setSystemTheme").value = "light";
    if (document.getElementById("setCacheTtl")) document.getElementById("setCacheTtl").value = flat.cache_ttl_minutes || "15";
}

(function ensureLightMode() {
    try {
        document.body.classList.remove('dark-mode');
        document.documentElement.removeAttribute('data-theme');
        localStorage.removeItem('theme');
        localStorage.removeItem('erp_theme');
    } catch (e) {}
})();

function saveActiveSettingsCategory() {
    saveSettingsCategoryForm(currentSettingsGroup);
}

function saveSettingsCategoryForm(group) {
    let payload = {};

    if (group === 'general') {
        payload = {
            app_name: document.getElementById("setAppName").value.trim(),
            institution_name: document.getElementById("setInstName").value.trim(),
            institution_email: document.getElementById("setInstEmail").value.trim(),
            institution_phone: document.getElementById("setInstPhone").value.trim(),
            institution_address: document.getElementById("setInstAddress").value.trim(),
            timezone: document.getElementById("setTimezone").value,
            date_format: document.getElementById("setDateFormat").value,
            currency: document.getElementById("setCurrency").value
        };
    } else if (group === 'college') {
        payload = {
            college_code: document.getElementById("setCollegeCode").value.trim(),
            city: document.getElementById("setCity").value.trim(),
            state: document.getElementById("setState").value.trim(),
            pincode: document.getElementById("setPincode").value.trim(),
            website: document.getElementById("setWebsite").value.trim(),
            principal_name: document.getElementById("setPrincipalName").value.trim()
        };
    } else if (group === 'academic') {
        payload = {
            current_academic_year: document.getElementById("setCurrentYear").value,
            current_semester: document.getElementById("setCurrentSemester").value,
            default_pagination_limit: document.getElementById("setPaginationLimit").value
        };
    } else if (group === 'notifications') {
        payload = {
            notify_email: document.getElementById("setNotifyEmail").checked ? "true" : "false",
            notify_notices: document.getElementById("setNotifyNotices").checked ? "true" : "false",
            notify_admissions: document.getElementById("setNotifyAdmissions").checked ? "true" : "false",
            notify_fees: document.getElementById("setNotifyFees").checked ? "true" : "false",
            notify_attendance: document.getElementById("setNotifyAttendance").checked ? "true" : "false",
            notify_exams: document.getElementById("setNotifyExams").checked ? "true" : "false"
        };
    } else if (group === 'system') {
        payload = {
            system_theme: document.getElementById("setSystemTheme").value,
            cache_ttl_minutes: document.getElementById("setCacheTtl").value
        };
    } else if (group === 'profile') {
        submitProfileUpdate();
        return;
    } else if (group === 'security') {
        submitChangePassword();
        return;
    } else if (group === 'maintenance') {
        refreshSystemCache();
        return;
    }

    fetch(`/api/settings/${group}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json().then(data => ({ status: res.status, body: data })))
    .then(res => {
        if (res.status !== 200) {
            showToast(res.body.error || "Unable to save settings.", "error");
        } else {
            showToast(res.body.message || "Settings saved successfully.", "success");
            loadSettingsModule();
        }
    })
    .catch(err => {
        console.error("saveSettingsCategoryForm error:", err);
        showToast("Unable to save settings. Connection error.", "error");
    });
}

function fetchAcademicYearsRoster() {
    fetch('/api/settings/academic-years')
        .then(res => res.json())
        .then(years => {
            renderAcademicYearsRoster(years);
        })
        .catch(err => console.error("fetchAcademicYearsRoster error:", err));
}

function renderAcademicYearsRoster(years) {
    const tbody = document.getElementById("academicYearTableBody");
    const yearSelect = document.getElementById("setCurrentYear");
    const countEl = document.getElementById("academicYearToolbarCount");

    if (countEl) countEl.textContent = `Showing ${years.length} academic sessions`;

    if (yearSelect) {
        yearSelect.innerHTML = years.map(y => `<option value="${y.year_name}" ${y.is_active ? 'selected' : ''}>${y.year_name} ${y.is_active ? '(Active Context)' : ''}</option>`).join("");
    }

    if (!tbody) return;
    if (!years || years.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: #64748B;">No academic years configured.</td></tr>`;
        return;
    }

    tbody.innerHTML = years.map(y => {
        let statusBadge = `<span class="stu-year-badge" style="background:#DCFCE7; color:#15803D;">Active</span>`;
        if (y.status === "Closed") statusBadge = `<span class="stu-year-badge" style="background:#F1F5F9; color:#64748B;">Closed</span>`;
        else if (y.status === "Upcoming") statusBadge = `<span class="stu-year-badge" style="background:#EFF6FF; color:#2563EB;">Upcoming</span>`;

        const activeIndicator = y.is_active ? `<strong>⚡ YES</strong>` : `<span style="color:#94A3B8;">No</span>`;

        const actions = [];
        if (!y.is_active) {
            actions.push(`<button type="button" class="btn-stu-tbl" style="background:#DCFCE7; color:#15803D; border:1px solid #86EFAC;" onclick="setActiveAcademicYear(${y.id})" title="Set Active Context">⚡ Set Active</button>`);
        }
        if (y.status !== "Closed" && !y.is_active) {
            actions.push(`<button type="button" class="btn-stu-tbl" style="background:#FFFBEB; color:#D97706; border:1px solid #FDE68A;" onclick="closeAcademicYear(${y.id})" title="Close Academic Year">🔒 Close</button>`);
        }

        return `
            <tr>
                <td><strong>${y.year_name}</strong></td>
                <td>${statusBadge}</td>
                <td>${activeIndicator}</td>
                <td>${y.start_date || '-'}</td>
                <td>${y.end_date || '-'}</td>
                <td style="text-align: right; display: flex; justify-content: flex-end; gap: 6px;">
                    ${actions.join("")}
                </td>
            </tr>
        `;
    }).join("");
}

function openAddAcademicYearModal() {
    document.getElementById("addAcademicYearForm").reset();
    document.getElementById("addAcademicYearModal").style.display = "flex";
}

function closeAddAcademicYearModal() {
    document.getElementById("addAcademicYearModal").style.display = "none";
}

function submitAddAcademicYear() {
    const yearName = document.getElementById("newAyName").value.trim();
    if (!yearName) {
        showToast("Please enter an academic year name (e.g. 2027-28).", "error");
        return;
    }

    const payload = {
        year_name: yearName,
        start_date: document.getElementById("newAyStartDate").value || null,
        end_date: document.getElementById("newAyEndDate").value || null
    };

    fetch('/api/settings/academic-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json().then(data => ({ status: res.status, body: data })))
    .then(res => {
        if (res.status !== 201) {
            showToast(res.body.error || "Failed to create academic year.", "error");
        } else {
            showToast(res.body.message || "Academic year created successfully.", "success");
            closeAddAcademicYearModal();
            fetchAcademicYearsRoster();
        }
    })
    .catch(err => {
        console.error("submitAddAcademicYear error:", err);
        showToast("Unable to create academic year.", "error");
    });
}

function setActiveAcademicYear(yearId) {
    if (!confirm("Are you sure you want to set this academic year as the ACTIVE campus academic year? This will affect default filters across Students, Admissions, Fees, and Exams.")) return;

    fetch(`/api/settings/academic-years/${yearId}/set-active`, { method: 'POST' })
        .then(res => res.json().then(data => ({ status: res.status, body: data })))
        .then(res => {
            if (res.status !== 200) {
                showToast(res.body.error || "Failed to activate academic year.", "error");
            } else {
                showToast(res.body.message || "Active academic year updated.", "success");
                loadSettingsModule();
            }
        })
        .catch(err => {
            console.error("setActiveAcademicYear error:", err);
            showToast("Failed to set active academic year.", "error");
        });
}

function closeAcademicYear(yearId) {
    if (!confirm("Are you sure you want to close this academic year? Closed academic years remain in records but are no longer active for new registrations.")) return;

    fetch(`/api/settings/academic-years/${yearId}/close`, { method: 'POST' })
        .then(res => res.json().then(data => ({ status: res.status, body: data })))
        .then(res => {
            if (res.status !== 200) {
                showToast(res.body.error || "Failed to close academic year.", "error");
            } else {
                showToast(res.body.message || "Academic year closed successfully.", "success");
                fetchAcademicYearsRoster();
            }
        })
        .catch(err => {
            console.error("closeAcademicYear error:", err);
            showToast("Failed to close academic year.", "error");
        });
}

function fetchAdminUserProfile() {
    fetch('/api/settings/profile')
        .then(res => {
            if (!res.ok) return;
            return res.json();
        })
        .then(p => {
            if (!p) return;
            if (document.getElementById("setProfileUsername")) document.getElementById("setProfileUsername").value = p.username || "";
            if (document.getElementById("setProfileEmail")) document.getElementById("setProfileEmail").value = p.email || "";
            if (document.getElementById("setProfileRole")) document.getElementById("setProfileRole").value = p.role || "Super Administrator";
            if (document.getElementById("setProfileLastLogin")) document.getElementById("setProfileLastLogin").value = p.last_login || "";
        })
        .catch(err => console.error("fetchAdminUserProfile error:", err));
}

function submitProfileUpdate() {
    const payload = {
        username: document.getElementById("setProfileUsername").value.trim(),
        email: document.getElementById("setProfileEmail").value.trim()
    };

    fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json().then(data => ({ status: res.status, body: data })))
    .then(res => {
        if (res.status !== 200) {
            showToast(res.body.error || "Failed to update profile.", "error");
        } else {
            showToast(res.body.message || "Profile updated successfully.", "success");
        }
    })
    .catch(err => {
        console.error("submitProfileUpdate error:", err);
        showToast("Unable to update profile.", "error");
    });
}

function submitChangePassword() {
    const currPass = document.getElementById("setCurrPassword").value;
    const newPass = document.getElementById("setNewPassword").value;
    const confirmPass = document.getElementById("setConfirmPassword").value;

    if (!currPass) {
        showToast("Please enter your current password.", "error");
        return;
    }
    if (!newPass || newPass.length < 6) {
        showToast("New password must be at least 6 characters long.", "error");
        return;
    }
    if (newPass !== confirmPass) {
        showToast("New password and confirmation do not match.", "error");
        return;
    }

    fetch('/api/settings/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            current_password: currPass,
            new_password: newPass,
            confirm_password: confirmPass
        })
    })
    .then(res => res.json().then(data => ({ status: res.status, body: data })))
    .then(res => {
        if (res.status !== 200) {
            showToast(res.body.error || "Failed to change password.", "error");
        } else {
            showToast(res.body.message || "Password changed successfully.", "success");
            document.getElementById("formSetSecurity").reset();
        }
    })
    .catch(err => {
        console.error("submitChangePassword error:", err);
        showToast("Unable to change password.", "error");
    });
}

function fetchMaintenanceStatus() {
    fetch('/api/settings/maintenance')
        .then(res => res.json())
        .then(m => {
            if (document.getElementById("maintAppStatus")) document.getElementById("maintAppStatus").textContent = m.application_status || "Healthy";
            if (document.getElementById("maintDbEngine")) document.getElementById("maintDbEngine").textContent = m.database_engine || "MySQL";
            if (document.getElementById("maintTotalStudents")) document.getElementById("maintTotalStudents").textContent = m.total_students || 0;
            if (document.getElementById("maintTotalDepts")) document.getElementById("maintTotalDepts").textContent = m.total_departments || 0;
            if (document.getElementById("maintTotalNotices")) document.getElementById("maintTotalNotices").textContent = m.total_notices || 0;
            if (document.getElementById("maintTotalPayments")) document.getElementById("maintTotalPayments").textContent = m.total_payments || 0;
            if (document.getElementById("maintServerTime")) document.getElementById("maintServerTime").textContent = m.server_time || "-";
            if (document.getElementById("maintEnvMode")) document.getElementById("maintEnvMode").textContent = m.environment_mode || "dev";
        })
        .catch(err => console.error("fetchMaintenanceStatus error:", err));
}

function refreshSystemCache() {
    showToast("System cache refreshed successfully.", "success");
    loadSettingsModule();
}

function reloadSystemConfig() {
    showToast("System configuration reloaded.", "info");
    loadSettingsModule();
}

// ============================================================
// ADMIN ERP PORTAL - INITIALIZATION ON PAGE LOAD
// ============================================================
// Ensures only one pane is visible at a time from the very
// first paint. CSS handles hiding but an explicit JS init
// guarantees the correct state regardless of cache or
// animation timing issues.

function initAdminPortal() {
    // 1. Explicitly force all panes hidden via inline style.
    //    This overrides any CSS animation artifacts.
    document.querySelectorAll(".erp-section-pane").forEach(pane => {
        pane.style.display = "none";
        pane.classList.remove("active");
    });

    // 2. Activate the default starting pane: Dashboard
    const dashPane = document.getElementById("pane-dashboard");
    if (dashPane) {
        dashPane.style.display = "block";
        dashPane.classList.add("active");
    }

    // 3. Set Dashboard nav link as active
    document.querySelectorAll(".sidebar-nav .nav-link").forEach(link => {
        link.classList.remove("active");
    });
    const dashNavBtn = document.getElementById("nav-dashboard");
    if (dashNavBtn) {
        dashNavBtn.classList.add("active");
    }

    // 4. Set breadcrumb title to Dashboard
    const headerTitle = document.getElementById("headerPageTitle");
    if (headerTitle) {
        headerTitle.textContent = "Dashboard Overview";
    }

    // 5. Check admin auth and populate header/sidebar profile
    if (typeof checkAdminAuth === "function") {
        checkAdminAuth();
    }

    // 6. Load dashboard data
    if (typeof updateDashboard === "function") {
        updateDashboard();
    }

    // 7. Load student data (needed for students count in dashboard)
    if (typeof fetchStudents === "function") {
        fetchStudents();
    }

    console.log("[ERP] Admin portal initialized. Dashboard active.");
}

// Run initialization after DOM is fully parsed
document.addEventListener("DOMContentLoaded", initAdminPortal);

