// ============================================================
// form.js — 表单数据收集与验证
// ============================================================
//
// 职责：
//   1. collectSingle() — 收集单台配置数据（储能柜 + 二次电表）
//   2. collectMulti()  — 收集多台配置数据（所有设备区块）
//   3. collectAndExport() — 总入口：收集 → 校验 → 调用 EXPORT.toExcel()
//
// 校验规则：
//   必选设备（多台）：储能柜、二次电表、一次电表、路由器、交换机、
//                    电源模块、EMS、流量卡、DVI 线缆
//   数量要求：每种设备数量 ≥ 1
//   双运营商：勾选后第二家运营商型号和数量也必填
// ============================================================

const FORM = (() => {

  // ── 工具：获取输入框值（去前后空格）───────────────────
  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  // ── 工具：通过下拉框 ID 获取选中设备对象 ──────────────
  function getItem(selId, dataList) {
    return UI.getSelectedItem(selId, dataList);
  }

  // ── 校验导出选项（至少选一个 Sheet）────────────────────
  function getExportSheets(errEl) {
    const includeReq = document.getElementById("export-req")?.checked;
    const includeConfig = document.getElementById("export-config")?.checked;
    if (!includeReq && !includeConfig) {
      UI.showError(errEl, "请至少选择一个导出内容");
      return null;
    }
    return { includeReq, includeConfig };
  }

  // ── 校验失败时定位到对应表单元素并高亮 ─────────────────
  function focusInvalid(errEl, msg, id) {
    UI.showError(errEl, msg);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("field-error");
      if (!el.disabled && !el.readOnly) el.focus();
      setTimeout(() => el.classList.remove("field-error"), 2200);
    }
    return null;
  }

  // ── 获取数量（parseInt，默认 0）─────────────────────────
  function qty(id) {
    return parseInt(val(id), 10) || 0;
  }

  // ── EMS 配件数量：勾选自定义时取输入值，否则固定为 1 ─
  function emsAccQty(id) {
    return document.getElementById("ems-acc-custom")?.checked ? qty(id) : 1;
  }

  function collectSingle() {
    const errEl = document.getElementById("single-error");
    const cabinet = getItem("cabinet-select", UI.getStorageCabinetOptions());
    const exportSheets = getExportSheets(errEl);
    if (!exportSheets) return null;
    if (!cabinet) {
      return focusInvalid(errEl, "请选择储能柜产品编码", "cabinet-select");
    }

    // 判断二次电表是否可见（防逆流=不需要 → 隐藏）
    const antiReverse = document.getElementById("r-antiReverse")?.value;
    const smHidden = antiReverse === "不需要";
    let sm = null;
    if (!smHidden) {
      sm = getItem("sm-select", DATA.secondaryMeters);
      if (!sm) {
        return focusInvalid(errEl, "请选择二次电表型号", "sm-select");
      }
    }

    errEl.style.display = "none";
    return {
      branch:          "single",
      projectName:     window.AppState.name,
      cabinetCapacity: window.AppState.cap,
      cabinetCount:    window.AppState.count,
      storageCabinet:  { ...cabinet, qty: 1 },
      secondaryMeter:  sm ? { ...sm, qty: 1 } : null,
      remark:          val("single-remark"),
      reqData:         UI.collectReqData(),
      exportSheets,
    };
  }

  function collectMulti() {
    const errEl = document.getElementById("multi-error");
    const exportSheets = getExportSheets(errEl);
    if (!exportSheets) return null;

    // 检查区块可见性（需求表"不需要"→区块隐藏）
    const smVisible  = document.getElementById("block-sm")?.style.display !== "none";
    const pmVisible  = document.getElementById("block-pm")?.style.display !== "none";
    const rtVisible  = document.getElementById("block-rt")?.style.display !== "none";
    const simVisible = document.getElementById("block-sim")?.style.display !== "none";

    const cabinet = getItem("m-cabinet-select", UI.getStorageCabinetOptions());
    const sm  = smVisible  ? getItem("m-sm-select",  DATA.secondaryMeters) : null;
    const pm  = pmVisible  ? getItem("m-pm-select",  DATA.primaryMeters)   : null;
    const rt  = rtVisible  ? getItem("m-rt-select",  DATA.routers)         : null;
    const sw  = getItem("m-sw-select",  DATA.switches);
    const pw  = getItem("m-pw-select",  DATA.powerModules);
    const em  = getItem("m-em-select",  DATA.ems);
    const sim = simVisible ? getItem("m-sim-select", DATA.simCards)        : null;
    const dp  = getItem("m-dp-select",  DATA.displays);
    const dvi = getItem("m-dvi-select", DATA.dviCables);

    if (!cabinet) return focusInvalid(errEl, "请选择储能柜产品编码", "m-cabinet-select");
    if (smVisible  && !sm)  return focusInvalid(errEl, "请选择二次电表型号", "m-sm-select");
    if (pmVisible  && !pm)  return focusInvalid(errEl, "请选择一次电表型号", "m-pm-select");
    if (rtVisible  && !rt)  return focusInvalid(errEl, "请选择路由器型号", "m-rt-select");
    if (!sw)  return focusInvalid(errEl, "请选择交换机型号", "m-sw-select");
    if (!pw)  return focusInvalid(errEl, "请选择电源模块型号", "m-pw-select");
    if (!em)  return focusInvalid(errEl, "请选择EMS型号", "m-em-select");
    if (simVisible && !sim) return focusInvalid(errEl, "请选择流量卡型号", "m-sim-select");
    if (!dvi) return focusInvalid(errEl, "请选择DVI线缆型号", "m-dvi-select");
    if (qty("m-cabinet-qty") < 1) return focusInvalid(errEl, "请填写储能柜数量", "m-cabinet-qty");
    if (smVisible  && qty("m-sm-qty")  < 1) return focusInvalid(errEl, "请填写二次电表数量", "m-sm-qty");
    if (pmVisible  && qty("m-pm-qty")  < 1) return focusInvalid(errEl, "请填写一次电表数量", "m-pm-qty");
    if (rtVisible  && qty("m-rt-qty")  < 1) return focusInvalid(errEl, "请填写路由器数量", "m-rt-qty");
    if (qty("m-sw-qty") < 1) return focusInvalid(errEl, "请填写交换机数量", "m-sw-qty");
    if (qty("m-pw-qty") < 1) return focusInvalid(errEl, "请填写电源模块数量", "m-pw-qty");
    if (qty("m-em-qty") < 1) return focusInvalid(errEl, "请填写EMS数量", "m-em-qty");
    if (simVisible && qty("m-sim-qty") < 1) return focusInvalid(errEl, "请填写流量卡数量（张）", "m-sim-qty");
    errEl.style.display = "none";

    const emQty  = qty("m-em-qty");
    const dpQty  = 1;
    const dviQty = qty("m-dvi-qty") || dpQty;
    const dualSim = simVisible && document.getElementById("m-sim-dual")?.checked;
    const sim2 = dualSim ? getItem("m-sim2-select", DATA.simCards) : null;
    if (dualSim && !sim2) return focusInvalid(errEl, "请选择第二家运营商流量卡型号", "m-sim2-select");
    if (dualSim && qty("m-sim2-qty") < 1) return focusInvalid(errEl, "请填写第二家运营商流量卡数量（张）", "m-sim2-qty");

    // 汇流柜
    const busCabinetShown = document.getElementById("block-bus")?.style.display !== "none";
    const bus = busCabinetShown ? getItem("m-bus-select", DATA.combiners) : null;
    if (busCabinetShown && !bus) return focusInvalid(errEl, "请选择汇流柜产品型号", "m-bus-select");
    const busCabinet = busCabinetShown ? {
      ...bus,
      qty:    parseInt(val("m-bus-qty"), 10) || 0,
      remark: val("m-bus-remark"),
    } : null;

    // STS柜
    const stsShown = document.getElementById("block-sts")?.style.display !== "none";
    const sts = stsShown ? getItem("m-sts-select", DATA.stsCabinets) : null;
    if (stsShown && !sts) return focusInvalid(errEl, "请选择STS柜产品型号", "m-sts-select");
    const stsCabinet = stsShown ? {
      ...sts,
      qty:    parseInt(val("m-sts-qty"), 10) || 0,
      remark: val("m-sts-remark"),
    } : null;

    return {
      branch:          "multi",
      projectName:     window.AppState.name,
      cabinetCapacity: window.AppState.cap,
      cabinetCount:    window.AppState.count,
      storageCabinet:  { ...cabinet, qty: qty("m-cabinet-qty"), remark: val("m-cabinet-remark") },
      secondaryMeter:  sm  ? { ...sm,  qty: qty("m-sm-qty"), remark: val("m-sm-remark") } : null,
      primaryMeter:    pm  ? { ...pm,  qty: qty("m-pm-qty"), remark: val("m-pm-remark") } : null,
      router:          rt  ? { ...rt,  qty: qty("m-rt-qty"), remark: val("m-rt-remark") } : null,
      switch_:         { ...sw,  qty: qty("m-sw-qty"), remark: val("m-sw-remark") },
      powerModule:     { ...pw,  qty: qty("m-pw-qty"), remark: val("m-pw-remark") },
      ems:             { ...em,  qty: emQty, remark: val("m-em-remark") },
      simCard:         sim ? { ...sim, qty: qty("m-sim-qty"), remark: val("m-sim-remark"), dual: dualSim } : null,
      simCard2:        sim2 ? { ...sim2, qty: qty("m-sim2-qty") } : null,
      emsAcc0:         { ...DATA.emsAccessories[0], qty: emsAccQty("ems-acc-qty-0") },
      emsAcc1:         { ...DATA.emsAccessories[1], qty: emsAccQty("ems-acc-qty-1") },
      emsAcc2:         { ...DATA.emsAccessories[2], qty: emsAccQty("ems-acc-qty-2") },
      display:         { ...dp,  qty: dpQty,  remark: val("m-dp-remark") },
      dviCable:        { ...dvi, qty: dviQty },
      busCabinet,
      stsCabinet,
      globalRemark:    val("m-global-remark"),
      reqData:         UI.collectReqData(),
      exportSheets,
    };
  }

  function collectAndExport() {
    if (!window.AppState) return;
    const data = window.AppState.count === 1 ? collectSingle() : collectMulti();
    if (!data) return;
    EXPORT.toExcel(data);
  }

  return { collectAndExport };
})();
