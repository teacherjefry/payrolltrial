// --- 1. FIREBASE SETUP & IMPORTS ---
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
            const snap = await getDocs(collection(db, storeName));
            return snap.docs.map(d => d.data());
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

// --- 3. CONSTANTS & CONFIGURATION ---
const STORE_EMPLOYEES = 'employees';
const STORE_HISTORY = 'history_logs';
const STORE_CONFIG = 'department_configs';

const ACADEMIC_DEPTS = ['Kindergarten', 'Primary', 'Secondary', 'English', 'Academic Head - Kinder', 'Academic Head - Primary', 'Academic Head - HS', 'Vice Principal'];
const GS_DEPTS = ['Accounts (ບັນຊີ)', 'Admin (ບໍລິຫານ)', 'Secretary (ເລຂານຸການ)', 'Invitational Teachers (ຄູຮັບເຊີນ)', 'Cooks (ແມ່ຄົວ)', 'Cleaners (ພະນັກງານອະນາໄມ)', 'Drivers (ພະນັກງານຂັບລົດ)', 'Repair (ສ້ອມແປງ)'];
const DEFAULT_DEPTS = [...ACADEMIC_DEPTS, ...GS_DEPTS];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const CAMPUSES = ['Sibounheuang', 'Chommany', 'General Services'];

// Lao Payroll Fields
const LAO_FIELDS = {
    research: 'ດຸໝັ່ນຄົ້ນຄວ້າ&ພັດທະນາການສອນການສອນ (ຮູ້ນໍາໃຊ້ເຕັກນິກເພື່ອເຮັດໃຫ້ ນຮ ມັກຮຽນ)',
    media: 'ນຳໃຊ້ສື່ການສອນ/ແຕ່ງບົດສອນ/ຕິດຕາມພັດທະນາການ ນຮ.ຫ້າວຫັນໃນການປະກອບສ່ວນໃນວຽກອື່ນໆຂອງໂຮງຮຽນ',
    behaviorBasic: 'ຄຸ້ມຄອງລະບຽບແລະຄວາມປະພຶດ ໃສ່ໃຈນຳ ນັກຮຽນ', 
    classResp: 'ຄວາມຮັບຜິດຊອບໃນຫ້ອງຮຽນ : ທຸກໆຢ່າງ',
    policy: 'ນະໂຍບາຍອື່ນໆ',
    basic: 'ເງີນເດືອນພື້ນຖານ', 
    cert: 'ໃບປະກາດ: ປຕີ (ສອງແສນຫ້າສິບ) ຊັ້ນສູງ (ສອງແສນ) ຊັ້ນກາງ (ໜຶ່ງແສນຫ້າສິບ)',
    homeroom: 'ຄູປະຈຳຫ້ອງ/ຄູປະຈຳຫ້ອງສະໝຸດ/ຄູປະຈຳເດີ່ນກິລາ',
    behaviorStart: 'ຄຸ້ມຄອງລະບຽບແລະຄວາມປະພຶດ ນຮ/ໃສ່ໃຈນຳນັກຮຽນ', 
    start: 'ເລີ້ມຕົ້ນ',
    accumulated: 'ເງີນສະສົມປີຜ່ານມາ',
    increase: 'ເພີ້ມປະຈຳປີ 2025-2026'
};

const laoEarningsStruct = [ LAO_FIELDS.research, LAO_FIELDS.media, LAO_FIELDS.behaviorBasic, LAO_FIELDS.classResp, LAO_FIELDS.policy, LAO_FIELDS.basic, LAO_FIELDS.cert, LAO_FIELDS.homeroom, LAO_FIELDS.behaviorStart, LAO_FIELDS.start, LAO_FIELDS.accumulated, LAO_FIELDS.increase ];
const defaultDeductions = ['ຫັກເງີນອາກອນ 5% (ຕາມເງີນເດືອນຕົວຈິງ)', 'ຫັກປະກັນສັງຄົມ 5.5%', 'ມາຊ້າ', 'Others ອື່ນໆ'];

// State Variables
let employees = [];
let departmentConfigs = {};
let selectedEmployee = null;
let selectedOTLStaff = null;
let currentPayrollState = {};
let currentFilter = { campus: 'All', department: 'All' };
let editorMonth = MONTHS[new Date().getMonth()];
let editorYear = new Date().getFullYear();
let tempProfilePic = null;

// --- 4. INITIALIZATION ---

window.launchApp = function() {
    document.getElementById('landing-view').classList.add('hidden');
    document.body.classList.remove('view-landing');
    document.getElementById('app-view').classList.remove('hidden');
    initApp();
};

window.goToLanding = () => window.location.reload();

async function initApp() {
    try {
        // 1. Fetch Data
        employees = await window.transact(STORE_EMPLOYEES, 'readonly', s => s.getAll());
        const configs = await window.transact(STORE_CONFIG, 'readonly', s => s.getAll());
        
        // 2. Setup Configs
        if (configs.length === 0) {
            for (const d of DEFAULT_DEPTS) {
                let earnings = ACADEMIC_DEPTS.includes(d) && d !== 'English' ? [...laoEarningsStruct] : ['Basic Pay (LAK)', 'Allowance'];
                if(d === 'English') earnings = [];
                const cfg = { name: d, earnings, deductions: [...defaultDeductions] };
                await window.transact(STORE_CONFIG, 'readwrite', s => s.put(cfg));
                departmentConfigs[d] = cfg;
            }
        } else { 
            configs.forEach(c => departmentConfigs[c.name] = c); 
        }

        // 3. Load Settings
        const settings = await window.transact(STORE_CONFIG, 'readonly', s => s.get('global_settings'));
        if (settings && settings.logo) updateAppLogo(settings.logo);

        // 4. Render UI
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('app-content').classList.remove('hidden');
        setupSelectors();
        renderDeptSidebar();
        renderEmployeeList();
        updateDashboardStats();
        if (window.lucide) lucide.createIcons();

    } catch(e) { console.error("Init Error:", e); }
}

function setupSelectors() {
    const years = [2025, 2026, 2027, 2028];
    const populate = (id, opts, def) => {
        const el = document.getElementById(id);
        if(el) { el.innerHTML = opts; el.value = def; }
    };
    
    const mOpts = MONTHS.map(m => `<option value="${m}">${m}</option>`).join('');
    const mAllOpts = `<option value="All">All Months</option>` + mOpts;
    const yOpts = years.map(y => `<option value="${y}">${y}</option>`).join('');
    const yAllOpts = `<option value="All">All Years</option>` + yOpts;

    populate('filter-month', mAllOpts, 'All');
    populate('filter-year', yAllOpts, editorYear);
    populate('editor-month', mOpts, editorMonth);
    populate('editor-year', yOpts, editorYear);
    populate('otl-month', mOpts, editorMonth);
    populate('otl-year', yOpts, editorYear);
    populate('bulk-month', mOpts, editorMonth);
    populate('bulk-year', yOpts, editorYear);
    populate('bulk-import-month', mOpts, editorMonth);
    populate('bulk-import-year', yOpts, editorYear);
}

// --- 5. STAFF MANAGER & SIDEBAR ---

window.renderDeptSidebar = () => {
    const tree = document.getElementById('dept-tree'); if(!tree) return;
    const currentDepts = Object.keys(departmentConfigs).sort();
    
    let html = `<div onclick="window.setFilter('All', 'All')" class="cursor-pointer px-3 py-2 text-sm font-bold flex justify-between items-center rounded mb-2 ${currentFilter.department === 'All' ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100'}"><span>All Staff</span><span class="text-xs px-1.5 py-0.5 bg-black/5 rounded">${employees.length}</span></div>`; 
    
    CAMPUSES.forEach(campus => { 
        html += `<div class="mt-4 mb-2 px-3 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider">${campus}</div>`; 
        let targetDepts = (campus === 'General Services') ? GS_DEPTS : ACADEMIC_DEPTS;
        
        currentDepts.filter(d => targetDepts.includes(d)).forEach(dept => { 
            const count = employees.filter(e => e.campus === campus && e.department === dept).length; 
            const isActive = currentFilter.campus === campus && currentFilter.department === dept;
            html += `<div onclick="window.setFilter('${campus}', '${dept}')" class="cursor-pointer px-3 py-1 ml-2 text-sm flex justify-between items-center rounded ${isActive ? 'bg-white shadow-sm border-l-2 border-blue-500 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100 border-l-2 border-transparent'}"><span>${dept}</span><span class="text-[10px] bg-gray-100 px-1.5 rounded text-gray-500">${count}</span></div>`; 
        }); 
    }); 
    tree.innerHTML = html;
    
    // Update Filter Label
    const filterLabel = document.getElementById('filter-label');
    const filterStatus = document.getElementById('filter-status');
    if (filterStatus) {
        if (currentFilter.department !== 'All') {
            filterStatus.classList.remove('hidden');
            filterLabel.innerText = `${currentFilter.department}`;
            document.getElementById('delete-dept-button').innerText = `Delete ${currentFilter.department}`;
        } else {
            filterStatus.classList.add('hidden');
            document.getElementById('delete-dept-button').innerText = "Delete All";
        }
    }
};

window.setFilter = (c, d) => { currentFilter = { campus: c, department: d }; renderDeptSidebar(); renderEmployeeList(); };
window.clearFilter = () => window.setFilter('All', 'All');

window.renderEmployeeList = () => {
    const list = document.getElementById('employee-list');
    let filtered = employees;
    if (currentFilter.campus !== 'All') filtered = filtered.filter(e => e.campus === currentFilter.campus);
    if (currentFilter.department !== 'All') filtered = filtered.filter(e => e.department === currentFilter.department);
    
    list.innerHTML = filtered.map(emp => `
        <div onclick="window.selectEmployee('${emp.id}')" class="p-3 border-b hover:bg-gray-50 cursor-pointer flex justify-between items-center ${selectedEmployee?.id === emp.id ? 'bg-blue-50' : ''}">
            <div class="flex items-center gap-2">
                ${emp.profilePic ? `<img src="${emp.profilePic}" class="w-8 h-8 rounded-full object-cover">` : `<div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center"><i data-lucide="user" class="w-4 h-4 text-gray-400"></i></div>`}
                <div><p class="font-bold text-sm text-gray-800">${emp.name}</p><p class="text-xs text-blue-600">${emp.department}</p></div>
            </div>
        </div>
    `).join('');
    if(window.lucide) lucide.createIcons();
};

window.selectEmployee = (id) => { 
    selectedEmployee = employees.find(e => e.id === id); 
    window.loadPeriodData(); 
    document.getElementById('empty-state').classList.add('hidden'); 
    document.getElementById('editor-area').classList.remove('hidden'); 
    window.renderEmployeeList();
};

// --- 6. DASHBOARD & PAYSLIP CALCULATION ---

window.updateDashboardStats = async () => {
    const yr = document.getElementById('filter-year').value;
    const mn = document.getElementById('filter-month').value;
    
    let totalLAK = 0, totalUSD = 0, count = 0;
    let breakdown = {};

    employees.forEach(emp => {
        if (!emp.payrollHistory) return;
        Object.keys(emp.payrollHistory).forEach(key => {
            const [kY, kM] = key.split('-');
            if ((yr === 'All' || kY == yr) && (mn === 'All' || kM == mn)) {
                const res = calculatePayroll(emp, emp.payrollHistory[key]);
                if (res.lak > 0 || res.usd > 0) {
                    totalLAK += res.lak;
                    totalUSD += res.usd;
                    count++;
                    
                    const d = emp.department || 'Unassigned';
                    const c = emp.campus || 'General';
                    if(!breakdown[c]) breakdown[c] = {};
                    if(!breakdown[c][d]) breakdown[c][d] = { lak: 0, usd: 0 };
                    breakdown[c][d].lak += res.lak;
                    breakdown[c][d].usd += res.usd;
                }
            }
        });
    });

    document.getElementById('stat-total-paid-lak').innerText = "₭ " + totalLAK.toLocaleString();
    document.getElementById('stat-total-paid-usd').innerText = "$" + totalUSD.toLocaleString();
    document.getElementById('stat-employees').innerText = count;

    let bdHtml = `<table class="w-full text-sm text-left"><thead class="bg-gray-50"><tr><th class="p-2">Campus</th><th class="p-2">Dept</th><th class="p-2 text-right">LAK</th><th class="p-2 text-right">USD</th></tr></thead><tbody>`;
    Object.keys(breakdown).forEach(c => {
        Object.keys(breakdown[c]).forEach(d => {
            bdHtml += `<tr class="border-b"><td class="p-2 text-blue-900 font-bold">${c}</td><td class="p-2">${d}</td><td class="p-2 text-right font-mono">₭ ${breakdown[c][d].lak.toLocaleString()}</td><td class="p-2 text-right font-mono">$${breakdown[c][d].usd.toLocaleString()}</td></tr>`;
        });
    });
    bdHtml += `</tbody></table>`;
    document.getElementById('dept-breakdown').innerHTML = `<div class="bg-white rounded shadow overflow-hidden">${bdHtml}</div>`;
    
    const history = await window.transact(STORE_HISTORY, 'readonly', s => s.getAll());
    const hList = document.getElementById('history-list');
    if(hList) {
        hList.innerHTML = history.sort((a,b) => b.dateId.localeCompare(a.dateId)).map(h => `<tr><td class="p-4 text-sm font-bold text-blue-900">${h.month} ${h.year}</td><td class="p-4 text-sm">${h.employeeCount || 0} Staff</td><td class="p-4 text-sm text-right font-mono text-green-700">₭ ${(h.totalLAK||0).toLocaleString()}</td><td class="p-4 text-sm text-right font-mono">$${(h.totalUSD||0).toLocaleString()}</td><td class="p-4 text-right"><button onclick="window.deleteHistory('${h.dateId}')" class="text-red-500 text-xs underline">Delete</button></td></tr>`).join('');
    }
};

function calculatePayroll(emp, state) {
    let lak = 0, usd = 0;
    if (emp.department === 'English') {
        const basic = (state.basicPay || 0) + (state.accumulated || 0) + (state.increase || 0) + (state.earningsOthersUSD || 0);
        const ot = (state.otHours || 0) * (state.otRate || 0);
        const dedUSD = (state.profTax || 0) + (state.absences || 0);
        usd = Math.max(0, basic + ot - dedUSD);
        
        const exRate = state.exchangeRate || 0;
        const cashOut = state.cashOut || 0;
        const netUSD = usd - cashOut;
        lak = (netUSD * exRate) + (state.itLAK || 0) - (state.insuranceLAK || 0);
        usd = cashOut;
    } else {
        const cfg = departmentConfigs[emp.department] || { earnings: [], deductions: [] };
        let earn = 0, ded = 0;
        cfg.earnings.forEach(f => {
            if(f !== 'Basic Pay (USD)' && f !== 'Exchange Rate (LAK)') earn += (state[f] || 0);
        });
        earn += (state.overtimeAmount || 0);
        
        cfg.deductions.forEach(f => ded += (state[f] || 0));
        ded += (state.loanDeduction || 0);
        lak = Math.max(0, earn - ded);
    }
    return { lak, usd };
}

// --- 7. PAYSLIP EDITOR & PREVIEW ---

window.loadPeriodData = () => {
    if (!selectedEmployee) return;
    editorMonth = document.getElementById('editor-month').value;
    editorYear = document.getElementById('editor-year').value;
    const key = `${editorYear}-${editorMonth}`;
    
    currentPayrollState = (selectedEmployee.payrollHistory && selectedEmployee.payrollHistory[key]) 
        ? JSON.parse(JSON.stringify(selectedEmployee.payrollHistory[key])) 
        : createInitialState(selectedEmployee.department);
    
    renderEditor();
    renderPreview();
};

function createInitialState(dept) {
    if (dept === 'English') return { basicPay: 0, accumulated: 0, increase: 0, otHours: 0, otRate: 0, exchangeRate: 0, notes: "" };
    const cfg = departmentConfigs[dept] || { earnings: [], deductions: [] }; 
    const state = {};
    cfg.earnings.forEach(f => state[f] = 0); 
    cfg.deductions.forEach(f => state[f] = 0); 
    return state;
}

function renderEditor() {
    const container = document.getElementById('editor-content');
    const dept = selectedEmployee.department;
    
    if (dept === 'English') {
        const d = currentPayrollState;
        container.innerHTML = `<div class="bg-white p-4 rounded shadow border space-y-2"><h3 class="font-bold text-blue-800">English Dept (USD)</h3>
        <label class="block text-xs font-bold">Basic Pay ($)</label><input type="number" value="${d.basicPay||0}" oninput="window.updateField('basicPay', this.value)" class="w-full border p-1 rounded">
        <label class="block text-xs font-bold">Accumulated ($)</label><input type="number" value="${d.accumulated||0}" oninput="window.updateField('accumulated', this.value)" class="w-full border p-1 rounded">
        <label class="block text-xs font-bold">OT Hours</label><input type="number" value="${d.otHours||0}" oninput="window.updateField('otHours', this.value)" class="w-full border p-1 rounded">
        <label class="block text-xs font-bold">OT Rate ($)</label><input type="number" value="${d.otRate||0}" oninput="window.updateField('otRate', this.value)" class="w-full border p-1 rounded">
        <label class="block text-xs font-bold bg-yellow-100 p-1">Exchange Rate</label><input type="number" value="${d.exchangeRate||0}" oninput="window.updateField('exchangeRate', this.value)" class="w-full border p-1 rounded bg-yellow-50">
        </div>`;
        return;
    }

    const cfg = departmentConfigs[dept] || { earnings: [], deductions: [] };
    const earns = cfg.earnings.map(f => `<div><label class="block text-[10px] font-bold text-gray-500 truncate" title="${f}">${f}</label><input type="number" oninput="window.updateField('${f}', this.value)" class="w-full text-sm border rounded p-1" value="${currentPayrollState[f] || 0}"></div>`).join('');
    const deds = cfg.deductions.map(f => `<div><label class="block text-[10px] font-bold text-red-500 truncate">${f}</label><input type="number" oninput="window.updateField('${f}', this.value)" class="w-full text-sm border rounded p-1 text-red-600" value="${currentPayrollState[f] || 0}"></div>`).join('');
    
    container.innerHTML = `<div class="bg-white p-4 rounded shadow border mb-2"><h3 class="font-bold text-xs uppercase mb-2">Earnings</h3><div class="grid grid-cols-2 gap-2">${earns}</div></div><div class="bg-white p-4 rounded shadow border"><h3 class="font-bold text-xs uppercase text-red-700 mb-2">Deductions</h3><div class="grid grid-cols-2 gap-2">${deds}</div></div>`;
}

window.updateField = (f, v) => { currentPayrollState[f] = parseFloat(v) || 0; renderPreview(); };

function renderPreview() {
    if (!selectedEmployee) return;
    document.getElementById('prev-name').innerText = selectedEmployee.name;
    document.getElementById('prev-pos').innerText = selectedEmployee.position;
    document.getElementById('prev-dept').innerText = selectedEmployee.department;
    document.getElementById('prev-date').innerText = `${editorMonth} ${editorYear}`;
    document.getElementById('prev-id').innerText = `ID-${selectedEmployee.id.substr(-4)}`;
    const pe = document.getElementById('prev-profile-pic');
    if(selectedEmployee.profilePic) { pe.src = selectedEmployee.profilePic; pe.classList.remove('hidden'); } else pe.classList.add('hidden');

    const container = document.getElementById('preview-content');
    const dept = selectedEmployee.department;
    const cfg = departmentConfigs[dept] || { earnings: [], deductions: [] };
    let te = 0, td = 0, html = "";

    if(dept === 'English') {
        const d = currentPayrollState;
        const basic = (d.basicPay || 0) + (d.accumulated || 0);
        const ot = (d.otHours || 0) * (d.otRate || 0);
        const gross = basic + ot;
        const lak = (gross * (d.exchangeRate || 0));
        html += `<div class="flex justify-between py-1 border-b"><span>Basic Pay</span><span>$${d.basicPay}</span></div>`;
        html += `<div class="flex justify-between py-1 border-b"><span>Overtime</span><span>$${ot}</span></div>`;
        html += `<div class="flex justify-between py-2 font-bold text-sm bg-blue-50 mt-2 text-blue-900 px-2"><span>Gross USD</span><span>$${gross.toLocaleString()}</span></div>`;
        html += `<div class="flex justify-between py-2 font-bold text-lg bg-blue-900 text-white mt-2 px-2 rounded"><span>Est. LAK</span><span>₭ ${lak.toLocaleString()}</span></div>`;
    } else {
        cfg.earnings.forEach(f => {
            const v = currentPayrollState[f] || 0;
            if(v > 0) { te += v; html += `<div class="flex justify-between py-1 border-b text-xs"><span>${f}</span><span>₭ ${v.toLocaleString()}</span></div>`; }
        });
        cfg.deductions.forEach(f => {
            const v = currentPayrollState[f] || 0;
            if(v > 0) { td += v; html += `<div class="flex justify-between py-1 border-b text-xs text-red-600"><span>${f}</span><span>(₭ ${v.toLocaleString()})</span></div>`; }
        });
        if(currentPayrollState.loanDeduction > 0) {
            td += currentPayrollState.loanDeduction;
            html += `<div class="flex justify-between py-1 border-b text-xs text-red-600 font-bold"><span>Loan Repayment</span><span>(₭ ${currentPayrollState.loanDeduction.toLocaleString()})</span></div>`;
        }
        html += `<div class="flex justify-between py-2 font-bold text-lg bg-blue-900 text-white mt-4 px-2 rounded"><span>NET PAY</span><span>₭ ${(te-td).toLocaleString()}</span></div>`;
    }
    container.innerHTML = html;
}

window.saveEmployeePayrollData = async () => {
    const key = `${editorYear}-${editorMonth}`;
    if(!selectedEmployee.payrollHistory) selectedEmployee.payrollHistory = {};
    selectedEmployee.payrollHistory[key] = currentPayrollState;
    selectedEmployee.lastModified = new Date().toISOString();
    await window.transact(STORE_EMPLOYEES, 'readwrite', s => s.put(selectedEmployee));
    alert("Payroll Saved for " + key);
    updateDashboardStats();
};

// --- 8. OT & LOANS LOGIC ---

window.refreshOTLoansView = () => {
    const list = document.getElementById('otl-staff-list');
    list.innerHTML = employees.map(emp => `<div onclick="window.selectOTLStaff('${emp.id}')" class="p-2 border-b cursor-pointer hover:bg-blue-50 text-xs flex justify-between"><span class="font-bold">${emp.name}</span><span class="text-gray-500">${emp.department}</span></div>`).join('');
    window.renderOTLOverview();
};

window.renderOTLOverview = () => {
    const table = document.getElementById('otl-report-loans');
    let rows = "";
    employees.forEach(emp => {
        if(emp.activeLoans && emp.activeLoans.length > 0) {
            let total = 0, bal = 0;
            emp.activeLoans.forEach(l => { total += l.total; bal += (l.total - (l.paid||0)); });
            if(bal > 0) rows += `<tr class="border-b"><td class="p-2 font-bold text-gray-700">${emp.name}</td><td class="p-2 text-xs text-gray-500">${emp.activeLoans[0].description}</td><td class="p-2 text-right text-xs">₭ ${total.toLocaleString()}</td><td class="p-2 text-right font-bold text-red-600">₭ ${bal.toLocaleString()}</td></tr>`;
        }
    });
    table.innerHTML = rows || '<tr><td colspan="4" class="p-4 text-center text-gray-400">No active loans</td></tr>';
};

window.selectOTLStaff = (id) => {
    selectedOTLStaff = employees.find(e => e.id === id);
    document.getElementById('otl-overview').classList.add('hidden');
    document.getElementById('ot-management-card').classList.remove('hidden');
    document.getElementById('loan-management-card').classList.remove('hidden');
    document.getElementById('otl-selected-name').innerText = selectedOTLStaff.name;
    
    // Render Active Loans
    const list = document.getElementById('otl-loans-list');
    if(!selectedOTLStaff.activeLoans) selectedOTLStaff.activeLoans = [];
    list.innerHTML = selectedOTLStaff.activeLoans.map((l, idx) => {
        const bal = l.total - (l.paid || 0);
        return `<div class="flex justify-between border-b p-2 text-sm bg-gray-50 mb-1 rounded"><span>${l.description} (${l.dateAdded})</span><span class="font-bold ${bal <= 0 ? 'text-green-600' : 'text-red-600'}">Bal: ₭ ${bal.toLocaleString()}</span><button onclick="window.removeLoan(${idx})" class="text-red-500 px-2">x</button></div>`;
    }).join('');
};

window.saveLoanRecord = async () => {
    const desc = document.getElementById('new-loan-desc').value;
    const amt = parseFloat(document.getElementById('new-loan-amount').value);
    const date = document.getElementById('new-loan-date').value;
    if(!desc || !amt) return alert("Fill all fields");
    if(!selectedOTLStaff.activeLoans) selectedOTLStaff.activeLoans = [];
    selectedOTLStaff.activeLoans.push({ description: desc, total: amt, dateAdded: date, paid: 0 });
    await window.transact(STORE_EMPLOYEES, 'readwrite', s => s.put(selectedOTLStaff));
    window.selectOTLStaff(selectedOTLStaff.id); 
};

window.saveLoanPayment = async () => {
    const amt = parseFloat(document.getElementById('loan-repay-amount').value.replace(/,/g,''));
    if(!amt) return;
    const m = document.getElementById('otl-month').value;
    const y = document.getElementById('otl-year').value;
    const key = `${y}-${m}`;
    
    if(!selectedOTLStaff.payrollHistory) selectedOTLStaff.payrollHistory = {};
    if(!selectedOTLStaff.payrollHistory[key]) selectedOTLStaff.payrollHistory[key] = createInitialState(selectedOTLStaff.department);
    
    // Update Payslip
    selectedOTLStaff.payrollHistory[key].loanDeduction = amt;
    // Update Balance
    if(selectedOTLStaff.activeLoans.length > 0) {
        selectedOTLStaff.activeLoans[0].paid = (selectedOTLStaff.activeLoans[0].paid || 0) + amt;
    }
    
    await window.transact(STORE_EMPLOYEES, 'readwrite', s => s.put(selectedOTLStaff));
    alert("Deduction Applied!");
    window.selectOTLStaff(selectedOTLStaff.id);
};

window.closeOTLEditor = () => {
    document.getElementById('otl-overview').classList.remove('hidden');
    document.getElementById('ot-management-card').classList.add('hidden');
    document.getElementById('loan-management-card').classList.add('hidden');
    window.refreshOTLoansView();
};

// --- 9. BULK ACTIONS & IMPORT/EXPORT (CRITICAL FOR USER) ---

window.importData = (input) => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    // Show loading text
    const btn = input.previousElementSibling;
    const oldText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Uploading...`;
    
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            console.log("Restoring Backup:", data);

            // 1. Configs
            const configs = data.config || data.departmentConfigs || [];
            const configArray = Array.isArray(configs) ? configs : Object.values(configs);
            for (const cfg of configArray) {
                if(cfg.name) await window.transact(STORE_CONFIG, 'readwrite', s => s.put(cfg));
            }

            // 2. Employees
            if (data.employees) {
                for (const emp of data.employees) await window.transact(STORE_EMPLOYEES, 'readwrite', s => s.put(emp));
            }

            // 3. History
            if (data.history) {
                for (const h of data.history) await window.transact(STORE_HISTORY, 'readwrite', s => s.put(h));
            }
            
            alert("SUCCESS! Data Restored from Backup file.");
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert("Error parsing file. Please use a valid JSON backup.");
            btn.innerHTML = oldText;
        }
    };
    reader.readAsText(file);
    input.value = '';
};

window.exportData = async () => {
    const emp = await window.transact(STORE_EMPLOYEES, 'readonly', s => s.getAll());
    const hist = await window.transact(STORE_HISTORY, 'readonly', s => s.getAll());
    const cfg = await window.transact(STORE_CONFIG, 'readonly', s => s.getAll());
    
    const exportObj = { 
        employees: emp, 
        history: hist, 
        config: cfg, 
        meta: { exportedAt: new Date().toISOString(), version: "Neerada_2026_Cloud" } 
    }; 
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2)); 
    const downloadAnchorNode = document.createElement('a'); 
    downloadAnchorNode.setAttribute("href", dataStr); 
    downloadAnchorNode.setAttribute("download", "Neerada_Backup_" + new Date().toISOString().slice(0,10) + ".json"); 
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click(); 
    downloadAnchorNode.remove(); 
};

window.bulkCopyPrevious = async () => {
    const m = document.getElementById('bulk-month').value;
    const y = document.getElementById('bulk-year').value;
    const currKey = `${y}-${m}`;
    // Simple logic: Look for ANY previous entry and copy structure
    if(!confirm(`Overwrite ${m} ${y} with previous month data?`)) return;
    
    let count = 0;
    // Helper to find prev key
    const prevMIdx = MONTHS.indexOf(m) - 1;
    const prevKey = prevMIdx < 0 ? `${y-1}-December` : `${y}-${MONTHS[prevMIdx]}`;

    for(const emp of employees) {
        if(emp.payrollHistory && emp.payrollHistory[prevKey]) {
            if(!emp.payrollHistory[currKey]) emp.payrollHistory[currKey] = JSON.parse(JSON.stringify(emp.payrollHistory[prevKey]));
            await window.transact(STORE_EMPLOYEES, 'readwrite', s => s.put(emp));
            count++;
        }
    }
    alert(`Copied data for ${count} staff.`);
    initApp();
};

window.bulkSaveMonthData = async () => {
    const m = document.getElementById('bulk-month').value;
    const y = document.getElementById('bulk-year').value;
    const currKey = `${y}-${m}`;
    if(!confirm(`Generate default records for ${m} ${y}?`)) return;
    
    let count = 0;
    for(const emp of employees) {
        if(!emp.payrollHistory) emp.payrollHistory = {};
        if(!emp.payrollHistory[currKey]) {
            emp.payrollHistory[currKey] = createInitialState(emp.department);
            await window.transact(STORE_EMPLOYEES, 'readwrite', s => s.put(emp));
            count++;
        }
    }
    alert(`Generated records for ${count} staff.`);
    initApp();
};

window.downloadBankReport = () => {
    const yr = document.getElementById('filter-year').value;
    const mn = document.getElementById('filter-month').value;
    if(yr === 'All' || mn === 'All') return alert("Select specific month/year");
    
    let rows = [["Account Number", "Amount", "Name", "Reference"]];
    employees.forEach(emp => {
        if(emp.payrollHistory && emp.payrollHistory[`${yr}-${mn}`]) {
            const res = calculatePayroll(emp, emp.payrollHistory[`${yr}-${mn}`]);
            if(res.lak > 0) rows.push([`"${emp.bankLak || ''}"`, res.lak, `"${emp.bankAccountName || emp.name}"`, `${mn}`]);
        }
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Bank_Transfer_${mn}_${yr}.csv`);
    document.body.appendChild(link); link.click(); link.remove();
};

window.downloadCSVReport = () => {
    const rows = [["ID", "Name", "Dept", "Basic", "Total Earnings", "Total Deductions", "Net Pay"]];
    const yr = document.getElementById('filter-year').value;
    const mn = document.getElementById('filter-month').value;
    
    employees.forEach(emp => {
        const key = `${yr}-${mn}`;
        if(emp.payrollHistory && emp.payrollHistory[key]) {
            const res = calculatePayroll(emp, emp.payrollHistory[key]);
            const d = emp.payrollHistory[key];
            const basic = d.basic || d.basicPay || 0;
            rows.push([emp.id, `"${emp.name}"`, emp.department, basic, (res.lak + res.usd), 0, (res.lak + res.usd)]);
        }
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Payroll_Report_${mn}_${yr}.csv`);
    document.body.appendChild(link); link.click(); link.remove();
};

// --- 10. MODALS & HELPERS ---

window.openStaffModal = (id) => {
    document.getElementById('add-modal').classList.remove('hidden');
    const sel = document.getElementById('form-department');
    sel.innerHTML = DEFAULT_DEPTS.map(d => `<option value="${d}">${d}</option>`).join('');
};
window.closeModal = () => document.getElementById('add-modal').classList.add('hidden');

window.saveEmployee = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newEmp = {
        id: document.getElementById('form-id').value || 'EMP_' + Date.now(),
        name: fd.get('name'),
        department: fd.get('department'),
        position: fd.get('position'),
        campus: fd.get('campus'),
        bankLak: fd.get('bankLak'),
        bankUsd: fd.get('bankUsd'),
        bankAccountName: fd.get('bankAccountName'),
        email: fd.get('email'),
        whatsapp: fd.get('whatsapp'),
        profilePic: tempProfilePic,
        payrollHistory: {}
    };
    await window.transact(STORE_EMPLOYEES, 'readwrite', s => s.put(newEmp));
    window.closeModal();
    initApp();
};

window.handleProfileUpload = (input) => {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => { 
        tempProfilePic = e.target.result;
        const img = document.getElementById('form-preview-pic');
        img.src = tempProfilePic; img.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
};

window.handleLogoUpload = (input) => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        const dataUrl = e.target.result;
        await window.transact(STORE_CONFIG, 'readwrite', s => s.put({ name: "global_settings", logo: dataUrl }));
        alert("Logo saved!");
        updateAppLogo(dataUrl);
    };
    reader.readAsDataURL(file);
};

function updateAppLogo(url) {
    const ids = ['landing-custom-logo', 'header-custom-logo', 'prev-school-logo'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) { el.src = url; el.classList.remove('hidden'); }
    });
    const c = document.getElementById('landing-logo-container');
    if(c) c.classList.add('hidden');
}

window.openSettings = () => document.getElementById('settings-modal').classList.remove('hidden');
window.closeSettings = () => document.getElementById('settings-modal').classList.add('hidden');
window.switchView = (v) => {
    ['dashboard', 'payroll', 'config', 'ot-loans'].forEach(id => document.getElementById('view-'+id).classList.add('hidden'));
    document.getElementById('view-'+v).classList.remove('hidden');
    if(v === 'ot-loans') window.refreshOTLoansView();
};
window.executePrint = () => window.print();
window.closePrintSettings = () => document.getElementById('print-modal').classList.add('hidden');
window.openPrintSettings = () => { document.getElementById('print-modal').classList.remove('hidden'); document.getElementById('print-modal').classList.add('flex'); };
window.sendWhatsApp = () => {
    if(!selectedEmployee || !selectedEmployee.whatsapp) return alert("No WhatsApp number");
    const msg = `Payslip for ${selectedEmployee.name} (${editorMonth} ${editorYear})`;
    window.open(`https://wa.me/${selectedEmployee.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`);
};
window.deleteEmployee = async (id) => {
    if(!confirm("Delete this staff member?")) return;
    await window.transact(STORE_EMPLOYEES, 'readwrite', s => s.delete(id));
    initApp();
    document.getElementById('editor-area').classList.add('hidden');
};
window.deleteHistory = async (id) => {
    if(!confirm("Delete this log?")) return;
    await window.transact(STORE_HISTORY, 'readwrite', s => s.delete(id));
    updateDashboardStats();
};
window.bulkSavePayroll = async () => {
    const yr = document.getElementById('filter-year').value;
    const mn = document.getElementById('filter-month').value;
    if(yr==='All') return alert("Select Year/Month");
    let count = 0, totalLAK = 0, totalUSD = 0;
    employees.forEach(emp => {
        if(emp.payrollHistory && emp.payrollHistory[`${yr}-${mn}`]) {
            const res = calculatePayroll(emp, emp.payrollHistory[`${yr}-${mn}`]);
            totalLAK += res.lak; totalUSD += res.usd; count++;
        }
    });
    await window.transact(STORE_HISTORY, 'readwrite', s => s.put({
        dateId: `${yr}-${mn}`, month: mn, year: yr, employeeCount: count, totalLAK, totalUSD, timestamp: new Date().toISOString()
    }));
    updateDashboardStats();
    alert("History Log Saved!");
};
window.bulkResetPayroll = async () => {
    const targetStr = currentFilter.department === 'All' ? 'ALL Staff' : currentFilter.department;
    if(!confirm(`RESET payroll for ${targetStr}?`)) return;
    const key = `${editorYear}-${editorMonth}`;
    const targetEmployees = currentFilter.department === 'All' ? employees : employees.filter(e => e.department === currentFilter.department);
    let c = 0;
    for(const emp of targetEmployees) {
        if(emp.payrollHistory && emp.payrollHistory[key]) {
            delete emp.payrollHistory[key];
            await window.transact(STORE_EMPLOYEES, 'readwrite', s => s.put(emp));
            c++;
        }
    }
    alert(`Reset ${c} records.`);
    initApp();
};
window.deleteAllEmployeesInFilter = async () => {
    const targetStr = currentFilter.department === 'All' ? 'ALL Staff' : currentFilter.department;
    if(!confirm(`DELETE ${targetStr}?`)) return;
    const targetEmployees = currentFilter.department === 'All' ? employees : employees.filter(e => e.department === currentFilter.department);
    for(const emp of targetEmployees) await window.transact(STORE_EMPLOYEES, 'readwrite', s => s.delete(emp.id));
    initApp();
};
window.removeLoan = async (idx) => {
    if(!confirm("Remove loan?")) return;
    selectedOTLStaff.activeLoans.splice(idx, 1);
    await window.transact(STORE_EMPLOYEES, 'readwrite', s => s.put(selectedOTLStaff));
    window.selectOTLStaff(selectedOTLStaff.id);
};
window.downloadTemplate = (dept) => {
    const headers = ["Employee Name", ...(departmentConfigs[dept]?.earnings||[]), "Notes"];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Template_${dept}.csv`);
    document.body.appendChild(link); link.click(); link.remove();
};
window.handleBulkCSVPayslipUpload = (input) => alert("Bulk CSV Upload Feature Placeholder");
window.toggleBankFields = () => {
    const d = document.getElementById('form-department').value;
    const usd = document.getElementById('bank-usd-container');
    if(d === 'English') usd.classList.remove('hidden'); else usd.classList.add('hidden');
};
window.deleteAllPhotos = async () => {
    if(!confirm("Clear all photos?")) return;
    for(const emp of employees) { emp.profilePic = null; await window.transact(STORE_EMPLOYEES, 'readwrite', s => s.put(emp)); }
    initApp();
};

// Start
window.onload = () => { if(window.lucide) lucide.createIcons(); };
