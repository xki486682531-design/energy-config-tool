// ============================================================
// data.js — 全局产品数据配置
// ============================================================
//
// 本文件定义储能柜配置工具所需的所有产品编码、描述及需求表选项。
// 数据以 `DATA` 对象导出，供 ui.js / form.js / export.js / admin.js 使用。
//
// 【数据结构说明】
//   DATA.storageCabinets : 储能柜产品列表（一体式储能系统）
//   DATA.combiners       : 汇流柜 / 配电机柜
//   DATA.transformers    : 互感器（电流互感器 CT）
//   DATA.monitorCabinets : 监控箱
//   DATA.pntTerminals    : PNT 端子（冷压端子）
//   DATA.cables          : 线缆（系统成套线缆）
//   DATA.serialServers   : 串口服务器
//   DATA.secondaryMeters : 二次电表
//   DATA.primaryMeters   : 一次电表
//   DATA.routers        : 路由器
//   DATA.switches       : 交换机
//   DATA.powerModules   : 电源模块
//   DATA.ems            : EMS（监控模块）
//   DATA.simCards       : 流量卡
//   DATA.emsAccessories : EMS配套配件（固定3个，自动生成）
//   DATA.displays      : 液晶显示屏（固定1个）
//   DATA.dviCables     : DVI线缆（数量随显示屏同步）
//   DATA.reqOptions    : 需求表各字段的下拉选项
//
// 【管理员覆盖机制】
//   管理员可在后台修改产品编码，修改后保存至 localStorage['ess_products_override']。
//   应用启动时（index.html init）会读取该 key 并 Object.assign 到 DATA，
//   实现"本地覆盖默认数据"的效果。
// ============================================================

// ── 从储能柜产品提取并网功率选项 ─────────────────────
function extractPowerOptions() {
  const powers = DATA.storageCabinets.map(item => {
    const parts = item.desc.split('\\');
    // parts[2] = 功率字段，如 "125KW"、"218KW"
    const raw = (parts[2] || '').replace(/KW/i, '').trim();
    const num = parseFloat(raw);
    return isNaN(num) ? null : num;
  }).filter(v => v !== null);
  const unique = [...new Set(powers)].sort((a, b) => a - b);
  return unique.map(v => v + 'kW');
}

// ── 从储能柜产品提取容量选项（单台容量下拉用）────────
function extractCapacityOptions() {
  const caps = DATA.storageCabinets.map(item => {
    const parts = item.desc.split('\\');
    // parts[3] = 容量字段，如 "215KWh"、"241"、"218KWh"
    let raw = (parts[3] || '').replace(/[^0-9.]/g, '').trim();
    let num = parseFloat(raw);
    // 如果 parts[3] 提取不到有效数字，尝试从整个 desc 中搜索 xxxKWh
    if (isNaN(num) || num <= 0) {
      const m = item.desc.match(/(\d+(?:\.\d+)?)\s*[Kk][Ww][Hh]/);
      if (m) num = parseFloat(m[1]);
    }
    return (isNaN(num) || num <= 0) ? null : num;
  }).filter(v => v !== null);
  const unique = [...new Set(caps)].sort((a, b) => a - b);
  return unique.map(v => String(Math.round(v)));
}

const DATA = {

  // ── 储能柜（一体式储能系统）─────────────────────────────
  // 描述格式：产品名称\型号\功率\容量\其他参数...
  // 注意：ui.js 中 getStorageCabinetOptions() 会根据容量（kWh）过滤显示
  storageCabinets: [
    { code: "201130002", desc: "一体式储能系统\\ICB125K215D-CF3E\\125KW\\215KWh\\62.5KW\\非隔离\\电池空调+模块风冷\\并离网同口" },
    { code: "201130004", desc: "一体式储能系统\\ICB125K215G-CF3E\\125KW\\215KWh\\62.5KW\\非隔离\\并网\\电池空调+模块风冷" },
    { code: "201130005", desc: "一体式储能系统\\IEB420K4ES-350LL3C-3\\420KW\\350KWh\\35KW\\隔离\\带STS\\备电系统" },
    { code: "201130006", desc: "一体式储能系统\\ICB241kWh-120kW-A-G-LF3E\\120KW\\241KWh\\62.5KW\\并网\\非隔离\\0.5C\\风冷PCS\\液冷PACK\\亿纬电芯\\标配" },
    { code: "201130008", desc: "一体式储能系统\\ICB241kWh-120kW-A-G-LF3H\\120KW\\241kWH\\62.5kW\\否\\0.5C\\风冷PCS\\液冷PACK\\海辰电芯\\标配" },
    { code: "201130015", desc: "一体式储能系统\\ICB241kWh-120kW-A-G-LF3E\\120KW\\241KWh\\62.5KW\\非隔离\\PCS风冷\\电池液冷\\新淼空调\\纯并网\\降噪" },
    { code: "201130016", desc: "一体式储能系统\\ICB218kWh-187kW-30kW-A-D-LF3C-F1-E\\187KW\\218KWh\\62.5KW\\非隔离\\光伏30KW\\并离网\\风冷PCS\\液冷宁德电池\\标配" },
    { code: "201130017", desc: "一体式储能系统\\ICB218kWh-218kW-A-G-LF3C-E\\218KW\\218KWh\\62.5\\非隔离\\纯并网\\风冷PCS\\液冷宁德电池\\标配" },
    { code: "201130019", desc: "一体式储能系统\\ICB241kWh-120kW-A-D-LF3E-E\\120KW\\241kWh\\非隔离\\并离网\\风冷PCS\\亿纬电芯\\0.5P\\海外版CE" },
    { code: "201130021", desc: "一体式储能系统\\ICB241kWh-120kW-60kW-A-D-LF3E-F2-E\\120KW\\241\\62.5kW+30kW\\非隔离\\光伏60kw\\并离网\\风冷PCS\\亿纬电芯\\0.5P海外版CE" },
    { code: "201130025", desc: "一体式储能系统\\ICB241kWh-120kW-A-G-LF3H\\120KW\\241KWh\\62.5KW\\否\\海晨电芯\\降本\\多机版\\无断路器电表" },
    { code: "201130026", desc: "一体式储能系统\\ICB241kWh-120kW-A-G-LF3H\\120KW\\241KWh\\62.5KW\\否\\海晨电芯\\降本\\单机版\\带断路器电表" },
    { code: "201130024", desc: "一体式储能系统\\ICB261kWh-125kW-A-G-LF3H\\125KW\\261KWh\\62.5kW\\非隔离\\并网国内版" },
    { code: "201130027", desc: "一体式储能系统\\ICB261kWh-125kW-A-G-LF3H\\125KW\\261KWh\\62.5KW\\非隔离\\国内单机并网版\\含断路器电表\\无汇流柜" },
    { code: "201130029", desc: "一体式储能系统\\ICB241kWh-120kW-A-G-LF3E\\120KW\\241KWh\\62.5\\否\\亿纬电芯\\降本\\多机版\\无断路器电表" },
    { code: "201130030", desc: "一体式储能系统\\ICB241kWh-120kW-A-G-LF3E\\120KW\\241KWh\\62.5KW\\否\\亿纬电芯\\降本\\单机版\\带电表断路器" },
    { code: "F01130001", desc: "一体式储能系统\\ICB125K215G-CF3H\\125KW\\215KWh\\62.5KW\\非隔离\\电池空调+模块风冷\\并网\\海辰电芯" },
    { code: "F01130005", desc: "一体式储能系统\\ICB218kWh-218kW-A-G-LF3C-E\\218KW\\218kWh\\62.5kW\\非隔离\\法国定制水蓝砂纹颜色" },
    { code: "F01130006", desc: "一体式储能系统\\ICB218kWh-218kW-A-G-LF3\\218KW\\218KWh\\62.5KW\\非隔离\\不含电池和PCS\\EXIC定制" },
    { code: "F01130007", desc: "一体式储能系统\\ICB241KWH-120KW-A-G-LE3E\\120KW\\241KWH\\62.5KW\\非隔离\\整柜全氟已酮" },
    { code: "F01130008", desc: "一体式储能系统\\ICB241kWh-120kW-30kW-A-D-LF3H-F1\\120KW\\241kWh\\62.5kW\\非隔离\\国内机柜\\海辰电芯\\含光伏30kw" },
    { code: "F01130009", desc: "一体式储能系统\\ICB241kWh-120kW-A-D-LF3E-E\\120KW\\241kWh\\62.5kW\\非隔离\\国内柜体\\海辰电芯" },
    { code: "F01130011", desc: "一体式储能系统\\ICB241kWh-120kW-A-D-LF3E\\120KW\\241\\62.5\\非隔离\\并离网\\0.5C\\风冷PCS\\液冷PACK\\亿纬电芯" },
    { code: "F01130013", desc: "一体式储能系统\\ICB241kWh-120kW-A-G-LF3H\\120KW\\241kWh\\62.5kW\\非隔离\\纯并网\\海晨电芯\\整柜全氟己酮\\PACK级全氟己酮" },
    { code: "F01130014", desc: "一体式储能系统\\ICB241kWh-120kW-A-G-LF3E\\120KW\\241kWh\\62.5kW\\否\\降本\\并机版\\无电表断路器" },
    { code: "F01130015", desc: "一体式储能系统\\ICB241kWh-120kW-A-G-LF3E\\120KW\\241kWh\\62.5kW\\否\\降本\\单机版\\含电表断路器" },
    { code: "F01130016", desc: "一体式储能系统\\ICB241kWh-120kW-A-G-LF3H\\120KW\\241KWh\\62.5KW\\非隔离\\0.5C\\风冷PCS\\液冷PACK\\海辰电芯\\整柜全氟已酮" },
    { code: "F01130017", desc: "一体式储能系统\\ICB241kWh-120kW-A-G-LF3H\\120KW\\241kWh\\62.5kW\\否\\海晨电芯\\降本\\并机版\\无断路器电表" },
    { code: "F01130018", desc: "一体式储能系统\\ICB241kWh-120kW-A-G-LF3H\\62.5KW\\241KWh\\62.5KW\\否\\海晨电芯\\降本\\单机版\\带断路器电表" },
    { code: "F01130020", desc: "一体式储能系统\\ICB261kWh-125kW-A-G-LF3E\\125KW\\261\\62.5KW\\非隔离\\国内并网版" },
    { code: "F01130023", desc: "一体式储能系统\\ICB241kWh-120kW-60kW-A-G-LF3H-F2-E\\120KW\\241KWh\\62.5KW\\非隔离\\并网\\光伏60KW\\海辰电芯" },
    { code: "F01130024", desc: "一体式储能系统\\ICB241kWh-120kW-A-S-LF3E-E\\120KW\\241\\62.5\\非隔离\\离网\\风冷PCS\\亿纬电芯\\0.5P\\海外版CE" },
    { code: "F01130025", desc: "一体式储能系统\\ICB241kWh-62.5kW-60kW-A-G-LF3E\\62.5KW\\241KWh\\62.5kW\\非隔离\\光伏60kW\\直流输出40kW" },
    { code: "F01130026", desc: "一体式储能系统\\ICB261kWh-125kW-A-G-LF3E\\125KW\\261KWh\\62.5KW\\非隔离\\国内单机并网版\\含断路器电表\\无汇流柜\\亿纬电芯" },
    { code: "F01130029", desc: "一体式储能系统\\ICB125K215G-CF3C\\125KW\\215KWh\\62.5KW\\非隔离\\并网\\电池空调+模块风冷\\整柜全氟己酮" },
  ],

  // ── 汇流柜 / 配电机柜（交流三相，多路汇流）──────────────
  // 描述格式：配电机柜\型号\尺寸\交流三相\X路汇流\安装方式\版本
  combiners: [
    { code: "201090029", desc: "配电机柜\\IAS220ATT-AI-3\\650*400*1200mm\\交流三相\\3路汇流\\立柜可壁挂\\国内版" },
    { code: "201090028", desc: "配电机柜\\IAS220ATX-AI-3\\800*600*1800mm\\交流三相\\6路汇流\\立柜式\\国内版" },
  ],

  // ── 二次电表（挂在储能柜侧，用于防逆流/抄表）────────────
  secondaryMeters: [
    { code: "206010092", desc: "电表\\3*220/380V\\3*1(6)A\\6400bps\\0.5S级\\单路RS485\\自带mA级互感器\\快速版" },
    { code: "206010091", desc: "电表\\3*220/380V\\3*1(6)A\\6400bps\\0.5S级\\双路RS485\\自带mA级互感器" },
  ],

  // ── 一次电表（并网侧，用于抄表需求）────────────────────
  primaryMeters: [
    { code: "206010126", desc: "电表\\3*220/380V\\3*10(80)A\\9600bps\\0.5\\RS485\\快速采样表\\CE标识\\英文铭牌" },
  ],

  // ── 路由器（4G/WIFI，用于联网监控）─────────────────────
  routers: [
    { code: "202310076", desc: "监控模块\\EVLTE1-CN\\USB Dongle\\塑料外壳\\双频WIFI\\BLE5.4\\4G\\中国\\印度\\香港\\不带包材（只能带一台储能柜）" },
    { code: "250010007", desc: "路由器\\ZR2720S\\工业4G\\配圆盘天线\\电源线（无电源适配器）\\上行50Mbps，下行100Mbps（4G路由，3台以内）" },
    { code: "250110008", desc: "系统用路由器\\4G\\全网通\\4 LAN 1WAN\\配圆盘天线\\电源线\\双卡\\上行50Mbps，下行100Mbps（6台以上推荐）" },
    { code: "250010008", desc: "无线路由器\\ZR2720E\\欧洲版\\工业4G\\配圆盘天线\\配电源线\\网线（海外版，单机）" },
    { code: "250110012", desc: "系统用路由器\\4G\\全球版（不含俄罗斯和白俄罗斯）\\1 LAN\\150 DL\\50 UL Mbps\\配电源线，天线，网线，1SIM卡口\\CE\\UL\\CSA\\FCC（海外版，单机）" },
    { code: "250110007", desc: "系统用路由器\\4G\\欧洲版\\工业4G\\4 LAN 1WAN\\ZR5720E\\双天线\\配电源线\\网线（海外版，1带5）" },
  ],

  // ── 交换机（多台柜组网用）──────────────────────────────
  switches: [
    { code: "250140003", desc: "系统用交换机\\16口百兆非网管型交换机，DC12~48V\\国内，海外，CE" },
    { code: "250040007", desc: "交换机\\IES318 工业级8路网口交换机\\DC12V-48V（导轨式）" },
    { code: "250140004", desc: "系统用交换机\\百兆非网管型交换机\\24个10/100M自适应以太网端口\\冗余电源\\电源220Vac\\1U（24口）" },
  ],

  // ── 电源模块（为系统提供辅助电源）───────────────────────
  powerModules: [
    { code: "202800065", desc: "电源模块\\LRS-75-24\\辅助电源(75W 24V）\\国内（体积小）" },
    { code: "202800076", desc: "电源模块\\75W\\24V\\RSP-75-24\\国内" },
    { code: "202800083", desc: "电源模块\\WDR-120-24\\辅助电源(24V,120W)\\CE，海外" },
  ],

  // ── EMS / 监控模块（控制器大脑）─────────────────────────
  ems: [
    { code: "202310024", desc: "监控模块\\IMMU2充电机计费单元-带包材（无4G模块，需配置4G路由）" },
    { code: "202310143", desc: "监控模块\\IMMU2LTE\\IMMU2充电机计费单\\带包材\\内置国内4G_CAT1模块（内置4G，无需路由，需加4G天线204110155）" },
  ],

  // ── 流量卡（物联网卡，装入4G路由使用）──────────────────
  simCards: [
    { code: "280030863", desc: "物联卡\\插拔卡三切卡\\1G/月\\2年套餐（安装于4G路由中）" },
    { code: "280030343", desc: "物联卡\\电信卡\\6G/年（安装于4G路由中）" },
  ],

  // ── EMS 配套配件（固定 3 个，自动生成，数量 = EMS 数量）
  emsAccessories: [
    { code: "204110155", desc: "采购成套电缆\\4G天线LTE TD GSM\\GPRS\\3G\\2.4G三网信号接收发射室外防水2米SMA（安装于IMMU2中）" },
    { code: "214180089", desc: "接线端子\\300V\\10A\\4PIN\\5.08mm\\green\\PCB插拔式接线端子台\\无法兰插头（MU2电源对插端子）" },
    { code: "114120112", desc: "普通插头\\4PIN\\160V\\8ASingle Row\\3.81mm\\UL（MU2 RS485接线端子）" },
  ],

  // ── 液晶显示屏（固定 1 个型号，数量自动配置）───────────
  displays: [
    { code: "223040023", desc: "液晶显示模块\\7寸液晶屏\\LMT070DICFWD-AKA-4M" },
  ],

  // ── DVI 线缆（数量随液晶显示屏自动同步）───────────────
  dviCables: [
    { code: "204110245", desc: "采购成套电缆\\组态屏用DVI线缆\\P25042010a (L=700MM)（液晶屏线缆）" },
    { code: "204110131", desc: "采购成套电缆\\组态屏用DVI线缆\\(L=1500MM)（液晶屏线缆，无汇流柜/主站控，更通用）" },
  ],

  // ── 互感器（电流互感器 CT，用于系统电流测量）───────────
  // 描述格式：互感器\变比\尺寸\额定电流\精度等级\其他...
  transformers: [
    { code: "209060044", desc: "互感器\\1000:5\\114*139*36mm\\1000A\\开合式0.5级(5VA)" },
    { code: "209060045", desc: "互感器\\1500:5\\162*122*50mm\\1500A\\0.5级\\CE" },
    { code: "209060037", desc: "互感器\\2000:5\\224*144*52mm\\2000A\\开口0.5S级\\电流互感器" },
    { code: "509060015", desc: "临时编码\\互感器\\500:5\\102*128*45mm\\500A\\0.5s级\\开孔尺寸62*32mm" },
  ],

  // ── 监控箱（安装站控 EMS 用）───────────────────────────
  monitorCabinets: [
    { code: "221501459", desc: "系统组件\\监控柜\\安装站控EMS\\落地式" },
  ],

  // ── PNT 端子（冷压圆形端子，用于线缆压接）───────────────
  pntTerminals: [
    { code: "214170154", desc: "冷压端子\\圆形端子\\紫铜\\镀锡\\50-70mm2\\PNT-60\\ROHS\\N线快插头压接" },
    { code: "214170153", desc: "冷压端子\\圆形端子\\紫铜\\镀锡\\70-95mm2\\PNT-70\\ROHS\\交流快插头压接" },
  ],

  // ── 线缆（系统成套线缆，连接各设备）─────────────────────
  cables: [
    { code: "204180320", desc: "开关电源供电线缆+EMS供电线缆+PE线缆\\电源线压接TE0508端子\\PE压接OT端子\\红色+黑色+黄绿色\\各1.5米" },
    { code: "504130473", desc: "临时编码\\系统成套线缆\\ICB241kWh-120kW-A-S-LFXX-SL03\\站控ABU至储能柜并机线缆" },
    { code: "204132290", desc: "系统成套线缆\\ICB241kWh-120kW-A-S-LFXX-SL04\\储能柜间并机线缆" },
    { code: "204132412", desc: "系统成套线缆\\ICB241kWh-120kW-A-S-LF3E-E-SL06\\STS柜与单台储能柜连接线\\网线+电源线" },
    { code: "204132462", desc: "系统成套线缆\\ICB241kWh-120kW-A-S-LF3E-E-SL07\\STS柜与单台储能柜8米间距连接线\\并机线+网线+动力电源线" },
  ],

  // ── 串口服务器（RS485 转以太网，导轨式/壁挂式）─────────
  serialServers: [
    { code: "251050020", desc: "其他模块\\8路串口服务器\\151*58*127mm\\RS485转以太网\\导轨式\\8个RS485+2个百兆以太网口\\无电源适配器" },
    { code: "251050019", desc: "临时编码\\其他模块\\4路串口服务器\\128*40*103mm\\RS485转以太网\\导轨式\\4路RS485\\2个百兆以太网口" },
    { code: "251050018", desc: "其他模块\\二路串口服务器\\91*72*25mm\\串口和网口之间双向数据传输\\壁挂式\\带安规电源适配器\\2*RS232/2*RS485" },
  ],

  // ── STS 柜（静态切换开关柜，用于并离网切换）─────────
  stsCabinets: [
    { code: "STS-TBD", desc: "STS柜\\静态切换开关\\并离网自动切换" },
  ],

  // ── 需求表下拉选项（供 ui.js renderRequirements() 渲染用）
  // 每个字段是一个字符串数组，第一个元素为默认选中项
  reqOptions: {
    yesNo:          ["不需要", "需要"],
    yesNoNeed:      ["不需要", "需要"],
    needYes:        ["需要", "不需要"],
    monitorCabinet: ["不需要", "需要"],
    busCabinet:     ["不需要", "需要"],
    isolation:      ["不需要", "需要"],
    offGrid:        ["不需要", "需要"],
    nLine:          ["N线不断,保持接地", "N线断开"],
    fastSwitch:     ["不需要", "需要"],
    sts:            ["不需要", "需要"],
    diesel:         ["不需要", "需要"],
    solar:          ["不需要", "需要"],
    cabinetCable:   ["不需要", "需要"],
    regions:        ["请选择地区", "华东", "华南", "华中", "华北", "西南", "西北", "东北", "港澳台", "海外"],
    packCool:       ["液冷", "风冷", "其他"],
    scene:          ["拓扑1", "拓扑2", "拓扑3","拓扑4","拓扑5","拓扑6","拓扑7","其他"],
    antiReverse:    ["需要", "不需要"],
    meterRead:      ["需要", "不需要"],
    demandMgmt:     ["不需要", "需要"],
    acSwitch:       ["标准配置", "定制"],
    network:        ["4G路由", "WIFI", "有线", "其他"],
    cellBrand:      ["INFY/EVE", "CATL", "海辰", "其他"],
    simCard:        ["需要", "不需要"],
    silkPrint:      ["INFY丝印", "客户定制"],
    nameplate:      ["采用INFY信息", "客户定制"],
    software:       ["INFY后台", "客户定制"],
    liftHook:       ["不需要", "需要"],
    monitorDemand:  ["需要", "不需要"],
    voltageLevel:   ["0.4kV", "10kV", "35kV"],
    powerLevel:     [],  // 动态生成，见下方
    capacityLevel:  [],  // 动态生成，见下方
  },

};

// ── 从储能柜产品中提取并网功率选项 ────────────────
DATA.reqOptions.powerLevel = ["请选择功率"].concat(extractPowerOptions());

// ── 从储能柜产品中提取容量选项（单台容量下拉用）────
DATA.reqOptions.capacityLevel = ["请选择容量"].concat(extractCapacityOptions());

// ── 需求字段注册表（ui.js renderRequirements 用）─────────────
DATA.reqFieldRegistry = [
  // A. 项目基本信息
  { id: "r-projectName", section: "A", label: "项目名称", type: "text" },
  { id: "r-location", section: "A", label: "项目地区", type: "select", options: DATA.reqOptions.regions },
  { id: "r-voltage", section: "A", label: "并网电压", type: "select", options: DATA.reqOptions.voltageLevel, defaultValue: "0.4kV" },
  { id: "r-power", section: "A", label: "并网功率", type: "select", options: DATA.reqOptions.powerLevel },
  { id: "r-capacity", section: "A", label: "单台容量(kWh)", type: "select", options: DATA.reqOptions.capacityLevel },
  { id: "r-cabinetDemandQty", section: "A", label: "需求台数", type: "text", defaultValue: "1" },
  { id: "r-packCool", section: "A", label: "PACK冷却方式", type: "select", options: DATA.reqOptions.packCool },
  { id: "r-cellBrand", section: "A", label: "电芯品牌", type: "select", options: DATA.reqOptions.cellBrand },
  { id: "r-scene", section: "A", label: "应用场景/拓扑", type: "select", options: DATA.reqOptions.scene },
  { id: "r-contractNo", section: "A", label: "合同编号", type: "text" },

  // B. 并网与电气需求
  { id: "r-antiReverse", section: "B", label: "防逆流", type: "select", options: DATA.reqOptions.antiReverse, linkedBlockId: "block-sm", linkedCategory: "secondaryMeters", hiddenOn: "不需要", defaultValue: "需要" },
  { id: "r-meterRead", section: "B", label: "抄表", type: "select", options: DATA.reqOptions.meterRead, linkedBlockId: "block-pm", linkedCategory: "primaryMeters", hiddenOn: "不需要", defaultValue: "需要" },
  { id: "r-busCabinet", section: "B", label: "汇流柜", type: "select", options: DATA.reqOptions.busCabinet, linkedBlockId: "block-bus", linkedCategory: "combiners", hiddenOn: "不需要", defaultValue: "不需要" },
  { id: "r-isolation", section: "B", label: "隔离变压器", type: "select", options: DATA.reqOptions.isolation },
  { id: "r-offGrid", section: "B", label: "离网功能", type: "select", options: DATA.reqOptions.offGrid },
  { id: "r-nLine", section: "B", label: "N线处理", type: "select", options: DATA.reqOptions.nLine },
  { id: "r-fastSwitch", section: "B", label: "快切功能", type: "select", options: DATA.reqOptions.fastSwitch },
  { id: "r-sts", section: "B", label: "STS功能", type: "select", options: DATA.reqOptions.sts, linkedBlockId: "block-sts", linkedCategory: "stsCabinets", hiddenOn: "不需要", defaultValue: "不需要" },
  { id: "r-diesel", section: "B", label: "柴发接入", type: "select", options: DATA.reqOptions.diesel },
  { id: "r-solar", section: "B", label: "光伏接入", type: "select", options: DATA.reqOptions.solar },
  { id: "r-acSwitch", section: "B", label: "交流断路器", type: "select", options: DATA.reqOptions.acSwitch },
  { id: "r-demandMgmt", section: "B", label: "需求管理", type: "select", options: DATA.reqOptions.demandMgmt },
  { id: "r-cabinetCable", section: "B", label: "柜间线缆", type: "select", options: DATA.reqOptions.cabinetCable },

  // C. 网络与监控
  { id: "r-network", section: "C", label: "网络方式", type: "select", options: DATA.reqOptions.network },
  { id: "r-simCard", section: "C", label: "流量卡", type: "select", options: DATA.reqOptions.simCard },
  { id: "r-monitorCabinet", section: "C", label: "监控柜", type: "select", options: DATA.reqOptions.monitorCabinet, linkedBlockId: "block-monitor", linkedCategory: "monitorCabinets", hiddenOn: "不需要", defaultValue: "不需要" },
  { id: "r-monitorDemand", section: "C", label: "监控需求", type: "select", options: DATA.reqOptions.monitorDemand },
  { id: "r-software", section: "C", label: "后台软件", type: "select", options: DATA.reqOptions.software },
  { id: "r-gridPoint", section: "C", label: "并网点", type: "text" },

  // D. 外观与其他
  { id: "r-silkPrint", section: "D", label: "丝印", type: "select", options: DATA.reqOptions.silkPrint },
  { id: "r-nameplate", section: "D", label: "铭牌", type: "select", options: DATA.reqOptions.nameplate },
  { id: "r-liftHook", section: "D", label: "吊钩", type: "select", options: DATA.reqOptions.liftHook },
  { id: "r-otherReq", section: "D", label: "其他需求", type: "textarea" },
];

// ── 联动类别注册表（供 buildBlockVisibility 用）─────────────
DATA.categoryRegistry = [
  { key: "storageCabinets", name: "储能柜（一体式储能系统）" },
  { key: "secondaryMeters", name: "二次电表" },
  { key: "primaryMeters", name: "一次电表" },
  { key: "combiners", name: "汇流柜/配电机柜" },
  { key: "stsCabinets", name: "STS柜" },
  { key: "transformers", name: "互感器（CT电流互感器）" },
  { key: "routers", name: "路由器（4G/WIFI）" },
  { key: "switches", name: "交换机" },
  { key: "powerModules", name: "电源模块" },
  { key: "ems", name: "EMS/监控模块" },
  { key: "simCards", name: "流量卡" },
  { key: "displays", name: "液晶显示屏" },
  { key: "monitorCabinets", name: "监控箱" },
  { key: "serialServers", name: "串口服务器" },
  { key: "cables", name: "系统成套线缆" },
  { key: "pntTerminals", name: "PNT冷压端子" },
  { key: "dviCables", name: "DVI线缆" },
  { key: "emsAccessories", name: "EMS配套配件" },
];
