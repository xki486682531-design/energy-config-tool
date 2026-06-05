/* ═══════════════════════════════════════════════════════════════
   storage.js — 统一文件持久化存储层
   ══════════════════════════════════════════════════════════════

   优先级：localStorage（最新） > data/*.json（项目文件） > JS 默认值

   写入策略：
     - localStorage：始终同步写入（即时生效）
     - 项目文件夹：通过 File System Access API 写入 data/ 目录
       首次使用需用户授权选择 data/ 文件夹，之后自动保存

   换电脑时：把整个 energy-config-tool-main 文件夹拷走即可，所有数据
   都在 data/*.json 文件中，打开页面自动加载。
   ══════════════════════════════════════════════════════════════ */

const STORAGE = (() => {

  /* ── 内部状态 ── */
  let _dirHandle = null;          // FileSystemDirectoryHandle
  let _dirPath   = '';           // 用户友好的路径显示
  let _pendingWrites = {};       // 待写入的修改 { key: data }
  let _writeTimer = null;        // 防抖定时器
  let _inited = false;

  /* ── 数据键定义 ── */
  const DATA_FILES = {
    users:          { file:'users.json',          ls:'ess_users',              default:null },
    projects:       { file:'projects.json',       ls:'ess_projects',           default:[] },
    components:     { file:'components.json',     ls:'ess_component_library',  default:[] },
    templates:      { file:'templates.json',      ls:'ess_component_templates',default:[] },
    categories:     { file:'categories.json',     ls:'ess_categories',         default:null },
    topology:       { file:'topology.json',       ls:'ess_topology_data',      default:null },
    products:       { file:'products.json',       ls:'ess_products_data',      default:{} },
    settings:       { file:'settings.json',       ls:'ess_settings',           default:{} },
  };

  /* ── IndexedDB 存储目录句柄 ── */
  function _openHandleDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('ess_storage', 1);
      req.onupgradeneeded = () => { req.result.createObjectStore('handles'); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function _saveDirHandle(handle) {
    try {
      const db = await _openHandleDB();
      const tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').put(handle, 'dir');
      await new Promise(r => { tx.oncomplete = r; tx.onerror = r; });
      db.close();
    } catch(e) { console.warn('[Storage] 保存目录句柄失败:', e.message); }
  }

  async function _loadDirHandle() {
    try {
      const db = await _openHandleDB();
      const tx = db.transaction('handles', 'readonly');
      const req = tx.objectStore('handles').get('dir');
      const handle = await new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      db.close();

      // 验证句柄权限
      if (handle) {
        const opts = { mode:'readwrite' };
        const ok = await _verifyPermission(handle, opts);
        if (!ok) return null;
      }
      return handle;
    } catch(e) { return null; }
  }

  async function _verifyPermission(handle, opts) {
    // 检查权限
    if (await handle.queryPermission(opts) === 'granted') return true;
    // 尝试重新请求
    try {
      return await handle.requestPermission(opts) === 'granted';
    } catch(e) { return false; }
  }

  /* ── 从 data/ 文件夹加载（fetch） ── */
  async function _loadFromDataFolder(key) {
    const def = DATA_FILES[key];
    if (!def) return null;
    try {
      const resp = await fetch('data/' + def.file, { cache:'no-store' });
      if (!resp.ok) return null;
      return await resp.json();
    } catch(e) { return null; }
  }

  /* ── 写入 data/ 文件夹（File System Access API） ── */
  async function _writeToDataFolder(key, data) {
    if (!_dirHandle) return false;
    const def = DATA_FILES[key];
    if (!def) return false;
    try {
      const opts = { mode:'readwrite' };
      if (!(await _verifyPermission(_dirHandle, opts))) {
        _dirHandle = null;
        return false;
      }
      const fileHandle = await _dirHandle.getFileHandle(def.file, { create:true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
      return true;
    } catch(e) {
      console.warn('[Storage] 写入文件失败 (' + key + '):', e.message);
      // 句柄可能失效
      _dirHandle = null;
      return false;
    }
  }

  /* ── 防抖写入 ── */
  function _scheduleWrite(key, data) {
    _pendingWrites[key] = data;
    if (_writeTimer) clearTimeout(_writeTimer);
    _writeTimer = setTimeout(() => _flushWrites(), 500);
  }

  async function _flushWrites() {
    const keys = Object.keys(_pendingWrites);
    if (keys.length === 0) return;
    const writes = { ..._pendingWrites };
    _pendingWrites = {};

    // 先确保有目录句柄
    if (!_dirHandle) {
      _dirHandle = await _loadDirHandle();
    }

    if (!_dirHandle) {
      // 没有目录句柄，只写 localStorage（已写）
      StorageUI.updateSyncStatus('disconnected');
      return;
    }

    let allOk = true;
    for (const [key, data] of Object.entries(writes)) {
      const ok = await _writeToDataFolder(key, data);
      if (!ok) allOk = false;
    }

    StorageUI.updateSyncStatus(allOk ? 'synced' : 'error');
  }

  /* ═══════════════════════════════════════════════════════════
     公开 API
     ══════════════════════════════════════════════════════════ */

  /* 初始化：加载所有数据 */
  async function init() {
    if (_inited) return;
    _inited = true;

    // 尝试恢复目录句柄
    _dirHandle = await _loadDirHandle();

    // 加载 settings（需要最早）
    await _loadKey('settings');

    // 并行加载其余数据
    const keys = Object.keys(DATA_FILES).filter(k => k !== 'settings');
    await Promise.all(keys.map(k => _loadKey(k)));

    // 标记同步状态
    StorageUI.updateSyncStatus(_dirHandle ? 'synced' : 'disconnected');
  }

  async function _loadKey(key) {
    const def = DATA_FILES[key];
    if (!def) return;

    // 1. localStorage 已有数据（最新）？直接用
    const lsRaw = localStorage.getItem(def.ls);
    if (lsRaw !== null) {
      try {
        const parsed = JSON.parse(lsRaw);
        // 同时尝试同步到 data/ 文件夹
        if (_dirHandle) {
          _scheduleWrite(key, parsed);
        }
        return parsed;
      } catch(e) {}
    }

    // 2. 尝试从 data/ 文件夹加载
    let fromFile = null;
    try {
      fromFile = await _loadFromDataFolder(key);
    } catch(e) {}

    if (fromFile !== null) {
      // 同步到 localStorage
      localStorage.setItem(def.ls, JSON.stringify(fromFile));
      return fromFile;
    }

    // 3. 使用 JS 默认值
    const d = def.default;
    if (d !== null) {
      localStorage.setItem(def.ls, JSON.stringify(d));
    }
    return d;
  }

  /* 读取数据 */
  function get(key) {
    const def = DATA_FILES[key];
    if (!def) return null;
    const raw = localStorage.getItem(def.ls);
    if (raw === null) {
      const d = def.default;
      return d !== null ? JSON.parse(JSON.stringify(d)) : null;
    }
    try { return JSON.parse(raw); } catch(e) { return def.default !== null ? JSON.parse(JSON.stringify(def.default)) : null; }
  }

  /* 保存数据（localStorage 即时 + data/ 文件夹异步） */
  function set(key, data) {
    const def = DATA_FILES[key];
    if (!def) return false;
    localStorage.setItem(def.ls, JSON.stringify(data));
    _scheduleWrite(key, data);
    return true;
  }

  /* 删除数据 */
  function remove(key) {
    const def = DATA_FILES[key];
    if (!def) return;
    localStorage.removeItem(def.ls);
    _scheduleWrite(key, def.default !== null ? def.default : null);
  }

  /* 选择项目 data/ 文件夹（用户手动触发） */
  async function pickDataFolder() {
    try {
      if (!window.showDirectoryPicker) {
        alert('当前浏览器不支持文件系统访问。\n请使用 Chrome 或 Edge 浏览器。');
        return false;
      }
      const handle = await window.showDirectoryPicker({ mode:'readwrite' });
      _dirHandle = handle;
      _dirPath = handle.name;
      await _saveDirHandle(handle);

      // 立即同步所有 localStorage 数据到文件
      await _syncAllToFiles();
      StorageUI.updateSyncStatus('synced');
      return true;
    } catch(e) {
      if (e.name !== 'AbortError') {
        console.warn('[Storage] 选择文件夹失败:', e.message);
      }
      return false;
    }
  }

  /* 同步所有 localStorage 数据到 data/ 文件夹 */
  async function _syncAllToFiles() {
    if (!_dirHandle) return;
    const keys = Object.keys(DATA_FILES);
    let ok = 0, fail = 0;
    for (const key of keys) {
      const data = get(key);
      if (data === null) continue;
      const r = await _writeToDataFolder(key, data);
      r ? ok++ : fail++;
    }
    if (fail === 0) {
      StorageUI.updateSyncStatus('synced');
    }
  }

  /* 手动触发全部同步 */
  async function syncAll() {
    if (!_dirHandle) {
      _dirHandle = await _loadDirHandle();
    }
    if (!_dirHandle) {
      // 没有目录句柄，尝试让用户选择
      return await pickDataFolder();
    }
    await _syncAllToFiles();
    return true;
  }

  /* 是否已连接到项目文件夹 */
  function isConnected() {
    return !!_dirHandle;
  }

  /* 获取文件夹路径 */
  function getFolderPath() {
    return _dirPath || '';
  }

  /* 将全部数据导出为单个JSON（兜底方案：下载） */
  function exportAll() {
    const all = {};
    Object.keys(DATA_FILES).forEach(key => {
      all[key] = get(key);
    });
    const json = JSON.stringify(all, null, 2);
    const blob = new Blob([json], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ess-full-backup-' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  /* 从JSON文件恢复全部数据 */
  async function importAll(jsonStr) {
    try {
      const all = JSON.parse(jsonStr);
      const keys = Object.keys(DATA_FILES);
      let count = 0;
      for (const key of keys) {
        if (all[key] !== undefined) {
          set(key, all[key]);
          count++;
        }
      }
      // 立即刷新写入
      await _flushWrites();
      return { ok:true, count };
    } catch(e) {
      return { ok:false, msg:'解析失败: ' + e.message };
    }
  }

  return {
    init,
    get, set, remove,
    pickDataFolder, syncAll,
    isConnected, getFolderPath,
    exportAll, importAll,
    DATA_FILES
  };

})();

/* ═══════════════════════════════════════════════════════════════
   StorageUI — 同步状态指示器（注入到 admin 右上角）
   ══════════════════════════════════════════════════════════════ */
const StorageUI = (() => {

  let _statusEl = null;
  let _currentStatus = 'disconnected';

  function updateSyncStatus(status) {
    _currentStatus = status;
    if (!_statusEl) {
      _statusEl = document.getElementById('storage-sync-status');
    }
    if (_statusEl) {
      const states = {
        synced:       { icon:'💾', text:'已同步到文件夹', cls:'synced' },
        disconnected: { icon:'⚠️', text:'未连接项目文件夹', cls:'disconnected' },
        error:        { icon:'❌', text:'同步失败', cls:'error' },
      };
      const s = states[status] || states.disconnected;
      _statusEl.className = 'storage-sync-indicator ' + s.cls;
      _statusEl.innerHTML = '<span class="storage-sync-icon">' + s.icon + '</span><span class="storage-sync-text">' + s.text + '</span>';
      _statusEl.title = status === 'synced' ? '数据已保存到 data/ 文件夹' : '点击设置项目文件夹以启用文件持久化';
    }
  }

  function renderSyncIndicator() {
    return '<div id="storage-sync-status" class="storage-sync-indicator disconnected" onclick="STORAGE.pickDataFolder()" title="点击设置项目文件夹"><span class="storage-sync-icon">⚠️</span><span class="storage-sync-text">未连接项目文件夹</span></div>';
  }

  return { updateSyncStatus, renderSyncIndicator };

})();
