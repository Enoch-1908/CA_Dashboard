// ==========================================
// ⚙️ CONFIGURATION (PASTE YOUR LINKS HERE)
// ==========================================
const SHEET_URLS = {
    // Paste your Main Data CSV link here
    mainData: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR5SYrAm-Z1aEHdFGrB73roz0S9AlyXqJn2U7eq3ubwxJXo_05_iKt1w2BczhxaHYxbDb6YGt0st7Uv/pub?gid=0&single=true&output=csv', 
    
    // Paste your Schedule CSV link here
    schedule: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR5SYrAm-Z1aEHdFGrB73roz0S9AlyXqJn2U7eq3ubwxJXo_05_iKt1w2BczhxaHYxbDb6YGt0st7Uv/pub?gid=1843376304&single=true&output=csv'
};

// ==========================================
// 🚀 APP LOGIC
// ==========================================

// Global state
let studyData = [];
let scheduleData = [];
let currentTab = 'overview';
let sortColumn = null;
let sortDirection = 'asc';
let chartInstances = {};

// Badges Configuration (V1 System)
const BADGES_CONFIG = [
    { id: 'start', title: 'The Journey Begins', desc: 'Complete your first chapter', icon: '🚀', threshold: 1, type: 'count' },
    { id: '25_percent', title: 'Quarter Mile', desc: 'Complete 25% of total syllabus', icon: '🥉', threshold: 25, type: 'percent' },
    { id: '50_percent', title: 'Halfway There', desc: 'Complete 50% of total syllabus', icon: '🥈', threshold: 50, type: 'percent' },
    { id: '75_percent', title: 'Homestretch', desc: 'Complete 75% of total syllabus', icon: '🥇', threshold: 75, type: 'percent' },
    { id: '100_percent', title: 'Grandmaster', desc: 'Complete 100% of total syllabus', icon: '🏆', threshold: 100, type: 'percent' },
    { id: 'audit_ninja', title: 'Audit Ninja', desc: 'Complete all Audit chapters', icon: '🕵️‍♂️', subject: 'Audit', type: 'subject_complete' },
    { id: 'afm_wizard', title: 'AFM Wizard', desc: 'Complete all AFM chapters', icon: '💹', subject: 'AFM', type: 'subject_complete' },
    { id: 'fr_guru', title: 'FR Guru', desc: 'Complete all FR chapters', icon: '📊', subject: 'FR', type: 'subject_complete' }
];

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initializeTheme();
    
    // Auto-fetch data on load (V2 Functionality)
    fetchGoogleSheetsData();
});

function setupEventListeners() {
    // Replaced file upload listener with Sync button listener
    document.getElementById('refresh-data').addEventListener('click', fetchGoogleSheetsData);
    
    // Theme Toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // Details Filters
    document.getElementById('subject-filter')?.addEventListener('change', filterDetails);
    document.getElementById('status-filter')?.addEventListener('change', filterDetails); 
    document.getElementById('priority-filter')?.addEventListener('change', filterDetails);
    document.getElementById('search-input')?.addEventListener('input', filterDetails);

    // Schedule Filters
    document.getElementById('schedule-filter')?.addEventListener('change', filterSchedule);
    document.getElementById('schedule-status-filter')?.addEventListener('change', filterSchedule);
    
    document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => sortTable(th.dataset.sort));
    });
}

// ------------------------------------------
// 📡 DATA FETCHING (V2 Logic)
// ------------------------------------------
function fetchGoogleSheetsData() {
    const loadingScreen = document.getElementById('loading-screen');
    const dashboard = document.getElementById('dashboard');
    
    if(loadingScreen) loadingScreen.style.display = 'block';
    if(dashboard) dashboard.style.display = 'none';

    Promise.all([
        fetchData(SHEET_URLS.mainData),
        fetchData(SHEET_URLS.schedule)
    ]).then(([mainData, schedData]) => {
        studyData = mainData;
        scheduleData = schedData;
        
        if(studyData.length === 0) {
            alert("Connected to Google Sheets, but found no data. Check your CSV links.");
        }

        initializeDashboard();
        
        if(loadingScreen) loadingScreen.style.display = 'none';
        if(dashboard) dashboard.style.display = 'block';
    }).catch(err => {
        console.error(err);
        alert("Error syncing with Google Sheets. Check console for details.");
        if(loadingScreen) loadingScreen.style.display = 'none';
    });
}

function fetchData(url) {
    return new Promise((resolve, reject) => {
        Papa.parse(url, {
            download: true,
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true, // Auto-converts numbers
            complete: function(results) {
                resolve(results.data);
            },
            error: function(err) {
                reject(err);
            }
        });
    });
}

// ------------------------------------------
// 🎨 THEME & DASHBOARD LOGIC (V1 Logic)
// ------------------------------------------

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    if(studyData.length > 0) renderAnalytics(); 
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    btn.textContent = theme === 'light' ? '🌑 Dark' : '☀️ Light';
}

function initializeDashboard() {
    updateQuickStats();
    renderOverview();
    renderDetails();
    renderPriorities();
    renderSchedule();
    renderAnalytics();
    renderKPIs();
    renderBadges();
}

function getVal(item, keys) {
    if (!Array.isArray(keys)) keys = [keys];
    for (let key of keys) {
        if (item[key] !== undefined && item[key] !== null) return item[key];
        // Handle case sensitivity or spaces if needed
        const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        const foundKey = Object.keys(item).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanKey);
        if (foundKey) return item[foundKey];
    }
    return 0;
}

function updateQuickStats() {
    const totalHours = studyData.reduce((sum, item) => sum + (parseFloat(getVal(item, ['Total_Hours', 'Total Hours'])) || 0), 0);
    const completedHours = studyData.reduce((sum, item) => sum + (parseFloat(getVal(item, ['Completed_Hours', 'Completed Hours'])) || 0), 0);
    const completionRate = totalHours > 0 ? (completedHours / totalHours * 100).toFixed(1) : 0;
    
    // Find exam date from schedule or default
    const examItem = scheduleData.find(i => (i.Subject || '').toLowerCase() === 'exam');
    const examDateStr = examItem ? examItem.Date : '2026-05-23';
    
    const examDate = new Date(examDateStr);
    const today = new Date();
    const daysLeft = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
    
    const todayStr = today.toISOString().split('T')[0];
    const todayData = scheduleData.filter(item => {
        let itemDate = parseDate(item.Date);
        return itemDate && itemDate.toISOString().split('T')[0] === todayStr;
    });

    const todayHours = todayData.reduce((sum, item) => sum + (parseFloat(item.Hours_Planned) || 0), 0);
    
    document.getElementById('quick-completion').textContent = `${completionRate}%`;
    document.getElementById('quick-days').textContent = daysLeft;
    document.getElementById('quick-today').textContent = `${todayHours}h`;
}

function renderBadges() {
    const container = document.getElementById('badges-grid');
    if(!container) return;

    const totalChapters = studyData.length;
    const completedChapters = studyData.filter(i => (i.Status || '').toLowerCase() === 'completed').length;
    const totalHours = studyData.reduce((s, i) => s + (parseFloat(getVal(i, 'Total_Hours')) || 0), 0);
    const doneHours = studyData.reduce((s, i) => s + (parseFloat(getVal(i, 'Completed_Hours')) || 0), 0);
    const percentDone = totalHours > 0 ? (doneHours/totalHours*100) : 0;

    const html = BADGES_CONFIG.map(badge => {
        let isUnlocked = false;

        if (badge.type === 'count') {
            isUnlocked = completedChapters >= badge.threshold;
        } else if (badge.type === 'percent') {
            isUnlocked = percentDone >= badge.threshold;
        } else if (badge.type === 'subject_complete') {
            const subjectItems = studyData.filter(i => (i.Subject || '').includes(badge.subject));
            if(subjectItems.length > 0) {
                const subjectCompleted = subjectItems.filter(i => (i.Status || '').toLowerCase() === 'completed').length;
                isUnlocked = subjectCompleted === subjectItems.length;
            }
        }

        return `
            <div class="badge-card ${isUnlocked ? 'unlocked' : 'locked'}">
                <div class="badge-icon">${badge.icon}</div>
                <div class="badge-title">${badge.title}</div>
                <div class="badge-desc">${badge.desc}</div>
                <div class="badge-status">${isUnlocked ? 'Unlocked' : 'Locked'}</div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

function renderOverview() {
    const modulesGrid = document.getElementById('modules-grid');
    const moduleGroups = {};
    studyData.forEach(item => {
        const subject = item.Subject || 'Other';
        const modName = item.Module || 'General';
        const key = `${subject}_${modName}`;
        
        if (!moduleGroups[key]) {
            moduleGroups[key] = {
                subject: subject,
                module: modName,
                chapters: [],
                totalHours: 0,
                completedHours: 0
            };
        }
        moduleGroups[key].chapters.push(item);
        moduleGroups[key].totalHours += parseFloat(getVal(item, 'Total_Hours')) || 0;
        moduleGroups[key].completedHours += parseFloat(getVal(item, 'Completed_Hours')) || 0;
    });
    
    modulesGrid.innerHTML = Object.values(moduleGroups).map(module => {
        const completionPercent = module.totalHours > 0 ? (module.completedHours / module.totalHours * 100).toFixed(1) : 0;
        
        // Determine status
        let status = 'not-started';
        if(completionPercent >= 99) status = 'completed';
        else if(completionPercent > 0) status = 'in-progress';
        
        return `
            <div class="module-card">
                <div class="module-header">
                    <div>
                        <div class="module-title">${module.module}</div>
                        <div class="module-subject">${module.subject}</div>
                    </div>
                    <div class="module-chapters">${module.chapters.length} ch</div>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-label">
                        <span>Progress</span>
                        <span><strong>${completionPercent}%</strong></span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${completionPercent}%"></div>
                    </div>
                </div>
                <div class="hours-breakdown">
                    <div class="hours-item">
                        <div class="hours-label">Done</div>
                        <div class="hours-value">${module.completedHours.toFixed(1)}h</div>
                    </div>
                    <div class="hours-item">
                        <div class="hours-label">Total</div>
                        <div class="hours-value">${module.totalHours.toFixed(1)}h</div>
                    </div>
                </div>
                <div class="module-stats">
                    <div class="stat-row">
                        <span class="status-badge ${status}">${status.replace('-', ' ')}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderDetails() {
    const tbody = document.getElementById('details-tbody');
    const filteredData = getFilteredData();
    
    tbody.innerHTML = filteredData.map(item => {
        const total = parseFloat(getVal(item, 'Total_Hours')) || 0;
        const completed = parseFloat(getVal(item, 'Completed_Hours')) || 0;
        const percent = total > 0 ? ((completed/total)*100).toFixed(1) : 0;
        
        const status = item.Status || 'Not Started';
        const statusClass = status.toLowerCase().replace(/ /g, '-');
        const priorityClass = (item.Priority || 'LOW').toLowerCase();
        
        let weightage = parseFloat(getVal(item, ['Weightage%', 'Weightage'])) || 0;
        if(weightage <= 1 && weightage > 0) weightage = weightage * 100;
        
        return `
            <tr>
                <td>${item.Subject || ''}</td>
                <td>${item.Module || ''}</td>
                <td>${item.Chapter || ''}</td>
                <td>${weightage.toFixed(1)}%</td>
                <td><span class="status-badge ${statusClass}">${status}</span></td>
                <td>${completed.toFixed(1)}h</td>
                <td>${(total - completed).toFixed(1)}h</td>
                <td><span class="priority-badge ${priorityClass}">${item.Priority || 'LOW'}</span></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div class="progress-bar" style="flex: 1; height: 6px;">
                            <div class="progress-fill" style="width: ${percent}%"></div>
                        </div>
                        <span style="font-size: 0.8em;">${percent}%</span>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function getFilteredData() {
    let filtered = [...studyData];
    
    const subjectFilter = document.getElementById('subject-filter')?.value;
    if (subjectFilter && subjectFilter !== 'all') {
        filtered = filtered.filter(item => item.Subject === subjectFilter);
    }

    const statusFilter = document.getElementById('status-filter')?.value;
    if (statusFilter && statusFilter !== 'all') {
        filtered = filtered.filter(item => {
            const itemStatus = (item.Status || '').toLowerCase();
            return itemStatus === statusFilter.toLowerCase();
        });
    }

    const priorityFilter = document.getElementById('priority-filter')?.value;
    if (priorityFilter && priorityFilter !== 'all') {
        filtered = filtered.filter(item => (item.Priority || 'LOW').toUpperCase() === priorityFilter.toUpperCase());
    }
    
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(item => {
            return (item.Chapter || '').toLowerCase().includes(searchTerm) ||
                   (item.Module || '').toLowerCase().includes(searchTerm) ||
                   (item.Subject || '').toLowerCase().includes(searchTerm);
        });
    }
    
    if (sortColumn) {
        filtered.sort((a, b) => {
            let aVal = getVal(a, sortColumn);
            let bVal = getVal(b, sortColumn);
            
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();
            
            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }
    
    return filtered;
}

function filterDetails() {
    renderDetails();
}

function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    renderDetails();
}

function renderPriorities() {
    const container = document.getElementById('priorities-container');
    const priorityGroups = { CRITICAL: [], HIGH: [], MEDIUM: [], LOW: [] };
    
    studyData.forEach(item => {
        const priority = (item.Priority || 'LOW').toUpperCase();
        if (priorityGroups[priority]) {
            priorityGroups[priority].push(item);
        } else {
             priorityGroups['LOW'].push(item);
        }
    });
    
    const priorityColors = { CRITICAL: 'critical', HIGH: 'high', MEDIUM: 'medium', LOW: 'low' };
    
    container.innerHTML = Object.entries(priorityGroups).map(([priority, items]) => {
        if (items.length === 0) return '';
        
        return `
            <div class="priority-section">
                <div class="priority-header ${priorityColors[priority]}">
                    <h3 class="priority-title">${priority}</h3>
                    <span class="priority-count">${items.length} items</span>
                </div>
                <div class="priority-items">
                    ${items.map(item => {
                        const total = parseFloat(getVal(item, 'Total_Hours')) || 0;
                        const completed = parseFloat(getVal(item, 'Completed_Hours')) || 0;
                        const percent = total > 0 ? ((completed/total)*100).toFixed(1) : 0;
                        let weightage = parseFloat(getVal(item, ['Weightage%', 'Weightage'])) || 0;
                        if(weightage <= 1 && weightage > 0) weightage = weightage * 100;

                        return `
                            <div class="priority-item">
                                <div class="priority-item-header">
                                    <div class="priority-item-info">
                                        <h4>${item.Chapter}</h4>
                                        <div class="priority-item-meta">${item.Subject} • ${item.Module}</div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-size: 1.25rem; font-weight: 700; color: var(--accent-cyan);">${weightage.toFixed(1)}%</div>
                                        <div style="font-size: 0.8rem; opacity: 0.7;">Weight</div>
                                    </div>
                                </div>
                                <div class="progress-bar-container">
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${percent}%"></div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    // Handle Excel number format if PapaParse didn't convert it but standard parsing might fail
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
}

function renderSchedule() {
    const grid = document.getElementById('schedule-grid');
    const filtered = getFilteredSchedule();
    
    if(filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-secondary);">No schedule data found for this selection.</div>';
        return;
    }

    grid.innerHTML = filtered.map(day => {
        const dateObj = parseDate(day.Date);
        const dateStr = dateObj ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Invalid Date';
        const dayStr = dateObj ? dateObj.toLocaleDateString('en-US', { weekday: 'long' }) : '';
        const planned = parseFloat(day.Hours_Planned) || 0;
        const completed = parseFloat(day.Hours_Completed) || 0;
        const progress = planned > 0 ? Math.min((completed / planned * 100), 100).toFixed(1) : 0;
        
        return `
            <div class="schedule-card">
                <div class="schedule-date">${dateStr}</div>
                <div class="schedule-day">${dayStr}</div>
                <div class="schedule-subject">${day.Subject || 'TBD'}</div>
                <div class="schedule-chapter">${day.Chapter || '-'}</div>
                <div class="schedule-hours">
                    <div class="schedule-hours-item">
                        <div class="schedule-hours-label">Planned</div>
                        <div class="schedule-hours-value">${planned.toFixed(1)}h</div>
                    </div>
                    <div class="schedule-hours-item">
                        <div class="schedule-hours-label">Done</div>
                        <div class="schedule-hours-value">${completed.toFixed(1)}h</div>
                    </div>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
                ${day.Message ? `<div class="schedule-message">${day.Message}</div>` : ''}
            </div>
        `;
    }).join('');
}

function getFilteredSchedule() {
    let filtered = [...scheduleData].sort((a, b) => {
        const dA = parseDate(a.Date);
        const dB = parseDate(b.Date);
        return (dA || 0) - (dB || 0);
    });
    
    const subjectFilter = document.getElementById('schedule-filter')?.value;
    if (subjectFilter && subjectFilter !== 'all') {
        filtered = filtered.filter(item => item.Subject === subjectFilter);
    }

    const statusFilter = document.getElementById('schedule-status-filter')?.value;
    if (statusFilter && statusFilter !== 'all') {
        filtered = filtered.filter(item => {
            const planned = parseFloat(item.Hours_Planned) || 0;
            const completed = parseFloat(item.Hours_Completed) || 0;
            const isDone = completed >= planned && planned > 0;
            
            if (statusFilter === 'done') return isDone;
            if (statusFilter === 'planned') return !isDone;
            return true;
        });
    }

    return filtered;
}

function filterSchedule() {
    renderSchedule();
}

function destroyChart(canvasId) {
    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
        delete chartInstances[canvasId];
    }
}

function createChart(canvasId, config) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if(ctx) {
        chartInstances[canvasId] = new Chart(ctx, config);
    }
}

function renderAnalytics() {
    const isLight = document.body.getAttribute('data-theme') === 'light';
    const textColor = isLight ? '#1f2937' : '#9ca3af';
    const gridColor = isLight ? '#e5e7eb' : '#374151';

    Chart.defaults.color = textColor;
    Chart.defaults.borderColor = gridColor;

    renderCompletionChart();
    renderSubjectHoursChart();
    renderSubjectComparisonChart();
    renderPriorityChart();
}

function renderCompletionChart() {
    const totalHours = studyData.reduce((sum, item) => sum + (parseFloat(getVal(item, 'Total_Hours')) || 0), 0);
    const completedHours = studyData.reduce((sum, item) => sum + (parseFloat(getVal(item, 'Completed_Hours')) || 0), 0);
    const pendingHours = Math.max(0, totalHours - completedHours);
    
    createChart('completion-chart', {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Pending'],
            datasets: [{
                data: [completedHours, pendingHours],
                backgroundColor: ['#10b981', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function renderSubjectHoursChart() {
    const subjectHours = {};
    studyData.forEach(item => {
        const subject = item.Subject || 'Unknown';
        subjectHours[subject] = (subjectHours[subject] || 0) + (parseFloat(getVal(item, 'Total_Hours')) || 0);
    });
    
    createChart('subject-hours-chart', {
        type: 'bar',
        data: {
            labels: Object.keys(subjectHours),
            datasets: [{
                label: 'Total Hours',
                data: Object.values(subjectHours),
                backgroundColor: ['#3b82f6', '#06b6d4', '#8b5cf6'],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderSubjectComparisonChart() {
    const subjects = {};
    studyData.forEach(item => {
        const subject = item.Subject || 'Unknown';
        if (!subjects[subject]) subjects[subject] = { completed: 0, pending: 0 };
        const total = parseFloat(getVal(item, 'Total_Hours')) || 0;
        const comp = parseFloat(getVal(item, 'Completed_Hours')) || 0;
        subjects[subject].completed += comp;
        subjects[subject].pending += Math.max(0, total - comp);
    });
    
    createChart('subject-comparison-chart', {
        type: 'bar',
        data: {
            labels: Object.keys(subjects),
            datasets: [
                { label: 'Done', data: Object.values(subjects).map(s => s.completed), backgroundColor: '#10b981' },
                { label: 'Left', data: Object.values(subjects).map(s => s.pending), backgroundColor: '#ef4444' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { stacked: true },
                x: { stacked: true, grid: { display: false } }
            },
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function renderPriorityChart() {
    const priorityHours = {};
    studyData.forEach(item => {
        const priority = item.Priority || 'LOW';
        priorityHours[priority] = (priorityHours[priority] || 0) + 1;
    });
    
    createChart('priority-chart', {
        type: 'pie',
        data: {
            labels: Object.keys(priorityHours),
            datasets: [{
                data: Object.values(priorityHours),
                backgroundColor: ['#ef4444', '#f97316', '#3b82f6', '#6b7280'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function renderKPIs() {
    const grid = document.getElementById('kpis-grid');
    const totalHours = studyData.reduce((sum, item) => sum + (parseFloat(getVal(item, 'Total_Hours')) || 0), 0);
    const completedHours = studyData.reduce((sum, item) => sum + (parseFloat(getVal(item, 'Completed_Hours')) || 0), 0);
    const pendingHours = totalHours - completedHours;
    const completionRate = totalHours > 0 ? (completedHours / totalHours * 100).toFixed(1) : 0;
    
    const completedChapters = studyData.filter(item => (item.Status || '').toLowerCase().includes('complet')).length;
    const pendingChapters = studyData.length - completedChapters;
    
    grid.innerHTML = `
        <div class="kpi-card">
            <div class="kpi-label">Total Study Hours</div>
            <div class="kpi-value">${totalHours.toFixed(1)}</div>
            <div class="kpi-subtitle">Planned</div>
        </div>
        <div class="kpi-card success">
            <div class="kpi-label">Completed Hours</div>
            <div class="kpi-value">${completedHours.toFixed(1)}</div>
            <div class="kpi-subtitle">${completionRate}% Done</div>
        </div>
        <div class="kpi-card ${pendingHours > 0 ? 'critical' : 'success'}">
            <div class="kpi-label">Pending Hours</div>
            <div class="kpi-value">${pendingHours.toFixed(1)}</div>
            <div class="kpi-subtitle">Remaining</div>
        </div>
        
        <div class="kpi-card success">
            <div class="kpi-label">Completed Chapters</div>
            <div class="kpi-value">${completedChapters}</div>
            <div class="kpi-subtitle">Finished</div>
        </div>
        <div class="kpi-card critical">
            <div class="kpi-label">Pending Chapters</div>
            <div class="kpi-value">${pendingChapters}</div>
            <div class="kpi-subtitle">To Do</div>
        </div>
    `;
    
    renderSubjectBreakdown();
    renderProgressTrend();
}

function renderSubjectBreakdown() {
    const container = document.getElementById('subject-breakdown');
    const subjects = {};
    studyData.forEach(item => {
        const subject = item.Subject || 'Unknown';
        if (!subjects[subject]) subjects[subject] = { total: 0, completed: 0 };
        subjects[subject].total += parseFloat(getVal(item, 'Total_Hours')) || 0;
        subjects[subject].completed += parseFloat(getVal(item, 'Completed_Hours')) || 0;
    });
    
    container.innerHTML = Object.entries(subjects).map(([subject, data]) => {
        const percent = data.total > 0 ? (data.completed / data.total * 100).toFixed(1) : 0;
        return `
            <div class="subject-item" style="margin-bottom: 1rem;">
                <div class="subject-name" style="font-weight: 600; margin-bottom: 0.25rem;">${subject}</div>
                <div class="subject-progress" style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                    <span>${data.completed.toFixed(1)}h / ${data.total.toFixed(1)}h</span>
                    <span>${percent}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percent}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function renderProgressTrend() {
    const ctx = document.getElementById('progress-trend-chart');
    if (!ctx) return;
    const sortedSchedule = [...scheduleData].sort((a,b) => parseDate(a.Date) - parseDate(b.Date));
    let cumulative = 0;
    const labels = [];
    const data = [];
    
    // Filter for future dates (next 14 days)
    const today = new Date();
    const futureSchedule = sortedSchedule.filter(s => {
        const d = parseDate(s.Date);
        return d >= today;
    }).slice(0, 14);
    
    futureSchedule.forEach(item => {
        const d = parseDate(item.Date);
        if(!d) return;
        labels.push(`${d.getDate()}/${d.getMonth()+1}`);
        cumulative += parseFloat(item.Hours_Planned) || 0;
        data.push(cumulative);
    });

    createChart('progress-trend-chart', {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cumulative Planned Hours (Next 14 Days)',
                data: data,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true },
                x: { grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function switchTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    const activeContent = document.getElementById(`${tabName}-content`);
    if (activeContent) {
        activeContent.style.display = 'block';
    }
}