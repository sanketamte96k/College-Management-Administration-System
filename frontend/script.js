/**
 * ============================================================
 * ZEAL COLLEGE ADMISSION SYSTEM - MODERN ADMISSION WIZARD
 * Interactive 6-Step Multi-Wizard with Real-Time AI Eligibility,
 * Live Formatters, Drag-and-Drop Document Previews, Autosave & Chatbot
 * ============================================================
 */

// Global State
let currentStep = 1;
const totalSteps = 6;
let isSubmitting = false;
let aiPredictionDebounce = null;
let autoSaveTimer = null;

const form = document.getElementById("admissionForm");
const urlParams = new URLSearchParams(window.location.search);
const editId = urlParams.get("edit");

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initStepper();
    initDropzones();
    initAutoSave();

    if (editId !== null) {
        loadEditStudentData(editId);
    } else {
        restoreDraftFromStorage();
    }
});

// ============================================================
// THEME CONTROLLER
// ============================================================
function initTheme() {
    const savedTheme = localStorage.getItem("app_theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        const icon = document.getElementById("themeToggleIcon");
        if (icon) icon.textContent = "☀️";
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    
    if (next === "dark") {
        document.body.classList.add("dark-mode");
        const icon = document.getElementById("themeToggleIcon");
        if (icon) icon.textContent = "☀️";
    } else {
        document.body.classList.remove("dark-mode");
        const icon = document.getElementById("themeToggleIcon");
        if (icon) icon.textContent = "🌙";
    }
    localStorage.setItem("app_theme", next);
}

// ============================================================
// MULTI-STEP WIZARD NAVIGATION
// ============================================================
function initStepper() {
    updateWizardUI();
}

function navigateToStep(targetStep) {
    if (targetStep < 1 || targetStep > totalSteps) return;

    // If moving forward more than 1 step, validate intermediary steps
    if (targetStep > currentStep) {
        for (let s = currentStep; s < targetStep; s++) {
            if (!validateStep(s)) {
                showToast(`Please complete Step ${s} before proceeding.`, "error");
                return;
            }
        }
    }

    currentStep = targetStep;
    updateWizardUI();

    // Scroll smoothly to top of form card
    const formCard = document.querySelector(".admission-wizard-container");
    if (formCard) {
        formCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function validateAndNext(step) {
    if (validateStep(step)) {
        if (step === 3 || step === 4) {
            triggerAIPrediction();
        }
        if (step === 5) {
            populateReviewSummary();
        }
        navigateToStep(step + 1);
    }
}

function updateWizardUI() {
    // 1. Hide all step sections & show active
    document.querySelectorAll(".wizard-step-section").forEach(sec => {
        const secStep = parseInt(sec.getAttribute("data-step"), 10);
        if (secStep === currentStep) {
            sec.classList.add("active");
        } else {
            sec.classList.remove("active");
        }
    });

    // 2. Update step buttons in nav
    document.querySelectorAll(".wizard-step-btn").forEach(btn => {
        const btnStep = parseInt(btn.getAttribute("data-step"), 10);
        btn.classList.remove("active", "completed");
        if (btnStep === currentStep) {
            btn.classList.add("active");
        } else if (btnStep < currentStep) {
            btn.classList.add("completed");
        }
    });

    // 3. Update Progress Bar
    const progressPercent = Math.round((currentStep / totalSteps) * 100);
    const progressBar = document.getElementById("stepperProgressBar");
    const progressLabel = document.getElementById("stepProgressLabel");
    const progressPercentLabel = document.getElementById("stepProgressPercent");

    if (progressBar) progressBar.style.width = `${progressPercent}%`;
    if (progressPercentLabel) progressPercentLabel.textContent = `${progressPercent}% Completed`;

    const stepTitles = [
        "Step 1 of 6: Personal Information",
        "Step 2 of 6: Contact & Address",
        "Step 3 of 6: Academic Qualifications",
        "Step 4 of 6: Department & AI Predictor",
        "Step 5 of 6: Document Uploads",
        "Step 6 of 6: Review & Final Submission"
    ];
    if (progressLabel) progressLabel.textContent = stepTitles[currentStep - 1] || `Step ${currentStep} of ${totalSteps}`;

    // If step 6, populate review
    if (currentStep === 6) {
        populateReviewSummary();
    }
}

// ============================================================
// STEP-BY-STEP FORM VALIDATION
// ============================================================
function validateStep(step) {
    clearErrorBox();
    let isValid = true;
    const missingFields = [];

    if (step === 1) {
        const fullName = document.getElementById("fullName");
        const fatherName = document.getElementById("fatherName");
        const motherName = document.getElementById("motherName");
        const dob = document.getElementById("dob");
        const gender = document.getElementById("gender");
        const bloodGroup = document.getElementById("bloodGroup");

        if (!fullName.value.trim()) { markInvalid(fullName); missingFields.push("Full Name"); isValid = false; } else markValid(fullName);
        if (!fatherName.value.trim()) { markInvalid(fatherName); missingFields.push("Father's Name"); isValid = false; } else markValid(fatherName);
        if (!motherName.value.trim()) { markInvalid(motherName); missingFields.push("Mother's Name"); isValid = false; } else markValid(motherName);
        if (!dob.value) { markInvalid(dob); missingFields.push("Date of Birth"); isValid = false; } else markValid(dob);
        if (!gender.value) { markInvalid(gender); missingFields.push("Gender"); isValid = false; } else markValid(gender);
        if (!bloodGroup.value) { markInvalid(bloodGroup); missingFields.push("Blood Group"); isValid = false; } else markValid(bloodGroup);
    } 
    else if (step === 2) {
        const mobile = document.getElementById("mobile");
        const email = document.getElementById("email");
        const aadhaar = document.getElementById("aadhaar");
        const address = document.getElementById("address");
        const city = document.getElementById("city");
        const state = document.getElementById("state");
        const pincode = document.getElementById("pincode");
        const nationality = document.getElementById("nationality");

        const rawMobile = mobile.value.replace(/\D/g, "");
        if (rawMobile.length !== 10) {
            markInvalid(mobile.closest(".input-with-prefix") || mobile);
            missingFields.push("Valid 10-digit Mobile Number");
            isValid = false;
        } else {
            markValid(mobile.closest(".input-with-prefix") || mobile);
        }

        const emailVal = email.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailVal || !emailRegex.test(emailVal)) {
            markInvalid(email);
            missingFields.push("Valid Email Address");
            isValid = false;
        } else {
            markValid(email);
        }

        const rawAadhaar = aadhaar.value.replace(/\D/g, "");
        if (rawAadhaar.length !== 12) {
            markInvalid(aadhaar);
            missingFields.push("12-digit Aadhaar Card Number");
            isValid = false;
        } else {
            markValid(aadhaar);
        }

        if (!address.value.trim()) { markInvalid(address); missingFields.push("Residential Address"); isValid = false; } else markValid(address);
        if (!city.value.trim()) { markInvalid(city); missingFields.push("City"); isValid = false; } else markValid(city);
        if (!state.value.trim()) { markInvalid(state); missingFields.push("State"); isValid = false; } else markValid(state);
        
        const rawPin = pincode.value.replace(/\D/g, "");
        if (rawPin.length !== 6) { markInvalid(pincode); missingFields.push("6-digit Pincode"); isValid = false; } else markValid(pincode);
        if (!nationality.value.trim()) { markInvalid(nationality); missingFields.push("Nationality"); isValid = false; } else markValid(nationality);
    } 
    else if (step === 3) {
        const board10 = document.getElementById("board10");
        const percentage10 = document.getElementById("percentage10");
        const board12 = document.getElementById("board12");
        const percentage12 = document.getElementById("percentage12");
        const entranceExam = document.getElementById("entranceExam");
        const entranceScore = document.getElementById("entranceScore");

        if (!board10.value.trim()) { markInvalid(board10); missingFields.push("10th Board Name"); isValid = false; } else markValid(board10);
        
        const p10 = parseFloat(percentage10.value);
        if (isNaN(p10) || p10 < 0 || p10 > 100) { markInvalid(percentage10); missingFields.push("Valid 10th Percentage (0-100)"); isValid = false; } else markValid(percentage10);

        if (!board12.value.trim()) { markInvalid(board12); missingFields.push("12th Board / Council"); isValid = false; } else markValid(board12);

        const p12 = parseFloat(percentage12.value);
        if (isNaN(p12) || p12 < 0 || p12 > 100) { markInvalid(percentage12); missingFields.push("Valid 12th Percentage (0-100)"); isValid = false; } else markValid(percentage12);

        if (!entranceExam.value) { markInvalid(entranceExam); missingFields.push("Entrance Exam Appeared"); isValid = false; } else markValid(entranceExam);

        const eScore = parseFloat(entranceScore.value);
        if (isNaN(eScore) || eScore < 0) { markInvalid(entranceScore); missingFields.push("Entrance Score / Percentile"); isValid = false; } else markValid(entranceScore);
    } 
    else if (step === 4) {
        const department = document.getElementById("department");
        const admissionType = document.getElementById("admissionType");

        if (!department.value) { markInvalid(department); missingFields.push("Department Selection"); isValid = false; } else markValid(department);
        if (!admissionType.value) { markInvalid(admissionType); missingFields.push("Admission Type"); isValid = false; } else markValid(admissionType);
    } 
    else if (step === 5) {
        if (editId === null) {
            const photo = document.getElementById("photo");
            const marksheet10 = document.getElementById("marksheet10");
            const marksheet12 = document.getElementById("marksheet12");
            const leavingCertificate = document.getElementById("leavingCertificate");

            if (!photo.files || photo.files.length === 0) missingFields.push("Passport Photo");
            if (!marksheet10.files || marksheet10.files.length === 0) missingFields.push("10th Marksheet");
            if (!marksheet12.files || marksheet12.files.length === 0) missingFields.push("12th Marksheet");
            if (!leavingCertificate.files || leavingCertificate.files.length === 0) missingFields.push("Leaving Certificate");

            if (missingFields.length > 0) {
                isValid = false;
            }
        }
    }

    if (!isValid) {
        showErrorBanner(`Please fill in required fields: ${missingFields.join(", ")}`);
    }

    return isValid;
}

function markInvalid(element) {
    if (!element) return;
    element.classList.add("field-invalid");
    element.classList.remove("field-valid");
}

function markValid(element) {
    if (!element) return;
    element.classList.remove("field-invalid");
    element.classList.add("field-valid");
}

function showErrorBanner(message) {
    const errorBox = document.getElementById("errorMessage");
    if (errorBox) {
        errorBox.innerHTML = `<strong>⚠️ Attention Required:</strong> ${message}`;
        errorBox.style.display = "block";
        errorBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
}

function clearErrorBox() {
    const errorBox = document.getElementById("errorMessage");
    if (errorBox) {
        errorBox.style.display = "none";
        errorBox.innerHTML = "";
    }
}

// ============================================================
// REAL-TIME SMART INPUT FORMATTERS
// ============================================================
function calculateAge() {
    const dobInput = document.getElementById("dob");
    const ageBadge = document.getElementById("ageDisplayBadge");
    const ageText = document.getElementById("ageText");

    if (!dobInput || !dobInput.value) {
        if (ageBadge) ageBadge.style.display = "none";
        return;
    }

    const birthDate = new Date(dobInput.value);
    const today = new Date();

    if (isNaN(birthDate.getTime()) || birthDate > today) {
        if (ageBadge) ageBadge.style.display = "none";
        return;
    }

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
        years--;
        months = (months + 12) % 12;
    }

    const isEligible = years >= 16;
    if (ageBadge && ageText) {
        ageText.innerHTML = `Age: <strong>${years} yrs ${months} mos</strong> - ${isEligible ? "✓ Eligible" : "⚠️ Underage (Min 16 required)"}`;
        ageBadge.style.display = "inline-flex";
        ageBadge.style.background = isEligible ? "#ecfdf5" : "#fee2e2";
        ageBadge.style.color = isEligible ? "#065f46" : "#991b1b";
        ageBadge.style.borderColor = isEligible ? "#a7f3d0" : "#fca5a5";
    }
}

function validatePhoneInput(el) {
    el.value = el.value.replace(/\D/g, "").slice(0, 10);
    const wrap = el.closest(".input-with-prefix");
    if (el.value.length === 10) {
        if (wrap) { wrap.classList.remove("field-invalid"); wrap.classList.add("field-valid"); }
    } else {
        if (wrap) { wrap.classList.remove("field-valid"); }
    }
}

function formatAadhaar(el) {
    let val = el.value.replace(/\D/g, "").slice(0, 12);
    let formatted = "";
    for (let i = 0; i < val.length; i++) {
        if (i > 0 && i % 4 === 0) formatted += " ";
        formatted += val[i];
    }
    el.value = formatted;
    if (val.length === 12) {
        markValid(el);
    } else {
        el.classList.remove("field-valid");
    }
}

function validatePincode(el) {
    el.value = el.value.replace(/\D/g, "").slice(0, 6);
    if (el.value.length === 6) {
        markValid(el);
    } else {
        el.classList.remove("field-valid");
    }
}

function checkEmailDomain(el) {
    const val = el.value.trim().toLowerCase();
    const badge = document.getElementById("emailSuggestionBadge");
    if (!badge) return;

    const typoMap = {
        "@gmial.com": "@gmail.com",
        "@gmai.com": "@gmail.com",
        "@gamil.com": "@gmail.com",
        "@yaho.com": "@yahoo.com",
        "@yahooo.com": "@yahoo.com",
        "@outlok.com": "@outlook.com",
        "@hotmial.com": "@hotmail.com"
    };

    let suggestion = null;
    for (const [typo, fix] of Object.entries(typoMap)) {
        if (val.endsWith(typo)) {
            suggestion = val.replace(typo, fix);
            break;
        }
    }

    if (suggestion) {
        badge.innerHTML = `💡 Did you mean <strong>${suggestion}</strong>? (Click to accept)`;
        badge.style.display = "block";
        badge.onclick = () => {
            el.value = suggestion;
            badge.style.display = "none";
            markValid(el);
        };
    } else {
        badge.style.display = "none";
    }
}

function updateGradeBadge(perc, badgeId) {
    const badge = document.getElementById(badgeId);
    if (!badge) return;

    if (isNaN(perc) || perc <= 0) {
        badge.style.display = "none";
        return;
    }

    badge.style.display = "inline-block";
    if (perc >= 75) {
        badge.className = "grade-indicator-pill grade-distinction";
        badge.textContent = "🏆 Distinction Grade (>=75%)";
    } else if (perc >= 60) {
        badge.className = "grade-indicator-pill grade-first";
        badge.textContent = "🎖️ First Class (>=60%)";
    } else if (perc >= 50) {
        badge.className = "grade-indicator-pill grade-second";
        badge.textContent = "📘 Higher Second Class (>=50%)";
    } else if (perc >= 40) {
        badge.className = "grade-indicator-pill grade-pass";
        badge.textContent = "📄 Pass Class (>=40%)";
    } else {
        badge.className = "grade-indicator-pill";
        badge.style.background = "#fee2e2";
        badge.style.color = "#dc2626";
        badge.textContent = "⚠️ Below Minimum Pass Marks";
    }
}

// ============================================================
// REAL-TIME AI ELIGIBILITY & PREDICTOR ENGINE
// ============================================================
function triggerAIPrediction() {
    const p10 = parseFloat(document.getElementById("percentage10")?.value || 0);
    const p12 = parseFloat(document.getElementById("percentage12")?.value || 0);
    const eScore = parseFloat(document.getElementById("entranceScore")?.value || 0);
    const dept = document.getElementById("department")?.value || "Computer Engineering";

    // Update grade pills
    updateGradeBadge(p10, "grade10Badge");
    updateGradeBadge(p12, "grade12Badge");

    if (aiPredictionDebounce) clearTimeout(aiPredictionDebounce);
    aiPredictionDebounce = setTimeout(() => {
        fetchAIPrediction(p10, p12, eScore, dept);
    }, 300);
}

async function fetchAIPrediction(p10, p12, eScore, dept) {
    const gaugeValue = document.getElementById("aiProbabilityValue");
    const chanceBadge = document.getElementById("aiChanceLevel");
    const desc = document.getElementById("aiProbDesc");
    const criteriaList = document.getElementById("aiCriteriaList");

    if (!gaugeValue || !chanceBadge) return;

    if (p12 <= 0 && eScore <= 0) {
        gaugeValue.textContent = "--%";
        chanceBadge.className = "chance-level-badge";
        chanceBadge.textContent = "Pending Scores";
        if (desc) desc.textContent = "Enter your 10th %, 12th %, and Entrance score to evaluate admission probability.";
        return;
    }

    try {
        // 1. Call Eligibility Endpoint
        const elRes = await fetch("/api/ai/check-eligibility", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                percentage10: p10,
                percentage12: p12,
                entranceScore: eScore,
                department: dept
            })
        });

        // 2. Call Prediction Endpoint
        const predRes = await fetch("/api/ai/predict-admission", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                percentage12: p12,
                entranceScore: eScore,
                department: dept
            })
        });

        if (predRes.ok) {
            const predData = await predRes.json();
            const prob = predData.probability_percentage || 0;
            const chance = predData.chance_level || "Medium";

            gaugeValue.textContent = `${prob}%`;
            chanceBadge.className = `chance-level-badge chance-${chance.toLowerCase()}`;
            chanceBadge.textContent = `${chance} Chance (${prob}%)`;

            if (desc) {
                desc.textContent = `${dept} cut-off is ~${predData.department_cutoff || 70}+. Your score of ${eScore} gives you a ${chance.toLowerCase()} chance of CAP allocation.`;
            }
        }

        if (elRes.ok && criteriaList) {
            const elData = await elRes.json();
            const req12th = elData.required_12th || 50;
            const reqEnt = elData.required_entrance || 50;

            criteriaList.innerHTML = `
                <li class="criteria-item ${p10 >= 40 ? 'pass' : 'fail'}">
                    <span class="c-icon">${p10 >= 40 ? '✅' : '❌'}</span>
                    10th SSC: ${p10}% (Min 40.0% required)
                </li>
                <li class="criteria-item ${p12 >= req12th ? 'pass' : 'fail'}">
                    <span class="c-icon">${p12 >= req12th ? '✅' : '❌'}</span>
                    12th HSC: ${p12}% (Branch Cutoff: ${req12th}%)
                </li>
                <li class="criteria-item ${eScore >= reqEnt ? 'pass' : 'fail'}">
                    <span class="c-icon">${eScore >= reqEnt ? '✅' : '❌'}</span>
                    Entrance Score: ${eScore} (Benchmark: ${reqEnt}+)
                </li>
            `;
        }

    } catch (e) {
        console.warn("AI Predictor offline or local mode:", e);
    }
}

// ============================================================
// DRAG & DROP FILE UPLOADS & VISUAL PREVIEWS
// ============================================================
function initDropzones() {
    const dropzoneConfigs = [
        { dropzoneId: "dropzonePhoto", inputId: "photo", previewId: "previewPhoto" },
        { dropzoneId: "dropzoneMarksheet10", inputId: "marksheet10", previewId: "previewMarksheet10" },
        { dropzoneId: "dropzoneMarksheet12", inputId: "marksheet12", previewId: "previewMarksheet12" },
        { dropzoneId: "dropzoneLC", inputId: "leavingCertificate", previewId: "previewLC" }
    ];

    dropzoneConfigs.forEach(cfg => {
        const dropzone = document.getElementById(cfg.dropzoneId);
        const input = document.getElementById(cfg.inputId);
        if (!dropzone || !input) return;

        ["dragenter", "dragover"].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.add("drag-over");
            }, false);
        });

        ["dragleave", "drop"].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove("drag-over");
            }, false);
        });

        dropzone.addEventListener("drop", (e) => {
            const dt = e.dataTransfer;
            if (dt && dt.files && dt.files.length > 0) {
                input.files = dt.files;
                handleFileSelected(input, cfg.previewId, cfg.dropzoneId);
            }
        });
    });
}

function handleFileSelected(input, previewContainerId, dropzoneId) {
    const previewContainer = document.getElementById(previewContainerId);
    const dropzone = document.getElementById(dropzoneId);
    const placeholder = dropzone ? dropzone.querySelector(".dropzone-placeholder") : null;

    if (!input.files || input.files.length === 0) {
        if (previewContainer) previewContainer.style.display = "none";
        if (placeholder) placeholder.style.display = "flex";
        if (dropzone) dropzone.classList.remove("has-file");
        updateUploadCounter();
        return;
    }

    const file = input.files[0];
    const maxBytes = 5 * 1024 * 1024; // 5MB limit
    if (file.size > maxBytes) {
        showToast(`File ${file.name} exceeds 5MB size limit!`, "error");
        input.value = "";
        return;
    }

    const fileSizeFormatted = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` 
        : `${Math.round(file.size / 1024)} KB`;

    if (previewContainer) {
        previewContainer.style.display = "flex";
        if (placeholder) placeholder.style.display = "none";
        if (dropzone) dropzone.classList.add("has-file");

        const isImage = file.type.startsWith("image/");
        let thumbHtml = "";

        if (isImage) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imgEl = previewContainer.querySelector(".file-thumb-img");
                if (imgEl) imgEl.src = e.target.result;
            };
            reader.readAsDataURL(file);
            thumbHtml = `<img src="images/admin-avatar.svg" class="file-thumb-img" alt="Preview">`;
        } else {
            thumbHtml = `<div class="file-pdf-icon">📄</div>`;
        }

        previewContainer.innerHTML = `
            <div class="file-preview-card">
                ${thumbHtml}
                <div class="file-meta-info">
                    <span class="file-meta-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
                    <span class="file-meta-size">✓ Ready (${fileSizeFormatted})</span>
                </div>
                <button type="button" class="btn-remove-upload" onclick="removeUploadedFile('${input.id}', '${previewContainerId}', '${dropzoneId}', event)" title="Remove File">✖</button>
            </div>
        `;
    }

    updateUploadCounter();
    showToast(`Attached ${file.name}`, "success");
}

function removeUploadedFile(inputId, previewContainerId, dropzoneId, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const input = document.getElementById(inputId);
    const previewContainer = document.getElementById(previewContainerId);
    const dropzone = document.getElementById(dropzoneId);
    const placeholder = dropzone ? dropzone.querySelector(".dropzone-placeholder") : null;

    if (input) input.value = "";
    if (previewContainer) { previewContainer.style.display = "none"; previewContainer.innerHTML = ""; }
    if (placeholder) placeholder.style.display = "flex";
    if (dropzone) dropzone.classList.remove("has-file");

    updateUploadCounter();
}

function updateUploadCounter() {
    const inputs = ["photo", "marksheet10", "marksheet12", "leavingCertificate"];
    let count = 0;
    inputs.forEach(id => {
        const inp = document.getElementById(id);
        if (inp && ((inp.files && inp.files.length > 0) || inp.dataset.existing)) {
            count++;
        }
    });

    const badge = document.getElementById("uploadCounterBadge");
    if (badge) {
        badge.textContent = `${count} of ${inputs.length} Uploaded`;
        badge.style.color = count === inputs.length ? "#059669" : "#2563eb";
        badge.style.background = count === inputs.length ? "#ecfdf5" : "#eff6ff";
    }
}

// ============================================================
// AUTOSAVE & DRAFT SYSTEM
// ============================================================
function initAutoSave() {
    if (editId !== null) return; // Don't autosave in edit mode

    // Check for changes on inputs
    if (form) {
        form.addEventListener("input", () => {
            if (autoSaveTimer) clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(saveDraftToStorage, 2000);
        });
    }
}

function saveDraftToStorage() {
    if (editId !== null) return;

    const draftData = {
        fullName: document.getElementById("fullName")?.value || "",
        fatherName: document.getElementById("fatherName")?.value || "",
        motherName: document.getElementById("motherName")?.value || "",
        dob: document.getElementById("dob")?.value || "",
        gender: document.getElementById("gender")?.value || "",
        bloodGroup: document.getElementById("bloodGroup")?.value || "",
        mobile: document.getElementById("mobile")?.value || "",
        altMobile: document.getElementById("altMobile")?.value || "",
        email: document.getElementById("email")?.value || "",
        aadhaar: document.getElementById("aadhaar")?.value || "",
        address: document.getElementById("address")?.value || "",
        city: document.getElementById("city")?.value || "",
        state: document.getElementById("state")?.value || "",
        pincode: document.getElementById("pincode")?.value || "",
        nationality: document.getElementById("nationality")?.value || "Indian",
        board10: document.getElementById("board10")?.value || "",
        percentage10: document.getElementById("percentage10")?.value || "",
        board12: document.getElementById("board12")?.value || "",
        percentage12: document.getElementById("percentage12")?.value || "",
        entranceExam: document.getElementById("entranceExam")?.value || "",
        entranceScore: document.getElementById("entranceScore")?.value || "",
        department: document.getElementById("department")?.value || "",
        admissionType: document.getElementById("admissionType")?.value || "",
        savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    localStorage.setItem("zeal_admission_draft", JSON.stringify(draftData));
    const draftStatus = document.getElementById("draftStatusText");
    if (draftStatus) draftStatus.textContent = `Saved (${draftData.savedAt})`;
}

function saveDraftManual() {
    saveDraftToStorage();
    showToast("Form draft saved locally!", "success");
}

function restoreDraftFromStorage() {
    const raw = localStorage.getItem("zeal_admission_draft");
    if (!raw) return;

    try {
        const draft = JSON.parse(raw);
        if (!draft.fullName && !draft.mobile) return;

        Object.keys(draft).forEach(key => {
            const el = document.getElementById(key);
            if (el && draft[key]) {
                el.value = draft[key];
            }
        });

        calculateAge();
        triggerAIPrediction();
        const draftStatus = document.getElementById("draftStatusText");
        if (draftStatus && draft.savedAt) draftStatus.textContent = `Restored (${draft.savedAt})`;
        showToast("Previous draft restored automatically.", "success");
    } catch (e) {
        console.warn("Could not parse draft", e);
    }
}

// ============================================================
// REVIEW SUMMARY GENERATOR (STEP 6)
// ============================================================
function populateReviewSummary() {
    // 1. Personal Info
    setSummaryText("revFullName", document.getElementById("fullName")?.value);
    setSummaryText("revFatherName", document.getElementById("fatherName")?.value);
    setSummaryText("revMotherName", document.getElementById("motherName")?.value);
    const dob = document.getElementById("dob")?.value || "--";
    const gender = document.getElementById("gender")?.value || "--";
    setSummaryText("revDobGender", `${dob} (${gender})`);
    setSummaryText("revBloodGroup", document.getElementById("bloodGroup")?.value);

    // 2. Contact Info
    const mobile = document.getElementById("mobile")?.value || "--";
    setSummaryText("revMobile", `+91 ${mobile}`);
    setSummaryText("revEmail", document.getElementById("email")?.value);
    setSummaryText("revAadhaar", document.getElementById("aadhaar")?.value);
    const city = document.getElementById("city")?.value || "--";
    const state = document.getElementById("state")?.value || "--";
    const pin = document.getElementById("pincode")?.value || "--";
    setSummaryText("revLocation", `${city}, ${state} - ${pin}`);
    setSummaryText("revAddress", document.getElementById("address")?.value);

    // 3. Academic Info
    const b10 = document.getElementById("board10")?.value || "--";
    const p10 = document.getElementById("percentage10")?.value || "--";
    setSummaryText("rev10th", `${b10} (${p10}%)`);

    const b12 = document.getElementById("board12")?.value || "--";
    const p12 = document.getElementById("percentage12")?.value || "--";
    setSummaryText("rev12th", `${b12} (${p12}%)`);

    const exam = document.getElementById("entranceExam")?.value || "--";
    const score = document.getElementById("entranceScore")?.value || "--";
    setSummaryText("revEntrance", `${exam} - Score: ${score}`);

    // 4. Course & AI
    const dept = document.getElementById("department")?.value || "--";
    setSummaryText("revDepartment", dept);
    setSummaryText("revAdmissionType", document.getElementById("admissionType")?.value);

    const aiProb = document.getElementById("aiProbabilityValue")?.textContent || "--";
    const aiChance = document.getElementById("aiChanceLevel")?.textContent || "Eligible";
    setSummaryText("revAIPredict", `${aiChance} (${aiProb})`);

    // 5. Attached Docs
    const docsContainer = document.getElementById("revDocsList");
    if (docsContainer) {
        const docItems = [
            { label: "Passport Photo", id: "photo" },
            { label: "10th Marksheet", id: "marksheet10" },
            { label: "12th Marksheet", id: "marksheet12" },
            { label: "Leaving Certificate", id: "leavingCertificate" }
        ];

        let html = "";
        docItems.forEach(d => {
            const inp = document.getElementById(d.id);
            const hasFile = (inp && inp.files && inp.files.length > 0) || (inp && inp.dataset.existing);
            html += `
                <div class="rev-doc-chip ${hasFile ? 'ok' : ''}">
                    <span>${hasFile ? '✅' : '⚠️'}</span>
                    <strong>${d.label}:</strong>
                    <span>${hasFile ? (inp.files?.[0]?.name || inp.dataset.existing || 'Attached') : 'Not Attached'}</span>
                </div>
            `;
        });
        docsContainer.innerHTML = html;
    }
}

function setSummaryText(elementId, val) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = val && val.trim() !== "" ? val : "--";
}

// ============================================================
// EDIT MODE DATA LOADER
// ============================================================
async function loadEditStudentData(id) {
    try {
        const res = await fetch(`/api/students/${id}`);
        if (!res.ok) throw new Error("Student not found");
        const student = await res.json();

        // Update Headers
        const mainTitle = document.getElementById("wizardMainTitle");
        const subTitle = document.getElementById("wizardSubTitle");
        const submitLabel = document.getElementById("submitBtnLabel");
        const breadcrumbTitle = document.getElementById("breadcrumbFormTitle");

        if (mainTitle) mainTitle.textContent = `Edit Admission: ${student.fullName}`;
        if (subTitle) subTitle.textContent = `Update credentials for Application ID: ${student.application_id || student.id}`;
        if (submitLabel) submitLabel.textContent = "Update Application Record";
        if (breadcrumbTitle) breadcrumbTitle.textContent = `Edit (${student.application_id || student.id})`;

        // Populate fields
        const fields = [
            "fullName", "fatherName", "motherName", "dob", "gender", "bloodGroup",
            "mobile", "altMobile", "email", "aadhaar", "address", "city", "state",
            "pincode", "nationality", "board10", "percentage10", "board12",
            "percentage12", "entranceExam", "entranceScore", "department", "admissionType"
        ];

        fields.forEach(f => {
            const el = document.getElementById(f);
            if (el && student[f] !== undefined) {
                el.value = student[f] || "";
            }
        });

        // Set declaration checked
        const declaration = document.getElementById("declaration");
        if (declaration) declaration.checked = true;

        // Render Existing Uploads
        renderExistingDocBadge("photo", "previewPhoto", "dropzonePhoto", student.photo);
        renderExistingDocBadge("marksheet10", "previewMarksheet10", "dropzoneMarksheet10", student.marksheet10);
        renderExistingDocBadge("marksheet12", "previewMarksheet12", "dropzoneMarksheet12", student.marksheet12);
        renderExistingDocBadge("leavingCertificate", "previewLC", "dropzoneLC", student.leavingCertificate);

        calculateAge();
        triggerAIPrediction();
        updateUploadCounter();
        showToast("Student application loaded in edit mode.", "success");

    } catch (e) {
        console.error("Error loading student details:", e);
        showToast("Could not load student record for editing.", "error");
    }
}

function renderExistingDocBadge(inputId, previewContainerId, dropzoneId, filename) {
    if (!filename) return;
    const input = document.getElementById(inputId);
    const previewContainer = document.getElementById(previewContainerId);
    const dropzone = document.getElementById(dropzoneId);
    const placeholder = dropzone ? dropzone.querySelector(".dropzone-placeholder") : null;

    if (input) input.dataset.existing = filename;
    if (dropzone) dropzone.classList.add("has-file");
    if (placeholder) placeholder.style.display = "none";

    if (previewContainer) {
        previewContainer.style.display = "flex";
        const isImg = filename.match(/\.(jpeg|jpg|png|webp)$/i);
        const thumb = isImg
            ? `<img src="/uploads/${escapeHtml(filename)}" class="file-thumb-img" alt="Existing">`
            : `<div class="file-pdf-icon">📄</div>`;

        previewContainer.innerHTML = `
            <div class="file-preview-card">
                ${thumb}
                <div class="file-meta-info">
                    <span class="file-meta-name">✓ Current: <a href="/uploads/${escapeHtml(filename)}" target="_blank" style="color:#2563eb; text-decoration:underline;">${escapeHtml(filename)}</a></span>
                    <span class="file-meta-size" style="color:#64748b;">(Upload new file below to replace)</span>
                </div>
            </div>
        `;
    }
}

// ============================================================
// FORM SUBMISSION ENGINE
// ============================================================
if (form) {
    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        e.stopPropagation();

        if (isSubmitting) return;

        // Validate all steps from 1 to 5
        for (let s = 1; s <= 5; s++) {
            if (!validateStep(s)) {
                navigateToStep(s);
                return;
            }
        }

        const declaration = document.getElementById("declaration");
        if (!declaration || !declaration.checked) {
            showToast("Please accept the legal declaration before submitting.", "error");
            return;
        }

        isSubmitting = true;
        const submitBtn = document.getElementById("mainSubmitBtn");
        const originalText = submitBtn ? submitBtn.innerHTML : "Submit";
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span>⏳</span> ${editId !== null ? "Updating Record..." : "Submitting Application..."}`;
        }

        try {
            const formData = new FormData();

            // Append all inputs
            const textFields = [
                "fullName", "fatherName", "motherName", "dob", "gender", "bloodGroup",
                "mobile", "altMobile", "email", "aadhaar", "address", "city", "state",
                "pincode", "nationality", "board10", "percentage10", "board12",
                "percentage12", "entranceExam", "entranceScore", "department", "admissionType"
            ];

            textFields.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    formData.append(id, el.value.trim());
                }
            });

            // Append Files
            const fileIds = ["photo", "marksheet10", "marksheet12", "leavingCertificate"];
            fileIds.forEach(id => {
                const fileInput = document.getElementById(id);
                if (fileInput && fileInput.files && fileInput.files.length > 0) {
                    formData.append(id, fileInput.files[0]);
                }
            });

            const apiUrl = editId !== null ? `/api/students/${editId}` : "/api/students";
            const apiMethod = editId !== null ? "PUT" : "POST";

            const response = await fetch(apiUrl, {
                method: apiMethod,
                body: formData
            });

            let data;
            try {
                data = await response.json();
            } catch (jsonErr) {
                data = { error: "Invalid server response format." };
            }

            if (!response.ok) {
                throw new Error(data.error || data.message || `Server returned error ${response.status}`);
            }

            // SUCCESS!
            localStorage.removeItem("zeal_admission_draft");

            // Display Receipt Modal
            showReceiptModal(data);

        } catch (error) {
            console.error("Submission error:", error);
            showToast(`Submission failed: ${error.message}`, "error");
            showErrorBanner(error.message);

            isSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    });
}

function showReceiptModal(data) {
    const modal = document.getElementById("receiptModal");
    if (!modal) {
        alert("Application submitted successfully!");
        window.location.href = "view.html";
        return;
    }

    const appId = data.application_id || data.student?.application_id || `ADM-2026-${(data.id || data.student?.id || 1).toString().padStart(4, '0')}`;
    const name = data.fullName || data.student?.fullName || document.getElementById("fullName")?.value || "Student";
    const dept = data.department || data.student?.department || document.getElementById("department")?.value || "Engineering";
    const mobile = data.mobile || data.student?.mobile || document.getElementById("mobile")?.value || "--";
    const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    document.getElementById("receiptAppId").textContent = appId;
    document.getElementById("receiptStudentName").textContent = name;
    document.getElementById("receiptDepartment").textContent = dept;
    document.getElementById("receiptMobile").textContent = `+91 ${mobile}`;
    document.getElementById("receiptDate").textContent = todayStr;

    modal.style.display = "flex";
}

function printReceipt() {
    window.print();
}

function confirmResetForm() {
    if (confirm("Are you sure you want to reset all fields? Any unsaved progress will be cleared.")) {
        form.reset();
        localStorage.removeItem("zeal_admission_draft");
        document.querySelectorAll(".dropzone-preview").forEach(p => p.style.display = "none");
        document.querySelectorAll(".dropzone-placeholder").forEach(p => p.style.display = "flex");
        document.querySelectorAll(".dropzone-card").forEach(d => d.classList.remove("has-file"));
        navigateToStep(1);
        updateUploadCounter();
        showToast("Form has been reset.", "success");
    }
}

// ============================================================
// FLOATING AI ADMISSION ASSISTANT CHATBOT
// ============================================================
function toggleAiDrawer() {
    const drawer = document.getElementById("aiChatDrawer");
    if (!drawer) return;
    drawer.style.display = drawer.style.display === "none" ? "flex" : "none";
}

function askAiQuick(query) {
    const input = document.getElementById("aiChatInput");
    if (input) {
        input.value = query;
        handleAiChatSubmit(new Event("submit"));
    }
}

async function handleAiChatSubmit(e) {
    if (e) e.preventDefault();
    const input = document.getElementById("aiChatInput");
    const container = document.getElementById("aiChatMessages");
    if (!input || !container) return;

    const message = input.value.trim();
    if (!message) return;

    // Append User Message
    container.innerHTML += `
        <div class="ai-msg ai-user">
            <div class="ai-bubble">${escapeHtml(message)}</div>
        </div>
    `;
    input.value = "";
    container.scrollTop = container.scrollHeight;

    // Loading bubble
    const loadingId = `aiLoad_${Date.now()}`;
    container.innerHTML += `
        <div class="ai-msg ai-bot" id="${loadingId}">
            <div class="ai-bubble">Thinking... 🤖</div>
        </div>
    `;
    container.scrollTop = container.scrollHeight;

    try {
        const res = await fetch("/api/ai/chatbot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: message })
        });

        let reply = "Thank you for reaching out! Please verify requirements with the admissions desk.";
        if (res.ok) {
            const data = await res.json();
            reply = data.reply || reply;
        }

        const loadEl = document.getElementById(loadingId);
        if (loadEl) {
            loadEl.innerHTML = `<div class="ai-bubble">${escapeHtml(reply)}</div>`;
        }
        container.scrollTop = container.scrollHeight;

    } catch (err) {
        const loadEl = document.getElementById(loadingId);
        if (loadEl) {
            loadEl.innerHTML = `<div class="ai-bubble">Zeal Admission AI is currently in offline mode. Please feel free to ask about cutoffs, fees, or documents!</div>`;
        }
    }
}

// ============================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================
function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast-notification ${type}`;
    toast.innerHTML = `
        <span>${type === "success" ? "✅" : "⚠️"}</span>
        <div>${escapeHtml(message)}</div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============================================================
// ESCAPE HTML HELPER
// ============================================================
function escapeHtml(text) {
    if (text === null || text === undefined) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ============================================================
// ADMIN HEADER SYNC & AUTHENTICATION
// ============================================================
(async function initAdminHeader() {
    try {
        const res = await fetch("/api/check-auth");
        if (res.ok) {
            const data = await res.json();
            if (data.authenticated && data.user_type === "admin") {
                const adminName = data.username || "Administrator";
                const adminRole = data.role || "Admissions Officer";
                const avatarSrc = data.avatar || "images/admin-avatar.svg";

                const nameEl = document.getElementById("formAdminName");
                const roleEl = document.getElementById("formAdminRole");
                const avatarEl = document.getElementById("formAdminAvatar");

                if (nameEl) nameEl.textContent = adminName;
                if (roleEl) roleEl.textContent = adminRole;
                if (avatarEl) avatarEl.src = avatarSrc;
            }
        }
    } catch (e) {
        // Guest or applicant mode
    }
})();

async function logoutAdminForm() {
    try {
        await fetch("/api/logout", { method: "POST" });
        window.location.href = "login.html";
    } catch (e) {
        window.location.href = "login.html";
    }
}