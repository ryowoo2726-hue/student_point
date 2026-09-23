/**
 * ë§ìì¤íêµ 2íë 2ë° ìì  ê°í¸ ì¡°í ìì¤í (Design 1 í´ë¦° ë§¤í¸ ë¨ì¼ íë§)
 */

(function () {
  'use strict';

  // --- State ---
  let students = [];
  let currentStudent = null;
  let autoSyncTimer = null;

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

    // 1) íì´ì§ ë¡ë ì¦ì êµ¬ê¸ ìí¸ ë©ì¸ í­(ì´ ìì ) ìµì  ë°ì´í° ìë ëê¸°í
    syncMainSheetLive(false);

    // 2) 30ì´ë§ë¤ ë°±ê·¸ë¼ì´ë ìë ëê¸°í
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
      showToast('íë²ì ìë ¥í´ì£¼ì¸ì.');
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
      showToast(`'${query}' íìì ì°¾ì ì ììµëë¤.`);
      return;
    }

    // 1ë¨ê³: ìºìë ë°ì´í°ë¡ ì¦ì íë©´ ë ëë§
    showResult(matched);

    // 2ë¨ê³: êµ¬ê¸ ìí¸ í´ë¹ íì í­ìì ì¤ìê° ìµì  ë°ì´í° ì¦ì ê°±ì 
    await fetchStudentLiveSheet(matched, false);
  }

  function showResult(student) {
    currentStudent = student;
    studentNum.textContent = `${student.id} (${student.number}ë²)`;
    studentName.textContent = student.name;
    studentPoints.textContent = student.points;

    renderRolePill(student);

    // ì¶ìê³¼ 1ì¸1ì­ì í¬í¨í ë°ì ìì  ê¸°ë¡ì ëª¨ë íì
    renderPointRecords(getPointRecords(student));

    searchSection.style.display = 'none';
    resultSection.style.display = 'block';
  }

  function renderRolePill(student) {
    if (student.role && student.role !== 'ìì' && student.role !== 'ì­í  ìì') {
      rolePill.textContent = `1ì¸1ì­: ${student.role}`;
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
        label: `${item.month} ì¶ì`,
        points: item.points,
        detail: item.detail || ''
      }));

    if (Number(student.rolePoints) > 0) {
      attendanceRecords.push({
        label: '1ì¸1ì­',
        points: student.rolePoints,
        detail: student.role || ''
      });
    }

    return attendanceRecords;
  }

  function renderPointRecords(records) {
    monthlyList.innerHTML = '';

    if (!records || records.length === 0) {
      monthlyList.innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding:12px;">ë°ì ìì  ê¸°ë¡ì´ ììµëë¤.</div>';
      return;
    }

    records.forEach(item => {
      const row = document.createElement('div');
      const isRoleRecord = /^1ì¸\s*1ì­/.test(item.label);
      row.className = `monthly-row${isRoleRecord ? ' role-point-row' : ''}`;

      const hasDetail = item.detail && item.detail.trim() !== '';

      row.innerHTML = `
        <div class="monthly-main">
          <div class="month-name-wrap">
            <span class="month-name">${escapeHtml(item.label)}</span>
            ${isRoleRecord ? '<span class="role-record-tag">1ì¸ 1ì­</span>' : ''}
            ${hasDetail ? '<span class="month-toggle-icon">â¼</span>' : ''}
          </div>
          <span class="month-pts">
            +${item.points}ì 
          </span>
        </div>
        ${hasDetail ? `<div class="month-detail-panel">${escapeHtml(item.detail)}</div>` : ''}
      `;

      if (hasDetail) {
        row.querySelector('.monthly-main').addEventListener('click', () => {
          row.classList.toggle('open');
        });
        if (item.label === '9ì ì¶ì') {
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

  // ë©ì¸ 'ì´ ìì ' í­ ëê¸°í
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
      syncStatus.textContent = `ëê¸°íë¨ ${timeStr}`;

      if (currentStudent) {
        const fresh = students.find(s => s.id === currentStudent.id);
        if (fresh) {
          studentPoints.textContent = fresh.points;
        }
      }

      if (notify) {
        showToast(`êµ¬ê¸ ìí¸ ìµì  ë°ì´í° ë°ì ìë£ (${timeStr})`);
      }
    } catch (err) {
      console.warn('Main sheet live fetch error:', err);
    }
  }

  // ê°ë³ íì ìí¸ í­ ëê¸°í
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

        if (first.includes('ì´ ìì ') || second.includes('ì´ ìì ') || row.some(c => c.includes('ì´ ìì '))) {
          row.forEach(c => {
            const m = c.match(/(\d+)ì /);
            if (m) livePoints = parseInt(m[1], 10);
          });
        } else if (first.includes('ì ì¶ì')) {
          const pts = parseInt(second.replace(/[^0-9]/g, '') || '0', 10);
          const record = { label: first, points: pts, detail: third };
          liveMonthly.push({ month: first.split(' ')[0], points: pts, detail: third });
          if (pts > 0) liveRecords.push(record);
        } else if (first.includes('1ì¸1ì­')) {
          const pts = parseInt(second.replace(/[^0-9]/g, '') || '0', 10);
          if (third) liveRole = third;
          liveRolePoints = pts;
          if (pts > 0) {
            liveRecords.push({ label: '1ì¸1ì­', points: pts, detail: third });
          }
        }
      });

      student.points = livePoints;
      student.monthly = liveMonthly;
      student.records = liveRecords;
      student.role = liveRole;
      student.rolePoints = liveRolePoints;

      const idx = students.findIndex(s => s.id === student.id);
      if (idx !== -1) students[idx] = student;

      if (currentStudent && currentStudent.id === student.id) {
        studentPoints.textContent = student.points;
        renderPointRecords(getPointRecords(student));
        renderRolePill(student);
      }

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      syncStatus.textContent = `ëê¸°íë¨ ${timeStr}`;

      if (notify) {
        showToast(`${student.name} íìì ìµì  ìì ì´ ë°ìëììµëë¤.`);
      }
    } catch (e) {
      console.warn('Live fetch for student sheet failed:', e);
    }
  }

  // íì¤ CSV íì
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

  // ìë ëê¸°í ì¤ì 
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

  // ìë¡ê³ ì¹¨ ë²í¼
  async function refreshAll() {
    refreshBtn.classList.add('spinning');
    syncStatus.textContent = 'ëê¸°í ì¤';

    await syncMainSheetLive(false);
    if (currentStudent) {
      await fetchStudentLiveSheet(currentStudent, false);
    }

    refreshBtn.classList.remove('spinning');
    showToast('êµ¬ê¸ ìí¸ ìµì  ë°ì´í°ë¡ ìë¡ê³ ì¹¨ëììµëë¤.');
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
