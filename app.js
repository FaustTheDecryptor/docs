// --- Utility Functions ---
const q = (s, el = document) => el ? el.querySelector(s) : null;
const qa = (s, el = document) => (el ? [...el.querySelectorAll(s)] : []);
const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);
const guard = (label, fn) => { try { fn(); } catch (e) { console.warn(`[${label}] disabled:`, e); } };

const safePostJSON = async (url, body) => {
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            credentials: 'same-origin'
        });
        const text = await res.text();
        let data = null;
        try { data = JSON.parse(text); } catch (jsonErr) {
            console.warn(`[safePostJSON] Failed to parse JSON for ${url}:`, jsonErr, 'Response text:', text);
            return { ok: res.ok, status: res.status, data: null, text, error: 'Invalid JSON response' };
        }
        return { ok: res.ok, status: res.status, data, text };
    } catch (err) {
        console.error(`[safePostJSON] Fetch error for ${url}:`, err);
        return { ok: false, error: err.message };
    }
};

// --- DOM Element References ---
// Querying at top-level is fine but be defensive when using these later.
const jsStatus = q('#js-status');
const navLinks = qa('.nav-link, .nav-link-dropdown, header button[data-page], .footer-nav-link');
const loadingSpinner = q('#loading-spinner');

// Modals (fixed selectors: added missing #)
const feedbackModalOverlay = q('#feedback-modal-overlay');
const feedbackModalTitle = q('#feedback-modal-title');
const feedbackModalText = q('#feedback-modal-text');
// changed: use the actual close button id present in HTML
const feedbackModalClose = q('#close-feedback-modal-btn');

// Auth-related menu buttons
const btnProfile = q('.dropdown-content [data-page="profile"]');
const btnLogin = q('.dropdown-content [data-page="login"]');
const btnSignup = q('.dropdown-content [data-page="signup"]');
const btnLogout = q('.dropdown-content [data-page="logout"]');
const loginForm = q('#loginForm');
const loginErrorMsg = q('#login-error-msg');
const signupLink = q('#signupLink');
const createAccountLink = q('#create-account-link');
const backToLoginLink = q('#back-to-login-link');
const loginAlertContainer = q('#login-alert-container');

// Signup form elements
const signupForm = q('#signupForm');
const signupEmail = q('#signup-email');
const signupPw = q('#signup-password');
const signupConfirmPw = q('#signup-confirm-password');
const pwMatchMsg = q('#pw-match-msg');
const signupBtn = q('#signup-submit-btn');
const sendCodeBtn = q('#send-code-btn');
const verifyCodeInput = q('#signup-verification-code');
const verifyBtn = q('#verify-code-btn');
const verifyMsg = q('#verify-msg');
const codeWrap = q('#code-wrap');

// Admin-related elements
const adminDashboard = q('#admin-dashboard');
const adminResultsPage = q('#admin-results-page');
const showFacultyBtn = q('#show-faculty-results');
const showDeptBtn = q('#show-department-results');
const resultsContent = q('#results-content');

// Evaluation form elements
const evaluationForm = q("#evaluationForm");
const startEvalBtn = q('#start-eval-btn');
const generatedEvalArea = q('#generated-eval-area');

// Calendar elements
const calendarDates = q('#calendar-dates');
const currentMonthYear = q('#current-month-year');
const prevMonthBtn = q('#prev-month');
const nextMonthBtn = q('#next-month');
let currentDate = new Date();

// Theme elements
const themeToggleBtn = q('#theme-toggle');
const body = document.body;
const themeIcon = themeToggleBtn?.querySelector('i');

// Dropdown elements for courses/year levels
const loginCourseSelect = q('#login-course');
const loginYearLevelSelect = q('#login-year-level');
const signupCourseSelect = q('#signup-course');
const signupYearLevelSelect = q('#signup-year-level');

// --- Status and Modal Functions ---
const showModal = (title, text, showSpinner = false, showClose = false) => {
    if (!feedbackModalOverlay) return;
    if (feedbackModalTitle) feedbackModalTitle.textContent = title || '';
    if (feedbackModalText) feedbackModalText.textContent = text || '';
    if (loadingSpinner) loadingSpinner.style.display = showSpinner ? 'block' : 'none';
    if (feedbackModalClose) feedbackModalClose.classList.toggle('hidden', !showClose);
    feedbackModalOverlay.classList.add('visible');
};

const updateModal = (title, text) => {
    if (loadingSpinner) loadingSpinner.style.display = 'none';
    if (feedbackModalTitle) feedbackModalTitle.textContent = title || '';
    if (feedbackModalText) feedbackModalText.textContent = text || '';
    if (feedbackModalClose) feedbackModalClose.classList.remove('hidden');
};

const hideModal = () => {
    if (feedbackModalOverlay) {
        feedbackModalOverlay.classList.remove('visible');
    }
};

on(feedbackModalClose, 'click', hideModal);

const showAlert = (msg, type = 'error') => {
    if (!loginAlertContainer) return;
    const color = type === 'success' ? 'green' : 'red';
    const alert = document.createElement('div');
    alert.className = `fade-alert bg-${color}-100 border border-${color}-400 text-${color}-700 px-4 py-3 rounded relative`;
    alert.setAttribute('role', 'alert');
    alert.innerHTML = `${msg}<span class="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer">×</span>`;
    loginAlertContainer.innerHTML = '';
    loginAlertContainer.appendChild(alert);
    requestAnimationFrame(() => alert.classList.add('show'));
    on(alert.querySelector('span:last-child'), 'click', () => alert.remove());
};

// --- Page and Navigation Management ---
const showPage = (id) => {
    const pages = qa('.page-content');
    if (!pages.length) return;
    pages.forEach(p => p.classList.remove('active'));
    const el = q(`#${id}`);
    if (el) el.classList.add('active');
};

const handleLogout = () => {
    showModal('Logging Out...', 'You have been logged out.', false, false);
    fetch('api/logout.php', { method: 'GET', credentials: 'same-origin' })
        .finally(() => {
            setTimeout(() => {
                hideModal();
                location.hash = '#home';
            }, 1500);
        });
};

const routeFromHash = () => {
    const h = (location.hash || '').replace('#', '');
    const allowed = ['home', 'evaluation', 'profile', 'login', 'signup', 'admin-results'];
    const page = allowed.includes(h) ? h : 'home';
    showPage(`${page}-page`);

    // Success alert if redirected after signup
    if (page === 'login' && sessionStorage.getItem('signupSuccess')) {
        showAlert('Your account has been created. Please log in.', 'success');
        sessionStorage.removeItem('signupSuccess');
    }
};

// Attach nav handlers defensively
if (navLinks && navLinks.length) {
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            const page = this.getAttribute('data-page');
            if (!page) return;
            e.preventDefault();
            if (page === 'logout') {
                handleLogout();
            } else {
                location.hash = '#' + page;
            }
        });
    });
}
window.addEventListener('hashchange', routeFromHash);

// --- Authentication and UI State Management ---
const setMenuLoggedIn = (isIn, role) => {
    if (btnProfile) btnProfile.style.display = isIn ? 'block' : 'none';
    if (btnLogout) btnLogout.style.display = isIn ? 'block' : 'none';
    if (btnLogin) btnLogin.style.display = isIn ? 'none' : 'block';
    if (btnSignup) btnSignup.style.display = isIn ? 'none' : 'block';
    const evalPage = q('#evaluation-page');
    if (evalPage) evalPage.style.display = isIn ? '' : 'none';
    const adminResultsEl = q('#admin-results-page');
    if (adminResultsEl) adminResultsEl.style.display = (isIn && role === 'admin') ? '' : 'none';
    const adminDashboardEl = q('#admin-dashboard');
    if (adminDashboardEl) adminDashboardEl.style.display = (isIn && role === 'admin') ? '' : 'none';
};

async function refreshAuthUI() {
    try {
        const res = await fetch('api/me.php', { credentials: 'same-origin' });
        let data = { loggedIn: false, role: null };
        try {
            data = await res.json();
        } catch (jsonErr) {
            console.warn('[refreshAuthUI] Could not parse /api/me.php response as JSON:', jsonErr);
        }
        const isLoggedIn = !!data.loggedIn;
        setMenuLoggedIn(isLoggedIn, data.role);
        if (isLoggedIn && data.role === 'admin') {
            showPage('admin-results-page');
        } else if (isLoggedIn) {
            routeFromHash();
        } else {
            showPage('login-page');
        }
    } catch (e) {
        console.error('Auth check failed:', e);
        setMenuLoggedIn(false, null);
        showPage('login-page');
    }
}

// --- Login Form ---
on(loginForm, 'submit', async (e) => {
    e.preventDefault();
    const email = q('#login-email')?.value.trim() || '';
    const password = q('#login-password')?.value.trim() || '';

    if (!email.includes('@')) { showAlert('Enter a valid email.'); return; }
    if (!password) { showAlert('Password cannot be empty.'); return; }

    try {
        const result = await safePostJSON('api/login.php', { email, password });
        // result: { ok, status, data, text, error }
        if (result.ok && result.data && result.data.ok) {
            location.hash = '#home';
            refreshAuthUI();
        } else {
            const msg = (result.data && result.data.error) || result.error || 'Login failed. Please try again.';
            showAlert(msg);
        }
    } catch (error) {
        console.error('An error occurred:', error);
        showAlert('An unexpected error occurred. Please try again later.');
    }
});

// Handle signup form link
on(signupLink, 'click', (e) => {
    e.preventDefault();
    location.hash = '#signup';
});
on(createAccountLink, 'click', (e) => {
    e.preventDefault();
    location.hash = '#signup';
});
on(backToLoginLink, 'click', (e) => {
    e.preventDefault();
    location.hash = '#login';
});

// --- Signup + Verification ---
const verifyState = { token: null, verified: false };
let sendTimerId = null;

const formReady = () => {
    const pwVal = signupPw?.value || '';
    const confirmVal = signupConfirmPw?.value || '';
    const formValid = signupForm ? signupForm.checkValidity() : true;
    const ok = formValid && verifyState.verified && pwVal && (pwVal === confirmVal);
    if (signupBtn) signupBtn.disabled = !ok;
};

const checkPwMatch = () => {
    if (!signupConfirmPw?.value) {
        if (pwMatchMsg) pwMatchMsg.textContent = '';
        formReady();
        return;
    }
    if (signupPw?.value === signupConfirmPw?.value) {
        if (pwMatchMsg) { pwMatchMsg.textContent = 'Passwords match'; pwMatchMsg.className = 'text-xs text-green-600'; }
    } else {
        if (pwMatchMsg) { pwMatchMsg.textContent = 'Passwords do not match'; pwMatchMsg.className = 'text-xs text-red-600'; }
    }
    formReady();
};
on(signupPw, 'input', checkPwMatch);
on(signupConfirmPw, 'input', checkPwMatch);

on(sendCodeBtn, 'click', async () => {
    const email = (signupEmail?.value || '').trim();
    if (!email.includes('@')) {
        if (verifyMsg) { verifyMsg.textContent = 'Enter a valid email first.'; verifyMsg.className = 'text-sm text-red-600'; }
        return;
    }

    if (sendTimerId) { clearInterval(sendTimerId); sendTimerId = null; }
    if (sendCodeBtn) { sendCodeBtn.disabled = true; sendCodeBtn.textContent = 'Sending…'; }
    if (verifyMsg) { verifyMsg.textContent = 'Sending code…'; verifyMsg.className = 'text-sm text-gray-600'; }

    const resp = await safePostJSON('api/request-verify.php', { email });
    if (!resp.ok) {
        if (verifyMsg) { verifyMsg.textContent = 'Could not send code. Try again in a minute.'; verifyMsg.className = 'text-sm text-red-600'; }
        if (sendCodeBtn) { sendCodeBtn.disabled = false; sendCodeBtn.textContent = 'Send Code'; }
        return;
    }

    const token = resp.data?.token;
    if (token) {
        verifyState.token = token;
        if (verifyMsg) { verifyMsg.textContent = 'Code sent. Check your inbox (and Spam).'; verifyMsg.className = 'text-sm text-green-600'; }
        codeWrap?.classList.remove('hidden');
    } else {
        if (verifyMsg) { verifyMsg.textContent = resp.data?.error || 'Could not send code.'; verifyMsg.className = 'text-sm text-red-600'; }
        if (sendCodeBtn) { sendCodeBtn.disabled = false; sendCodeBtn.textContent = 'Send Code'; }
        return;
    }

    let countdown = 60;
    if (sendCodeBtn) sendCodeBtn.textContent = `Resend in ${countdown}s`;
    sendTimerId = setInterval(() => {
        countdown--;
        if (sendCodeBtn) sendCodeBtn.textContent = `Resend in ${countdown}s`;
        if (countdown <= 0) {
            clearInterval(sendTimerId);
            sendTimerId = null;
            if (sendCodeBtn) { sendCodeBtn.disabled = false; sendCodeBtn.textContent = 'Send Code'; }
        }
    }, 1000);
});

on(verifyBtn, 'click', async () => {
    const email = (signupEmail?.value || '').trim();
    const code = (verifyCodeInput?.value || '').trim();
    if (!/^\d{6}$/.test(code)) {
        if (verifyMsg) { verifyMsg.textContent = 'Enter the 6-digit code after sending.'; verifyMsg.className = 'text-sm text-red-600'; }
        return;
    }
    if (!verifyState.token) {
        if (verifyMsg) { verifyMsg.textContent = 'Request a code first.'; verifyMsg.className = 'text-sm text-red-600'; }
        return;
    }

    if (verifyMsg) { verifyMsg.textContent = 'Verifying…'; verifyMsg.className = 'text-sm text-gray-600'; }
    const resp = await safePostJSON('api/confirm-verify.php', { email, code, token: verifyState.token });

    if (resp.ok && (resp.data?.ok || resp.data?.verified)) {
        verifyState.verified = true;
        if (verifyMsg) { verifyMsg.textContent = 'Email verified ✓'; verifyMsg.className = 'text-sm text-green-600'; }
        if (verifyBtn) verifyBtn.disabled = true;
        if (verifyCodeInput) verifyCodeInput.disabled = true;
        formReady();
    } else {
        verifyState.verified = false;
        const msg = resp.data?.error || resp.error || 'Invalid or expired code.';
        if (verifyMsg) { verifyMsg.textContent = msg; verifyMsg.className = 'text-sm text-red-600'; }
        formReady();
    }
});

// Signup submit (fixed checkValidity usage and improved feedback)
on(signupForm, 'submit', async (e) => {
    e.preventDefault();
    if (!signupForm) return;
    if (!signupForm.checkValidity() || !verifyState.verified || signupPw?.value !== signupConfirmPw?.value) {
        showModal('Validation Error', 'Please fill in all required fields and ensure your email is verified and passwords match before signing up.', false, true);
        return;
    }

    const email = signupEmail?.value.trim() || '';
    const password = signupPw?.value.trim() || '';

    // Provide immediate feedback
    showModal('Creating Account', 'Please wait while we create your account...', true, false);

    const resp = await safePostJSON('api/signup.php', { email, password });
    if (resp.ok && resp.data?.ok) {
        hideModal();
        sessionStorage.setItem('signupSuccess', '1');
        // Optionally show a quick confirmation modal then redirect
        showModal('Account Created', 'Your account was created. Redirecting to login...', false, false);
        setTimeout(() => {
            hideModal();
            location.hash = '#login';
        }, 1200);
    } else {
        hideModal();
        if (verifyMsg) { verifyMsg.textContent = resp.data?.error || resp.error || 'Signup failed'; verifyMsg.className = 'text-sm text-red-600'; }
        // show an alert near login/signup
        showAlert(resp.data?.error || resp.error || 'Signup failed. Please try again.');
    }
});


// --- Password eye toggles ---
const toggleLogin = q('#toggle-login-password');
const loginPw = q('#login-password');
if (toggleLogin && loginPw) {
    on(toggleLogin, 'click', () => { loginPw.type = loginPw.type === 'password' ? 'text' : 'password'; });
}
const toggleSignup = q('#toggle-signup-password');
if (toggleSignup && signupPw) {
    on(toggleSignup, 'click', () => { signupPw.type = signupPw.type === 'password' ? 'text' : 'password'; });
}

// --- Theme Toggle ---
const applyTheme = (theme) => {
    if (body) {
        if (theme === 'dark-theme') {
            body.classList.add('dark-theme');
            if (themeIcon) { themeIcon.classList.remove('fa-moon'); themeIcon.classList.add('fa-sun'); }
        } else {
            body.classList.remove('dark-theme');
            if (themeIcon) { themeIcon.classList.remove('fa-sun'); themeIcon.classList.add('fa-moon'); }
        }
        try { localStorage.setItem('theme', theme); } catch (e) { /* ignore */ }
    }
};
const currentTheme = (() => { try { return localStorage.getItem('theme'); } catch (e) { return null; } })();
if (currentTheme) {
    applyTheme(currentTheme);
} else {
    applyTheme('light-theme');
}
on(themeToggleBtn, 'click', () => {
    if (body?.classList.contains('dark-theme')) {
        applyTheme('light-theme');
    } else {
        applyTheme('dark-theme');
    }
});

// --- Calendar and Dropdowns ---
const renderCalendar = (date) => {
    const y = date.getFullYear(), m = date.getMonth();
    const first = new Date(y, m, 1), last = new Date(y, m + 1, 0), today = new Date();
    if (currentMonthYear) currentMonthYear.textContent = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (calendarDates) calendarDates.innerHTML = '';
    let dow = first.getDay();
    const prevLast = new Date(y, m, 0).getDate();
    for (let i = 0; i < dow; i++) {
        const d = document.createElement('div');
        d.className = 'other-month';
        d.textContent = prevLast - (dow - 1) + i;
        if (calendarDates) calendarDates.appendChild(d);
    }
    for (let i = 1; i <= last.getDate(); i++) {
        const d = document.createElement('div');
        d.textContent = i;
        d.className = 'day';
        if (i === today.getDate() && m === today.getMonth() && y === today.getFullYear()) d.classList.add('current-day');
        if (calendarDates) calendarDates.appendChild(d);
    }
    const total = dow + last.getDate();
    for (let i = 1; i <= 42 - total; i++) {
        const d = document.createElement('div');
        d.className = 'other-month';
        d.textContent = i;
        if (calendarDates) calendarDates.appendChild(d);
    }
};
on(prevMonthBtn, 'click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(currentDate); });
on(nextMonthBtn, 'click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(currentDate); });

const courses = ["Bachelor of Public Administration (BPA)", "Bachelor of Science in Business Administration (BSBA)", "Bachelor of Science in Information Systems (BSIS)", "Bachelor of Secondary Education (BSED)", "Bachelor of Science in Tourism Management (BSTM)", "Bachelor of Science in Hospitality Management (BSHM)", "Bachelor of Science in Criminology"];
const yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

if (loginCourseSelect) courses.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; loginCourseSelect.appendChild(o); });
if (loginYearLevelSelect) yearLevels.forEach(y => { const o = document.createElement('option'); o.value = y; o.textContent = y; loginYearLevelSelect.appendChild(o); });
if (signupCourseSelect) courses.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; signupCourseSelect.appendChild(o); });
if (signupYearLevelSelect) yearLevels.forEach(y => { const o = document.createElement('option'); o.value = y; o.textContent = y; signupYearLevelSelect.appendChild(o); });

// --- Admin Dashboard & Results ---
const facultyResults = {
    title: "Faculty Evaluation Results",
    headers: ["Professors", "Average Score"],
    rows: [
        ["Michelle Placides", "4.0"],
        ["Roberto Bula Jr.", "3.8"],
        ["Roldan-Jhay A. Lincalio", "4.2"]
    ]
};
const departmentResults = {
    title: "Department Evaluation Results",
    headers: ["Department", "Average Score"],
    rows: [
        ["Accounting", "3.0"],
        ["IT Department", "3.8"],
        ["Administration", "4.1"]
    ]
};

const renderResultsTable = (data) => {
    return `
        <h2 style="font-size:1.5em; font-weight:bold; margin-bottom:18px;">${data.title}</h2>
        <div style="background:#fff; border-radius:12px; padding:24px;">
            <table style="width:100%; font-size:1.2em;">
                <thead>
                    <tr>
                        <th style="text-align:left; font-weight:bold;">${data.headers[0]}</th>
                        <th style="text-align:right; font-weight:bold;">${data.headers[1]}</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.rows.map(row => `
                        <tr>
                            <td style="padding:8px 0;">${row[0]}</td>
                            <td style="text-align:right; padding:8px 0;">${row[1]}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
};

if (showFacultyBtn && showDeptBtn && resultsContent) {
    on(showFacultyBtn, 'click', () => { resultsContent.innerHTML = renderResultsTable(facultyResults); });
    on(showDeptBtn, 'click', () => { resultsContent.innerHTML = renderResultsTable(departmentResults); });
    resultsContent.innerHTML = renderResultsTable(facultyResults);
}

// --- Initialization and Final Calls ---
document.addEventListener('DOMContentLoaded', function () {
    if (jsStatus) {
        jsStatus.textContent = 'VMC Portal Loaded successfully!';
        jsStatus.classList.remove('bg-yellow-200', 'text-yellow-800');
        jsStatus.classList.add('bg-green-200', 'text-green-800');
        setTimeout(() => {
            jsStatus.style.transition = 'opacity .5s ease';
            jsStatus.style.opacity = '0';
            setTimeout(() => jsStatus.remove(), 500);
        }, 5000);
    }
    if (calendarDates) renderCalendar(currentDate);

    // Ensure signup button initial state and run formReady once
    if (signupBtn) signupBtn.disabled = true;
    formReady();

    // Show generated evaluation area and log selected values
    on(startEvalBtn, 'click', () => {
        // Grab selects (use IDs present in the HTML)
        const yearSelect = q('#yearLevel');
        const personnelSelect = q('#personnel');
        const subjectSelect = q('#subject');

        const yearVal = yearSelect?.value || '';
        const yearText = yearSelect?.selectedOptions?.[0]?.textContent || '';
        const personnelVal = personnelSelect?.value || '';
        const personnelText = personnelSelect?.selectedOptions?.[0]?.textContent || '';
        const subjectVal = subjectSelect?.value || '';
        const subjectText = subjectSelect?.selectedOptions?.[0]?.textContent || '';

        // Basic validation: ensure a meaningful selection is made
        if (!yearVal || !personnelVal) {
            // If modal helpers exist, show friendly message; otherwise use alert
            if (typeof showModal === 'function') {
                showModal('Selection required', 'Please choose a Year/Level and a Person/Department before starting the evaluation.', false, true);
            } else {
                alert('Please choose a Year/Level and a Person/Department before starting the evaluation.');
            }
            return;
        }

        // Console log for smoke testing
        console.info('Start Evaluation:', { year: yearVal, yearText, personnel: personnelVal, personnelText, subject: subjectVal, subjectText });

        // Render a small summary in the generated area and show it
        if (generatedEvalArea) {
            generatedEvalArea.innerHTML = `
                <div style="padding:12px;border-radius:10px;background:#f8fafc;border:1px solid #e6eef9;">
                    <h3 style="margin:0 0 8px 0;font-weight:700;">Evaluation Summary</h3>
                    <p style="margin:4px 0;"><strong>Year/Level:</strong> ${yearText} (${yearVal})</p>
                    <p style="margin:4px 0;"><strong>Person / Dept.:</strong> ${personnelText} (${personnelVal})</p>
                    <p style="margin:4px 0;"><strong>Subject:</strong> ${subjectText || '—'} (${subjectVal || '—'})</p>
                    <p style="margin-top:10px;color:#0369a1;font-weight:600;">You may now proceed with the evaluation.</p>
                </div>
            `;
            generatedEvalArea.style.display = 'block';
            generatedEvalArea.scrollIntoView({ behavior: 'smooth' });
        }
    });

    refreshAuthUI();
});

// Removed duplicate sendCodeBtn handler at file end to avoid double registration and console spam.
// If you need the debug handler, keep only the earlier sendCodeBtn handler defined above.
