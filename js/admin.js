// ============================================================
// admin.js — 管理后台（左侧菜单 + 右侧内容区布局）
// ============================================================
//
// Tab: 用户管理 / 产品编码 / 需求模块 / 项目管理
// ============================================================

const ADMIN = (() => {

  let currentTab = 'users';

  // ── 辅助：获取分类注册表（含本地覆盖）───────────────────
  function getCategoryRegistry() {
    const p = STORAGE.get('products') || {};
    if (p.categories) try { return JSON.parse(JSON.stringify(p.categories)); } catch(e){}
    return Array.isArray(DATA.categoryRegistry) ? JSON.parse(JSON.stringify(DATA.categoryRegistry)) : [];
  }

  function getReqFieldRegistry() {
    // 不再从 localStorage 读取，直接从 data.js / custom-config.js 获取
    const fields = Array.isArray(DATA.reqFieldRegistry) ? JSON.parse(JSON.stringify(DATA.reqFieldRegistry)) : [];
    // 原始 data.js 中字段没有 showInReq 属性，默认视为 true（显示在需求表中）
    fields.forEach(f => {
      if (typeof f.showInReq === 'undefined') f.showInReq = true;
    });
    return fields;
  }

  // ── helper：将产品/分类保存到 STORAGE（reqFields 不再存入 localStorage）──
  function _flushProducts(products, categories, reqFields) {
    // reqFields 忽略，不再存入 localStorage
    STORAGE.set('products', {
      products: products !== undefined ? products : (STORAGE.get('products') || {}).products,
      categories: categories !== undefined ? categories : (STORAGE.get('products') || {}).categories,
    });
  }

  // ── 初始化（登录检查 + 渲染布局）─────────────────────────
  async function init() {
    try {
    await AUTH.initDefaultUsers();
    const session = AUTH.getSession();
    if (!session || session.role !== 'admin') {
      window.location.href = 'index.html';
      return;
    }
    // 加载产品覆盖数据（来自 STORAGE）
    var pData = STORAGE.get('products') || {};
    if (pData.products) {
      try { Object.assign(DATA, JSON.parse(JSON.stringify(pData.products))); } catch(e){}
    }
    if (pData.categories) {
      try { DATA.categoryRegistry = JSON.parse(JSON.stringify(pData.categories)); } catch(e){}
    }
    // reqFields 不再从 localStorage 加载，改从 data/custom-config.js 加载

    document.getElementById('app-root').innerHTML = renderLayout();
    applyTheme();

    // 动态注入「拓扑元件库」tab pane
    var adminContent = document.querySelector('.admin-content');
    if (adminContent) {
      var complibPane = document.createElement('div');
      complibPane.id = 'atab-complib';
      complibPane.className = 'atab-pane';
      complibPane.innerHTML = '<div id="complib-container"></div>';
      adminContent.appendChild(complibPane);
    }
    // 初始化元件库管理模块
    if (typeof COMPONENT_LIB_ADMIN !== 'undefined') COMPONENT_LIB_ADMIN.init();

    // 将元件库保存的修改同步回 COMPONENT_LIB（拓扑编辑器从这里读取）
    _syncStoredComponentsToLib();

    // 关闭页面前提醒保存
    _setupBeforeUnload();

    // 动态注入个人信息弹窗
    injectProfileModal();

    // 绑定侧边栏头像点击事件
    var sideProfile = document.getElementById('side-profile');
    if (sideProfile) sideProfile.addEventListener('click', showProfile);

    // 设置管理员头像和名称
    var adminName = session.displayName || session.username || '管理员';
    var nameEl = document.getElementById('admin-name');
    var avatarEl = document.getElementById('admin-avatar');
    if (nameEl) nameEl.textContent = adminName;
    if (avatarEl) {
      var avatarList = ['avatar1.jpg','avatar2.jpg','avatar3.jpg','avatar4.jpg','avatar5.jpg','avatar6.jpg','avatar7.jpg','avatar8.jpg','avatar9.jpg'];
      var avatarBase = 'images/avatars/';
      var savedAvatar = localStorage.getItem('ess_admin_avatar');
      if (!savedAvatar || avatarList.indexOf(savedAvatar) === -1) {
        savedAvatar = avatarList[Math.floor(Math.random() * avatarList.length)];
        localStorage.setItem('ess_admin_avatar', savedAvatar);
      }
      avatarEl.textContent = '';
      avatarEl.style.backgroundImage = 'url(' + avatarBase + savedAvatar + ')';
      avatarEl.style.backgroundSize = 'cover';
      avatarEl.style.backgroundPosition = 'center';
      avatarEl.style.cursor = 'pointer';
      avatarEl.title = '点击编辑个人信息';
    }

    switchTab('users');

    // 恢复侧边栏折叠状态
    if (localStorage.getItem('ess_admin_sidebar_collapsed') === '1') {
      var sidebar = document.querySelector('.admin-sidebar');
      if (sidebar) sidebar.classList.add('collapsed');
    }

    } catch(e) {
      console.error('Admin init error:', e);
      alert('管理员后台初始化失败：' + e.message);
    }
  }

  // 将元件库保存的修改同步回 COMPONENT_LIB / COMPONENT_BY_ID
  function _syncStoredComponentsToLib() {
    if (typeof COMPONENT_LIB === 'undefined' || typeof COMPONENT_BY_ID === 'undefined') return;
    var saved = STORAGE.get('components');
    if (!Array.isArray(saved) || !saved.length) return;

    var existingIds = {};
    COMPONENT_LIB.forEach(function(c) { existingIds[c.id] = c; });

    saved.forEach(function(s) {
      if (!s || !s.id || s.enabled === false) return; // 跳过停用元件
      var c = existingIds[s.id];

      // 从 connectionPoints 重建 ports 数组
      var ports = [];
      var cp = s.connectionPoints || {};
      if (cp.top && cp.top.enabled)    ports.push({ id:'top',    side:'top',    x:cp.top.offsetX||0.5, y:0 });
      if (cp.bottom && cp.bottom.enabled) ports.push({ id:'bottom', side:'bottom', x:cp.bottom.offsetX||0.5, y:1 });
      if (cp.left && cp.left.enabled)  ports.push({ id:'left',   side:'left',   x:0, y:cp.left.offsetY||0.5 });
      if (cp.right && cp.right.enabled) ports.push({ id:'right',  side:'right',  x:1, y:cp.right.offsetY||0.5 });
      if (cp.custom) cp.custom.forEach(function(p,i) {
        ports.push({ id:'custom-'+i, side:p.side||'top', x:p.x||0.5, y:p.y||0 });
      });

      if (c) {
        // 更新 COMPONENT_LIB 中的已有元件
        if (s.svg)           c.svg    = s.svg;
        if (s.name)          c.name   = s.name;
        if (s.name)          c.label  = s.name;
        if (s.description)   c.desc   = s.description;
        if (s.defaultWidth)  c.width  = s.defaultWidth;
        if (s.defaultHeight) c.height = s.defaultHeight;
        if (ports.length)    c.ports  = ports;
        if (s.hasOwnProperty('overlayEdge')) c.overlayEdge = s.overlayEdge;
        if (s.defaultRotation != null) c.defaultRotation = s.defaultRotation;
        if (s.defaultPosX != null) c.defaultPosX = s.defaultPosX;
        if (s.defaultPosY != null) c.defaultPosY = s.defaultPosY;
      } else {
        // 用户新增的元件，追加到 COMPONENT_LIB
        var catMap = { '储能系统':'storage','PCS系统':'power','EMS/BMS':'control','变压器系统':'trans',
                       '开关设备':'dist','电网侧':'gen','负载系统':'load','辅助系统':'aux',
                       '计量系统':'meter','并网系统':'gridcon','母线系统':'busbar','通信设备':'network' };
        var newComp = {
          id: s.id, category: catMap[s.categoryParent]||'aux',
          name: s.name||'未命名', label: s.name||'未命名',
          svg: s.svg||'', desc: s.description||'',
          width: s.defaultWidth||80, height: s.defaultHeight||60,
          ports: ports,
          defaultRotation: s.defaultRotation||0,
          defaultPosX: s.defaultPosX||0,
          defaultPosY: s.defaultPosY||0
        };
        COMPONENT_LIB.push(newComp);
      }
    });

    // 重建 COMPONENT_BY_ID（包含所有修改）
    COMPONENT_BY_ID = {};
    COMPONENT_LIB.forEach(function(c) { COMPONENT_BY_ID[c.id] = c; });
  }

  // ── 渲染整体布局 ─────────────────────────────────────────
  function renderLayout() {
    return /*html*/`
    <div class="admin-shell">
      <!-- 左侧菜单栏 -->
      <aside class="admin-sidebar">
        <div class="side-logo">
          <div class="side-logo-icon" onclick="ADMIN.toggleSidebar()" title="折叠/展开菜单">⚡</div>
          <div class="side-logo-text">储能管理系统</div>
          <div class="side-logo-sub">管理员控制台</div>
        </div>
        <nav class="side-nav">
          <div class="side-item active" data-tab="users" onclick="ADMIN.switchTab('users')">
            <span class="side-icon">&#x1F465;</span>
            <span class="side-label">用户管理</span>
          </div>
          <div class="side-item" data-tab="products" onclick="ADMIN.switchTab('products')">
            <span class="side-icon">&#x1F4E6;</span>
            <span class="side-label">产品编码</span>
          </div>
          <div class="side-item" data-tab="reqfields" onclick="ADMIN.switchTab('reqfields')">
            <span class="side-icon">&#x2699;&#xFE0F;</span>
            <span class="side-label">需求模块</span>
          </div>
          <div class="side-item" data-tab="projects" onclick="ADMIN.switchTab('projects')">
            <span class="side-icon">&#x1F4C1;</span>
            <span class="side-label">项目管理</span>
          </div>
          <div class="side-item" data-tab="topology" onclick="ADMIN.switchTab('topology')">
            <span class="side-icon">&#x1F517;</span>
            <span class="side-label">拓扑方案</span>
          </div>
          <div class="side-item" data-tab="complib" onclick="ADMIN.switchTab('complib')">
            <span class="side-icon">&#x1F5C4;</span>
            <span class="side-label">拓扑元件库</span>
          </div>
          <div class="side-item" data-tab="sitesettings" onclick="ADMIN.switchTab('sitesettings')">
            <span class="side-icon">&#x2699;&#xFE0F;</span>
            <span class="side-label">站点设置</span>
          </div>
        </nav>
        <div class="side-profile" id="side-profile" style="cursor:pointer">
          <div class="side-avatar" id="admin-avatar">A</div>
          <div class="side-user-info">
            <div class="side-username" id="admin-name">管理员</div>
            <div class="side-role">超级管理员</div>
          </div>
        </div>
        <div class="side-foot">
          <button class="side-foot-btn" id="adminThemeToggle" onclick="ADMIN.toggleTheme()" title="切换主题">&#x1F319;</button>
          <button class="side-foot-btn back-btn" onclick="ADMIN.backToMain()">&#x2190; 返回主页</button>
        </div>
      </aside>

      <!-- 右侧内容区 -->
      <main class="admin-main">
        <header class="admin-topbar">
          <h2 class="topbar-title" id="topbar-title">用户管理</h2>
          <div class="topbar-actions">
            ${StorageUI.renderSyncIndicator()}
            <button class="topbar-btn" onclick="STORAGE.syncAll()" title="同步数据到项目文件夹">💾</button>
            <button class="topbar-btn" onclick="ADMIN.backToMain()" title="返回主页">&#x2715;</button>
          </div>
        </header>
        <div class="admin-content">
          <!-- 用户管理 -->
          <div id="atab-users" class="atab-pane">
            <div class="admin-toolbar">
              <button class="btn-sm btn-blue" onclick="ADMIN.showCreateUser()">＋ 新建用户</button>
            </div>
            <div id="admin-user-list"></div>
          </div>

          <!-- 产品编码 -->
          <div id="atab-products" class="atab-pane">
            <div class="req-toolbar-sticky">
              <div class="admin-toolbar">
                <select id="prod-category" onchange="ADMIN.renderProductList()" style="min-width:160px">
                </select>
                <button id="prod-edit-btn" class="btn-sm btn-blue" onclick="ADMIN.toggleProductEdit(true)">&#x270F;&#xFE0F; 编辑</button>
                <button id="prod-catset-btn" class="btn-sm btn-blue" onclick="ADMIN.showEditCategory()" style="display:none">&#x2699;&#xFE0F; 大类设置</button>
                <button id="prod-newcat-btn" class="btn-sm btn-green" onclick="ADMIN.showNewCategory()" style="display:none">＋ 新增大类</button>
                <button id="prod-newprod-btn" class="btn-sm btn-green" onclick="ADMIN.addProduct()" style="display:none">＋ 新增产品</button>
                <button id="prod-save-btn" class="btn-sm btn-blue" onclick="ADMIN.saveProducts()" style="display:none">&#x1F4BE; 保存修改</button>
                <button id="prod-cancel-btn" class="btn-sm btn-gray" onclick="ADMIN.toggleProductEdit(false)" style="display:none">取消</button>
              </div>
              <div class="prod-hint">浏览模式下仅查看，点击「编辑」后可增删改产品编码。修改后点击「保存修改」持久化到本地。</div>
            </div>
            <div id="admin-prod-list"></div>
          </div>

          <!-- 需求模块配置 -->
          <div id="atab-reqfields" class="atab-pane">
            <div class="req-toolbar-sticky">
              <div class="admin-toolbar">
                <button class="btn-sm btn-blue" onclick="ADMIN.saveReqFields()">&#x1F4BE; 保存修改</button>
                <button class="btn-sm btn-gray" onclick="ADMIN.resetReqFields()">&#x21BA; 恢复默认</button>
              </div>
              <div class="prod-hint">自定义需求表中各模块的选项、默认值、关联产品大类及是否显示。点击「保存修改」直接覆盖 data/custom-config.js 文件（换电脑携带此文件）。「恢复默认」将放弃所有本次修改。</div>
            </div>
            <div id="admin-reqfield-list"></div>
          </div>

          <!-- 项目管理 -->
          <div id="atab-projects" class="atab-pane">
            <div class="admin-toolbar">
              <button class="btn-sm btn-blue" onclick="AUTH.exportAllProjects()">&#x2B07; 导出全部项目</button>
              <label class="btn-sm btn-green" style="cursor:pointer">
                &#x2B06; 导入项目
                <input type="file" accept=".json" style="display:none" onchange="ADMIN.importProjects(this)">
              </label>
            </div>
            <div id="admin-proj-list"></div>
          </div>

          <!-- 拓扑方案管理 -->
          <div id="atab-topology" class="atab-pane">
            <div class="admin-toolbar">
              <button class="btn-sm btn-green" onclick="ADMIN.addTopoScene()">＋ 新增场景</button>
              <button class="btn-sm btn-blue" onclick="ADMIN.saveTopoData()">&#x1F4BE; 保存修改</button>
              <button class="btn-sm btn-gray" onclick="ADMIN.resetTopoData()">&#x21BA; 恢复默认</button>
            </div>
            <div class="prod-hint">编辑拓扑方案的场景标题、描述、BOM表格、拓扑图和配置要点。保存后主页拓扑方案页自动更新。</div>
            <div id="admin-topo-list"></div>
          </div>

          <!-- 站点设置 -->
          <div id="atab-sitesettings" class="atab-pane">
            <div class="admin-toolbar sitesettings-sticky-toolbar">
              <button class="btn-sm btn-blue" onclick="ADMIN.saveSiteSettings()">&#x1F4BE; 保存设置</button>
              <button class="btn-sm btn-gray" onclick="ADMIN.resetSiteSettings()">&#x21BA; 恢复默认</button>
            </div>
            <div class="prod-hint" style="margin-top:4px;">修改城市列表、励志文案和操作技巧后，刷新首页即可生效。每行一条，城市格式为"中文名,英文名"。</div>
            <div id="admin-sitesettings-content"></div>
          </div>
        </div>
      </main>
    </div>

    <!-- 创建/编辑用户模态框 -->
    <div class="amodal" id="amodal-user" style="display:none">
      <div class="amodal-box">
        <div class="amodal-title" id="amodal-user-title">新建用户</div>
        <input type="hidden" id="edit-uid" />
        <div class="form-item">
          <label>用户名</label>
          <input type="text" id="edit-username" placeholder="登录用户名" />
        </div>
        <div class="form-item">
          <label>显示名称</label>
          <input type="text" id="edit-displayname" placeholder="显示名称" />
        </div>
        <div class="form-item">
          <label id="amodal-user-label-pwd">密码（留空不修改）</label>
          <input type="password" id="edit-password" placeholder="留空不修改" />
        </div>
        <div class="form-item">
          <label>角色</label>
          <select id="edit-role">
            <option value="user">普通用户</option>
            <option value="admin">管理员</option>
          </select>
        </div>
        <div id="amodal-user-err" class="error-msg" style="display:none;margin-top:8px"></div>
        <div class="amodal-btns">
          <button class="btn-sm btn-gray" onclick="ADMIN.closeModal('amodal-user')">取消</button>
          <button class="btn-sm btn-blue" onclick="ADMIN.saveUser()">保存</button>
        </div>
      </div>
    </div>

    <!-- 大类设置模态框 -->
    <div class="amodal" id="amodal-category" style="display:none">
      <div class="amodal-box">
        <div class="amodal-title" id="amodal-category-title">大类设置</div>
        <input type="hidden" id="edit-cat-idx" />
        <div class="form-item">
          <label>数据 Key（不可修改）</label>
          <input type="text" id="edit-cat-key" readonly style="opacity:.6" />
        </div>
        <div class="form-item">
          <label>显示名称</label>
          <input type="text" id="edit-cat-name" placeholder="如：储能柜" />
        </div>
        <div class="form-item">
          <label>备注说明</label>
          <input type="text" id="edit-cat-remark" placeholder="如：一体式储能系统" />
        </div>
        <div class="form-item">
          <label>关联配置区块ID（留空=不显示在配置页）</label>
          <input type="text" id="edit-cat-blockId" placeholder="如：block-sts" />
        </div>
        <div class="form-item">
          <label>区块标题</label>
          <input type="text" id="edit-cat-blockLabel" placeholder="如：STS柜配置" />
        </div>
        <div class="form-item">
          <label>区块序号（如 ⑩）</label>
          <input type="text" id="edit-cat-blockNum" placeholder="如：⑫" />
        </div>
        <div class="form-item" style="flex-direction:row;align-items:center;gap:10px">
          <input type="checkbox" id="edit-cat-hasQty" style="width:auto" />
          <label for="edit-cat-hasQty" style="margin:0">是否有数量输入</label>
        </div>
        <div class="form-item" style="flex-direction:row;align-items:center;gap:10px">
          <input type="checkbox" id="edit-cat-hasRemark" style="width:auto" />
          <label for="edit-cat-hasRemark" style="margin:0">产品是否有备注字段</label>
        </div>
        <div class="amodal-btns">
          <button class="btn-sm btn-gray" onclick="ADMIN.closeModal('amodal-category')">取消</button>
          <button class="btn-sm btn-red" id="cat-delete-btn" style="display:none" onclick="ADMIN.deleteCategory()">删除大类</button>
          <button class="btn-sm btn-blue" onclick="ADMIN.saveCategory()">保存</button>
        </div>
      </div>
    </div>

    <!-- 新增大类模态框 -->
    <div class="amodal" id="amodal-category-new" style="display:none">
      <div class="amodal-box">
        <div class="amodal-title">新增大类</div>
        <div class="form-item">
          <label>数据 Key（英文，如 transformers）</label>
          <input type="text" id="new-cat-key" placeholder="如：inverters" oninput="this.value=this.value.replace(/[^a-zA-Z]/g,'')" />
        </div>
        <div class="form-item">
          <label>显示名称</label>
          <input type="text" id="new-cat-name" placeholder="如：逆变器" />
        </div>
        <div class="form-item">
          <label>备注说明</label>
          <input type="text" id="new-cat-remark" placeholder="备注说明" />
        </div>
        <div class="form-item">
          <label>关联配置区块ID（留空=不显示在配置页）</label>
          <input type="text" id="new-cat-blockId" placeholder="如：block-inv" />
        </div>
        <div class="form-item">
          <label>区块标题</label>
          <input type="text" id="new-cat-blockLabel" placeholder="如：逆变器配置" />
        </div>
        <div class="form-item">
          <label>区块序号</label>
          <input type="text" id="new-cat-blockNum" placeholder="如：⑫" />
        </div>
        <div class="form-item" style="flex-direction:row;align-items:center;gap:10px">
          <input type="checkbox" id="new-cat-hasQty" style="width:auto" />
          <label for="new-cat-hasQty" style="margin:0">是否有数量输入</label>
        </div>
        <div class="form-item" style="flex-direction:row;align-items:center;gap:10px">
          <input type="checkbox" id="new-cat-hasRemark" style="width:auto" />
          <label for="new-cat-hasRemark" style="margin:0">产品是否有备注字段</label>
        </div>
        <div class="amodal-btns">
          <button class="btn-sm btn-gray" onclick="ADMIN.closeModal('amodal-category-new')">取消</button>
          <button class="btn-sm btn-blue" onclick="ADMIN.saveNewCategory()">创建</button>
        </div>
      </div>
    </div>`;
  }

  // ── 主题 ──────────────────────────────────────────────────
  function applyTheme() {
    var s = STORAGE.get('settings') || {};
    const theme = s.theme || 'dark';
    document.body.className = theme;
    const btn = document.getElementById('adminThemeToggle');
    if (btn) btn.textContent = theme === 'dark' ? '\u2600' : '\uD83C\uDF19';
  }

  function toggleTheme() {
    const isDark = document.body.classList.contains('dark');
    const next = isDark ? 'light' : 'dark';
    document.body.className = next;
    var s = STORAGE.get('settings') || {};
    s.theme = next;
    STORAGE.set('settings', s);
    const btn = document.getElementById('adminThemeToggle');
    if (btn) btn.textContent = next === 'dark' ? '\u2600' : '\uD83C\uDF19';
  }

  function toggleSidebar() {
    var sidebar = document.querySelector('.admin-sidebar');
    if (!sidebar) return;
    var isCollapsed = sidebar.classList.toggle('collapsed');
    localStorage.setItem('ess_admin_sidebar_collapsed', isCollapsed ? '1' : '0');
  }

  function backToMain() {
    window.location.href = 'index.html';
  }

  // ── Tab 切换 ──────────────────────────────────────────────
  function switchTab(name) {
    currentTab = name;
    // 侧边栏高亮
    document.querySelectorAll('.side-item').forEach(el => el.classList.remove('active'));
    const sideItem = document.querySelector('.side-item[data-tab="' + name + '"]');
    if (sideItem) sideItem.classList.add('active');
    // 内容区切换
    document.querySelectorAll('.atab-pane').forEach(el => el.classList.remove('active'));
    const pane = document.getElementById('atab-' + name);
    if (pane) pane.classList.add('active');
    // 标题
    const titles = { users: '用户管理', products: '产品编码', reqfields: '需求模块配置', projects: '项目管理', topology: '拓扑方案管理', complib: '拓扑元件库管理', sitesettings: '站点设置' };
    document.getElementById('topbar-title').textContent = titles[name] || '';
    // 加载数据
    if (name === 'users')    renderUserList();
    if (name === 'products') {
      const sel = document.getElementById('prod-category');
      if (sel && sel.options.length === 0 && typeof DATA !== 'undefined') {
        const cats = getCategoryRegistry();
        cats.forEach(cat => {
          const opt = document.createElement('option');
          opt.value = cat.key;
          opt.textContent = cat.name;
          sel.appendChild(opt);
        });
      }
      toggleProductEdit(false);
    }
    if (name === 'reqfields') renderReqFieldList();
    if (name === 'projects') renderProjectList();
    if (name === 'topology') { _syncStoredComponentsToLib(); renderTopoAdminList(); }
    if (name === 'complib') {
      const container = document.getElementById('complib-container');
      if (container) container.innerHTML = COMPONENT_LIB_ADMIN.renderCompLibPane();
    }
    if (name === 'sitesettings') renderSiteSettings();
  }

  // ── 用户管理 ──────────────────────────────────────────────
  function renderUserList() {
    const users = AUTH.getUsers();
    const session = AUTH.getSession();
    let html = `<table class="admin-table"><thead><tr>
      <th>用户名</th><th>显示名称</th><th>角色</th><th>操作</th>
    </tr></thead><tbody>`;
    users.forEach(u => {
      const isMe = session && session.userId === u.id;
      html += `<tr>
        <td><b>${u.username}</b>${isMe ? ' <span class="tag-me">我</span>' : ''}</td>
        <td>${u.displayName}</td>
        <td><span class="role-tag ${u.role}">${u.role === 'admin' ? '管理员' : '普通用户'}</span></td>
        <td>
          <button class="btn-sm btn-blue" onclick="ADMIN.showEditUser('${u.id}')">编辑</button>
          ${!isMe ? `<button class="btn-sm btn-red" onclick="ADMIN.deleteUser('${u.id}')">删除</button>` : ''}
        </td>
      </tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('admin-user-list').innerHTML = html;
  }

  function showCreateUser() {
    document.getElementById('edit-uid').value = '';
    document.getElementById('edit-username').value = '';
    document.getElementById('edit-displayname').value = '';
    document.getElementById('edit-password').value = '';
    document.getElementById('edit-role').value = 'user';
    document.getElementById('amodal-user-title').textContent = '新建用户';
    document.getElementById('edit-username').removeAttribute('readonly');
    document.getElementById('amodal-user-err').style.display = 'none';
    document.getElementById('amodal-user').style.display = 'flex';
    document.getElementById('amodal-user-label-pwd').textContent = '设置密码';
    document.getElementById('edit-password').placeholder = '请输入密码';
  }

  function showEditUser(id) {
    const user = AUTH.getUsers().find(u => u.id === id);
    if (!user) return;
    document.getElementById('edit-uid').value = id;
    document.getElementById('edit-username').value = user.username;
    document.getElementById('edit-displayname').value = user.displayName;
    document.getElementById('edit-password').value = '';
    document.getElementById('edit-role').value = user.role;
    document.getElementById('amodal-user-title').textContent = '编辑用户';
    document.getElementById('edit-username').setAttribute('readonly', true);
    document.getElementById('amodal-user-err').style.display = 'none';
    document.getElementById('amodal-user-label-pwd').textContent = '新密码（留空不修改）';
    document.getElementById('edit-password').placeholder = '留空不修改';
    document.getElementById('amodal-user').style.display = 'flex';
  }

  async function saveUser() {
    const uid = document.getElementById('edit-uid').value;
    const username    = document.getElementById('edit-username').value.trim();
    const displayName = document.getElementById('edit-displayname').value.trim();
    const password    = document.getElementById('edit-password').value;
    const role        = document.getElementById('edit-role').value;
    const errEl       = document.getElementById('amodal-user-err');
    errEl.style.display = 'none';

    let result;
    if (uid) {
      result = await AUTH.updateUser(uid, { displayName, password, role });
    } else {
      if (!username) { errEl.textContent = '用户名必填'; errEl.style.display = 'block'; return; }
      if (!password) { errEl.textContent = '请设置密码'; errEl.style.display = 'block'; return; }
      result = await AUTH.createUser({ username, password, role, displayName });
    }
    if (!result.ok) { errEl.textContent = result.msg; errEl.style.display = 'block'; return; }
    closeModal('amodal-user');
    renderUserList();
  }

  function deleteUser(id) {
    const r = AUTH.deleteUser(id);
    if (!r.ok) { alert(r.msg); return; }
    renderUserList();
  }

  // ── 产品管理 ──────────────────────────────────────────────
  function getEditableData() {
    var pData = STORAGE.get('products') || {};
    return pData.products ? JSON.parse(JSON.stringify(pData.products)) : JSON.parse(JSON.stringify(DATA));
  }

  var _productEditMode = false;

  function toggleProductEdit(isEdit) {
    _productEditMode = isEdit;
    var viewIds = ['prod-edit-btn'];
    var editIds = ['prod-catset-btn','prod-newcat-btn','prod-newprod-btn','prod-save-btn','prod-cancel-btn'];
    viewIds.forEach(function(id){ var el=document.getElementById(id); if(el) el.style.display=isEdit?'none':''; });
    editIds.forEach(function(id){ var el=document.getElementById(id); if(el) el.style.display=isEdit?'':"none"; });
    renderProductList();
  }

  function renderProductList() {
    const cat  = document.getElementById('prod-category').value;
    const data = getEditableData();
    const list = data[cat] || [];
    const cats = getCategoryRegistry();
    const catInfo = cats.find(c => c.key === cat) || {};
    const showRemark = catInfo.hasRemark || false;
    const isEdit = _productEditMode;

    let html = `<div id="prod-rows">`;
    list.forEach((item, i) => {
      var codeVal = (item.code||'').replace(/"/g,'&quot;');
      var descVal = (item.desc||'').replace(/"/g,'&quot;');
      var remarkVal = (item.remark||'').replace(/"/g,'&quot;');
      if (isEdit) {
        html += `<div class="prod-row" data-idx="${i}">
          <input type="text" class="prod-code" value="${codeVal}" placeholder="产品编码" style="width:160px;flex-shrink:0" oninput="this.value=this.value.replace(/[^a-zA-Z0-9]/g,'')" />
          <input type="text" class="prod-desc" value="${descVal}" placeholder="产品描述" style="flex:1" />
          ${showRemark ? `<input type="text" class="prod-remark" value="${remarkVal}" placeholder="备注" style="width:180px;flex-shrink:0" />` : ''}
          <button class="btn-sm btn-red" onclick="ADMIN.removeProduct(${i})">删除</button>
        </div>`;
      } else {
        html += `<div class="prod-row prod-row-view" data-idx="${i}">
          <span class="prod-code-view">${codeVal||'<i style="color:rgba(255,255,255,.2)">—</i>'}</span>
          <span class="prod-desc-view">${descVal||'<i style="color:rgba(255,255,255,.2)">—</i>'}</span>
          ${showRemark ? `<span class="prod-remark-view">${remarkVal||'<i style="color:rgba(255,255,255,.2)">—</i>'}</span>` : ''}
        </div>`;
      }
    });
    html += '</div>';
    document.getElementById('admin-prod-list').innerHTML = html;
  }

  function addProduct() {
    if (!_productEditMode) { alert('请先点击「编辑」进入编辑模式'); return; }
    const container = document.getElementById('prod-rows');
    if (!container) return;
    const cat = document.getElementById('prod-category').value;
    const cats = getCategoryRegistry();
    const catInfo = cats.find(c => c.key === cat) || {};
    const showRemark = catInfo.hasRemark || false;

    const div = document.createElement('div');
    div.className = 'prod-row prod-row-new';
    div.innerHTML = `
      <input type="text" class="prod-code" placeholder="产品编码" style="width:160px;flex-shrink:0" oninput="this.value=this.value.replace(/[^a-zA-Z0-9]/g,'')" />
      <input type="text" class="prod-desc" placeholder="产品描述" style="flex:1" />
      ${showRemark ? '<input type="text" class="prod-remark" placeholder="备注" style="width:180px;flex-shrink:0" />' : ''}
      <button class="btn-sm btn-red" onclick="this.parentElement.remove()">删除</button>`;
    container.insertBefore(div, container.firstChild);
    setTimeout(() => {
      div.scrollIntoView({behavior:'smooth',block:'center'});
      div.style.background = 'rgba(39,174,96,.15)';
      div.style.borderRadius = '8px';
      div.style.padding = '6px';
      div.style.transition = 'background .8s';
      setTimeout(() => { div.style.background = ''; div.style.padding = ''; }, 1500);
    }, 100);
    setTimeout(() => {
      const codeInput = div.querySelector('.prod-code');
      if (codeInput) codeInput.focus();
    }, 200);
  }

  function removeProduct(idx) {
    const rows = document.querySelectorAll('#prod-rows .prod-row');
    if (rows[idx]) rows[idx].remove();
  }

  function saveProducts() {
    const cat  = document.getElementById('prod-category').value;
    const data = getEditableData();
    const rows = document.querySelectorAll('#prod-rows .prod-row');
    const cats = getCategoryRegistry();
    const catInfo = cats.find(c => c.key === cat) || {};
    const showRemark = catInfo.hasRemark || false;

    data[cat] = Array.from(rows).map(row => {
      const item = {
        code: row.querySelector('.prod-code').value.trim(),
        desc: row.querySelector('.prod-desc').value.trim(),
      };
      if (showRemark) {
        const remarkEl = row.querySelector('.prod-remark');
        item.remark = remarkEl ? remarkEl.value.trim() : '';
      }
      return item;
    }).filter(item => item.code);
    _flushProducts(data);
    Object.assign(DATA, data);
    _refreshProductCodeMap(); // 刷新拓扑编辑器的产品编码查找表
    toggleProductEdit(false);
    alert('✅ 产品数据已保存！');
  }

  // ── 大类管理 ──────────────────────────────────────────────
  function showEditCategory() {
    const sel = document.getElementById('prod-category');
    if (!sel || !sel.value) { alert('请先选择一个产品大类'); return; }
    const cats = getCategoryRegistry();
    const idx = cats.findIndex(c => c.key === sel.value);
    if (idx < 0) return;
    const cat = cats[idx];

    document.getElementById('edit-cat-idx').value = idx;
    document.getElementById('edit-cat-key').value = cat.key;
    document.getElementById('edit-cat-name').value = cat.name;
    document.getElementById('edit-cat-remark').value = cat.remark || '';
    document.getElementById('edit-cat-blockId').value = cat.blockId || '';
    document.getElementById('edit-cat-blockLabel').value = cat.blockLabel || '';
    document.getElementById('edit-cat-blockNum').value = cat.blockNum || '';
    document.getElementById('edit-cat-hasQty').checked = !!cat.hasQtyInput;
    document.getElementById('edit-cat-hasRemark').checked = !!cat.hasRemark;
    document.getElementById('cat-delete-btn').style.display = 'inline-block';
    document.getElementById('amodal-category-title').textContent = '大类设置 — ' + cat.name;
    document.getElementById('amodal-category').style.display = 'flex';
  }

  function saveCategory() {
    const idx = parseInt(document.getElementById('edit-cat-idx').value);
    const cats = getCategoryRegistry();
    if (idx < 0 || idx >= cats.length) return;

    cats[idx].name = document.getElementById('edit-cat-name').value.trim() || cats[idx].name;
    cats[idx].remark = document.getElementById('edit-cat-remark').value.trim();
    cats[idx].blockId = document.getElementById('edit-cat-blockId').value.trim() || null;
    cats[idx].blockLabel = document.getElementById('edit-cat-blockLabel').value.trim() || null;
    cats[idx].blockNum = document.getElementById('edit-cat-blockNum').value.trim() || null;
    cats[idx].hasQtyInput = document.getElementById('edit-cat-hasQty').checked;
    cats[idx].hasRemark = document.getElementById('edit-cat-hasRemark').checked;

    _flushProducts(undefined, cats);
    DATA.categoryRegistry = cats;
    closeModal('amodal-category');

    // 刷新下拉框
    const sel = document.getElementById('prod-category');
    if (sel) {
      const curVal = sel.value;
      sel.innerHTML = '';
      cats.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.key; opt.textContent = cat.name;
        sel.appendChild(opt);
      });
      sel.value = curVal;
    }
    alert('✅ 大类设置已保存！');
    renderProductList();
  }

  function deleteCategory() {
    const idx = parseInt(document.getElementById('edit-cat-idx').value);
    const cats = getCategoryRegistry();
    if (idx < 0 || idx >= cats.length) return;
    if (!confirm(`确定删除大类「${cats[idx].name}」及其所有产品数据？此操作不可撤销。`)) return;

    // 从 DATA 中删除对应属性
    const key = cats[idx].key;
    const data = getEditableData();
    if (data[key]) delete data[key];
    _flushProducts(data);
    Object.assign(DATA, data);

    // 从 registry 中删除
    cats.splice(idx, 1);
    _flushProducts(undefined, cats);
    DATA.categoryRegistry = cats;
    closeModal('amodal-category');

    // 刷新下拉框
    const sel = document.getElementById('prod-category');
    if (sel) {
      sel.innerHTML = '';
      cats.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.key; opt.textContent = cat.name;
        sel.appendChild(opt);
      });
    }
    renderProductList();
  }

  function showNewCategory() {
    document.getElementById('new-cat-key').value = '';
    document.getElementById('new-cat-name').value = '';
    document.getElementById('new-cat-remark').value = '';
    document.getElementById('new-cat-blockId').value = '';
    document.getElementById('new-cat-blockLabel').value = '';
    document.getElementById('new-cat-blockNum').value = '';
    document.getElementById('new-cat-hasQty').checked = false;
    document.getElementById('new-cat-hasRemark').checked = false;
    document.getElementById('amodal-category-new').style.display = 'flex';
  }

  function saveNewCategory() {
    const key  = document.getElementById('new-cat-key').value.trim().toLowerCase();
    const name = document.getElementById('new-cat-name').value.trim();
    if (!key)  { alert('请输入数据 Key（英文）'); return; }
    if (!name) { alert('请输入显示名称'); return; }

    const cats = getCategoryRegistry();
    if (cats.find(c => c.key === key)) { alert('该 Key 已存在，请换一个'); return; }

    cats.push({
      key: key,
      name: name,
      blockId: document.getElementById('new-cat-blockId').value.trim() || null,
      blockLabel: document.getElementById('new-cat-blockLabel').value.trim() || null,
      blockNum: document.getElementById('new-cat-blockNum').value.trim() || null,
      remark: document.getElementById('new-cat-remark').value.trim(),
      hasQtyInput: document.getElementById('new-cat-hasQty').checked,
      hasRemark: document.getElementById('new-cat-hasRemark').checked,
    });

    // 在 DATA 中创建空数组
    const data = getEditableData();
    if (!data[key]) data[key] = [];
    _flushProducts(data);
    Object.assign(DATA, data);

    _flushProducts(undefined, cats);
    DATA.categoryRegistry = cats;
    closeModal('amodal-category-new');

    // 刷新下拉框
    const sel = document.getElementById('prod-category');
    if (sel) {
      sel.innerHTML = '';
      cats.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.key; opt.textContent = cat.name;
        sel.appendChild(opt);
      });
      sel.value = key;
    }
    renderProductList();
    alert('✅ 新大类「' + name + '」已创建！');
  }

  // ── 需求模块配置 ──────────────────────────────────────────
  function renderReqFieldList() {
    const fields = getReqFieldRegistry();
    const cats = getCategoryRegistry();

    const sectionNames = { A: 'A. 基本信息', B: 'B. 并网与电气需求', C: 'C. 网络与监控', D: 'D. 外观与其他' };
    const sections = ['A','B','C','D'];

    let html = '';
    sections.forEach(sec => {
      const secFields = fields.filter(f => f.section === sec);
      if (!secFields.length) return;
      html += `<div style="margin-bottom:20px"><h3 style="color:#64b4ff;margin-bottom:10px;font-size:15px">${sectionNames[sec]}</h3>`;
      secFields.forEach((f, i) => {
        const globalIdx = fields.indexOf(f);
        html += renderReqFieldCard(f, globalIdx, cats);
      });
      html += '</div>';
    });

    document.getElementById('admin-reqfield-list').innerHTML = html;
  }

  function renderReqFieldCard(f, idx, cats) {
    const typeOpts = ['text', 'select', 'textarea'];
    let typeHTML = '';
    typeOpts.forEach(t => {
      typeHTML += `<option value="${t}" ${f.type === t ? 'selected' : ''}>${t === 'text' ? '文本框' : t === 'select' ? '下拉选择' : '多行文本'}</option>`;
    });

    let catOpts = '<option value="">-- 不关联 --</option>';
    cats.forEach(c => {
      catOpts += `<option value="${c.key}" ${f.linkedCategory === c.key ? 'selected' : ''}>${c.name}</option>`;
    });

    let blockOpts = '<option value="">-- 不关联 --</option>';
    cats.filter(c => c.blockId).forEach(c => {
      blockOpts += `<option value="${c.blockId}" ${f.linkedBlockId === c.blockId ? 'selected' : ''}>${c.blockLabel || c.name} (${c.blockId})</option>`;
    });

    const optsText = f.options ? f.options.join('\n') : '';
    const noDropdown = (f.type === 'text' || f.type === 'textarea');

    return /*html*/`
    <div class="rf-card" data-type="${f.type}" style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:16px;margin-bottom:10px">
      <div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap">
        <div class="form-item" style="flex:1;min-width:200px">
          <label>显示标签</label>
          <input type="text" class="rf-label" value="${f.label}" />
        </div>
        <div class="form-item" style="width:120px">
          <label>类型</label>
          <select class="rf-type" onchange="ADMIN.onRfTypeChange(this)">${typeHTML}</select>
        </div>
        <div class="form-item" style="width:140px">
          <label>所属区块</label>
          <select class="rf-section">
            <option value="A" ${f.section==='A'?'selected':''}>A. 基本信息</option>
            <option value="B" ${f.section==='B'?'selected':''}>B. 电气需求</option>
            <option value="C" ${f.section==='C'?'selected':''}>C. 网络监控</option>
            <option value="D" ${f.section==='D'?'selected':''}>D. 外观其他</option>
          </select>
        </div>
      </div>
      <div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap;margin-top:8px">
        <div class="form-item rf-options-wrap" style="flex:1;min-width:200px${noDropdown ? ';display:none' : ''}">
          <label>下拉选项（一行一个）</label>
          <textarea class="rf-options" rows="3" placeholder="一行一个选项&#10;如：&#10;需要&#10;不需要">${optsText}</textarea>
        </div>
        <div class="form-item rf-default-wrap" style="flex:1;min-width:150px${noDropdown ? ';display:none' : ''}">
          <label>默认值</label>
          <input type="text" class="rf-default" value="${(f.defaultValue||'').replace(/"/g,'&quot;')}" />
        </div>
        <div class="form-item" style="flex:1;min-width:150px">
          <label>关联产品大类</label>
          <select class="rf-linkedCat">${catOpts}</select>
        </div>
        <div class="form-item" style="flex:1;min-width:150px">
          <label>关联配置区块</label>
          <select class="rf-linkedBlock">${blockOpts}</select>
        </div>
      </div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:8px">
        <div class="form-item" style="flex:1;min-width:150px">
          <label>隐藏条件（匹配值时隐藏区块）</label>
          <input type="text" class="rf-hiddenOn" value="${f.hiddenOn||''}" placeholder="如：不需要 或 !4G路由" />
        </div>
        <div style="display:flex;gap:12px;align-items:center;margin-top:18px">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
            <input type="checkbox" class="rf-showInReq" ${f.showInReq ? 'checked' : ''} /> 需求表显示
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
            <input type="checkbox" class="rf-isLinked" ${f.isLinked ? 'checked' : ''} /> 联动标签
          </label>
        </div>
      </div>
    </div>`;
  }

  function onRfTypeChange(sel) {
    const card = sel.closest('.rf-card');
    const noDropdown = (sel.value === 'text' || sel.value === 'textarea');
    const optsWrap = card.querySelector('.rf-options-wrap');
    const defWrap = card.querySelector('.rf-default-wrap');
    if (optsWrap) optsWrap.style.display = noDropdown ? 'none' : '';
    if (defWrap) defWrap.style.display = noDropdown ? 'none' : '';
    card.setAttribute('data-type', sel.value);
  }

  async function saveReqFields() {
    const fields = getReqFieldRegistry();
    const cards = document.querySelectorAll('.rf-card');

    cards.forEach((card, i) => {
      if (i >= fields.length) return;
      fields[i].label = card.querySelector('.rf-label').value.trim() || fields[i].label;
      fields[i].type = card.querySelector('.rf-type').value;
      fields[i].section = card.querySelector('.rf-section').value;
      const optsRaw = card.querySelector('.rf-options')?.value.trim() || '';
      fields[i].options = optsRaw ? optsRaw.split('\n').map(s => s.trim()).filter(s => s) : null;
      fields[i].defaultValue = card.querySelector('.rf-default')?.value.trim() || '';
      fields[i].linkedCategory = card.querySelector('.rf-linkedCat').value || null;
      fields[i].linkedBlockId = card.querySelector('.rf-linkedBlock').value || null;
      fields[i].hiddenOn = card.querySelector('.rf-hiddenOn').value.trim() || null;
      fields[i].showInReq = card.querySelector('.rf-showInReq').checked;
      fields[i].isLinked = card.querySelector('.rf-isLinked').checked;
      // 文本框/多行文本类型不需要 options 和 defaultValue
      if (fields[i].type === 'text' || fields[i].type === 'textarea') {
        fields[i].options = null;
        fields[i].defaultValue = '';
      }
    });

    // 更新内存数据
    DATA.reqFieldRegistry = fields;

    // 生成 custom-config.js 文件内容
    const fileContent = generateCustomConfigJS(fields);

    // 优先使用 File System Access API 直接写文件（Chrome/Edge 支持）
    if (window.showSaveFilePicker) {
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: 'custom-config.js',
          startIn: 'desktop',
          types: [{ description: 'JavaScript File', accept: { 'application/javascript': ['.js'] } }]
        });
        const writable = await fileHandle.createWritable();
        await writable.write(fileContent);
        await writable.close();
        alert('✅ 已直接保存到你选择的位置！\n\n请确保保存到项目 data/ 文件夹中，覆盖旧的 custom-config.js。\n刷新页面后生效。');
        return;
      } catch (e) {
        if (e.name === 'AbortError') return; // 用户取消，不执行下载
      }
    }

    // 降级：触发下载（不支持 File System Access API 的浏览器）
    const blob = new Blob([fileContent], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'custom-config.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // 清理旧的 localStorage reqFields 数据
    const p = STORAGE.get('products') || {};
    if (p.reqFields) {
      delete p.reqFields;
      STORAGE.set('products', p);
    }

    alert('✅ 配置已导出！\n\n请将下载的 custom-config.js 文件放入 data/ 文件夹，覆盖旧文件。\n更换电脑时，携带此文件即可保留配置。');
  }

  function generateCustomConfigJS(fields) {
    const fieldsJSON = JSON.stringify(fields, null, 2);
    return `// data/custom-config.js
// 自定义需求字段配置（由管理后台导出）
// 此文件覆盖 js/data.js 中的默认 DATA.reqFieldRegistry
// 将此文件放入 data/ 目录后，应用会自动加载

(function() {
  if (typeof DATA === 'undefined') return;

  // 自定义需求字段注册表
  // 格式与 js/data.js 中的 DATA.reqFieldRegistry 完全一致
  DATA.reqFieldRegistry = ${fieldsJSON};
})();
`;
  }

  async function resetReqFields() {
    if (!confirm('确定恢复默认配置？\n\n⚠️ 本次所有未保存的修改将被放弃，恢复到 data.js 中的初始默认值。')) return;
    // 生成空的 custom-config.js（重置为默认）
    const resetContent = `// data/custom-config.js
// 自定义需求字段配置（由管理后台导出）
// 此文件覆盖 js/data.js 中的默认 DATA.reqFieldRegistry
// 将此文件放入 data/ 目录后，应用会自动加载
//
// 当前为默认状态，使用 data.js 中的默认值。
`;

    // 优先使用 File System Access API 直接写文件
    if (window.showSaveFilePicker) {
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: 'custom-config.js',
          startIn: 'desktop',
          types: [{ description: 'JavaScript File', accept: { 'application/javascript': ['.js'] } }]
        });
        const writable = await fileHandle.createWritable();
        await writable.write(resetContent);
        await writable.close();
        alert('✅ 已保存重置文件！\n\n请确保覆盖了项目 data/ 文件夹中的 custom-config.js，然后刷新页面。');
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }

    // 降级：触发下载
    const blob = new Blob([resetContent], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'custom-config.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // 清理旧的 localStorage reqFields 数据
    const p = STORAGE.get('products') || {};
    if (p.reqFields) {
      delete p.reqFields;
      STORAGE.set('products', p);
    }

    alert('✅ 已生成重置文件！\n\n请将下载的 custom-config.js 放入 data/ 文件夹覆盖旧文件，然后刷新页面即可恢复默认配置。');
  }

  // ── 项目管理 ──────────────────────────────────────────────
  function renderProjectList() {
    const projects = AUTH.getProjects();
    const users    = AUTH.getUsers();
    const uidToName = {};
    users.forEach(u => { uidToName[u.id] = u.displayName; });

    if (!projects.length) {
      document.getElementById('admin-proj-list').innerHTML = '<p style="color:#718096;padding:16px">暂无项目</p>';
      return;
    }
    let html = `<table class="admin-table"><thead><tr>
      <th>项目名称</th><th>创建人</th><th>储能柜数量</th><th>创建时间</th><th>操作</th>
    </tr></thead><tbody>`;
    projects.forEach(p => {
      html += `<tr>
        <td><b>${p.projectName || '未命名'}</b></td>
        <td>${uidToName[p.ownerId] || p.ownerId}</td>
        <td>${p.cabinetCount || '—'} 台</td>
        <td>${p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</td>
        <td><button class="btn-sm btn-red" onclick="ADMIN.deleteProject('${p.id}')">删除</button></td>
      </tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('admin-proj-list').innerHTML = html;
  }

  function deleteProject(id) {
    if (!confirm('确定删除该项目？')) return;
    AUTH.deleteProject(id);
    renderProjectList();
  }

  function importProjects(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const r = AUTH.importProjects(e.target.result);
      alert(r.ok ? `✅ 成功导入 ${r.count} 个项目` : '❌ ' + r.msg);
      renderProjectList();
    };
    reader.readAsText(file);
  }

  // ── 拓扑方案管理 ──────────────────────────────────────────
  var TOPO_DEFAULTS = [
    {
      id: 't1', badge: '场景 1', badgeClass: 'green', code: 'top#1',
      title: '高供高计 · 低压并网 · 低压防逆流 · 单台变压器配储并消纳',
      infoBlocks: [
        { icon: '📋', title: '应用信息', items: [
          { label: '客户特征', text: '自有单台变压器，变压器内共享单台/多台储能' },
          { label: '运营模式', text: '电价峰谷套利' },
          { label: '接入条件', text: '谷电价时段，变压器有足够余量为储能电池蓄能；峰电价时段，客户负载可有效消耗储能电池能量。' }
        ]},
        { icon: '🔌', title: '电表安装', items: [
          { label: '1#电表', text: '低压防逆流 / 变压器防过载', note: '安装点：变压器0.4kV出线总开关' },
          { label: '2#电表', text: '储能并网点关口计量表', note: '安装点：储能0.4kV并网柜' }
        ]}
      ],
      gridClass: 'topo-grid-2',
      diagramSvg: '<svg viewBox=\"0 0 800 320\" xmlns=\"http://www.w3.org/2000/svg\"><rect x=\"20\" y=\"30\" width=\"100\" height=\"28\" rx=\"5\" fill=\"rgba(231,76,60,0.15)\" stroke=\"#E74C3C\" stroke-width=\"1.5\"/><text x=\"70\" y=\"49\" text-anchor=\"middle\" font-size=\"11\" font-weight=\"700\" fill=\"#E74C3C\">10kV 进线</text><line x1=\"120\" y1=\"44\" x2=\"170\" y2=\"44\" stroke=\"rgba(0,0,0,0.5)\" stroke-width=\"4\" stroke-linecap=\"round\"/><circle cx=\"195\" cy=\"44\" r=\"24\" fill=\"rgba(59,155,219,0.12)\" stroke=\"#3B9BDB\" stroke-width=\"2\"/><text x=\"195\" y=\"49\" text-anchor=\"middle\" font-size=\"10\" font-weight=\"600\" fill=\"#3B9BDB\">变压器</text><line x1=\"219\" y1=\"44\" x2=\"270\" y2=\"44\" stroke=\"rgba(0,0,0,0.5)\" stroke-width=\"4\" stroke-linecap=\"round\"/><rect x=\"270\" y=\"28\" width=\"110\" height=\"32\" rx=\"6\" fill=\"rgba(46,204,113,0.1)\" stroke=\"#27AE60\" stroke-width=\"1.5\"/><text x=\"325\" y=\"49\" text-anchor=\"middle\" font-size=\"11\" font-weight=\"600\" fill=\"#27AE60\">0.4kV 母线</text><line x1=\"380\" y1=\"44\" x2=\"420\" y2=\"44\" stroke=\"rgba(0,0,0,0.25)\" stroke-width=\"2\" fill=\"none\"/><rect x=\"420\" y=\"30\" width=\"60\" height=\"28\" rx=\"5\" fill=\"rgba(0,0,0,0.04)\" stroke=\"rgba(0,0,0,0.25)\" stroke-width=\"1.2\"/><text x=\"450\" y=\"49\" text-anchor=\"middle\" font-size=\"10\" fill=\"#1a1a2e\">总开关</text><line x1=\"450\" y1=\"58\" x2=\"450\" y2=\"95\" stroke=\"rgba(0,0,0,0.25)\" stroke-width=\"2\" fill=\"none\"/><rect x=\"398\" y=\"95\" width=\"104\" height=\"24\" rx=\"5\" fill=\"#FFF3E0\" stroke=\"#E67E22\" stroke-width=\"1.2\"/><text x=\"450\" y=\"111\" text-anchor=\"middle\" font-size=\"10\" font-weight=\"600\" fill=\"#E67E22\">①防逆流/防过载表</text><line x1=\"480\" y1=\"44\" x2=\"520\" y2=\"44\" stroke=\"rgba(0,0,0,0.25)\" stroke-width=\"2\" fill=\"none\"/><rect x=\"520\" y=\"28\" width=\"70\" height=\"32\" rx=\"5\" fill=\"rgba(155,89,182,0.1)\" stroke=\"#8E44AD\" stroke-width=\"1.5\"/><text x=\"555\" y=\"49\" text-anchor=\"middle\" font-size=\"10\" font-weight=\"600\" fill=\"#8E44AD\">并网柜</text><line x1=\"555\" y1=\"60\" x2=\"555\" y2=\"95\" stroke=\"rgba(0,0,0,0.25)\" stroke-width=\"2\" fill=\"none\"/><rect x=\"503\" y=\"95\" width=\"104\" height=\"24\" rx=\"5\" fill=\"#F3E5F5\" stroke=\"#8E44AD\" stroke-width=\"1.2\"/><text x=\"555\" y=\"111\" text-anchor=\"middle\" font-size=\"10\" font-weight=\"600\" fill=\"#8E44AD\">②关口计量表</text><line x1=\"590\" y1=\"44\" x2=\"625\" y2=\"44\" stroke=\"rgba(0,0,0,0.25)\" stroke-width=\"2\" fill=\"none\"/><rect x=\"625\" y=\"22\" width=\"90\" height=\"44\" rx=\"6\" fill=\"rgba(59,155,219,0.1)\" stroke=\"#3B9BDB\" stroke-width=\"1.5\"/><text x=\"670\" y=\"42\" text-anchor=\"middle\" font-size=\"10\" font-weight=\"600\" fill=\"#3B9BDB\">支路控制</text><text x=\"670\" y=\"56\" text-anchor=\"middle\" font-size=\"9\" fill=\"#3B9BDB\">+ EMS主控</text><line x1=\"715\" y1=\"33\" x2=\"740\" y2=\"33\" stroke=\"rgba(0,0,0,0.25)\" stroke-width=\"2\" fill=\"none\"/><rect x=\"740\" y=\"18\" width=\"50\" height=\"52\" rx=\"6\" fill=\"rgba(39,174,96,0.1)\" stroke=\"#27AE60\" stroke-width=\"1.5\"/><text x=\"765\" y=\"40\" text-anchor=\"middle\" font-size=\"9\" font-weight=\"600\" fill=\"#27AE60\">储能柜</text><text x=\"765\" y=\"54\" text-anchor=\"middle\" font-size=\"10\" font-weight=\"600\" fill=\"#27AE60\">×2</text><line x1=\"450\" y1=\"119\" x2=\"555\" y2=\"119\" stroke=\"#E67E22\" stroke-width=\"1.5\" fill=\"none\" stroke-dasharray=\"6 4\"/><line x1=\"555\" y1=\"119\" x2=\"670\" y2=\"119\" stroke=\"#8E44AD\" stroke-width=\"1.5\" fill=\"none\" stroke-dasharray=\"6 4\"/><text x=\"502\" y=\"132\" text-anchor=\"middle\" font-size=\"8\" fill=\"#E67E22\">RS485</text><text x=\"612\" y=\"132\" text-anchor=\"middle\" font-size=\"8\" fill=\"#8E44AD\">RS485</text><rect x=\"20\" y=\"270\" width=\"760\" height=\"40\" rx=\"7\" fill=\"rgba(59,155,219,0.04)\" stroke=\"rgba(59,155,219,0.08)\" stroke-width=\"0.5\"/><text x=\"40\" y=\"295\" font-size=\"11\" fill=\"#555\"><tspan font-weight=\"600\" fill=\"#E67E22\">场景要点：</tspan><tspan>单台变压器内共享储能 · 低压并网 · 防逆流+防过载 · 485线≤500m · 高压表须使能「正向有功总最大需量」</tspan></text></svg>',
      bomTitle: '📦 典型 BOM（2柜方案）',
      bomHeaders: ['类别','物料编码','编码描述','数量','备注'],
      bomRows: [
        ['储能柜','201130006','一体式储能系统 ICB241kWh-120kW-A-G-LF3E','2','—'],
        ['交换机','250040007','VES318 工业级8路网口交换机 DC12-48V','1','导轨式'],
        ['交换机','202800076','电源模块 75W 24V RSP-75-24','1','国内'],
        ['电表','206010103','电表 3*220/380V 3*1.5(6)A 6400i/kbps RS485','1','485线≤500m'],
        ['电表','209060040','互感器 1:1000 5A/5mA 引线1m','3','与工程核实'],
        ['EMS','202310024','监控模块 IMMU2 充电机计费单元-带包材','1','安装于通讯盒'],
        ['EMS','223040023','液晶显示模块 7寸液晶屏','1','—']
      ],
      noteIcon: '⚙️', noteTitle: '配置要点：',
      configNote: '只需在主控上配置EMS管理计划；高压表需使能"正向有功总最大需量"；线缆较长时放电保护值设小、充电参数设大。'
    },
    {
      id: 't2', badge: '场景 2', badgeClass: 'blue', code: 'top#6',
      title: '安装高压防逆流表 · 高供高计 · 低压并网 · 多台变配储跨变压器消纳',
      infoBlocks: [
        { icon: '📋', title: '应用信息', items: [
          { label: '客户特征', text: '自有多台变压器，多变压器下接入多台储能，储能电量可跨变压器消纳' },
          { label: '运营模式', text: '电价峰谷套利' },
          { label: '案例项目', text: '佳霖-畅信纺织' }
        ]},
        { icon: '🔌', title: '电表安装', items: [
          { label: '1#电表', text: '高压防逆流电表', note: '安装点：10kV高压进线开关' },
          { label: 'n-1#电表', text: '变压器防过载', note: '安装点：变压器0.4kV出线总开关' },
          { label: 'n-2#电表', text: '储能并网点关口计量表', note: '安装点：储能0.4kV并网柜' }
        ]}
      ],
      gridClass: 'topo-grid-2',
      diagramSvg: '<svg viewBox=\"0 0 800 340\" xmlns=\"http://www.w3.org/2000/svg\"><rect x=\"20\" y=\"18\" width=\"110\" height=\"28\" rx=\"5\" fill=\"rgba(231,76,60,0.15)\" stroke=\"#E74C3C\" stroke-width=\"1.5\"/><text x=\"75\" y=\"37\" text-anchor=\"middle\" font-size=\"11\" font-weight=\"700\" fill=\"#E74C3C\">10kV 母线</text><line x1=\"130\" y1=\"32\" x2=\"170\" y2=\"32\" stroke=\"rgba(0,0,0,0.5)\" stroke-width=\"4\" stroke-linecap=\"round\"/><rect x=\"130\" y=\"55\" width=\"94\" height=\"22\" rx=\"5\" fill=\"#FFF3E0\" stroke=\"#E67E22\" stroke-width=\"1.2\"/><text x=\"177\" y=\"70\" text-anchor=\"middle\" font-size=\"9\" font-weight=\"600\" fill=\"#E67E22\">①高压防逆流表</text><line x1=\"177\" y1=\"32\" x2=\"177\" y2=\"55\" stroke=\"rgba(0,0,0,0.25)\" stroke-width=\"2\" fill=\"none\"/><line x1=\"170\" y1=\"32\" x2=\"220\" y2=\"32\" stroke=\"rgba(0,0,0,0.5)\" stroke-width=\"4\" stroke-linecap=\"round\"/><circle cx=\"245\" cy=\"32\" r=\"20\" fill=\"rgba(59,155,219,0.1)\" stroke=\"#3B9BDB\" stroke-width=\"1.5\"/><text x=\"245\" y=\"36\" text-anchor=\"middle\" font-size=\"9\" font-weight=\"600\" fill=\"#3B9BDB\">T1</text><line x1=\"265\" y1=\"32\" x2=\"290\" y2=\"32\" stroke=\"rgba(0,0,0,0.5)\" stroke-width=\"4\" stroke-linecap=\"round\"/><rect x=\"275\" y=\"16\" width=\"80\" height=\"24\" rx=\"5\" fill=\"rgba(46,204,113,0.08)\" stroke=\"#27AE60\" stroke-width=\"1\"/><text x=\"315\" y=\"32\" text-anchor=\"middle\" font-size=\"9\" fill=\"#27AE60\">0.4kV母线</text><line x1=\"315\" y1=\"40\" x2=\"315\" y2=\"60\" stroke=\"#E67E22\" stroke-width=\"2\" fill=\"none\"/><rect x=\"270\" y=\"60\" width=\"90\" height=\"20\" rx=\"4\" fill=\"#FFF3E0\" stroke=\"#E67E22\" stroke-width=\"1\"/><text x=\"315\" y=\"74\" text-anchor=\"middle\" font-size=\"8\" fill=\"#E67E22\">n-1# 防过载</text><line x1=\"315\" y1=\"80\" x2=\"315\" y2=\"98\" stroke=\"#8E44AD\" stroke-width=\"2\" fill=\"none\"/><rect x=\"270\" y=\"98\" width=\"90\" height=\"20\" rx=\"4\" fill=\"#F3E5F5\" stroke=\"#8E44AD\" stroke-width=\"1\"/><text x=\"315\" y=\"112\" text-anchor=\"middle\" font-size=\"8\" fill=\"#8E44AD\">n-2# 关口计量</text><line x1=\"335\" y1=\"28\" x2=\"360\" y2=\"28\" stroke=\"rgba(0,0,0,0.25)\" stroke-width=\"2\" fill=\"none\"/><circle cx=\"380\" cy=\"28\" r=\"20\" fill=\"rgba(59,155,219,0.1)\" stroke=\"#3B9BDB\" stroke-width=\"1.5\"/><text x=\"380\" y=\"32\" text-anchor=\"middle\" font-size=\"9\" font-weight=\"600\" fill=\"#3B9BDB\">T2</text><line x1=\"400\" y1=\"28\" x2=\"420\" y2=\"28\" stroke=\"rgba(0,0,0,0.5)\" stroke-width=\"4\" stroke-linecap=\"round\"/><rect x=\"410\" y=\"12\" width=\"68\" height=\"22\" rx=\"5\" fill=\"rgba(46,204,113,0.08)\" stroke=\"#27AE60\" stroke-width=\"1\"/><text x=\"444\" y=\"27\" text-anchor=\"middle\" font-size=\"8\" fill=\"#27AE60\">0.4kV</text><line x1=\"456\" y1=\"24\" x2=\"475\" y2=\"24\" stroke=\"rgba(0,0,0,0.25)\" stroke-width=\"2\" fill=\"none\"/><text x=\"490\" y=\"28\" text-anchor=\"middle\" font-size=\"12\" fill=\"#888\">…</text><line x1=\"500\" y1=\"24\" x2=\"515\" y2=\"24\" stroke=\"rgba(0,0,0,0.25)\" stroke-width=\"2\" fill=\"none\"/><circle cx=\"535\" cy=\"24\" r=\"20\" fill=\"rgba(59,155,219,0.1)\" stroke=\"#3B9BDB\" stroke-width=\"1.5\"/><text x=\"535\" y=\"28\" text-anchor=\"middle\" font-size=\"9\" font-weight=\"600\" fill=\"#3B9BDB\">Tn</text><line x1=\"555\" y1=\"24\" x2=\"580\" y2=\"24\" stroke=\"rgba(0,0,0,0.25)\" stroke-width=\"2\" fill=\"none\"/><line x1=\"315\" y1=\"118\" x2=\"260\" y2=\"155\" stroke=\"rgba(0,0,0,0.2)\" stroke-width=\"2\" fill=\"none\"/><line x1=\"260\" y1=\"155\" x2=\"260\" y2=\"180\" stroke=\"rgba(0,0,0,0.2)\" stroke-width=\"2\" fill=\"none\"/><rect x=\"210\" y=\"180\" width=\"100\" height=\"44\" rx=\"6\" fill=\"rgba(59,155,219,0.1)\" stroke=\"#3B9BDB\" stroke-width=\"1.5\"/><text x=\"260\" y=\"200\" text-anchor=\"middle\" font-size=\"10\" font-weight=\"600\" fill=\"#3B9BDB\">支路控制</text><text x=\"260\" y=\"214\" text-anchor=\"middle\" font-size=\"9\" fill=\"#3B9BDB\">+ EMS主控</text><line x1=\"310\" y1=\"200\" x2=\"400\" y2=\"200\" stroke=\"rgba(0,0,0,0.3)\" stroke-width=\"2.5\" fill=\"none\"/><rect x=\"400\" y=\"178\" width=\"48\" height=\"44\" rx=\"5\" fill=\"rgba(39,174,96,0.1)\" stroke=\"#27AE60\" stroke-width=\"1.5\"/><text x=\"424\" y=\"197\" text-anchor=\"middle\" font-size=\"8\" font-weight=\"600\" fill=\"#27AE60\">储能柜</text><text x=\"424\" y=\"211\" text-anchor=\"middle\" font-size=\"10\" font-weight=\"600\" fill=\"#27AE60\">×16</text><line x1=\"315\" y1=\"74\" x2=\"635\" y2=\"74\" stroke=\"#E67E22\" stroke-width=\"1.5\" fill=\"none\" stroke-dasharray=\"6 4\"/><text x=\"475\" y=\"70\" text-anchor=\"middle\" font-size=\"8\" fill=\"#E67E22\">RS485 通讯线 ≤500m</text><rect x=\"640\" y=\"16\" width=\"140\" height=\"36\" rx=\"7\" fill=\"rgba(155,89,182,0.08)\" stroke=\"#8E44AD\" stroke-width=\"1.2\" stroke-dasharray=\"4 2\"/><text x=\"710\" y=\"31\" text-anchor=\"middle\" font-size=\"10\" font-weight=\"600\" fill=\"#8E44AD\">Infy 云平台</text><text x=\"710\" y=\"45\" text-anchor=\"middle\" font-size=\"8\" fill=\"#8E44AD\">远程监控 EMS</text><line x1=\"640\" y1=\"34\" x2=\"580\" y2=\"34\" stroke=\"#8E44AD\" stroke-width=\"1.5\" fill=\"none\" stroke-dasharray=\"6 4\"/><rect x=\"20\" y=\"290\" width=\"760\" height=\"40\" rx=\"7\" fill=\"rgba(59,155,219,0.04)\" stroke=\"rgba(59,155,219,0.08)\" stroke-width=\"0.5\"/><text x=\"40\" y=\"315\" font-size=\"11\" fill=\"#555\"><tspan font-weight=\"600\" fill=\"#E67E22\">场景要点：</tspan><tspan>多变压器跨变压器消纳 · 高压防逆流 + 低压防过载 · 防逆流使能后不跨变压器放电 · 案例：佳霖-畅信纺织</tspan></text></svg>',
      bomTitle: '📦 典型 BOM（16柜方案）',
      bomHeaders: ['类别','物料编码','编码描述','数量','备注'],
      bomRows: [
        ['储能柜','201130006','一体式储能系统 ICB241kWh-120kW-A-G-LF3E','16','—'],
        ['交换机','250140003','系统用交换机 16口百兆非网管型 DC12-48V','2','导轨式'],
        ['电表','206010103','电表 3*220/380V 3*1.5(6)A 6400i RS485','3','485线≤500m'],
        ['电表','209060040','互感器 1:1000 5A/5mA 引线1m','9','与工程核实'],
        ['EMS','202310024','监控模块 IMMU2','3','安装于通讯盒']
      ],
      noteIcon: '⚙️', noteTitle: '配置要点：',
      configNote: '主控配置EMS管理计划 + 各支路主控需配置防逆流使能；防逆流使能后不会跨变压器放电，不使能则可跨变压器使用。'
    },
    {
      id: 't3', badge: '场景 3', badgeClass: 'orange', code: 'top#7',
      title: '未安装高压防逆流表 · 多支路辅助表防逆流 · 多台变配储跨变压器消纳',
      infoBlocks: [
        { icon: '📋', title: '应用信息', items: [
          { label: '客户特征', text: '自有多台变压器，多变压器下可接入储能，电量可跨变压器消纳' },
          { label: '运营模式', text: '电价峰谷套利' },
          { label: '案例项目', text: '恒华电力' }
        ]},
        { icon: '🔌', title: '电表安装', items: [
          { label: 'n-1#电表', text: '变压器防过载', note: '安装点：变压器0.4kV出线总开关' },
          { label: 'n-2#电表', text: '储能并网点关口计量表', note: '安装点：储能0.4kV并网柜' },
          { label: 'm-1#/m-2#', text: '辅助表1、辅助表2', note: '最多支持2块辅助表' }
        ]}
      ],
      gridClass: 'topo-grid-2',
      diagramSvg: '<svg viewBox=\"0 0 800 340\" xmlns=\"http://www.w3.org/2000/svg\"><rect x=\"20\" y=\"18\" width=\"110\" height=\"28\" rx=\"5\" fill=\"rgba(231,76,60,0.15)\" stroke=\"#E74C3C\" stroke-width=\"1.5\"/><text x=\"75\" y=\"37\" text-anchor=\"middle\" font-size=\"11\" font-weight=\"700\" fill=\"#E74C3C\">10kV 母线</text><text x=\"75\" y=\"60\" text-anchor=\"middle\" font-size=\"9\" fill=\"#E74C3C\" font-style=\"italic\">(未装高压表)</text><line x1=\"130\" y1=\"32\" x2=\"220\" y2=\"32\" stroke=\"rgba(0,0,0,0.5)\" stroke-width=\"4\" stroke-linecap=\"round\"/><circle cx=\"245\" cy=\"32\" r=\"20\" fill=\"rgba(59,155,219,0.1)\" stroke=\"#3B9BDB\" stroke-width=\"1.5\"/><text x=\"245\" y=\"36\" text-anchor=\"middle\" font-size=\"9\" font-weight=\"600\" fill=\"#3B9BDB\">T1</text><line x1=\"265\" y1=\"32\" x2=\"290\" y2=\"32\" stroke=\"rgba(0,0,0,0.5)\" stroke-width=\"4\" stroke-linecap=\"round\"/><rect x=\"275\" y=\"16\" width=\"80\" height=\"24\" rx=\"5\" fill=\"rgba(46,204,113,0.08)\" stroke=\"#27AE60\" stroke-width=\"1\"/><text x=\"315\" y=\"32\" text-anchor=\"middle\" font-size=\"9\" fill=\"#27AE60\">0.4kV母线</text><line x1=\"315\" y1=\"40\" x2=\"315\" y2=\"58\" stroke=\"rgba(0,0,0,0.25)\" stroke-width=\"2\" fill=\"none\"/><rect x=\"270\" y=\"58\" width=\"90\" height=\"20\" rx=\"4\" fill=\"#FFF3E0\" stroke=\"#E67E22\" stroke-width=\"1\"/><text x=\"315\" y=\"72\" text-anchor=\"middle\" font-size=\"8\" fill=\"#E67E22\">n-1# 防过载</text><line x1=\"315\" y1=\"78\" x2=\"315\" y2=\"96\" stroke=\"rgba(0,0,0,0.25)\" stroke-width=\"2\" fill=\"none\"/><rect x=\"270\" y=\"96\" width=\"90\" height=\"20\" rx=\"4\" fill=\"#F3E5F5\" stroke=\"#8E44AD\" stroke-width=\"1\"/><text x=\"315\" y=\"110\" text-anchor=\"middle\" font-size=\"8\" fill=\"#8E44AD\">n-2# 关口计量</text><line x1=\"315\" y1=\"116\" x2=\"315\" y2=\"140\" stroke=\"#1ABC9C\" stroke-width=\"2\" fill=\"none\"/><rect x=\"255\" y=\"140\" width=\"120\" height=\"22\" rx=\"5\" fill=\"rgba(26,188,156,0.08)\" stroke=\"#1ABC9C\" stroke-width=\"1\"/><text x=\"315\" y=\"155\" text-anchor=\"middle\" font-size=\"8\" fill=\"#1ABC9C\">m-1#/m-2# 辅助表(≤2块)</text><line x1=\"335\" y1=\"28\" x2=\"360\" y2=\"28\" stroke=\"rgba(0,0,0,0.25)\" stroke-width=\"2\" fill=\"none\"/><circle cx=\"380\" cy=\"28\" r=\"20\" fill=\"rgba(59,155,219,0.1)\" stroke=\"#3B9BDB\" stroke-width=\"1.5\"/><text x=\"380\" y=\"32\" text-anchor=\"middle\" font-size=\"9\" font-weight=\"600\" fill=\"#3B9BDB\">T2</text><line x1=\"445\" y1=\"28\" x2=\"465\" y2=\"28\" stroke=\"rgba(0,0,0,0.25)\" stroke-width=\"2\" fill=\"none\"/><text x=\"480\" y=\"32\" text-anchor=\"middle\" font-size=\"12\" fill=\"#888\">…</text><line x1=\"490\" y1=\"28\" x2=\"505\" y2=\"28\" stroke=\"rgba(0,0,0,0.25)\" stroke-width=\"2\" fill=\"none\"/><circle cx=\"525\" cy=\"28\" r=\"20\" fill=\"rgba(59,155,219,0.1)\" stroke=\"#3B9BDB\" stroke-width=\"1.5\"/><text x=\"525\" y=\"32\" text-anchor=\"middle\" font-size=\"9\" font-weight=\"600\" fill=\"#3B9BDB\">Tn</text><line x1=\"315\" y1=\"162\" x2=\"290\" y2=\"190\" stroke=\"rgba(0,0,0,0.2)\" stroke-width=\"2\" fill=\"none\"/><line x1=\"290\" y1=\"190\" x2=\"290\" y2=\"210\" stroke=\"rgba(0,0,0,0.2)\" stroke-width=\"2\" fill=\"none\"/><rect x=\"240\" y=\"210\" width=\"100\" height=\"44\" rx=\"6\" fill=\"rgba(59,155,219,0.1)\" stroke=\"#3B9BDB\" stroke-width=\"1.5\"/><text x=\"290\" y=\"230\" text-anchor=\"middle\" font-size=\"10\" font-weight=\"600\" fill=\"#3B9BDB\">支路控制</text><text x=\"290\" y=\"244\" text-anchor=\"middle\" font-size=\"9\" fill=\"#3B9BDB\">+ EMS主控</text><line x1=\"340\" y1=\"232\" x2=\"400\" y2=\"232\" stroke=\"rgba(0,0,0,0.3)\" stroke-width=\"2.5\" fill=\"none\"/><rect x=\"400\" y=\"210\" width=\"46\" height=\"44\" rx=\"5\" fill=\"rgba(39,174,96,0.1)\" stroke=\"#27AE60\" stroke-width=\"1.5\"/><text x=\"423\" y=\"229\" text-anchor=\"middle\" font-size=\"8\" font-weight=\"600\" fill=\"#27AE60\">储能柜</text><text x=\"423\" y=\"243\" text-anchor=\"middle\" font-size=\"10\" font-weight=\"600\" fill=\"#27AE60\">×6</text><rect x=\"500\" y=\"140\" width=\"280\" height=\"80\" rx=\"8\" fill=\"rgba(243,156,18,0.06)\" stroke=\"#E67E22\" stroke-width=\"1\" stroke-dasharray=\"4 3\"/><text x=\"640\" y=\"158\" text-anchor=\"middle\" font-size=\"10\" font-weight=\"600\" fill=\"#E67E22\">⚙ 防逆流逻辑</text><rect x=\"20\" y=\"290\" width=\"760\" height=\"40\" rx=\"7\" fill=\"rgba(59,155,219,0.04)\" stroke=\"rgba(59,155,219,0.08)\" stroke-width=\"0.5\"/><text x=\"40\" y=\"315\" font-size=\"11\" fill=\"#555\"><tspan font-weight=\"600\" fill=\"#E67E22\">场景要点：</tspan><tspan>无高压表方案 · 辅助表防逆流补偿 · 无需使能「正向有功总最大需量」· 案例：恒华电力</tspan></text></svg>',
      bomTitle: '📦 典型 BOM（6柜方案）',
      bomHeaders: ['类别','物料编码','编码描述','数量','备注'],
      bomRows: [
        ['储能柜','201130006','一体式储能系统 ICB241kWh-120kW-A-G-LF3E','6','—'],
        ['交换机','250140003','系统用交换机 16口百兆 DC12-48V','1','导轨式'],
        ['电表','206010103','电表 3*220/380V 3*1.5(6)A 6400i RS485','2','485线≤500m'],
        ['电表','209060040','互感器 1:1000 5A/5mA 引线1m','6','与工程核实'],
        ['EMS','202310024','监控模块 IMMU2','3','安装于通讯盒']
      ],
      noteIcon: '⚙️', noteTitle: '配置要点：',
      configNote: '主控配置EMS管理计划（无需高压表最大需量）；支路需配置防逆流/防过载使能，控制跨变压器放电行为。'
    },
    {
      id: 't4', badge: '扩展', badgeClass: 'purple', code: '',
      title: '接入第三方 EMS · 逆流/过载自动充放电 · 快速防逆流 · 电网服务',
      infoBlocks: [
        { icon: '🔗', title: '第三方EMS接入', items: [
          { label: '', text: '案例：川崎、浙江金华-中能电科' },
          { label: '', text: '目前只支持104协议' }
        ]},
        { icon: '⚡', title: '逆流自动启动充电', items: [
          { label: '', text: '案例：美华智充、一行电力' },
          { label: '', text: '逆流≤-40kW启动充电，配合目标功率修正值调整。' }
        ]},
        { icon: '🔋', title: '过载自动启动放电', items: [
          { label: '', text: '案例：美华智充' },
          { label: '', text: '网侧功率≥700kW启动放电，变压器扩容。' }
        ]}
      ],
      gridClass: 'topo-grid-3',
      extraBlocks: [
        { icon: '🚀', title: '快速防逆流方案 #4', items: [
          { label: '', text: '加装负载表方案：变压器容量小、充电桩配置储能（如Electra场景）' },
          { label: '关键要求', text: '电表必须使用快表（安科瑞ADL400），网侧表+关口表接485 #1，负载表接485 #2。' }
        ]},
        { icon: '🌐', title: '电网服务', items: [
          { label: '', text: '接受电网调度指令，快速响应（200ms内从收到指令到输出功率）。' },
          { label: '', text: '适用场景：单台变压器容量小，接入光伏、风能等，连接到MU2的ETH1/ETH2。' }
        ]}
      ],
      extraGridClass: 'topo-grid-2',
      diagramSvg: '',
      bomTitle: '', bomHeaders: [], bomRows: [],
      noteIcon: '', noteTitle: '',
      configNote: ''
    },
    {
      id: 't5', badge: '规范', badgeClass: 'teal', code: '',
      title: '设备编号规则 · 充放电功率分配策略 · 常见问题',
      infoBlocks: [
        { icon: '📛', title: '设备编号规则', items: [
          { label: '', text: '4字节UINT十进制，序号从1开始：' },
          { label: '编码格式', text: '一级主控 | 二级主控(支路,无填0) | 三级主控(无填0) | 储能设备编号\n   0     |        XX          |       XX       |     XXX' }
        ]},
        { icon: '⚙️', title: '功率分配策略', items: [
          { label: '', text: '效率优先 + 同充同放 + 按总充放电量 / SOC排序等算法融合，灵活按需求调整。' },
          { label: '未来方向', text: '光伏协调控制（接入天气数据）、负荷预测、发电预测模型。' }
        ]}
      ],
      gridClass: 'topo-grid-2',
      diagramSvg: '',
      bomTitle: '', bomHeaders: [], bomRows: [],
      noteIcon: '⚠️', noteTitle: '常见问题：',
      configNote: '未充满原因——接近需量的最大功率按效率优先给部分储能柜充电，到08:17时部分已充满，可充功率仅剩800kW。按需量计费的客户，月初需量较低只能手工调整，需持续优化降低客户需量费用。'
    }
  ];

  function getTopoData() {
    var stored = STORAGE.get('topology');
    if (stored) return JSON.parse(JSON.stringify(stored));
    return JSON.parse(JSON.stringify(TOPO_DEFAULTS));
  }

  function saveTopoData() {
    // 从当前编辑列表收集数据
    var data = [];
    var cards = document.querySelectorAll('.topo-admin-card');
    cards.forEach(function(card) {
      var id = card.getAttribute('data-topo-id');
      if (!id) return;
      // 读取基本字段
      var badge = card.querySelector('.topo-edit-badge') ? card.querySelector('.topo-edit-badge').value : '';
      var badgeClass = card.querySelector('.topo-edit-badge-class') ? card.querySelector('.topo-edit-badge-class').value : 'green';
      var code = card.querySelector('.topo-edit-code') ? card.querySelector('.topo-edit-code').value : '';
      var title = card.querySelector('.topo-edit-title') ? card.querySelector('.topo-edit-title').value : '';
      var gridClass = card.querySelector('.topo-edit-grid-class') ? card.querySelector('.topo-edit-grid-class').value : 'topo-grid-2';
      var diagramSvg = card.querySelector('.topo-edit-svg') ? card.querySelector('.topo-edit-svg').value : '';
      // 读取元件库数据 JSON
      var diagramDataStr = card.querySelector('.topo-edit-diagram-data') ? card.querySelector('.topo-edit-diagram-data').value : '';
      var diagramData = null;
      try { if (diagramDataStr) diagramData = JSON.parse(diagramDataStr); } catch(e) {}
      var bomTitle = card.querySelector('.topo-edit-bom-title') ? card.querySelector('.topo-edit-bom-title').value : '';
      var noteIcon = card.querySelector('.topo-edit-note-icon') ? card.querySelector('.topo-edit-note-icon').value : '';
      var noteTitle = card.querySelector('.topo-edit-note-title') ? card.querySelector('.topo-edit-note-title').value : '';
      var configNote = card.querySelector('.topo-edit-note') ? card.querySelector('.topo-edit-note').value : '';

      // 读取info blocks
      var infoBlocks = [];
      var blockEls = card.querySelectorAll('.topo-info-block');
      blockEls.forEach(function(block) {
        var icon = block.querySelector('.ib-icon') ? block.querySelector('.ib-icon').value : '';
        var ibTitle = block.querySelector('.ib-title') ? block.querySelector('.ib-title').value : '';
        var items = [];
        var itemEls = block.querySelectorAll('.ib-item');
        itemEls.forEach(function(item) {
          var label = item.querySelector('.ibi-label') ? item.querySelector('.ibi-label').value : '';
          var text = item.querySelector('.ibi-text') ? item.querySelector('.ibi-text').value : '';
          var note = item.querySelector('.ibi-note') ? item.querySelector('.ibi-note').value : '';
          items.push({ label: label, text: text, note: note });
        });
        infoBlocks.push({ icon: icon, title: ibTitle, items: items });
      });

      // 读取extra blocks
      var extraBlocks = [];
      var extraEls = card.querySelectorAll('.topo-extra-block');
      extraEls.forEach(function(block) {
        var icon = block.querySelector('.eb-icon') ? block.querySelector('.eb-icon').value : '';
        var ebTitle = block.querySelector('.eb-title') ? block.querySelector('.eb-title').value : '';
        var items = [];
        var itemEls = block.querySelectorAll('.eb-item');
        itemEls.forEach(function(item) {
          var label = item.querySelector('.ebi-label') ? item.querySelector('.ebi-label').value : '';
          var text = item.querySelector('.ebi-text') ? item.querySelector('.ebi-text').value : '';
          items.push({ label: label, text: text });
        });
        extraBlocks.push({ icon: icon, title: ebTitle, items: items });
      });

      // 读取BOM
      var bomHeaders = ['类别','物料编码','编码描述','数量','备注'];
      var bomRows = [];
      var bomRowEls = card.querySelectorAll('.bom-row');
      bomRowEls.forEach(function(row) {
        var inputs = row.querySelectorAll('input');
        if (inputs.length >= 5) {
          bomRows.push([inputs[0].value, inputs[1].value, inputs[2].value, inputs[3].value, inputs[4].value]);
        }
      });

      var item = {
        id: id, badge: badge, badgeClass: badgeClass, code: code, title: title,
        infoBlocks: infoBlocks,
        gridClass: gridClass,
        diagramSvg: diagramSvg,
        bomTitle: bomTitle, bomHeaders: bomHeaders, bomRows: bomRows,
        extraBlocks: extraBlocks.length ? extraBlocks : undefined,
        extraGridClass: extraBlocks.length ? 'topo-grid-2' : undefined,
        noteIcon: noteIcon, noteTitle: noteTitle, configNote: configNote
      };
      // 如果有元件库数据，保存之；并从元件库数据自动生成 SVG
      if (diagramData && (diagramData.nodes.length || diagramData.edges.length)) {
        item.diagramData = diagramData;
        item.diagramSvg = ADMIN._generateSvgFromDiagram(diagramData);
      }
      data.push(item);
    });
    STORAGE.set('topology', data);
    alert('✅ 拓扑方案已保存！');
  }

  function resetTopoData() {
    if (!confirm('确定恢复为默认拓扑方案？所有自定义修改将丢失。')) return;
    STORAGE.remove('topology');
    renderTopoAdminList();
    alert('✅ 已恢复默认拓扑方案！');
  }

  function renderTopoAdminList() {
    var data = getTopoData();
    if (!data.length) {
      document.getElementById('admin-topo-list').innerHTML = '<p style="color:#718096;padding:16px">暂无拓扑场景</p>';
      return;
    }
    var html = '';
    data.forEach(function(t, i) {
      html += '<div class="topo-admin-card" data-topo-id="' + t.id + '">' +
        '<div class="topo-admin-header">' +
          '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
            '<span class="topo-badge ' + t.badgeClass + '">' + t.badge + '</span>' +
            (t.code ? '<span class="topo-admin-code">' + t.code + '</span>' : '') +
          '</div>' +
          '<div class="topo-admin-actions">' +
            '<button class="btn-sm btn-blue" onclick="ADMIN.toggleTopoEditor(\'' + t.id + '\')">&#x270F; 编辑</button>' +
            '<button class="btn-sm btn-red" onclick="ADMIN.deleteTopoScene(\'' + t.id + '\')">删除</button>' +
          '</div>' +
        '</div>' +
        '<div class="topo-admin-title">' + t.title + '</div>' +
        '<div class="topo-editor-panel" id="topo-edit-' + t.id + '" style="display:none">' +
          renderTopoEditorForm(t) +
        '</div>' +
      '</div>';
    });
    document.getElementById('admin-topo-list').innerHTML = html;
  }

  function toggleTopoEditor(id) {
    var panel = document.getElementById('topo-edit-' + id);
    if (!panel) return;
    var isVisible = panel.style.display !== 'none';
    panel.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(function() { ADMIN._initTopoEditor(id); }, 100);
    }
  }

  function renderTopoEditorForm(t) {
    var ibHTML = '';
    (t.infoBlocks || []).forEach(function(ib, i) {
      var itemsHTML = '';
      (ib.items || []).forEach(function(it, j) {
        itemsHTML += '<div class="ib-item" style="display:flex;gap:6px;align-items:center;margin-bottom:4px">' +
          '<input class="ibi-label" value="' + (it.label || '').replace(/"/g, '&quot;') + '" placeholder="标签" style="width:120px;flex:none" />' +
          '<input class="ibi-text" value="' + (it.text || '').replace(/"/g, '&quot;') + '" placeholder="内容" style="flex:1" />' +
          '<input class="ibi-note" value="' + (it.note || '').replace(/"/g, '&quot;') + '" placeholder="备注" style="width:150px;flex:none" />' +
          '<button class="btn-sm btn-red" style="flex:none;padding:4px 8px;font-size:11px" onclick="this.parentElement.remove()">×</button>' +
          '</div>';
      });
      ibHTML += '<div class="topo-info-block" style="margin-bottom:8px">' +
        '<div class="tag-row">' +
          '<input class="ib-icon" value="' + (ib.icon || '') + '" placeholder="图标: 📋" style="width:70px;flex:none" />' +
          '<input class="ib-title" value="' + (ib.title || '') + '" placeholder="标题" style="flex:1" />' +
          '<button class="btn-sm btn-green" style="flex:none;padding:4px 8px;font-size:11px" onclick="ADMIN.addInfoItem(this)">+条目</button>' +
        '</div>' + itemsHTML +
      '</div>';
    });

    // Extra blocks for extension scenes
    var ebHTML = '';
    if (t.extraBlocks) {
      t.extraBlocks.forEach(function(eb, i) {
        var eitemsHTML = '';
        (eb.items || []).forEach(function(eit, j) {
          eitemsHTML += '<div class="eb-item" style="display:flex;gap:6px;align-items:center;margin-bottom:4px">' +
            '<input class="ebi-label" value="' + (eit.label || '').replace(/"/g, '&quot;') + '" placeholder="标签" style="width:120px;flex:none" />' +
            '<input class="ebi-text" value="' + (eit.text || '').replace(/"/g, '&quot;') + '" placeholder="内容" style="flex:1" />' +
            '<button class="btn-sm btn-red" style="flex:none;padding:4px 8px;font-size:11px" onclick="this.parentElement.remove()">×</button>' +
            '</div>';
        });
        ebHTML += '<div class="topo-extra-block" style="margin-bottom:8px">' +
          '<div class="tag-row">' +
            '<input class="eb-icon" value="' + (eb.icon || '') + '" placeholder="图标" style="width:70px;flex:none" />' +
            '<input class="eb-title" value="' + (eb.title || '') + '" placeholder="标题" style="flex:1" />' +
            '<button class="btn-sm btn-green" style="flex:none;padding:4px 8px;font-size:11px" onclick="ADMIN.addExtraItem(this)">+条目</button>' +
          '</div>' + eitemsHTML +
        '</div>';
      });
    }

    // BOM rows
    var bomHTML = '';
    (t.bomRows || []).forEach(function(row, idx) {
      bomHTML += '<div class="bom-row">' +
        '<span class="bom-row-num">' + (idx + 1) + '</span>' +
        '<input class="bom-col-cat" value="' + (row[0] || '').replace(/"/g, '&quot;') + '" placeholder="类别" />' +
        '<input value="' + (row[1] || '').replace(/"/g, '&quot;') + '" placeholder="产品编码" />' +
        '<input value="' + (row[2] || '').replace(/"/g, '&quot;') + '" placeholder="描述" />' +
        '<input class="bom-col-qty" value="' + (row[3] || '').replace(/"/g, '&quot;') + '" placeholder="数量" />' +
        '<input value="' + (row[4] || '').replace(/"/g, '&quot;') + '" placeholder="备注" />' +
        '<button class="btn-sm btn-red" style="flex:none;padding:2px 6px;font-size:11px;min-width:22px" onclick="var s=this.closest(\'.topo-editor-section\');this.parentElement.remove();ADMIN._renumberBomRows(s)">×</button>' +
      '</div>';
    });

    // ── 准备元件库数据 ──
    var diagData = t.diagramData;
    if (!diagData) {
      if (t.diagramSvg && t.diagramSvg.trim()) {
        diagData = { nodes: [], edges: [], legacySvg: t.diagramSvg };
      } else {
        diagData = { nodes: [], edges: [] };
      }
    }
    var diagJson = JSON.stringify(diagData).replace(/"/g, '&quot;');

    return '<div class="topo-editor-grid">' +
      '<div class="topo-editor-section">' +
        '<h5>🎯 基本标识</h5>' +
        '<div class="tag-row">' +
          '<input class="topo-edit-badge" value="' + (t.badge || '').replace(/"/g, '&quot;') + '" placeholder="场景X" style="width:100px;flex:none" />' +
          '<select class="topo-edit-badge-class" style="width:100px;flex:none"><option value="green" ' + (t.badgeClass==='green'?'selected':'') + '>绿色</option><option value="blue" ' + (t.badgeClass==='blue'?'selected':'') + '>蓝色</option><option value="orange" ' + (t.badgeClass==='orange'?'selected':'') + '>橙色</option><option value="purple" ' + (t.badgeClass==='purple'?'selected':'') + '>紫色</option><option value="teal" ' + (t.badgeClass==='teal'?'selected':'') + '>蓝绿</option></select>' +
          '<input class="topo-edit-code" value="' + (t.code || '').replace(/"/g, '&quot;') + '" placeholder="top#X" style="width:120px;flex:none" />' +
          '<select class="topo-edit-grid-class" style="width:120px;flex:none"><option value="topo-grid-2" ' + (t.gridClass==='topo-grid-2'?'selected':'') + '>2列网格</option><option value="topo-grid-3" ' + (t.gridClass==='topo-grid-3'?'selected':'') + '>3列网格</option></select>' +
        '</div>' +
        '<div class="form-item" style="margin-top:8px"><label>标题</label>' +
          '<input class="topo-edit-title" value="' + (t.title || '').replace(/"/g, '&quot;') + '" placeholder="场景标题" />' +
        '</div>' +
      '</div>' +
      '<div class="topo-editor-section">' +
        '<h5>📋 信息块 <button class="btn-sm btn-green" style="padding:3px 10px;font-size:11px;margin-left:8px" onclick="ADMIN.addInfoBlock(this)">+添加块</button></h5>' +
        ibHTML +
      '</div>' +
    '</div>' +
    '<div class="topo-editor-grid">' +
      ((t.bomTitle || t.bomRows.length) ? '<div class="topo-editor-section">' +
        '<h5>📦 BOM表</h5>' +
        '<div class="form-item"><label>BOM标题</label>' +
          '<input class="topo-edit-bom-title" value="' + (t.bomTitle || '').replace(/"/g, '&quot;') + '" placeholder="📦 典型 BOM（X柜方案）" />' +
        '</div>' +
        '<div class="bom-header">' +
          '<span class="bom-h-num">#</span>' +
          '<span class="bom-h-cat">类别</span>' +
          '<span class="bom-h-code">产品编码</span>' +
          '<span class="bom-h-desc">描述</span>' +
          '<span class="bom-h-qty">数量</span>' +
          '<span class="bom-h-rmk">备注</span>' +
          '<span class="bom-h-act"></span>' +
        '</div>' +
        bomHTML +
        '<button class="btn-sm btn-green" style="margin-top:4px" onclick="ADMIN.addBomRow(this)">＋ 添加行</button>' +
      '</div>' : '') +
      (ebHTML ? '<div class="topo-editor-section">' +
        '<h5>🔧 扩展信息块 <button class="btn-sm btn-green" style="padding:3px 10px;font-size:11px;margin-left:8px" onclick="ADMIN.addExtraBlock(this)">+添加扩展块</button></h5>' +
        ebHTML +
      '</div>' : '') +
    '</div>' +
    '<div class="topo-editor-section" style="grid-column:1/-1">' +
      '<h5>🔧 拓扑元件库编辑器 <span style="font-weight:400;font-size:10px;opacity:.6;margin-left:8px">拖拽元件到画布 · 点击连接点连线 · 选中元件编辑属性</span></h5>' +
      '<input type="hidden" class="topo-edit-svg" value="" />' +
      '<input type="hidden" class="topo-edit-diagram-data" value="' + diagJson + '" />' +
      '<div class="topo-editor-wrap">' +
        '<div class="topo-lib-panel">' +
          '<div class="topo-lib-header">📦 元件库</div>' +
          '<div class="topo-lib-search"><input type="text" placeholder="搜索元件..." oninput="ADMIN._filterComponentLib(this)" /></div>' +
          '<div class="topo-lib-scroll" id="topo-lib-scroll-' + t.id + '"></div>' +
        '</div>' +
        '<div class="topo-canvas-wrap" id="topo-canvas-wrap-' + t.id + '">' +
          '<div class="topo-canvas-toolbar">' +
            '<button class="topo-btn-sm topo-sync-btn" title="智能合并BOM元件到画板（保留连线）" onclick="ADMIN._syncBomToCanvas(\'' + t.id + '\')">📦 从BOM同步</button>' +
            '<button class="topo-btn-sm topo-sync-btn" title="从BOM完全重建（清空画布重新生成）" onclick="if(confirm(\'确定要清空画布并从BOM重建吗？所有连线将丢失。\'))ADMIN._syncBomToCanvas(\'' + t.id + '\',true)" style="background:rgba(255,100,50,0.15);border-color:rgba(255,100,50,0.35)">🔄 全量重建</button>' +
            '<button class="topo-btn-sm" title="全屏编辑" onclick="ADMIN._topoToggleFullscreen(\'' + t.id + '\')" id="topo-fs-btn-' + t.id + '">⛶</button>' +
            '<button class="topo-btn-sm" title="放大" onclick="ADMIN._topoZoom(\'' + t.id + '\',1.15)">＋</button>' +
            '<button class="topo-btn-sm" title="缩小" onclick="ADMIN._topoZoom(\'' + t.id + '\',0.87)">－</button>' +
            '<span class="topo-zoom-label" id="topo-zoom-label-' + t.id + '">100%</span>' +
            '<button class="topo-btn-sm" title="重置视图" onclick="ADMIN._topoResetView(\'' + t.id + '\')">⌂</button>' +
            '<button class="topo-btn-sm topo-save-btn" title="保存拓扑" onclick="ADMIN._topoSaveCurrent(\'' + t.id + '\')" style="background:rgba(0,200,100,0.2);border-color:rgba(0,200,100,0.4)">💾 保存</button>' +
          '</div>' +
          // 线缆图例 — 悬浮可拖拽+可调节窗口
          '<div class="cable-legend-float" id="topo-cable-selector-' + t.id + '" title="线缆类型（可拖拽移动，右下角调节大小）">' +
            '<div class="cable-legend-header">' +
              '🔌 线缆类型' +
              '<button class="cable-legend-edit" title="编辑线缆类型" onclick="ADMIN._openCableManager(\'' + t.id + '\')">⚙</button>' +
            '</div>' +
            '<div class="cable-legend-body">' +
              CABLE_TYPES.map(function(ct) {
                return '<button class="cable-type-btn" data-cable="' + ct.id + '" onclick="ADMIN._selectCableType(\'' + t.id + '\',\'' + ct.id + '\')" title="' + ct.name + '">' +
                  '<svg width="28" height="14" viewBox="0 0 28 14">' +
                    '<line x1="2" y1="7" x2="26" y2="7" stroke="' + ct.color + '" stroke-width="' + Math.max(2, ct.width) + '" stroke-linecap="round"' +
                    (ct.dash !== 'none' ? ' stroke-dasharray="' + ct.dash + '"' : '') + '/>' +
                  '</svg>' +
                  '<span class="cable-label-text">' + ct.label + '</span>' +
                '</button>';
              }).join('') +
            '</div>' +
            '<div class="cable-legend-resize" title="拖拽调节窗口大小"></div>' +
          '</div>' +
          '<div class="topo-canvas-inner" id="topo-canvas-' + t.id + '" data-topo-id="' + t.id + '"></div>' +
        '</div>' +
        '<div class="topo-prop-panel" id="topo-prop-' + t.id + '" style="display:none">' +
          '<div class="topo-prop-header">属性 <button class="topo-prop-close" onclick="ADMIN._topoDeselect(\'' + t.id + '\')">×</button></div>' +
          '<div class="topo-prop-body" id="topo-prop-body-' + t.id + '"></div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="topo-editor-section" style="grid-column:1/-1">' +
      '<h5>⚙️ 配置要点</h5>' +
      '<div class="tag-row">' +
        '<input class="topo-edit-note-icon" value="' + (t.noteIcon || '').replace(/"/g, '&quot;') + '" placeholder="⚙️" style="width:70px;flex:none" />' +
        '<input class="topo-edit-note-title" value="' + (t.noteTitle || '').replace(/"/g, '&quot;') + '" placeholder="标题: 配置要点：" style="flex:1" />' +
      '</div>' +
      '<textarea class="topo-edit-note" rows="3" placeholder="配置要点内容...">' + (t.configNote || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</textarea>' +
    '</div>';
  }

  function addTopoScene() {
    var data = getTopoData();
    var newId = 't' + (data.length + 1) + '_' + Date.now();
    data.push({
      id: newId, badge: '新场景', badgeClass: 'green', code: 'top-new', title: '新拓扑场景',
      infoBlocks: [{ icon: '📋', title: '应用信息', items: [{ label: '说明', text: '新建场景描述', note: '' }] }],
      gridClass: 'topo-grid-2', diagramSvg: '', diagramData: { nodes: [], edges: [] },
      bomTitle: '📦 典型 BOM',
      bomHeaders: ['类别','物料编码','编码描述','数量','备注'], bomRows: [['—','','','','']],
      noteIcon: '⚙️', noteTitle: '配置要点：', configNote: ''
    });
    STORAGE.set('topology', data);
    renderTopoAdminList();
    setTimeout(function() { toggleTopoEditor(newId); }, 200);
  }

  function deleteTopoScene(id) {
    if (!confirm('确定删除该拓扑场景？')) return;
    var data = getTopoData();
    data = data.filter(function(t) { return t.id !== id; });
    STORAGE.set('topology', data);
    // 清理脏标记和定时器
    delete _topoDirty[id];
    delete _topoManualSaved[id];
    if (_autoSaveTimers[id]) { clearInterval(_autoSaveTimers[id]); delete _autoSaveTimers[id]; }
    renderTopoAdminList();
  }

  function addInfoBlock(btn) {
    var section = btn.closest('.topo-editor-section');
    if (!section) return;
    var div = document.createElement('div');
    div.className = 'topo-info-block';
    div.style.marginBottom = '8px';
    div.innerHTML = '<div class="tag-row">' +
      '<input class="ib-icon" value="📋" placeholder="图标" style="width:70px;flex:none" />' +
      '<input class="ib-title" value="新信息块" placeholder="标题" style="flex:1" />' +
      '<button class="btn-sm btn-green" style="flex:none;padding:4px 8px;font-size:11px" onclick="ADMIN.addInfoItem(this)">+条目</button>' +
      '</div>' +
      '<div class="ib-item" style="display:flex;gap:6px;align-items:center;margin-bottom:4px">' +
        '<input class="ibi-label" value="" placeholder="标签" style="width:120px;flex:none" />' +
        '<input class="ibi-text" value="" placeholder="内容" style="flex:1" />' +
        '<input class="ibi-note" value="" placeholder="备注" style="width:150px;flex:none" />' +
        '<button class="btn-sm btn-red" style="flex:none;padding:4px 8px;font-size:11px" onclick="this.parentElement.remove()">×</button>' +
      '</div>';
    // Insert before the +添加块 button
    var h5 = section.querySelector('h5');
    section.insertBefore(div, h5 ? h5.nextSibling : section.firstChild);
  }

  function addInfoItem(btn) {
    var block = btn.closest('.topo-info-block');
    if (!block) return;
    var div = document.createElement('div');
    div.className = 'ib-item';
    div.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:4px';
    div.innerHTML = '<input class="ibi-label" value="" placeholder="标签" style="width:120px;flex:none" />' +
      '<input class="ibi-text" value="" placeholder="内容" style="flex:1" />' +
      '<input class="ibi-note" value="" placeholder="备注" style="width:150px;flex:none" />' +
      '<button class="btn-sm btn-red" style="flex:none;padding:4px 8px;font-size:11px" onclick="this.parentElement.remove()">×</button>';
    block.appendChild(div);
  }

  function addExtraBlock(btn) {
    var section = btn.closest('.topo-editor-section');
    if (!section) return;
    var div = document.createElement('div');
    div.className = 'topo-extra-block';
    div.style.marginBottom = '8px';
    div.innerHTML = '<div class="tag-row">' +
      '<input class="eb-icon" value="🔧" placeholder="图标" style="width:70px;flex:none" />' +
      '<input class="eb-title" value="新扩展块" placeholder="标题" style="flex:1" />' +
      '<button class="btn-sm btn-green" style="flex:none;padding:4px 8px;font-size:11px" onclick="ADMIN.addExtraItem(this)">+条目</button>' +
      '</div>' +
      '<div class="eb-item" style="display:flex;gap:6px;align-items:center;margin-bottom:4px">' +
        '<input class="ebi-label" value="" placeholder="标签" style="width:120px;flex:none" />' +
        '<input class="ebi-text" value="" placeholder="内容" style="flex:1" />' +
        '<button class="btn-sm btn-red" style="flex:none;padding:4px 8px;font-size:11px" onclick="this.parentElement.remove()">×</button>' +
      '</div>';
    var h5 = section.querySelector('h5');
    section.insertBefore(div, h5 ? h5.nextSibling : section.firstChild);
  }

  function addExtraItem(btn) {
    var block = btn.closest('.topo-extra-block');
    if (!block) return;
    var div = document.createElement('div');
    div.className = 'eb-item';
    div.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:4px';
    div.innerHTML = '<input class="ebi-label" value="" placeholder="标签" style="width:120px;flex:none" />' +
      '<input class="ebi-text" value="" placeholder="内容" style="flex:1" />' +
      '<button class="btn-sm btn-red" style="flex:none;padding:4px 8px;font-size:11px" onclick="this.parentElement.remove()">×</button>';
    block.appendChild(div);
  }

  function addBomRow(btn) {
    var div = document.createElement('div');
    div.className = 'bom-row';
    // Count existing rows for the sequence number
    var section = btn.closest('.topo-editor-section');
    var num = section ? section.querySelectorAll('.bom-row').length + 1 : 1;
    div.innerHTML = '<span class="bom-row-num">' + num + '</span>' +
      '<input class="bom-col-cat" value="" placeholder="类别" />' +
      '<input value="" placeholder="产品编码" />' +
      '<input value="" placeholder="描述" />' +
      '<input class="bom-col-qty" value="" placeholder="数量" />' +
      '<input value="" placeholder="备注" />' +
      '<button class="btn-sm btn-red" style="flex:none;padding:2px 6px;font-size:11px;min-width:22px" onclick="var s=this.closest(\'.topo-editor-section\');this.parentElement.remove();ADMIN._renumberBomRows(s)">×</button>';
    btn.parentElement.insertBefore(div, btn);
    // Renumber all rows
    _renumberBomRows(section);
  }

  function _renumberBomRows(section) {
    if (!section) return;
    var rows = section.querySelectorAll('.bom-row');
    rows.forEach(function(row, i) {
      var numEl = row.querySelector('.bom-row-num');
      if (numEl) numEl.textContent = i + 1;
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  拓扑元件库编辑器（替代 SVG 源码管理模式）
  //══════════════════════════════════════════════════════════════

  // ── BOM类别 → 元件库compId 映射表 ──
  var BOM_CAT_TO_COMPID = {
    '储能柜': 'ess-cabinet',
    'PCS': 'pcs',
    'BMS': 'bms',
    'EMS': 'ems',
    '交换机': 'switch',
    '路由器': 'router',
    '串口服务器': 'serial-server',
    '电表': 'meter',
    '二次电表': 'meter',
    '一次电表': 'meter',
    '互感器': 'ct',
    '变压器': 'transformer',
    '高压柜': 'hv-cabinet',
    '低压柜': 'lv-cabinet',
    '汇流柜': 'bus-cabinet',
    '配电柜': 'lv-cabinet',
    '配电机柜': 'lv-cabinet',
    'STS柜': 'sts-cabinet',
    '电源模块': 'power-module',
    '液晶屏': 'display',
    '线缆': 'cable',
    '网线': 'cable',
    '端子': 'pnt-terminal',
    '4G天线': 'antenna',
    '流量卡': 'sim-card',
    '监控箱': 'monitor-box',
    '消防': 'fire-ext',
    '空调': 'ac-unit',
    '水浸': 'water-sensor',
    '烟感': 'smoke-sensor',
    '门磁': 'door-sensor',
    '网关': 'gateway',
    'UPS': 'ups',
    '柴油发电机': 'diesel-gen',
    '光伏逆变器': 'pv-inverter',
    '防雷器': 'spd',
    '电池PACK': 'battery-pack',
    '电池簇': 'battery-cluster',
    '监控模块': 'ems',
    '电流互感器': 'ct',
    'DVI线缆': 'cable',
    'EMS配件': 'ems',
    '4G路由': 'router',
    '天线': 'antenna',
    '液晶显示模块': 'display',
    '断路器': 'lv-cabinet',
    '隔离开关': 'lv-cabinet',
    '熔断器': 'lv-cabinet',
    '系统成套线缆': 'cable',
  };

  // ── 产品编码查找表：元件compId → 可用产品编码列表 ──
  // 从 DATA 中提取，支持管理员在"产品编码"Tab中修改后的数据
  function _buildProductCodeMap() {
    var map = {};
    // compId → DATA key 映射
    var compToDataKey = {
      'ess-cabinet': 'storageCabinets',
      'bus-cabinet': 'combiners',
      'lv-cabinet': 'combiners',
      'meter': 'secondaryMeters',
      'ct': 'transformers',
      'router': 'routers',
      'switch': 'switches',
      'power-module': 'powerModules',
      'ems': 'ems',
      'sim-card': 'simCards',
      'display': 'displays',
      'monitor-box': 'monitorCabinets',
      'serial-server': 'serialServers',
      'cable': 'cables',
      'pnt-terminal': 'pntTerminals',
      'sts-cabinet': 'stsCabinets',
      'antenna': 'emsAccessories',
      'gateway': 'emsAccessories',
      'ups': 'powerModules',
      'diesel-gen': null,
      'transformer': 'transformers',
      'hv-cabinet': null,
      'bms': null,
      'battery-pack': null,
      'battery-cluster': null,
      'pv-inverter': null,
      'spd': null,
      'fire-ext': null,
      'ac-unit': null,
      'water-sensor': null,
      'smoke-sensor': null,
      'door-sensor': null,
    };
    for (var compId in compToDataKey) {
      var dataKey = compToDataKey[compId];
      if (!dataKey || !DATA[dataKey]) continue;
      var items = DATA[dataKey];
      map[compId] = [];
      if (Array.isArray(items)) {
        items.forEach(function(item) {
          map[compId].push({ code: item.code, desc: item.desc });
        });
      }
    }
    return map;
  }
  var PRODUCT_CODE_MAP = _buildProductCodeMap();

  // ── 刷新产品编码查找表（管理员修改产品编码后调用）──
  function _refreshProductCodeMap() {
    PRODUCT_CODE_MAP = _buildProductCodeMap();
  }

  // ── 根据元件ID获取可用产品编码列表 ──
  function _getProductCodesForComp(compId) {
    // 精确匹配
    if (PRODUCT_CODE_MAP[compId] && PRODUCT_CODE_MAP[compId].length) {
      return PRODUCT_CODE_MAP[compId];
    }
    // 回退：尝试模糊匹配（通过元件名称）
    var comp = COMPONENT_BY_ID[compId];
    if (!comp) return [];
    var name = (comp.name || '').toLowerCase();
    // 搜索所有 DATA 中的产品数据
    var allProducts = [];
    var searchedKeys = {};
    for (var key in DATA) {
      if (!Array.isArray(DATA[key]) || searchedKeys[key]) continue;
      searchedKeys[key] = true;
      // 只搜索看起来是产品列表的字段（包含 code/desc 结构）
      var arr = DATA[key];
      if (arr.length && arr[0] && arr[0].code) {
        allProducts = allProducts.concat(arr.map(function(item) {
          return { code: item.code, desc: item.desc, _source: key };
        }));
      }
    }
    // 根据名称过滤
    var filtered = allProducts.filter(function(p) {
      var d = (p.desc || '').toLowerCase();
      return d.indexOf(name) >= 0;
    });
    return filtered.length ? filtered : allProducts.slice(0, 30); // 最多 30 个
  }

  // ── 从BOM同步到画板（智能合并模式：保留连线+位置，仅新增/更新）──
  function _syncBomToCanvas(topoId, forceRebuild) {
    var card = document.querySelector('.topo-admin-card[data-topo-id="' + topoId + '"]');
    if (!card) return;
    // 读取当前BOM行
    var bomRowEls = card.querySelectorAll('.bom-row');
    var bomRows = [];
    bomRowEls.forEach(function(row) {
      var inputs = row.querySelectorAll('input');
      if (inputs.length >= 5 && inputs[0].value.trim()) {
        bomRows.push({
          cat: inputs[0].value.trim(),
          code: inputs[1].value.trim(),
          desc: inputs[2].value.trim(),
          qty: parseInt(inputs[3].value.trim()) || 1,
          remark: inputs[4].value.trim()
        });
      }
    });
    if (!bomRows.length) { _showToast('⚠️ BOM表为空，请先填写BOM数据'); return; }

    var canvas = document.getElementById('topo-canvas-' + topoId);
    if (!canvas) return;
    var data = canvas._diagramData;
    if (!data) { data = { nodes: [], edges: [] }; canvas._diagramData = data; }

    // 如果是 forceRebuild 或画布完全为空，走原有的全量重建逻辑
    if (forceRebuild || !data.nodes.length) {
      data.nodes = [];
      data.edges = [];

      var layoutCols = 4, colSpacing = 200, rowSpacing = 180;
      var startX = 40, startY = 40;

      bomRows.forEach(function(bomRow, bomIdx) {
        var compId = _resolveCompId(bomRow);
        for (var q = 0; q < bomRow.qty; q++) {
          var nodeIdx = data.nodes.length;
          var col = nodeIdx % layoutCols, row = Math.floor(nodeIdx / layoutCols);
          var nodeData = {
            id: 'n' + Date.now() + '_' + nodeIdx,
            compId: compId,
            x: startX + col * colSpacing,
            y: startY + row * rowSpacing,
            label: bomRow.qty > 1 ? (bomRow.cat + (q + 1)) : bomRow.cat,
            productCode: bomRow.code,
            productDesc: bomRow.desc,
            bomQty: bomRow.qty,
            bomRemark: bomRow.remark,
            bomIndex: bomIdx,
            bomInstance: q
          };
          data.nodes.push(nodeData);
        }
      });

      _syncAndRender(canvas, topoId);
      _showToast('✅ 已从BOM同步 ' + data.nodes.length + ' 个元件到画板');
      return;
    }

    // ── 智能合并模式：保留已有节点的位置和连线 ──
    // 1. 构建 BOM 展开列表（每个数量为一行）
    var bomFlat = [];
    bomRows.forEach(function(bomRow, bomIdx) {
      var compId = _resolveCompId(bomRow);
      for (var q = 0; q < bomRow.qty; q++) {
        bomFlat.push({
          cat: bomRow.cat, code: bomRow.code, desc: bomRow.desc,
          qty: bomRow.qty, remark: bomRow.remark,
          compId: compId, bomIndex: bomIdx, bomInstance: q
        });
      }
    });

    // 2. 为画布上已有节点打标（按 compId + bomIndex + bomInstance 匹配）
    var matchedNodeIds = [];
    var existingByComp = {}; // compId → 该类型已有节点列表（尚未被匹配的）
    data.nodes.forEach(function(n, idx) {
      if (n.onEdge) return; // CT覆盖节点不参与BOM匹配
      if (!existingByComp[n.compId]) existingByComp[n.compId] = [];
      existingByComp[n.compId].push({ node: n, idx: idx });
    });

    // 3. 遍历 BOM 展开列表，优先匹配已有节点
    var updatedCount = 0, addedCount = 0;
    bomFlat.forEach(function(bomItem) {
      var pool = existingByComp[bomItem.compId] || [];
      // 优先找同 productCode 的已有节点
      var matched = null;
      for (var p = 0; p < pool.length; p++) {
        if (pool[p].node.productCode === bomItem.code) {
          matched = pool.splice(p, 1)[0]; break;
        }
      }
      // 其次按 bomIndex+bomInstance 匹配
      if (!matched) {
        for (var p2 = 0; p2 < pool.length; p2++) {
          if (pool[p2].node.bomIndex === bomItem.bomIndex && pool[p2].node.bomInstance === bomItem.bomInstance) {
            matched = pool.splice(p2, 1)[0]; break;
          }
        }
      }
      // 最后用同类型的剩余节点
      if (!matched && pool.length > 0) {
        matched = pool.shift();
      }

      if (matched) {
        // 更新已有节点的产品编码信息
        var n = matched.node;
        n.productCode = bomItem.code;
        n.productDesc = bomItem.desc;
        n.bomQty = bomItem.qty;
        n.bomRemark = bomItem.remark;
        n.bomIndex = bomItem.bomIndex;
        n.bomInstance = bomItem.bomInstance;
        n.label = bomItem.qty > 1 ? (bomItem.cat + (bomItem.bomInstance + 1)) : bomItem.cat;
        matchedNodeIds.push(n.id);
        updatedCount++;
      } else {
        // BOM中有但画布上没有 → 新增节点（放在已有节点附近）
        var lastNode = data.nodes.length ? data.nodes[data.nodes.length - 1] : null;
        var nx = lastNode ? lastNode.x + 60 : 40;
        var ny = lastNode ? lastNode.y : 40;
        // 如果放太远了就换行
        if (nx > 800) { nx = 40; ny = lastNode ? lastNode.y + 160 : 40; }
        var newNode = {
          id: 'n' + Date.now() + '_' + (data.nodes.length + addedCount),
          compId: bomItem.compId,
          x: nx, y: ny,
          label: bomItem.qty > 1 ? (bomItem.cat + (bomItem.bomInstance + 1)) : bomItem.cat,
          productCode: bomItem.code,
          productDesc: bomItem.desc,
          bomQty: bomItem.qty,
          bomRemark: bomItem.remark,
          bomIndex: bomItem.bomIndex,
          bomInstance: bomItem.bomInstance
        };
        data.nodes.push(newNode);
        matchedNodeIds.push(newNode.id);
        addedCount++;
      }
    });

    // 4. 清理画布上 BOM 中已不存在的节点（仅清理 fromBOM 的，保留手动拖入的）
    var nodesToRemove = [];
    data.nodes.forEach(function(n, idx) {
      if (n.onEdge) return; // 保留CT覆盖节点
      if (matchedNodeIds.indexOf(n.id) < 0 && n.productCode) {
        // 该节点有产品编码但在 BOM 中找不到了 → 清理
        nodesToRemove.push(n.id);
      }
    });
    if (nodesToRemove.length > 0) {
      data.nodes = data.nodes.filter(function(n) { return nodesToRemove.indexOf(n.id) < 0; });
      // 清理关联的连线
      data.edges = data.edges.filter(function(e) {
        return nodesToRemove.indexOf(e.from) < 0 && nodesToRemove.indexOf(e.to) < 0;
      });
      // 清理依附于被删连线的CT
      var removedEdges = [];
      data.edges.forEach(function(e) {
        if (nodesToRemove.indexOf(e.from) >= 0 || nodesToRemove.indexOf(e.to) >= 0) removedEdges.push(e.id);
      });
      data.nodes = data.nodes.filter(function(n) {
        return !(n.compId === 'ct' && n.onEdge && removedEdges.indexOf(n.onEdge) >= 0);
      });
    }

    var totalNodes = data.nodes.filter(function(n) { return !n.onEdge; }).length;
    _syncAndRender(canvas, topoId);
    var msg = '✅ 智能同步完成：更新 ' + updatedCount + ' 个，新增 ' + addedCount + ' 个';
    if (nodesToRemove.length) msg += '，移除 ' + nodesToRemove.length + ' 个过时元件';
    msg += '（共 ' + totalNodes + ' 个元件，连线已保留）';
    _showToast(msg);
  }

  // ── 解析 BOM 类别到 compId ──
  function _resolveCompId(bomRow) {
    var compId = BOM_CAT_TO_COMPID[bomRow.cat];
    if (!compId) {
      for (var cid in COMPONENT_BY_ID) {
        if (COMPONENT_BY_ID[cid].name === bomRow.cat || COMPONENT_BY_ID[cid].label === bomRow.cat) {
          compId = cid; break;
        }
      }
    }
    return compId || 'ess-cabinet';
  }

  // 生成 SVG 字符串（用于渲染到前端 index.html）
  function _generateSvgFromDiagram(data) {
    if (!data || !data.nodes || !data.nodes.length) return '';
    var nodes = data.nodes, edges = data.edges || [];
    // 计算包围盒
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(function(n) {
      var c = COMPONENT_BY_ID[n.compId]; if (!c) return;
      var w = c.width, h = c.height;
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x + w > maxX) maxX = n.x + w;
      if (n.y + h > maxY) maxY = n.y + h;
    });
    if (!isFinite(minX)) return '';
    var pad = 40, vbW = maxX - minX + pad*2, vbH = maxY - minY + pad*2;
    var svg = '<svg viewBox="' + minX + ' ' + minY + ' ' + vbW + ' ' + vbH + '" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">';

    // 连接线
    edges.forEach(function(e) {
      var fn = null, tn = null;
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].id === e.from) fn = nodes[i];
        if (nodes[i].id === e.to) tn = nodes[i];
      }
      if (!fn || !tn) return;
      var fc = COMPONENT_BY_ID[fn.compId], tc = COMPONENT_BY_ID[tn.compId];
      if (!fc || !tc) return;
      var fp = _getPortPos(fn, e.fromPort || 'center', fc);
      var tp = _getPortPos(tn, e.toPort || 'center', tc);
      var ct = CABLE_BY_ID[e.cableType] || CABLE_BY_ID['ethernet'];
      var fromPortSide = (e.fromPort || 'center');
      var toPortSide   = (e.toPort    || 'center');
      var cable = _buildCablePath(fp, tp, fromPortSide, toPortSide, data.nodes, fn, tn, fc, tc);
      var midX = cable.midX, midY = cable.midY;
      svg += '<path d="' + cable.path +
        '" stroke="' + ct.color + '" stroke-width="' + ct.width + '" fill="none" stroke-linecap="round" stroke-linejoin="round"' +
        (ct.dash !== 'none' ? ' stroke-dasharray="' + ct.dash + '"' : '') + '/>';
      svg += '<rect x="' + (midX - 24) + '" y="' + (midY - 9) + '" width="' + (ct.label.length * 9 + 12) + '" height="14" rx="4" fill="' + ct.color + '" opacity="0.85"/>';
      svg += '<text x="' + midX + '" y="' + (midY + 1) + '" text-anchor="middle" font-size="8" font-weight="700" fill="#fff" font-family="Arial,sans-serif">' + ct.label + '</text>';
    });

    // 元件
    nodes.forEach(function(n) {
      var c = COMPONENT_BY_ID[n.compId]; if (!c) return;
      // CT覆盖在连线上
      if (n.compId === 'ct' && n.onEdge) {
        var edge = null;
        for (var ei = 0; ei < edges.length; ei++) { if (edges[ei].id === n.onEdge) { edge = edges[ei]; break; } }
        if (edge) {
          var efn = null, etn = null;
          for (var ni = 0; ni < nodes.length; ni++) {
            if (nodes[ni].id === edge.from) efn = nodes[ni];
            if (nodes[ni].id === edge.to) etn = nodes[ni];
          }
          if (efn && etn) {
            var efc = COMPONENT_BY_ID[efn.compId], etc = COMPONENT_BY_ID[etn.compId];
            if (efc && etc) {
              var efp = _getPortPos(efn, edge.fromPort || 'center', efc);
              var etp = _getPortPos(etn, edge.toPort || 'center', etc);
              var t = n.t || 0.5;
              var cx = efp.x + (etp.x - efp.x) * t, cy = efp.y + (etp.y - efp.y) * t;
              svg += '<g transform="translate(' + (cx - c.width/2) + ',' + (cy - c.height/2) + ')">' + c.svg +
                '<text x="' + (c.width/2) + '" y="' + (c.height + 14) + '" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.7">' + (n.label || 'CT') + '</text></g>';
            }
          }
        }
        return;
      }
      svg += '<g transform="translate(' + n.x + ',' + n.y + ')' + (n.rotation ? ' rotate(' + n.rotation + ' ' + (c.width/2) + ' ' + (c.height/2) + ')' : '') + '">' + c.svg +
        '<text x="' + (c.width/2) + '" y="' + (c.height + 14) + '" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.7">' + (n.label || c.label || c.name) + '</text></g>';
    });

    svg += '</svg>';
    return svg;
  }

  function _getPortPos(node, portId, comp) {
    // center 端口 → 返回元件中心
    if (portId === 'center') {
      return { x: node.x + comp.width / 2, y: node.y + comp.height / 2 };
    }
    var p = null;
    (comp.ports || []).forEach(function(pt) { if (pt.id === portId) p = pt; });
    var px = p ? p.x : 0.5, py = p ? p.y : 1;
    // 补偿元件旋转：将端口相对位置按旋转角度变换到画布坐标
    var rot = (node.rotation || 0) * Math.PI / 180;
    var dx = comp.width * (px - 0.5), dy = comp.height * (py - 0.5);
    var cos = Math.cos(rot), sin = Math.sin(rot);
    var rdx = dx * cos - dy * sin, rdy = dx * sin + dy * cos;
    return { x: node.x + comp.width / 2 + rdx, y: node.y + comp.height / 2 + rdy };
  }

  /* 线缆端点标记：不同缆型用不同终端形状区分
     数据类 → 空心箭头 / 电源类 → 实心圆 / 高压类 → 实心三角 / 母线 → 实心菱形 */
  function _getCableEndMarkers(cableType, x, y, color) {
    var ct = CABLE_BY_ID[cableType];
    if (!ct) ct = CABLE_BY_ID['ethernet'];
    var id = ct.id;
    var r = Math.max(2.5, ct.width * 1.2);
    // 数据线缆（网线/RS485/CAN）：空心箭头
    if (id === 'ethernet' || id === 'ethernet-outdoor' || id === 'rs485' || id === 'can') {
      return '<polygon points="' + x + ',' + (y - r) + ' ' + (x + r * 2) + ',' + y + ' ' + x + ',' + (y + r) +
        '" fill="none" stroke="' + color + '" stroke-width="' + Math.max(1.5, ct.width * 0.8) + '" stroke-linejoin="round"/>';
    }
    // 低压电源线（24V/12V）：实心圆
    if (id === 'power24v' || id === 'power12v') {
      return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + color + '"/>';
    }
    // 交流/直流电缆：实心三角
    if (id === 'ac-cable' || id === 'dc-cable' || id === 'power220v') {
      return '<polygon points="' + x + ',' + (y - r * 1.2) + ' ' + (x + r * 1.8) + ',' + y + ' ' + x + ',' + (y + r * 1.2) +
        '" fill="' + color + '"/>';
    }
    // 高压/母线/STS：实心菱形
    if (id === 'hv-cable' || id === 'bus10k' || id === 'sts') {
      return '<polygon points="' + x + ',' + (y - r * 1.5) + ' ' + (x + r * 1.8) + ',' + y + ' ' + x + ',' + (y + r * 1.5) + ' ' + (x - r * 1.8) + ',' + y +
        '" fill="' + color + '"/>';
    }
    // LV 线缆：实心方块
    if (id === 'lv-cable') {
      return '<rect x="' + (x - r) + '" y="' + (y - r) + '" width="' + (r * 2) + '" height="' + (r * 2) + '" fill="' + color + '"/>';
    }
    return '';
  }

  /* 构建折线路径 d 属性
     根据 fromPort / toPort 方向，生成直角折线，自动避让元件。
     若端口为 'center' → 从元件中心出发，先走到元件边缘再正交走线。
     碰撞检测：检查路径是否穿过其他元件的包围盒。
     返回 { path: 'M x1 y1 L ...', midX, midY } */
  function _buildCablePath(fp, tp, fromPortSide, toPortSide, allNodes, fn, tn, fc, tc, waypoints) {
    // ── center 端口：将中心坐标转换为边缘出口/入口，确保线缆连到边缘而非中心 ──
    var isCenterF = (fromPortSide === 'center');
    var isCenterT = (toPortSide === 'center');

    if (isCenterF || isCenterT) {
      var scx = fn.x + fc.width / 2;
      var scy = fn.y + fc.height / 2;
      var tcx = tn.x + tc.width / 2;
      var tcy = tn.y + tc.height / 2;
      var hwF = fc.width / 2, hhF = fc.height / 2;
      var hwT = tc.width / 2, hhT = tc.height / 2;
      var useHorizontal = Math.abs(tcx - scx) > Math.abs(tcy - scy);

      if (isCenterF) {
        if (useHorizontal) {
          fromPortSide = (tcx > scx) ? 'right' : 'left';
          fp = { x: scx + (tcx > scx ? hwF : -hwF), y: fp.y };
        } else {
          fromPortSide = (tcy > scy) ? 'bottom' : 'top';
          fp = { x: fp.x, y: scy + (tcy > scy ? hhF : -hhF) };
        }
      }
      if (isCenterT) {
        if (useHorizontal) {
          toPortSide = (scx > tcx) ? 'right' : 'left';
          tp = { x: tcx + (scx > tcx ? hwT : -hwT), y: tp.y };
        } else {
          toPortSide = (scy > tcy) ? 'bottom' : 'top';
          tp = { x: tp.x, y: tcy + (scy > tcy ? hhT : -hhT) };
        }
      }
    }

    // 如果有自定义路径点（用户拖拽控制点），保留 waypoint 路径
    if (isCenterF && isCenterT && waypoints && waypoints.length > 0) {
      var d = 'M ' + fp.x + ' ' + fp.y;
      var pts = [{ x: fp.x, y: fp.y }];
      for (var w = 0; w < waypoints.length; w++) {
        d += ' L ' + waypoints[w].x + ' ' + waypoints[w].y;
        pts.push({ x: waypoints[w].x, y: waypoints[w].y });
      }
      d += ' L ' + tp.x + ' ' + tp.y;
      pts.push({ x: tp.x, y: tp.y });
      var midIdx2 = Math.floor((waypoints.length + 1) / 2);
      return { path: d, midX: pts[midIdx2] ? pts[midIdx2].x : (fp.x + tp.x) / 2,
               midY: pts[midIdx2] ? pts[midIdx2].y : (fp.y + tp.y) / 2, points: pts };
    }

    // ── 构建路径 ──
    var _isV = function(s) { return s === 'top' || s === 'bottom'; };
    var _isH = function(s) { return s === 'left' || s === 'right'; };

    // ── 非 center（现在两端都已是边缘端口）→ 正常路由 ──
    var vf = _isV(fromPortSide), vh = _isH(fromPortSide);
    var vt = _isV(toPortSide), th = _isH(toPortSide);

    // 同方向 → 直角折线
    if ((vf && vt) || (vh && th)) {
      var candidates = [];
      if (vf) {
        var my = (fp.y + tp.y) / 2;
        candidates.push({
          path: 'M ' + fp.x + ' ' + fp.y + ' L ' + fp.x + ' ' + my + ' L ' + tp.x + ' ' + my + ' L ' + tp.x + ' ' + tp.y,
          midX: (fp.x + tp.x) / 2, midY: my,
          segs: [
            { x1: fp.x, y1: fp.y, x2: fp.x, y2: my },
            { x1: fp.x, y1: my, x2: tp.x, y2: my },
            { x1: tp.x, y1: my, x2: tp.x, y2: tp.y }
          ]
        });
        candidates.push({
          path: 'M ' + fp.x + ' ' + fp.y + ' L ' + tp.x + ' ' + fp.y + ' L ' + tp.x + ' ' + tp.y,
          midX: tp.x, midY: (fp.y + tp.y) / 2,
          segs: [
            { x1: fp.x, y1: fp.y, x2: tp.x, y2: fp.y },
            { x1: tp.x, y1: fp.y, x2: tp.x, y2: tp.y }
          ]
        });
      } else {
        var mx = (fp.x + tp.x) / 2;
        candidates.push({
          path: 'M ' + fp.x + ' ' + fp.y + ' L ' + mx + ' ' + fp.y + ' L ' + mx + ' ' + tp.y + ' L ' + tp.x + ' ' + tp.y,
          midX: mx, midY: (fp.y + tp.y) / 2,
          segs: [
            { x1: fp.x, y1: fp.y, x2: mx, y2: fp.y },
            { x1: mx, y1: fp.y, x2: mx, y2: tp.y },
            { x1: mx, y1: tp.y, x2: tp.x, y2: tp.y }
          ]
        });
        candidates.push({
          path: 'M ' + fp.x + ' ' + fp.y + ' L ' + fp.x + ' ' + tp.y + ' L ' + tp.x + ' ' + tp.y,
          midX: (fp.x + tp.x) / 2, midY: tp.y,
          segs: [
            { x1: fp.x, y1: fp.y, x2: fp.x, y2: tp.y },
            { x1: fp.x, y1: tp.y, x2: tp.x, y2: tp.y }
          ]
        });
      }
      var best = candidates[0], bestScore = Infinity;
      for (var ci = 0; ci < candidates.length; ci++) {
        var cand = candidates[ci];
        var collisions = 0;
        for (var si = 0; si < cand.segs.length; si++) {
          if (_pathCollidesWithNodes(cand.segs[si].x1, cand.segs[si].y1, cand.segs[si].x2, cand.segs[si].y2, allNodes, fn, tn)) collisions++;
        }
        if (collisions < bestScore) { bestScore = collisions; best = cand; }
        if (collisions === 0) break;
      }
      return { path: best.path, midX: best.midX, midY: best.midY };
    }

    // 折线
    candidates = [];
    if (vh) {
      candidates.push({
        path: 'M ' + fp.x + ' ' + fp.y + ' L ' + tp.x + ' ' + fp.y + ' L ' + tp.x + ' ' + tp.y,
        midX: tp.x, midY: (fp.y + tp.y) / 2,
        segs: [
          { x1: fp.x, y1: fp.y, x2: tp.x, y2: fp.y },
          { x1: tp.x, y1: fp.y, x2: tp.x, y2: tp.y }
        ]
      });
      candidates.push({
        path: 'M ' + fp.x + ' ' + fp.y + ' L ' + fp.x + ' ' + tp.y + ' L ' + tp.x + ' ' + tp.y,
        midX: (fp.x + tp.x) / 2, midY: tp.y,
        segs: [
          { x1: fp.x, y1: fp.y, x2: fp.x, y2: tp.y },
          { x1: fp.x, y1: tp.y, x2: tp.x, y2: tp.y }
        ]
      });
    } else {
      candidates.push({
        path: 'M ' + fp.x + ' ' + fp.y + ' L ' + fp.x + ' ' + tp.y + ' L ' + tp.x + ' ' + tp.y,
        midX: (fp.x + tp.x) / 2, midY: tp.y,
        segs: [
          { x1: fp.x, y1: fp.y, x2: fp.x, y2: tp.y },
          { x1: fp.x, y1: tp.y, x2: tp.x, y2: tp.y }
        ]
      });
      candidates.push({
        path: 'M ' + fp.x + ' ' + fp.y + ' L ' + tp.x + ' ' + fp.y + ' L ' + tp.x + ' ' + tp.y,
        midX: tp.x, midY: (fp.y + tp.y) / 2,
        segs: [
          { x1: fp.x, y1: fp.y, x2: tp.x, y2: fp.y },
          { x1: tp.x, y1: fp.y, x2: tp.x, y2: tp.y }
        ]
      });
    }

    for (var ci = 0; ci < candidates.length; ci++) {
      var cand = candidates[ci];
      var collides = false;
      for (var si = 0; si < cand.segs.length; si++) {
        var seg = cand.segs[si];
        if (_pathCollidesWithNodes(seg.x1, seg.y1, seg.x2, seg.y2, allNodes, fn, tn)) {
          collides = true; break;
        }
      }
      if (!collides) return { path: cand.path, midX: cand.midX, midY: cand.midY };
    }
    return { path: candidates[0].path, midX: candidates[0].midX, midY: candidates[0].midY };
  }

  // 检查线段是否与任何节点碰撞（排除自身节点）
  function _pathCollidesWithNodes(x1, y1, x2, y2, allNodes, excludeNodeA, excludeNodeB) {
    if (!allNodes) return false;
    for (var i = 0; i < allNodes.length; i++) {
      var n = allNodes[i];
      if (excludeNodeA && n.id === excludeNodeA.id) continue;
      if (excludeNodeB && n.id === excludeNodeB.id) continue;
      // 所有 CT/互感器类型元件不算障碍（允许线缆与CT叠加）
      if (n.compId === 'ct') continue;
      var comp = COMPONENT_BY_ID[n.compId];
      if (comp && comp.overlayEdge) continue;
      var c = comp;
      if (!c) continue;
      var margin = 8; // 碰撞边距
      var rx = n.x - margin, ry = n.y - margin;
      var rw = c.width + margin * 2, rh = c.height + margin * 2;
      if (_segmentIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh)) return true;
    }
    return false;
  }

  // 线段与矩形碰撞检测
  function _segmentIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
    var rl = rx, rr = rx + rw, rt = ry, rb = ry + rh;
    // 快速剔除：线段包围盒与矩形不相交
    if (Math.min(x1, x2) > rr || Math.max(x1, x2) < rl ||
        Math.min(y1, y2) > rb || Math.max(y1, y2) < rt) return false;
    // 检查线段两端是否在矩形内
    if (x1 >= rl && x1 <= rr && y1 >= rt && y1 <= rb) return true;
    if (x2 >= rl && x2 <= rr && y2 >= rt && y2 <= rb) return true;
    // 检查线段与矩形四边相交
    return _linesIntersect(x1, y1, x2, y2, rl, rt, rr, rt) ||
           _linesIntersect(x1, y1, x2, y2, rr, rt, rr, rb) ||
           _linesIntersect(x1, y1, x2, y2, rr, rb, rl, rb) ||
           _linesIntersect(x1, y1, x2, y2, rl, rb, rl, rt);
  }

  function _linesIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    var d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(d) < 0.001) return false;
    var t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d;
    var u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / d;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  // 初始化编辑器（在 toggleTopoEditor 展开后调用）
  function _initTopoEditor(topoId) {
    var canvas = document.getElementById('topo-canvas-' + topoId);
    if (!canvas) return;
    // 渲染元件库
    _renderComponentLib(topoId);
    // 从 hidden input 读取数据并渲染画布
    var input = canvas.closest('.topo-editor-section').querySelector('.topo-edit-diagram-data');
    var data = { nodes: [], edges: [] };
    if (input && input.value) {
      try { data = JSON.parse(input.value); } catch(e) { data = { nodes: [], edges: [] }; }
    }
    // 给旧边补充默认 cableType 和 center 端口
    (data.edges||[]).forEach(function(e) {
      if (!e.cableType) e.cableType = 'ethernet';
      if (!e.fromPort) e.fromPort = 'center';
      if (!e.toPort) e.toPort = 'center';
    });
    canvas._diagramData = data;
    canvas._selectedCableType = 'ethernet'; // 默认线缆类型
    canvas._selectedEdgeId = null;
    _renderTopoCanvas(topoId);
    _updateCableTypeBtns(topoId);

    // 首次加载时居中画布
    if (!canvas._zoom) {
      _topoResetView(topoId);
    }

    // 画布拖拽+点击事件
    var wrap = document.getElementById('topo-canvas-wrap-' + topoId);
    if (!wrap._inited) {
      wrap._inited = true;
      _setupCanvasEvents(wrap, canvas, topoId);
      _setupLegendDrag(wrap, topoId);
    }
    // 如果是从旧 SVG 迁移过来的（没节点但有 legacySvg），显示提示
    if (data.legacySvg && !data.nodes.length) {
      canvas.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:rgba(180,210,255,0.4)">' +
        '<div style="font-size:32px;margin-bottom:8px">📐</div>' +
        '<div style="font-size:12px">此方案使用旧版 SVG 源码</div>' +
        '<div style="font-size:11px;margin-top:4px">请使用元件库重新搭建拓扑</div>' +
        '</div>';
    }
  }

  // 渲染元件库面板
  function _renderComponentLib(topoId) {
    var scroll = document.getElementById('topo-lib-scroll-' + topoId);
    if (!scroll) return;

    // 读取停用元件列表（来自元件库管理中心的 STORAGE）
    var disabledIds = {};
    try {
      var savedLib = STORAGE.get('components');
      if (Array.isArray(savedLib)) {
        savedLib.forEach(function(c) {
          if (c.enabled === false) disabledIds[c.id] = true;
        });
      }
    } catch(e) {}

    var html = '';
    var catMap = {};
    COMPONENT_LIB.forEach(function(c) {
      if (disabledIds[c.id]) return; // 跳过停用的元件
      if (!catMap[c.category]) catMap[c.category] = [];
      catMap[c.category].push(c);
    });
    COMPONENT_CATEGORIES.forEach(function(cat) {
      var comps = catMap[cat.id]; if (!comps || !comps.length) return;
      html += '<div class="topo-lib-cat">' + cat.icon + ' ' + cat.name + '</div>';
      comps.forEach(function(c) {
        html += '<div class="topo-lib-item" draggable="true" ' +
          'data-comp-id="' + c.id + '" ' +
          'data-topo-id="' + topoId + '" ' +
          'ondragstart="ADMIN._onLibDragStart(event)" ' +
          'ondragend="ADMIN._onLibDragEnd(event)">' +
          '<div class="topo-lib-icon"><svg viewBox="0 0 '+c.width+' '+c.height+'" width="22" height="14">' + c.svg + '</svg></div>' +
          '<div class="topo-lib-label">' + c.name + '</div>' +
        '</div>';
      });
    });
    scroll.innerHTML = html;
  }

  // 搜索过滤元件库
  function _filterComponentLib(input) {
    var topoId = input.closest('.topo-editor-section').querySelector('[data-topo-id]').getAttribute('data-topo-id');
    var q = input.value.toLowerCase();
    var items = document.querySelectorAll('#topo-lib-scroll-' + topoId + ' .topo-lib-item');
    var cats = document.querySelectorAll('#topo-lib-scroll-' + topoId + ' .topo-lib-cat');
    items.forEach(function(item) {
      var name = (item.getAttribute('data-comp-id') || '').toLowerCase();
      item.style.display = (!q || name.indexOf(q) >= 0) ? '' : 'none';
    });
    // 隐藏空的分类标题
    cats.forEach(function(cat) {
      var next = cat.nextElementSibling, allHidden = true;
      while (next && !next.classList.contains('topo-lib-cat')) {
        if (next.style.display !== 'none') { allHidden = false; break; }
        next = next.nextElementSibling;
      }
      cat.style.display = allHidden ? 'none' : '';
    });
  }

  // 更新线缆类型选择器按钮状态
  function _updateCableTypeBtns(topoId) {
    var canvas = document.getElementById('topo-canvas-' + topoId);
    if (!canvas) return;
    var btns = document.querySelectorAll('#topo-cable-selector-' + topoId + ' .cable-type-btn');
    btns.forEach(function(b) {
      b.classList.toggle('active', b.getAttribute('data-cable') === canvas._selectedCableType);
    });
  }

  // 选择线缆类型（toggle：再次点击已选中的 → 取消）
  function _selectCableType(topoId, cableType) {
    var canvas = document.getElementById('topo-canvas-' + topoId);
    if (!canvas) return;
    // toggle：如果点击已选中的类型，则取消选择
    if (canvas._selectedCableType === cableType) {
      canvas._selectedCableType = '';
    } else {
      canvas._selectedCableType = cableType;
    }
    _updateCableTypeBtns(topoId);
    _updateCableSelectorHint(topoId);
    // 更新光标
    var wrap = document.getElementById('topo-canvas-wrap-' + topoId);
    if (wrap) wrap.style.cursor = canvas._selectedCableType ? 'crosshair' : '';
    // 如果取消了选择，也退出连线源模式
    if (!canvas._selectedCableType && canvas._connectSource) {
      _exitConnectSource(canvas, topoId);
    }
  }

  // 更新线缆窗口标题栏提示文字
  function _updateCableSelectorHint(topoId) {
    var legend = document.getElementById('topo-cable-selector-' + topoId);
    if (!legend) return;
    var hdr = legend.querySelector('.cable-legend-header');
    if (!hdr) return;
    var canvas = document.getElementById('topo-canvas-' + topoId);
    var typeName = '';
    if (canvas && canvas._selectedCableType) {
      var ct = CABLE_TYPES.find(function(c) { return c.id === canvas._selectedCableType; });
      typeName = ct ? ct.name : '';
    }
    if (typeName) {
      hdr.innerHTML = '〰️ ' + typeName + ' <span style="font-size:10px;opacity:.6;font-weight:400">｜点击元件连线，再次点击取消</span>';
    } else {
      hdr.innerHTML = '〰️ 线缆类型';
    }
  }

  // ── 智能检测最佳连接端口 ────────────
  // 根据两个元件的相对位置判断用哪些端口
  function _autoDetectPorts(sourceNode, targetNode, sourceComp, targetComp) {
    var sx = sourceNode.x + sourceComp.width / 2;
    var sy = sourceNode.y + sourceComp.height / 2;
    var tx = targetNode.x + targetComp.width / 2;
    var ty = targetNode.y + targetComp.height / 2;
    var dx = tx - sx, dy = ty - sy;
    // 始终从元件中心连线，方向用于走线时的出口/入口判定
    var fromPort = 'center', toPort = 'center';
    return { fromPort: fromPort, toPort: toPort };
  }

  function _portAvailable(comp, portId) {
    return (comp.ports || []).some(function(p) { return p.id === portId; });
  }

  function _firstAvailablePort(comp) {
    var ports = comp.ports || [];
    if (ports.length > 0) return ports[0].id;
    return null;
  }

  // ── 进入/退出连线源模式 ────────
  function _enterConnectSource(canvas, topoId, nodeId, nodeEl) {
    _exitConnectSource(canvas, topoId);
    canvas._connectSource = { nodeId: nodeId, nodeEl: nodeEl };
    nodeEl.classList.add('connect-source');
    canvas.classList.add('connect-mode');
    // 创建预览 SVG
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'topo-conn-preview');
    svg.setAttribute('id', 'topo-conn-preview-' + topoId);
    var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('stroke', '#F39C12');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-dasharray', '6 4');
    line.setAttribute('id', 'topo-conn-preview-line-' + topoId);
    svg.appendChild(line);
    canvas.appendChild(svg);
    canvas._previewLine = line;
    canvas._previewSvg = svg;
    // 初始位置：从源元件中心出发
    var node = _findNode(canvas, nodeId);
    var comp = COMPONENT_BY_ID[node.compId];
    if (node && comp) {
      var cx = node.x + comp.width / 2;
      var cy = node.y + comp.height / 2;
      line.setAttribute('x1', cx);
      line.setAttribute('y1', cy);
      line.setAttribute('x2', cx);
      line.setAttribute('y2', cy);
    }
    document.addEventListener('keydown', _onConnectModeEsc);
  }

  function _exitConnectSource(canvas, topoId) {
    if (!canvas._connectSource) return;
    if (canvas._connectSource.nodeEl) {
      canvas._connectSource.nodeEl.classList.remove('connect-source');
    }
    canvas.classList.remove('connect-mode');
    if (canvas._previewSvg) {
      canvas._previewSvg.remove();
      canvas._previewSvg = null;
      canvas._previewLine = null;
    }
    canvas._connectSource = null;
    // 清理预览 rAF
    if (canvas._connPreviewRafId) { cancelAnimationFrame(canvas._connPreviewRafId); canvas._connPreviewRafId = null; }
    var wrap = document.getElementById('topo-canvas-wrap-' + topoId);
    if (wrap) wrap.style.cursor = '';
    document.removeEventListener('keydown', _onConnectModeEsc);
  }

  function _onConnectModeEsc(e) {
    if (e.key !== 'Escape') return;
    var allCanvases = document.querySelectorAll('.topo-canvas-inner');
    allCanvases.forEach(function(c) {
      var tId = c.getAttribute('data-topo-id');
      if (tId) _exitConnectSource(c, tId);
    });
  }

  // ── 智能连线（点击连线核心逻辑）───
  function _smartConnect(canvas, topoId, sourceNodeId, targetNodeId) {
    var sourceNode = _findNode(canvas, sourceNodeId);
    var targetNode = _findNode(canvas, targetNodeId);
    if (!sourceNode || !targetNode) return;
    var sc = COMPONENT_BY_ID[sourceNode.compId];
    var tc = COMPONENT_BY_ID[targetNode.compId];
    if (!sc || !tc) return;

    var ports = _autoDetectPorts(sourceNode, targetNode, sc, tc);
    if (!ports.fromPort || !ports.toPort) return;

    // 检查重复边
    var data = canvas._diagramData;
    var exists = data.edges.some(function(e) {
      return e.from === sourceNodeId && e.to === targetNodeId;
    });
    if (exists) return;

    // 计算端口分布
    var fromDistrib = _countPortEdges(data, sourceNodeId, ports.fromPort);
    var toDistrib   = _countPortEdges(data, targetNodeId, ports.toPort);

    data.edges.push({
      id: 'e' + Date.now(),
      from: sourceNodeId, to: targetNodeId,
      fromPort: ports.fromPort, toPort: ports.toPort,
      cableType: canvas._selectedCableType || 'ethernet',
      fromPortIdx: fromDistrib,
      toPortIdx: toDistrib
    });

    _syncAndRender(canvas, topoId);
    // 连线完成后不清空 _selectedCableType，保持选中可连续连线
    // 只退出当前的 _connectSource，等待用户点击下一个源元件
    if (canvas._connectSource) {
      _exitConnectSource(canvas, topoId);
    }
  }

  function _countPortEdges(data, nodeId, portId) {
    var count = 0;
    data.edges.forEach(function(e) {
      if ((e.from === nodeId && e.fromPort === portId) ||
          (e.to === nodeId && e.toPort === portId)) {
        count++;
      }
    });
    return count;
  }

  // ── 线缆类型管理器（添加/删除/编辑颜色和粗细）──
  function _openCableManager(topoId) {
    // 创建遮罩和弹窗
    var overlay = document.createElement('div');
    overlay.className = 'cable-manager-overlay';
    overlay.id = 'cable-manager-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) _closeCableManager(); };
    // 构建编辑列表
    var rowsHTML = CABLE_TYPES.map(function(ct, idx) {
      var dashOpts = ['none','4 3','6 3','8 4','2 2','10 5'];
      var dashHTML = dashOpts.map(function(d) {
        return '<option value="' + d + '"' + (ct.dash === d ? ' selected' : '') + '>' + (d === 'none' ? '实线' : '虚线 ' + d) + '</option>';
      }).join('');
      return '<div class="cable-mgr-row" data-idx="' + idx + '">' +
        '<span class="cable-mgr-color-pick"><input type="color" value="' + ct.color + '" onchange="ADMIN._updateCableField(' + idx + ',\'color\',this.value)" /></span>' +
        '<input class="cable-mgr-name" value="' + ct.name + '" onchange="ADMIN._updateCableField(' + idx + ',\'name\',this.value)" title="名称" />' +
        '<input class="cable-mgr-label" value="' + ct.label + '" onchange="ADMIN._updateCableField(' + idx + ',\'label\',this.value)" title="标签" maxlength="8" />' +
        '<input class="cable-mgr-width" type="number" step="0.5" min="0.5" max="10" value="' + ct.width + '" onchange="ADMIN._updateCableField(' + idx + ',\'width\',parseFloat(this.value))" title="线宽" />' +
        '<select class="cable-mgr-dash" onchange="ADMIN._updateCableField(' + idx + ',\'dash\',this.value)">' + dashHTML + '</select>' +
        '<button class="cable-mgr-del" onclick="ADMIN._deleteCableType(' + idx + ',\'' + topoId + '\')" title="删除">×</button>' +
        '<svg class="cable-mgr-preview" width="60" height="14" viewBox="0 0 60 14"><line x1="2" y1="7" x2="58" y2="7" stroke="' + ct.color + '" stroke-width="' + Math.max(1.5, ct.width) + '" stroke-linecap="round"' + (ct.dash !== 'none' ? ' stroke-dasharray="' + ct.dash + '"' : '') + '/></svg>' +
      '</div>';
    }).join('');
    overlay.innerHTML = '' +
      '<div class="cable-manager-dialog">' +
        '<div class="cable-manager-header">⚙ 线缆类型管理' +
          '<button class="cable-manager-close" onclick="ADMIN._closeCableManager()">×</button>' +
        '</div>' +
        '<div class="cable-manager-hint">编辑颜色、名称、标签、线宽、线型；修改后自动保存到项目文件夹</div>' +
        '<div class="cable-manager-list">' + rowsHTML + '</div>' +
        '<div class="cable-manager-footer">' +
          '<button class="cable-manager-add" onclick="ADMIN._addCableType(\'' + topoId + '\')">＋ 添加线缆类型</button>' +
          '<button class="cable-manager-save" onclick="ADMIN._saveAndCloseCableManager(\'' + topoId + '\')">💾 保存并关闭</button>' +
          '<button class="cable-manager-reset" onclick="if(confirm(\'确定恢复默认线缆类型？自定义数据将丢失。\'))ADMIN._resetCableTypes(\'' + topoId + '\')">↺ 恢复默认</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
  }

  function _updateCableField(idx, field, value) {
    if (idx < 0 || idx >= CABLE_TYPES.length) return;
    CABLE_TYPES[idx][field] = value;
    // 实时更新预览
    var row = document.querySelector('.cable-mgr-row[data-idx="' + idx + '"]');
    if (row) {
      var preview = row.querySelector('.cable-mgr-preview line');
      var colorInput = row.querySelector('.cable-mgr-color-pick input');
      if (preview) {
        if (field === 'color') preview.setAttribute('stroke', value);
        if (field === 'width') preview.setAttribute('stroke-width', Math.max(1.5, value));
        if (field === 'dash') preview.setAttribute('stroke-dasharray', value === 'none' ? 'none' : value);
      }
    }
  }

  function _addCableType(topoId) {
    var newId = 'cable_' + Date.now();
    CABLE_TYPES.push({ id: newId, name: '新线缆', color: '#CCCCCC', width: 2, dash: 'none', label: 'NEW' });
    // 关闭弹窗并重新打开以刷新列表
    _closeCableManager();
    setTimeout(function() { _openCableManager(topoId); }, 100);
  }

  function _deleteCableType(idx, topoId) {
    if (CABLE_TYPES.length <= 1) { alert('⚠️ 至少保留一种线缆类型'); return; }
    if (!confirm('确定删除「' + CABLE_TYPES[idx].name + '」？')) return;
    CABLE_TYPES.splice(idx, 1);
    _closeCableManager();
    setTimeout(function() { _openCableManager(topoId); }, 100);
  }

  function _resetCableTypes(topoId) {
    CABLE_TYPES = JSON.parse(JSON.stringify(CABLE_TYPES_DEFAULTS));
    _closeCableManager();
    saveCableTypes();
    _refreshAllCableLegends();
    _showToast('✅ 线缆类型已恢复默认');
  }

  function _saveAndCloseCableManager(topoId) {
    _closeCableManager();
    saveCableTypes();
    _rebuildCableById();
    _refreshAllCableLegends();
    // 刷新画布中的连线颜色
    _refreshTopoEdgeColors(null);
    _showToast('✅ 线缆类型已保存');
  }

  function _closeCableManager() {
    var overlay = document.getElementById('cable-manager-overlay');
    if (overlay) overlay.remove();
  }

  // 刷新所有画布的线缆图例和按钮
  function _refreshAllCableLegends() {
    document.querySelectorAll('.cable-legend-float').forEach(function(legend) {
      var topoId = legend.id.replace('topo-cable-selector-', '');
      var body = legend.querySelector('.cable-legend-body');
      if (!body) return;
      body.innerHTML = CABLE_TYPES.map(function(ct) {
        return '<button class="cable-type-btn" data-cable="' + ct.id + '" onclick="ADMIN._selectCableType(\'' + topoId + '\',\'' + ct.id + '\')" title="' + ct.name + '">' +
          '<svg width="28" height="14" viewBox="0 0 28 14">' +
            '<line x1="2" y1="7" x2="26" y2="7" stroke="' + ct.color + '" stroke-width="' + Math.max(2, ct.width) + '" stroke-linecap="round"' +
            (ct.dash !== 'none' ? ' stroke-dasharray="' + ct.dash + '"' : '') + '/>' +
          '</svg>' +
          '<span class="cable-label-text">' + ct.label + '</span>' +
        '</button>';
      }).join('');
    });
  }

  // 刷新所有画布连线颜色（参数null刷新全部）
  function _refreshTopoEdgeColors(specificTopoId) {
    document.querySelectorAll('.topo-canvas-inner[id^="topo-canvas-"]').forEach(function(canvas) {
      var topoId = canvas.getAttribute('data-topo-id');
      if (specificTopoId && topoId !== specificTopoId) return;
      var data = canvas._diagramData;
      if (!data || !data.edges) return;
      // 简单渲染刷新
      _renderTopoCanvas(topoId);
    });
  }

  // 从元件库拖拽到画布
  function _onLibDragStart(e) {
    var compId = e.target.closest('.topo-lib-item').getAttribute('data-comp-id');
    e.dataTransfer.setData('text/plain', compId);
    e.dataTransfer.effectAllowed = 'copy';
    e.target.closest('.topo-lib-item').classList.add('dragging');
  }
  function _onLibDragEnd(e) {
    e.target.closest('.topo-lib-item').classList.remove('dragging');
  }

  // 线缆图例悬浮窗口拖拽 + 调节大小（pointer capture，绝不卡死）
  function _setupLegendDrag(wrap, topoId) {
    var legend = document.getElementById('topo-cable-selector-' + topoId);
    if (!legend) return;
    var isDragging = false, isResizing = false;
    var startX, startY, origLeft, origTop, origW, origH;
    var rafId = null;
    var _latestClientX = 0, _latestClientY = 0;
    var _boundW, _boundH, _margin = 8;
    var _lw, _lh, _wrapW, _wrapH;

    var SNAP_THRESHOLD = 50;
    var SNAP_ZONE = 4;

    function _onDragMove() {
      rafId = null;
      if (isResizing) {
        var dx = _latestClientX - startX, dy = _latestClientY - startY;
        var newW = Math.max(140, origW + dx);
        var newH = Math.max(80, origH + dy);
        var maxW = _boundW - _margin - (origLeft + (legend._tx || 0));
        var maxH = _boundH - _margin - (origTop + (legend._ty || 0));
        newW = Math.min(newW, Math.max(140, Math.max(0, maxW)));
        newH = Math.min(newH, Math.max(80, Math.max(0, maxH)));
        legend.style.width = newW + 'px';
        legend.style.height = newH + 'px';
        legend.style.minWidth = newW + 'px';
        return;
      }
      if (!isDragging) return;
      var dx2 = _latestClientX - startX, dy2 = _latestClientY - startY;
      var newLeft = origLeft + dx2;
      var newTop = origTop + dy2;

      var snapLeft = null, snapTop = null;
      var snapped = false;

      if (newLeft <= SNAP_THRESHOLD) {
        snapLeft = SNAP_ZONE; snapped = true;
      } else if ((newLeft + _lw) >= (_wrapW - SNAP_THRESHOLD)) {
        snapLeft = _wrapW - _lw - SNAP_ZONE; snapped = true;
      }
      if (newTop <= SNAP_THRESHOLD) {
        snapTop = SNAP_ZONE; snapped = true;
      } else if ((newTop + _lh) >= (_wrapH - SNAP_THRESHOLD)) {
        snapTop = _wrapH - _lh - SNAP_ZONE; snapped = true;
      }

      var finalLeft = snapLeft !== null ? snapLeft : newLeft;
      var finalTop = snapTop !== null ? snapTop : newTop;
      finalLeft = Math.max(0, Math.min(finalLeft, _wrapW - _lw));
      finalTop = Math.max(0, Math.min(finalTop, _wrapH - _lh));

      var tx = finalLeft - origLeft;
      var ty = finalTop - origTop;
      legend.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
      legend._tx = tx; legend._ty = ty;

      var isVert = (snapLeft !== null) &&
        (finalLeft <= SNAP_ZONE + 1 || finalLeft >= _wrapW - _lw - SNAP_ZONE - 1);
      if (isVert) {
        legend.classList.add('cable-legend-vertical');
      } else {
        legend.classList.remove('cable-legend-vertical');
      }
      legend._snapped = snapped;
    }

    function _commitPosition() {
      if (legend._tx !== undefined) {
        legend.style.left = (origLeft + legend._tx) + 'px';
        legend.style.top = (origTop + legend._ty) + 'px';
        legend.style.transform = '';
        legend.style.right = 'auto';
        legend._tx = undefined; legend._ty = undefined;
      }
      legend.style.willChange = 'auto';
      if (legend._snapped) {
        legend.style.transition = 'left .2s cubic-bezier(.17,.67,.17,1), top .2s cubic-bezier(.17,.67,.17,1), width .2s ease, height .2s ease';
        setTimeout(function() { legend.style.transition = ''; }, 250);
      } else {
        legend.style.transition = '';
      }
    }

    function _endDrag() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      if (isDragging) {
        isDragging = false;
        legend.style.cursor = '';
        _commitPosition();
      }
      if (isResizing) { isResizing = false; legend.style.transition = ''; }
    }

    // ── pointerdown: 用 pointer capture 替代手动 document 监听 ──
    legend.addEventListener('pointerdown', function(e) {
      // 电缆按钮和编辑按钮不触发拖拽
      if (e.target.closest('.cable-type-btn') || e.target.closest('.cable-legend-edit')) {
        // 阻止冒泡防止 canvas 响应
        e.stopPropagation();
        return;
      }

      if (e.target.closest('.cable-legend-resize')) {
        isResizing = true;
        legend.setPointerCapture(e.pointerId);
        startX = _latestClientX = e.clientX; startY = _latestClientY = e.clientY;
        origW = legend.offsetWidth;
        origH = legend.offsetHeight;
        origLeft = legend.offsetLeft;
        origTop = legend.offsetTop;
        _boundW = window.innerWidth; _boundH = window.innerHeight;
        legend.style.transition = 'none';
        e.preventDefault(); e.stopPropagation();
        return;
      }

      var header = e.target.closest('.cable-legend-header');
      if (!header && !e.target.closest('.cable-legend-float')) return;

      isDragging = true;
      legend.setPointerCapture(e.pointerId);
      startX = _latestClientX = e.clientX; startY = _latestClientY = e.clientY;
      origLeft = legend.offsetLeft;
      origTop = legend.offsetTop;
      _lw = legend.offsetWidth; _lh = legend.offsetHeight;
      _wrapW = wrap.clientWidth; _wrapH = wrap.clientHeight;
      legend.style.transition = 'none';
      legend.style.willChange = 'transform';
      legend.style.cursor = 'grabbing';
      e.preventDefault(); e.stopPropagation();
    });

    legend.addEventListener('pointermove', function(e) {
      if (!isDragging && !isResizing) return;
      _latestClientX = e.clientX;
      _latestClientY = e.clientY;
      if (!rafId) rafId = requestAnimationFrame(_onDragMove);
    });

    legend.addEventListener('pointerup', function() {
      _endDrag();
    });

    legend.addEventListener('pointercancel', function() {
      _endDrag();
    });

    // 兜底：如果点按 cable-type-btn 导致光标被 wrap 设为 crosshair，
    // 鼠标进入 legend 后恢复为 pointer（覆盖父级 inline cursor）
    legend.addEventListener('pointerenter', function() {
      if (!isDragging && !isResizing) {
        legend.style.cursor = '';
      }
    });
  }

  // 画布事件（拖拽元件、平移、连线）
  function _setupCanvasEvents(wrap, canvas, topoId) {
    // Shift 键追踪（按住 Shift 时 CT 自由放置不吸附）
    window.addEventListener('keydown', function(e) { if (e.key === 'Shift') window._topoShiftKey = true; });
    window.addEventListener('keyup', function(e) { if (e.key === 'Shift') window._topoShiftKey = false; });

    // 视口坐标 → 画布坐标（getBoundingClientRect 已含 transform 偏移，无需额外补偿）
    function _clientToCanvas(cx, cy) {
      var rect = canvas.getBoundingClientRect();
      var zoom = canvas._zoom || 1;
      return {
        x: (cx - rect.left) / zoom,
        y: (cy - rect.top) / zoom
      };
    }

    // 从元件库拖入
    wrap.addEventListener('dragover', function(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    wrap.addEventListener('drop', function(e) {
      e.preventDefault();
      var compId = e.dataTransfer.getData('text/plain');
      if (!compId || !COMPONENT_BY_ID[compId]) return;
      var pt = _clientToCanvas(e.clientX, e.clientY);
      var x = Math.round((pt.x - COMPONENT_BY_ID[compId].width/2) / 10) * 10;
      var y = Math.round((pt.y - COMPONENT_BY_ID[compId].height/2) / 10) * 10;
      _addNode(canvas, topoId, compId, x, y);
    });

    // 画布内元件拖拽
    var dragState = { nodeId: null, vpStartX: 0, vpStartY: 0, origX: 0, origY: 0, offX: 0, offY: 0, moving: false };
    var rotState  = { nodeId: null, startAngle: 0, origRotation: 0, moving: false, startX: 0, startY: 0 };
    var waypointDrag = { edgeId: null, pointIdx: 0, circle: null, moving: false };
    canvas.addEventListener('mousedown', function(e) {
      // 旋转手柄
      var rotHandle = e.target.closest('.topo-rotate-handle');
      if (rotHandle) {
        e.stopPropagation(); e.preventDefault();
        rotState.nodeId = rotHandle.getAttribute('data-node-id');
        var node = _findNode(canvas, rotState.nodeId);
        if (!node) return;
        var comp = COMPONENT_BY_ID[node.compId];
        if (!comp) return;
        var cx = node.x + comp.width / 2, cy = node.y + comp.height / 2;
        var pt = _clientToCanvas(e.clientX, e.clientY);
        rotState.startAngle = Math.atan2(pt.y - cy, pt.x - cx) * 180 / Math.PI;
        rotState.origRotation = node.rotation || 0;
        rotState.startX = e.clientX;
        rotState.startY = e.clientY;
        rotState.moving = false;
        rotHandle.style.cursor = 'grabbing';
        return;
      }
      // ── 走线控制点拖拽 ──
      var wayCircle = e.target.closest('.topo-waypoint');
      if (wayCircle) {
        e.stopPropagation(); e.preventDefault();
        waypointDrag.edgeId = wayCircle.getAttribute('data-edge-id');
        waypointDrag.pointIdx = parseInt(wayCircle.getAttribute('data-point-idx'));
        waypointDrag.circle = wayCircle;
        waypointDrag.moving = false;
        wayCircle.style.cursor = 'grabbing';
        return;
      }
      var nodeEl = e.target.closest('.topo-node');
      if (nodeEl) {
        // ── 点击连线模式 ──
        // 已在连线模式中，点击另一个元件 → 完成连线
        if (canvas._connectSource) {
          var cNodeId = nodeEl.getAttribute('data-node-id');
          if (cNodeId !== canvas._connectSource.nodeId) {
            _smartConnect(canvas, topoId, canvas._connectSource.nodeId, cNodeId);
          }
          _exitConnectSource(canvas, topoId);
          canvas._movedSinceDown = false;
          e.stopPropagation(); e.preventDefault();
          return;
        }
        // 选中了线缆类型 → 进入连线源模式
        if (canvas._selectedCableType && !nodeEl.classList.contains('topo-ct-overlay')) {
          e.stopPropagation(); e.preventDefault();
          var connNodeId = nodeEl.getAttribute('data-node-id');
          _enterConnectSource(canvas, topoId, connNodeId, nodeEl);
          canvas._movedSinceDown = false;
          return;
        }
        // ── 原有元件选择/拖拽 ──
        // CT 覆盖节点（吸附在线上的）：禁止拖拽，仅可选择
        if (nodeEl.classList.contains('topo-ct-overlay')) {
          var nodeId = nodeEl.getAttribute('data-node-id');
          var node = _findNode(canvas, nodeId);
          // 仅当CT吸附在线上时才禁止拖拽；自由CT可正常拖拽
          if (node && node.onEdge) {
            if (e.shiftKey) {
              _topoToggleSelectNode(topoId, nodeId, nodeEl);
            } else {
              _topoSelectNode(topoId, nodeId, nodeEl);
            }
            return;
          }
          // 自由CT (无onEdge) → 允许拖拽，继续往下走
        }
        e.stopPropagation();
        dragState.nodeId = nodeEl.getAttribute('data-node-id');
        dragState.origX = parseFloat(nodeEl.style.left) || 0;
        dragState.origY = parseFloat(nodeEl.style.top) || 0;
        dragState.vpStartX = e.clientX;
        dragState.vpStartY = e.clientY;
        var pt = _clientToCanvas(e.clientX, e.clientY);
        dragState.offX = pt.x - dragState.origX;
        dragState.offY = pt.y - dragState.origY;
        dragState.moving = false;
        if (e.shiftKey) {
          _topoToggleSelectNode(topoId, dragState.nodeId, nodeEl);
        } else {
          _topoSelectNode(topoId, dragState.nodeId, nodeEl);
        }
        canvas._movedSinceDown = false;
      }
    });
    // 连线预览状态（挂在 canvas 上，方便 _exitConnectSource 访问）
    canvas._connPreviewRafId = null;
    canvas._connPreviewX = 0;
    canvas._connPreviewY = 0;
    window.addEventListener('mousemove', function(e) {
      // ── 连线模式：更新预览虚线（rAF节流）──
      if (canvas._connectSource && canvas._previewLine) {
        canvas._connPreviewX = e.clientX;
        canvas._connPreviewY = e.clientY;
        if (!canvas._connPreviewRafId) {
          canvas._connPreviewRafId = requestAnimationFrame(function() {
            canvas._connPreviewRafId = null;
            var srcNode = _findNode(canvas, canvas._connectSource.nodeId);
            if (srcNode && canvas._previewLine) {
              var pt = _clientToCanvas(canvas._connPreviewX, canvas._connPreviewY);
              canvas._previewLine.setAttribute('x2', pt.x);
              canvas._previewLine.setAttribute('y2', pt.y);
            }
          });
        }
      }
      // 旋转中
      if (rotState.nodeId) {
        // 检测鼠标是否实际移动了（至少3px）
        if (!rotState.moving && Math.abs(e.clientX - rotState.startX) + Math.abs(e.clientY - rotState.startY) < 3) return;
        rotState.moving = true;
        var rotNode = _findNode(canvas, rotState.nodeId);
        if (!rotNode) return;
        var rotComp = COMPONENT_BY_ID[rotNode.compId];
        if (!rotComp) return;
        var rcx = rotNode.x + rotComp.width / 2, rcy = rotNode.y + rotComp.height / 2;
        var rpt = _clientToCanvas(e.clientX, e.clientY);
        var newAngle = Math.atan2(rpt.y - rcy, rpt.x - rcx) * 180 / Math.PI;
        var delta = newAngle - rotState.startAngle;
        // 将 delta 归一化到 -180~180
        while (delta > 180) delta -= 360;
        while (delta < -180) delta += 360;
        var rot = ((rotState.origRotation + delta) % 360 + 360) % 360;
        // 始终吸附到最近的 90° 倍数
        var snapped = Math.round(rot / 90) * 90 % 360;
        rotNode.rotation = (snapped === 0 || snapped === 360) ? undefined : snapped;
        // 更新 DOM
        var rotNodeEl = canvas.querySelector('.topo-node[data-node-id="' + rotState.nodeId + '"]');
        if (rotNodeEl) {
          var r = snapped || 0;
          rotNodeEl.style.transform = r ? 'rotate(' + r + 'deg)' : '';
          rotNodeEl.style.transformOrigin = (rotComp.width / 2) + 'px ' + (rotComp.height / 2) + 'px';
        }
        _updateRotationHandle(canvas, rotNode, rotComp);
        _updateEdges(topoId);
        return;
      }
      // ── 走线控制点拖拽 ──
      if (waypointDrag.edgeId) {
        waypointDrag.moving = true;
        var wpt = _clientToCanvas(e.clientX, e.clientY);
        // 网格吸附
        wpt.x = Math.round(wpt.x / 10) * 10;
        wpt.y = Math.round(wpt.y / 10) * 10;
        if (waypointDrag.circle) {
          waypointDrag.circle.setAttribute('cx', wpt.x);
          waypointDrag.circle.setAttribute('cy', wpt.y);
        }
        // 实时更新路径
        _updateWaypointPreview(canvas, topoId, waypointDrag.edgeId, waypointDrag.pointIdx, wpt);
        return;
      }
      // 元件拖拽中
      if (!dragState.nodeId) return;
      if (!dragState.moving && (Math.abs(e.clientX - dragState.vpStartX) > 2 || Math.abs(e.clientY - dragState.vpStartY) > 2)) {
        dragState.moving = true;
        canvas._movedSinceDown = true;
      }
      if (!dragState.moving) return;
      var nodeEl = canvas.querySelector('.topo-node[data-node-id="' + dragState.nodeId + '"]');
      if (!nodeEl) return;
      var pt = _clientToCanvas(e.clientX, e.clientY);
      var newX = pt.x - dragState.offX;
      var newY = pt.y - dragState.offY;
      // 网格吸附（10px） + 对齐磁吸
      newX = Math.round(newX / 10) * 10;
      newY = Math.round(newY / 10) * 10;
      // 对齐磁吸：检测最近的辅助线位置并吸附
      var SNAP_THRESHOLD = 5;
      var nodeW = parseFloat(nodeEl.style.width) || nodeEl.offsetWidth || 0;
      var nodeH = parseFloat(nodeEl.style.height) || nodeEl.offsetHeight || 0;
      if (nodeW && nodeH) {
        var canvasNodes = canvas.querySelectorAll('.topo-node:not(.topo-ct-overlay)');
        for (var sni = 0; sni < canvasNodes.length; sni++) {
          var other = canvasNodes[sni];
          if (other === nodeEl) continue;
          var ox = parseFloat(other.style.left) || 0;
          var oy = parseFloat(other.style.top) || 0;
          var ow = parseFloat(other.style.width) || other.offsetWidth || 0;
          var oh = parseFloat(other.style.height) || other.offsetHeight || 0;
          if (!ow || !oh) continue;
          // 吸附到其他元件的左/右/中心/上/下
          if (Math.abs(newX - ox) < SNAP_THRESHOLD) newX = ox;
          if (Math.abs(newX + nodeW - ox - ow) < SNAP_THRESHOLD) newX = ox + ow - nodeW;
          if (Math.abs(newX + nodeW/2 - ox - ow/2) < SNAP_THRESHOLD) newX = ox + ow/2 - nodeW/2;
          if (Math.abs(newY - oy) < SNAP_THRESHOLD) newY = oy;
          if (Math.abs(newY + nodeH - oy - oh) < SNAP_THRESHOLD) newY = oy + oh - nodeH;
          if (Math.abs(newY + nodeH/2 - oy - oh/2) < SNAP_THRESHOLD) newY = oy + oh/2 - nodeH/2;
        }
      }
      nodeEl.style.left = newX + 'px';
      nodeEl.style.top = newY + 'px';
      // 同步数据节点坐标（_updateEdges 依赖 _findNode 读取 data.nodes 中的位置）
      var dn = _findNode(canvas, dragState.nodeId);
      if (dn) { dn.x = newX; dn.y = newY; }
      _updateEdges(topoId);
      _drawAlignGuides(canvas, nodeEl);
      // 同步旋转手柄位置
      var rotHandle = canvas.querySelector('.topo-rotate-handle');
      if (rotHandle && rotHandle.getAttribute('data-node-id') === dragState.nodeId && dn) {
        _updateRotationHandle(canvas, dn, COMPONENT_BY_ID[dn.compId]);
      }
    });
    window.addEventListener('mouseup', function() {
      // 旋转结束
      if (rotState.nodeId && rotState.moving) {
        var handle = canvas.querySelector('.topo-rotate-handle');
        if (handle) handle.style.cursor = 'grab';
        _syncAndRender(canvas, topoId);
        // 重新选中以刷新属性面板
        setTimeout(function() {
          var nEl = canvas.querySelector('.topo-node[data-node-id="' + rotState.nodeId + '"]');
          if (nEl) _topoSelectNode(topoId, rotState.nodeId, nEl);
        }, 50);
      }
      rotState.nodeId = null; rotState.moving = false;
      // 拖拽结束
      if (dragState.nodeId && dragState.moving) {
        var nodeEl = canvas.querySelector('.topo-node[data-node-id="' + dragState.nodeId + '"]');
        if (nodeEl) {
          _updateNodePos(canvas, dragState.nodeId, parseFloat(nodeEl.style.left), parseFloat(nodeEl.style.top));
        }
      }
      dragState.nodeId = null; dragState.moving = false;
      // ── 走线控制点松手 → 提交到 edge 数据 ──
      if (waypointDrag.edgeId) {
        _commitWaypoint(canvas, topoId, waypointDrag);
        waypointDrag.edgeId = null;
        waypointDrag.circle = null;
        waypointDrag.moving = false;
      }
      _drawAlignGuides(canvas, null); // 清除辅助线
    });

    // 连接点连线
    canvas.addEventListener('mousedown', function(e) {
      var portEl = e.target.closest('.topo-port');
      if (!portEl) return;
      e.stopPropagation(); e.preventDefault();
      var nodeEl = portEl.closest('.topo-node');
      var nodeId = nodeEl.getAttribute('data-node-id');
      var portId = portEl.getAttribute('data-port-id');
      // 开始连线
      var comp = COMPONENT_BY_ID[nodeEl.getAttribute('data-comp-id')];
      var nodeData = _findNode(canvas, nodeId);
      var portPos = _getPortPos(nodeData, portId, comp);
      var tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      tempSvg.setAttribute('class', 'topo-temp-line');
      tempSvg.setAttribute('style', 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:40');
      var tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      tempLine.setAttribute('x1', portPos.x); tempLine.setAttribute('y1', portPos.y);
      tempLine.setAttribute('x2', portPos.x); tempLine.setAttribute('y2', portPos.y);
      tempLine.setAttribute('stroke', '#F39C12'); tempLine.setAttribute('stroke-width', '2');
      tempLine.setAttribute('stroke-dasharray', '5 3');
      tempSvg.appendChild(tempLine);
      canvas.appendChild(tempSvg);

      var _connRafId = null, _connLastX = portPos.x, _connLastY = portPos.y;
      var mousemoveConn = function(ev) {
        _connLastX = ev.clientX; _connLastY = ev.clientY;
        if (!_connRafId) {
          _connRafId = requestAnimationFrame(function() {
            _connRafId = null;
            var pt = _clientToCanvas(_connLastX, _connLastY);
            tempLine.setAttribute('x2', pt.x);
            tempLine.setAttribute('y2', pt.y);
          });
        }
      };
      var mouseupConn = function(ev) {
        if (_connRafId) { cancelAnimationFrame(_connRafId); _connRafId = null; }
        window.removeEventListener('mousemove', mousemoveConn);
        window.removeEventListener('mouseup', mouseupConn);
        tempSvg.remove();
        var targetPort = ev.target.closest('.topo-port');
        if (targetPort) {
          var targetNode = targetPort.closest('.topo-node');
          var targetNodeId = targetNode.getAttribute('data-node-id');
          var targetPortId = targetPort.getAttribute('data-port-id');
          if (targetNodeId !== nodeId) {
            _addEdge(canvas, topoId, nodeId, portId, targetNodeId, targetPortId);
          }
        }
      };
      window.addEventListener('mousemove', mousemoveConn);
      window.addEventListener('mouseup', mouseupConn);
    }, true);

    // 画布空白点击取消选中 / 退出连线模式
    canvas.addEventListener('click', function(e) {
      if (canvas._movedSinceDown) { canvas._movedSinceDown = false; return; }
      // 点击空白退出连线模式
      if (canvas._connectSource && !e.target.closest('.topo-node')) {
        _exitConnectSource(canvas, topoId);
      }
      if (e.target === canvas || e.target.classList.contains('topo-edge-line')) {
        _topoDeselect(topoId);
      }
    });

    // 滚轮缩放
    if (!wrap._wheelInited) {
      wrap._wheelInited = true;
      wrap.addEventListener('wheel', function(e) {
        var tId = canvas.getAttribute('data-topo-id');
        if (!tId) return;
        e.preventDefault();
        var delta = e.deltaY > 0 ? 0.87 : 1.15;
        // 鼠标相对于 wrap 容器的坐标（用于局部缩放）
        var rect = wrap.getBoundingClientRect();
        var mx = e.clientX - rect.left;
        var my = e.clientY - rect.top;
        _topoZoom(tId, delta, mx, my);
      }, { passive: false });

      // ESC 退出全屏
      wrap.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          var tId = canvas.getAttribute('data-topo-id');
          if (!tId) return;
          var editorWrap = wrap.closest('.topo-editor-wrap');
          if (editorWrap && editorWrap.classList.contains('fullscreen')) {
            _topoToggleFullscreen(tId);
          }
        }
      });
      // Make canvas area focusable for key events
      wrap.setAttribute('tabindex', '0');
    }
  }

  // ── 节点操作 ──
  function _addNode(canvas, topoId, compId, x, y) {
    var data = canvas._diagramData;
    var nodeId = 'n' + Date.now();
    var comp = COMPONENT_BY_ID[compId];
    if (!comp) return;
    var nodeData = { id: nodeId, compId: compId, x: x, y: y, label: comp.label || comp.name };

    // CT 互感器：检测是否在连线附近（自动吸附到边的中心点）
    // 仅在画布已有连线时启用吸附；按住Shift键可强制自由放置
    if (comp.overlayEdge) {
      var shiftKey = (window._topoShiftKey || false);
      if (!shiftKey && data.edges && data.edges.length > 0) {
        var bestEdge = null, bestDist = 60; // 60px 吸附阈值
        data.edges.forEach(function(edge) {
          var fn = _findNode(canvas, edge.from), tn = _findNode(canvas, edge.to);
          if (!fn || !tn) return;
          var fc = COMPONENT_BY_ID[fn.compId], tc = COMPONENT_BY_ID[tn.compId];
          if (!fc || !tc) return;
          var fp = _getPortPos(fn, edge.fromPort || 'center', fc);
          var tp = _getPortPos(tn, edge.toPort || 'center', tc);
          var cx = x + comp.width/2, cy = y + comp.height/2;
          var dist = _pointToSegmentDist(cx, cy, fp.x, fp.y, tp.x, tp.y);
          if (dist < bestDist) { bestDist = dist; bestEdge = edge; }
        });
        if (bestEdge) {
          // CT 吸附到线缆中心点 (t = 0.5)
          nodeData.onEdge = bestEdge.id;
          nodeData.t = 0.5;
          nodeData.x = 0; nodeData.y = 0;
        }
      }
      // 如果没有吸附到线缆，CT作为自由元件放置（可重叠所有线缆）
    }

    // ── 自动匹配 BOM 中的产品编码 ──
    // 读取当前 BOM 行，尝试匹配元件类型
    var card = document.querySelector('.topo-admin-card[data-topo-id="' + topoId + '"]');
    if (card) {
      var bomRowEls = card.querySelectorAll('.bom-row');
      var hasMatched = false;
      bomRowEls.forEach(function(row, bomIdx) {
        if (hasMatched) return;
        var inputs = row.querySelectorAll('input');
        if (inputs.length < 5 || !inputs[0].value.trim()) return;
        var bomCat = inputs[0].value.trim();
        var bomCompId = BOM_CAT_TO_COMPID[bomCat];
        if (!bomCompId) {
          for (var cid in COMPONENT_BY_ID) {
            if (COMPONENT_BY_ID[cid].name === bomCat || COMPONENT_BY_ID[cid].label === bomCat) {
              bomCompId = cid; break;
            }
          }
        }
        if (bomCompId === compId) {
          // 统计画布上已有多少个该 BOM 行的元件
          var existingCount = 0;
          data.nodes.forEach(function(n) {
            if (n.compId === compId && n.bomIndex === bomIdx) existingCount++;
          });
          var bomQty = parseInt(inputs[3].value.trim()) || 1;
          if (existingCount < bomQty) {
            nodeData.productCode = inputs[1].value.trim();
            nodeData.productDesc = inputs[2].value.trim();
            nodeData.bomQty = bomQty;
            nodeData.bomRemark = inputs[4].value.trim();
            nodeData.bomIndex = bomIdx;
            nodeData.bomInstance = existingCount;
            nodeData.label = bomQty > 1 ? (bomCat + (existingCount + 1)) : bomCat;
            hasMatched = true;
          }
        }
      });
    }

    data.nodes.push(nodeData);
    _syncAndRender(canvas, topoId);
  }

  // 点到线段的距离
  function _pointToSegmentDist(px, py, ax, ay, bx, by) {
    var abx = bx - ax, aby = by - ay;
    var apx = px - ax, apy = py - ay;
    var len2 = abx*abx + aby*aby;
    if (len2 === 0) return Math.sqrt(apx*apx + apy*apy);
    var t = Math.max(0, Math.min(1, (apx*abx + apy*aby) / len2));
    var cx = ax + t*abx, cy = ay + t*aby;
    return Math.sqrt((px-cx)*(px-cx) + (py-cy)*(py-cy));
  }

  function _findNode(canvas, nodeId) {
    var data = canvas._diagramData;
    for (var i = 0; i < data.nodes.length; i++) { if (data.nodes[i].id === nodeId) return data.nodes[i]; }
    return null;
  }

  function _updateNodePos(canvas, nodeId, x, y) {
    var node = _findNode(canvas, nodeId);
    if (node) { node.x = x; node.y = y; }
    _syncAndRender(canvas, canvas.getAttribute('data-topo-id'));
  }

  function _addEdge(canvas, topoId, fromId, fromPort, toId, toPort) {
    var data = canvas._diagramData;
    var exists = data.edges.some(function(e) { return e.from === fromId && e.to === toId; });
    if (exists) return;
    data.edges.push({
      id: 'e' + Date.now(),
      from: fromId, to: toId,
      fromPort: fromPort, toPort: toPort,
      cableType: canvas._selectedCableType || 'ethernet'
    });
    _syncAndRender(canvas, topoId);
  }

  function _updateEdges(topoId) {
    var canvas = document.getElementById('topo-canvas-' + topoId);
    if (!canvas) return;
    var data = canvas._diagramData;
    var edgeLines = canvas.querySelectorAll('.topo-edge-line');
    edgeLines.forEach(function(edgeSvg) {
      var edgeId = edgeSvg.getAttribute('data-edge-id');
      var edge = null;
      for (var i = 0; i < data.edges.length; i++) { if (data.edges[i].id === edgeId) { edge = data.edges[i]; break; } }
      if (!edge) return;
      var fn = _findNode(canvas, edge.from), tn = _findNode(canvas, edge.to);
      if (!fn || !tn) return;
      var fc = COMPONENT_BY_ID[fn.compId], tc = COMPONENT_BY_ID[tn.compId];
      if (!fc || !tc) return;
      var fp = _getPortPos(fn, edge.fromPort || 'center', fc);
      var tp = _getPortPos(tn, edge.toPort || 'center', tc);
      var line = edgeSvg.querySelector('line');
      var path = edgeSvg.querySelector('path:not(.edge-hit-area)');
      if (line) { line.setAttribute('x1', fp.x); line.setAttribute('y1', fp.y); line.setAttribute('x2', tp.x); line.setAttribute('y2', tp.y); }
      else if (path) {
        // 实时重算折线路径（同 _buildCablePath 逻辑）
        var fromPortSide = edge.fromPort || 'center';
        var toPortSide = edge.toPort || 'center';
        var cablePath = _buildCablePath(fp, tp, fromPortSide, toPortSide, data.nodes, fn, tn, fc, tc);
        path.setAttribute('d', cablePath.path);
        var hitArea = edgeSvg.querySelector('.edge-hit-area');
        if (hitArea) hitArea.setAttribute('d', cablePath.path);
        // 更新标签位置
        var labelEl = edgeSvg.querySelector('.cable-label');
        if (labelEl) { labelEl.setAttribute('x', cablePath.midX); labelEl.setAttribute('y', cablePath.midY - 4); }
        var rectEl = edgeSvg.querySelector('rect');
        if (rectEl) {
          var ct = CABLE_BY_ID[edge.cableType] || CABLE_BY_ID['ethernet'];
          rectEl.setAttribute('x', cablePath.midX - 24);
          rectEl.setAttribute('y', cablePath.midY - 9);
        }
        return; // 跳过后续 line 专属的更新
      }
      // 更新标签位置到中点
      var labelEl = edgeSvg.querySelector('.cable-label');
      if (labelEl) {
        labelEl.setAttribute('x', (fp.x + tp.x) / 2);
        labelEl.setAttribute('y', (fp.y + tp.y) / 2 - 4);
      }
      // 更新点击区域
      var hitArea = edgeSvg.querySelector('.edge-hit-area');
      if (hitArea) {
        hitArea.setAttribute('x1', fp.x); hitArea.setAttribute('y1', fp.y);
        hitArea.setAttribute('x2', tp.x); hitArea.setAttribute('y2', tp.y);
      }
    });

    // 更新 CT 覆盖节点位置
    var ctNodes = canvas.querySelectorAll('.topo-ct-overlay');
    ctNodes.forEach(function(ctEl) {
      var ctNodeId = ctEl.getAttribute('data-node-id');
      var ctNode = _findNode(canvas, ctNodeId);
      if (!ctNode || !ctNode.onEdge) return;
      var ctEdge = null;
      for (var ei = 0; ei < data.edges.length; ei++) { if (data.edges[ei].id === ctNode.onEdge) { ctEdge = data.edges[ei]; break; } }
      if (!ctEdge) return;
      var cfn = _findNode(canvas, ctEdge.from), ctn = _findNode(canvas, ctEdge.to);
      if (!cfn || !ctn) return;
      var cfc = COMPONENT_BY_ID[cfn.compId], ctc = COMPONENT_BY_ID[ctn.compId];
      if (!cfc || !ctc) return;
      var cfp = _getPortPos(cfn, ctEdge.fromPort || 'center', cfc);
      var ctp = _getPortPos(ctn, ctEdge.toPort || 'center', ctc);
      var t = ctNode.t || 0.5;
      var c = COMPONENT_BY_ID['ct'];
      ctEl.style.left = (cfp.x + (ctp.x - cfp.x) * t - c.width/2) + 'px';
      ctEl.style.top = (cfp.y + (ctp.y - cfp.y) * t - c.height/2) + 'px';
    });
  }

  // ── 对齐辅助线 ──
  // 拖拽元件时自动显示与周围元件的对齐参考线
  var _alignGuideLines = []; // 当前辅助线元素
  function _drawAlignGuides(canvas, draggedEl) {
    // 清除旧辅助线
    for (var ai = 0; ai < _alignGuideLines.length; ai++) { _alignGuideLines[ai].remove(); }
    _alignGuideLines = [];
    if (!draggedEl) return;

    var nx = parseFloat(draggedEl.style.left) || 0;
    var ny = parseFloat(draggedEl.style.top) || 0;
    var nw = parseFloat(draggedEl.style.width) || draggedEl.offsetWidth || 0;
    var nh = parseFloat(draggedEl.style.height) || draggedEl.offsetHeight || 0;
    if (!nw || !nh) return;

    var nl = nx, nr = nx + nw, nt = ny, nb = ny + nh;
    var ncx = nx + nw / 2, ncy = ny + nh / 2;
    var THRESHOLD = 5;
    var snaps = { v: [], h: [] }; // 需要绘制的辅助线

    canvas.querySelectorAll('.topo-node:not(.topo-ct-overlay)').forEach(function(other) {
      if (other === draggedEl) return;
      var ox = parseFloat(other.style.left) || 0;
      var oy = parseFloat(other.style.top) || 0;
      var ow = parseFloat(other.style.width) || other.offsetWidth || 0;
      var oh = parseFloat(other.style.height) || other.offsetHeight || 0;
      if (!ow || !oh) return;
      var ol = ox, or = ox + ow, ot = oy, ob = oy + oh;
      var ocx = ox + ow / 2, ocy = oy + oh / 2;

      // 垂直对齐：[nl,ol], [nr,or], [ncx,ocx]
      if (Math.abs(nl - ol) < THRESHOLD) snaps.v.push({ x: ol, y1: Math.min(nt, ot), y2: Math.max(nb, ob) });
      if (Math.abs(nl - or) < THRESHOLD) snaps.v.push({ x: or, y1: Math.min(nt, ob), y2: Math.max(nb, ot) });
      if (Math.abs(nr - ol) < THRESHOLD) snaps.v.push({ x: ol, y1: Math.min(nb, ot), y2: Math.max(nt, ob) });
      if (Math.abs(nr - or) < THRESHOLD) snaps.v.push({ x: or, y1: Math.min(nb, ob), y2: Math.max(nt, ot) });
      if (Math.abs(ncx - ocx) < THRESHOLD) snaps.v.push({ x: ocx, y1: Math.min(ncy, ocy), y2: Math.max(ncy, ocy) });

      // 水平对齐：[nt,ot], [nb,ob], [ncy,ocy]
      if (Math.abs(nt - ot) < THRESHOLD) snaps.h.push({ y: ot, x1: Math.min(nl, ol), x2: Math.max(nr, or) });
      if (Math.abs(nt - ob) < THRESHOLD) snaps.h.push({ y: ob, x1: Math.min(nl, or), x2: Math.max(nr, ol) });
      if (Math.abs(nb - ot) < THRESHOLD) snaps.h.push({ y: ot, x1: Math.min(nr, ol), x2: Math.max(nl, or) });
      if (Math.abs(nb - ob) < THRESHOLD) snaps.h.push({ y: ob, x1: Math.min(nr, or), x2: Math.max(nl, ol) });
      if (Math.abs(ncy - ocy) < THRESHOLD) snaps.h.push({ y: ocy, x1: Math.min(ncx, ocx), x2: Math.max(ncx, ocx) });
    });

    // 渲染垂直辅助线（品红色）
    for (var vi = 0; vi < snaps.v.length; vi++) {
      var vl = document.createElement('div');
      vl.style.cssText = 'position:absolute;left:' + snaps.v[vi].x + 'px;top:' + snaps.v[vi].y1 + 'px;'
        + 'width:1px;height:' + (snaps.v[vi].y2 - snaps.v[vi].y1) + 'px;'
        + 'background:#FF1493;pointer-events:none;z-index:99;opacity:0.8';
      canvas.appendChild(vl);
      _alignGuideLines.push(vl);
    }
    // 渲染水平辅助线（青色）
    for (var hi = 0; hi < snaps.h.length; hi++) {
      var hl = document.createElement('div');
      hl.style.cssText = 'position:absolute;left:' + snaps.h[hi].x1 + 'px;top:' + snaps.h[hi].y + 'px;'
        + 'height:1px;width:' + (snaps.h[hi].x2 - snaps.h[hi].x1) + 'px;'
        + 'background:#00E5FF;pointer-events:none;z-index:99;opacity:0.8';
      canvas.appendChild(hl);
      _alignGuideLines.push(hl);
    }
  }

  // ── 选中/属性 ──
  function _topoSelectNode(topoId, nodeId, nodeEl) {
    _topoDeselect(topoId);
    nodeEl.classList.add('selected');
    var panel = document.getElementById('topo-prop-' + topoId);
    var body = document.getElementById('topo-prop-body-' + topoId);
    var canvas = document.getElementById('topo-canvas-' + topoId);
    var node = _findNode(canvas, nodeId);
    if (!panel || !body || !node) return;
    panel.style.display = '';
    var comp = COMPONENT_BY_ID[node.compId];

    // 非CT覆盖节点：创建旋转手柄
    if (!node.onEdge) {
      _createRotationHandle(canvas, node, comp);
    }

    // CT 覆盖节点显示特殊属性
    if (node.onEdge) {
      body.innerHTML =
        '<div class="topo-prop-group"><label>元件类型</label><input readonly value="互感器 CT" /></div>' +
        '<div class="topo-prop-group"><label>显示标签</label><input value="' + (node.label || 'CT').replace(/"/g, '&quot;') + '" oninput="ADMIN._topoUpdateLabel(\'' + topoId + '\',\'' + nodeId + '\',this.value)" /></div>' +
        '<div class="topo-prop-group"><label>依附连线</label><input readonly value="' + node.onEdge + '" /></div>' +
        '<div class="topo-prop-group"><label>在线缆上的位置 (0-1)</label><input type="number" step="0.05" min="0" max="1" value="' + (node.t || 0.5) + '" onchange="ADMIN._topoUpdateCTPos(\'' + topoId + '\',\'' + nodeId + '\',this.value)" /></div>' +
        '<div class="topo-prop-actions">' +
          '<button class="topo-prop-btn delete" onclick="ADMIN._topoDeleteNode(\'' + topoId + '\',\'' + nodeId + '\')">🗑 删除</button>' +
        '</div>';
      return;
    }

    // ── 获取元件可用的产品编码选项 ──
    var productOptions = _getProductCodesForComp(node.compId);
    // 如果当前已有编码但不在列表中，追加进去
    if (node.productCode && !productOptions.some(function(o) { return o.code === node.productCode; })) {
      productOptions.unshift({ code: node.productCode, desc: node.productDesc || '' });
    }
    var productOptionsHTML = '';
    var datalistId = 'pc-list-' + topoId + '-' + nodeId;
    if (productOptions.length > 0) {
      // 统一使用 input+datalist，支持完整显示文本
      var displayVal = node.productCode ? (node.productCode + ' | ' + (node.productDesc || '')) : '';
      productOptionsHTML =
        '<div class="topo-pc-picker">' +
          '<input list="' + datalistId + '" value="' + displayVal.replace(/"/g, '&quot;') + '"' +
            ' onchange="ADMIN._topoPickProductCode(\'' + topoId + '\',\'' + nodeId + '\',this)"' +
            ' placeholder="搜索/选择产品编码..."' +
            ' style="font-size:11px;border:1px solid rgba(230,126,34,0.4);background:rgba(230,126,34,0.1);color:#f5a623;width:100%;box-sizing:border-box;padding:5px 8px;border-radius:5px" />' +
          '<datalist id="' + datalistId + '">';
      productOptions.forEach(function(o) {
        productOptionsHTML += '<option value="' + o.code + ' | ' + (o.desc || '') + '">' + (o.desc || '') + '</option>';
      });
      productOptionsHTML += '</datalist></div>';
    }

    body.innerHTML =
      '<div class="topo-prop-group"><label>元件类型</label><input readonly value="' + (comp ? comp.name : '未知') + '" /></div>' +
      '<div class="topo-prop-group"><label>🔗 关联产品编码</label>' + (productOptionsHTML || '<input value="' + (node.productCode || '') + '" placeholder="输入物料编码..." onchange="ADMIN._topoAssignProductCode(\'' + topoId + '\',\'' + nodeId + '\',this.value)" style="font-size:11px" />') + '</div>' +
      (node.productCode ? '<div class="topo-prop-group"><label>编码描述</label><textarea readonly rows="' + Math.max(2, Math.ceil((node.productDesc || '').length / 35)) + '" style="font-size:10px;background:rgba(230,126,34,0.08);resize:none;min-height:30px">' + (node.productDesc || '') + '</textarea></div>' : '') +
      (node.bomQty ? '<div class="topo-prop-group"><label>BOM数量</label><input readonly value="' + node.bomQty + '" /></div>' : '') +
      (node.bomRemark ? '<div class="topo-prop-group"><label>BOM备注</label><input readonly value="' + node.bomRemark + '" /></div>' : '') +
      '<div class="topo-prop-group"><label>显示标签</label><input value="' + (node.label || '').replace(/"/g, '&quot;') + '" oninput="ADMIN._topoUpdateLabel(\'' + topoId + '\',\'' + nodeId + '\',this.value)" /></div>' +
      '<div class="topo-prop-group"><label>描述</label><textarea rows="2" placeholder="元件描述..." oninput="ADMIN._topoUpdateDescription(\'' + topoId + '\',\'' + nodeId + '\',this.value)" style="resize:vertical;min-height:40px;font-size:11px">' + (node.description || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</textarea></div>' +
      '<div class="topo-prop-group"><label>X 坐标</label><input type="number" value="' + Math.round(node.x) + '" onchange="ADMIN._topoUpdatePos(\'' + topoId + '\',\'' + nodeId + '\',\'x\',this.value)" /></div>' +
      '<div class="topo-prop-group"><label>Y 坐标</label><input type="number" value="' + Math.round(node.y) + '" onchange="ADMIN._topoUpdatePos(\'' + topoId + '\',\'' + nodeId + '\',\'y\',this.value)" /></div>' +
      // 储能柜专有配置
      (comp.hasConfig ? (
        '<div class="topo-prop-group"><label>电池PACK数量</label><input type="number" min="1" max="20" value="' + (node.packCount || comp.packCount || 5) + '" onchange="ADMIN._topoUpdateCabinetConfig(\'' + topoId + '\',\'' + nodeId + '\',\'packCount\',this.value)" /></div>' +
        '<div class="topo-prop-group"><label>PCS数量</label><input type="number" min="1" max="10" value="' + (node.pcsCount || comp.pcsCount || 2) + '" onchange="ADMIN._topoUpdateCabinetConfig(\'' + topoId + '\',\'' + nodeId + '\',\'pcsCount\',this.value)" /></div>' +
        '<div class="topo-prop-group"><label>单台PCS功率(kW)</label><input type="number" min="1" value="' + (node.pcsPower || comp.pcsPower || 100) + '" onchange="ADMIN._topoUpdateCabinetConfig(\'' + topoId + '\',\'' + nodeId + '\',\'pcsPower\',this.value)" /></div>'
      ) : '') +
      '<div class="topo-prop-actions">' +
        '<button class="topo-prop-btn copy" onclick="ADMIN._topoDuplicateNode(\'' + topoId + '\',\'' + nodeId + '\')">📋 复制</button>' +
        '<button class="topo-prop-btn delete" onclick="ADMIN._topoDeleteNode(\'' + topoId + '\',\'' + nodeId + '\')">🗑 删除</button>' +
      '</div>';
  }

  function _topoDeselect(topoId) {
    var canvas = document.getElementById('topo-canvas-' + topoId);
    if (!canvas) return;
    var sel = canvas.querySelectorAll('.topo-node.selected');
    sel.forEach(function(el) { el.classList.remove('selected'); });
    canvas._selectedEdgeId = null;
    canvas._multiSelectedNodes = [];
    // 移除旋转手柄
    var handle = canvas.querySelector('.topo-rotate-handle');
    if (handle) handle.remove();
    canvas._rotating = null;
    var panel = document.getElementById('topo-prop-' + topoId);
    if (panel) panel.style.display = 'none';
  }

  // Shift+多选：切换单个元件的选中状态
  function _topoToggleSelectNode(topoId, nodeId, nodeEl) {
    var canvas = document.getElementById('topo-canvas-' + topoId);
    var wasSelected = nodeEl.classList.contains('selected');
    if (wasSelected) {
      nodeEl.classList.remove('selected');
      // 从多选列表中移除
      if (canvas._multiSelectedNodes) {
        canvas._multiSelectedNodes = canvas._multiSelectedNodes.filter(function(id) { return id !== nodeId; });
      }
      // 移除旋转手柄（如果选中的是这个）
      var handle = canvas.querySelector('.topo-rotate-handle');
      if (handle && handle.getAttribute('data-node-id') === nodeId) handle.remove();
    } else {
      nodeEl.classList.add('selected');
      if (!canvas._multiSelectedNodes) canvas._multiSelectedNodes = [];
      if (canvas._multiSelectedNodes.indexOf(nodeId) < 0) canvas._multiSelectedNodes.push(nodeId);
      // 为多选元件也创建旋转手柄（放在最后选中的上面）
      var node = _findNode(canvas, nodeId);
      var comp = node ? COMPONENT_BY_ID[node.compId] : null;
      if (node && comp && !node.onEdge) {
        _createRotationHandle(canvas, node, comp);
      }
    }
    canvas._selectedEdgeId = null;
    // 如果没有任何选中，隐藏属性面板
    if (!canvas.querySelector('.topo-node.selected')) {
      var panel = document.getElementById('topo-prop-' + topoId);
      if (panel) panel.style.display = 'none';
    }
  }

  function _topoUpdateLabel(topoId, nodeId, value) {
    var canvas = document.getElementById('topo-canvas-' + topoId);
    var node = _findNode(canvas, nodeId);
    if (node) node.label = value;
    _syncAndRender(canvas, topoId);
  }

  function _topoUpdatePos(topoId, nodeId, key, value) {
    var canvas = document.getElementById('topo-canvas-' + topoId);
    var node = _findNode(canvas, nodeId);
    if (node) node[key] = parseFloat(value) || 0;
    _syncAndRender(canvas, topoId);
  }

  function _topoUpdateCTPos(topoId, nodeId, value) {
    var canvas = document.getElementById('topo-canvas-' + topoId);
    var node = _findNode(canvas, nodeId);
    if (node) node.t = Math.max(0, Math.min(1, parseFloat(value) || 0.5));
    _syncAndRender(canvas, topoId);
  }

  function _topoDeleteNode(topoId, nodeId) {
    var canvas = document.getElementById('topo-canvas-' + topoId);
    var data = canvas._diagramData;
    // 收集被删除的连线 ID
    var removedEdgeIds = [];
    data.edges.forEach(function(e) { if (e.from === nodeId || e.to === nodeId) removedEdgeIds.push(e.id); });
    data.nodes = data.nodes.filter(function(n) { return n.id !== nodeId; });
    data.edges = data.edges.filter(function(e) { return e.from !== nodeId && e.to !== nodeId; });
    // 删除依附于已删除连线的 CT
    data.nodes = data.nodes.filter(function(n) {
      return !(n.compId === 'ct' && n.onEdge && removedEdgeIds.indexOf(n.onEdge) >= 0);
    });
    _topoDeselect(topoId);
    _syncAndRender(canvas, topoId);
  }

  function _topoDuplicateNode(topoId, nodeId) {
    var canvas = document.getElementById('topo-canvas-' + topoId);
    var node = _findNode(canvas, nodeId);
    if (!node) return;
    var newNode = JSON.parse(JSON.stringify(node));
    newNode.id = 'n' + Date.now();
    newNode.x += 40; newNode.y += 30;
    canvas._diagramData.nodes.push(newNode);
    _syncAndRender(canvas, topoId);
  }

  // ── 旋转手柄 ──
  function _createRotationHandle(canvas, node, comp) {
    // 移除旧手柄
    var old = canvas.querySelector('.topo-rotate-handle');
    if (old) old.remove();
    canvas._rotating = null;
    if (!comp) return;
    var rot = (node.rotation || 0) * Math.PI / 180;
    // 手柄锚点：组件中心上方（跟随旋转后的视觉顶边）
    var cos = Math.cos(rot), sin = Math.sin(rot);
    var cx = node.x + comp.width / 2 - sin * (comp.height / 2 + 18);
    var cy = node.y + comp.height / 2 - cos * (comp.height / 2 + 18);
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'topo-rotate-handle');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '26');
    svg.style.cssText = 'position:absolute;left:' + (cx - 9) + 'px;top:' + (cy - 13) + 'px;z-index:50;pointer-events:auto;cursor:grab;overflow:visible';
    svg.innerHTML = '<line x1="9" y1="14" x2="9" y2="26" stroke="rgba(100,180,255,0.7)" stroke-width="1.5" stroke-dasharray="3 2"/>' +
      '<circle cx="9" cy="8" r="6" fill="rgba(100,180,255,0.9)" stroke="#fff" stroke-width="1.5"/>' +
      '<text x="9" y="11" text-anchor="middle" font-size="7" fill="#fff" font-weight="700">↻</text>';
    svg.setAttribute('data-node-id', node.id);
    canvas.appendChild(svg);
    canvas._rotNodeId = node.id;
    canvas._rotComp = comp;
  }

  function _updateRotationHandle(canvas, node, comp) {
    if (!comp) return;
    var handle = canvas.querySelector('.topo-rotate-handle');
    if (!handle) return;
    var rot = (node.rotation || 0) * Math.PI / 180;
    var cos = Math.cos(rot), sin = Math.sin(rot);
    var cx = node.x + comp.width / 2 - sin * (comp.height / 2 + 18);
    var cy = node.y + comp.height / 2 - cos * (comp.height / 2 + 18);
    handle.style.left = (cx - 9) + 'px';
    handle.style.top = (cy - 13) + 'px';
    handle.setAttribute('data-node-id', node.id);
  }

  // ── 旋转设置 ──
  function _topoSetRotation(topoId, nodeId, deg) {
    var canvas = document.getElementById('topo-canvas-' + topoId);
    var node = _findNode(canvas, nodeId);
    if (!node) return;
    node.rotation = deg === 0 ? undefined : deg;
    _syncAndRender(canvas, topoId);
    // 重新选中以刷新属性面板
    setTimeout(function() {
      var nodeEl = canvas.querySelector('.topo-node[data-node-id="' + nodeId + '"]');
      if (nodeEl) _topoSelectNode(topoId, nodeId, nodeEl);
    }, 50);
  }

  // ── 储能柜配置更新 ──
  function _topoUpdateCabinetConfig(topoId, nodeId, key, value) {
    var canvas = document.getElementById('topo-canvas-' + topoId);
    var node = _findNode(canvas, nodeId);
    if (!node) return;
    node[key] = parseInt(value) || 0;
    _syncAndRender(canvas, topoId);
  }

  // ── 元件描述更新 ──
  function _topoUpdateDescription(topoId, nodeId, value) {
    var canvas = document.getElementById('topo-canvas-' + topoId);
    var node = _findNode(canvas, nodeId);
    if (!node) return;
    node.description = value;
    // 同步到 hidden input（不重新渲染画布，避免编辑时画布闪动）
    var section = canvas.closest('.topo-editor-section');
    var input = section.querySelector('.topo-edit-diagram-data');
    if (input) {
      var cleanData = { nodes: canvas._diagramData.nodes, edges: canvas._diagramData.edges };
      delete cleanData.legacySvg;
      input.value = JSON.stringify(cleanData);
    }
  }

  // ── 为元件分配产品编码 ──
  function _topoPickProductCode(topoId, nodeId, input) {
    var val = (input.value || '').trim();
    // 从 "code | desc" 格式中提取编码部分
    var code = val.split('|')[0].trim();
    if (code === val) code = ''; // 如果用户只输入了编码（无|），当作完整编码
    // 如果是已知编码则提取，否则当作清除
    _topoAssignProductCode(topoId, nodeId, code || '');
  }

  function _topoAssignProductCode(topoId, nodeId, code) {
    var canvas = document.getElementById('topo-canvas-' + topoId);
    var node = _findNode(canvas, nodeId);
    if (!node) return;
    if (!code) {
      // 清除关联
      delete node.productCode;
      delete node.productDesc;
      delete node.bomQty;
      delete node.bomRemark;
      delete node.bomIndex;
      delete node.bomInstance;
    } else {
      node.productCode = code;
      // 从产品数据中查找描述
      var found = false;
      for (var compId in PRODUCT_CODE_MAP) {
        var list = PRODUCT_CODE_MAP[compId];
        for (var i = 0; list && i < list.length; i++) {
          if (list[i].code === code) {
            node.productDesc = list[i].desc;
            found = true; break;
          }
        }
        if (found) break;
      }
      // 如果 PRODUCT_CODE_MAP 里没找到，尝试全局搜索 DATA
      if (!found) {
        for (var key in DATA) {
          if (!Array.isArray(DATA[key])) continue;
          var arr = DATA[key];
          for (var j = 0; j < arr.length; j++) {
            if (arr[j].code === code) {
              node.productDesc = arr[j].desc;
              found = true; break;
            }
          }
          if (found) break;
        }
      }
      if (!found) node.productDesc = '';
    }
    _syncAndRender(canvas, topoId);
    // 刷新属性面板
    setTimeout(function() {
      var nodeEl = canvas.querySelector('.topo-node[data-node-id="' + nodeId + '"]');
      if (nodeEl) _topoSelectNode(topoId, nodeId, nodeEl);
    }, 50);
  }

  // ── 连线删除（点击连线选中后删除） ──
  // (简化：连线不可选中，拖拽时自动覆盖旧连接)

  // ── 缩放与重置 ──
  // 鼠标局部缩放：以鼠标位置为中心放大，而非画布中心
  function _topoZoom(topoId, factor, mouseX, mouseY) {
    var canvas = document.getElementById('topo-canvas-' + topoId);
    if (!canvas._zoom) canvas._zoom = 1;

    var oldZoom = canvas._zoom;
    var newZoom = oldZoom * factor;
    newZoom = Math.max(0.05, Math.min(20, newZoom)); // 支持 5% ~ 2000% 无极缩放
    canvas._zoom = newZoom;

    // 动态调整网格密度（跟随缩放级别，网格在 wrap 上）
    var wrapForGrid = document.getElementById('topo-canvas-wrap-' + topoId);
    _adjustGridForZoom(wrapForGrid, newZoom);

    // 确定缩放锚点：有鼠标坐标时用鼠标位置，否则用画布容器中心
    var anchorX, anchorY;
    if (mouseX !== undefined && mouseY !== undefined) {
      anchorX = mouseX;
      anchorY = mouseY;
    } else {
      var wrap = document.getElementById('topo-canvas-wrap-' + topoId);
      if (wrap) {
        anchorX = wrap.clientWidth / 2;
        anchorY = wrap.clientHeight / 2;
      } else {
        anchorX = 0; anchorY = 0;
      }
    }

    // 保持锚点处的画布内容在屏幕上不动
    var curLeft = parseFloat(canvas.style.left) || 0;
    var curTop = parseFloat(canvas.style.top) || 0;
    var contentX = (anchorX - curLeft) / oldZoom;
    var contentY = (anchorY - curTop) / oldZoom;
    canvas.style.left = (anchorX - contentX * newZoom) + 'px';
    canvas.style.top = (anchorY - contentY * newZoom) + 'px';

    canvas.style.transform = 'scale(' + newZoom + ')';
    canvas.style.transformOrigin = '0 0';
    _topoUpdateZoomLabel(topoId);
  }

  // 动态调整网格密度（网格现在在 wrap 的伪元素上）
  function _adjustGridForZoom(wrap, zoom) {
    var smallSize, largeSize, smallAlpha, largeAlpha;
    if (zoom < 0.2) {
      smallSize = 100; largeSize = 500; smallAlpha = 0.03; largeAlpha = 0.08;
    } else if (zoom < 0.5) {
      smallSize = 50; largeSize = 250; smallAlpha = 0.03; largeAlpha = 0.08;
    } else if (zoom < 1.5) {
      smallSize = 10; largeSize = 50; smallAlpha = 0.04; largeAlpha = 0.1;
    } else if (zoom < 4) {
      smallSize = 5; largeSize = 25; smallAlpha = 0.04; largeAlpha = 0.1;
    } else {
      smallSize = 2; largeSize = 10; smallAlpha = 0.04; largeAlpha = 0.1;
    }
    if (!wrap) return;
    wrap.style.setProperty('--grid-small', smallSize + 'px');
    wrap.style.setProperty('--grid-large', largeSize + 'px');
    wrap.style.setProperty('--grid-small-alpha', smallAlpha);
    wrap.style.setProperty('--grid-large-alpha', largeAlpha);
  }

  function _topoResetView(topoId) {
    var canvas = document.getElementById('topo-canvas-' + topoId);
    var wrap = document.getElementById('topo-canvas-wrap-' + topoId);
    canvas._zoom = 1;
    canvas.style.transform = '';
    canvas.style.transformOrigin = '';
    // 居中画布：让内容区域（0~1200, 0~900）居中于容器
    if (wrap) {
      var contentW = 1200, contentH = 900;  // 典型内容区域
      canvas.style.left = Math.round((wrap.clientWidth - contentW) / 2) + 'px';
      canvas.style.top = Math.round((wrap.clientHeight - contentH) / 2) + 'px';
    } else {
      canvas.style.left = '';
      canvas.style.top = '';
    }
    _adjustGridForZoom(wrap, 1);
    _topoUpdateZoomLabel(topoId);
  }

  function _topoUpdateZoomLabel(topoId) {
    var label = document.getElementById('topo-zoom-label-' + topoId);
    var canvas = document.getElementById('topo-canvas-' + topoId);
    if (label && canvas) {
      label.textContent = Math.round((canvas._zoom || 1) * 100) + '%';
    }
  }

  function _topoToggleFullscreen(topoId) {
    var wrap = document.getElementById('topo-canvas-wrap-' + topoId);
    if (!wrap) return;
    var editorWrap = wrap.closest('.topo-editor-wrap');
    if (!editorWrap) return;
    var btn = document.getElementById('topo-fs-btn-' + topoId);

    if (editorWrap.classList.contains('fullscreen')) {
      editorWrap.classList.remove('fullscreen');
      if (btn) btn.textContent = '⛶';
      document.body.style.overflow = '';
    } else {
      editorWrap.classList.add('fullscreen');
      if (btn) btn.textContent = '✕';
      document.body.style.overflow = 'hidden';
      // 自动适应视图
      setTimeout(function() {
        var canvas = document.getElementById('topo-canvas-' + topoId);
        if (!canvas) return;
        var wrapEl = document.getElementById('topo-canvas-wrap-' + topoId);
        if (!wrapEl) return;
        var contentW = 1200, contentH = 900;
        var fit = Math.min(wrapEl.clientWidth / contentW, wrapEl.clientHeight / contentH, 2);
        fit = Math.max(0.1, Math.min(10, fit));
        canvas._zoom = fit;
        // 居中内容区域
        canvas.style.left = Math.round((wrapEl.clientWidth - contentW * fit) / 2) + 'px';
        canvas.style.top = Math.round((wrapEl.clientHeight - contentH * fit) / 2) + 'px';
        canvas.style.transform = 'scale(' + fit + ')';
        canvas.style.transformOrigin = '0 0';
        _topoUpdateZoomLabel(topoId);
      }, 100);
    }
  }

  // ── 渲染画布 ──
  function _renderTopoCanvas(topoId) {
    var canvas = document.getElementById('topo-canvas-' + topoId);
    if (!canvas) return;
    var data = canvas._diagramData || { nodes: [], edges: [] };
    var html = '';

    // ── 连接线层（带颜色和标识，支持叠印）──
    // 按 (from, to, fromPort, toPort, cableType) 分组，不同缆型走不同偏移避免重叠
    var edgeGroups = {};
    data.edges.forEach(function(e) {
      var key = e.from + '|' + (e.fromPort || 'center') + '|' + e.to + '|' + (e.toPort || 'center') + '|' + (e.cableType || 'ethernet');
      if (!edgeGroups[key]) edgeGroups[key] = [];
      edgeGroups[key].push(e);
    });

    var edgeIndex = {}; // edgeId → {groupSize, idx, offsetX, offsetY, perpX, perpY}
    var stackSpacing = 6; // 叠放间距(px)

    for (var gk in edgeGroups) {
      var group = edgeGroups[gk];
      if (group.length <= 1) {
        // 单线，无偏移
        group.forEach(function(e) { edgeIndex[e.id] = { groupSize: 1, idx: 0, offsetX: 0, offsetY: 0, perpX: 0, perpY: 0, portOffsetX: 0, portOffsetY: 0 }; });
        continue;
      }
      // 计算这组线缆的方向和垂直单位向量
      var e0 = group[0];
      var fn0 = _findNode(canvas, e0.from), tn0 = _findNode(canvas, e0.to);
      if (!fn0 || !tn0) continue;
      var fc0 = COMPONENT_BY_ID[fn0.compId], tc0 = COMPONENT_BY_ID[tn0.compId];
      if (!fc0 || !tc0) continue;
      var fp0 = _getPortPos(fn0, e0.fromPort || 'center', fc0);
      var tp0 = _getPortPos(tn0, e0.toPort || 'center', tc0);
      var dx = tp0.x - fp0.x, dy = tp0.y - fp0.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var perpX = -dy / len, perpY = dx / len;
      // 为每条线计算叠放偏移
      group.forEach(function(e, i) {
        var offset = (i - (group.length - 1) / 2) * stackSpacing;
        edgeIndex[e.id] = {
          groupSize: group.length, idx: i,
          offsetX: perpX * offset, offsetY: perpY * offset,
          perpX: perpX, perpY: perpY,
          portOffsetX: 0, portOffsetY: 0
        };
      });
    }

    // ── 端口级自动均布：多条线缆连到同一元件同一端口时水平/垂直均匀排布 ──
    var portGroups = {}; // nodeId|portId → edges[]
    data.edges.forEach(function(e) {
      var fk = e.from + '|' + (e.fromPort || 'center');
      var tk = e.to + '|' + (e.toPort || 'center');
      if (!portGroups[fk]) portGroups[fk] = [];
      if (!portGroups[tk]) portGroups[tk] = [];
      portGroups[fk].push({ edge: e, isFrom: true });
      portGroups[tk].push({ edge: e, isFrom: false });
    });
    var PORT_SPACING = 14; // 端口均布间距(px)
    for (var pk in portGroups) {
      var pg = portGroups[pk];
      if (pg.length <= 1) continue;
      // 取第一个来判定端口方向
      var firstEdge = pg[0].edge;
      var firstNode = _findNode(canvas, pg[0].isFrom ? firstEdge.from : firstEdge.to);
      var firstComp = firstNode ? COMPONENT_BY_ID[firstNode.compId] : null;
      var portId = pg[0].isFrom ? (firstEdge.fromPort || 'center') : (firstEdge.toPort || 'center');
      var side = 'bottom';
      var isVertical = true;

      if (portId === 'center') {
        // center 端口：根据对方节点的空间分布自适应偏移方向
        // 计算所有对方节点中心，判断线缆主要方向，在垂直方向做均布
        var cx = firstNode ? (firstNode.x + (firstNode.w || 0) / 2) : 0;
        var cy = firstNode ? (firstNode.y + (firstNode.h || 0) / 2) : 0;
        var oNodes = [];
        pg.forEach(function(item) {
          var oid = item.isFrom ? item.edge.to : item.edge.from;
          var on = _findNode(canvas, oid);
          if (on) oNodes.push({ node: on, dx: on.x + (on.w || 0) / 2 - cx, dy: on.y + (on.h || 0) / 2 - cy });
        });
        // 计算对方节点在 X 和 Y 方向的跨度
        if (oNodes.length > 0) {
          var minX = oNodes[0].dx, maxX = oNodes[0].dx;
          var minY = oNodes[0].dy, maxY = oNodes[0].dy;
          oNodes.forEach(function(n) {
            if (n.dx < minX) minX = n.dx; if (n.dx > maxX) maxX = n.dx;
            if (n.dy < minY) minY = n.dy; if (n.dy > maxY) maxY = n.dy;
          });
          var spanX = maxX - minX;
          var spanY = maxY - minY;
          // X 跨度大（对方水平分布）→ 垂直方向偏移；否则水平偏移
          isVertical = (spanX >= spanY);
        }
      } else if (firstComp) {
        var pp = null;
        (firstComp.ports || []).forEach(function(p) { if (p.id === portId) pp = p; });
        if (pp) side = pp.side || portId;
        isVertical = (side === 'top' || side === 'bottom');
      }

      pg.forEach(function(item, i) {
        var offset = (i - (pg.length - 1) / 2) * PORT_SPACING;
        var ei = edgeIndex[item.edge.id];
        if (!ei) { ei = { offsetX: 0, offsetY: 0, portOffsetX: 0, portOffsetY: 0, groupSize: 1, idx: 0, perpX: 0, perpY: 0 }; edgeIndex[item.edge.id] = ei; }
        if (isVertical) {
          ei.portOffsetX = offset;
          ei.portOffsetY = ei.portOffsetY || 0;
        } else {
          ei.portOffsetY = offset;
          ei.portOffsetX = ei.portOffsetX || 0;
        }
      });
    }

    data.edges.forEach(function(e) {
      var fn = _findNode(canvas, e.from), tn = _findNode(canvas, e.to);
      if (!fn || !tn) return;
      var fc = COMPONENT_BY_ID[fn.compId], tc = COMPONENT_BY_ID[tn.compId];
      if (!fc || !tc) return;
      var fp = _getPortPos(fn, e.fromPort || 'center', fc);
      var tp = _getPortPos(tn, e.toPort || 'center', tc);
      var ei = edgeIndex[e.id] || { offsetX: 0, offsetY: 0, portOffsetX: 0, portOffsetY: 0 };
      // 施加叠放偏移 + 端口均布偏移
      var ofp = { x: fp.x + ei.offsetX + (ei.portOffsetX || 0), y: fp.y + ei.offsetY + (ei.portOffsetY || 0) };
      var otp = { x: tp.x + ei.offsetX + (ei.portOffsetX || 0), y: tp.y + ei.offsetY + (ei.portOffsetY || 0) };
      var ct = CABLE_BY_ID[e.cableType] || CABLE_BY_ID['ethernet'];
      var fromPortSide = (e.fromPort || 'center');
      var toPortSide   = (e.toPort    || 'center');
      var cable = _buildCablePath(ofp, otp, fromPortSide, toPortSide, data.nodes, fn, tn, fc, tc, e.waypoints);
      var midX = cable.midX, midY = cable.midY;
      var isSel = (canvas._selectedEdgeId === e.id);
      html += '<svg class="topo-edge-line' + (isSel ? ' selected' : '') + '" data-edge-id="' + e.id +
        '" style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:' + (isSel ? '25' : '5') + '">' +
        // 可见线条
        '<path d="' + cable.path +
        '" stroke="' + ct.color + '" stroke-width="' + ct.width + '" fill="none" stroke-linecap="round" stroke-linejoin="round"' +
        (ct.dash !== 'none' ? ' stroke-dasharray="' + ct.dash + '"' : '') + '/>' +
        // 点击区域（宽透明路径）
        '<path class="edge-hit-area" d="' + cable.path +
        '" stroke="transparent" stroke-width="14" fill="none" stroke-linecap="round"/>' +
        // 线缆标识标签
        '<rect x="' + (midX - 24) + '" y="' + (midY - 9) + '" width="' + (ct.label.length * 9 + 12) + '" height="14" rx="4" fill="' + ct.color + '" opacity="0.85"/>' +
        '<text class="cable-label" x="' + midX + '" y="' + (midY + 1) + '" text-anchor="middle" font-size="8" font-weight="700" fill="#fff"' +
        ' font-family="Arial,sans-serif">' + ct.label + '</text>' +
        // 端点标记（区分缆型）
        _getCableEndMarkers(e.cableType, otp.x, otp.y, ct.color);
      // 选中时渲染可拖拽控制点
      if (isSel && cable.points) {
        for (var pi = 1; pi < cable.points.length - 1; pi++) {
          var pt = cable.points[pi];
          html += '<circle class="topo-waypoint" data-edge-id="' + e.id + '" data-point-idx="' + pi +
            '" cx="' + pt.x + '" cy="' + pt.y + '" r="5" fill="#fff" stroke="' + ct.color +
            '" stroke-width="2" style="cursor:move"/>';
        }
      }
      html += '</svg>';
    });

    // CT 覆盖节点（渲染在线缆上方的CT节点，旧格式兼容）
    // 分两类：有 onEdge 的吸附CT + 无 onEdge 的自由CT（自由CT用topo-ct-free类）
    // ── 吸附型 CT（依附在特定线缆上，考虑叠放偏移）──
    data.nodes.forEach(function(n) {
      if (n.compId !== 'ct' || !n.onEdge) return;
      var edge = null;
      for (var i = 0; i < data.edges.length; i++) {
        if (data.edges[i].id === n.onEdge) { edge = data.edges[i]; break; }
      }
      if (!edge) return;
      var fn = _findNode(canvas, edge.from), tn = _findNode(canvas, edge.to);
      if (!fn || !tn) return;
      var fc = COMPONENT_BY_ID[fn.compId], tc = COMPONENT_BY_ID[tn.compId];
      if (!fc || !tc) return;
      var fp = _getPortPos(fn, edge.fromPort || 'center', fc);
      var tp = _getPortPos(tn, edge.toPort || 'center', tc);
      // 应用叠放偏移 + 端口均布偏移
      var ei = edgeIndex[edge.id] || { offsetX: 0, offsetY: 0, portOffsetX: 0, portOffsetY: 0 };
      fp = { x: fp.x + ei.offsetX + (ei.portOffsetX || 0), y: fp.y + ei.offsetY + (ei.portOffsetY || 0) };
      tp = { x: tp.x + ei.offsetX + (ei.portOffsetX || 0), y: tp.y + ei.offsetY + (ei.portOffsetY || 0) };
      var t = n.t || 0.5;
      var cx = fp.x + (tp.x - fp.x) * t, cy = fp.y + (tp.y - fp.y) * t;
      var c = COMPONENT_BY_ID['ct'];
      html += '<div class="topo-node topo-ct-overlay" data-node-id="' + n.id + '" data-comp-id="ct" style="left:' + (cx - c.width/2) + 'px;top:' + (cy - c.height/2) + 'px">' +
        '<svg viewBox="0 0 ' + c.width + ' ' + c.height + '" width="' + c.width + '" height="' + c.height + '">' + c.svg + '</svg>' +
        '<div class="topo-node-label">' + (n.label || 'CT') + '</div></div>';
    });

    // 普通节点（排除已渲染的CT吸附节点；自由CT用topo-ct-overlay类确保在线缆上方）
    data.nodes.forEach(function(n) {
      if (n.compId === 'ct' && n.onEdge) return; // 吸附CT已在上面渲染
      var c = COMPONENT_BY_ID[n.compId]; if (!c) return;
      var rot = n.rotation || 0;
      var trans = rot ? ';transform:rotate(' + rot + 'deg);transform-origin:' + (c.width/2) + 'px ' + (c.height/2) + 'px' : '';
      // 自由CT节点加 topo-ct-overlay 类获得更高z-index（渲染在线缆之上）
      var extraClass = (n.compId === 'ct' && !n.onEdge) ? ' topo-ct-overlay' : '';
      html += '<div class="topo-node' + extraClass + '" data-node-id="' + n.id + '" data-comp-id="' + n.compId + '" style="left:' + n.x + 'px;top:' + n.y + 'px' + trans + '">' +
        '<svg viewBox="0 0 ' + c.width + ' ' + c.height + '" width="' + c.width + '" height="' + c.height + '">' + c.svg + '</svg>' +
        '<div class="topo-node-label">' + (n.label || c.label || c.name) + '</div>';
      // 产品编码标签（显示在元件上方，有编码的元件均展示）
      if (n.productCode) {
        var shortCode = n.productCode.length > 11 ? n.productCode.substring(0, 10) + '…' : n.productCode;
        html += '<div class="topo-node-code" title="物料编码: ' + n.productCode + (n.productDesc ? '\n描述: ' + n.productDesc : '') + '">' + shortCode + '</div>';
      }
      // BOM数量角标（数量>1时显示序号，所有有关联BOM的元件均展示）
      if (n.bomQty && n.bomQty > 1 && n.bomInstance !== undefined) {
        html += '<div class="topo-node-qty" title="BOM数量: ' + n.bomQty + '; 第' + (n.bomInstance + 1) + '个实例">' + (n.bomInstance + 1) + '</div>';
      }
      // 连接点
      (c.ports || []).forEach(function(p) {
        html += '<div class="topo-port" data-port-id="' + p.id + '" style="left:' + (c.width * p.x) + 'px;top:' + (c.height * p.y) + 'px"></div>';
      });
      html += '</div>';
    });

    canvas.innerHTML = html;

    // 绑定边点击事件
    _bindEdgeClickEvents(canvas, topoId);
  }

  // 绑定边点击事件（支持选中/删除）
  function _bindEdgeClickEvents(canvas, topoId) {
    var hitAreas = canvas.querySelectorAll('.edge-hit-area');
    hitAreas.forEach(function(hit) {
      hit.style.pointerEvents = 'auto';
      hit.style.cursor = 'pointer';
      hit.addEventListener('click', function(ev) {
        ev.stopPropagation();
        var edgeSvg = hit.closest('.topo-edge-line');
        var edgeId = edgeSvg.getAttribute('data-edge-id');
        _topoSelectEdge(topoId, edgeId);
      });
    });
  }

  // 选中连线
  function _topoSelectEdge(topoId, edgeId) {
    var canvas = document.getElementById('topo-canvas-' + topoId);
    if (!canvas) return;
    _topoDeselect(topoId);
    canvas._selectedEdgeId = edgeId;
    _renderTopoCanvas(topoId);
    // 显示属性面板
    var data = canvas._diagramData;
    var edge = null;
    for (var i = 0; i < data.edges.length; i++) {
      if (data.edges[i].id === edgeId) { edge = data.edges[i]; break; }
    }
    if (!edge) return;
    var panel = document.getElementById('topo-prop-' + topoId);
    var body = document.getElementById('topo-prop-body-' + topoId);
    if (!panel || !body) return;
    panel.style.display = '';
    var ct = CABLE_BY_ID[edge.cableType] || CABLE_BY_ID['ethernet'];
    var cableOpts = CABLE_TYPES.map(function(t) {
      return '<option value="' + t.id + '"' + (t.id === edge.cableType ? ' selected' : '') + '>' + t.name + '</option>';
    }).join('');
    body.innerHTML =
      '<div class="topo-prop-group"><label>连接线缆</label><div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:' + ct.color + '"></span><span style="font-size:11px;color:rgba(180,210,255,0.7)">' + ct.name + '</span></div></div>' +
      '<div class="topo-prop-group"><label>线缆类型</label><select onchange="ADMIN._topoUpdateEdgeType(\'' + topoId + '\',\'' + edgeId + '\',this.value)">' + cableOpts + '</select></div>' +
      '<div class="topo-prop-group"><label>起点 (' + (edge.fromPort || 'center') + ')</label><select onchange="ADMIN._topoUpdateEdgePort(\'' + topoId + '\',\'' + edgeId + '\',\'fromPort\',this.value)">' + _buildPortOptions(canvas, edge.from, edge.fromPort) + '</select></div>' +
      '<div class="topo-prop-group"><label>终点 (' + (edge.toPort || 'center') + ')</label><select onchange="ADMIN._topoUpdateEdgePort(\'' + topoId + '\',\'' + edgeId + '\',\'toPort\',this.value)">' + _buildPortOptions(canvas, edge.to, edge.toPort) + '</select></div>' +
      '<div class="topo-prop-group">' +
        '<label>更换连接</label>' +
        '<div style="display:flex;gap:4px">' +
          '<button class="topo-prop-btn reconnect" onclick="ADMIN._topoReconnectEdge(\'' + topoId + '\',\'' + edgeId + '\',\'from\')" title="点击后选择其他元件的端口作为新起点">🔗 更换起点</button>' +
          '<button class="topo-prop-btn reconnect" onclick="ADMIN._topoReconnectEdge(\'' + topoId + '\',\'' + edgeId + '\',\'to\')" title="点击后选择其他元件的端口作为新终点">🔗 更换终点</button>' +
        '</div>' +
      '</div>' +
      '<div class="topo-prop-actions">' +
        '<button class="topo-prop-btn delete" onclick="ADMIN._topoDeleteEdge(\'' + topoId + '\',\'' + edgeId + '\')">🗑 删除连线</button>' +
      '</div>';
  }

  // 更新连线类型
  function _topoUpdateEdgeType(topoId, edgeId, cableType) {
    var canvas = document.getElementById('topo-canvas-' + topoId);
    if (!canvas) return;
    var data = canvas._diagramData;
    for (var i = 0; i < data.edges.length; i++) {
      if (data.edges[i].id === edgeId) { data.edges[i].cableType = cableType; break; }
    }
    canvas._selectedEdgeId = edgeId;
    _renderTopoCanvas(topoId);
    // 刷新属性面板
    _topoSelectEdge(topoId, edgeId);
  }

  // 删除连线
  function _topoDeleteEdge(topoId, edgeId) {
    var canvas = document.getElementById('topo-canvas-' + topoId);
    if (!canvas) return;
    var data = canvas._diagramData;
    data.edges = data.edges.filter(function(e) { return e.id !== edgeId; });
    // 同时删除依附于该连线的CT
    data.nodes = data.nodes.filter(function(n) { return !(n.compId === 'ct' && n.onEdge === edgeId); });
    canvas._selectedEdgeId = null;
    _topoDeselect(topoId);
    _syncAndRender(canvas, topoId);
  }

  // 构建端口选项下拉列表
  function _buildPortOptions(canvas, nodeId, selectedPort) {
    var node = _findNode(canvas, nodeId);
    if (!node) return '<option value="' + selectedPort + '">' + selectedPort + '</option>';
    var comp = COMPONENT_BY_ID[node.compId];
    if (!comp || !comp.ports) return '<option value="' + selectedPort + '">' + selectedPort + '</option>';
    return comp.ports.map(function(p) {
      return '<option value="' + p.id + '"' + (p.id === selectedPort ? ' selected' : '') + '>' + p.side + ' (' + p.id + ')</option>';
    }).join('');
  }

  // 更新连线端口
  function _topoUpdateEdgePort(topoId, edgeId, portKey, portValue) {
    var canvas = document.getElementById('topo-canvas-' + topoId);
    if (!canvas) return;
    var data = canvas._diagramData;
    for (var i = 0; i < data.edges.length; i++) {
      if (data.edges[i].id === edgeId) { data.edges[i][portKey] = portValue; break; }
    }
    canvas._selectedEdgeId = edgeId;
    _renderTopoCanvas(topoId);
    _topoSelectEdge(topoId, edgeId);
  }

  // 线缆重新连接（更换起点或终点连到其他元件）
  function _topoReconnectEdge(topoId, edgeId, end) {
    var canvas = document.getElementById('topo-canvas-' + topoId);
    if (!canvas) return;
    var data = canvas._diagramData;
    var edge = null;
    for (var i = 0; i < data.edges.length; i++) {
      if (data.edges[i].id === edgeId) { edge = data.edges[i]; break; }
    }
    if (!edge) return;
    // 进入重连模式：高亮所有可用端口
    canvas._reconnectMode = { edgeId: edgeId, end: end, oldNodeId: edge[end] };
    _topoDeselect(topoId);
    // 高亮所有元件端口（除当前端点所在元件外）
    _renderTopoCanvas(topoId);
    var allPorts = canvas.querySelectorAll('.topo-port');
    allPorts.forEach(function(p) {
      var nodeEl = p.closest('.topo-node');
      if (!nodeEl) return;
      var nid = nodeEl.getAttribute('data-node-id');
      if (nid === edge[end]) return; // 不连回自己
      p.style.background = 'rgba(0,255,160,0.5)';
      p.style.boxShadow = '0 0 8px rgba(0,255,160,0.5)';
      p.style.width = '14px'; p.style.height = '14px';
      p.style.transform = 'translate(-2px,-2px)';
      p.style.pointerEvents = 'auto';
      p.style.cursor = 'crosshair';
      p.style.zIndex = '100';
      // 绑定点击事件
      p.onclick = function(ev) {
        ev.stopPropagation(); ev.preventDefault();
        _topoFinishReconnect(topoId, edgeId, end, nid, p.getAttribute('data-port-id'));
      };
    });
    // 点击画布空白处取消重连模式
    var cancelHandler = function(ev) {
      if (ev.target.closest('.topo-port')) return;
      canvas._reconnectMode = null;
      canvas.removeEventListener('click', cancelHandler);
      _renderTopoCanvas(topoId);
      _topoSelectEdge(topoId, edgeId);
    };
    setTimeout(function() { canvas.addEventListener('click', cancelHandler); }, 100);
  }

  function _topoFinishReconnect(topoId, edgeId, end, newNodeId, newPortId) {
    var canvas = document.getElementById('topo-canvas-' + topoId);
    if (!canvas) return;
    var data = canvas._diagramData;
    for (var i = 0; i < data.edges.length; i++) {
      if (data.edges[i].id === edgeId) {
        data.edges[i][end] = newNodeId;
        data.edges[i][end + 'Port'] = newPortId;
        break;
      }
    }
    canvas._reconnectMode = null;
    canvas._selectedEdgeId = edgeId;
    _renderTopoCanvas(topoId);
    _topoSelectEdge(topoId, edgeId);
  }

  // 同步数据到 hidden input 并重新渲染
  function _syncAndRender(canvas, topoId) {
    var section = canvas.closest('.topo-editor-section');
    var input = section.querySelector('.topo-edit-diagram-data');
    if (input) {
      var cleanData = { nodes: canvas._diagramData.nodes, edges: canvas._diagramData.edges };
      delete cleanData.legacySvg;
      input.value = JSON.stringify(cleanData);
    }
    _renderTopoCanvas(topoId);
    // 标记脏数据 + 启动 5 分钟自动保存定时器
    _markTopoDirty(topoId);
  }

  // ── 脏标记 & 自动保存 ──
  var _topoDirty = {};        // 每个 topoId 是否有未保存的修改
  var _topoManualSaved = {};  // 用户是否至少手动保存过一次
  var _autoSaveTimers = {};

  function _markTopoDirty(topoId) {
    _topoDirty[topoId] = true;
    _scheduleAutoSave(topoId);
  }

  function _scheduleAutoSave(topoId) {
    // 只启动一次定时器，避免重复
    if (_autoSaveTimers[topoId]) return;
    _autoSaveTimers[topoId] = setInterval(function() {
      // 5分钟检查一次：有修改 + 用户至少手动保存过一次 → 静默保存
      if (_topoDirty[topoId] && _topoManualSaved[topoId]) {
        saveTopoData();
        _topoDirty[topoId] = false;
      }
    }, 5 * 60 * 1000); // 5 分钟
  }

  // 保存当前拓扑（含BOM）到本地
  function _topoSaveCurrent(topoId) {
    var card = document.querySelector('.topo-admin-card[data-topo-id="' + topoId + '"]');
    if (!card) return;
    saveTopoData();
    _topoDirty[topoId] = false;
    _topoManualSaved[topoId] = true;
    // 按钮反馈（无 toast）
    var btn = document.querySelector('#topo-cable-selector-' + topoId + ' .topo-save-btn') ||
              document.querySelector('.topo-save-btn');
    if (btn) {
      btn.textContent = '✅ 已保存';
      btn.classList.add('saved');
      setTimeout(function() {
        btn.textContent = '💾 保存';
        btn.classList.remove('saved');
      }, 1500);
    }
  }

  // ── 关闭页面提醒 ──
  function _setupBeforeUnload() {
    window.addEventListener('beforeunload', function(e) {
      // 检查是否有未保存的修改
      var hasUnsaved = false;
      for (var tid in _topoDirty) {
        if (_topoDirty[tid]) { hasUnsaved = true; break; }
      }
      if (hasUnsaved) {
        e.preventDefault();
        e.returnValue = '您有未保存的修改，是否保存后关闭？';
        return e.returnValue;
      }
    });
  }

  // Toast 提示
  function _showToast(msg) {
    var toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:40px;left:50%;transform:translateX(-50%);z-index:99999;' +
      'background:rgba(0,200,100,0.9);color:#fff;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600;' +
      'box-shadow:0 4px 16px rgba(0,0,0,0.3);pointer-events:none;transition:opacity .4s';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function() { toast.style.opacity = '0'; }, 1800);
    setTimeout(function() { toast.remove(); }, 2200);
  }

  // ── 个人信息管理 ──────────────────────────────────────────
  function injectProfileModal() {
    var div = document.createElement('div');
    div.innerHTML = '<div class=\"amodal\" id=\"amodal-profile\" style=\"display:none\">' +
      '<div class=\"amodal-box\" style=\"width:min(420px,94vw)\">' +
        '<div class=\"amodal-title\">个人信息管理</div>' +
        '<div style=\"text-align:center;margin:-8px 0 16px\">' +
          '<div id=\"profile-avatar\" style=\"width:60px;height:60px;border-radius:50%;margin:0 auto 6px;background-size:cover;background-position:center;border:2px solid rgba(100,180,255,.3);cursor:pointer;transition:transform .2s\" onclick=\"ADMIN.randomizeAvatar()\" title=\"点击随机换头像\"></div>' +
          '<span style=\"font-size:11px;color:rgba(255,255,255,.45);cursor:pointer\" onclick=\"ADMIN.randomizeAvatar()\">点击头像随机更换</span>' +
        '</div>' +
        '<div style=\"border-top:1px solid rgba(255,255,255,.08);padding-top:14px;margin-bottom:10px\">' +
          '<label style=\"font-size:13px;color:rgba(255,255,255,.55);display:block;margin-bottom:8px\">修改登录密码</label>' +
          '<div class=\"form-item\" style=\"margin-bottom:10px\"><label>当前密码</label><input type=\"password\" id=\"profile-old-pwd\" placeholder=\"输入当前密码\" /></div>' +
          '<div class=\"form-item\" style=\"margin-bottom:10px\"><label>新密码</label><input type=\"password\" id=\"profile-new-pwd1\" placeholder=\"输入新密码\" /></div>' +
          '<div class=\"form-item\" style=\"margin-bottom:10px\"><label>确认新密码</label><input type=\"password\" id=\"profile-new-pwd2\" placeholder=\"再次输入新密码\" /></div>' +
          '<button class=\"btn-sm btn-blue\" onclick=\"ADMIN.changePassword()\" style=\"width:100%\">修改密码</button>' +
          '<div id=\"profile-pwd-err\" class=\"error-msg\" style=\"display:none;margin-top:8px\"></div>' +
        '</div>' +
        '<div style=\"border-top:1px solid rgba(255,255,255,.08);padding-top:14px;display:flex;flex-direction:column;gap:8px\">' +
          '<label style=\"font-size:13px;color:rgba(255,255,255,.55)\">快捷入口</label>' +
          '<button class=\"btn-sm btn-blue\" onclick=\"ADMIN.profileGoTo(\'users\')\">用户管理（添加/编辑/删除用户）</button>' +
          '<button class=\"btn-sm btn-green\" onclick=\"ADMIN.profileGoTo(\'products\')\">产品配置后台（编辑产品编码）</button>' +
          '<button class=\"btn-sm btn-gray\" onclick=\"ADMIN.profileGoTo(\'reqfields\')\">需求模块配置</button>' +
        '</div>' +
        '<div class=\"amodal-btns\" style=\"margin-top:14px\"><button class=\"btn-sm btn-gray\" onclick=\"ADMIN.closeProfile()\">关闭</button></div>' +
      '</div></div>';
    document.body.appendChild(div.firstElementChild);
  }

  function showProfile() {
    var modal = document.getElementById('amodal-profile');
    if (!modal) { console.warn('amodal-profile not found, re-injecting'); injectProfileModal(); modal = document.getElementById('amodal-profile'); }
    var avatarEl = document.getElementById('admin-avatar');
    var profileAvatar = document.getElementById('profile-avatar');
    if (profileAvatar && avatarEl) {
      profileAvatar.style.backgroundImage = avatarEl.style.backgroundImage || '';
      profileAvatar.style.backgroundSize = 'cover';
      profileAvatar.style.backgroundPosition = 'center';
    }
    if (modal) modal.style.display = 'flex';
  }

  function closeProfile() {
    var el = document.getElementById('amodal-profile');
    if (el) el.style.display = 'none';
    var errEl = document.getElementById('profile-pwd-err');
    if (errEl) errEl.style.display = 'none';
  }

  function randomizeAvatar() {
    var avatarList = ['avatar1.jpg','avatar2.jpg','avatar3.jpg','avatar4.jpg','avatar5.jpg','avatar6.jpg','avatar7.jpg','avatar8.jpg','avatar9.jpg'];
    var avatarBase = 'images/avatars/';
    var savedAvatar = avatarList[Math.floor(Math.random() * avatarList.length)];
    localStorage.setItem('ess_admin_avatar', savedAvatar);
    var url = avatarBase + savedAvatar;
    // 更新弹窗中的头像
    var profileAvatar = document.getElementById('profile-avatar');
    if (profileAvatar) profileAvatar.style.backgroundImage = 'url(' + url + ')';
    // 更新侧边栏头像
    var avatarEl = document.getElementById('admin-avatar');
    if (avatarEl) {
      avatarEl.style.backgroundImage = 'url(' + url + ')';
      avatarEl.style.backgroundSize = 'cover';
      avatarEl.style.backgroundPosition = 'center';
      avatarEl.textContent = '';
    }
  }

  async function changePassword() {
    var errEl = document.getElementById('profile-pwd-err');
    errEl.style.display = 'none';
    var oldPwd = document.getElementById('profile-old-pwd').value;
    var new1 = document.getElementById('profile-new-pwd1').value;
    var new2 = document.getElementById('profile-new-pwd2').value;
    if (!oldPwd) { errEl.textContent = '请输入当前密码'; errEl.style.display = 'block'; return; }
    if (!new1)   { errEl.textContent = '请输入新密码'; errEl.style.display = 'block'; return; }
    if (new1 !== new2) { errEl.textContent = '两次输入的密码不一致'; errEl.style.display = 'block'; return; }

    var session = AUTH.getSession();
    var users = AUTH.getUsers();
    var me = users.find(function(u) { return u.id === session.userId; });
    var oldHash = await AUTH.sha256(oldPwd);
    if (!me || me.passwordHash !== oldHash) { errEl.textContent = '当前密码错误'; errEl.style.display = 'block'; return; }

    var r = await AUTH.updateUser(session.userId, { password: new1 });
    if (!r.ok) { errEl.textContent = r.msg; errEl.style.display = 'block'; return; }
    alert('密码修改成功！');
    document.getElementById('profile-old-pwd').value = '';
    document.getElementById('profile-new-pwd1').value = '';
    document.getElementById('profile-new-pwd2').value = '';
    closeProfile();
  }

  function profileGoTo(tab) {
    closeProfile();
    switchTab(tab);
  }

  // ── 站点设置 ──────────────────────────────────────────────
  function renderSiteSettings() {
    var s = STORAGE.get('settings') || {};
    var cities = s.weatherCities || [];
    var quotes = s.quotes || [];
    var tips = s.tips || [];

    var citiesText = cities.map(function(c){ return c.zh + ',' + c.en; }).join('\n');
    var quotesText = quotes.join('\n');
    var tipsText = tips.map(function(t){ return t.icon + ' ' + t.text; }).join('\n');

    var html = '<div style="display:grid;gap:18px;max-width:700px">';

    // 城市列表
    html += '<div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px">';
    html += '<div style="font-size:14px;font-weight:600;color:#64b4ff;margin-bottom:8px">🌍 天气城市列表</div>';
    html += '<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:8px">每行一个城市，格式：中文名,英文名。例：深圳,Shenzhen</div>';
    html += '<textarea id="ss-cities" rows="12" style="width:100%;font-family:monospace;font-size:12px;resize:vertical">' + citiesText + '</textarea>';
    html += '</div>';

    // 励志文案
    html += '<div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px">';
    html += '<div style="font-size:14px;font-weight:600;color:#64b4ff;margin-bottom:8px">💬 励志文案</div>';
    html += '<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:8px">每行一条文案，首页天气栏旁边轮播显示</div>';
    html += '<textarea id="ss-quotes" rows="10" style="width:100%;font-family:monospace;font-size:12px;resize:vertical">' + quotesText + '</textarea>';
    html += '</div>';

    // 操作技巧
    html += '<div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px">';
    html += '<div style="font-size:14px;font-weight:600;color:#64b4ff;margin-bottom:8px">💡 操作技巧</div>';
    html += '<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:8px">每行一条，格式：icon + 空格 + 文字。例：💡 配置完记得先预览再导出 Excel</div>';
    html += '<textarea id="ss-tips" rows="10" style="width:100%;font-family:monospace;font-size:12px;resize:vertical">' + tipsText + '</textarea>';
    html += '</div>';

    html += '</div>';
    document.getElementById('admin-sitesettings-content').innerHTML = html;
  }

  function saveSiteSettings() {
    var citiesText = (document.getElementById('ss-cities') || {}).value || '';
    var quotesText = (document.getElementById('ss-quotes') || {}).value || '';
    var tipsText = (document.getElementById('ss-tips') || {}).value || '';

    // 解析城市
    var cities = [];
    citiesText.split('\n').forEach(function(line){
      line = line.trim();
      if (!line) return;
      var parts = line.split(',');
      var zh = (parts[0] || '').trim();
      var en = (parts[1] || '').trim();
      if (zh && en) cities.push({zh:zh, en:en});
    });

    // 解析语录
    var quotes = [];
    quotesText.split('\n').forEach(function(line){
      line = line.trim();
      if (line) quotes.push(line);
    });

    // 解析技巧
    var tips = [];
    tipsText.split('\n').forEach(function(line){
      line = line.trim();
      if (!line) return;
      var spaceIdx = line.indexOf(' ');
      if (spaceIdx > 0) {
        tips.push({icon: line.substring(0, spaceIdx), text: line.substring(spaceIdx + 1)});
      } else {
        tips.push({icon: '💡', text: line});
      }
    });

    var s = STORAGE.get('settings') || {};
    s.weatherCities = cities;
    s.quotes = quotes;
    s.tips = tips;
    STORAGE.set('settings', s);
    alert('✅ 站点设置已保存！刷新首页生效。');
  }

  function resetSiteSettings() {
    if (!confirm('确定要恢复默认设置吗？将清除所有自定义城市、文案和技巧。')) return;
    var s = STORAGE.get('settings') || {};
    delete s.weatherCities;
    delete s.quotes;
    delete s.tips;
    STORAGE.set('settings', s);
    renderSiteSettings();
    alert('✅ 已恢复默认设置。刷新首页生效。');
  }

  // ── 模态框 ────────────────────────────────────────────────
  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }

  // ── 公开 API ─────────────────────────────────────────────
  return {
    init, switchTab, backToMain, toggleTheme, toggleSidebar, applyTheme, closeModal,
    showCreateUser, showEditUser, saveUser, deleteUser,
    renderUserList, renderProductList, addProduct, removeProduct, saveProducts, toggleProductEdit,
    showEditCategory, saveCategory, deleteCategory, showNewCategory, saveNewCategory,
    renderReqFieldList, saveReqFields, resetReqFields, onRfTypeChange,
    renderProjectList, deleteProject, importProjects,
    showProfile, closeProfile, randomizeAvatar, changePassword, profileGoTo,
    renderTopoAdminList, addTopoScene, deleteTopoScene, toggleTopoEditor,
    saveTopoData, resetTopoData,
    addInfoBlock, addInfoItem, addExtraBlock, addExtraItem, addBomRow, _renumberBomRows,
    _initTopoEditor, _filterComponentLib, _onLibDragStart, _onLibDragEnd,
    _selectCableType, _topoZoom, _topoResetView, _topoToggleFullscreen, _topoDeselect, _topoDeleteNode, _topoDuplicateNode,
    _topoUpdateLabel, _topoUpdatePos, _topoUpdateCTPos, _topoUpdateDescription,
    _topoPickProductCode, _topoAssignProductCode, _topoUpdateEdgeType, _topoDeleteEdge, _topoReconnectEdge, _topoSaveCurrent, _generateSvgFromDiagram,
    _syncBomToCanvas, _refreshProductCodeMap,
    _openCableManager, _closeCableManager, _addCableType, _deleteCableType, _updateCableField, _resetCableTypes, _saveAndCloseCableManager,
    renderSiteSettings, saveSiteSettings, resetSiteSettings
  };
})();
