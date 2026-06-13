/* ═══════════════════════════════════════════════════════════════
   拓扑元件库管理中心 — Admin Module
   管理员维护元件、SVG、模板；用户拖拽组合拓扑图
   ══════════════════════════════════════════════════════════════ */

/* ── 元件分类（一级） ── */
var COMP_LIB_CATEGORIES = [
  { id:'grid',    name:'电网侧',     icon:'⚡' },
  { id:'bus',     name:'母线系统',   icon:'📊' },
  { id:'switch',  name:'开关设备',   icon:'🔌' },
  { id:'trans',   name:'变压器系统', icon:'⚡' },
  { id:'meter',   name:'计量系统',   icon:'📟' },
  { id:'storage', name:'储能系统',   icon:'🔋' },
  { id:'pcs',    name:'PCS系统',    icon:'⚡' },
  { id:'emb',    name:'EMS/BMS',    icon:'🖥️' },
  { id:'gridcon', name:'并网系统',   icon:'🔗' },
  { id:'load',   name:'负载系统',   icon:'🏭' },
  { id:'aux',    name:'辅助系统',   icon:'🛡️' },
  { id:'cable',  name:'连接元件',   icon:'🔗' }
];

/* ── 元件子分类（二级） ── */
var COMP_LIB_SUBCATEGORIES = {
  grid:    ['10kV电网','35kV电网','110kV电网','220kV电网'],
  bus:     ['10kV母线','35kV母线','0.4kV母线','±375V直流母线','±800V直流母线'],
  switch:  ['高压断路器','低压断路器','隔离开关','接地开关','负荷开关','熔断器'],
  trans:   ['升压变','降压变','隔离变','分裂变'],
  meter:   ['高压计量柜','低压计量柜','CT互感器','PT互感器','快速电表','防逆流电表','智能电表'],
  storage: ['储能柜','电池簇','电池模组','液冷储能柜','风冷储能柜','储能集装箱'],
  pcs:     ['PCS柜','PCS模块','DC/DC变换器','DC/AC逆变器'],
  emb:     ['EMS控制柜','BMS主控','BMS从控','EMS触摸屏'],
  gridcon: ['并网柜','防逆流柜','同期装置','同期点','无功补偿柜'],
  load:    ['工厂负载','充电桩','商业负载','居民负载','数据中心负载','交流负载','直流负载'],
  aux:     ['消防系统','空调系统','风机系统','液冷机组','UPS','动环监控','连接元件'],
  cable:   ['母线桥','电力电缆','通信线缆','控制电缆','光纤'],
  network: ['工业交换机','4G路由器','5G路由器','串口服务器','协议转换器','光纤收发器']
};

/* ── 模板分类 ── */
var COMP_LIB_TEMPLATE_CATS = [
  '高压并网方案','低压并网方案','光储方案','储充方案',
  '工商业储能','台区储能','微电网系统','多变压器方案','单变压器方案'
];

/* ============================================================
   COMPONENT_LIB_ADMIN — 主模块
   ============================================================ */
var COMPONENT_LIB_ADMIN = (() => {

  /* ── 状态 ── */
  let currentSubTab = 'components';   // components | templates | categories
  let searchKeyword  = '';
  let filterCat     = '';
  let filterSubCat  = '';
  let editingCompId = null;
  let editingTplId  = null;

  /* ── 数据（从 STORAGE 加载，无则使用 component-lib.js 的默认数据） ── */
  let components = [];
  let templates  = [];
  let trash      = [];  // 回收箱

  /* ==========================================================
     Init / Load / Save
     ========================================================== */

  function init() {
    loadCategories();
    loadComponents();
    loadTemplates();
    loadTrash();
  }

  /* 加载分类（持久化） */
  function loadCategories() {
    var saved = STORAGE.get('categories');
    if (saved) {
      if (Array.isArray(saved.categories))  COMP_LIB_CATEGORIES  = saved.categories;
      if (saved.subcategories)              COMP_LIB_SUBCATEGORIES = saved.subcategories;
      if (Array.isArray(saved.templateCats)) COMP_LIB_TEMPLATE_CATS = saved.templateCats;
    }
  }
  function saveCategories() {
    STORAGE.set('categories', {
      categories: COMP_LIB_CATEGORIES,
      subcategories: COMP_LIB_SUBCATEGORIES,
      templateCats: COMP_LIB_TEMPLATE_CATS
    });
  }

  /* 加载元件 */
  function loadComponents() {
    var local = STORAGE.get('components') || [];
    // 从 COMPONENT_LIB 导入 / 合并新增元件
    if (typeof COMPONENT_LIB !== 'undefined' && Array.isArray(COMPONENT_LIB)) {
      const localIds = {};
      local.forEach(function(c) { localIds[c.id] = true; });
      const catMap = { storage:'储能系统', power:'PCS系统', control:'EMS/BMS', trans:'变压器系统',
                      dist:'开关设备', gen:'电网侧', load:'负载系统', aux:'辅助系统', meter:'计量系统',
                      switchgear:'开关设备', gridcon:'并网系统', busbar:'母线系统', network:'通信设备' };
      COMPONENT_LIB.forEach(function(c) {
        if (!localIds[c.id]) {
          // 本地不存在 → 新增
          local.push({
            id:              c.id || ('comp_' + Date.now() + '_' + Math.random().toString(36).slice(2,7)),
            name:            c.name || c.label || '未命名',
            categoryParent:  catMap[c.category] || '其他',
            categoryChild:   '',
            svg:             c.svg || '',
            description:     c.desc || '',
            defaultWidth:    c.width || 80,
            defaultHeight:   c.height || 60,
            connectionPoints: normalizePorts(c.ports),
            defaultRotation: c.defaultRotation || 0,
            defaultPosX:     c.defaultPosX || 0,
            defaultPosY:     c.defaultPosY || 0,
            allowRotate:     true,
            allowScale:      true,
            tags:            [],
            enabled:         true,
            createdAt:       new Date().toISOString(),
            updatedAt:       new Date().toISOString()
          });
        } else {
          // 已存在于本地：从 COMPONENT_LIB 同步 SVG 和尺寸
          // （确保手动编辑 component-lib.js 后立即生效）
          for (var i2 = 0; i2 < local.length; i2++) {
            if (local[i2].id === c.id) {
              if (c.svg) local[i2].svg = c.svg;
              if (c.width)  local[i2].defaultWidth  = c.width;
              if (c.height) local[i2].defaultHeight = c.height;
              if (c.defaultRotation != null) local[i2].defaultRotation = c.defaultRotation;
              if (c.defaultPosX != null) local[i2].defaultPosX = c.defaultPosX;
              if (c.defaultPosY != null) local[i2].defaultPosY = c.defaultPosY;
              break;
            }
          }
        }
      });
      components = local;
      saveComponents();
    } else if (local.length > 0) {
      components = local;
    }
  }

  function normalizePorts(ports) {
    const cp = { top:{enabled:false,offsetX:0.5}, bottom:{enabled:false,offsetX:0.5},
                 left:{enabled:false,offsetY:0.5}, right:{enabled:false,offsetY:0.5}, custom:[] };
    if (Array.isArray(ports)) {
      ports.forEach(function(p) {
        if (!p || !p.side) return;
        const side = p.side; // top|bottom|left|right
        if (cp[side]) { cp[side].enabled = true; cp[side].offsetX = p.x != null ? p.x : 0.5; cp[side].offsetY = p.y != null ? p.y : 0.5; }
      });
    }
    return cp;
  }

  function saveComponents() {
    STORAGE.set('components', components);
  }

  /* 回收箱相关 */
  function loadTrash() {
    var saved = STORAGE.get('comp_trash');
    if (Array.isArray(saved)) trash = saved;
  }
  function saveTrash() {
    STORAGE.set('comp_trash', trash);
  }

  /* 加载模板 */
  function loadTemplates() {
    var saved = STORAGE.get('templates');
    if (saved && saved.length > 0) { templates = saved; return; }
    // 无本地数据 → 从 component-lib.js 的 PRESET_LAYOUTS 导入
    if (typeof PRESET_LAYOUTS !== 'undefined') {
      templates = Object.keys(PRESET_LAYOUTS).map(function(k) {
        const p = PRESET_LAYOUTS[k];
        return {
          id: 'tpl_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
          name: p.label || k,
          description: '',
          category: '高压并网方案',
          nodes: p.nodes || [],
          edges: p.edges || [],
          layout: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      });
      saveTemplates();
    }
  }

  function saveTemplates() {
    STORAGE.set('templates', templates);
  }

  /* ==========================================================
     Render — 主 Tab Pane（由 admin.js 调用）
     ========================================================== */

  /* 渲染整个「拓扑元件库」tab 的内容 */
  function renderCompLibPane() {
    return `
    <div id="complib-root">
      <!-- 子标签栏 -->
      <div class="complib-sub-tabs">
        <button class="complib-sub-tab ${currentSubTab==='components'?'active':''}" onclick="COMPONENT_LIB_ADMIN.switchSubTab('components')">🧩 元件管理</button>
        <button class="complib-sub-tab ${currentSubTab==='templates'?'active':''}" onclick="COMPONENT_LIB_ADMIN.switchSubTab('templates')">📐 模板管理</button>
        <button class="complib-sub-tab ${currentSubTab==='categories'?'active':''}" onclick="COMPONENT_LIB_ADMIN.switchSubTab('categories')">📁 分类管理</button>
      </div>
      <div id="complib-sub-content">
        ${renderSubContent()}
      </div>
    </div>`;
  }

  function renderSubContent() {
    if (currentSubTab === 'components') return renderComponentList();
    if (currentSubTab === 'templates')  return renderTemplateList();
    if (currentSubTab === 'categories') return renderCategoryTree();
    return '';
  }

  function switchSubTab(tab) {
    currentSubTab = tab;
    const el = document.getElementById('complib-sub-content');
    if (el) el.innerHTML = renderSubContent();
    // 高亮子标签
    document.querySelectorAll('.complib-sub-tab').forEach(function(btn){ btn.classList.remove('active'); });
    const activeBtn = document.querySelector('.complib-sub-tab[onclick*="' + tab + '"]');
    if (activeBtn) activeBtn.classList.add('active');
  }

  /* ==========================================================
     子标签1：元件管理
     ========================================================== */

  function renderComponentList() {
    const filtered = getFilteredComponents();
    let html = `
      <!-- 工具栏 -->
      <div class="complib-toolbar">
        <input type="text" class="complib-search" placeholder="🔍 搜索元件名称/标签…" value="${escHtml(searchKeyword)}"
               oninput="COMPONENT_LIB_ADMIN.onSearch(this.value)" />
        <select class="complib-filter" onchange="COMPONENT_LIB_ADMIN.onFilterCat(this.value)">
          <option value="">全部分类</option>
          ${COMP_LIB_CATEGORIES.map(function(c){ return '<option value="'+c.name+'"'+ (filterCat===c.name?' selected':'') +'>'+c.icon+' '+c.name+'</option>'; }).join('')}
        </select>
        <select class="complib-filter" onchange="COMPONENT_LIB_ADMIN.onFilterSubCat(this.value)">
          <option value="">全部子分类</option>
          ${(filterCat ? (COMP_LIB_SUBCATEGORIES[getCatIdByName(filterCat)]||[]) : []).map(function(sc){ return '<option value="'+sc+'"'+(filterSubCat===sc?' selected':'')+'>'+sc+'</option>'; }).join('')}
        </select>
        <button class="btn-sm btn-green" onclick="COMPONENT_LIB_ADMIN.showAddComponent()">＋ 新增元件</button>
        <button class="btn-sm btn-blue" onclick="COMPONENT_LIB_ADMIN.exportComponents()">📤 导出</button>
        <label class="btn-sm btn-gray" style="cursor:pointer">
          📥 导入
          <input type="file" accept=".json" style="display:none" onchange="COMPONENT_LIB_ADMIN.importComponents(this)">
        </label>
      </div>
      <!-- 统计 -->
      <div class="complib-stats">共 <b>${components.length}</b> 个元件，启用 <b>${components.filter(function(c){return c.enabled}).length}</b> 个</div>
      <!-- 列表 -->
      <div class="complib-comp-grid">
        ${filtered.length === 0 ? '<div class="complib-empty">暂无元件，点击「＋ 新增元件」开始添加</div>' : filtered.map(renderComponentCard).join('')}
      </div>
      <!-- 回收箱 -->
      <div class="complib-trash-section" id="complib-trash">
        <div class="complib-trash-header" onclick="COMPONENT_LIB_ADMIN.toggleTrash()">
          <span class="complib-trash-icon">🗑️</span>
          <span>回收箱</span>
          <span class="complib-trash-count">${trash.length} 个元件</span>
          ${trash.length > 0 ? '<button class="btn-sm btn-red" onclick="event.stopPropagation();COMPONENT_LIB_ADMIN.emptyTrash()" style="margin-left:auto">清空</button>' : ''}
          <span class="complib-trash-arrow" id="complib-trash-arrow">▼</span>
        </div>
        <div class="complib-trash-body" id="complib-trash-body" style="display:none">
          ${trash.length === 0 ? '<div class="complib-empty" style="padding:16px">回收箱为空</div>' : '<div class="complib-comp-grid">'+trash.map(renderTrashItem).join('')+'</div>'}
        </div>
      </div>`;
    return html;
  }

  function getFilteredComponents() {
    return components.filter(function(c) {
      if (filterCat && c.categoryParent !== filterCat) return false;
      if (filterSubCat && c.categoryChild !== filterSubCat) return false;
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        return (c.name||'').toLowerCase().indexOf(kw) >= 0
            || (c.description||'').toLowerCase().indexOf(kw) >= 0
            || (c.tags||[]).join(' ').toLowerCase().indexOf(kw) >= 0;
      }
      return true;
    });
  }

  function renderComponentCard(c) {
    const statusClass = c.enabled ? 'enabled' : 'disabled';
    const statusText = c.enabled ? '启用' : '停用';
    const vw = c.defaultWidth || 80, vh = c.defaultHeight || 60;
    const svgPreview = c.svg ? '<div class="complib-card-svg"><svg viewBox="0 0 '+vw+' '+vh+'" width="'+Math.min(vw,100)+'" height="'+Math.min(vh,80)+'">'+c.svg+'</svg></div>'
                       : '<div class="complib-card-svg complib-card-svg-empty">无SVG</div>';
    return `
    <div class="complib-card ${statusClass}" data-id="${c.id}">
      ${svgPreview}
      <div class="complib-card-body">
        <div class="complib-card-name">${escHtml(c.name)}</div>
        <div class="complib-card-meta">${escHtml(c.categoryParent||'')}${c.categoryChild?' / '+escHtml(c.categoryChild):''}</div>
        <div class="complib-card-desc">${escHtml((c.description||'').slice(0,40))}</div>
        <div class="complib-card-actions">
          <button class="btn-sm ${c.enabled?'btn-gray':'btn-green'}" onclick="COMPONENT_LIB_ADMIN.toggleComponent('${c.id}')">${c.enabled?'停用':'启用'}</button>
          <button class="btn-sm btn-blue" onclick="COMPONENT_LIB_ADMIN.showEditComponent('${c.id}')">编辑</button>
          <button class="btn-sm btn-gray" onclick="COMPONENT_LIB_ADMIN.duplicateComponent('${c.id}')">复制</button>
          <button class="btn-sm btn-red" onclick="COMPONENT_LIB_ADMIN.deleteComponent('${c.id}')">删除</button>
        </div>
      </div>
      <div class="complib-card-status ${statusClass}">${statusText}</div>
    </div>`;
  }

  /* 回收箱项目渲染 */
  function renderTrashItem(t) {
    var catIcon = (COMP_LIB_CATEGORIES.find(function(c){return c.name===t.categoryParent})||{}).icon||'📦';
    return '<div class="complib-card" style="opacity:0.65">'+
      '<div class="complib-card-svg">'+
        (t.svg ? '<svg viewBox="0 0 '+(t.defaultWidth||80)+' '+(t.defaultHeight||60)+'" width="80" height="52">'+t.svg+'</svg>' : '<span class="complib-card-svg-empty">无预览</span>')+
      '</div>'+
      '<div class="complib-card-body">'+
        '<div class="complib-card-name">'+escHtml(t.name||'未命名')+'</div>'+
        '<div class="complib-card-meta">'+escHtml(t.categoryParent||'')+' / '+escHtml(t.categoryChild||'')+'</div>'+
        '<div class="complib-card-actions">'+
          '<button class="btn-sm btn-green" onclick="COMPONENT_LIB_ADMIN.restoreFromTrash(\''+t.id+'\')">🔄 恢复</button>'+
          '<button class="btn-sm btn-red" onclick="COMPONENT_LIB_ADMIN.permanentlyDelete(\''+t.id+'\')">🗑 彻底删除</button>'+
        '</div>'+
      '</div>'+
    '</div>';
  }
  function toggleTrash() {
    var body = document.getElementById('complib-trash-body');
    var arrow = document.getElementById('complib-trash-arrow');
    if (!body) return;
    if (body.style.display === 'none') { body.style.display = 'block'; if(arrow) arrow.textContent = '▲'; }
    else { body.style.display = 'none'; if(arrow) arrow.textContent = '▼'; }
  }

  /* ── 搜索/筛选 handlers ── */
  function onSearch(val) {
    searchKeyword = val;
    refreshComponentList();
  }
  function onFilterCat(val) {
    filterCat = val; filterSubCat = '';
    refreshComponentList();
  }
  function onFilterSubCat(val) {
    filterSubCat = val;
    refreshComponentList();
  }
  function refreshComponentList() {
    const el = document.getElementById('complib-sub-content');
    if (el) el.innerHTML = renderSubContent();
  }

  /* 分类联动：模态框中一级分类变更时更新二级分类下拉 */
  function onCatParentChange() {
    var sel = document.getElementById('comp-cat-parent');
    var childSel = document.getElementById('comp-cat-child');
    if (!sel || !childSel) return;
    var catName = sel.value;
    var catId = getCatIdByName(catName);
    var subs = catId ? (COMP_LIB_SUBCATEGORIES[catId] || []) : [];
    var svgPreview = document.getElementById('comp-svg-preview');
    childSel.innerHTML = '<option value="">请选择二级分类</option>' +
      subs.map(function(sc){ return '<option value="'+sc+'">'+sc+'</option>'; }).join('');
  }

  /* ==========================================================
     元件 CRUD
     ========================================================== */

  function showAddComponent() {
    editingCompId = null;
    openComponentModal({}, '新增元件');
  }

  function showEditComponent(id) {
    const c = components.find(function(x){ return x.id === id; });
    if (!c) return;
    editingCompId = id;
    openComponentModal(c, '编辑元件 — ' + c.name);
  }

  function openComponentModal(c, title) {
    const isEdit = !!editingCompId;
    const svgVal = (c.svg||'');
    var connPts = c.connectionPoints || { top:{enabled:false}, bottom:{enabled:false}, left:{enabled:false}, right:{enabled:false}, custom:[] };
    var w = c.defaultWidth || 80, h = c.defaultHeight || 60;
    var visPtsJson = escape(JSON.stringify(connPts));
    var modalHtml = `
    <div class="amodal" id="amodal-comp" style="display:flex">
      <div class="amodal-box has-sticky-header" style="width:min(720px,96vw);max-height:90vh;overflow-y:auto">
        <!-- 固定头部（标题 + 按钮） -->
        <div class="amodal-sticky-top">
          <div class="amodal-title" style="margin-bottom:0">${escHtml(title)}</div>
          <div class="sticky-btns">
            <button class="btn-sm btn-gray" onclick="COMPONENT_LIB_ADMIN.closeCompModal()">取消</button>
            <button class="btn-sm btn-blue" onclick="COMPONENT_LIB_ADMIN.saveComponent()">💾 保存</button>
          </div>
        </div>
        <input type="hidden" id="comp-edit-id" value="${escHtml(editingCompId||'')}" />
        <!-- 基本信息 -->
        <div class="form-item"><label>元件名称 *</label><input type="text" id="comp-name" value="${escHtml(c.name||'')}" placeholder="如：储能柜" /></div>
        <div class="form-item"><label>分类</label>
          <div style="display:flex;gap:8px">
            <select id="comp-cat-parent" onchange="COMPONENT_LIB_ADMIN.onCatParentChange()" style="flex:1">
              <option value="">请选择一级分类</option>
              ${COMP_LIB_CATEGORIES.map(function(cat){ return '<option value="'+cat.name+'"'+(c.categoryParent===cat.name?' selected':'')+'>'+cat.icon+' '+cat.name+'</option>'; }).join('')}
            </select>
            <select id="comp-cat-child" style="flex:1">
              <option value="">请选择二级分类</option>
              ${((c.categoryParent && COMP_LIB_SUBCATEGORIES[getCatIdByName(c.categoryParent)])||[]).map(function(sc){ return '<option value="'+sc+'"'+(c.categoryChild===sc?' selected':'')+'>'+sc+'</option>'; }).join('')}
            </select>
          </div>
        </div>
        <div class="form-item"><label>描述</label><textarea id="comp-desc" rows="2" placeholder="元件功能描述…">${escHtml(c.description||'')}</textarea></div>
        <div class="form-item"><label>标签（逗号分隔）</label><input type="text" id="comp-tags" value="${(c.tags||[]).join(', ')}" placeholder="如：储能,电池,直流" /></div>
        <!-- 尺寸 -->
        <div style="display:flex;gap:12px">
          <div class="form-item" style="flex:1"><label>默认宽度</label><input type="number" id="comp-width" value="${w}" min="20" max="500" onchange="COMPONENT_LIB_ADMIN.refreshVisEditorSize()" /></div>
          <div class="form-item" style="flex:1"><label>默认高度</label><input type="number" id="comp-height" value="${h}" min="20" max="500" onchange="COMPONENT_LIB_ADMIN.refreshVisEditorSize()" /></div>
        </div>
        <!-- 开关 & 默认旋转 -->
        <div style="display:flex;gap:16px;margin-bottom:12px;align-items:center;flex-wrap:wrap">
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:rgba(255,255,255,.7);cursor:pointer">
            <input type="checkbox" id="comp-rotate" ${c.allowRotate!==false?'checked':''} style="width:auto" /> 允许旋转
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:rgba(255,255,255,.7);cursor:pointer">
            <input type="checkbox" id="comp-scale" ${c.allowScale!==false?'checked':''} style="width:auto" /> 允许缩放
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:rgba(255,255,255,.7);cursor:pointer">
            <input type="checkbox" id="comp-enabled" ${c.enabled!==false?'checked':''} style="width:auto" /> 启用
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:rgba(255,255,255,.7);margin-left:8px">
            <span style="color:rgba(150,190,230,0.6);font-size:11px">默认旋转：</span>
            <select id="comp-default-rotation" style="width:auto;padding:3px 8px;font-size:12px">
              <option value="0" ${(c.defaultRotation||0)===0?'selected':''}>0°</option>
              <option value="90" ${c.defaultRotation===90?'selected':''}>90°</option>
              <option value="180" ${c.defaultRotation===180?'selected':''}>180°</option>
              <option value="270" ${c.defaultRotation===270?'selected':''}>270°</option>
            </select>
          </label>
        </div>
        <!-- 默认摆放位置 -->
        <div style="display:flex;gap:12px">
          <div class="form-item" style="flex:1"><label>默认X坐标</label><input type="number" id="comp-pos-x" value="${c.defaultPosX||0}" step="10" placeholder="画布X坐标" /></div>
          <div class="form-item" style="flex:1"><label>默认Y坐标</label><input type="number" id="comp-pos-y" value="${c.defaultPosY||0}" step="10" placeholder="画布Y坐标" /></div>
        </div>
        <!-- SVG -->
        <div class="form-item">
          <label>SVG 图标</label>
          <div style="display:flex;gap:8px;align-items:flex-start">
            <div id="comp-svg-preview" class="complib-svg-preview">
              ${svgVal ? '<svg viewBox="0 0 '+w+' '+h+'" width="120" height="90">'+svgVal+'</svg>' : '<span style="color:rgba(255,255,255,.3)">无预览</span>'}
            </div>
            <div style="display:flex;flex-direction:column;gap:6px">
              <button class="btn-sm btn-blue" onclick="COMPONENT_LIB_ADMIN.uploadSvg()">📁 上传SVG</button>
              <button class="btn-sm btn-gray" onclick="COMPONENT_LIB_ADMIN.previewSvgFull()">🔍 预览</button>
              ${svgVal ? '<button class="btn-sm btn-red" onclick="COMPONENT_LIB_ADMIN.clearSvg()">🗑️ 清除</button>' : ''}
            </div>
          </div>
          <textarea id="comp-svg" rows="3" placeholder="SVG内容（自动生成或手动编辑）" style="margin-top:8px;font-family:monospace;font-size:11px">${escHtml(svgVal)}</textarea>
          <div style="font-size:11px;color:rgba(255,255,255,.4);margin-top:4px">提示：也可以直接粘贴 SVG 代码，或点击「上传SVG」选择 .svg 文件</div>
        </div>
        <!-- 连接点可视化编辑器 -->
        <div class="form-item">
          <label>连接点配置 <span style="font-weight:400;font-size:11px;color:rgba(255,255,255,.4)">（拖拽圆点调整位置，自动吸附边缘）</span></label>
          ${renderVisEditorHTML(w, h, svgVal, connPts)}
          <input type="hidden" id="comp-vis-conn-data" value="${escHtml(JSON.stringify(connPts))}" />
        </div>
        </div>
      </div>
    </div>`;
    removeExistingModal('amodal-comp');
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    // Initialize visual editor after DOM insertion
    setTimeout(function() { _initVisEditor(); }, 50);
  }

  /* ═══════════════════════════════════════════════════════════
     连接点可视化编辑器
     - 在 SVG 预览上叠加可拖拽的连接点
     - 自动吸附到边缘（上/下/左/右）和支持内部位置
     - 同侧多点自动平均分布
     ═══════════════════════════════════════════════════════════ */
  var _visState = null; // { container, w, h, points: [{id,side,offsetX,offsetY}], svg }

  var SNAP_THRESHOLD = 0.1;

  // Side colors
  var SIDE_COLORS = { top:'#3498DB', bottom:'#2ECC71', left:'#E67E22', right:'#9B59B6', center:'#F1C40F' };
  var SIDE_LABELS = { top:'上', bottom:'下', left:'左', right:'右', center:'中' };

  function renderVisEditorHTML(w, h, svgVal, connPts) {
    var CANVAS_W = 300, CANVAS_H = 220;
    // Scale to fit the SVG viewBox in canvas
    var scale = Math.min(CANVAS_W / w, CANVAS_H / h) * 0.92;
    var imgW = w * scale, imgH = h * scale;
    var ox = (CANVAS_W - imgW) / 2, oy = (CANVAS_H - imgH) / 2;

    // Build points data from connectionPoints
    var ptsData = JSON.stringify(connPts);

    return '<div class="complib-viseditor-wrap">'+
      '<div id="comp-viseditor" class="complib-viseditor" style="width:'+CANVAS_W+'px;height:'+CANVAS_H+'px" '+
          'data-w="'+w+'" data-h="'+h+'" data-scale="'+scale+'" data-ox="'+ox+'" data-oy="'+oy+'" '+
          'data-imgw="'+imgW+'" data-imgh="'+imgH+'">'+
        '<!-- SVG 背景 -->'+
        '<div class="complib-viseditor-bg" style="position:absolute;left:'+ox+'px;top:'+oy+'px;width:'+imgW+'px;height:'+imgH+'px">'+
          (svgVal ? '<svg viewBox="0 0 '+w+' '+h+'" width="'+imgW+'" height="'+imgH+'" style="display:block">'+svgVal+'</svg>' : '<span style="color:rgba(255,255,255,.2);font-size:14px;display:flex;align-items:center;justify-content:center;height:100%">拖放 SVG 到此处</span>')+
        '</div>'+
        '<!-- 连接点覆盖层（由 JS 动态渲染） -->'+
        '<div id="comp-viseditor-overlay" class="complib-viseditor-overlay" '+
          'style="position:absolute;left:0;top:0;width:'+CANVAS_W+'px;height:'+CANVAS_H+'px;pointer-events:none">'+
        '</div>'+
        '<!-- 网格辅助线 -->'+
        '<svg class="complib-viseditor-grid" style="position:absolute;left:0;top:0;width:'+CANVAS_W+'px;height:'+CANVAS_H+'px;pointer-events:none" viewBox="0 0 '+CANVAS_W+' '+CANVAS_H+'">'+
          '<rect x="'+ox+'" y="'+oy+'" width="'+imgW+'" height="'+imgH+'" fill="none" stroke="rgba(100,180,255,0.12)" stroke-width="1" stroke-dasharray="4,4" rx="2"/>'+
          // Center cross
          '<line x1="'+(ox+imgW/2)+'" y1="'+Math.max(oy-8,0)+'" x2="'+(ox+imgW/2)+'" y2="'+(oy+imgH+8)+'" stroke="rgba(255,255,255,0.06)" stroke-width="0.5"/>'+
          '<line x1="'+Math.max(ox-8,0)+'" y1="'+(oy+imgH/2)+'" x2="'+(ox+imgW+8)+'" y2="'+(oy+imgH/2)+'" stroke="rgba(255,255,255,0.06)" stroke-width="0.5"/>'+
        '</svg>'+
      '</div>'+
      '<!-- 工具栏 -->'+
      '<div class="complib-viseditor-toolbar">'+
        '<button class="btn-sm btn-gray" onclick="COMPONENT_LIB_ADMIN.visAddPoint(\'top\')" title="在元件上方添加连接点">＋ 上方</button>'+
        '<button class="btn-sm btn-gray" onclick="COMPONENT_LIB_ADMIN.visAddPoint(\'bottom\')" title="在元件下方添加连接点">＋ 下方</button>'+
        '<button class="btn-sm btn-gray" onclick="COMPONENT_LIB_ADMIN.visAddPoint(\'left\')" title="在元件左侧添加连接点">＋ 左侧</button>'+
        '<button class="btn-sm btn-gray" onclick="COMPONENT_LIB_ADMIN.visAddPoint(\'right\')" title="在元件右侧添加连接点">＋ 右侧</button>'+
        '<button class="btn-sm btn-blue" onclick="COMPONENT_LIB_ADMIN.visAutoDistribute()" title="所有边缘连接点自动平均分布">⚖ 自动均布</button>'+
        '<button class="btn-sm btn-red" onclick="COMPONENT_LIB_ADMIN.visClearAll()" title="清除所有连接点">🗑 清除全部</button>'+
      '</div>'+
      '<div class="complib-vis-legend">'+
        '<span style="color:#3498DB">● 上方</span> <span style="color:#2ECC71">● 下方</span> <span style="color:#E67E22">● 左侧</span> <span style="color:#9B59B6">● 右侧</span>'+
        ' <span style="font-size:10px;color:rgba(255,255,255,.35)">拖拽圆点移动 · 自动吸附边缘 · 同侧自动均布</span>'+
      '</div>'+
    '</div>';
  }

  // Initialize visual editor after modal is inserted to DOM
  function _initVisEditor() {
    var container = document.getElementById('comp-viseditor');
    if (!container) return;
    var w = parseFloat(container.getAttribute('data-w')) || 80;
    var h = parseFloat(container.getAttribute('data-h')) || 60;
    var scale = parseFloat(container.getAttribute('data-scale')) || 2;
    var ox = parseFloat(container.getAttribute('data-ox')) || 0;
    var oy = parseFloat(container.getAttribute('data-oy')) || 0;
    var imgW = parseFloat(container.getAttribute('data-imgw')) || w*scale;
    var imgH = parseFloat(container.getAttribute('data-imgh')) || h*scale;

    // Load connection points from hidden input
    var dataEl = document.getElementById('comp-vis-conn-data');
    var connPts = { top:{enabled:false,offsetX:0.5}, bottom:{enabled:false,offsetX:0.5}, left:{enabled:false,offsetY:0.5}, right:{enabled:false,offsetY:0.5}, custom:[] };
    if (dataEl && dataEl.value) {
      try { var parsed = JSON.parse(dataEl.value); if (parsed) connPts = parsed; } catch(e) {}
    }

    // Build visual points array
    var points = [];
    function addSidePt(side, cp) {
      if (!cp || !cp.enabled) return;
      var offset = (side==='top'||side==='bottom') ? (cp.offsetX||0.5) : (cp.offsetY||0.5);
      var x, y;
      if (side==='top')    { x = offset; y = 0; }
      if (side==='bottom')  { x = offset; y = 1; }
      if (side==='left')   { x = 0; y = offset; }
      if (side==='right')  { x = 1; y = offset; }
      points.push({ id: side+'-0', side: side, offset: offset, x: x, y: y, enabled: true });
    }
    addSidePt('top', connPts.top);
    addSidePt('bottom', connPts.bottom);
    addSidePt('left', connPts.left);
    addSidePt('right', connPts.right);

    // Custom points
    (connPts.custom||[]).forEach(function(cp, i) {
      var cx = cp.x != null ? cp.x : 0.5;
      var cy = cp.y != null ? cp.y : 0.5;
      var side = cp.side || _snapToSide(cx, cy, w, h) || 'center';
      // Clamp to edge if on a side
      if (side==='top') cy = 0;
      else if (side==='bottom') cy = 1;
      else if (side==='left') cx = 0;
      else if (side==='right') cx = 1;
      var off = (side==='top'||side==='bottom') ? cx : cy;
      points.push({ id: 'custom-'+i, side: side, offset: off, x: cx, y: cy, enabled: true });
    });

    _visState = { container: container, w: w, h: h, points: points,
                  ox: ox, oy: oy, scale: scale, imgW: imgW, imgH: imgH,
                  nextId: points.length, dragging: null, dragStartX: 0, dragStartY: 0, dragOrigX: 0, dragOrigY: 0 };

    _renderVisPoints();

    // Global mouse handlers for drag
    document.addEventListener('mousemove', _visMouseMove);
    document.addEventListener('mouseup', _visMouseUp);
    container.addEventListener('touchmove', _visTouchMove, {passive: false});
    container.addEventListener('touchend', _visTouchUp);
  }

  function _renderVisPoints() {
    if (!_visState) return;
    var overlay = document.getElementById('comp-viseditor-overlay');
    if (!overlay) return;
    overlay.innerHTML = '';

    _visState.points.forEach(function(pt, idx) {
      // Convert normalized coords to canvas pixel positions
      var px = _visState.ox + pt.x * _visState.imgW;
      var py = _visState.oy + pt.y * _visState.imgH;
      var color = SIDE_COLORS[pt.side] || '#888';

      var dot = document.createElement('div');
      dot.className = 'complib-vis-dot';
      dot.setAttribute('data-idx', idx);
      dot.style.cssText = 'position:absolute;left:'+(px-7)+'px;top:'+(py-7)+'px;'+
        'width:14px;height:14px;border-radius:50%;'+
        'background:'+color+';border:2px solid rgba(255,255,255,0.7);'+
        'box-shadow:0 0 6px '+color+';pointer-events:auto;cursor:grab;'+
        'z-index:10;transition:box-shadow .15s';
      dot.title = SIDE_LABELS[pt.side]+'方连接点 · ' +
        (pt.side==='top'||pt.side==='bottom' ? 'X偏移: '+(pt.offset*100).toFixed(0)+'%' : 'Y偏移: '+(pt.offset*100).toFixed(0)+'%');
      dot.addEventListener('mousedown', function(e) { _visDragStart(idx, e.clientX, e.clientY); e.preventDefault(); e.stopPropagation(); });
      // Right-click to delete (keep as fallback)
      dot.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        _visDeletePoint(idx);
      });
      // Visible delete button
      var delBtn = document.createElement('span');
      delBtn.className = 'complib-vis-del-btn';
      delBtn.innerHTML = '×';
      delBtn.title = '删除此连接点';
      delBtn.addEventListener('mousedown', function(e) {
        e.preventDefault(); e.stopPropagation();
        _visDeletePoint(idx);
      });
      dot.appendChild(delBtn);
      dot.addEventListener('touchstart', function(e) {
        var t = e.touches[0];
        _visDragStart(idx, t.clientX, t.clientY);
        e.preventDefault();
      }, {passive: false});

      overlay.appendChild(dot);
    });
  }

  function _visDragStart(idx, clientX, clientY) {
    if (!_visState) return;
    var pt = _visState.points[idx];
    if (!pt) return;
    _visState.dragging = idx;
    _visState.dragStartX = clientX;
    _visState.dragStartY = clientY;
    _visState.dragOrigX = pt.x;
    _visState.dragOrigY = pt.y;
    // Update cursor on dot
    var dots = document.querySelectorAll('.complib-vis-dot');
    dots.forEach(function(d) { d.style.cursor = 'grabbing'; });
  }

  function _visMouseMove(e) {
    if (!_visState || _visState.dragging === null) return;
    _visDragMove(e.clientX, e.clientY);
  }

  function _visTouchMove(e) {
    if (!_visState || _visState.dragging === null) return;
    var t = e.touches[0];
    _visDragMove(t.clientX, t.clientY);
    e.preventDefault();
  }

  function _visDragMove(clientX, clientY) {
    if (!_visState || _visState.dragging === null) return;
    var idx = _visState.dragging;
    var pt = _visState.points[idx];
    if (!pt) return;

    // Convert pixel delta to normalized delta
    var dx = (clientX - _visState.dragStartX) / _visState.imgW;
    var dy = (clientY - _visState.dragStartY) / _visState.imgH;
    var newX = _visState.dragOrigX + dx;
    var newY = _visState.dragOrigY + dy;

    // Clamp to 0-1
    newX = Math.max(0, Math.min(1, newX));
    newY = Math.max(0, Math.min(1, newY));

    // Snap to nearest edge
    var snapped = _snapToSide(newX, newY, _visState.w, _visState.h);
    if (snapped) {
      if (snapped === 'top')     { newY = 0; }
      else if (snapped === 'bottom') { newY = 1; }
      else if (snapped === 'left')   { newX = 0; }
      else if (snapped === 'right')  { newX = 1; }
    }

    pt.x = newX;
    pt.y = newY;
    pt.side = snapped || _snapToSide(newX, newY, _visState.w, _visState.h) || 'center';
    pt.offset = (pt.side==='top'||pt.side==='bottom') ? pt.x : pt.y;

    _renderVisPoints();
  }

  function _visMouseUp(e) {
    if (!_visState || _visState.dragging === null) return;
    _visDragEnd();
  }

  function _visTouchUp(e) {
    if (!_visState || _visState.dragging === null) return;
    _visDragEnd();
  }

  function _visDragEnd() {
    if (!_visState) return;
    _visState.dragging = null;
    // Update cursor back
    var dots = document.querySelectorAll('.complib-vis-dot');
    dots.forEach(function(d) { d.style.cursor = 'grab'; });
    // Auto-distribute after drag
    _visAutoDistributeAll();
  }

  // Snap to nearest side based on proximity
  function _snapToSide(nx, ny, w, h) {
    var th = SNAP_THRESHOLD;
    // Distance to each edge
    var dTop = ny;           // distance to top (y=0)
    var dBottom = 1 - ny;    // distance to bottom (y=1)
    var dLeft = nx;          // distance to left (x=0)
    var dRight = 1 - nx;     // distance to right (x=1)
    var minD = Math.min(dTop, dBottom, dLeft, dRight);
    if (minD > SNAP_THRESHOLD) return null;
    if (minD === dTop) return 'top';
    if (minD === dBottom) return 'bottom';
    if (minD === dLeft) return 'left';
    return 'right';
  }

  // Get all points on a given side
  function _visPointsOnSide(side) {
    if (!_visState) return [];
    return _visState.points.filter(function(p) { return p.side === side; });
  }

  // Auto-distribute points evenly on each side
  function _visAutoDistributeAll() {
    if (!_visState) return;
    ['top','bottom','left','right'].forEach(function(side) {
      var pts = _visState.points.filter(function(p) { return p.side === side; });
      if (pts.length < 2) return;
      // Sort by position along the edge
      if (side==='top' || side==='bottom') {
        pts.sort(function(a,b) { return a.x - b.x; });
      } else {
        pts.sort(function(a,b) { return a.y - b.y; });
      }
      // Evenly distribute from 0.15 to 0.85 (or full 0-1 if many points)
      var margin = pts.length > 4 ? 0.05 : (pts.length > 2 ? 0.12 : 0.2);
      for (var i = 0; i < pts.length; i++) {
        var frac = pts.length === 1 ? 0.5 : (margin + (1 - 2*margin) * i / (pts.length - 1));
        if (side==='top')     { pts[i].x = frac; pts[i].y = 0; pts[i].offset = frac; }
        if (side==='bottom')  { pts[i].x = frac; pts[i].y = 1; pts[i].offset = frac; }
        if (side==='left')    { pts[i].x = 0; pts[i].y = frac; pts[i].offset = frac; }
        if (side==='right')   { pts[i].x = 1; pts[i].y = frac; pts[i].offset = frac; }
      }
    });
    _renderVisPoints();
    _serializeVisToForm();
  }

  /* ── Public vis editor actions (called from toolbar buttons) ── */
  function visAddPoint(side) {
    if (!_visState) return;
    var cnt = _visPointsOnSide(side).length + 1;
    var offset = 0.5;
    var x, y;
    if (side==='top')     { x = offset; y = 0; }
    else if (side==='bottom') { x = offset; y = 1; }
    else if (side==='left')   { x = 0; y = offset; }
    else if (side==='right')  { x = 1; y = offset; }
    else { x = 0.5; y = 0.5; }
    _visState.points.push({ id: 'custom-'+(_visState.nextId++), side: side, offset: offset, x: x, y: y, enabled: true });
    // Auto-distribute after adding
    _visAutoDistributeAll();
  }

  function visAutoDistribute() {
    _visAutoDistributeAll();
  }

  function visClearAll() {
    if (!_visState) return;
    _visState.points = [];
    _renderVisPoints();
    _serializeVisToForm();
  }

  // Delete a single connection point (right-click)
  function _visDeletePoint(idx) {
    if (!_visState || idx < 0 || idx >= _visState.points.length) return;
    _visState.points.splice(idx, 1);
    _renderVisPoints();
    _visAutoDistributeAll();
  }

  // Serialize visual state back to connectionPoints format and store in hidden input
  function _serializeVisToForm() {
    if (!_visState) return;
    var cp = { top:{enabled:false,offsetX:0.5}, bottom:{enabled:false,offsetX:0.5},
               left:{enabled:false,offsetY:0.5}, right:{enabled:false,offsetY:0.5}, custom:[] };

    var sideSlots = { top: false, bottom: false, left: false, right: false };
    _visState.points.forEach(function(pt) {
      if (['top','bottom','left','right'].indexOf(pt.side) >= 0) {
        if (!sideSlots[pt.side]) {
          sideSlots[pt.side] = true;
          cp[pt.side].enabled = true;
          if (pt.side==='top'||pt.side==='bottom') cp[pt.side].offsetX = pt.offset;
          else cp[pt.side].offsetY = pt.offset;
        } else {
          cp.custom.push({ x: pt.x, y: pt.y, side: pt.side });
        }
      } else {
        cp.custom.push({ x: pt.x, y: pt.y, side: pt.side });
      }
    });

    var dataEl = document.getElementById('comp-vis-conn-data');
    if (dataEl) dataEl.value = JSON.stringify(cp);
  }

  // Get current connection points from visual state
  function _getVisConnectionPoints() {
    if (!_visState) return null;
    _serializeVisToForm();
    var dataEl = document.getElementById('comp-vis-conn-data');
    if (dataEl && dataEl.value) {
      try { return JSON.parse(dataEl.value); } catch(e) {}
    }
    return { top:{enabled:false,offsetX:0.5}, bottom:{enabled:false,offsetX:0.5}, left:{enabled:false,offsetY:0.5}, right:{enabled:false,offsetY:0.5}, custom:[] };
  }

  // Refresh visual editor when size inputs change
  function refreshVisEditorSize() {
    var w = parseInt(document.getElementById('comp-width')?.value) || 80;
    var h = parseInt(document.getElementById('comp-height')?.value) || 60;
    if (_visState) {
      _visState.w = w; _visState.h = h;
      var CANVAS_W = 300, CANVAS_H = 220;
      var scale = Math.min(CANVAS_W / w, CANVAS_H / h) * 0.92;
      var imgW = w * scale, imgH = h * scale;
      _visState.ox = (CANVAS_W - imgW) / 2;
      _visState.oy = (CANVAS_H - imgH) / 2;
      _visState.scale = scale;
      _visState.imgW = imgW; _visState.imgH = imgH;
      // Update container attributes
      var cont = document.getElementById('comp-viseditor');
      if (cont) {
        cont.setAttribute('data-w', w); cont.setAttribute('data-h', h);
        cont.setAttribute('data-scale', scale);
        cont.setAttribute('data-ox', _visState.ox); cont.setAttribute('data-oy', _visState.oy);
        cont.setAttribute('data-imgw', imgW); cont.setAttribute('data-imgh', imgH);
      }
      // Update background SVG position
      var bg = cont && cont.querySelector('.complib-viseditor-bg');
      if (bg) {
        bg.style.left = _visState.ox+'px'; bg.style.top = _visState.oy+'px';
        bg.style.width = imgW+'px'; bg.style.height = imgH+'px';
      }
      // Update grid
      var grid = cont && cont.querySelector('.complib-viseditor-grid');
      if (grid) {
        grid.setAttribute('viewBox', '0 0 '+CANVAS_W+' '+CANVAS_H);
      }
      _renderVisPoints();
    }
  }

  // Cleanup after modal close
  function _visCleanup() {
    document.removeEventListener('mousemove', _visMouseMove);
    document.removeEventListener('mouseup', _visMouseUp);
    _visState = null;
  }

  /* 保存元件 */
  function saveComponent() {
    const id = document.getElementById('comp-edit-id').value || ('comp_' + Date.now() + '_' + Math.random().toString(36).slice(2,8));
    const name = document.getElementById('comp-name').value.trim();
    if (!name) { alert('请输入元件名称'); return; }
    const catParent = document.getElementById('comp-cat-parent').value;
    const catChild  = document.getElementById('comp-cat-child').value;
    const desc      = document.getElementById('comp-desc').value.trim();
    const tags      = document.getElementById('comp-tags').value.split(',').map(function(s){return s.trim()}).filter(Boolean);
    const width     = parseInt(document.getElementById('comp-width').value) || 80;
    const height    = parseInt(document.getElementById('comp-height').value) || 60;
    const allowRotate = document.getElementById('comp-rotate').checked;
    const allowScale  = document.getElementById('comp-scale').checked;
    const enabled     = document.getElementById('comp-enabled').checked;
    const defaultRotation = parseInt(document.getElementById('comp-default-rotation')?.value) || 0;
    const defaultPosX = parseInt(document.getElementById('comp-pos-x')?.value) || 0;
    const defaultPosY = parseInt(document.getElementById('comp-pos-y')?.value) || 0;
    const svg = document.getElementById('comp-svg').value;

    // 读取连接点（从可视化编辑器 / 隐藏字段）
    var connPts = _getVisConnectionPoints() ||
      { top:{enabled:false,offsetX:0.5}, bottom:{enabled:false,offsetX:0.5}, left:{enabled:false,offsetY:0.5}, right:{enabled:false,offsetY:0.5}, custom:[] };

    const now = new Date().toISOString();
    const existingIdx = components.findIndex(function(c){ return c.id === id; });
    const rec = { id, name, categoryParent:catParent, categoryChild:catChild, svg, description:desc, defaultWidth:width, defaultHeight:height,
                  connectionPoints:connPts, allowRotate, allowScale, tags, enabled,
                  defaultRotation: defaultRotation, defaultPosX: defaultPosX, defaultPosY: defaultPosY,
                  createdAt: existingIdx>=0 ? components[existingIdx].createdAt : now,
                  updatedAt: now };
    if (existingIdx >= 0) { components[existingIdx] = rec; }
    else { components.push(rec); }
    saveComponents();
    closeCompModal();
    refreshComponentList();
  }

  function closeCompModal() {
    _visCleanup();
    const el = document.getElementById('amodal-comp');
    if (el) el.remove();
  }

  /* 删除/启用/复制 */
  function deleteComponent(id) {
    var c = components.find(function(x){ return x.id === id; });
    if (!c) return;
    if (!confirm('确定将「'+c.name+'」移入回收箱？\n\n可在回收箱中恢复。清空回收箱后将彻底删除。')) return;
    // 移入回收箱
    trash.push(JSON.parse(JSON.stringify(c)));
    saveTrash();
    components = components.filter(function(c){ return c.id !== id; });
    saveComponents();
    refreshComponentList();
  }
  /* 从回收箱恢复 */
  function restoreFromTrash(id) {
    var idx = trash.findIndex(function(t){ return t.id === id; });
    if (idx < 0) return;
    var item = trash.splice(idx, 1)[0];
    components.push(item);
    saveTrash();
    saveComponents();
    refreshComponentList();
  }
  /* 从回收箱彻底删除 */
  function permanentlyDelete(id) {
    if (!confirm('确定彻底删除？此操作不可恢复！')) return;
    trash = trash.filter(function(t){ return t.id !== id; });
    saveTrash();
    refreshComponentList();
  }
  /* 清空回收箱 */
  function emptyTrash() {
    if (trash.length === 0) return;
    if (!confirm('确定清空回收箱？共 '+trash.length+' 个元件将被彻底删除且不可恢复！')) return;
    trash = [];
    saveTrash();
    refreshComponentList();
  }
  function toggleComponent(id) {
    const c = components.find(function(c){ return c.id === id; });
    if (!c) return;
    c.enabled = !c.enabled;
    c.updatedAt = new Date().toISOString();
    saveComponents();
    refreshComponentList();
  }
  function duplicateComponent(id) {
    const src = components.find(function(c){ return c.id === id; });
    if (!src) return;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = 'comp_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
    copy.name = src.name + '（副本）';
    copy.createdAt = copy.updatedAt = new Date().toISOString();
    components.push(copy);
    saveComponents();
    refreshComponentList();
  }

  /* ── SVG 操作 ── */
  function uploadSvg() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.svg';
    input.onchange = function() {
      const file = input.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = function(e) {
        const svgText = e.target.result;
        const svgArea = document.getElementById('comp-svg');
        const preview = document.getElementById('comp-svg-preview');
        if (svgArea) svgArea.value = svgText;
        const w = parseInt(document.getElementById('comp-width')?.value) || 80;
        const h = parseInt(document.getElementById('comp-height')?.value) || 60;
        if (preview) preview.innerHTML = '<svg viewBox="0 0 '+w+' '+h+'" width="120" height="90">' + svgText + '</svg>';
      };
      reader.readAsText(file);
    };
    input.click();
  }
  function previewSvgFull() {
    const svg = document.getElementById('comp-svg')?.value;
    if (!svg) { alert('请先输入或上传SVG内容'); return; }
    const w = parseInt(document.getElementById('comp-width')?.value) || 80;
    const h = parseInt(document.getElementById('comp-height')?.value) || 60;
    removeExistingModal('amodal-svg-preview');
    document.body.insertAdjacentHTML('beforeend', `
    <div class="amodal" id="amodal-svg-preview" style="display:flex">
      <div class="amodal-box" style="width:min(600px,96vw)">
        <div class="amodal-title">SVG 预览</div>
        <div style="background:#0a1628;border-radius:12px;padding:20px;text-align:center;overflow:auto;max-height:60vh">
          <svg viewBox="0 0 ${w} ${h}" width="${Math.min(w*2,500)}" height="${Math.min(h*2,400)}">${svg}</svg>
        </div>
        <div class="amodal-btns" style="margin-top:12px"><button class="btn-sm btn-gray" onclick="document.getElementById(\'amodal-svg-preview\').remove()">关闭</button></div>
      </div>
    </div>`);
  }
  function clearSvg() {
    const svgArea = document.getElementById('comp-svg');
    const preview = document.getElementById('comp-svg-preview');
    if (svgArea) svgArea.value = '';
    if (preview) preview.innerHTML = '<span style="color:rgba(255,255,255,.3)">无预览</span>';
  }

  /* ── 导入/导出 ── */
  function exportComponents() {
    const data = JSON.stringify(components, null, 2);
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'component-library-' + new Date().toISOString().slice(0,10) + '.json';
    a.click(); URL.revokeObjectURL(url);
  }
  function importComponents(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) throw new Error('格式错误：需要数组');
        if (!confirm('将导入 ' + data.length + ' 个元件，是否覆盖现有数据？\n（取消则追加）')) {
          // 追加模式
          data.forEach(function(d) {
            if (!components.find(function(c){return c.id===d.id})) components.push(d);
          });
        } else {
          components = data;
        }
        saveComponents();
        refreshComponentList();
      } catch(err) { alert('导入失败：' + err.message); }
    };
    reader.readAsText(file);
    input.value = '';
  }

  /* ==========================================================
     子标签2：模板管理
     ========================================================== */

  function renderTemplateList() {
    let html = `
      <div class="complib-toolbar">
        <select class="complib-filter" onchange="COMPONENT_LIB_ADMIN.onFilterTplCat(this.value)">
          <option value="">全部分类</option>
          ${COMP_LIB_TEMPLATE_CATS.map(function(tc){ return '<option value="'+tc+'"'+(filterCat===tc?' selected':'')+'>'+tc+'</option>'; }).join('')}
        </select>
        <button class="btn-sm btn-green" onclick="COMPONENT_LIB_ADMIN.showAddTemplate()">＋ 新增模板</button>
        <button class="btn-sm btn-blue" onclick="COMPONENT_LIB_ADMIN.exportTemplates()">📤 导出模板</button>
        <label class="btn-sm btn-gray" style="cursor:pointer">
          📥 导入模板
          <input type="file" accept=".json" style="display:none" onchange="COMPONENT_LIB_ADMIN.importTemplates(this)">
        </label>
      </div>
      <div class="complib-comp-grid">
        ${templates.length === 0 ? '<div class="complib-empty">暂无模板，点击「＋ 新增模板」开始添加</div>' : templates.map(renderTemplateCard).join('')}
      </div>`;
    return html;
  }

  function renderTemplateCard(t) {
    return `
    <div class="complib-card" data-id="${t.id}">
      <div class="complib-card-body">
        <div class="complib-card-name">📐 ${escHtml(t.name)}</div>
        <div class="complib-card-meta">${escHtml(t.category||'')}</div>
        <div class="complib-card-desc">${escHtml((t.description||'').slice(0,60))}</div>
        <div class="complib-card-meta">节点：${(t.nodes||[]).length} | 连线：${(t.edges||[]).length}</div>
        <div class="complib-card-actions">
          <button class="btn-sm btn-blue" onclick="COMPONENT_LIB_ADMIN.showEditTemplate('${t.id}')">编辑</button>
          <button class="btn-sm btn-red" onclick="COMPONENT_LIB_ADMIN.deleteTemplate('${t.id}')">删除</button>
        </div>
      </div>
    </div>`;
  }

  function showAddTemplate() {
    editingTplId = null;
    openTemplateModal({}, '新增模板');
  }
  function showEditTemplate(id) {
    const t = templates.find(function(x){return x.id===id});
    if (!t) return;
    editingTplId = id;
    openTemplateModal(t, '编辑模板 — ' + t.name);
  }
  function openTemplateModal(t, title) {
    const modalHtml = `
    <div class="amodal" id="amodal-tpl" style="display:flex">
      <div class="amodal-box has-sticky-header" style="width:min(700px,96vw);max-height:90vh;overflow-y:auto">
        <div class="amodal-sticky-top">
          <div class="amodal-title">${escHtml(title)}</div>
          <div class="sticky-btns">
            <button class="btn-sm btn-gray" onclick="COMPONENT_LIB_ADMIN.closeTplModal()">取消</button>
            <button class="btn-sm btn-blue" onclick="COMPONENT_LIB_ADMIN.saveTemplate()">保存</button>
          </div>
        </div>
        <input type="hidden" id="tpl-edit-id" value="${escHtml(editingTplId||'')}" />
        <div class="form-item"><label>模板名称 *</label><input type="text" id="tpl-name" value="${escHtml(t.name||'')}" placeholder="如：低压并网储能" /></div>
        <div class="form-item"><label>分类</label>
          <select id="tpl-category">
            <option value="">请选择</option>
            ${COMP_LIB_TEMPLATE_CATS.map(function(tc){ return '<option value="'+tc+'"'+(t.category===tc?' selected':'')+'>'+tc+'</option>'; }).join('')}
          </select>
        </div>
        <div class="form-item"><label>描述</label><textarea id="tpl-desc" rows="2" placeholder="模板说明…">${escHtml(t.description||'')}</textarea></div>
        <div class="form-item"><label>节点 JSON</label><textarea id="tpl-nodes" rows="4" style="font-family:monospace;font-size:11px" placeholder="[{"id":"n1","compId":"grid","x":100,"y":60}]">${escHtml(JSON.stringify(t.nodes||[],null,2))}</textarea></div>
        <div class="form-item"><label>连线 JSON</label><textarea id="tpl-edges" rows="4" style="font-family:monospace;font-size:11px" placeholder='[{"id":"e1","from":"n1","to":"n2"}]'>${escHtml(JSON.stringify(t.edges||[],null,2))}</textarea></div>
      </div>
    </div>`;
    removeExistingModal('amodal-tpl');
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  function saveTemplate() {
    const id = document.getElementById('tpl-edit-id').value || ('tpl_' + Date.now() + '_' + Math.random().toString(36).slice(2,8));
    const name = document.getElementById('tpl-name').value.trim();
    if (!name) { alert('请输入模板名称'); return; }
    let nodes, edges;
    try { nodes = JSON.parse(document.getElementById('tpl-nodes').value || '[]'); } catch(e) { alert('节点JSON格式错误'); return; }
    try { edges = JSON.parse(document.getElementById('tpl-edges').value || '[]'); } catch(e) { alert('连线JSON格式错误'); return; }
    const cat = document.getElementById('tpl-category').value;
    const desc = document.getElementById('tpl-desc').value.trim();
    const now = new Date().toISOString();
    const existingIdx = templates.findIndex(function(t){return t.id===id});
    const rec = { id, name, category:cat, description:desc, nodes, edges, layout:{}, createdAt:existingIdx>=0?templates[existingIdx].createdAt:now, updatedAt:now };
    if (existingIdx>=0) templates[existingIdx]=rec; else templates.push(rec);
    saveTemplates();
    closeTplModal();
    refreshTemplateList();
  }
  function closeTplModal() { const el=document.getElementById('amodal-tpl'); if(el)el.remove(); }
  function deleteTemplate(id) { if(!confirm('确定删除该模板？')) return; templates=templates.filter(function(t){return t.id!==id}); saveTemplates(); refreshTemplateList(); }
  function refreshTemplateList() { const el=document.getElementById('complib-sub-content'); if(el)el.innerHTML=renderSubContent(); }
  function onFilterTplCat(val) { filterCat=val; refreshTemplateList(); }
  function exportTemplates() { const d=JSON.stringify(templates,null,2); const b=new Blob([d],{type:'application/json'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download='templates-'+new Date().toISOString().slice(0,10)+'.json'; a.click(); URL.revokeObjectURL(u); }
  function importTemplates(input) { const file=input.files[0]; if(!file)return; const r=new FileReader(); r.onload=function(e){ try{ const d=JSON.parse(e.target.result); if(!Array.isArray(d)) throw new Error('格式错误'); if(confirm('覆盖现有模板？')) templates=d; else d.forEach(function(x){ if(!templates.find(function(t){return t.id===x.id})) templates.push(x); }); saveTemplates(); refreshTemplateList(); }catch(err){alert('导入失败:'+err.message);} }; r.readAsText(file); input.value=''; }

  /* ==========================================================
     子标签3：分类管理
     ========================================================== */

  function renderCategoryTree() {
    let html = `
      <div class="complib-toolbar">
        <button class="btn-sm btn-green" onclick="COMPONENT_LIB_ADMIN.showAddCategory()">＋ 新增分类</button>
      </div>
      <div class="complib-cat-tree">`;
    COMP_LIB_CATEGORIES.forEach(function(cat) {
      const subs = COMP_LIB_SUBCATEGORIES[cat.id] || [];
      html += `
        <div class="complib-cat-group">
          <div class="complib-cat-parent">
            <span class="complib-cat-icon">${cat.icon}</span>
            <span class="complib-cat-name">${escHtml(cat.name)}</span>
            <button class="btn-sm btn-gray" onclick="COMPONENT_LIB_ADMIN.editCategory('${cat.id}')" style="margin-left:auto">编辑</button>
          </div>
          <div class="complib-cat-children">
            ${subs.map(function(sc,i){ return '<div class="complib-cat-child"><span>📄 '+escHtml(sc)+'</span><button class="btn-sm btn-red" onclick="COMPONENT_LIB_ADMIN.deleteSubCategory(\''+cat.id+'\',\''+escJs(sc)+'\')">删除</button></div>'; }).join('')}
            <div class="complib-cat-child"><button class="btn-sm btn-gray" onclick="COMPONENT_LIB_ADMIN.addSubCategory('${cat.id}')">＋ 添加子分类</button></div>
          </div>
        </div>`;
    });
    html += `</div>`;
    return html;
  }

  function showAddCategory() {
    removeExistingModal('amodal-cat');
    document.body.insertAdjacentHTML('beforeend', `
    <div class="amodal" id="amodal-cat" style="display:flex">
      <div class="amodal-box">
        <div class="amodal-title">新增一级分类</div>
        <div class="form-item"><label>分类名称</label><input type="text" id="cat-new-name" placeholder="如：新能源" /></div>
        <div class="form-item"><label>图标（Emoji）</label><input type="text" id="cat-new-icon" placeholder="如：☀️" style="width:60px" /></div>
        <div class="amodal-btns">
          <button class="btn-sm btn-gray" onclick="document.getElementById('amodal-cat').remove()">取消</button>
          <button class="btn-sm btn-blue" onclick="COMPONENT_LIB_ADMIN.doAddCategory()">创建</button>
        </div>
      </div>
    </div>`);
  }
  function doAddCategory() {
    const name = document.getElementById('cat-new-name').value.trim();
    const icon = document.getElementById('cat-new-icon').value.trim() || '📁';
    if (!name) { alert('请输入分类名称'); return; }
    const id = 'cat_' + Date.now();
    COMP_LIB_CATEGORIES.push({ id, name, icon });
    COMP_LIB_SUBCATEGORIES[id] = [];
    saveCategories();
    document.getElementById('amodal-cat').remove();
    refreshCategoryTree();
  }
  function editCategory(catId) {
    const cat = COMP_LIB_CATEGORIES.find(function(c){return c.id===catId});
    if (!cat) return;
    removeExistingModal('amodal-cat-edit');
    document.body.insertAdjacentHTML('beforeend', `
    <div class="amodal" id="amodal-cat-edit" style="display:flex">
      <div class="amodal-box">
        <div class="amodal-title">编辑分类 — ${escHtml(cat.name)}</div>
        <div class="form-item"><label>名称</label><input type="text" id="cat-edit-name" value="${escHtml(cat.name)}" /></div>
        <div class="form-item"><label>图标</label><input type="text" id="cat-edit-icon" value="${escHtml(cat.icon)}" style="width:60px" /></div>
        <div class="amodal-btns">
          <button class="btn-sm btn-gray" onclick="document.getElementById('amodal-cat-edit').remove()">取消</button>
          <button class="btn-sm btn-red" onclick="COMPONENT_LIB_ADMIN.doDeleteCategory('${catId}')">删除分类</button>
          <button class="btn-sm btn-blue" onclick="COMPONENT_LIB_ADMIN.doSaveCategory('${catId}')">保存</button>
        </div>
      </div>
    </div>`);
  }
  function doSaveCategory(catId) {
    const cat = COMP_LIB_CATEGORIES.find(function(c){return c.id===catId});
    if (!cat) return;
    cat.name = document.getElementById('cat-edit-name').value.trim();
    cat.icon = document.getElementById('cat-edit-icon').value.trim() || '📁';
    saveCategories();
    document.getElementById('amodal-cat-edit').remove();
    refreshCategoryTree();
  }
  function doDeleteCategory(catId) {
    if (!confirm('确定删除该分类及其所有子分类？')) return;
    COMP_LIB_CATEGORIES = COMP_LIB_CATEGORIES.filter(function(c){return c.id!==catId});
    delete COMP_LIB_SUBCATEGORIES[catId];
    saveCategories();
    document.getElementById('amodal-cat-edit')?.remove();
    refreshCategoryTree();
  }
  function addSubCategory(catId) {
    const name = prompt('请输入子分类名称：');
    if (!name) return;
    if (!COMP_LIB_SUBCATEGORIES[catId]) COMP_LIB_SUBCATEGORIES[catId] = [];
    COMP_LIB_SUBCATEGORIES[catId].push(name.trim());
    saveCategories();
    refreshCategoryTree();
  }
  function deleteSubCategory(catId, scName) {
    if (!confirm('确定删除子分类「'+scName+'」？')) return;
    COMP_LIB_SUBCATEGORIES[catId] = (COMP_LIB_SUBCATEGORIES[catId]||[]).filter(function(s){return s!==scName});
    saveCategories();
    refreshCategoryTree();
  }
  function refreshCategoryTree() { const el=document.getElementById('complib-sub-content'); if(el)el.innerHTML=renderSubContent(); }

  /* ==========================================================
     Helpers
     ========================================================== */

  function getCatIdByName(name) {
    const cat = COMP_LIB_CATEGORIES.find(function(c){ return c.name === name; });
    return cat ? cat.id : null;
  }

  function escHtml(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function escJs(s) {
    return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  }
  function removeExistingModal(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  /* ==========================================================
     Public API
     ========================================================== */
  return {
    init,
    renderCompLibPane,
    switchSubTab,
    // components
    onSearch, onFilterCat, onFilterSubCat, onCatParentChange,
    showAddComponent, showEditComponent, saveComponent, closeCompModal,
    deleteComponent, toggleComponent, duplicateComponent,
    uploadSvg, previewSvgFull, clearSvg,
    exportComponents, importComponents,
    // visual connection point editor
    visAddPoint, visAutoDistribute, visClearAll, refreshVisEditorSize,
    // templates
    showAddTemplate, showEditTemplate, saveTemplate, closeTplModal, deleteTemplate,
    onFilterTplCat, exportTemplates, importTemplates,
    // categories
    showAddCategory, doAddCategory, editCategory, doSaveCategory, doDeleteCategory,
    addSubCategory, deleteSubCategory,
    // data
    saveCategories
  };

})();
