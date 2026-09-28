(function () {
  'use strict';
  let startDate = null, pending = null;
  function today() {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }
  async function load() {
    if (pending) return pending;
    pending = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(`${GOOGLE_SHEET_CONFIG.baseUrl}&gid=${GOOGLE_SHEET_CONFIG.settingsGid}&range=A1:C3&_t=${Date.now()}`, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('조회 설정을 불러오지 못했습니다.');
        const rows = AdminPoints.parseCsv(await response.text());
        const setting = rows.find(row => row[0] === '학생 조회 시작일');
        const date = setting && AdminPoints.dateKey(setting[1], GOOGLE_SHEET_CONFIG.academicYear);
        if (!date || date > today()) throw new Error('구글 시트의 학생 조회 시작일을 확인해주세요.');
        startDate = date;
        return date;
      } catch (error) {
        startDate = null;
        throw error;
      } finally { clearTimeout(timeout); }
    })();
    try { return await pending; }
    finally { pending = null; }
  }
  window.PointSettings = { today, load, get startDate() { return startDate; },
    sheetUrl: `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_CONFIG.sheetId}/edit#gid=${GOOGLE_SHEET_CONFIG.settingsGid}&range=B2` };
})();
