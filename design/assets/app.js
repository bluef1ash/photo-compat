/* ============================================================
   照片适配助手 · 交互原型逻辑
   状态机 / view 路由 / 流程模拟 / 设置 / 模态 / 键盘 / 缩放
   依赖：assets/styles.css  ·  结构：index.html
   ============================================================ */

/* ---------- 工具 ---------- */
const $  = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const pad = n => String(n).padStart(2, '0');
const now = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
const fmtTime = sec => { sec = Math.max(0, Math.floor(sec)); return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`; };

/* ---------- 模拟数据（贴合规范示例） ---------- */
const FOLDER = 'E:\\照片\\2026民政采集';
const OUT    = FOLDER + '\\compat';
const FORMATS = [
  { name: 'JPEG', ext: 'jpg',   count: 201, convert: false },
  { name: 'PNG',  ext: 'png',   count: 15,  convert: true  },
  { name: 'HEIC', ext: 'heic', count: 8,   convert: true  },
  { name: 'WebP', ext: 'webp', count: 3,   convert: true  },
  { name: 'GIF',  ext: 'gif',   count: 2,   convert: false },
  { name: 'TIFF', ext: 'tiff', count: 1,   convert: true  },
];
const TOTAL = FORMATS.reduce((s, f) => s + f.count, 0);           // 可处理 230
const UNSUPPORTED = [
  { name: 'PSD 设计源文件', count: 2, files: ['截图_终稿.psd', 'banner.psd'] },
  { name: 'RAW 相机原始文件', count: 1, files: ['_DSC0001.ARW'] },
];
const FOUND = TOTAL + UNSUPPORTED.reduce((s, u) => s + u.count, 0); // 扫描发现 233
const RESULT = { ok: 227, fail: 0, skip: 3 };                       // 成功227 跳过3(损坏)

/* 处理日志的文件名池（循环出现） */
const FILE_POOL = [
  { name: 'IMG_2026_0142.HEIC', op: '转换 HEIC → JPEG' },
  { name: '身份证_正面.jpg',     op: '去除 EXIF · 转 Baseline' },
  { name: '户口本_首页.png',     op: 'PNG → JPEG · 转换' },
  { name: 'IMG_2026_0143.HEIC', op: '转换 HEIC → JPEG' },
  { name: '资格证明.webp',        op: 'WebP → JPEG · 转换' },
  { name: '现场照片_001.jpg',    op: '去除 EXIF · 修正方向' },
  { name: '户口本_本人页.png',   op: 'PNG → JPEG · 转换' },
  { name: 'IMG_2026_0144.HEIC', op: '转换 HEIC → JPEG' },
  { name: '申请表_扫描.jpg',     op: '去除 EXIF · 转 Baseline' },
  { name: '老档案_001.tiff',     op: 'TIFF → JPEG · 转换' },
  { name: '现场照片_002.jpg',    op: '去除 EXIF · 修正方向' },
  { name: '证件_背面.jpg',       op: '去除 EXIF' },
];

/* ---------- 全局状态 ---------- */
const state = {
  view: 'home',
  prevView: 'home',
  arch: 'x86',                       // x86 | loongarch | arm（演示架构自适应）
  scan:  { found: 0, timer: null },
  proc:  { running: false, paused: false, processed: 0, timer: null, startTs: 0, pauseAt: 0 },
};

/* ---------- 图标（模态用） ---------- */
const ICON = {
  err:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6" stroke-linecap="round"/></svg>',
  warn:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17v.5" stroke-linecap="round"/></svg>',
  info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 11v5M12 8v.5" stroke-linecap="round"/></svg>',
  success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

/* ============================================================
   一、View 路由
   ============================================================ */
const STEP_OF = { home: 1, scanning: 1, result: 2, processing: 3, completed: 4 };

function setView(name) {
  state.prevView = (name === 'settings') ? state.view : state.prevView;
  state.view = name;
  $$('.view').forEach(v => v.classList.toggle('active', v.dataset.view === name));
  $$('.action-bar').forEach(a => a.classList.toggle('active', a.dataset.view === name));
  // 步骤条：settings 时隐藏，否则按 view 高亮
  const stepper = $('#stepper');
  if (name === 'settings') {
    stepper.classList.add('hide');
  } else {
    stepper.classList.remove('hide');
    setStep(STEP_OF[name] || 1);
  }
  $('#main').scrollTop = 0;
}

function setStep(current) {
  $$('#stepper .step').forEach(el => {
    const n = +el.dataset.step;
    el.classList.toggle('done', n < current);
    el.classList.toggle('current', n === current);
  });
}

/* ---------- 状态栏 ---------- */
function updateStatus(s) {
  const map = {
    ready:      { dot: '',         text: '就绪' },
    scanning:   { dot: 'running',  text: '扫描中' },
    processing: { dot: 'running',  text: '处理中' },
    paused:     { dot: 'paused',   text: '已暂停' },
    done:       { dot: '',         text: '处理完成' },
  }[s] || { dot: '', text: '就绪' };
  $('#sbDot').className = 'sb-dot ' + map.dot;
  $('#sbStatus').textContent = map.text;
}

/* ============================================================
   二、扫描流程
   ============================================================ */
function startScan() {
  if (state.proc.running) return;
  setView('scanning');
  updateStatus('scanning');
  state.scan.found = 0;
  $('#scanFound').textContent = '0';
  $('#scanFolder').textContent = FOLDER;
  clearInterval(state.scan.timer);
  const step = Math.ceil(FOUND / 28);
  state.scan.timer = setInterval(() => {
    state.scan.found = Math.min(FOUND, state.scan.found + step);
    $('#scanFound').textContent = state.scan.found;
    if (state.scan.found >= FOUND) {
      clearInterval(state.scan.timer);
      setTimeout(showResult, 380);
    }
  }, 60);
}

function showResult() {
  setView('result');
  updateStatus('ready');
  $('#resTotal').textContent = TOTAL;
  $('#resOut').textContent = TOTAL;
  $('#resSize').innerHTML = '约 48 <span class="stat-unit">MB</span>';
  $('#resSave').innerHTML = '减少 12 <span class="stat-unit">MB</span>';
  $('#resPath').textContent = FOLDER;
  FORMATS.forEach(f => {
    const bar = $(`#fmt-${f.ext} .fmt-bar i`);
    const cnt = $(`#fmt-${f.ext} .fmt-count`);
    if (bar) bar.style.width = (f.count / TOTAL * 100) + '%';
    if (cnt) cnt.textContent = f.count;
  });
  renderFileList();
}

/* 图片文件列表数据（扫描结果页展示前 12 张，循环 4 张真实占位照） */
const FILES = [
  { name:'IMG_2026_0142.HEIC', fmt:'HEIC', size:'2.4 MB', dim:'4032×3024', status:'转 JPEG',   thumb:'assets/thumb-id.jpg' },
  { name:'身份证_正面.jpg',    fmt:'JPEG', size:'856 KB', dim:'1024×768',  status:'去除 EXIF', thumb:'assets/thumb-cert.jpg' },
  { name:'户口本_首页.png',    fmt:'PNG',  size:'1.8 MB', dim:'2480×3508', status:'转 JPEG',   thumb:'assets/thumb-doc.jpg' },
  { name:'现场照片_001.jpg',   fmt:'JPEG', size:'3.1 MB', dim:'4032×3024', status:'去除 EXIF', thumb:'assets/thumb-scene.jpg' },
  { name:'IMG_2026_0143.HEIC', fmt:'HEIC', size:'2.6 MB', dim:'4032×3024', status:'转 JPEG',   thumb:'assets/thumb-id.jpg' },
  { name:'资格证明.webp',       fmt:'WebP', size:'620 KB', dim:'1600×1200', status:'转 JPEG',   thumb:'assets/thumb-cert.jpg' },
  { name:'户口本_本人页.png',  fmt:'PNG',  size:'1.9 MB', dim:'2480×3508', status:'转 JPEG',   thumb:'assets/thumb-doc.jpg' },
  { name:'申请表_扫描.jpg',    fmt:'JPEG', size:'1.2 MB', dim:'2000×2800', status:'去除 EXIF', thumb:'assets/thumb-doc.jpg' },
  { name:'IMG_2026_0144.HEIC', fmt:'HEIC', size:'2.5 MB', dim:'4032×3024', status:'转 JPEG',   thumb:'assets/thumb-id.jpg' },
  { name:'老档案_001.tiff',    fmt:'TIFF', size:'5.4 MB', dim:'3200×2400', status:'转 JPEG',   thumb:'assets/thumb-doc.jpg' },
  { name:'现场照片_002.jpg',   fmt:'JPEG', size:'2.8 MB', dim:'4032×3024', status:'去除 EXIF', thumb:'assets/thumb-scene.jpg' },
  { name:'证件_背面.jpg',      fmt:'JPEG', size:'780 KB', dim:'1024×768',  status:'去除 EXIF', thumb:'assets/thumb-cert.jpg' },
];

/* 渲染图片文件列表，点击或回车打开预览 */
function renderFileList() {
  const body = $('#fileListBody');
  if (!body) return;
  body.innerHTML = FILES.map((f, i) => `
    <div class="file-item" data-idx="${i}" tabindex="0" role="button" aria-label="预览 ${f.name}">
      <img class="file-thumb" src="${f.thumb}" alt="${f.name}" loading="lazy">
      <div class="file-info">
        <div class="file-name">${f.name}</div>
        <div class="file-meta">${f.dim} · ${f.size}</div>
      </div>
      <span class="badge ${/HEIC|PNG|WebP|TIFF/.test(f.fmt) ? 'convert' : 'ok'}">${f.fmt}</span>
      <span class="badge accent">${f.status}</span>
    </div>`).join('');
  body.querySelectorAll('.file-item').forEach(it => {
    const idx = +it.dataset.idx;
    it.addEventListener('click', () => openPreview(idx));
    it.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPreview(idx); } });
  });
}

/* 图片预览（复用 #modalBox / #modalOverlay），支持左右键切换 */
let previewIdx = 0;
function openPreview(i) {
  previewIdx = i;
  const f = FILES[i];
  const willConvert = /HEIC|PNG|WebP|TIFF/.test(f.fmt);
  $('#modalBox').innerHTML = `
    <div class="modal preview-modal">
      <div class="modal-head"><div class="modal-icon info">${ICON.info}</div><div class="modal-title">${f.name}</div></div>
      <div class="modal-body">
        <div class="preview-stage">
          <div class="preview-nav prev" id="pvPrev" title="上一张">‹</div>
          <img src="${f.thumb}" alt="${f.name}">
          <div class="preview-nav next" id="pvNext" title="下一张">›</div>
        </div>
        <div class="preview-info">
          <div class="pi"><div class="k">原始格式</div><div class="v">${f.fmt}${willConvert ? ' → JPEG' : ''}</div></div>
          <div class="pi"><div class="k">尺寸</div><div class="v">${f.dim}</div></div>
          <div class="pi"><div class="k">大小</div><div class="v">${f.size}</div></div>
          <div class="pi"><div class="k">将执行</div><div class="v">${f.status} · 质量 90</div></div>
          <div class="pi"><div class="k">序号</div><div class="v">${i + 1} / ${FILES.length}</div></div>
        </div>
      </div>
      <div class="modal-actions"><button class="btn btn-primary" id="pvClose">关闭</button></div>
    </div>`;
  $('#modalOverlay').classList.add('show');
  $('#pvPrev').addEventListener('click', () => navPreview(-1));
  $('#pvNext').addEventListener('click', () => navPreview(1));
  $('#pvClose').addEventListener('click', closeModal);
}
function navPreview(d) { openPreview((previewIdx + d + FILES.length) % FILES.length); }

/* 处理中页静态快照（供预览/导出定位，不启动定时器） */
function showProcessingStatic() {
  setView('processing');
  updateStatus('processing');
  $('#procPct').textContent = '68';
  $('#procFill').style.width = '68%';
  $('#procCount').innerHTML = '已处理 <b>156</b> / 230';
  $('#cfName').textContent = '户口本_本人页.png';
  $('#cfOp').textContent = 'PNG → JPEG · 转换';
  $('#stElapsed').textContent = '00:42';
  $('#stRemain').textContent = '01:20';
  $('#stSpeed').textContent = '3.7 张/秒';
  $('#stDone').textContent = '154';
  $('#stFail').textContent = '0';
  $('#stSkip').textContent = '2';
  $('#stSkip').parentElement.classList.add('skip');
  $('#logList').innerHTML = '';
  $('#logPanel').classList.add('open');
  log('info', '开始处理 230 张图片 · 标准兼容模式');
  log('ok', '转换 HEIC → JPEG：IMG_2026_0142.HEIC');
  log('ok', '去除 EXIF · 转 Baseline：身份证_正面.jpg');
  log('warn', '跳过损坏文件：现场照片_001.jpg');
  log('ok', 'PNG → JPEG · 转换：户口本_首页.png');
  log('ok', '转换 HEIC → JPEG：IMG_2026_0143.HEIC');
}

/* ============================================================
   三、处理流程
   ============================================================ */
function startProcess() {
  setView('processing');
  updateStatus('processing');
  const p = state.proc;
  p.running = true; p.paused = false; p.processed = 0;
  p.startTs = Date.now(); p.pauseAt = 0;
  $('#logList').innerHTML = '';
  $('#logPanel').classList.remove('open');
  $('#btnPause').textContent = '暂停';
  $('#procFill').parentElement.classList.remove('paused');
  $('#stFail').parentElement.classList.remove('err');
  $('#stSkip').parentElement.classList.remove('skip');
  log('info', `开始处理 ${TOTAL} 张图片 · 标准兼容模式`);
  clearInterval(p.timer);
  p.timer = setInterval(procTick, 48);
}

const SKIP_AT = [50, 120, 180]; // 模拟损坏跳过的进度点
function procTick() {
  const p = state.proc;
  if (p.paused || !p.running) return;
  p.processed++;
  const pct = Math.round(p.processed / TOTAL * 100);
  $('#procPct').textContent = pct;
  $('#procFill').style.width = pct + '%';
  $('#procCount').innerHTML = `已处理 <b>${p.processed}</b> / ${TOTAL}`;
  // 当前文件
  const f = FILE_POOL[p.processed % FILE_POOL.length];
  $('#cfName').textContent = f.name;
  $('#cfOp').textContent = f.op;
  // 统计
  const elapsed = (Date.now() - p.startTs) / 1000;
  $('#stElapsed').textContent = fmtTime(elapsed);
  const speed = elapsed > 0 ? (p.processed / elapsed) : 0;
  $('#stSpeed').textContent = speed.toFixed(1) + ' 张/秒';
  const remain = speed > 0 ? (TOTAL - p.processed) / speed : 0;
  $('#stRemain').textContent = fmtTime(remain);
  const skipped = SKIP_AT.filter(n => p.processed >= n).length;
  $('#stDone').textContent = p.processed - skipped;
  $('#stSkip').textContent = skipped;
  if (skipped > 0) $('#stSkip').parentElement.classList.add('skip');
  // 日志（节流，每 4 张一条）
  if (p.processed % 4 === 0 || p.processed <= 2) log('ok', `${f.op}：${f.name}`);
  if (SKIP_AT.includes(p.processed)) log('warn', `跳过损坏文件：${f.name}`);
  if (p.processed >= TOTAL) {
    clearInterval(p.timer);
    p.running = false;
    log('info', `处理结束 · 成功 ${RESULT.ok} · 跳过 ${RESULT.skip} · 失败 ${RESULT.fail}`);
    setTimeout(() => finishProcess(false), 450);
  }
}

function togglePause() {
  const p = state.proc;
  if (!p.running) return;
  p.paused = !p.paused;
  $('#btnPause').textContent = p.paused ? '继续' : '暂停';
  $('#procFill').parentElement.classList.toggle('paused', p.paused);
  updateStatus(p.paused ? 'paused' : 'processing');
  if (p.paused) { p.pauseAt = Date.now(); log('info', '已暂停'); }
  else { p.startTs += Date.now() - p.pauseAt; log('info', '继续处理'); }
}

function cancelProcess() { openModal('confirm-cancel'); }

function doCancel() {
  closeModal();
  clearInterval(state.proc.timer);
  state.proc.running = false;
  finishProcess(true);
}

function finishProcess(cancelled) {
  setView('completed');
  const p = state.proc;
  const wrap = $('#cmpHero');
  if (cancelled) {
    wrap.classList.add('cmp-failed');
    $('#cmpTitle').textContent = '已取消处理';
    $('#cmpSub').textContent = `${p.processed} 张已保留在输出目录，其余未处理`;
    updateStatus('ready');
  } else {
    wrap.classList.remove('cmp-failed');
    $('#cmpTitle').textContent = '处理完成！';
    $('#cmpSub').textContent = `${RESULT.ok} 张照片已转换为兼容格式`;
    updateStatus('done');
  }
  $('#cmpTotal').textContent = cancelled ? p.processed : TOTAL;
  $('#cmpOk').textContent   = cancelled ? p.processed : RESULT.ok;
  $('#cmpFail').textContent = RESULT.fail;
  $('#cmpSkip').textContent = cancelled ? 0 : RESULT.skip;
  $('#cmpFail').parentElement.classList.toggle('err', RESULT.fail > 0);
  $('#cmpSkip').parentElement.classList.toggle('skip', (cancelled ? 0 : RESULT.skip) > 0);
}

/* 完成页操作 */
function openOutput()   { toast('已在资源管理器中打开输出目录', 'success'); }
function exportLog()    { toast('日志已导出到桌面 · photocompat-log.txt', 'success'); }
function processAnother() {
  setView('home');
  updateStatus('ready');
  state.proc.processed = 0;
}

/* 日志 */
function log(type, msg) {
  const li = document.createElement('div');
  li.className = 'log-row ' + type;
  li.innerHTML = `<span class="log-ts">[${now()}]</span><span class="log-msg">${msg}</span>`;
  $('#logList').appendChild(li);
  $('#logList').scrollTop = $('#logList').scrollHeight;
}

/* ============================================================
   四、设置页
   ============================================================ */
function openSettings() { setView('settings'); }
function closeSettings() { setView(state.prevView || 'home'); updateStatus('ready'); }

function switchGroup(name) {
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.group === name));
  $$('.setting-group').forEach(g => g.classList.toggle('active', g.dataset.group === name));
}

/* 架构自适应演示：切换架构 → 改默认值 + 提示文案 + 大图采样锁定 */
const ARCH_CFG = {
  x86:       { parallel: 8, locked: false, text: '检测到 x86_64 架构，已按 CPU 核心数设为并行 8（可调）。' },
  loongarch: { parallel: 4, locked: true,  text: '检测到龙芯 LoongArch 架构，性能档位偏低，已自动设为并行 4 并保留 1 核给系统（可调高）。大图采样强制开启以防内存溢出。' },
  arm:       { parallel: 4, locked: true,  text: '检测到 ARM 架构（鲲鹏 / 飞腾），已自动设为并行 4（可调高）。大图采样强制开启。' },
};
function setArch(arch) {
  state.arch = arch;
  const cfg = ARCH_CFG[arch];
  $$('#archSeg button').forEach(b => b.classList.toggle('active', b.dataset.arch === arch));
  $('#parallelNum').value = cfg.parallel;
  $('#archNoteText').textContent = cfg.text;
  const big = $('#bigImgToggle');           // 大图采样开关
  const bigWrap = big.closest('.toggle');
  big.checked = true;
  big.disabled = cfg.locked;
  bigWrap.classList.toggle('locked', cfg.locked);
  $('#bigImgHint').textContent = cfg.locked
    ? '当前架构强制开启（不可关闭），防止内存溢出'
    : '超大图先采样再处理，省内存';
  $('#bigImgHint').classList.toggle('warn', cfg.locked);
}

/* ============================================================
   五、模态对话框
   ============================================================ */
function openModal(type) {
  const box = $('#modalBox');
  box.innerHTML = MODALS[type]();
  $('#modalOverlay').classList.add('show');
  // 绑定按钮
  $$('#modalBox [data-act]').forEach(btn => {
    btn.addEventListener('click', () => MODAL_ACT[type](btn.dataset.act));
  });
  // 自动跳过复选
  const chk = $('#autoSkip');
  if (chk) chk.addEventListener('change', () => toast(chk.checked ? '已记住：以后自动跳过' : '已取消自动跳过', 'info'));
}
function closeModal() { $('#modalOverlay').classList.remove('show'); }

/* 模态内容（按规范附录 B 文案） */
const MODALS = {
  'error-dir': () => `
    <div class="modal-head"><div class="modal-icon err">${ICON.err}</div><div class="modal-title">无法读取这个文件夹</div></div>
    <div class="modal-body">
      <div class="ms-text">选定的文件夹无法被读取。</div>
      <div class="ms-label">可能原因</div>
      <ul class="ms-list"><li>文件夹已被移动或删除</li><li>被其他程序锁定</li><li>系统权限不足</li></ul>
      <div class="ms-label">建议尝试</div>
      <ul class="ms-list ordered"><li>确认文件夹仍然存在</li><li>关闭可能占用它的程序</li><li>重新选择文件夹</li></ul>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" data-act="help">打开帮助</button>
      <button class="btn btn-secondary" data-act="close">关闭</button>
      <button class="btn btn-primary" data-act="resel">重新选择</button>
    </div>`,

  'error-perm': () => `
    <div class="modal-head"><div class="modal-icon err">${ICON.err}</div><div class="modal-title">没有权限访问这个文件夹</div></div>
    <div class="modal-body">
      <div class="ms-text">系统拒绝了访问。</div>
      <div class="ms-label">可能原因</div>
      <ul class="ms-list"><li>系统访问控制限制</li><li>信创系统授权弹窗未通过</li></ul>
      <div class="ms-label">建议尝试</div>
      <ul class="ms-list ordered"><li>以管理员身份运行本程序</li><li>在文件夹属性中授予读取权限</li><li>换一个文件夹</li></ul>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" data-act="help">打开帮助</button>
      <button class="btn btn-secondary" data-act="close">关闭</button>
      <button class="btn btn-primary" data-act="resel">重新选择</button>
    </div>`,

  'error-disk': () => `
    <div class="modal-head"><div class="modal-icon err">${ICON.err}</div><div class="modal-title">磁盘空间不足</div></div>
    <div class="modal-body">
      <div class="ms-text">输出磁盘剩余空间不足，无法保存处理结果。</div>
      <div class="ms-label">可能原因</div>
      <ul class="ms-list"><li>预计输出约 48 MB，剩余空间不足 10 MB</li></ul>
      <div class="ms-label">建议尝试</div>
      <ul class="ms-list ordered"><li>清理磁盘空间</li><li>在设置中改到其他磁盘输出</li><li>降低 JPEG 质量减小体积</li></ul>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" data-act="close">关闭</button>
      <button class="btn btn-primary" data-act="settings">打开设置</button>
    </div>`,

  'unsupported': () => `
    <div class="modal-head"><div class="modal-icon warn">${ICON.warn}</div><div class="modal-title">以下图片无法转换</div></div>
    <div class="modal-body">
      <div class="ms-text muted">本工具支持：JPEG / PNG / WebP / GIF / BMP / TIFF / HEIC。</div>
      <div class="ms-label">以下格式暂不支持</div>
      ${UNSUPPORTED.map(u => `
        <div style="margin-bottom:10px"><div class="ms-text">${u.name} ×${u.count}</div>
        <div class="ms-unsupported">${u.files.join('、')}</div></div>`).join('')}
      <label class="modal-check"><input type="checkbox" id="autoSkip"> 以后自动跳过不支持的格式</label>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" data-act="cancel">取消</button>
      <button class="btn btn-secondary" data-act="copy">复制文件名列表</button>
      <button class="btn btn-primary" data-act="continue">继续处理（跳过）</button>
    </div>`,

  'about': () => `
    <div class="about-head">
      <div class="about-logo">📁</div>
      <div><div class="about-name">照片适配助手</div><div class="about-ver">v1.0.0 · 离线版</div></div>
    </div>
    <div class="modal-body">
      <div class="ms-text muted">一个离线的照片兼容化工具，帮助您把照片批量转换成老旧系统能上传的格式。不联网、不上传、不收集任何信息。</div>
      <div class="ms-label">版本信息</div>
      <div class="about-info">
        <div class="sc-row"><span class="k">版本</span><span class="v">1.0.0（构建 2026.07.19）</span></div>
        <div class="sc-row"><span class="k">运行环境</span><span class="v">Tauri 2.x · Windows 10/11 · Linux</span></div>
        <div class="sc-row"><span class="k">许可</span><span class="v">免费使用</span></div>
        <div class="sc-row"><span class="k">版权</span><span class="v">© 2026</span></div>
      </div>
      <div class="ms-label">致谢</div>
      <div class="ms-text muted">基于 image、kamadak-exif、libheif 等开源库构建，感谢开源社区。</div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" data-act="copyver">复制版本信息</button>
      <button class="btn btn-primary" data-act="close">关闭</button>
    </div>`,

  'confirm-cancel': () => `
    <div class="modal-head"><div class="modal-icon warn">${ICON.warn}</div><div class="modal-title">确定取消处理吗？</div></div>
    <div class="modal-body">
      <div class="ms-text">已处理的 <b>${state.proc.processed}</b> 张会保留在输出目录，未处理的将不会执行。</div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" data-act="continue">继续处理</button>
      <button class="btn btn-destructive" data-act="confirm">确定取消</button>
    </div>`,

  'confirm-exit': () => `
    <div class="modal-head"><div class="modal-icon warn">${ICON.warn}</div><div class="modal-title">处理尚未完成</div></div>
    <div class="modal-body">
      <div class="ms-text">已完成 ${Math.round(state.proc.processed / TOTAL * 100)}%，确定退出吗？已处理的结果会保留。</div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" data-act="continue">继续处理</button>
      <button class="btn btn-destructive" data-act="confirm">退出</button>
    </div>`,
};

/* 模态按钮行为 */
const MODAL_ACT = {
  'error-dir':    a => a === 'resel' ? (closeModal(), setView('home')) : a === 'help' ? toast('已打开本地帮助手册', 'info') : closeModal(),
  'error-perm':   a => a === 'resel' ? (closeModal(), setView('home')) : a === 'help' ? toast('已打开本地帮助手册', 'info') : closeModal(),
  'error-disk':   a => a === 'settings' ? (closeModal(), openSettings()) : closeModal(),
  'unsupported':  a => {
    if (a === 'continue') { closeModal(); toast('已跳过不支持的文件，可继续处理', 'info'); }
    else if (a === 'copy') { toast('文件名列表已复制到剪贴板', 'success'); }
    else closeModal();
  },
  'about':        a => a === 'copyver' ? toast('版本信息已复制', 'success') : closeModal(),
  'confirm-cancel': a => { if (a === 'confirm') doCancel(); else closeModal(); },
  'confirm-exit': a => { if (a === 'confirm') { closeModal(); toast('已退出（演示）', 'info'); state.proc.running = false; clearInterval(state.proc.timer); } else closeModal(); },
};

/* ============================================================
   六、Toast 与菜单
   ============================================================ */
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = `${ICON[type === 'success' ? 'success' : type === 'warn' ? 'warn' : type === 'err' ? 'err' : 'info']
    .replace('<svg ', '<svg class="toast-icon" ')}<span class="toast-msg">${msg}</span>`;
  $('#toastRoot').appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3400);
}

function toggleMenu(force) {
  const m = $('#menuFlyout');
  m.classList.toggle('show', typeof force === 'boolean' ? force : !m.classList.contains('show'));
}

/* ============================================================
   七、窗口缩放
   ============================================================ */
function fitWindow() {
  const w = $('#window');
  const scale = Math.min(window.innerWidth / 1140, window.innerHeight / 760, 1);
  w.style.transform = `scale(${scale})`;
}

/* ============================================================
   八、键盘快捷键（窗口激活态生效）
   ============================================================ */
document.addEventListener('keydown', e => {
  // 窗口激活态判断（规范 §33/§34：失焦不响应快捷键）
  if (!document.hasFocus()) return;
  const k = e.key;
  const inField = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || ''));

  // Esc：最强安全出口
  if (k === 'Escape') {
    if ($('#modalOverlay').classList.contains('show')) return closeModal();
    if ($('#menuFlyout').classList.contains('show')) return toggleMenu(false);
    if (state.view === 'settings') return closeSettings();
    if (state.view === 'result') { setView('home'); updateStatus('ready'); return; }
    if (state.view === 'processing' && state.proc.running) return cancelProcess();
    return;
  }

  // 图片预览模态：左右键切换上一张 / 下一张
  if ($('#modalBox .preview-stage')) {
    if (k === 'ArrowLeft') { e.preventDefault(); navPreview(-1); return; }
    if (k === 'ArrowRight') { e.preventDefault(); navPreview(1); return; }
  }

  if (e.ctrlKey || e.metaKey) {
    if (inField) return;
    if (k === 'o' || k === 'O') { e.preventDefault(); state.view === 'completed' ? openOutput() : startScan(); return; }
    if (k === ',') { e.preventDefault(); state.view === 'settings' ? closeSettings() : openSettings(); return; }
    if (k === 'l' || k === 'L') { e.preventDefault(); toast('已打开日志文件（演示）', 'info'); return; }
    if ((k === 'e' || k === 'E') && state.view === 'completed') { e.preventDefault(); exportLog(); return; }
    if ((k === 'n' || k === 'N') && state.view === 'completed') { e.preventDefault(); processAnother(); return; }
    if (/^[1-5]$/.test(k) && state.view === 'home') { e.preventDefault(); startScan(); return; }
    return;
  }

  if (k === 'F1') { e.preventDefault(); openModal('about'); return; }
  if (k === ' ' && state.view === 'processing') { e.preventDefault(); togglePause(); return; }
  if (k === 'Enter' && !inField) {
    if (state.view === 'home' || state.view === 'scanning') startScan();
    else if (state.view === 'result') startProcess();
    else if (state.view === 'completed') openOutput();
  }
});

/* 点击遮罩/外部关闭浮层 */
document.addEventListener('click', e => {
  if ($('#menuFlyout').classList.contains('show') && !e.target.closest('#menuFlyout') && !e.target.closest('#menuBtn')) {
    toggleMenu(false);
  }
});

/* ============================================================
   九、初始化
   ============================================================ */
/* URL hash 路由：#home/#scanning/#result/#processing/#completed/#settings
   直接定位各屏，便于预览面板与导出截图查看每一页设计 */
const DEFAULT_VIEW = 'home'; // 导出各屏预览时可临时改为 'result' / 'processing' / 'completed'
function applyHash() {
  const v = location.hash.replace('#', '') || DEFAULT_VIEW;
  if (v === 'result') showResult();
  else if (v === 'processing') showProcessingStatic();
  else if (v === 'completed') finishProcess(false);
  else if (v === 'scanning') { setView('scanning'); updateStatus('scanning'); $('#scanFound').textContent = FOUND; $('#scanFolder').textContent = FOLDER; }
  else if (v === 'settings') openSettings();
  else { setView('home'); updateStatus('ready'); }
}

function init() {
  fitWindow();
  window.addEventListener('resize', fitWindow);

  /* 首页 */
  const dz = $('#dropzone');
  dz.addEventListener('click', startScan);
  $('#btnSelect').addEventListener('click', e => { e.stopPropagation(); startScan(); });
  $$('.recent-item').forEach(it => it.addEventListener('click', startScan));
  $('#modeBadge').addEventListener('click', () => toast('当前为标准兼容模式（适合绝大多数政务 / 医疗系统）', 'info'));
  /* 拖拽视觉 + 触发 */
  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('dragover'); }));
  dz.addEventListener('drop', () => startScan());

  /* 扫描结果 */
  $('#btnStart').addEventListener('click', startProcess);
  $('#btnResultCancel').addEventListener('click', () => { setView('home'); updateStatus('ready'); });
  $('#reselLink').addEventListener('click', () => { setView('home'); updateStatus('ready'); });
  $('#unsupportedBar').addEventListener('click', () => openModal('unsupported'));
  $('#outModify').addEventListener('click', () => toast('快速设置：输出位置 / 覆盖策略（演示）', 'info'));

  /* 处理中 */
  $('#btnPause').addEventListener('click', togglePause);
  $('#btnCancel').addEventListener('click', cancelProcess);
  $('#btnOpenLog').addEventListener('click', () => toast('已打开日志文件（演示）', 'info'));
  $('#logToggle').addEventListener('click', () => $('#logPanel').classList.toggle('open'));
  $('#stSkip').addEventListener('click', () => state.proc.processed > 0 && toast('跳过列表：损坏文件 3 个（演示）', 'warn'));

  /* 完成 */
  $('#btnOpenOut').addEventListener('click', openOutput);
  $('#btnExport').addEventListener('click', exportLog);
  $('#btnAnother').addEventListener('click', processAnother);
  $('#outPath').addEventListener('click', () => toast('路径已复制：' + OUT, 'success'));

  /* 设置 */
  $('#settingsBack').addEventListener('click', closeSettings);
  $$('.nav-item').forEach(n => n.addEventListener('click', () => switchGroup(n.dataset.group)));
  $$('.toggle input[type=checkbox]').forEach(t => t.addEventListener('change', () => {
    if (t.id === 'trayToggle') {
      toast(t.checked ? '已启用最小化到托盘' : '已关闭最小化到托盘', 'info');
    }
  }));
  $$('.slider input[type=range]').forEach(r => r.addEventListener('input', () => {
    const val = r.parentElement.nextElementSibling;
    if (val) val.textContent = r.value;
  }));
  $$('#archSeg button').forEach(b => b.addEventListener('click', () => setArch(b.dataset.arch)));
  setArch('x86');   // 初始化架构自适应默认

  /* 标题栏 / 菜单 */
  $('#menuBtn').addEventListener('click', e => { e.stopPropagation(); toggleMenu(); });
  $$('#menuFlyout [data-menu]').forEach(it => it.addEventListener('click', () => {
    const act = it.dataset.menu;
    toggleMenu(false);
    if (act === 'settings') openSettings();
    else if (act === 'about') openModal('about');
    else if (act === 'log') toast('已打开日志文件（演示）', 'info');
    else if (act === 'errDir') openModal('error-dir');
    else if (act === 'errPerm') openModal('error-perm');
    else if (act === 'errDisk') openModal('error-disk');
  }));
  $('#modeBadge2')?.addEventListener('click', () => toast('当前为标准兼容模式', 'info'));
  $('.sys-btn.close').addEventListener('click', () => {
    if (state.proc.running) openModal('confirm-exit');
    else toast('已退出（演示）', 'info');
  });
  $('.sys-btn.min')addEventListener('click', () => toast('已最小化（演示）', 'info'));

  /* 模态遮罩点击不关闭（防误触，规范 §17）—— 这里仅 Esc/按钮关闭 */

  /* 单选段通用切换（架构段除外，由 setArch 处理） */
  $$('.seg').forEach(seg => {
    if (seg.id === 'archSeg') return;
    seg.addEventListener('click', e => {
      if (e.target.tagName !== 'BUTTON') return;
      [...seg.children].forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
    });
  });

  applyHash();
  window.addEventListener('hashchange', applyHash);
}

document.addEventListener('DOMContentLoaded', init);
