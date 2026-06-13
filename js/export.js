// ============================================================
// export.js — Excel 导出引擎
// ============================================================
//
// 使用 SheetJS（lib/xlsx.full.min.js）生成 .xlsx 文件。
// 输出 1~2 个 Sheet：
//   Sheet 1: 「非标需求表」— 4 列，按 A/B/C/D 区域展示
//   Sheet 2: 「{项目名}_配置表」— 6 列，按设备类型分节
//
// 颜色体系（常量 COLOR 配置）：
//   - 深蓝 #1F4E79 表头
//   - 浅蓝 #D6E4F0 分节标题
//   - 橙棕 #C05621 需求表头 / 联动标记
//   - 绿色 #E2EFDA 自动生成行
//
// 方法链条：
//   EXPORT.toExcel(data)
//     → buildReqSheet(data)    [需求表 Sheet]
//     → buildConfigSheet(data) [配置表 Sheet]
//     → XLSX.writeFile()       [写入磁盘]
// ============================================================

const EXPORT = (() => {

  const COLOR = {
    headerBg:   "1F4E79",
    headerFont: "FFFFFF",
    subBg:      "D6E4F0",
    subFont:    "1A1A1A",
    autoBg:     "E2EFDA",
    autoFont:   "375623",
    altBg:      "F2F7FB",
    border:     "B8C8D9",
    reqHdrBg:   "C05621",
    reqSecBg:   "FEF3E2",
    reqSecFont: "7B341E",
    linkedBg:   "FFF0E6",
    linkedBdr:  "C05621",
  };

  const borderStyle = {
    top:    { style: "thin", color: { rgb: COLOR.border } },
    bottom: { style: "thin", color: { rgb: COLOR.border } },
    left:   { style: "thin", color: { rgb: COLOR.border } },
    right:  { style: "thin", color: { rgb: COLOR.border } },
  };

  function cellStyle(bgRgb, fontRgb, bold = false, wrapText = true, halign = "center") {
    return {
      font:      { name: "Arial", sz: 11, bold, color: { rgb: fontRgb } },
      fill:      { fgColor: { rgb: bgRgb } },
      alignment: { horizontal: halign, vertical: "center", wrapText },
      border:    borderStyle,
    };
  }

  function makeCell(v, style) {
    return { v: v ?? "", t: typeof v === "number" ? "n" : "s", s: style };
  }

  function mergeRange(ws, r1, c1, r2, c2) {
    if (!ws["!merges"]) ws["!merges"] = [];
    ws["!merges"].push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
  }

  // ── Sheet 1：需求表 ──────────────────────────────────────
  function buildReqSheet(data) {
    const ws = {};
    const r = data.reqData || {};
    ws["!cols"] = [{ wch: 22 }, { wch: 30 }, { wch: 22 }, { wch: 30 }];

    const hStyle  = cellStyle(COLOR.reqHdrBg,  COLOR.headerFont, true,  false, "center");
    const secSt   = cellStyle(COLOR.reqSecBg,  COLOR.reqSecFont, true,  false, "left");
    const lbSt    = cellStyle("F7FAFC",        "4A5568",         true,  false, "left");
    const valSt   = cellStyle("FFFFFF",        "1A1A1A",         false, true,  "left");
    const lkSt    = cellStyle(COLOR.linkedBg,  "C05621",         true,  false, "left");
    const lkValSt = cellStyle(COLOR.linkedBg,  "7B341E",         false, false, "left");

    let row = 1;

    // 大标题
    ws["A"+row] = makeCell(`${data.projectName} — 项目非标需求表`, hStyle);
    ["B","C","D"].forEach(c => ws[c+row] = makeCell("", hStyle));
    mergeRange(ws, row-1, 0, row-1, 3);
    row++;

    function writeSection(label) {
      ws["A"+row] = makeCell(label, secSt);
      ["B","C","D"].forEach(c => ws[c+row] = makeCell("", secSt));
      mergeRange(ws, row-1, 0, row-1, 3);
      row++;
    }

    function writeRow2(l1, v1, l2, v2, linked = false) {
      ws["A"+row] = makeCell(l1, linked ? lkSt  : lbSt);
      ws["B"+row] = makeCell(v1, linked ? lkValSt : valSt);
      ws["C"+row] = makeCell(l2, linked ? lkSt  : lbSt);
      ws["D"+row] = makeCell(v2, linked ? lkValSt : valSt);
      row++;
    }

    function writeRowFull(label, value, linked = false) {
      ws["A"+row] = makeCell(label, linked ? lkSt  : lbSt);
      ws["B"+row] = makeCell(value, linked ? lkValSt : valSt);
      ws["C"+row] = makeCell("", linked ? lkValSt : valSt);
      ws["D"+row] = makeCell("", linked ? lkValSt : valSt);
      mergeRange(ws, row-1, 1, row-1, 3);
      row++;
    }

    // A. 项目基本信息
    writeSection("A. 项目基本信息");
    writeRow2("项目名称",       r.projectName   || data.projectName || "—", "项目所在地",   r.location     || "—");
    writeRow2("并网点电压等级", r.voltage       || "0.4KV", "单台额定功率", r.power ? r.power+"kW" : "—");
    writeRow2("单台电池柜容量", r.capacity ? r.capacity+"kWh" : data.cabinetCapacity+"kWh", "电池柜需求数量", r.cabinetDemandQty || data.cabinetCount);
    writeRow2("Pack冷却方式",   r.packCool      || "—", "电芯品牌",     r.cellBrand    || "—");
    writeRow2("应用场景/拓扑",  r.scene         || "—", "合同/订单号",  r.contractNo   || "—");

    // B. 并网与电气需求
    writeSection("B. 并网与电气需求");
    writeRow2("🔗 防逆流功能",  r.antiReverse   || "—", "🔗 抄表需求",  r.meterRead    || "—", true);
    writeRow2("🔗 汇流柜",      r.busCabinet    || "—", "隔离需求",     r.isolation    || "—", false);
    writeRow2("离网功能",       r.offGrid       || "—", "N线处理",      r.nLine        || "—");
    writeRow2("快切功能",       r.fastSwitch    || "—", "STS功能",      r.sts          || "—");
    writeRow2("柴油发电机联动", r.diesel        || "—", "光伏接入",     r.solar        || "—");
    writeRow2("交流开关定制",   r.acSwitch      || "—", "需量管理",     r.demandMgmt   || "—");

    // C. 网络与监控
    writeSection("C. 网络与监控");
    writeRow2("无线网络硬件",   r.network       || "—", "物联网卡需求", r.simCard      || "—");
    writeRow2("主站监控柜",     r.monitorCabinet|| "—", "监控系统需求", r.monitorDemand|| "—");
    writeRow2("云平台软件",     r.software      || "—", "并网点描述",   r.gridPoint    || "—");

    // D. 外观与其他
    writeSection("D. 外观与其他");
    writeRow2("柜间连接线缆",   r.cabinetCable  || "—", "丝印要求",     r.silkPrint    || "—");
    writeRow2("铭牌要求",       r.nameplate     || "—", "起吊钩需求",   r.liftHook     || "—");
    if (r.otherReq) writeRowFull("其他非标需求", r.otherReq);

    ws["!ref"] = `A1:D${row - 1}`;
    ws["!rows"] = [];
    for (let i = 0; i < row; i++) ws["!rows"][i] = { hpt: i === 0 ? 30 : 20 };
    return ws;
  }

  // ── Sheet 2：配置表（新版 7 列样式）────────────────────────
  function buildConfigSheet(data) {
    const ws = {};
    const cols = ["A","B","C","D","E","F","G"];
    ws["!cols"] = [
      { wch: 6 },   // 选择
      { wch: 14 },  // 类别
      { wch: 16 },  // 物料编码
      { wch: 52 },  // 编码描述
      { wch: 8 },   // 数量
      { wch: 22 },  // 备注
      { wch: 18 },  // 项目信息
    ];

    // ── 颜色常量 ──────────────────────────────────────────
    const GREEN_DARK  = "267845";  // 深绿 - 大标题
    const GREEN_MID   = "00B050";  // 中绿 - 表头/分类背景
    const GREEN_LIGHT = "C6EFCE";  // 浅绿 - 表头文字
    const WHITE_BG    = "FFFFFF";
    const TEXT_DARK    = "1A1A1A";
    const TEXT_RED     = "FF0000";
    const TEXT_GRAY    = "666666";
    const BORDER_COLOR = "B0C4B0";

    const borderAll = {
      top:    { style: "thin", color: { rgb: BORDER_COLOR } },
      bottom: { style: "thin", color: { rgb: BORDER_COLOR } },
      left:   { style: "thin", color: { rgb: BORDER_COLOR } },
      right:  { style: "thin", color: { rgb: BORDER_COLOR } },
    };

    function cs(bg, font, bold, wrap, halign) {
      return {
        font:      { name: "微软雅黑", sz: 10, bold: !!bold, color: { rgb: font } },
        fill:      { fgColor: { rgb: bg } },
        alignment: { horizontal: halign || "center", vertical: "center", wrapText: !!wrap },
        border:    borderAll,
      };
    }

    // 预定义样式
    const titleSt  = cs(GREEN_DARK,  "FFFFFF", true,  false, "center");
    const hdrSt    = cs(GREEN_MID,   "FFFFFF", true,  false, "center");
    const secSt    = cs(GREEN_LIGHT, TEXT_DARK, true,  false, "left");
    const secStC   = cs(GREEN_LIGHT, TEXT_DARK, true,  false, "center");
    const tdLeft   = cs(WHITE_BG,    TEXT_DARK, false, true,  "left");
    const tdCenter = cs(WHITE_BG,    TEXT_DARK, false, false, "center");
    const tdRed    = cs(WHITE_BG,    TEXT_RED,  false, true,  "left");
    const tdGray   = cs(WHITE_BG,    TEXT_GRAY, false, true,  "left");
    const infoSt   = cs("F2F7F2",    TEXT_GRAY, false, true,  "left");

    // ── 构建标题 ──────────────────────────────────────────
    var req = data.reqData || {};
    var loc   = req.location   || "";
    var brand = req.cellBrand  || "";
    var count = data.cabinetCount || 1;
    var offGrid = req.offGrid || "";
    var mode = "并离网版";
    if (offGrid === "需要") mode = "离网版";
    else if (offGrid === "不需要") mode = "并网版";
    var cool = req.packCool || "液冷";
    var scene = req.scene || "";
    var stsText = (req.sts === "需要" || (data.stsCabinet && data.stsCabinet.code)) ? " 我司提供STS柜" : "";
    var titleText = [loc, brand, count+"台", mode, cool+"一体储能", scene, stsText].filter(function(s){return s;}).join(" ");

    var row = 1;

    // 大标题
    ws["A"+row] = makeCell(titleText || (data.projectName+" 储能柜项目配置表"), { ...titleSt, font: { ...titleSt.font, sz: 13 } });
    forEachCol(function(c){ ws[c+row] = makeCell("", titleSt); });
    mergeRange(ws, row-1, 0, row-1, 6);
    row++;

    // ── 项目摘要信息 ─────────────────────────────────────
    const infoLabelSt = cs("E2F0E2", TEXT_DARK, true, false, "center");
    const infoValueSt = cs("FFFFFF", TEXT_DARK, false, false, "left");
    const infoValueC  = cs("FFFFFF", TEXT_DARK, false, false, "center");

    // 项目名称
    ws["A"+row] = makeCell("项目名称", infoLabelSt);
    ws["B"+row] = makeCell(data.projectName || "", infoValueSt);
    for (var ci = 2; ci <= 6; ci++) ws[cols[ci]+row] = makeCell("", infoValueSt);
    mergeRange(ws, row-1, 1, row-1, 6);
    row++;

    // 产品型号
    var modelText = "";
    if (data.storageCabinet) {
      modelText = (data.storageCabinet.code || "") + " " + (data.storageCabinet.desc || "");
    }
    ws["A"+row] = makeCell("产品型号", infoLabelSt);
    ws["B"+row] = makeCell(modelText, infoValueSt);
    for (var ci = 2; ci <= 6; ci++) ws[cols[ci]+row] = makeCell("", infoValueSt);
    mergeRange(ws, row-1, 1, row-1, 6);
    row++;

    // 数量 / 汇流柜 / 拓扑类型
    ws["A"+row] = makeCell("数量", infoLabelSt);
    ws["B"+row] = makeCell((data.cabinetCount || "") + " 台", infoValueC);
    ws["C"+row] = makeCell("汇流柜", infoLabelSt);
    ws["D"+row] = makeCell(data.busCabinet ? "是" : "否", infoValueC);
    ws["E"+row] = makeCell("拓扑类型", infoLabelSt);
    ws["F"+row] = makeCell((data.reqData && data.reqData.scene) || "", infoValueC);
    ws["G"+row] = makeCell("", infoValueC);
    mergeRange(ws, row-1, 5, row-1, 6);
    row++;

    // 空行分隔
    for (var ci = 0; ci <= 6; ci++) ws[cols[ci]+row] = makeCell("", cs("FFFFFF", TEXT_DARK, false, false, "center"));
    row++;

    // 表头行
    var headers = ["选择","类别","物料编码","编码描述","数量","备注","项目信息"];
    headers.forEach(function(h,i){ ws[cols[i]+row] = makeCell(h, hdrSt); });
    row++;

    var seq = 1;
    var projInfo = loc || data.projectName || "";

    // ── 辅助：写节标题 ───────────────────────────────────
    function writeSection(label) {
      ws["A"+row] = makeCell("", secSt);
      ws["B"+row] = makeCell(label, secSt);
      forEachCol(function(c,i){ if(i>=2) ws[c+row] = makeCell("", secStC); });
      mergeRange(ws, row-1, 1, row-1, 6);
      row++;
    }

    // ── 辅助：写数据行 ───────────────────────────────────
    function writeRow(label, item, isAuto, redNote) {
      ws["A"+row] = makeCell("", tdCenter);
      ws["B"+row] = makeCell(label, tdLeft);
      ws["C"+row] = makeCell(item.code || "", tdCenter);
      ws["D"+row] = makeCell(item.desc || "", tdLeft);
      ws["E"+row] = makeCell(item.qty || "", tdCenter);
      var remark = item.remark || "";
      if (redNote) remark = remark + (remark?"，":"") + redNote;
      ws["F"+row] = makeCell(remark, redNote ? tdRed : (isAuto ? tdGray : tdLeft));
      ws["G"+row] = makeCell(projInfo, infoSt);
      row++;
    }

    // ── 数据内容 ─────────────────────────────────────────
    if (data.branch === "single") {
      // 单台分支
      writeSection("储能柜");
      writeRow("储能柜", data.storageCabinet);

      if (data.secondaryMeter && data.secondaryMeter.code) {
        writeSection("二次电表");
        writeRow("二次电表", data.secondaryMeter);
      }
    } else {
      // 多台分支

      // 储能柜
      writeSection("储能柜");
      writeRow("储能柜产品编码", data.storageCabinet);

      // 二次电表
      if (data.secondaryMeter && data.secondaryMeter.code) {
        writeSection("二次电表");
        var smRemark = (req.antiReverse === "需要") ? "安装于二次回路，做防逆流防过载使用" : "";
        writeRow("二次电表", data.secondaryMeter, false, smRemark || "");
      }

      // 一次电表
      if (data.primaryMeter && data.primaryMeter.code) {
        writeSection("一次电表");
        writeRow("一次电表", data.primaryMeter);
      }

      // 路由器
      if (data.router && data.router.code) {
        writeSection("路由器");
        writeRow("路由器", data.router);
      }

      // 交换机
      writeSection("交换机");
      writeRow("交换机", data.switch_);

      // 电源模块
      writeSection("电源模块");
      writeRow("电源模块", data.powerModule);

      // EMS
      writeSection("EMS");
      writeRow("EMS", data.ems);

      // 流量卡
      if (data.simCard && data.simCard.code) {
        writeSection("流量卡");
        writeRow("流量卡（运营商1）", data.simCard);
        if (data.simCard.dual && data.simCard2 && data.simCard2.code) {
          writeRow("流量卡（运营商2）", data.simCard2);
        }
      }

      // EMS 配套配件
      writeSection("EMS配套配件");
      writeRow("EMS配套", data.emsAcc0, true);
      writeRow("EMS配套", data.emsAcc1, true);
      writeRow("EMS配套", data.emsAcc2, true);

      // 液晶显示屏 & DVI
      writeSection("液晶显示屏 & DVI线缆");
      writeRow("液晶显示屏", data.display);
      writeRow("DVI线缆",   data.dviCable);

      // 汇流柜
      if (data.busCabinet && data.busCabinet.code) {
        writeSection("汇流柜（需求联动）");
        writeRow("汇流柜", data.busCabinet);
      }

      // STS柜
      if (data.stsCabinet && data.stsCabinet.code) {
        writeSection("STS柜（需求联动）");
        writeRow("STS柜", data.stsCabinet);
      }

      // 监控箱
      if (data.monitorCabinet && data.monitorCabinet.code) {
        writeSection("监控箱（需求联动）");
        writeRow("监控箱", data.monitorCabinet);
      }

      // 串口服务器
      if (data.serialServer && data.serialServer.code) {
        writeSection("串口服务器");
        writeRow("串口服务器", data.serialServer);
      }

      // 项目整体备注
      if (data.globalRemark) {
        writeSection("项目备注");
        ws["A"+row] = makeCell("", tdCenter);
        ws["B"+row] = makeCell("整体备注", tdLeft);
        ws["C"+row] = makeCell("", tdCenter);
        ws["D"+row] = makeCell(data.globalRemark, tdLeft);
        ws["E"+row] = makeCell("", tdCenter);
        ws["F"+row] = makeCell("", tdLeft);
        ws["G"+row] = makeCell(projInfo, infoSt);
        mergeRange(ws, row-1, 3, row-1, 5);
        row++;
      }
    }

    // 底部信息行
    ws["A"+row] = makeCell("", infoSt);
    ws["B"+row] = makeCell("编制：" + (data.projectName||""), infoSt);
    ws["C"+row] = makeCell("", infoSt);
    ws["D"+row] = makeCell("", infoSt);
    ws["E"+row] = makeCell("", infoSt);
    ws["F"+row] = makeCell("审核：", infoSt);
    ws["G"+row] = makeCell("批准：", infoSt);
    mergeRange(ws, row-1, 1, row-1, 4);
    row++;

    ws["!ref"] = "A1:G" + (row - 1);
    ws["!rows"] = [];
    for (var i = 0; i < row; i++) ws["!rows"][i] = { hpt: i === 0 ? 30 : (i === 1 ? 22 : 20) };
    return ws;
  }

  function forEachCol(fn) {
    for (var i = 0; i <= 6; i++) fn(["A","B","C","D","E","F","G"][i], i);
  }

  // ── 主导出函数 ───────────────────────────────────────────
  function toExcel(data) {
    if (typeof XLSX === "undefined") {
      alert("⚠️ 未加载 SheetJS 库，请确认 lib/xlsx.full.min.js 已放入 lib 文件夹");
      return;
    }

    const wb = XLSX.utils.book_new();
    const sheets = data.exportSheets || { includeReq: true, includeConfig: true };

    if (sheets.includeReq) {
      const wsReq = buildReqSheet(data);
      XLSX.utils.book_append_sheet(wb, wsReq, "非标需求表");
    }

    if (sheets.includeConfig) {
      const wsConfig = buildConfigSheet(data);
      const sheetName = (data.projectName + "_配置表").slice(0, 31);
      XLSX.utils.book_append_sheet(wb, wsConfig, sheetName);
    }

    XLSX.writeFile(wb, `${data.projectName}_储能柜配置表.xlsx`);
  }

  return { toExcel };
})();
