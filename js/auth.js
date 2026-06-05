// ============================================================
// auth.js — 用户认证系统
// ============================================================
//
// 职责：
//   1. 用户 CRUD（创建、读取、更新、删除）
//   2. SHA-256 密码加密（Web Crypto API）
//   3. 登录态管理（Session 存储）
//   4. 项目管理（保存/导出/导入项目 JSON）
//
// 持久化（通过 STORAGE 层 → data/*.json + localStorage）：
//   users    — 用户列表 → data/users.json
//   projects — 项目列表 → data/projects.json
//
// 临时数据（仅 localStorage）：
//   ess_session  — 当前登录会话
//
// 默认账号在首次运行时自动创建，密码以 SHA-256 哈希存储
// ============================================================

const AUTH = (() => {

  const SESSION_KEY  = 'ess_session';

  // ── SHA-256 加密（浏览器原生，异步）────────────────────
  async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  // ── 初始化默认用户（首次运行）──────────────────────────
  async function initDefaultUsers() {
    var existing = STORAGE.get('users');
    if (existing && existing.length > 0) return;
    const adminHash = await sha256('admin123');
    const userHash  = await sha256('user123');
    const defaults = [
      { id: 'u1', username: 'admin', passwordHash: adminHash, role: 'admin',  displayName: '系统管理员', createdAt: Date.now() },
      { id: 'u2', username: 'user',  passwordHash: userHash,  role: 'user',   displayName: '普通用户',   createdAt: Date.now() },
    ];
    saveUsers(defaults);
  }

  // ── 用户数据 CRUD ────────────────────────────────────────
  function getUsers() {
    var users = STORAGE.get('users');
    return Array.isArray(users) ? users : [];
  }
  function saveUsers(users) {
    STORAGE.set('users', users);
  }

  // ── 登录失败嘲讽文案 ─────────────────────────────
  const LOGIN_MOCKERY = [
    '笨蛋，密码搞忘了吧 🤡',
    '连密码都记不住，储能配置能搞好？',
    '密码错误！你是不是忘了自己设的密码？',
    '登录失败，建议检查一下脑袋 🧠',
    '密码错了啦，再想想？别让我看不起你 😏',
    '用户名或密码错误 — 就像你的储能方案一样有问题',
    '哎哟，密码错了，重来吧大侠 💪',
    '登录失败！密码都不对，还想做配置？',
    '密码错误，建议找管理员XZP重置 🔑',
    '又错了！你是不是在测试我的耐心？',
  ];
  function randomMockery() {
    return LOGIN_MOCKERY[Math.floor(Math.random() * LOGIN_MOCKERY.length)];
  }

  // ── 登录 ────────────────────────────────────────────────
  async function login(username, password) {
    const hash  = await sha256(password);
    const users = getUsers();
    const user  = users.find(u => u.username === username && u.passwordHash === hash);
    if (!user) return { ok: false, msg: randomMockery() };
    const session = { userId: user.id, username: user.username, role: user.role, displayName: user.displayName, loginAt: Date.now() };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { ok: true, user: session };
  }

  // ── 登出 ────────────────────────────────────────────────
  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  // ── 获取当前会话 ─────────────────────────────────────────
  function getSession() {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  }

  function isAdmin() {
    const s = getSession();
    return s && s.role === 'admin';
  }

  // ── 创建用户（管理员）───────────────────────────────────
  async function createUser({ username, password, role, displayName }) {
    const users = getUsers();
    if (users.find(u => u.username === username)) return { ok: false, msg: '用户名已存在' };
    const hash = await sha256(password);
    const newUser = { id: 'u' + Date.now(), username, passwordHash: hash, role, displayName: displayName || username, createdAt: Date.now() };
    users.push(newUser);
    saveUsers(users);
    return { ok: true };
  }

  // ── 修改用户（管理员）───────────────────────────────────
  async function updateUser(id, { displayName, password, role }) {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx < 0) return { ok: false, msg: '用户不存在' };
    if (displayName) users[idx].displayName = displayName;
    if (role)        users[idx].role = role;
    if (password)    users[idx].passwordHash = await sha256(password);
    saveUsers(users);
    return { ok: true };
  }

  // ── 删除用户（管理员）───────────────────────────────────
  function deleteUser(id) {
    const session = getSession();
    if (session && session.userId === id) return { ok: false, msg: '不能删除当前登录用户' };
    const users = getUsers().filter(u => u.id !== id);
    saveUsers(users);
    return { ok: true };
  }

  // ── 项目数据 CRUD ────────────────────────────────────────
  function getProjects(onlyUserId) {
    const all = STORAGE.get('projects') || [];
    return onlyUserId ? all.filter(p => p.ownerId === onlyUserId) : all;
  }

  function saveProject(project) {
    const all = getProjects();
    const idx = all.findIndex(p => p.id === project.id);
    if (idx >= 0) all[idx] = project;
    else all.push(project);
    STORAGE.set('projects', all);
  }

  function deleteProject(id) {
    const all = getProjects();
    STORAGE.set('projects', all.filter(p => p.id !== id));
  }

  function exportAllProjects() {
    const data = STORAGE.get('projects') || [];
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'ess_projects_backup.json'; a.click();
  }

  function importProjects(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (!Array.isArray(data)) return { ok: false, msg: '格式错误' };
      const all = getProjects();
      data.forEach(p => { if (!all.find(x => x.id === p.id)) all.push(p); });
      STORAGE.set('projects', all);
      return { ok: true, count: data.length };
    } catch(e) { return { ok: false, msg: '解析失败：' + e.message }; }
  }

  return { sha256, initDefaultUsers, login, logout, getSession, isAdmin,
           getUsers, createUser, updateUser, deleteUser,
           getProjects, saveProject, deleteProject,
           exportAllProjects, importProjects };
})();
