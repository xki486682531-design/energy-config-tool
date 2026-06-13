// ============================================================
// ui.js — 界面渲染与交互逻辑
// ============================================================
//
// 职责：
//   1. 渲染需求表（步骤0 / renderRequirements）
//   2. 渲染步骤一（项目基本信息 / renderStep1）
//   3. 渲染配置分支（单台 / renderSingleBranch，多台 / renderMultiBranch）
//   4. 需求表联动逻辑（onReqChange：防逆流→二次电表、抄表→一次电表、汇流柜）
//   5. 表单数据收集（collectReqData）
//
// 核心数据流：
//   用户填写需求表 → 确认项目信息（handleStep1）
//   → AppState { name, cap, count } → 渲染对应分支
//   → 用户选择各设备配置 → FORM.collectAndExport()
// ============================================================

const UI = (() => {

  // ═══════════════════════════════════════════════════════════
  // 热门产品统计模块（基于 localStorage 记录历史选择次数）
  // ═══════════════════════════════════════════════════════════
  const HOT = {
    STORAGE_KEY: 'ess_product_selections',

    getCounts() {
      try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {}; }
      catch (e) { return {}; }
    },

    record(code) {
      if (!code) return;
      const counts = this.getCounts();
      counts[code] = (counts[code] || 0) + 1;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(counts));
    },

    // 返回按热度排序后的列表，附带火苗标记（三级：🔥热门 ⭐温门 💧冷门）
    sortWithFlame(list) {
      const counts = this.getCounts();
      const codeCounts = list.map(i => counts[i.code] || 0);
      const maxCount = Math.max(...codeCounts, 0);

      // 包装原始索引，按选择次数降序排列
      const indexed = list.map((item, originalIdx) => {
        const count = counts[item.code] || 0;
        let flame = '';
        if (count > 0 && maxCount > 0) {
          const ratio = count / maxCount;
          if (ratio >= 0.5) flame = '🔥 ';
          else if (ratio >= 0.15) flame = '⭐ ';
          else flame = '💧 ';
        }
        return { item, originalIdx, count, flame };
      });

      indexed.sort((a, b) => {
        if (a.count !== b.count) return b.count - a.count;
        return a.item.code.localeCompare(b.item.code);
      });

      return indexed;
    }
  };

  // ── 工具：生成下拉选项 HTML ──────────────────────────────
  function buildOptions(list, placeholder = "请选择") {
    const sorted = HOT.sortWithFlame(list);
    let html = `<option value="">— ${placeholder} —</option>`;
    sorted.forEach(({ item, originalIdx, flame }) => {
      html += `<option value="${originalIdx}">${flame}${item.code}｜${item.desc}</option>`;
    });
    return html;
  }

  function buildSelectOptions(arr) {
    return arr.map((v, i) => `<option value="${v}"${i === 0 ? " selected" : ""}>${v}</option>`).join("");
  }

  // ── 需求表 → 配置区块可见性映射（从 reqFieldRegistry 动态构建）───
  // 凡是 reqFieldRegistry 中有 linkedBlockId + hiddenOn 的字段，都是联动区块
  function buildBlockVisibility() {
    const reg = DATA.reqFieldRegistry || [];
    const cats = DATA.categoryRegistry || [];
    return reg
      .filter(f => f.linkedBlockId && f.hiddenOn)
      .map(f => {
        const cat = cats.find(c => c.key === f.linkedCategory);
        return {
          reqId: f.id,
          blockId: f.linkedBlockId,
          label: cat ? cat.name : f.label,
          reqLabel: f.label,
          defaultVal: f.defaultValue,
          hiddenOn: f.hiddenOn,
        };
      });
  }

  // ── 判断某个字段是否触发"隐藏"条件 ──────────────────
  function isBlockHidden(rule) {
    const el = document.getElementById(rule.reqId);
    if (!el) return false;
    const val = el.value.trim();
    return rule.hiddenOn.startsWith('!') ? val !== rule.hiddenOn.slice(1) : val === rule.hiddenOn;
  }

  // ── 获取所有需要隐藏的区块列表（用于确认弹窗）──────
  // 仅当用户主动偏离默认值时才弹窗确认，默认状态不弹
  function getHiddenBlocks() {
    return buildBlockVisibility().filter(rule => {
      if (!isBlockHidden(rule)) return false;
      const el = document.getElementById(rule.reqId);
      if (!el) return false;
      // 当前值 == 默认值 → 用户未主动更改，不弹确认
      return el.value.trim() !== rule.defaultVal;
    }).map(rule => ({
      ...rule,
      currentVal: document.getElementById(rule.reqId)?.value || '',
    }));
  }

  // ── 渲染配置区（handleStep1 和 proceedConfigConfirm 共用）
  function renderConfigBranch() {
    const container = document.getElementById("branch-container");
    if (window.AppState.count === 1) {
      container.innerHTML = renderSingleBranch();
      applyBlockVisibility('single');
    } else {
      container.innerHTML = renderMultiBranch();
      document.querySelectorAll(".qty-input:not(.qty-auto)").forEach(onlyPositiveInt);
      applyBlockVisibility('multi');
      // 展开后执行联动（预选 + 显示 hint）
      applyReqLinkage();
    }
    container.scrollIntoView({ behavior: "smooth" });
  }

  // ── 工具：根据容量过滤储能柜产品 ──────────────────────
  function getStorageCabinetOptions() {
    const cap = String(window.AppState?.cap || "").trim();
    if (!cap) return [];
    const capPattern = new RegExp(`(^|[^0-9])${cap}\\s*kwh([^0-9]|$)`, "i");
    return DATA.storageCabinets.filter(item => capPattern.test(item.desc));
  }

  // ── 工具：同步选中项的编码和描述显示 ───────────────────
  function syncDisplay(selectEl, codeEl, descEl, dataList) {
    const idx = selectEl.value;
    if (idx === "") { codeEl.textContent = "—"; descEl.textContent = "—"; return; }
    const item = dataList[parseInt(idx)];
    codeEl.textContent = item.code;
    descEl.textContent = item.desc;
    HOT.record(item.code);
  }

  // ── 工具：只允许输入正整数 ──────────────────────────────
  // ── 工具：正整数输入（去除非数字字符，0→1）───────────
  function onlyPositiveInt(input) {
    input.addEventListener("input", () => {
      cleanPositiveInt(input);
    });
  }

  function cleanPositiveInt(input) {
    input.value = input.value.replace(/[^0-9]/g, "");
    if (input.value === "0") input.value = "1";
  }

  // ── 工具：非负整数输入（去除非数字字符）─────────────────
  function cleanNonNegativeInt(input) {
    input.value = input.value.replace(/[^0-9]/g, "");
  }

  // ── 渲染：需求表（步骤0）—— 从 reqFieldRegistry 动态生成 ──
  function renderRequirements() {
    const reg = DATA.reqFieldRegistry || [];
    const sections = [
      { key: "A", title: "A. 项目基本信息" },
      { key: "B", title: "B. 并网与电气需求" },
      { key: "C", title: "C. 网络与监控" },
      { key: "D", title: "D. 外观与其他" },
    ];
    // 特定字段需要额外的 oninput 行为
    const specialInputs = {
      "r-projectName":      'oninput="UI.refreshStep1Summary()"',
      "r-capacity":         'onchange="UI.refreshStep1Summary()"',
      "r-cabinetDemandQty": 'oninput="UI.cleanPositiveInt(this); UI.refreshStep1Summary()"',
    };

    let html = `
    <div class="card" id="req-card">
      <h2 class="step-title"><span id="req-title-name" class="req-title-name"></span> 项目非标需求表</h2>
      <p class="req-tip">填写后，防逆流、抄表、汇流柜、STS柜等选项将自动联动下方配置。其余字段记录到 Excel。</p>`;

    for (const sec of sections) {
      const secFields = reg.filter(f => f.section === sec.key && f.showInReq !== false);
      if (!secFields.length) continue;

      const secId = sec.key === "C" ? ' id="req-section-C"' : '';
      html += `
      <div class="req-section"${secId}>
        <div class="req-section-title">${sec.title}</div>
        <div class="req-grid">`;

      for (const f of secFields) {
        const isLinked = f.linkedBlockId && f.hiddenOn;
        const onChangeParts = [];
        if (isLinked) onChangeParts.push('UI.onReqChange()');
        if (f.type === 'select' && specialInputs[f.id]) onChangeParts.push('UI.refreshStep1Summary()');
        const onChange = onChangeParts.length ? ` onchange=\"${onChangeParts.join(';')}\"` : '';
        const extraInput = f.type !== 'select' ? (specialInputs[f.id] || '') : '';

        if (f.type === "select") {
          const defVal = f.defaultValue || "";
          const optsHtml = f.options ? f.options.map(v => `<option value="${v}"${v === defVal ? " selected" : ""}>${v}</option>`).join("") : "";
          html += `
          <div class="form-item">
            <label>${f.label}</label>
            <select id="${f.id}"${onChange}>${optsHtml}</select>
          </div>`;
        } else if (f.type === "textarea") {
          html += `
          <div class="form-item" style="grid-column: span 2">
            <label>${f.label}</label>
            <textarea id="${f.id}" placeholder="请描述其他非标需求..." rows="3"></textarea>
          </div>`;
        } else {
          // text input
          const val = f.defaultValue ? ` value="${f.defaultValue}"` : "";
          html += `
          <div class="form-item">
            <label>${f.label}</label>
            <input type="text" id="${f.id}" placeholder="请输入"${val} ${extraInput} />
          </div>`;
        }

        // ── 拓扑7 → 显示变压器数量 ──
        if (f.id === "r-scene") {
          html += `
          <div class="form-item" id="transformer-count-item" style="display:none">
            <label>变压器数量</label>
            <select id="r-transformerCount" onchange="UI.onTransformerCountChange()">
              ${[1,2,3,4,5,6,7].map(v => `<option value="${v}">${v}</option>`).join("")}
            </select>
          </div>`;
        }

        // ── 离网功能=需要 → 显示STS柜选择 ──
        if (f.id === "r-offGrid") {
          html += `
          <div class="form-item" id="offgrid-sts-item" style="display:none">
            <label>STS柜产品编码 <span class="required">*</span></label>
            <select id="r-stsCabinetCode" onchange="UI.onReqChange()">
              ${buildOptions(DATA.stsCabinets, "选择STS柜产品编码")}
            </select>
          </div>
          <div class="form-item" id="offgrid-sts-qty-item" style="display:none">
            <label>STS柜数量</label>
            <input type="text" id="r-stsCabinetQty" value="1" inputmode="numeric" oninput="UI.cleanPositiveInt(this)" />
          </div>`;
        }
      }

      html += `\n        </div>\n      </div>`;
    }

    html += `
      <div class="req-hint" id="req-link-hint" style="display:none">
        <span id="req-link-text"></span>
      </div>
    </div>`;
    return html;
  }

  // ── 渲染：步骤一（项目基本信息）─────────────────────────
  function renderStep1() {
    return `
    <div class="card" id="step1">
      <h2 class="step-title"><span class="step-num">1</span>项目基本信息</h2>
      <div class="form-grid">
        <div class="form-item">
          <label>项目名称</label>
          <div class="code-desc-row"><span class="cd-value" id="s-projectName">请在需求表填写</span></div>
        </div>
        <div class="form-item">
          <label>单台电池柜容量(kWh)</label>
          <div class="code-desc-row"><span class="cd-value" id="s-capacity">请在需求表填写</span></div>
        </div>
        <div class="form-item">
          <label>电池柜需求数量</label>
          <div class="code-desc-row"><span class="cd-value" id="s-cabinetDemandQty">请在需求表填写</span></div>
        </div>
      </div>
      <div id="step1-req-summary" class="req-summary-grid" style="margin-top:10px;"></div>
      <div class="btn-row">
        <button class="btn-primary" onclick="UI.handleStep1()">确认项目信息，进入配置 →</button>
      </div>
      <div id="step1-error" class="error-msg" style="display:none"></div>
    </div>`;
  }

  // ── 渲染：单台分支 ────────────────────────────────────────
  function renderSingleBranch() {
    const cabinetOpts = buildOptions(getStorageCabinetOptions(), "选择储能柜产品编码");
    const opts = buildOptions(DATA.secondaryMeters, "选择二次电表");
    return `
    <div class="card" id="branch-single">
      <h2 class="step-title"><span class="step-num">2</span>单台配置（1台储能柜）</h2>

      <div class="section-block">
        <div class="section-label">储能柜产品编码</div>
        <div class="form-item">
          <label>选择型号 <span class="required">*</span></label>
          <select id="cabinet-select" onchange="UI.syncField('cabinet-select','cabinet-code','cabinet-desc', UI.getStorageCabinetOptions())">
            ${cabinetOpts}
          </select>
        </div>
        <div class="code-desc-row">
          <div><span class="cd-label">编码：</span><span class="cd-value" id="cabinet-code">—</span></div>
          <div><span class="cd-label">描述：</span><span class="cd-value" id="cabinet-desc">仅显示 ${window.AppState.cap}kWh 匹配产品</span></div>
        </div>
      </div>

      <div class="section-block" id="sm-section">
        <div class="section-label">
          二次电表
          <span class="auto-tag linked-tag" id="sm-linked-tag-single" style="display:none">🔗 需求表联动已预选</span>
        </div>
        <div class="form-item">
          <label>选择型号 <span class="required">*</span></label>
          <select id="sm-select" onchange="UI.syncSM()">
            ${opts}
          </select>
        </div>
        <div class="code-desc-row">
          <div><span class="cd-label">编码：</span><span class="cd-value" id="sm-code">—</span></div>
          <div><span class="cd-label">描述：</span><span class="cd-value" id="sm-desc">—</span></div>
        </div>
      </div>

      <div class="section-block">
        <div class="section-label">项目信息 / 备注</div>
        <textarea id="single-remark" placeholder="可在此填写项目信息、备注说明等内容..." rows="4"></textarea>
      </div>

      <div class="btn-row">
        <button class="btn-secondary" onclick="UI.resetAll()">← 重新填写</button>
        <button class="btn-primary" onclick="FORM.collectAndExport()">生成 Excel 表格 ↓</button>
      </div>
      <div class="export-options">
        <span class="export-options-title">导出内容</span>
        <label class="checkbox-label"><input type="checkbox" id="export-req" /> 非标需求表</label>
        <label class="checkbox-label"><input type="checkbox" id="export-config" checked /> 配置表</label>
      </div>
      <div id="single-error" class="error-msg" style="display:none"></div>
    </div>`;
  }

  // ── 渲染：多台分支 ────────────────────────────────────────
  function renderMultiBranch() {
    const cabinetOpts = buildOptions(getStorageCabinetOptions(), "选择储能柜产品编码");
    const smOpts  = buildOptions(DATA.secondaryMeters, "选择二次电表");
    const pmOpts  = buildOptions(DATA.primaryMeters,   "选择一次电表");
    const rtOpts  = buildOptions(DATA.routers,         "选择路由器");
    const swOpts  = buildOptions(DATA.switches,        "选择交换机");
    const pwOpts  = buildOptions(DATA.powerModules,    "选择电源模块");
    const busOpts = buildOptions(DATA.combiners,       "选择汇流柜型号");
    const stsOpts = buildOptions(DATA.stsCabinets,     "选择STS柜型号");
    const monitorOpts = buildOptions(DATA.monitorCabinets, "选择监控箱型号");
    const emOpts  = buildOptions(DATA.ems,             "选择EMS型号");
    const simOpts = buildOptions(DATA.simCards,        "选择流量卡");
    const display = DATA.displays[0];
    const dviOpts = buildOptions(DATA.dviCables,       "选择DVI线缆");

    return `
    <div class="card" id="branch-multi">
      <h2 class="step-title"><span class="step-num">2</span>多台配置（≥2台储能柜）</h2>

      <div class="config-groups">

        <!-- ═══ 核心设备 ═══ -->
        <div class="config-group">
          <div class="group-header"><span class="group-icon">⚡</span> 核心设备</div>
          <div class="group-grid">
            <div class="section-block full-width">
              <div class="section-label">储能柜</div>
              <div class="form-row-3">
                <div class="form-item">
                  <label>选择型号 <span class="required">*</span></label>
                  <select id="m-cabinet-select" onchange="UI.syncField('m-cabinet-select','m-cabinet-code','m-cabinet-desc', UI.getStorageCabinetOptions())">
                    ${cabinetOpts}
                  </select>
                </div>
                <div class="form-item">
                  <label>数量</label>
                  <input type="text" id="m-cabinet-qty" value="${window.AppState.count}" inputmode="numeric" class="qty-input" />
                </div>
              </div>
              <div class="code-desc-row">
                <div><span class="cd-label">编码：</span><span class="cd-value" id="m-cabinet-code">—</span></div>
                <div><span class="cd-label">描述：</span><span class="cd-value" id="m-cabinet-desc">仅显示 ${window.AppState.cap}kWh 匹配产品</span></div>
              </div>
              <div class="form-item">
                <label>备注</label>
                <textarea id="m-cabinet-remark" placeholder="储能柜产品备注（可修改）" rows="2"></textarea>
              </div>
            </div>

            <div class="section-block full-width">
              <div class="section-label">EMS</div>
              <div class="form-row-3">
                <div class="form-item">
                  <label>选择型号 <span class="required">*</span></label>
                  <select id="m-em-select" onchange="UI.onEMSChange()">
                    ${emOpts}
                  </select>
                </div>
                <div class="form-item">
                  <label>数量</label>
                  <input type="text" id="m-em-qty" placeholder="台数" inputmode="numeric" class="qty-input" oninput="UI.onEMSQtyChange()" />
                </div>
              </div>
              <div class="code-desc-row">
                <div><span class="cd-label">编码：</span><span class="cd-value" id="m-em-code">—</span></div>
                <div><span class="cd-label">描述：</span><span class="cd-value" id="m-em-desc">—</span></div>
              </div>
              <div class="form-item">
                <label>备注</label>
                <textarea id="m-em-remark" placeholder="备注说明（可修改）" rows="2"></textarea>
              </div>
            </div>

            <div class="section-block auto-section full-width">
              <div class="section-label">EMS配套配件 <span class="auto-tag">自动生成</span></div>
              <p class="auto-tip">默认每项数量为1；特殊情况可勾选后修改数量。</p>
              <label class="checkbox-label" style="margin-bottom:10px">
                <input type="checkbox" id="ems-acc-custom" onchange="UI.onEMSAccessoryCustomChange()" />
                <span>特殊情况：允许修改配件数量</span>
              </label>
              <div id="ems-accessories-list">
                <div class="auto-item">
                  <span class="cd-label">编码：</span><span class="auto-value">${DATA.emsAccessories[0].code}</span>
                  &nbsp;|&nbsp;<span class="cd-label">描述：</span><span class="auto-value">${DATA.emsAccessories[0].desc}</span>
                  &nbsp;|&nbsp;<span class="cd-label">数量：</span><span class="auto-value ems-acc-display">1</span><input type="text" id="ems-acc-qty-0" value="1" class="qty-input" oninput="UI.cleanNonNegativeInt(this)" style="width:72px;display:none" />
                </div>
                <div class="auto-item" style="margin-top:6px">
                  <span class="cd-label">编码：</span><span class="auto-value">${DATA.emsAccessories[1].code}</span>
                  &nbsp;|&nbsp;<span class="cd-label">描述：</span><span class="auto-value">${DATA.emsAccessories[1].desc}</span>
                  &nbsp;|&nbsp;<span class="cd-label">数量：</span><span class="auto-value ems-acc-display">1</span><input type="text" id="ems-acc-qty-1" value="1" class="qty-input" oninput="UI.cleanNonNegativeInt(this)" style="width:72px;display:none" />
                </div>
                <div class="auto-item" style="margin-top:6px">
                  <span class="cd-label">编码：</span><span class="auto-value">${DATA.emsAccessories[2].code}</span>
                  &nbsp;|&nbsp;<span class="cd-label">描述：</span><span class="auto-value">${DATA.emsAccessories[2].desc}</span>
                  &nbsp;|&nbsp;<span class="cd-label">数量：</span><span class="auto-value ems-acc-display">1</span><input type="text" id="ems-acc-qty-2" value="1" class="qty-input" oninput="UI.cleanNonNegativeInt(this)" style="width:72px;display:none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ 电气仪表 ═══ -->
        <div class="config-group">
          <div class="group-header"><span class="group-icon">🔌</span> 电气仪表</div>
          <div class="group-grid">
            <div class="section-block" id="block-sm">
              <div class="section-label">
                二次电表
                <span class="auto-tag linked-tag" id="sm-linked-tag" style="display:none">🔗 联动</span>
              </div>
              <div class="form-row-3">
                <div class="form-item">
                  <label>选择型号 <span class="required">*</span></label>
                  <select id="m-sm-select" onchange="UI.syncField('m-sm-select','m-sm-code','m-sm-desc', DATA.secondaryMeters)">
                    ${smOpts}
                  </select>
                </div>
                <div class="form-item">
                  <label>数量</label>
                  <input type="text" id="m-sm-qty" value="1" inputmode="numeric" class="qty-input" />
                </div>
              </div>
              <div class="code-desc-row">
                <div><span class="cd-label">编码：</span><span class="cd-value" id="m-sm-code">—</span></div>
                <div><span class="cd-label">描述：</span><span class="cd-value" id="m-sm-desc">—</span></div>
              </div>
              <div class="form-item">
                <label>备注</label>
                <textarea id="m-sm-remark" placeholder="备注" rows="1"></textarea>
              </div>
            </div>

            <div class="section-block" id="block-pm">
              <div class="section-label">
                一次电表
                <span class="auto-tag linked-tag" id="pm-linked-tag" style="display:none">🔗 联动</span>
              </div>
              <div class="form-row-3">
                <div class="form-item">
                  <label>选择型号 <span class="required">*</span></label>
                  <select id="m-pm-select" onchange="UI.syncField('m-pm-select','m-pm-code','m-pm-desc', DATA.primaryMeters)">
                    ${pmOpts}
                  </select>
                </div>
                <div class="form-item">
                  <label>数量</label>
                  <input type="text" id="m-pm-qty" value="1" inputmode="numeric" class="qty-input" />
                </div>
              </div>
              <div class="code-desc-row">
                <div><span class="cd-label">编码：</span><span class="cd-value" id="m-pm-code">—</span></div>
                <div><span class="cd-label">描述：</span><span class="cd-value" id="m-pm-desc">—</span></div>
              </div>
              <div class="form-item">
                <label>备注</label>
                <textarea id="m-pm-remark" placeholder="备注" rows="1"></textarea>
              </div>
            </div>

            <div class="section-block linked-section" id="block-bus" style="display:none">
              <div class="section-label">汇流柜 <span class="auto-tag linked-tag">🔗 联动</span></div>
              <p class="auto-tip" style="color:#c05621">需求表中选择了"需要"</p>
              <div class="form-row-3">
                <div class="form-item">
                  <label>选择型号 <span class="required">*</span></label>
                  <select id="m-bus-select" onchange="UI.syncField('m-bus-select','m-bus-code','m-bus-desc', DATA.combiners)">
                    ${busOpts}
                  </select>
                </div>
                <div class="form-item">
                  <label>数量</label>
                  <input type="text" id="m-bus-qty" placeholder="台数" inputmode="numeric" class="qty-input" />
                </div>
              </div>
              <div class="code-desc-row">
                <div><span class="cd-label">编码：</span><span class="cd-value" id="m-bus-code">—</span></div>
                <div><span class="cd-label">描述：</span><span class="cd-value" id="m-bus-desc">—</span></div>
              </div>
              <div class="form-item">
                <label>备注</label>
                <textarea id="m-bus-remark" placeholder="备注" rows="1"></textarea>
              </div>
            </div>

            <div class="section-block linked-section" id="block-sts" style="display:none">
              <div class="section-label">STS柜 <span class="auto-tag linked-tag">🔗 联动</span></div>
              <p class="auto-tip" style="color:#c05621">需求表中选择了"需要"</p>
              <div class="form-row-3">
                <div class="form-item">
                  <label>选择型号 <span class="required">*</span></label>
                  <select id="m-sts-select" onchange="UI.syncField('m-sts-select','m-sts-code','m-sts-desc', DATA.stsCabinets)">
                    ${stsOpts}
                  </select>
                </div>
                <div class="form-item">
                  <label>数量</label>
                  <input type="text" id="m-sts-qty" placeholder="台数" inputmode="numeric" class="qty-input" />
                </div>
              </div>
              <div class="code-desc-row">
                <div><span class="cd-label">编码：</span><span class="cd-value" id="m-sts-code">—</span></div>
                <div><span class="cd-label">描述：</span><span class="cd-value" id="m-sts-desc">—</span></div>
              </div>
              <div class="form-item">
                <label>备注</label>
                <textarea id="m-sts-remark" placeholder="备注" rows="1"></textarea>
              </div>
            </div>

            <div class="section-block linked-section" id="block-monitor" style="display:none">
              <div class="section-label">监控箱 <span class="auto-tag linked-tag">🔗 联动</span></div>
              <p class="auto-tip" style="color:#c05621">需求表中选择了"需要"</p>
              <div class="form-row-3">
                <div class="form-item">
                  <label>选择型号 <span class="required">*</span></label>
                  <select id="m-monitor-select" onchange="UI.syncField('m-monitor-select','m-monitor-code','m-monitor-desc', DATA.monitorCabinets)">
                    ${monitorOpts}
                  </select>
                </div>
                <div class="form-item">
                  <label>数量</label>
                  <input type="text" id="m-monitor-qty" placeholder="台数" inputmode="numeric" class="qty-input" />
                </div>
              </div>
              <div class="code-desc-row">
                <div><span class="cd-label">编码：</span><span class="cd-value" id="m-monitor-code">—</span></div>
                <div><span class="cd-label">描述：</span><span class="cd-value" id="m-monitor-desc">—</span></div>
              </div>
              <div class="form-item">
                <label>备注</label>
                <textarea id="m-monitor-remark" placeholder="备注" rows="1"></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ 网络通信 ═══ -->
        <div class="config-group">
          <div class="group-header"><span class="group-icon">📡</span> 网络通信</div>
          <div class="group-grid">
            <div class="section-block" id="block-rt">
              <div class="section-label">路由器</div>
              <div class="form-row-3">
                <div class="form-item">
                  <label>选择型号 <span class="required">*</span></label>
                  <select id="m-rt-select" onchange="UI.syncField('m-rt-select','m-rt-code','m-rt-desc', DATA.routers)">
                    ${rtOpts}
                  </select>
                </div>
                <div class="form-item">
                  <label>数量</label>
                  <input type="text" id="m-rt-qty" placeholder="台数" inputmode="numeric" class="qty-input" />
                </div>
              </div>
              <div class="code-desc-row">
                <div><span class="cd-label">编码：</span><span class="cd-value" id="m-rt-code">—</span></div>
                <div><span class="cd-label">描述：</span><span class="cd-value" id="m-rt-desc">—</span></div>
              </div>
              <div class="form-item">
                <label>备注</label>
                <textarea id="m-rt-remark" placeholder="备注" rows="1"></textarea>
              </div>
            </div>

            <div class="section-block">
              <div class="section-label">交换机</div>
              <div class="form-row-3">
                <div class="form-item">
                  <label>选择型号 <span class="required">*</span></label>
                  <select id="m-sw-select" onchange="UI.syncField('m-sw-select','m-sw-code','m-sw-desc', DATA.switches)">
                    ${swOpts}
                  </select>
                </div>
                <div class="form-item">
                  <label>数量</label>
                  <input type="text" id="m-sw-qty" placeholder="台数" inputmode="numeric" class="qty-input" />
                </div>
              </div>
              <div class="code-desc-row">
                <div><span class="cd-label">编码：</span><span class="cd-value" id="m-sw-code">—</span></div>
                <div><span class="cd-label">描述：</span><span class="cd-value" id="m-sw-desc">—</span></div>
              </div>
              <div class="form-item">
                <label>备注</label>
                <textarea id="m-sw-remark" placeholder="备注" rows="1"></textarea>
              </div>
            </div>

            <div class="section-block full-width" id="block-sim">
              <div class="section-label">流量卡</div>
              <div class="form-row-3">
                <div class="form-item">
                  <label>选择型号 <span class="required">*</span></label>
                  <select id="m-sim-select" onchange="UI.syncField('m-sim-select','m-sim-code','m-sim-desc', DATA.simCards)">
                    ${simOpts}
                  </select>
                </div>
                <div class="form-item">
                  <label>数量</label>
                  <input type="text" id="m-sim-qty" placeholder="张" inputmode="numeric" class="qty-input" />
                </div>
              </div>
              <div class="code-desc-row">
                <div><span class="cd-label">编码：</span><span class="cd-value" id="m-sim-code">—</span></div>
                <div><span class="cd-label">描述：</span><span class="cd-value" id="m-sim-desc">—</span></div>
              </div>
              <div class="dual-operator-row">
                <label class="checkbox-label">
                  <input type="checkbox" id="m-sim-dual" onchange="UI.onDualSimChange()" />
                  <span>使用两家不同运营商（双卡方案）</span>
                </label>
              </div>
              <div id="m-sim2-block" style="display:none; margin-top:10px;">
                <div class="form-row-3">
                  <div class="form-item">
                    <label>第二家运营商</label>
                    <select id="m-sim2-select" onchange="UI.syncField('m-sim2-select','m-sim2-code','m-sim2-desc', DATA.simCards)">
                      ${simOpts}
                    </select>
                  </div>
                  <div class="form-item">
                    <label>数量</label>
                    <input type="text" id="m-sim2-qty" placeholder="张" inputmode="numeric" class="qty-input" />
                  </div>
                </div>
                <div class="code-desc-row">
                  <div><span class="cd-label">编码：</span><span class="cd-value" id="m-sim2-code">—</span></div>
                  <div><span class="cd-label">描述：</span><span class="cd-value" id="m-sim2-desc">—</span></div>
                </div>
              </div>
              <div class="form-item" style="margin-top:8px">
                <label>备注</label>
                <textarea id="m-sim-remark" placeholder="备注" rows="1"></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ 配件附件 ═══ -->
        <div class="config-group">
          <div class="group-header"><span class="group-icon">🔧</span> 配件附件</div>
          <div class="group-grid">
            <div class="section-block">
              <div class="section-label">电源模块</div>
              <div class="form-row-3">
                <div class="form-item">
                  <label>选择型号 <span class="required">*</span></label>
                  <select id="m-pw-select" onchange="UI.syncField('m-pw-select','m-pw-code','m-pw-desc', DATA.powerModules)">
                    ${pwOpts}
                  </select>
                </div>
                <div class="form-item">
                  <label>数量</label>
                  <input type="text" id="m-pw-qty" placeholder="台数" inputmode="numeric" class="qty-input" />
                </div>
              </div>
              <div class="code-desc-row">
                <div><span class="cd-label">编码：</span><span class="cd-value" id="m-pw-code">—</span></div>
                <div><span class="cd-label">描述：</span><span class="cd-value" id="m-pw-desc">—</span></div>
              </div>
              <div class="form-item">
                <label>备注</label>
                <textarea id="m-pw-remark" placeholder="备注" rows="1"></textarea>
              </div>
            </div>

            <div class="section-block">
              <div class="section-label">液晶显示屏 <span class="auto-tag">自动</span></div>
              <div class="form-row-3">
                <div class="form-item">
                  <label>型号</label>
                  <select id="m-dp-select" disabled>
                    <option value="0" selected>${display.code}｜${display.desc}</option>
                  </select>
                </div>
                <div class="form-item">
                  <label>数量</label>
                  <input type="text" id="m-dp-qty" value="1" readonly class="qty-input qty-auto" />
                </div>
              </div>
              <div class="code-desc-row">
                <div><span class="cd-label">编码：</span><span class="cd-value" id="m-dp-code">${display.code}</span></div>
                <div><span class="cd-label">描述：</span><span class="cd-value" id="m-dp-desc">${display.desc}</span></div>
              </div>
            </div>

            <div class="section-block full-width">
              <div class="section-label">DVI 线缆 <span class="auto-tag">数量随显示屏同步</span></div>
              <div class="form-row-3">
                <div class="form-item">
                  <label>选择型号 <span class="required">*</span></label>
                  <select id="m-dvi-select" onchange="UI.syncField('m-dvi-select','m-dvi-code','m-dvi-desc', DATA.dviCables)">
                    ${dviOpts}
                  </select>
                </div>
                <div class="form-item">
                  <label>数量</label>
                  <input type="text" id="m-dvi-qty" value="1" readonly class="qty-input qty-auto" />
                </div>
              </div>
              <div class="code-desc-row">
                <div><span class="cd-label">编码：</span><span class="cd-value" id="m-dvi-code">—</span></div>
                <div><span class="cd-label">描述：</span><span class="cd-value" id="m-dvi-desc">—</span></div>
              </div>
              <div class="form-item" style="margin-top:8px">
                <label>备注</label>
                <textarea id="m-dp-remark" placeholder="备注" rows="1"></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ 备注 ═══ -->
        <div class="config-group">
          <div class="group-header"><span class="group-icon">📝</span> 备注</div>
          <div class="group-grid">
            <div class="section-block full-width">
              <div class="section-label">项目整体备注 / 说明</div>
              <textarea id="m-global-remark" placeholder="可填写项目整体说明、特殊要求等..." rows="3"></textarea>
            </div>
          </div>
        </div>

      </div><!-- /config-groups -->

      <div class="btn-row">
        <button class="btn-secondary" onclick="UI.resetAll()">← 重新填写</button>
        <button class="btn-primary" onclick="FORM.collectAndExport()">生成 Excel 表格 ↓</button>
      </div>
      <div class="export-options">
        <span class="export-options-title">导出内容</span>
        <label class="checkbox-label"><input type="checkbox" id="export-req" /> 非标需求表</label>
        <label class="checkbox-label"><input type="checkbox" id="export-config" checked /> 配置表</label>
      </div>
      <div id="multi-error" class="error-msg" style="display:none"></div>
    </div>`;
  }

  // ── 需求表联动：显示/隐藏区块 + 自动预选设备 ──────
  function onReqChange() {
    // ===== 需求表层面联动（无论配置区是否展开都执行） =====

    // ── 拓扑7 → 显示变压器数量 ──
    const sceneVal = document.getElementById("r-scene")?.value;
    const tItem = document.getElementById("transformer-count-item");
    if (tItem) tItem.style.display = sceneVal === "拓扑7" ? "flex" : "none";

    // ── 离网功能=需要 → 显示STS柜选择 + 同步STS功能=需要 + 收起网络与监控 ──
    const offGridVal = document.getElementById("r-offGrid")?.value;
    const stsItem = document.getElementById("offgrid-sts-item");
    const stsQtyItem = document.getElementById("offgrid-sts-qty-item");
    const stsReq = document.getElementById("r-sts");
    const netSection = document.getElementById("req-section-C");
    if (offGridVal === "需要") {
      if (stsItem) stsItem.style.display = "flex";
      if (stsQtyItem) stsQtyItem.style.display = "flex";
      if (stsReq && stsReq.value !== "需要") {
        stsReq.value = "需要";
        // 触发STS的change以更新配置区可见性
        stsReq.dispatchEvent(new Event('change'));
      }
      if (netSection) netSection.style.display = "none";
    } else {
      if (stsItem) stsItem.style.display = "none";
      if (stsQtyItem) stsQtyItem.style.display = "none";
      if (netSection) netSection.style.display = "block";
    }

    // ===== 配置区层面联动（仅配置区展开后执行） =====
    const branch = document.getElementById("branch-multi");
    if (!branch) return; // 配置区还没展开

    const hints = [];

    // 先应用可见性（隐藏"不需要"的区块）
    applyBlockVisibility('multi');

    const antiReverse = document.getElementById("r-antiReverse")?.value;
    const meterRead   = document.getElementById("r-meterRead")?.value;
    const busCabinet  = document.getElementById("r-busCabinet")?.value;

    // 防逆流 → 预选二次电表（仅当区块可见时）
    const smSel = document.getElementById("m-sm-select");
    const smBlock = document.getElementById("block-sm");
    if (smSel && antiReverse === "需要" && smBlock?.style.display !== "none") {
      if (smSel.value === "") {
        smSel.value = "0";
        syncField("m-sm-select", "m-sm-code", "m-sm-desc", DATA.secondaryMeters);
      }
      hints.push("✅ 防逆流需要 → 已预选二次电表");
    }

    // 抄表 → 预选一次电表（仅当区块可见时）
    const pmSel = document.getElementById("m-pm-select");
    const pmBlock = document.getElementById("block-pm");
    if (pmSel && meterRead === "需要" && pmBlock?.style.display !== "none") {
      if (pmSel.value === "") {
        pmSel.value = "0";
        syncField("m-pm-select", "m-pm-code", "m-pm-desc", DATA.primaryMeters);
      }
      hints.push("✅ 抄表需要 → 已预选一次电表");
    }

    // 汇流柜提示
    if (busCabinet === "需要") hints.push("✅ 汇流柜需要 → 已展开汇流柜配置项");

    // STS → 预选 STS 柜（仅当区块可见时）
    const stsVal = document.getElementById("r-sts")?.value;
    const stsSel = document.getElementById("m-sts-select");
    const stsBlock = document.getElementById("block-sts");
    if (stsSel && stsVal === "需要" && stsBlock?.style.display !== "none") {
      if (stsSel.value === "") {
        stsSel.value = "0";
        syncField("m-sts-select", "m-sts-code", "m-sts-desc", DATA.stsCabinets);
      }
      hints.push("✅ STS需要 → 已预选STS柜");
    }

    // 监控箱 → 预选监控箱（仅当区块可见时）
    const monitorVal = document.getElementById("r-monitorCabinet")?.value;
    const monitorSel = document.getElementById("m-monitor-select");
    const monitorBlock = document.getElementById("block-monitor");
    if (monitorSel && monitorVal === "需要" && monitorBlock?.style.display !== "none") {
      if (monitorSel.value === "") {
        monitorSel.value = "0";
        syncField("m-monitor-select", "m-monitor-code", "m-monitor-desc", DATA.monitorCabinets);
      }
      hints.push("✅ 监控柜需要 → 已预选监控箱");
    }

    // 显示联动提示
    const hintBar = document.getElementById("req-link-hint");
    const hintText = document.getElementById("req-link-text");
    if (hintBar && hintText) {
      if (hints.length > 0) {
        hintText.textContent = hints.join("　　");
        hintBar.style.display = "block";
      } else {
        hintBar.style.display = "none";
      }
    }

    // 同步更新项目信息页的需求字段汇总
    refreshStep1Summary();
  }

  // ── 变压器数量变化时，同步二次电表数量 ──
  function onTransformerCountChange() {
    const tCount = parseInt(document.getElementById("r-transformerCount")?.value, 10) || 1;
    // 单台分支
    const smQtySingle = document.getElementById("sm-qty");
    if (smQtySingle) smQtySingle.value = tCount;
    // 多台分支
    const smQtyMulti = document.getElementById("m-sm-qty");
    if (smQtyMulti) smQtyMulti.value = tCount;
  }

  // ── 在配置区展开后，立即执行一次联动（应用需求表当前状态）
  function applyReqLinkage() {
    onReqChange();
    // 如果拓扑7已选，应用变压器数量到二次电表
    const sceneVal = document.getElementById("r-scene")?.value;
    if (sceneVal === "拓扑7") onTransformerCountChange();
  }

  // ── 步骤一处理：校验 → 检查隐藏 → 确认 → 渲染 ──
  function handleStep1() {
    const nameEl = document.getElementById("r-projectName");
    const capEl = document.getElementById("r-capacity");
    const countEl = document.getElementById("r-cabinetDemandQty");
    const name  = nameEl.value.trim();
    const cap   = capEl.value.trim();
    const count = parseInt(countEl.value.trim(), 10);
    const errEl = document.getElementById("step1-error");

    if (!name)  { showError(errEl, "请先在需求表填写项目名称"); nameEl.scrollIntoView({ behavior: "smooth", block: "center" }); nameEl.focus(); return; }
    if (!cap || cap === "请选择容量") { showError(errEl, "请先在需求表选择单台容量"); capEl.scrollIntoView({ behavior: "smooth", block: "center" }); capEl.focus(); return; }
    if (!count || count < 1) { showError(errEl, "请先在需求表填写有效的电池柜需求数量（≥1）"); countEl.scrollIntoView({ behavior: "smooth", block: "center" }); countEl.focus(); return; }
    errEl.style.display = "none";

    window.AppState = { name, cap, count };

    // 检查是否有模块从"默认需要"改为"不需要"
    const hiddenBlocks = getHiddenBlocks();
    if (hiddenBlocks.length > 0) {
      // 暂存配置参数，等待确认
      window._pendingConfig = { name, cap, count };
      showConfigConfirm(hiddenBlocks);
      return;
    }

    // 无隐藏模块，直接渲染
    renderConfigBranch();
  }

  // ── 显示配置确认弹窗 ────────────────────────────────
  function showConfigConfirm(hiddenBlocks) {
    const desc = document.getElementById("cmodal-desc");
    const list = document.getElementById("cmodal-list");

    desc.textContent = `以下 ${hiddenBlocks.length} 个模块在需求表中被设为"不需要"，进入配置页后将隐藏对应配置区域。如需保留，请点击"返回修改"调整需求表。`;

    list.innerHTML = hiddenBlocks.map(b => `
      <div class="cmodal-item">
        <div>
          <div class="cmodal-item-label">隐藏：${b.label}</div>
          <div class="cmodal-item-detail">需求项「${b.reqLabel}」当前值为「${b.currentVal}」</div>
        </div>
      </div>
    `).join('');

    document.getElementById("cmodal-config").style.display = "flex";
  }

  // ── 取消确认：关闭弹窗，清空待定参数 ────────────────
  function cancelConfigConfirm() {
    document.getElementById("cmodal-config").style.display = "none";
    window._pendingConfig = null;
  }

  // ── 确认进入配置：应用隐藏规则并渲染 ────────────────
  function proceedConfigConfirm() {
    document.getElementById("cmodal-config").style.display = "none";
    renderConfigBranch();
    window._pendingConfig = null;
  }

  // ── 应用区块可见性（根据需求表值显示/隐藏区块）───
  // branch: 'single' | 'multi'
  function applyBlockVisibility(branch) {
    for (const rule of buildBlockVisibility()) {
      const hidden = isBlockHidden(rule);

      if (branch === 'single') {
        // 单台分支：仅处理二次电表
        if (rule.reqId === 'r-antiReverse') {
          const smSection = document.getElementById('sm-section');
          if (smSection) smSection.style.display = hidden ? 'none' : 'block';
          const smTag = document.getElementById('sm-linked-tag-single');
          if (smTag) smTag.style.display = hidden ? 'none' : 'inline-flex';
        }
        continue;
      }

      // 多台分支：显示/隐藏对应区块
      const block = document.getElementById(rule.blockId);
      if (block) block.style.display = hidden ? 'none' : 'block';

      // 联动标签同步
      if (rule.reqId === 'r-antiReverse') {
        const smTag = document.getElementById('sm-linked-tag');
        if (smTag) smTag.style.display = hidden ? 'none' : 'inline-flex';
      }
      if (rule.reqId === 'r-meterRead') {
        const pmTag = document.getElementById('pm-linked-tag');
        if (pmTag) pmTag.style.display = hidden ? 'none' : 'inline-flex';
      }
    }

    // 所有联动区块（含汇流柜、STS柜）均已通过 buildBlockVisibility 循环处理
  }

  // ── 判断需求字段是否被用户选为"需要"（与 isBlockHidden 相反）──
  function isFieldNeeded(f) {
    const el = document.getElementById(f.id);
    if (!el) return false;
    const val = el.value.trim();
    if (f.hiddenOn && f.hiddenOn.startsWith('!')) {
      return val === f.hiddenOn.slice(1);
    }
    return val !== f.hiddenOn;
  }

  // ── 实时同步步骤一摘要（项目名称/容量/数量 + 需求表字段汇总）───────────
  function refreshStep1Summary() {
    const set = (id, value, suffix = "") => {
      const el = document.getElementById(id);
      if (el) el.textContent = value ? `${value}${suffix}` : "请在需求表填写";
    };
    const name = document.getElementById("r-projectName")?.value.trim() || "";
    set("s-projectName", name);
    set("s-capacity", document.getElementById("r-capacity")?.value.trim(), " kWh");
    set("s-cabinetDemandQty", document.getElementById("r-cabinetDemandQty")?.value.trim(), " 台");

    // 同步更新需求表标题中的项目名称
    const titleNameEl = document.getElementById("req-title-name");
    if (titleNameEl) titleNameEl.textContent = name ? name : "";

    // 同步需求表"需要"字段到项目信息汇总
    const summaryEl = document.getElementById("step1-req-summary");
    if (summaryEl) {
      const needed = (DATA.reqFieldRegistry || [])
        .filter(f => f.linkedBlockId && f.hiddenOn)
        .filter(isFieldNeeded);
      if (needed.length > 0) {
        const items = needed.map(f => {
          const el = document.getElementById(f.id);
          const val = el ? el.value.trim() : '';
          return `<div class="form-item"><label>${f.label}</label><div class="code-desc-row"><span class="cd-value">${val}</span></div></div>`;
        }).join('');
        summaryEl.innerHTML = `<div style="font-size:11px;color:rgba(255,255,255,.5);margin-bottom:6px;padding-bottom:4px;border-bottom:0.5px solid rgba(255,255,255,.1);">需求选择确认（以下模块将在配置中显示）</div><div class="form-grid">${items}</div>`;
        summaryEl.style.display = '';
      } else {
        summaryEl.innerHTML = '';
        summaryEl.style.display = 'none';
      }
    }
  }

  // ── 其他事件处理 ──────────────────────────────────────────
  function syncSM() {
    const sel = document.getElementById("sm-select");
    syncDisplay(sel, document.getElementById("sm-code"), document.getElementById("sm-desc"), DATA.secondaryMeters);
  }

  function syncField(selId, codeId, descId, dataList) {
    const sel = document.getElementById(selId);
    syncDisplay(sel, document.getElementById(codeId), document.getElementById(descId), dataList);
  }

  function onEMSChange() {
    syncField("m-em-select", "m-em-code", "m-em-desc", DATA.ems);
    updateEMSAccessories();
  }

  function onEMSQtyChange() {
    const raw = document.getElementById("m-em-qty").value.replace(/[^0-9]/g, "");
    document.getElementById("m-em-qty").value = raw;
    updateEMSAccessories();
  }

  // ── EMS 数量变化时同步 EMS 配件数量为 1 ─────────────────
  function updateEMSAccessories() {
    [0, 1, 2].forEach(i => {
      const input = document.getElementById(`ems-acc-qty-${i}`);
      if (input && !input.value) input.value = "1";
    });
  }

  // ── EMS 配件"允许编辑"复选框切换（显示/隐藏数量输入框）
  function onEMSAccessoryCustomChange() {
    const editable = document.getElementById("ems-acc-custom").checked;
    [0, 1, 2].forEach(i => {
      const input = document.getElementById(`ems-acc-qty-${i}`);
      const display = input.previousElementSibling;
      input.style.display = editable ? "inline-block" : "none";
      if (display) display.style.display = editable ? "none" : "inline";
      if (!input.value) input.value = "1";
    });
  }

  // ── 双运营商复选框切换：显示/隐藏第二家运营商选择区 ──
  function onDualSimChange() {
    const checked = document.getElementById("m-sim-dual").checked;
    document.getElementById("m-sim2-block").style.display = checked ? "block" : "none";
  }

  // ── 显示屏数量变化时同步 DVI 线缆数量 ──────────────────
  function onDisplayQtyChange() {
    const raw = document.getElementById("m-dp-qty").value.replace(/[^0-9]/g, "");
    document.getElementById("m-dp-qty").value = raw;
    const qty = parseInt(raw, 10);
    document.getElementById("m-dvi-qty").value = isNaN(qty) || qty < 1 ? 1 : qty;
  }

  // ── 重置：清除配置区并回到步骤一 ──────────────────────
  function resetAll() {
    document.getElementById("branch-container").innerHTML = "";
    document.getElementById("step1").scrollIntoView({ behavior: "smooth" });
    window.AppState = null;
  }

  function showError(el, msg) {
    el.textContent = msg;
    el.style.display = "block";
  }

  function getSelectedItem(selId, dataList) {
    const sel = document.getElementById(selId);
    if (!sel || sel.value === "") return null;
    return dataList[parseInt(sel.value)];
  }

  // ── 收集需求表所有字段数据 → 返回对象（供 form.js 调用）
  function collectReqData() {
    const g = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
    const sceneVal = g("r-scene");
    const offGridVal = g("r-offGrid");
    return {
      projectName:    g("r-projectName"),
      location:       g("r-location"),
      voltage:        g("r-voltage"),
      power:          g("r-power"),
      capacity:       g("r-capacity"),
      cabinetDemandQty: g("r-cabinetDemandQty"),
      packCool:       g("r-packCool"),
      cellBrand:      g("r-cellBrand"),
      scene:          sceneVal,
      transformerCount: sceneVal === "拓扑7" ? g("r-transformerCount") : "",
      contractNo:     g("r-contractNo"),
      antiReverse:    g("r-antiReverse"),
      meterRead:      g("r-meterRead"),
      busCabinet:     g("r-busCabinet"),
      isolation:      g("r-isolation"),
      offGrid:        offGridVal,
      stsCabinetCode: offGridVal === "需要" ? g("r-stsCabinetCode") : "",
      stsCabinetQty:  offGridVal === "需要" ? g("r-stsCabinetQty") : "",
      nLine:          g("r-nLine"),
      fastSwitch:     g("r-fastSwitch"),
      sts:            g("r-sts"),
      diesel:         g("r-diesel"),
      solar:          g("r-solar"),
      acSwitch:       g("r-acSwitch"),
      demandMgmt:     g("r-demandMgmt"),
      network:        g("r-network"),
      simCard:        g("r-simCard"),
      monitorCabinet: g("r-monitorCabinet"),
      monitorDemand:  g("r-monitorDemand"),
      software:       g("r-software"),
      gridPoint:      g("r-gridPoint"),
      cabinetCable:   g("r-cabinetCable"),
      silkPrint:      g("r-silkPrint"),
      nameplate:      g("r-nameplate"),
      liftHook:       g("r-liftHook"),
      otherReq:       g("r-otherReq"),
    };
  }

  return {
    handleStep1,
    syncSM,
    syncField,
    onEMSChange,
    onEMSQtyChange,
    onEMSAccessoryCustomChange,
    cleanPositiveInt,
    cleanNonNegativeInt,
    onDualSimChange,
    onDisplayQtyChange,
    resetAll,
    showError,
    getSelectedItem,
    getStorageCabinetOptions,
    renderStep1,
    renderRequirements,
    onReqChange,
    onTransformerCountChange,
    refreshStep1Summary,
    collectReqData,
    // 配置确认弹窗
    showConfigConfirm,
    cancelConfigConfirm,
    proceedConfigConfirm,
    // 热门产品统计
    HOT,
  };
})();
