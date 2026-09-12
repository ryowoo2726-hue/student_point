/**
 * 마석중학교 2학년 2반 상점 간편 조회 시스템 (Design 1 클린 매트 단일 테마)
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

  // --- Init ---
  function init() {
    loadInitialData();
    bindEvents();

    // 1) 페이지 로드 즉시 구글 시트 메인 탭(총 상점) 최신 데이터 자동 동기화
    syncMainSheetLive(false);

    // 2) 30초마다 백그라운드 자동 동기화
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
      showToast('학번을 입력해주세요.');
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
      showToast(`'${query}' 학생을 찾을 수 없습니다.`);
      return;
    }

    // 1단계: 캐시된 데이터로 즉시 화면 렌더링
    showResult(matched);

    // 2단계: 구글 시트 해당 학생 탭에서 실시간 최신 데이터 즉시 갱신
    await fetchStudentLiveSheet(matched, false);
  }

  function showResult(student) {
    currentStudent = student;
    studentNum.textContent = `${student.id} (${student.number}번)`;
    studentName.textContent = student.name;
    studentPoints.textContent = student.points;

    // 1인1역 pill
    if (student.role && student.role !== '없음' && student.role !== '역할 없음') {
      rolePill.textContent = `1인1역: ${student.role}`;
      rolePill.style.display = 'inline-block';
    } else {
      rolePill.style.display = 'none';
    }

    // Render monthly records
    renderMonthlyList(student.monthly || []);

    searchSection.style.display = 'none';
    resultSection.style.display = 'block';
  }

  function renderMonthlyList(monthlyData) {
    monthlyList.innerHTML = '';

    if (!monthlyData || monthlyData.length === 0) {
      monthlyList.innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding:12px;">월별 기록이 없습니다.</div>';
      return;
    }

    monthlyData.forEach(item => {
      const row = document.createElement('div');
      row.className = 'monthly-row';

      const hasDetail = item.detail && item.detail.trim() !== '';
      const isPositive = item.points > 0;

      row.innerHTML = `
        <div class="monthly-main">
          <div class="month-name-wrap">
            <span class="month-name">${escapeHtml(item.month)} 출석</span>
            ${hasDetail ? '<span class="month-toggle-icon">▼</span>' : ''}
          </div>
          <span class="month-pts ${isPositive ? '' : 'zero'}">
            ${isPositive ? '+' + item.points : '0'}점
          </span>
        </div>
        ${hasDetail ? `<div class="month-detail-panel">${escapeHtml(item.detail)}</div>` : ''}
      `;

      if (hasDetail) {
        row.querySelector('.monthly-main').addEventListener('click', () => {
          row.classList.toggle('open');
        });
        if (item.month === '9월' && isPositive) {
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

  // --- Live Google Sheet Sync ---

  // 메인 '총 상점' 탭 동기화
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
      syncStatus.textContent = `동기화됨 ${timeStr}`;

      if (currentStudent) {
        const fresh = students.find(s => s.id === currentStudent.id);
        if (fresh) {
          studentPoints.textContent = fresh.points;
        }
      }

      if (notify) {
        showToast(`구글 시트 최신 데이터 반영 완료 (${timeStr})`);
      }
    } catch (err) {
      console.warn('Main sheet live fetch error:', err);
    }
  }

  // 개별 학생 시트 탭 동기화
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
      let liveRole = student.role;

      rows.forEach(row => {
        if (row.length < 2) return;
        const first = row[0].trim();
        const second = (row[1] || '').trim();
        const third = (row[2] || '').trim();

        if (first.includes('총 상점') || second.includes('총 상점') || row.some(c => c.includes('총 상점'))) {
          row.forEach(c => {
            const m = c.match(/(\d+)점/);
            if (m) livePoints = parseInt(m[1], 10);
          });
        } else if (first.includes('월 출석')) {
          const monthName = first.split(' ')[0];
          const pts = parseInt(second.replace(/[^0-9]/g, '') || '0', 10);
          liveMonthly.push({
            month: monthName,
            points: pts,
            detail: third
          });
        } else if (first.includes('1인1역')) {
          if (third) liveRole = third;
        }
      });

      if (liveMonthly.length > 0) {
        student.points = livePoints;
        student.monthly = liveMonthly;
        student.role = liveRole;

        const idx = students.findIndex(s => s.id === student.id);
        if (idx !== -1) students[idx] = student;

        if (currentStudent && currentStudent.id === student.id) {
          studentPoints.textContent = student.points;
          renderMonthlyList(student.monthly);
          if (student.role && student.role !== '없음' && student.role !== '역할 없음') {
            rolePill.textContent = `1인1역: ${student.role}`;
            rolePill.style.display = 'inline-block';
          }
        }
      }

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      syncStatus.textContent = `동기화됨 ${timeStr}`;

      if (notify) {
        showToast(`${student.name} 학생의 최신 상점이 반영되었습니다.`);
      }
    } catch (e) {
      console.warn('Live fetch for student sheet failed:', e);
    }
  }

  // 표준 CSV 파서
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

  // 자동 동기화 설정
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

  // 새로고침 버튼
  async function refreshAll() {
    refreshBtn.classList.add('spinning');
    syncStatus.textContent = '동기화 중';

    await syncMainSheetLive(false);
    if (currentStudent) {
      await fetchStudentLiveSheet(currentStudent, false);
    }

    refreshBtn.classList.remove('spinning');
    showToast('구글 시트 최신 데이터로 새로고침되었습니다.');
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

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (resultSection.style.display !== 'none') {
          showSearch();
        }
      }
    });

    refreshBtn.addEventListener('click', refreshAll);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
