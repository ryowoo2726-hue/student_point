/**
 * \ub9c8\uc11d\uc911\ud559\uad50 2\ud559\ub144 2\ubc18 \uc0c1\uc810 \uac04\ud3b8 \uc870\ud68c \uc2dc\uc2a4\ud15c (Design 1 \ud074\ub9b0 \ub9e4\ud2b8 \ub2e8\uc77c \ud14c\ub9c8)
 */

(function () {
  'use strict';

  // --- State ---
  let students = [];
  let currentStudent = null;
  let autoSyncTimer = null;
  const ROLE_SHEET_GIDS = {
    '\ud578\ub4dc\ud3f0 \ub2f4\ub2f9': '1616173869', '\ucd9c\uc11d\ubd80 \ub2f4\ub2f9': '1791574817',
    '\ubd84\ub9ac\uc218\uac70': '408675367', '\ud14c\ube14\ub9bf \uad00\ub9ac': '2066046088', '\ud2b9\ubcc4\uc2e4 \uccad\uc18c': '1613811606'
  };

  // --- Elements ---
  const searchSection = document.getElementById('searchSection');
  const resultSection = document.getElementById('resultSection');

  const searchForm = document.getElementById('searchForm');
  const studentInput = document.getElementById('studentInput');

  const studentNum = document.getElementById('studentNum');
  const studentName = document.getElementById('studentName');
  const studentPoints = document.getElementById('studentPoints');
  const studentMetaPills = document.getElementById('studentMetaPills');
  const rolePill = document.getElementById('rolePill');
  const monthlyList = document.getElementById('monthlyList');

  const backBtn = document.getElementById('backBtn');
  const searchAgainBtn = document.getElementById('searchAgainBtn');

  const refreshBtn = document.getElementById('refreshBtn');
  const syncStatus = document.getElementById('syncStatus');
  const toast = document.getElementById('toast');
  const roleCriteriaBtn = document.getElementById('roleCriteriaBtn');
  const roleCriteriaModal = document.getElementById('roleCriteriaModal');
  const roleCriteriaCloseBtn = document.getElementById('roleCriteriaCloseBtn');

  // --- Init ---
  function init() {
    loadInitialData();
    bindEvents();

    // 1) \ud398\uc774\uc9c0 \ub85c\ub4dc \uc989\uc2dc \uad6c\uae00 \uc2dc\ud2b8 \uba54\uc778 \ud0ed(\ucd1d \uc0c1\uc810) \ucd5c\uc2e0 \ub370\uc774\ud130 \uc790\ub3d9 \ub3d9\uae30\ud654
    syncMainSheetLive(false);

    // 2) 30\ucd08\ub9c8\ub2e4 \ubc31\uadf8\ub77c\uc6b4\ub4dc \uc790\ub3d9 \ub3d9\uae30\ud654
    setupAutoSync();
  }

  // --- Data Loading ---
  function loadInitialData() {
    students = (typeof DEFAULT_STUDENTS !== 'undefined') ? [...DEFAULT_STUDENTS] : [];
  }

  // --- Search & Render ---
  async function handleSearch() {
    const query = studentInput.value.trim();
    if (!query) {
      showToast('\ud559\ubc88\uc744 \uc785\ub825\ud574\uc8fc\uc138\uc694.');
      studentInput.focus();
      return;
    }

    const digits = query.replace(/[^0-9]/g, '');
    let matched = null;

    if (digits.length === 5) {
      matched = students.find(s => s.id === digits);
    } else if (digits.length > 0 && digits.length <= 2) {
      const num = parseInt(digits, 10);
      matched = students.find(s => s.number === num);
    }

    if (!matched) {
      matched = students.find(s => s.name === query || s.name.includes(query));
    }

    if (!matched) {
      showToast(`'${query}' \ud559\uc0dd\uc744 \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.`);
      return;
    }

    // 1\ub2e8\uacc4: \uce90\uc2dc\ub41c \ub370\uc774\ud130\ub85c \uc989\uc2dc \ud654\uba74 \ub80c\ub354\ub9c1
    showResult(matched);

    // 2\ub2e8\uacc4: \uad6c\uae00 \uc2dc\ud2b8 \ud574\ub2f9 \ud559\uc0dd \ud0ed\uc5d0\uc11c \uc2e4\uc2dc\uac04 \ucd5c\uc2e0 \ub370\uc774\ud130 \uc989\uc2dc \uac31\uc2e0
    await fetchStudentLiveSheet(matched, false);
  }

  function showResult(student) {
    currentStudent = student;
    studentNum.textContent = `${student.id} (${student.number}\ubc88)`;
    studentName.textContent = student.name;
    studentPoints.textContent = student.points;

    renderRolePill(student);

    // \ucd9c\uc11d\uacfc 1\uc7781\uc5ed\uc744 \ud3ec\ud568\ud55c \ubc1b\uc740 \uc0c1\uc810 \uae30\ub85d\uc744 \ubaa8\ub450 \ud45c\uc2dc
    renderPointRecords(getPointRecords(student));

    searchSection.style.display = 'none';
    resultSection.style.display = 'block';
  }

  function renderRolePill(student) {
    if (student.role && student.role !== '\uc5c6\uc74c' && student.role !== '\uc5ed\ud560 \uc5c6\uc74c') {
      rolePill.textContent = `1\uc7781\uc5ed: ${student.role}`;
      rolePill.style.display = 'inline-block';
    } else {
      rolePill.style.display = 'none';
    }
  }

  function getPointRecords(student) {
    if (Array.isArray(student.records)) {
      return student.records.filter(item => Number(item.points) > 0);
    }

    const attendanceRecords = (student.monthly || [])
      .filter(item => Number(item.points) > 0)
      .map(item => ({
        label: `${item.month} \ucd9c\uc11d`,
        points: item.points,
        detail: item.detail || ''
      }));

    if (Number(student.rolePoints) > 0) {
      attendanceRecords.push({
        label: '1\uc7781\uc5ed',
        points: student.rolePoints,
        detail: buildRoleDetail(student)
      });
    }

    return attendanceRecords;
  }

  function buildRoleDetail(student) {
    const dates = student.roleDates || [];
    const roleName = student.role || '1\uc7781\uc5ed';
    const dateText = dates.length ? dates.join(', ') : '\uc218\ud589 \ub0a0\uc9dc \ud655\uc778 \uc911';
    return `${roleName}\n\uc218\ud589 ${dates.length}\ud68c\n\uc218\ud589 \ub0a0\uc9dc: ${dateText}\n\ubc18\uc601 \uc0c1\uc810: ${student.rolePoints || 0}\uc810`;
  }

  function renderPointRecords(records) {
    monthlyList.innerHTML = '';

    if (!records || records.length === 0) {
      monthlyList.innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding:12px;">\ubc1b\uc740 \uc0c1\uc810 \uae30\ub85d\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.</div>';
      return;
    }

    records.forEach(item => {
      const row = document.createElement('div');
      const isRoleRecord = /^1\uc778\s*1\uc5ed/.test(item.label);
      row.className = `monthly-row${isRoleRecord ? ' role-point-row' : ''}`;

      const hasDetail = item.detail && item.detail.trim() !== '';

      row.innerHTML = `
        <div class="monthly-main">
          <div class="month-name-wrap">
            <span class="month-name">${escapeHtml(item.label)}</span>
            ${isRoleRecord ? '<span class="role-record-tag">1\uc778 1\uc5ed</span>' : ''}
            ${hasDetail ? '<span class="month-toggle-icon">\u25bc</span>' : ''}
          </div>
          <span class="month-pts">
            +${item.points}\uc810
          </span>
        </div>
        ${hasDetail ? `<div class="month-detail-panel">${escapeHtml(item.detail)}</div>` : ''}
      `;

      if (hasDetail) {
        row.querySelector('.monthly-main').addEventListener('click', () => {
          row.classList.toggle('open');
        });
        if (item.label === '9\uc6d4 \ucd9c\uc11d') {
          row.classList.add('open');
        }
      }

      monthlyList.appendChild(row);
    });
  }

  function showSearch() {
    currentStudent = null;
    resultSection.style.display = 'none';
    searchSection.style.display = 'block';
    studentInput.value = '';
    studentInput.focus();
  }

  function openRoleCriteriaModal() {
    roleCriteriaModal.hidden = false;
    document.body.classList.add('modal-open');
    roleCriteriaCloseBtn.focus();
  }

  function closeRoleCriteriaModal() {
    roleCriteriaModal.hidden = true;
    document.body.classList.remove('modal-open');
    roleCriteriaBtn.focus();
  }

  // --- Live Google Sheet Sync ---

  // \uba54\uc778 '\ucd1d \uc0c1\uc810' \ud0ed \ub3d9\uae30\ud654
  async function syncMainSheetLive(notify = false) {
    if (typeof GOOGLE_SHEET_CONFIG === 'undefined') return;

    const cacheBuster = `&_t=${Date.now()}`;
    const mainUrl = `${GOOGLE_SHEET_CONFIG.baseUrl}&gid=${GOOGLE_SHEET_CONFIG.mainGid}${cacheBuster}`;

    try {
      const resp = await fetch(mainUrl, { cache: 'no-store' });
      if (!resp.ok) return;

      const csvText = await resp.text();
      const rows = parseStandardCsv(csvText);

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length >= 3) {
          const sId = row[0].trim();
          const ptsClean = row[2].replace(/[^0-9]/g, '');
          const points = ptsClean ? parseInt(ptsClean, 10) : 0;

          const student = students.find(s => s.id === sId);
          if (student) {
            student.points = points;
          }
        }
      }

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      syncStatus.textContent = `\ub3d9\uae30\ud654\ub428 ${timeStr}`;

      if (currentStudent) {
        const fresh = students.find(s => s.id === currentStudent.id);
        if (fresh) {
          studentPoints.textContent = fresh.points;
        }
      }

      if (notify) {
        showToast(`\uad6c\uae00 \uc2dc\ud2b8 \ucd5c\uc2e0 \ub370\uc774\ud130 \ubc18\uc601 \uc644\ub8cc (${timeStr})`);
      }
    } catch (err) {
      console.warn('Main sheet live fetch error:', err);
    }
  }

  // \uac1c\ubcc4 \ud559\uc0dd \uc2dc\ud2b8 \ud0ed \ub3d9\uae30\ud654
  async function fetchStudentLiveSheet(student, notify = false) {
    if (!student.gid || typeof GOOGLE_SHEET_CONFIG === 'undefined') return;

    const cacheBuster = `&_t=${Date.now()}`;
    const url = `${GOOGLE_SHEET_CONFIG.baseUrl}&gid=${student.gid}${cacheBuster}`;

    try {
      const resp = await fetch(url, { cache: 'no-store' });
      if (!resp.ok) return;

      const csvText = await resp.text();
      const rows = parseStandardCsv(csvText);

      let livePoints = student.points;
      const liveMonthly = [];
      const liveRecords = [];
      let liveRole = student.role;
      let liveRolePoints = student.rolePoints || 0;

      rows.forEach(row => {
        if (row.length < 2) return;
        const first = row[0].trim();
        const second = (row[1] || '').trim();
        const third = (row[2] || '').trim();

        if (first.includes('\ucd1d \uc0c1\uc810') || second.includes('\ucd1d \uc0c1\uc810') || row.some(c => c.includes('\ucd1d \uc0c1\uc810'))) {
          row.forEach(c => {
            const m = c.match(/(\d+)\uc810/);
            if (m) livePoints = parseInt(m[1], 10);
          });
        } else if (first.includes('\uc6d4 \ucd9c\uc11d')) {
          const pts = parseInt(second.replace(/[^0-9]/g, '') || '0', 10);
          const record = { label: first, points: pts, detail: third };
          liveMonthly.push({ month: first.split(' ')[0], points: pts, detail: third });
          if (pts > 0) liveRecords.push(record);
        } else if (first.includes('1\uc7781\uc5ed')) {
          const pts = parseInt(second.replace(/[^0-9]/g, '') || '0', 10);
          if (third) liveRole = third;
          liveRolePoints = pts;
          if (pts > 0) {
            liveRecords.push({ label: '1\uc7781\uc5ed', points: pts, detail: third });
          }
        }
      });

      student.points = livePoints;
      student.monthly = liveMonthly;
      student.records = liveRecords;
      student.role = liveRole;
      student.rolePoints = liveRolePoints;
      await fetchRoleDetail(student);
      if (liveRolePoints > 0) {
        const roleRecord = liveRecords.find(record => record.label === '1\uc7781\uc5ed');
        if (roleRecord) roleRecord.detail = buildRoleDetail(student);
      }

      const idx = students.findIndex(s => s.id === student.id);
      if (idx !== -1) students[idx] = student;

      if (currentStudent && currentStudent.id === student.id) {
        studentPoints.textContent = student.points;
        renderPointRecords(getPointRecords(student));
        renderRolePill(student);
      }

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      syncStatus.textContent = `\ub3d9\uae30\ud654\ub428 ${timeStr}`;

      if (notify) {
        showToast(`${student.name} \ud559\uc0dd\uc758 \ucd5c\uc2e0 \uc0c1\uc810\uc774 \ubc18\uc601\ub418\uc5c8\uc2b5\ub2c8\ub2e4.`);
      }
    } catch (e) {
      console.warn('Live fetch for student sheet failed:', e);
    }
  }

  async function fetchRoleDetail(student) {
    const roleName = Object.keys(ROLE_SHEET_GIDS).find(name => (student.role || '').startsWith(name));
    if (!roleName || typeof GOOGLE_SHEET_CONFIG === 'undefined') return;
    try {
      const url = `${GOOGLE_SHEET_CONFIG.baseUrl}&gid=${ROLE_SHEET_GIDS[roleName]}&_t=${Date.now()}`;
      const rows = parseStandardCsv(await (await fetch(url, { cache: 'no-store' })).text());
      const header = rows[0] || [];
      const col = header.findIndex(cell => cell.trim() === student.name);
      if (col < 1) return;
      student.roleDates = rows.slice(1)
        .filter(row => String(row[col] || '').trim().toUpperCase() === 'TRUE')
        .map(row => String(row[0] || '').trim())
        .filter(Boolean);
    } catch (err) {
      console.warn('Role detail fetch error:', err);
    }
  }

  // \ud45c\uc900 CSV \ud30c\uc11c
  function parseStandardCsv(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    const result = [];

    for (const line of lines) {
      const row = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      row.push(current.trim().replace(/^["']|["']$/g, ''));
      result.push(row);
    }
    return result;
  }

  // \uc790\ub3d9 \ub3d9\uae30\ud654 \uc124\uc815
  function setupAutoSync() {
    if (autoSyncTimer) clearInterval(autoSyncTimer);
    autoSyncTimer = setInterval(() => {
      syncMainSheetLive(false);
      if (currentStudent) {
        fetchStudentLiveSheet(currentStudent, false);
      }
    }, 30000);

    window.addEventListener('focus', () => {
      syncMainSheetLive(false);
      if (currentStudent) {
        fetchStudentLiveSheet(currentStudent, false);
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        syncMainSheetLive(false);
        if (currentStudent) {
          fetchStudentLiveSheet(currentStudent, false);
        }
      }
    });
  }

  // \uc0c8\ub85c\uace0\uce68 \ubc84\ud2bc
  async function refreshAll() {
    refreshBtn.classList.add('spinning');
    syncStatus.textContent = '\ub3d9\uae30\ud654 \uc911';

    await syncMainSheetLive(false);
    if (currentStudent) {
      await fetchStudentLiveSheet(currentStudent, false);
    }

    refreshBtn.classList.remove('spinning');
    showToast('\uad6c\uae00 \uc2dc\ud2b8 \ucd5c\uc2e0 \ub370\uc774\ud130\ub85c \uc0c8\ub85c\uace0\uce68\ub418\uc5c8\uc2b5\ub2c8\ub2e4.');
  }

  // Utilities
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  let toastTimer = null;
  function showToast(msg) {
    if (toastTimer) clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.classList.add('show');
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2200);
  }

  function bindEvents() {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSearch();
    });

    backBtn.addEventListener('click', showSearch);
    searchAgainBtn.addEventListener('click', showSearch);
    roleCriteriaBtn.addEventListener('click', openRoleCriteriaModal);
    roleCriteriaCloseBtn.addEventListener('click', closeRoleCriteriaModal);
    roleCriteriaModal.addEventListener('click', (e) => {
      if (e.target === roleCriteriaModal) closeRoleCriteriaModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!roleCriteriaModal.hidden) {
          closeRoleCriteriaModal();
          return;
        }
        if (resultSection.style.display !== 'none') {
          showSearch();
        }
      }
    });

    refreshBtn.addEventListener('click', refreshAll);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
