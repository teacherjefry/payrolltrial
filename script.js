// --- 1. FIREBASE SETUP ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBHhZ_ltc1qs49erv7pzeczp5qlnxd46aufzapsmzpa7y73ct",
  authDomain: "neerada-payroll.firebaseapp.com",
  projectId: "neerada-payroll",
  storageBucket: "neerada-payroll.firebasestorage.app",
  messagingSenderId: "974433788853",
  appId: "1:974433788853:web:be6eadac8ec50e3808affc"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 2. DATABASE BRIDGE ---
window.transact = async function(storeName, mode, operation) {
    const proxy = {
        getAll: async () => {
            const querySnapshot = await getDocs(collection(db, storeName));
            return querySnapshot.docs.map(doc => doc.data());
        },
        put: async (data) => {
            const key = data.id || data.dateId || data.name || "settings"; 
            await setDoc(doc(db, storeName, String(key)), data);
            return data;
        },
        delete: async (id) => {
            await deleteDoc(doc(db, storeName, String(id)));
        },
        get: async (id) => {
             const docSnap = await getDoc(doc(db, storeName, String(id)));
             return docSnap.exists() ? docSnap.data() : null;
        }
    };
    return await operation(proxy);
};

// --- 3. APP CONSTANTS ---
const STORE_EMPLOYEES = 'employees';
const STORE_HISTORY = 'history_logs';
const STORE_CONFIG = 'department_configs';
const ACADEMIC_DEPTS = ['Kindergarten', 'Primary', 'Secondary', 'English', 'Vice Principal'];
const GS_DEPTS = ['Accounts (ບັນຊີ)', 'Admin (ບໍລິຫານ)', 'Secretary (ເລຂານຸການ)', 'Invitational Teachers', 'Cooks', 'Cleaners', 'Drivers', 'Repair'];
const DEFAULT_DEPTS = [...ACADEMIC_DEPTS, ...GS_DEPTS];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// Global State
let employees = [];
let departmentConfigs = {};
let selectedEmployee = null;
let currentPayrollState = {};
let editorMonth = MONTHS[new Date().getMonth()];
let editorYear = new Date().getFullYear();

// --- 4. APP FUNCTIONS ---

// Init App (Load data from Cloud)
async function initApp() {
    try {
        employees = await window.transact(STORE_EMPLOYEES, 'readonly', s => s.getAll());
        const configs = await window.transact(STORE_CONFIG, 'readonly', s => s.getAll());
        
        if (configs.length === 0) {
            // Create default configs if empty
            for (const d of DEFAULT_DEPTS) {
                const cfg = { 
                    name: d, 
                    earnings: d === 'English' ? [] : ['Basic Pay', 'Allowance'], 
                    deductions: ['Tax', 'Social Security'] 
                };
                await window.transact(STORE_CONFIG, 'readwrite', s => s.put(cfg));
                departmentConfigs[d] = cfg;
            }
        } else { 
            configs.forEach(c => departmentConfigs[c.name] = c); 
        }

        // Load Logo
        const settings = await window.transact(STORE_CONFIG, 'readonly', s => s.get('global_settings'));
        if (settings && settings.logo) updateAppLogo(settings.logo);

        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('app-content').classList.remove('hidden');
        renderEmployeeList();
        setupSelectors();
        if (window.lucide) lucide.createIcons();
    } catch(e) { 
        console.error("Firebase Load Fail:", e); 
    }
}

// === IMPORT DATA FUNCTION (New Feature) ===
window.importData = (input) => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    
    // Show loading state
    const btnText = input.previousElementSibling.innerText;
    input.previousElementSibling.innerText = "Uploading to Cloud...";
    
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            console.log("Starting Import...", data);

            // 1. Import Configs
            const configs = data.config || data.departmentConfigs || [];
            const configArray = Array.isArray(configs) ? configs : Object.values(configs);
            for (const cfg of configArray) {
                if(cfg.name) await window.transact(STORE_CONFIG, 'readwrite', s => s.put(cfg));
            }

            // 2. Import Employees
            if (data.employees) {
                for (const emp of data.employees) {
                    await window.transact(STORE_EMPLOYEES, 'readwrite', s => s.put(emp));
                }
            }

            // 3. Import History
            if (data.history) {
                for (const h of data.history) {
                    await window.transact(STORE_HISTORY, 'readwrite', s => s.put(h));
                }
            }

            alert("Data successfully imported to Firebase Cloud!");
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert("Error parsing backup file. Check console for details.");
            input.previousElementSibling.innerText = btnText;
        }
    };
    reader.readAsText(file);
};

// Launch Button
window.launchApp = function() {
    document.getElementById('landing-view').classList.add('hidden');
    document.body.classList.remove('view-landing');
    document.getElementById('app-view').classList.remove('hidden');
    initApp();
};

window.goToLanding = () => window.location.reload();

// Logo Logic
function updateAppLogo(url) {
    const ids = ['landing-custom-logo', 'header-custom-logo', 'prev-school-logo'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) { el.src = url; el.classList.remove('hidden'); }
    });
    document.getElementById('landing-logo-container').classList.add('hidden');
}

window.handleLogoUpload = (input) => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        const dataUrl = e.target.result;
        await window.transact(STORE_CONFIG, 'readwrite', s => s.put({ name: "global_settings", logo: dataUrl }));
        alert("Logo saved to Cloud!");
        updateAppLogo(dataUrl);
    };
    reader.readAsDataURL(file);
};

// UI Helpers
function setupSelectors() {
    const mSelect = document.getElementById('editor-month');
    const ySelect = document.getElementById('editor-year');
    if(!mSelect) return;
    mSelect.innerHTML = MONTHS.map(m => `<option value="${m}">${m}</option>`).join('');
    mSelect.value = editorMonth;
    ySelect.innerHTML = [2025, 2026, 2027].map(y => `<option value="${y}">${y}</option>`).join('');
    ySelect.value = editorYear;
}

function renderEmployeeList() {
    const list = document.getElementById('employee-list');
    list.innerHTML = employees.map(emp => `
        <div onclick="window.selectEmployee('${emp.id}')" class="p-3 border-b hover:bg-gray-50 cursor-pointer flex justify-between">
            <div>
                <p class="font-bold text-sm">${emp.name}</p>
                <p class="text-xs text-gray-500">${emp.department}</p>
            </div>
        </div>
    `).join('');
}

window.selectEmployee = (id) => {
    selectedEmployee = employees.find(e => e.id === id);
    window.loadPeriodData();
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('editor-area').classList.remove('hidden');
};

window.loadPeriodData = () => {
    editorMonth = document.getElementById('editor-month').value;
    editorYear = document.getElementById('editor-year').value;
    const key = `${editorYear}-${editorMonth}`;
    
    currentPayrollState = { notes: "" };
    
    if (selectedEmployee.payrollHistory && selectedEmployee.payrollHistory[key]) {
        currentPayrollState = selectedEmployee.payrollHistory[key];
    }
    
    renderEditor();
    renderPreview();
};

function renderEditor() {
    const content = document.getElementById('editor-content');
    const dept = selectedEmployee.department;
    content.innerHTML = `
        <div class="p-4 border rounded bg-gray-50">
            <h3 class="font-bold text-blue-900 mb-2">${dept} Payroll</h3>
            <p class="text-xs text-gray-500 mb-4">Editing for ${editorMonth} ${editorYear}</p>
            
            <label class="block text-xs font-bold mb-1">Basic Pay / Salary</label>
            <input type="number" onchange="window.updateField('basic', this.value)" class="w-full border p-2 rounded mb-2" value="${currentPayrollState.basic || 0}">
            
            <label class="block text-xs font-bold mb-1">Deductions</label>
            <input type="number" onchange="window.updateField('deduction', this.value)" class="w-full border p-2 rounded mb-2" value="${currentPayrollState.deduction || 0}">
            
            <label class="block text-xs font-bold mb-1">Notes</label>
            <textarea onchange="window.updateField('notes', this.value)" class="w-full border p-2 rounded">${currentPayrollState.notes || ''}</textarea>
        </div>
    `;
}

window.updateField = (field, val) => {
    currentPayrollState[field] = field === 'notes' ? val : parseFloat(val);
    renderPreview();
};

function renderPreview() {
    document.getElementById('prev-name').innerText = selectedEmployee.name;
    document.getElementById('prev-dept').innerText = selectedEmployee.department;
    document.getElementById('prev-pos').innerText = selectedEmployee.position || '-';
    document.getElementById('prev-date').innerText = `${editorMonth} ${editorYear}`;
    
    const basic = currentPayrollState.basic || 0;
    const ded = currentPayrollState.deduction || 0;
    const net = basic - ded;
    
    document.getElementById('preview-content').innerHTML = `
        <div class="mt-4 space-y-2">
            <div class="flex justify-between border-b py-1"><span>Earnings</span><span>₭ ${basic.toLocaleString()}</span></div>
            <div class="flex justify-between border-b py-1 text-red-600"><span>Deductions</span><span>(₭ ${ded.toLocaleString()})</span></div>
            <div class="flex justify-between py-2 font-bold text-lg bg-blue-50 px-2 mt-4 text-blue-900"><span>NET PAY</span><span>₭ ${net.toLocaleString()}</span></div>
            ${currentPayrollState.notes ? `<div class="text-xs text-gray-500 mt-4">Note: ${currentPayrollState.notes}</div>` : ''}
        </div>
    `;
}

window.saveEmployeePayrollData = async () => {
    const key = `${editorYear}-${editorMonth}`;
    if (!selectedEmployee.payrollHistory) selectedEmployee.payrollHistory = {};
    selectedEmployee.payrollHistory[key] = currentPayrollState;
    
    await window.transact(STORE_EMPLOYEES, 'readwrite', s => s.put(selectedEmployee));
    alert("Saved!");
};

// Modal Handlers
window.openStaffModal = () => document.getElementById('add-modal').classList.remove('hidden');
window.closeModal = () => document.getElementById('add-modal').classList.add('hidden');
window.openSettings = () => document.getElementById('settings-modal').classList.remove('hidden');
window.closeSettings = () => document.getElementById('settings-modal').classList.add('hidden');

window.saveEmployee = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newEmp = {
        id: 'EMP_' + Date.now(),
        name: fd.get('name'),
        department: fd.get('department'),
        position: fd.get('position'),
        bankLak: fd.get('bankLak'),
        bankUsd: fd.get('bankUsd'),
        payrollHistory: {}
    };
    await window.transact(STORE_EMPLOYEES, 'readwrite', s => s.put(newEmp));
    window.closeModal();
    initApp(); 
};

// Populate Dept Select
window.onload = () => {
    const sel = document.getElementById('form-department');
    if(sel) sel.innerHTML = DEFAULT_DEPTS.map(d => `<option value="${d}">${d}</option>`).join('');
    if(window.lucide) lucide.createIcons();
};

window.switchView = (v) => {
    ['dashboard', 'payroll', 'config', 'ot-loans'].forEach(id => {
        document.getElementById('view-'+id).classList.add('hidden');
    });
    document.getElementById('view-'+v).classList.remove('hidden');
};

window.updateDashboardStats = () => {
    document.getElementById('stat-employees').innerText = employees.length;
};
