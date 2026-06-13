/* ═══════════════════════════════════════════════════════════════
   拓扑元件库 — 储能系统标准元件定义
   管理员维护元件，用户拖拽组合，系统自动生成拓扑图
═══════════════════════════════════════════════════════════════ */

var COMPONENT_CATEGORIES = [
  { id:'storage',  name:'储能设备', icon:'🔋' },
  { id:'power',    name:'电力电子', icon:'⚡' },
  { id:'control',  name:'控制系统', icon:'🖥️' },
  { id:'trans',    name:'变电设备', icon:'🔌' },
  { id:'dist',     name:'配电设备', icon:'📊' },
  { id:'gen',      name:'发电设备', icon:'☀️' },
  { id:'load',     name:'负荷',     icon:'🏭' },
  { id:'aux',      name:'辅助系统', icon:'🛡️' },
  { id:'meter',    name:'仪表设备', icon:'📟' },
  { id:'switchgear', name:'开关设备', icon:'🔌' },
  { id:'gridcon',   name:'并网系统', icon:'🔗' },
  { id:'busbar',    name:'母线系统', icon:'📊' },
  { id:'network',   name:'通信设备', icon:'🌐' }
];

// ══ 线缆类型定义 ══
var CABLE_TYPES_DEFAULTS = [
  { id:'ethernet',       name:'网线',           color:'#3498DB', width:2,   dash:'none',     label:'ETH' },
  { id:'ethernet-outdoor', name:'超五类室外网线', color:'#2471A3', width:2.5, dash:'none',     label:'ETH-OUT' },
  { id:'rs485',         name:'RS485',          color:'#9B59B6', width:2,   dash:'4 3',     label:'RS485' },
  { id:'can',           name:'CAN总线',        color:'#E67E22', width:2,   dash:'6 3',     label:'CAN' },
  { id:'power220v',      name:'220V电源线',      color:'#E74C3C', width:3,   dash:'none',     label:'AC220V' },
  { id:'power24v',      name:'24V电源线',       color:'#F39C12', width:2.5, dash:'none',     label:'DC24V' },
  { id:'power12v',      name:'12V电源线',       color:'#2ECC71', width:2.5, dash:'none',     label:'DC12V' },
  { id:'sts',           name:'STS并机线缆',    color:'#9B59B6', width:3,   dash:'none',     label:'STS' },
  { id:'ac-cable',      name:'交流电缆',        color:'#E74C3C', width:3,   dash:'none',     label:'AC' },
  { id:'dc-cable',      name:'直流电缆',        color:'#3498DB', width:3,   dash:'none',     label:'DC' },
  { id:'hv-cable',      name:'高压电缆',        color:'#C0392B', width:3.5, dash:'none',     label:'HV' },
  { id:'lv-cable',      name:'低压电缆',        color:'#E74C3C', width:2.5, dash:'none',     label:'LV' },
  { id:'bus10k',        name:'10kV母线',        color:'#E74C3C', width:4,   dash:'8 4',     label:'10kV' }
];
var CABLE_TYPES = [];
var CABLE_BY_ID = {};
// 从存储加载线缆类型，回退到默认值
function _loadCableTypes() {
  try {
    var stored = STORAGE.get('cableTypes');
    if (stored && Array.isArray(stored) && stored.length > 0) {
      CABLE_TYPES = stored;
    } else {
      CABLE_TYPES = JSON.parse(JSON.stringify(CABLE_TYPES_DEFAULTS));
    }
  } catch(e) {
    CABLE_TYPES = JSON.parse(JSON.stringify(CABLE_TYPES_DEFAULTS));
  }
  _rebuildCableById();
}
function _rebuildCableById() {
  CABLE_BY_ID = {};
  CABLE_TYPES.forEach(function(c) { CABLE_BY_ID[c.id] = c; });
}
function saveCableTypes() {
  STORAGE.set('cableTypes', CABLE_TYPES);
  _rebuildCableById();
}
// 初始化（STORAGE 可能还未就绪，延迟加载）
_loadCableTypes();

var COMPONENT_LIB = [
  /* ─── 储能设备 ─── */
  {
    id:'ess-cabinet',  category:'storage',
    name:'储能柜',      label:'储能柜',
    width:90, height:60,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<rect x="8" y="6" width="74" height="48" rx="6" class="comp-body" fill="rgba(26,188,156,0.18)" stroke="#1ABC9C" stroke-width="2.5"/>'+
         '<rect x="16" y="14" width="24" height="8" rx="2" fill="#1ABC9C" opacity="0.6"/>'+
         '<rect x="16" y="26" width="24" height="8" rx="2" fill="#1ABC9C" opacity="0.6"/>'+
         '<rect x="16" y="38" width="24" height="8" rx="2" fill="#1ABC9C" opacity="0.6"/>'+
         '<line x1="48" y1="18" x2="72" y2="18" stroke="#1ABC9C" stroke-width="1.5" stroke-dasharray="3 2"/>'+
         '<line x1="48" y1="30" x2="72" y2="30" stroke="#1ABC9C" stroke-width="1.5" stroke-dasharray="3 2"/>'+
         '<line x1="48" y1="42" x2="72" y2="42" stroke="#1ABC9C" stroke-width="1.5" stroke-dasharray="3 2"/>'+
         '<line x1="44" y1="18" x2="44" y2="42" stroke="#1ABC9C" stroke-width="1.5"/>',
    desc:'电池储能柜，含电池模组与BMS从控'
  },

  /* ─── 电力电子 ─── */
  {
    id:'pcs',  category:'power',
    name:'PCS',  label:'PCS\n储能变流器',
    width:80, height:60,
    ports:[
      { id:'top', side:'top', x:0.5, y:0 },
      { id:'bottom', side:'bottom', x:0.5, y:1 },
      { id:'left', side:'left', x:0, y:0.5 },
      { id:'right', side:'right', x:1, y:0.5 }
    ],
    svg:
      /* 外壳 */
      '<rect x="6" y="4" width="68" height="52" rx="6" fill="rgba(243,156,18,0.15)" stroke="#F39C12" stroke-width="2.5"/>'+
      /* IGBT 功率模块 */  
      '<rect x="14" y="10" width="22" height="14" rx="3" fill="rgba(243,156,18,0.25)" stroke="#F39C12" stroke-width="1.2"/>'+
      '<text x="25" y="19" text-anchor="middle" font-size="5.5" fill="#F39C12" font-weight="700">IGBT</text>'+
      '<rect x="42" y="10" width="22" height="14" rx="3" fill="rgba(243,156,18,0.25)" stroke="#F39C12" stroke-width="1.2"/>'+
      '<text x="53" y="19" text-anchor="middle" font-size="5.5" fill="#F39C12" font-weight="700">IGBT</text>'+
      /* 散热片 */
      '<line x1="12" y1="28" x2="66" y2="28" stroke="#F39C12" stroke-width="1.2" opacity="0.5"/>'+
      '<line x1="12" y1="31" x2="66" y2="31" stroke="#F39C12" stroke-width="1.2" opacity="0.5"/>'+
      '<line x1="12" y1="34" x2="66" y2="34" stroke="#F39C12" stroke-width="1.2" opacity="0.5"/>'+
      /* AC符号 */
      '<path d="M22 42 Q28 36 34 42 Q40 48 46 42 Q52 36 58 42" fill="none" stroke="#F39C12" stroke-width="2" stroke-linecap="round"/>'+
      /* DC 箭头 */
      '<polygon points="62,39 66,42 62,45" fill="#F39C12" opacity="0.7"/>'+
      /* 底部标签 */
      '<text x="40" y="53" text-anchor="middle" font-size="7" fill="#F39C12" font-weight="600">PCS</text>',
    desc:'储能变流器，AC/DC双向变换'
  },

  /* ─── 控制系统 ─── */
  {
    id:'bms',  category:'control',
    name:'BMS',  label:'BMS\n电池管理系统',
    width:80, height:60,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<rect x="6" y="4" width="68" height="52" rx="6" class="comp-body" fill="rgba(52,152,219,0.15)" stroke="#3498DB" stroke-width="2.5"/>'+
         '<line x1="18" y1="16" x2="18" y2="44" stroke="#3498DB" stroke-width="1.8"/>'+
         '<line x1="28" y1="20" x2="28" y2="44" stroke="#3498DB" stroke-width="1.8"/>'+
         '<line x1="38" y1="24" x2="38" y2="44" stroke="#3498DB" stroke-width="1.8"/>'+
         '<line x1="48" y1="28" x2="48" y2="44" stroke="#3498DB" stroke-width="1.8"/>'+
         '<line x1="58" y1="32" x2="58" y2="44" stroke="#3498DB" stroke-width="1.8"/>',
    desc:'电池管理系统，监控电芯状态'
  },
  {
    id:'ems',  category:'control',
    name:'EMS',  label:'EMS\n能量管理系统',
    width:80, height:60,
    ports:[
      { id:'top', side:'top', x:0.5, y:0 },
      { id:'bottom', side:'bottom', x:0.5, y:1 },
      { id:'left', side:'left', x:0, y:0.5 },
      { id:'right', side:'right', x:1, y:0.5 }
    ],
    svg: '<rect x="6" y="4" width="68" height="52" rx="6" class="comp-body" fill="rgba(155,89,182,0.15)" stroke="#9B59B6" stroke-width="2.5"/>'+
         '<rect x="14" y="12" width="52" height="28" rx="3" fill="#9B59B6" opacity="0.2"/>'+
         '<line x1="20" y1="34" x2="60" y2="34" stroke="#9B59B6" stroke-width="1.5"/>'+
         '<polygon points="34,22 38,16 42,22" fill="#9B59B6" opacity="0.5"/>',
    desc:'能量管理系统，站级调度控制'
  },

  /* ─── 变电设备 ─── */
  {
    id:'transformer',  category:'trans',
    name:'变压器',  label:'变压器',
    width:80, height:70,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<circle cx="40" cy="24" r="18" fill="none" stroke="#E74C3C" stroke-width="2.5"/>'+
         '<circle cx="40" cy="46" r="18" fill="none" stroke="#E74C3C" stroke-width="2.5"/>'+
         '<text x="40" y="28" text-anchor="middle" font-size="9" font-weight="700" fill="#E74C3C">10kV</text>'+
         '<text x="40" y="50" text-anchor="middle" font-size="9" font-weight="700" fill="#E74C3C">0.4kV</text>'+
         '<path d="M4 6 L12 6 M4 12 L8 12" stroke="#E74C3C" stroke-width="2"/>'+
         '<path d="M76 6 L68 6 M76 12 L72 12" stroke="#E74C3C" stroke-width="2"/>',
    desc:'变压器，10kV/0.4kV 降压'
  },
  {
    id:'hv-cabinet',  category:'trans',
    name:'高压柜',  label:'高压柜',
    width:70, height:80,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<rect x="6" y="6" width="58" height="68" rx="5" class="comp-body" fill="rgba(231,76,60,0.12)" stroke="#E74C3C" stroke-width="2.5"/>'+
         '<rect x="12" y="12" width="46" height="56" rx="3" fill="none" stroke="#E74C3C" stroke-width="1"/>'+
         '<line x1="20" y1="24" x2="50" y2="24" stroke="#E74C3C" stroke-width="2"/>'+
         '<line x1="20" y1="34" x2="50" y2="34" stroke="#E74C3C" stroke-width="2"/>'+
         '<line x1="20" y1="44" x2="50" y2="44" stroke="#E74C3C" stroke-width="2"/>'+
         '<circle cx="35" cy="58" r="4" fill="none" stroke="#E74C3C" stroke-width="1.5"/>',
    desc:'高压开关柜，10kV进线/出线'
  },
  {
    id:'lv-cabinet',  category:'trans',
    name:'低压柜',  label:'低压柜',
    width:70, height:80,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<rect x="6" y="6" width="58" height="68" rx="5" class="comp-body" fill="rgba(46,204,113,0.12)" stroke="#2ECC71" stroke-width="2.5"/>'+
         '<rect x="12" y="12" width="46" height="56" rx="3" fill="none" stroke="#2ECC71" stroke-width="1"/>'+
         '<line x1="20" y1="24" x2="50" y2="24" stroke="#2ECC71" stroke-width="2"/>'+
         '<line x1="20" y1="34" x2="50" y2="34" stroke="#2ECC71" stroke-width="2"/>'+
         '<line x1="20" y1="44" x2="50" y2="44" stroke="#2ECC71" stroke-width="2"/>'+
         '<circle cx="35" cy="58" r="4" fill="none" stroke="#2ECC71" stroke-width="1.5"/>',
    desc:'低压开关柜，0.4kV进线/出线'
  },

  /* ─── 配电设备 ─── */
  {
    id:'bus-cabinet',  category:'dist',
    name:'汇流柜(2路)',  label:'汇流柜',
    width:90, height:100,
    ports:[
      { id:'top',  side:'top',    x:0.5,  y:0 },
      { id:'out1', side:'bottom', x:0.28, y:1 },
      { id:'out2', side:'bottom', x:0.72, y:1 }
    ],
    svg: // 外壳
         '<rect x="2" y="2" width="86" height="96" rx="6" fill="rgba(142,68,173,0.06)" stroke="#8E44AD" stroke-width="2"/>'+
         // 标题栏
         '<rect x="2" y="2" width="86" height="14" rx="6" fill="rgba(142,68,173,0.22)"/>'+
         '<rect x="2" y="8" width="86" height="8" fill="rgba(142,68,173,0.22)"/>'+
         '<text x="45" y="12" text-anchor="middle" font-size="7.5" fill="#E8EEF6" font-weight="700">汇流柜 (2路)</text>'+
         // 顶部输入铜排（单根，连接两路）
         '<rect x="18" y="19" width="54" height="5" rx="2" fill="rgba(243,156,18,0.55)" stroke="#F39C12" stroke-width="0.6"/>'+
         // ── QF1 断路器（左侧）──
         '<rect x="9" y="28" width="28" height="22" rx="3" fill="rgba(255,255,255,0.06)" stroke="#8E44AD" stroke-width="1.2"/>'+
         // 铜排进线 QF1（顶部汇流排 → QF1 上端）
         '<line x1="23" y1="24" x2="23" y2="28" stroke="#F39C12" stroke-width="2.4"/>'+
         // QF1 红色手柄
         '<rect x="18" y="26" width="10" height="5" rx="1.5" fill="#E74C3C"/>'+
         // QF1 标签
         '<text x="23" y="37" text-anchor="middle" font-size="6.5" fill="#E8EEF6" font-weight="700">QF1</text>'+
         '<text x="23" y="46" text-anchor="middle" font-size="4" fill="rgba(255,255,255,0.25)">断路器</text>'+
         // QF1 铜排出线 → OUT1
         '<line x1="23" y1="50" x2="23" y2="62" stroke="#F39C12" stroke-width="2.4"/>'+
         '<rect x="16" y="62" width="14" height="4" rx="2" fill="rgba(243,156,18,0.5)" stroke="#F39C12" stroke-width="0.5"/>'+
         '<circle cx="23" cy="72" r="3.5" fill="rgba(46,204,113,0.2)" stroke="#2ECC71" stroke-width="1.8"/>'+
         // ── QF2 断路器（右侧）──
         '<rect x="53" y="28" width="28" height="22" rx="3" fill="rgba(255,255,255,0.06)" stroke="#8E44AD" stroke-width="1.2"/>'+
         // 铜排进线 QF2
         '<line x1="67" y1="24" x2="67" y2="28" stroke="#F39C12" stroke-width="2.4"/>'+
         // QF2 红色手柄
         '<rect x="62" y="26" width="10" height="5" rx="1.5" fill="#E74C3C"/>'+
         // QF2 标签
         '<text x="67" y="37" text-anchor="middle" font-size="6.5" fill="#E8EEF6" font-weight="700">QF2</text>'+
         '<text x="67" y="46" text-anchor="middle" font-size="4" fill="rgba(255,255,255,0.25)">断路器</text>'+
         // QF2 铜排出线 → OUT2
         '<line x1="67" y1="50" x2="67" y2="62" stroke="#F39C12" stroke-width="2.4"/>'+
         '<rect x="60" y="62" width="14" height="4" rx="2" fill="rgba(243,156,18,0.5)" stroke="#F39C12" stroke-width="0.5"/>'+
         '<circle cx="67" cy="72" r="3.5" fill="rgba(46,204,113,0.2)" stroke="#2ECC71" stroke-width="1.8"/>'+
         // 输出标签
         '<text x="23" y="83" text-anchor="middle" font-size="5.5" fill="rgba(46,204,113,0.7)">OUT1</text>'+
         '<text x="67" y="83" text-anchor="middle" font-size="5.5" fill="rgba(46,204,113,0.7)">OUT2</text>',
    desc:'2路汇流柜，内置QF1/QF2断路器，顶部1进线+底部2出线'
  },
  {
    id:'grid',  category:'dist',
    name:'电网',  label:'电网\n380V/10kV',
    width:80, height:60,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg:
      /* 电塔 */
      '<rect x="34" y="8" width="12" height="36" rx="2" fill="rgba(52,73,94,0.15)" stroke="#34495E" stroke-width="1.8"/>'+
      '<line x1="28" y1="12" x2="34" y2="8" stroke="#34495E" stroke-width="1.5"/>'+
      '<line x1="52" y1="12" x2="46" y2="8" stroke="#34495E" stroke-width="1.5"/>'+
      '<line x1="22" y1="20" x2="34" y2="16" stroke="#34495E" stroke-width="1.5"/>'+
      '<line x1="58" y1="20" x2="46" y2="16" stroke="#34495E" stroke-width="1.5"/>'+
      '<line x1="18" y1="28" x2="34" y2="24" stroke="#34495E" stroke-width="1.5"/>'+
      '<line x1="62" y1="28" x2="46" y2="24" stroke="#34495E" stroke-width="1.5"/>'+
      /* 高压线 */
      '<line x1="4" y1="20" x2="22" y2="20" stroke="#E74C3C" stroke-width="2.5" stroke-linecap="round"/>'+
      '<line x1="58" y1="20" x2="76" y2="20" stroke="#E74C3C" stroke-width="2.5" stroke-linecap="round"/>'+
      /* 底座 */
      '<rect x="20" y="44" width="40" height="10" rx="3" fill="rgba(52,73,94,0.2)" stroke="#34495E" stroke-width="1.5"/>'+
      '<text x="40" y="52" text-anchor="middle" font-size="7" font-weight="700" fill="#BDC3C7">电网</text>',
    desc:'公共电网接入点'
  },

  /* ─── 发电设备 ─── */
  {
    id:'pv',  category:'gen',
    name:'光伏',  label:'光伏',
    width:90, height:60,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg:
      /* 太阳 */
      '<circle cx="66" cy="9" r="10" fill="#F39C12" opacity="0.9"/>'+
      '<circle cx="66" cy="9" r="7" fill="#F1C40F"/>'+
      '<line x1="66" y1="0" x2="66" y2="2.5" stroke="#F1C40F" stroke-width="1.5" stroke-linecap="round"/>'+
      '<line x1="66" y1="15.5" x2="66" y2="18" stroke="#F1C40F" stroke-width="1.5" stroke-linecap="round"/>'+
      '<line x1="57" y1="9" x2="54.5" y2="9" stroke="#F1C40F" stroke-width="1.5" stroke-linecap="round"/>'+
      '<line x1="75" y1="9" x2="77.5" y2="9" stroke="#F1C40F" stroke-width="1.5" stroke-linecap="round"/>'+
      '<line x1="60" y1="3" x2="58.5" y2="1.5" stroke="#F1C40F" stroke-width="1.5" stroke-linecap="round"/>'+
      '<line x1="72" y1="15" x2="73.5" y2="16.5" stroke="#F1C40F" stroke-width="1.5" stroke-linecap="round"/>'+
      '<line x1="60" y1="15" x2="58.5" y2="16.5" stroke="#F1C40F" stroke-width="1.5" stroke-linecap="round"/>'+
      '<line x1="72" y1="3" x2="73.5" y2="1.5" stroke="#F1C40F" stroke-width="1.5" stroke-linecap="round"/>'+
      /* 光伏板面板 */
      '<rect x="4" y="20" width="64" height="34" rx="3" fill="rgba(52,152,219,0.25)" stroke="#3498DB" stroke-width="2"/>'+
      '<line x1="8" y1="24" x2="8" y2="50" stroke="rgba(52,152,219,0.5)" stroke-width="1"/>'+
      '<line x1="16" y1="24" x2="16" y2="50" stroke="rgba(52,152,219,0.5)" stroke-width="1"/>'+
      '<line x1="24" y1="24" x2="24" y2="50" stroke="rgba(52,152,219,0.5)" stroke-width="1"/>'+
      '<line x1="32" y1="24" x2="32" y2="50" stroke="rgba(52,152,219,0.5)" stroke-width="1"/>'+
      '<line x1="40" y1="24" x2="40" y2="50" stroke="rgba(52,152,219,0.5)" stroke-width="1"/>'+
      '<line x1="48" y1="24" x2="48" y2="50" stroke="rgba(52,152,219,0.5)" stroke-width="1"/>'+
      '<line x1="56" y1="24" x2="56" y2="50" stroke="rgba(52,152,219,0.5)" stroke-width="1"/>'+
      '<line x1="6" y1="28" x2="62" y2="28" stroke="rgba(52,152,219,0.4)" stroke-width="1"/>'+
      '<line x1="6" y1="36" x2="62" y2="36" stroke="rgba(52,152,219,0.4)" stroke-width="1"/>'+
      '<line x1="6" y1="44" x2="62" y2="44" stroke="rgba(52,152,219,0.4)" stroke-width="1"/>'+
      '<text x="36" y="53" text-anchor="middle" font-size="9" font-weight="700" fill="#5DADE2">光伏</text>',
    desc:'光伏发电系统'
  },
  {
    id:'diesel',  category:'gen',
    name:'柴油机',  label:'柴油\n发电机',
    width:90, height:60,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg:
      /* 底座 */
      '<rect x="4" y="44" width="82" height="12" rx="2" fill="rgba(127,140,141,0.25)" stroke="#7F8C8D" stroke-width="1.5"/>'+
      '<line x1="12" y1="46" x2="12" y2="54" stroke="#7F8C8D" stroke-width="1.5"/>'+
      '<line x1="78" y1="46" x2="78" y2="54" stroke="#7F8C8D" stroke-width="1.5"/>'+
      /* 发电机（右侧圆筒） */
      '<rect x="52" y="10" width="32" height="30" rx="4" fill="rgba(149,165,166,0.2)" stroke="#95A5A6" stroke-width="2"/>'+
      '<circle cx="68" cy="25" r="10" fill="none" stroke="#BDC3C7" stroke-width="2"/>'+
      '<circle cx="68" cy="25" r="4" fill="#E74C3C"/>'+
      '<text x="68" y="42" text-anchor="middle" font-size="6" fill="#95A5A6">GEN</text>'+
      /* 发动机（左侧） */
      '<rect x="8" y="14" width="40" height="26" rx="3" fill="rgba(44,62,80,0.35)" stroke="#2C3E50" stroke-width="2"/>'+
      /* 气缸 */
      '<rect x="14" y="18" width="7" height="10" rx="1" fill="none" stroke="#7F8C8D" stroke-width="1.2"/>'+
      '<rect x="24" y="18" width="7" height="10" rx="1" fill="none" stroke="#7F8C8D" stroke-width="1.2"/>'+
      '<rect x="34" y="18" width="7" height="10" rx="1" fill="none" stroke="#7F8C8D" stroke-width="1.2"/>'+
      /* 曲轴 */
      '<line x1="14" y1="32" x2="41" y2="32" stroke="#95A5A6" stroke-width="1.5"/>'+
      /* 风扇 */
      '<circle cx="25" cy="22" r="3" fill="none" stroke="#E67E22" stroke-width="1"/>'+
      '<line x1="25" y1="19.5" x2="25" y2="24.5" stroke="#E67E22" stroke-width="0.8"/>'+
      '<line x1="22.5" y1="22" x2="27.5" y2="22" stroke="#E67E22" stroke-width="0.8"/>'+
      /* 排气管 */
      '<rect x="44" y="8" width="4" height="8" rx="1" fill="#7F8C8D"/>'+
      /* 冒烟（CSS 动画驱动） */
      '<g class="diesel-smoke">'+
        '<circle cx="46" cy="2" r="3" fill="rgba(150,160,170,0.5)"><animate attributeName="cy" values="2;-8" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.5;0" dur="1.5s" repeatCount="indefinite"/><animate attributeName="r" values="3;6" dur="1.5s" repeatCount="indefinite"/></circle>'+
        '<circle cx="46" cy="2" r="2.5" fill="rgba(150,160,170,0.45)"><animate attributeName="cy" values="2;-10" dur="1.8s" begin="0.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.45;0" dur="1.8s" repeatCount="indefinite"/><animate attributeName="r" values="2.5;5" dur="1.8s" repeatCount="indefinite"/></circle>'+
        '<circle cx="46" cy="2" r="2" fill="rgba(150,160,170,0.4)"><animate attributeName="cy" values="2;-12" dur="2s" begin="1s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.4;0" dur="2s" repeatCount="indefinite"/><animate attributeName="r" values="2;5" dur="2s" repeatCount="indefinite"/></circle>'+
      '</g>'+
      '<text x="27" y="50" text-anchor="middle" font-size="7" font-weight="700" fill="#BDC3C7">柴油机</text>',
    desc:'柴油发电机组，备用电源'
  },

  /* ─── 负荷 ─── */
  {
    id:'load',  category:'load',
    name:'负载',  label:'负载',
    width:70, height:60,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg:
      /* 电机外壳 */
      '<rect x="10" y="8" width="50" height="44" rx="5" fill="rgba(52,73,94,0.12)" stroke="#34495E" stroke-width="2.2"/>'+
      /* 转子 */
      '<circle cx="35" cy="26" r="12" fill="none" stroke="#34495E" stroke-width="2"/>'+
      '<circle cx="35" cy="26" r="5" fill="#34495E" opacity="0.3"/>'+
      '<circle cx="35" cy="26" r="2" fill="#34495E"/>'+
      /* 扇叶 */
      '<line x1="35" y1="15" x2="35" y2="20" stroke="#34495E" stroke-width="1.5" stroke-linecap="round"/>'+
      '<line x1="35" y1="32" x2="35" y2="37" stroke="#34495E" stroke-width="1.5" stroke-linecap="round"/>'+
      '<line x1="25" y1="26" x2="29" y2="26" stroke="#34495E" stroke-width="1.5" stroke-linecap="round"/>'+
      '<line x1="41" y1="26" x2="45" y2="26" stroke="#34495E" stroke-width="1.5" stroke-linecap="round"/>'+
      /* 接线端子 */
      '<circle cx="20" cy="8" r="3" fill="none" stroke="#34495E" stroke-width="1.5"/>'+
      '<circle cx="35" cy="8" r="3" fill="none" stroke="#34495E" stroke-width="1.5"/>'+
      '<circle cx="50" cy="8" r="3" fill="none" stroke="#34495E" stroke-width="1.5"/>'+
      /* 标签 */
      '<text x="35" y="50" text-anchor="middle" font-size="8" font-weight="700" fill="#34495E">负载</text>',
    desc:'用电负载'
  },

  /* ─── 辅助系统 ─── */
  {
    id:'fire',  category:'aux',
    name:'消防系统',  label:'消防系统',
    width:70, height:60,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<rect x="6" y="6" width="58" height="48" rx="6" class="comp-body" fill="rgba(231,76,60,0.1)" stroke="#E74C3C" stroke-width="2"/>'+
         '<path d="M25 14 L35 8 L45 14 L42 22 L38 18 L40 28 L40 42 L30 42 L30 28 L32 18 L28 22 Z" fill="#E74C3C" opacity="0.7"/>'+
         '<text x="35" y="50" text-anchor="middle" font-size="8" fill="#E74C3C">消防</text>',
    desc:'消防系统，柜级灭火装置'
  },
  {
    id:'hvac',  category:'aux',
    name:'空调系统',  label:'空调系统',
    width:70, height:60,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<rect x="6" y="6" width="58" height="48" rx="6" class="comp-body" fill="rgba(52,152,219,0.1)" stroke="#3498DB" stroke-width="2"/>'+
         '<path d="M25 22 L45 22 L45 36 L25 36 Z" fill="#3498DB" opacity="0.25"/>'+
         '<line x1="30" y1="26" x2="40" y2="26" stroke="#3498DB" stroke-width="2.5" stroke-linecap="round"/>'+
         '<line x1="30" y1="32" x2="40" y2="32" stroke="#3498DB" stroke-width="2.5" stroke-linecap="round"/>'+
         '<path d="M20 16 L28 16 M42 16 L50 16" stroke="#3498DB" stroke-width="1.5"/>'+
         '<text x="35" y="50" text-anchor="middle" font-size="8" fill="#3498DB">空调</text>',
    desc:'空调系统，温度管控'
  },

  /* ─── 仪表设备 ─── */
  {
    id:'ct',  category:'meter',
    name:'互感器 CT',  label:'CT',
    width:50, height:50, overlayEdge:true,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<circle cx="25" cy="25" r="20" fill="rgba(100,180,255,0.06)" stroke="#64B4FF" stroke-width="2.5"/>'+
         '<circle cx="25" cy="25" r="13" fill="none" stroke="#64B4FF" stroke-width="1.8" stroke-dasharray="4 2"/>'+
         '<circle cx="25" cy="25" r="6" fill="rgba(100,160,220,0.3)" stroke="#4A90D9" stroke-width="1.5"/>'+
         '<circle cx="25" cy="25" r="2" fill="#4A90D9"/>'+
         '<line x1="5" y1="5" x2="13" y2="13" stroke="#64B4FF" stroke-width="2" stroke-linecap="round"/>'+
         '<line x1="45" y1="5" x2="37" y2="13" stroke="#64B4FF" stroke-width="2" stroke-linecap="round"/>'+
         '<line x1="5" y1="45" x2="13" y2="37" stroke="#64B4FF" stroke-width="2" stroke-linecap="round"/>'+
         '<line x1="45" y1="45" x2="37" y2="37" stroke="#64B4FF" stroke-width="2" stroke-linecap="round"/>',
    desc:'电流互感器，可叠放于线缆上检测电流'
  },
  {
    id:'meter',  category:'meter',
    name:'电表',  label:'电表',
    width:80, height:70,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<rect x="6" y="4" width="68" height="62" rx="6" class="comp-body" fill="rgba(52,152,219,0.1)" stroke="#3498DB" stroke-width="2.5"/>'+
         '<rect x="14" y="12" width="52" height="22" rx="3" fill="#1a1a2e" stroke="#3498DB" stroke-width="1"/>'+
         '<text x="40" y="22" text-anchor="middle" font-size="6" fill="#00ff88" font-family="monospace">888888</text>'+
         '<text x="40" y="30" text-anchor="middle" font-size="10" font-weight="700" fill="#00ff88" font-family="monospace">kWh</text>'+
         '<line x1="20" y1="40" x2="60" y2="40" stroke="#3498DB" stroke-width="1"/>'+
         '<circle cx="26" cy="48" r="4" fill="none" stroke="#3498DB" stroke-width="1"/>'+
         '<circle cx="40" cy="48" r="4" fill="none" stroke="#3498DB" stroke-width="1"/>'+
         '<circle cx="54" cy="48" r="4" fill="none" stroke="#3498DB" stroke-width="1"/>'+
         '<line x1="14" y1="54" x2="66" y2="54" stroke="#3498DB" stroke-width="1"/>'+
         '<rect x="18" y="56" width="44" height="4" rx="2" fill="#3498DB" opacity="0.3"/>',
    desc:'多功能电表，电量计量'
  },
  {
    id:'control-box',  category:'control',
    name:'控制箱',  label:'控制箱',
    width:160, height:180,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg:
      // 箱体外框
      '<rect x="4" y="2" width="152" height="176" rx="8" fill="rgba(100,120,140,0.12)" stroke="#6C7A89" stroke-width="3"/>'+
      '<rect x="10" y="8" width="140" height="164" rx="5" fill="rgba(100,120,140,0.06)" stroke="#6C7A89" stroke-width="1" stroke-dasharray="3 2"/>'+
      // 箱体把手
      '<rect x="60" y="170" width="40" height="6" rx="3" fill="#6C7A89" opacity="0.5"/>'+
      // ---- EMS模块 ----
      '<rect x="18" y="14" width="60" height="50" rx="5" fill="rgba(155,89,182,0.2)" stroke="#9B59B6" stroke-width="1.8"/>'+
      '<text x="48" y="33" text-anchor="middle" font-size="10" font-weight="700" fill="#9B59B6">EMS</text>'+
      '<text x="48" y="46" text-anchor="middle" font-size="7" fill="#9B59B6" opacity="0.8">能量管理</text>'+
      '<rect x="24" y="52" width="10" height="6" rx="1" fill="#9B59B6" opacity="0.5"/>'+
      '<rect x="38" y="52" width="10" height="6" rx="1" fill="#9B59B6" opacity="0.5"/>'+
      '<rect x="52" y="52" width="10" height="6" rx="1" fill="#9B59B6" opacity="0.5"/>'+
      // ---- 触摸屏 ----
      '<rect x="88" y="14" width="54" height="50" rx="5" fill="#1a1a2e" stroke="#34495E" stroke-width="1.8"/>'+
      '<rect x="95" y="20" width="40" height="28" rx="3" fill="#0d1b2a"/>'+
      '<text x="115" y="36" text-anchor="middle" font-size="7" fill="#00ff88" font-family="monospace">触摸屏</text>'+
      '<circle cx="115" cy="48" r="2" fill="#64B4FF" opacity="0.8"/>'+
      '<rect x="96" y="52" width="14" height="6" rx="2" fill="#34495E"/>'+
      '<rect x="114" y="52" width="14" height="6" rx="2" fill="#34495E"/>'+
      // ---- 交换机 ----
      '<rect x="18" y="74" width="60" height="36" rx="5" fill="rgba(52,152,219,0.15)" stroke="#3498DB" stroke-width="1.6"/>'+
      '<text x="48" y="89" text-anchor="middle" font-size="9" font-weight="700" fill="#3498DB">交换机</text>'+
      '<text x="48" y="100" text-anchor="middle" font-size="6" fill="#3498DB" opacity="0.7">Switch</text>'+
      '<circle cx="28" cy="84" r="2" fill="#2ECC71"/>'+
      '<circle cx="36" cy="84" r="2" fill="#2ECC71"/>'+
      '<circle cx="44" cy="84" r="2" fill="#2ECC71"/>'+
      '<circle cx="52" cy="84" r="2" fill="#2ECC71"/>'+
      '<circle cx="60" cy="84" r="2" fill="#2ECC71"/>'+
      '<circle cx="68" cy="84" r="2" fill="#F39C12" opacity="0.6"/>'+
      // ---- 双卡4G路由 ----
      '<rect x="88" y="72" width="54" height="38" rx="5" fill="rgba(46,204,113,0.12)" stroke="#2ECC71" stroke-width="1.6"/>'+
      '<text x="115" y="84" text-anchor="middle" font-size="7" font-weight="700" fill="#2ECC71">4G路由</text>'+
      '<text x="115" y="94" text-anchor="middle" font-size="5" fill="#2ECC71" opacity="0.7">双卡</text>'+
      // 天线1（左）— 加长 + 信号波纹
      '<line x1="100" y1="72" x2="100" y2="58" stroke="#2ECC71" stroke-width="2"/>'+
      '<circle cx="100" cy="56" r="3" fill="none" stroke="#2ECC71" stroke-width="1.2"/>'+
      '<circle cx="100" cy="56" r="1.2" fill="#2ECC71" opacity="0.6"/>'+
      '<path d="M94 60 Q92 56 94 52" fill="none" stroke="#2ECC71" stroke-width="0.8" opacity="0.5"/>'+
      // 天线2（右）— 加长 + 信号波纹
      '<line x1="130" y1="72" x2="130" y2="58" stroke="#2ECC71" stroke-width="2"/>'+
      '<circle cx="130" cy="56" r="3" fill="none" stroke="#2ECC71" stroke-width="1.2"/>'+
      '<circle cx="130" cy="56" r="1.2" fill="#2ECC71" opacity="0.6"/>'+
      '<path d="M136 60 Q138 56 136 52" fill="none" stroke="#2ECC71" stroke-width="0.8" opacity="0.5"/>'+
      // SIM卡槽
      '<rect x="100" y="97" width="12" height="8" rx="1" fill="none" stroke="#2ECC71" stroke-width="0.8"/>'+
      '<rect x="118" y="97" width="12" height="8" rx="1" fill="none" stroke="#2ECC71" stroke-width="0.8"/>'+
      '<line x1="106" y1="102" x2="106" y2="103" stroke="#2ECC71" stroke-width="0.5"/>'+
      '<line x1="124" y1="102" x2="124" y2="103" stroke="#2ECC71" stroke-width="0.5"/>'+
      // ---- 散热风扇 ----
      '<rect x="18" y="120" width="60" height="42" rx="5" fill="rgba(241,196,15,0.1)" stroke="#F1C40F" stroke-width="1.6"/>'+
      '<text x="48" y="138" text-anchor="middle" font-size="9" font-weight="700" fill="#F1C40F">散热风扇</text>'+
      '<circle cx="38" cy="150" r="7" fill="none" stroke="#F1C40F" stroke-width="1.2" stroke-dasharray="2 2"/>'+
      '<circle cx="38" cy="150" r="2" fill="#F1C40F" opacity="0.6"/>'+
      '<circle cx="58" cy="150" r="7" fill="none" stroke="#F1C40F" stroke-width="1.2" stroke-dasharray="2 2"/>'+
      '<circle cx="58" cy="150" r="2" fill="#F1C40F" opacity="0.6"/>'+
      '<text x="48" y="156" text-anchor="middle" font-size="5" fill="#F1C40F" opacity="0.6">FAN</text>'+
      // ---- 底部接线区 ----
      '<rect x="18" y="168" width="124" height="2" rx="1" fill="#6C7A89" opacity="0.3"/>'+
      '<circle cx="44" cy="172" r="2" fill="#E74C3C" opacity="0.6"/>'+
      '<circle cx="60" cy="172" r="2" fill="#F39C12" opacity="0.6"/>'+
      '<circle cx="76" cy="172" r="2" fill="#3498DB" opacity="0.6"/>'+
      '<circle cx="92" cy="172" r="2" fill="#2ECC71" opacity="0.6"/>'+
      '<circle cx="108" cy="172" r="2" fill="#9B59B6" opacity="0.6"/>',
    desc:'控制箱（含EMS/交换机/4G路由/散热风扇/触摸屏）'
  },

  /* ─── 开关设备 ─── */
  {
    id:'cb-breaker',  category:'switchgear',
    name:'断路器',  label:'断路器',
    width:70, height:90,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: // 外壳
         '<rect x="4" y="2" width="62" height="86" rx="6" fill="rgba(231,76,60,0.08)" stroke="#E74C3C" stroke-width="2.2"/>'+
         // 顶部标签
         '<text x="35" y="12" text-anchor="middle" font-size="7" font-weight="700" fill="#E74C3C">断路器</text>'+
         '<line x1="10" y1="15" x2="60" y2="15" stroke="#E74C3C" stroke-width="0.8" opacity="0.4"/>'+
         // ══ 开关1 (QF1) ══
         // 进线端
         '<circle cx="12" cy="24" r="2.5" fill="none" stroke="#E74C3C" stroke-width="1.5"/>'+
         '<line x1="14.5" y1="24" x2="25" y2="24" stroke="#E74C3C" stroke-width="2" stroke-linecap="round"/>'+
         // 开关杠杆（打开角度）
         '<line x1="25" y1="24" x2="33" y2="18" stroke="#E74C3C" stroke-width="2.3" stroke-linecap="round"/>'+
         // 铰链圆点
         '<circle cx="25" cy="24" r="2.5" fill="none" stroke="#E74C3C" stroke-width="1.5"/>'+
         '<circle cx="25" cy="24" r="1.2" fill="#E74C3C"/>'+
         // 出线端
         '<line x1="33" y1="18" x2="45" y2="18" stroke="#E74C3C" stroke-width="2" stroke-linecap="round"/>'+
         '<circle cx="45" cy="18" r="2.5" fill="none" stroke="#E74C3C" stroke-width="1.5"/>'+
         // 灭弧栅
         '<line x1="18" y1="22" x2="18" y2="28" stroke="#E74C3C" stroke-width="0.8" opacity="0.4"/>'+
         '<line x1="20" y1="22" x2="20" y2="28" stroke="#E74C3C" stroke-width="0.8" opacity="0.4"/>'+
         // 标签 QF1
         '<text x="29" y="32" text-anchor="middle" font-size="5.5" fill="#E74C3C" font-weight="700">QF1</text>'+
         // ══ 开关2 (QF2) ══
         '<circle cx="12" cy="46" r="2.5" fill="none" stroke="#E74C3C" stroke-width="1.5"/>'+
         '<line x1="14.5" y1="46" x2="25" y2="46" stroke="#E74C3C" stroke-width="2" stroke-linecap="round"/>'+
         '<line x1="25" y1="46" x2="33" y2="40" stroke="#E74C3C" stroke-width="2.3" stroke-linecap="round"/>'+
         '<circle cx="25" cy="46" r="2.5" fill="none" stroke="#E74C3C" stroke-width="1.5"/>'+
         '<circle cx="25" cy="46" r="1.2" fill="#E74C3C"/>'+
         '<line x1="33" y1="40" x2="45" y2="40" stroke="#E74C3C" stroke-width="2" stroke-linecap="round"/>'+
         '<circle cx="45" cy="40" r="2.5" fill="none" stroke="#E74C3C" stroke-width="1.5"/>'+
         '<text x="29" y="54" text-anchor="middle" font-size="5.5" fill="#E74C3C" font-weight="700">QF2</text>'+
         // ══ 开关3 (QF3) ══
         '<circle cx="12" cy="68" r="2.5" fill="none" stroke="#E74C3C" stroke-width="1.5"/>'+
         '<line x1="14.5" y1="68" x2="25" y2="68" stroke="#E74C3C" stroke-width="2" stroke-linecap="round"/>'+
         '<line x1="25" y1="68" x2="33" y2="62" stroke="#E74C3C" stroke-width="2.3" stroke-linecap="round"/>'+
         '<circle cx="25" cy="68" r="2.5" fill="none" stroke="#E74C3C" stroke-width="1.5"/>'+
         '<circle cx="25" cy="68" r="1.2" fill="#E74C3C"/>'+
         '<line x1="33" y1="62" x2="45" y2="62" stroke="#E74C3C" stroke-width="2" stroke-linecap="round"/>'+
         '<circle cx="45" cy="62" r="2.5" fill="none" stroke="#E74C3C" stroke-width="1.5"/>'+
         '<text x="29" y="76" text-anchor="middle" font-size="5.5" fill="#E74C3C" font-weight="700">QF3</text>'+
         // 底部汇流排
         '<rect x="20" y="82" width="30" height="4" rx="2" fill="rgba(243,156,18,0.4)" stroke="#F39C12" stroke-width="0.5"/>',
    desc:'断路器（3极），QF1/QF2/QF3三路独立开关，过载/短路保护'
  },
  {
    id:'ds-switch',  category:'switchgear',
    name:'隔离开关',  label:'隔离开关',
    width:60, height:44,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<line x1="4" y1="22" x2="22" y2="22" stroke="#F39C12" stroke-width="2.5" stroke-linecap="round"/>'+
         '<line x1="42" y1="22" x2="56" y2="22" stroke="#F39C12" stroke-width="2.5" stroke-linecap="round"/>'+
         '<line x1="22" y1="22" x2="42" y2="4" stroke="#F39C12" stroke-width="2.5"/>'+
         '<circle cx="22" cy="22" r="2.5" fill="#F39C12"/>'+
         '<circle cx="42" cy="4" r="2.5" fill="none" stroke="#F39C12" stroke-width="1.5"/>'+
         '<line x1="30" y1="38" x2="35" y2="38" stroke="#F39C12" stroke-width="2"/>'+
         '<line x1="28" y1="36" x2="37" y2="36" stroke="#F39C12" stroke-width="2"/>'+
         '<text x="32" y="14" text-anchor="middle" font-size="7" font-weight="700" fill="#F39C12">DS</text>',
    desc:'隔离开关，提供明显断口，无灭弧能力'
  },
  {
    id:'gs-switch',  category:'switchgear',
    name:'接地开关',  label:'接地开关',
    width:60, height:48,
    ports:[
      { id:'left',  side:'left',  x:0,   y:0.5 },
      { id:'right', side:'right', x:1,   y:0.5 },
      { id:'bottom', side:'bottom', x:0.5, y:1 }
    ],
    svg: '<line x1="4" y1="16" x2="22" y2="16" stroke="#27AE60" stroke-width="2.5" stroke-linecap="round"/>'+
         '<line x1="38" y1="16" x2="56" y2="16" stroke="#27AE60" stroke-width="2.5" stroke-linecap="round"/>'+
         '<line x1="22" y1="16" x2="30" y2="38" stroke="#27AE60" stroke-width="2.5"/>'+
         '<circle cx="22" cy="16" r="2.5" fill="#27AE60"/>'+
         '<line x1="25" y1="38" x2="35" y2="38" stroke="#27AE60" stroke-width="3"/>'+
         '<line x1="22" y1="44" x2="38" y2="44" stroke="#27AE60" stroke-width="3"/>'+
         '<line x1="19" y1="48" x2="41" y2="48" stroke="#27AE60" stroke-width="3"/>',
    desc:'接地开关，检修时将线路可靠接地'
  },

  /* ─── 并网系统 ─── */
  {
    id:'rmu',  category:'gridcon',
    name:'环网柜',  label:'环网柜',
    width:80, height:80,
    ports:[
      { id:'top',    side:'top',    x:0.3, y:0   },
      { id:'top2',   side:'top',    x:0.7, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<rect x="6" y="6" width="68" height="68" rx="6" fill="rgba(155,89,182,0.12)" stroke="#9B59B6" stroke-width="2.5"/>'+
         '<rect x="14" y="14" width="52" height="52" rx="4" fill="none" stroke="#9B59B6" stroke-width="1.2" stroke-dasharray="3 2"/>'+
         '<line x1="14" y1="28" x2="26" y2="28" stroke="#9B59B6" stroke-width="2"/>'+
         '<circle cx="30" cy="28" r="3.5" fill="none" stroke="#9B59B6" stroke-width="1.5"/>'+
         '<line x1="34" y1="28" x2="46" y2="28" stroke="#9B59B6" stroke-width="2"/>'+
         '<circle cx="50" cy="28" r="3.5" fill="none" stroke="#9B59B6" stroke-width="1.5"/>'+
         '<line x1="54" y1="28" x2="66" y2="28" stroke="#9B59B6" stroke-width="2"/>'+
         '<line x1="40" y1="28" x2="40" y2="48" stroke="#9B59B6" stroke-width="2"/>'+
         '<circle cx="40" cy="52" r="3.5" fill="none" stroke="#9B59B6" stroke-width="1.5"/>'+
         '<line x1="40" y1="56" x2="40" y2="66" stroke="#9B59B6" stroke-width="2"/>'+
         '<text x="40" y="24" text-anchor="middle" font-size="6" fill="#9B59B6" font-weight="600">RMU</text>',
    desc:'环网柜(RMU)，10kV环网供电'
  },
  {
    id:'grid-cabinet',  category:'gridcon',
    name:'并网柜',  label:'并网柜',
    width:80, height:80,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<rect x="6" y="6" width="68" height="68" rx="6" fill="rgba(46,204,113,0.12)" stroke="#2ECC71" stroke-width="2.5"/>'+
         '<rect x="14" y="14" width="52" height="52" rx="4" fill="none" stroke="#2ECC71" stroke-width="1"/>'+
         '<line x1="18" y1="24" x2="62" y2="24" stroke="#2ECC71" stroke-width="2"/>'+
         '<line x1="18" y1="34" x2="62" y2="34" stroke="#2ECC71" stroke-width="2"/>'+
         '<line x1="18" y1="44" x2="62" y2="44" stroke="#2ECC71" stroke-width="2"/>'+
         '<circle cx="30" cy="56" r="3" fill="none" stroke="#2ECC71" stroke-width="1.2"/>'+
         '<circle cx="42" cy="56" r="3" fill="none" stroke="#2ECC71" stroke-width="1.2"/>'+
         '<circle cx="54" cy="56" r="3" fill="none" stroke="#2ECC71" stroke-width="1.2"/>'+
         '<text x="40" y="18" text-anchor="middle" font-size="7" fill="#2ECC71" font-weight="700">并网</text>',
    desc:'并网柜，储能系统与电网并网接口'
  },
  {
    id:'anti-reverse-cabinet',  category:'gridcon',
    name:'防逆流柜',  label:'防逆流柜',
    width:80, height:80,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<rect x="6" y="6" width="68" height="68" rx="6" fill="rgba(231,76,60,0.1)" stroke="#E74C3C" stroke-width="2.5"/>'+
         '<rect x="14" y="14" width="52" height="52" rx="4" fill="none" stroke="#E74C3C" stroke-width="1"/>'+
         '<path d="M22 24 L58 24 L58 44 L22 44 Z" fill="none" stroke="#E74C3C" stroke-width="1.8"/>'+
         '<line x1="30" y1="24" x2="50" y2="44" stroke="#E74C3C" stroke-width="2.5" stroke-linecap="round"/>'+
         '<circle cx="40" cy="34" r="4" fill="none" stroke="#E74C3C" stroke-width="1.5"/>'+
         '<circle cx="30" cy="56" r="3" fill="none" stroke="#E74C3C" stroke-width="1.2"/>'+
         '<circle cx="50" cy="56" r="3" fill="none" stroke="#E74C3C" stroke-width="1.2"/>',
    desc:'防逆流柜，防止储能向电网上送功率'
  },

  /* ─── 计量系统 ─── */
  {
    id:'ct-set',  category:'meter',
    name:'CT互感器组',  label:'CT组\n×3',
    width:80, height:36, overlayEdge:true,
    ports:[
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<circle cx="14" cy="18" r="11" fill="rgba(100,180,255,0.06)" stroke="#64B4FF" stroke-width="2"/>'+
         '<circle cx="14" cy="18" r="7" fill="none" stroke="#64B4FF" stroke-width="1.2" stroke-dasharray="3 2"/>'+
         '<circle cx="14" cy="18" r="3" fill="#4A90D9" opacity="0.6"/>'+
         '<circle cx="40" cy="18" r="11" fill="rgba(100,180,255,0.06)" stroke="#64B4FF" stroke-width="2"/>'+
         '<circle cx="40" cy="18" r="7" fill="none" stroke="#64B4FF" stroke-width="1.2" stroke-dasharray="3 2"/>'+
         '<circle cx="40" cy="18" r="3" fill="#4A90D9" opacity="0.6"/>'+
         '<circle cx="66" cy="18" r="11" fill="rgba(100,180,255,0.06)" stroke="#64B4FF" stroke-width="2"/>'+
         '<circle cx="66" cy="18" r="7" fill="none" stroke="#64B4FF" stroke-width="1.2" stroke-dasharray="3 2"/>'+
         '<circle cx="66" cy="18" r="3" fill="#4A90D9" opacity="0.6"/>'+
         '<line x1="4" y1="18" x2="7" y2="18" stroke="#64B4FF" stroke-width="1.8"/>'+
         '<line x1="21" y1="18" x2="33" y2="18" stroke="#64B4FF" stroke-width="1.8"/>'+
         '<line x1="47" y1="18" x2="59" y2="18" stroke="#64B4FF" stroke-width="1.8"/>'+
         '<line x1="73" y1="18" x2="76" y2="18" stroke="#64B4FF" stroke-width="1.8"/>',
    desc:'电流互感器组（3个/套），三相电流采集'
  },
  {
    id:'fast-meter',  category:'meter',
    name:'快速电表',  label:'快速电表',
    width:80, height:70,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<rect x="6" y="4" width="68" height="62" rx="6" fill="rgba(46,204,113,0.1)" stroke="#2ECC71" stroke-width="2.5"/>'+
         '<rect x="14" y="10" width="52" height="20" rx="3" fill="#1a1a2e" stroke="#2ECC71" stroke-width="1"/>'+
         '<text x="40" y="19" text-anchor="middle" font-size="6" fill="#00ff88" font-family="monospace">888888</text>'+
         '<text x="40" y="27" text-anchor="middle" font-size="10" font-weight="700" fill="#00ff88" font-family="monospace">kWh</text>'+
         '<line x1="20" y1="38" x2="60" y2="38" stroke="#2ECC71" stroke-width="1"/>'+
         '<circle cx="26" cy="46" r="3.5" fill="#2ECC71" opacity="0.5"/>'+
         '<circle cx="40" cy="46" r="3.5" fill="#2ECC71" opacity="0.5"/>'+
         '<circle cx="54" cy="46" r="3.5" fill="#2ECC71" opacity="0.5"/>'+
         '<text x="40" y="58" text-anchor="middle" font-size="7" fill="#2ECC71" font-weight="600">快速</text>',
    desc:'快速电表，高速采集电能数据（ms级）'
  },
  {
    id:'ar-meter',  category:'meter',
    name:'防逆流电表',  label:'防逆流表\n2次',
    width:80, height:70,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<rect x="6" y="4" width="68" height="62" rx="6" fill="rgba(231,76,60,0.08)" stroke="#E74C3C" stroke-width="2.5"/>'+
         '<rect x="14" y="10" width="52" height="20" rx="3" fill="#1a1a2e" stroke="#E74C3C" stroke-width="1"/>'+
         '<text x="40" y="19" text-anchor="middle" font-size="6" fill="#ff6677" font-family="monospace">888888</text>'+
         '<text x="40" y="27" text-anchor="middle" font-size="9" font-weight="700" fill="#ff6677" font-family="monospace">kW</text>'+
         '<path d="M24 38 L56 38 M56 38 L48 34 M56 38 L48 42" stroke="#E74C3C" stroke-width="1.8" fill="none"/>'+
         '<circle cx="26" cy="46" r="3.5" fill="none" stroke="#E74C3C" stroke-width="1.2"/>'+
         '<circle cx="40" cy="46" r="3.5" fill="none" stroke="#E74C3C" stroke-width="1.2"/>'+
         '<circle cx="54" cy="46" r="3.5" fill="none" stroke="#E74C3C" stroke-width="1.2"/>'+
         '<text x="40" y="58" text-anchor="middle" font-size="7" fill="#E74C3C" font-weight="600">防逆流</text>',
    desc:'防逆流电表（2次表），检测逆功率并触发保护'
  },

  /* ─── 母线系统 ─── */
  {
    id:'ac-busbar',  category:'busbar',
    name:'交流母线',  label:'AC母线',
    width:140, height:36,
    ports:[
      { id:'top',    side:'top',    x:0.25, y:0   },
      { id:'top2',   side:'top',    x:0.5,  y:0   },
      { id:'top3',   side:'top',    x:0.75, y:0   },
      { id:'bottom', side:'bottom', x:0.25, y:1   },
      { id:'bottom2',side:'bottom', x:0.5,  y:1   },
      { id:'bottom3',side:'bottom', x:0.75, y:1   }
    ],
    svg: '<rect x="4" y="8" width="132" height="20" rx="5" fill="rgba(231,76,60,0.1)" stroke="#E74C3C" stroke-width="2.5"/>'+
         '<line x1="10" y1="12" x2="16" y2="12" stroke="#E74C3C" stroke-width="2" stroke-linecap="round"/>'+
         '<line x1="10" y1="18" x2="16" y2="18" stroke="#E74C3C" stroke-width="2" stroke-linecap="round"/>'+
         '<line x1="10" y1="24" x2="16" y2="24" stroke="#E74C3C" stroke-width="2" stroke-linecap="round"/>'+
         '<text x="74" y="20" text-anchor="middle" font-size="8" fill="#E74C3C" font-weight="700">AC 400V</text>'+
         '<line x1="124" y1="18" x2="130" y2="18" stroke="#E74C3C" stroke-width="2"/>',
    desc:'交流母线，0.4kV 三相四线'
  },
  {
    id:'dc-busbar',  category:'busbar',
    name:'直流母线',  label:'DC母线',
    width:140, height:36,
    ports:[
      { id:'top',    side:'top',    x:0.25, y:0   },
      { id:'top2',   side:'top',    x:0.5,  y:0   },
      { id:'top3',   side:'top',    x:0.75, y:0   },
      { id:'bottom', side:'bottom', x:0.25, y:1   },
      { id:'bottom2',side:'bottom', x:0.5,  y:1   },
      { id:'bottom3',side:'bottom', x:0.75, y:1   }
    ],
    svg: '<rect x="4" y="8" width="132" height="20" rx="5" fill="rgba(52,152,219,0.1)" stroke="#3498DB" stroke-width="2.5"/>'+
         '<line x1="10" y1="12" x2="16" y2="12" stroke="#3498DB" stroke-width="2" stroke-linecap="round"/>'+
         '<line x1="10" y1="24" x2="16" y2="24" stroke="#3498DB" stroke-width="2" stroke-linecap="round"/>'+
         '<text x="74" y="20" text-anchor="middle" font-size="8" fill="#3498DB" font-weight="700">DC 800V</text>'+
         '<line x1="124" y1="18" x2="130" y2="18" stroke="#3498DB" stroke-width="2"/>',
    desc:'直流母线，800V 直流汇流'
  },

  /* ─── 储能系统 — 复合元件 ─── */
  {
    id:'ess-liquid-cooled',  category:'storage',
    name:'液冷储能柜',  label:'液冷储能柜',
    width:140, height:140,
    packCount:5, pcsCount:2, pcsPower:100, // 默认配置
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg:
      '<rect x="4" y="2" width="132" height="136" rx="8" fill="rgba(52,152,219,0.06)" stroke="#3498DB" stroke-width="2.5"/>'+
      '<text x="70" y="14" text-anchor="middle" font-size="8" font-weight="700" fill="#3498DB">液冷储能柜</text>'+
      // 电池Pack ×5
      '<rect x="12" y="20" width="42" height="14" rx="2" fill="rgba(26,188,156,0.18)" stroke="#1ABC9C" stroke-width="1"/>'+
      '<text x="33" y="29" text-anchor="middle" font-size="5.5" fill="#1ABC9C" font-weight="600">Pack 1</text>'+
      '<rect x="12" y="37" width="42" height="14" rx="2" fill="rgba(26,188,156,0.18)" stroke="#1ABC9C" stroke-width="1"/>'+
      '<text x="33" y="46" text-anchor="middle" font-size="5.5" fill="#1ABC9C" font-weight="600">Pack 2</text>'+
      '<rect x="12" y="54" width="42" height="14" rx="2" fill="rgba(26,188,156,0.18)" stroke="#1ABC9C" stroke-width="1"/>'+
      '<text x="33" y="63" text-anchor="middle" font-size="5.5" fill="#1ABC9C" font-weight="600">Pack 3</text>'+
      '<rect x="12" y="71" width="42" height="14" rx="2" fill="rgba(26,188,156,0.18)" stroke="#1ABC9C" stroke-width="1"/>'+
      '<text x="33" y="80" text-anchor="middle" font-size="5.5" fill="#1ABC9C" font-weight="600">Pack 4</text>'+
      '<rect x="12" y="88" width="42" height="14" rx="2" fill="rgba(26,188,156,0.18)" stroke="#1ABC9C" stroke-width="1"/>'+
      '<text x="33" y="97" text-anchor="middle" font-size="5.5" fill="#1ABC9C" font-weight="600">Pack 5</text>'+
      // PCS ×2
      '<rect x="60" y="20" width="30" height="24" rx="3" fill="rgba(243,156,18,0.15)" stroke="#F39C12" stroke-width="1.2"/>'+
      '<text x="75" y="30" text-anchor="middle" font-size="6" font-weight="700" fill="#F39C12">PCS1</text>'+
      '<text x="75" y="38" text-anchor="middle" font-size="5" fill="#F39C12" opacity="0.7">100kW</text>'+
      '<rect x="95" y="20" width="30" height="24" rx="3" fill="rgba(243,156,18,0.15)" stroke="#F39C12" stroke-width="1.2"/>'+
      '<text x="110" y="30" text-anchor="middle" font-size="6" font-weight="700" fill="#F39C12">PCS2</text>'+
      '<text x="110" y="38" text-anchor="middle" font-size="5" fill="#F39C12" opacity="0.7">100kW</text>'+
      // BMS
      '<rect x="60" y="50" width="30" height="16" rx="3" fill="rgba(52,152,219,0.12)" stroke="#3498DB" stroke-width="1.2"/>'+
      '<text x="75" y="60" text-anchor="middle" font-size="6" fill="#3498DB" font-weight="600">BMS</text>'+
      // EMS
      '<rect x="95" y="50" width="30" height="16" rx="3" fill="rgba(155,89,182,0.12)" stroke="#9B59B6" stroke-width="1.2"/>'+
      '<text x="110" y="60" text-anchor="middle" font-size="6" fill="#9B59B6" font-weight="600">EMS</text>'+
      // 液冷管道
      '<path d="M60 74 L120 74" stroke="#3498DB" stroke-width="1.5" stroke-dasharray="4 3"/>'+
      '<path d="M60 82 L120 82" stroke="#3498DB" stroke-width="1.5" stroke-dasharray="4 3"/>'+
      '<text x="90" y="92" text-anchor="middle" font-size="5.5" fill="#3498DB">液冷管路</text>'+
      // 风扇
      '<circle cx="75" cy="108" r="7" fill="none" stroke="#3498DB" stroke-width="1" stroke-dasharray="2 2"/>'+
      '<circle cx="75" cy="108" r="2" fill="#3498DB" opacity="0.5"/>'+
      '<circle cx="105" cy="108" r="7" fill="none" stroke="#3498DB" stroke-width="1" stroke-dasharray="2 2"/>'+
      '<circle cx="105" cy="108" r="2" fill="#3498DB" opacity="0.5"/>'+
      '<text x="90" y="122" text-anchor="middle" font-size="5" fill="#3498DB">FAN ×2</text>'+
      // 连接端子区
      '<rect x="12" y="110" width="42" height="18" rx="2" fill="none" stroke="rgba(52,152,219,0.5)" stroke-width="1"/>'+
      '<text x="33" y="122" text-anchor="middle" font-size="5" fill="rgba(52,152,219,0.7)">端子排</text>',
    desc:'液冷储能柜（含5电池Pack/2台PCS/BMS/EMS），液冷散热',
    hasConfig:true
  },
  {
    id:'ess-air-cooled',  category:'storage',
    name:'风冷储能柜',  label:'风冷储能柜',
    width:140, height:140,
    packCount:5, pcsCount:2, pcsPower:100,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg:
      '<rect x="4" y="2" width="132" height="136" rx="8" fill="rgba(241,196,15,0.05)" stroke="#F1C40F" stroke-width="2.5"/>'+
      '<text x="70" y="14" text-anchor="middle" font-size="8" font-weight="700" fill="#F1C40F">风冷储能柜</text>'+
      // 电池Pack ×5
      '<rect x="12" y="20" width="42" height="14" rx="2" fill="rgba(26,188,156,0.18)" stroke="#1ABC9C" stroke-width="1"/>'+
      '<text x="33" y="29" text-anchor="middle" font-size="5.5" fill="#1ABC9C" font-weight="600">Pack 1</text>'+
      '<rect x="12" y="37" width="42" height="14" rx="2" fill="rgba(26,188,156,0.18)" stroke="#1ABC9C" stroke-width="1"/>'+
      '<text x="33" y="46" text-anchor="middle" font-size="5.5" fill="#1ABC9C" font-weight="600">Pack 2</text>'+
      '<rect x="12" y="54" width="42" height="14" rx="2" fill="rgba(26,188,156,0.18)" stroke="#1ABC9C" stroke-width="1"/>'+
      '<text x="33" y="63" text-anchor="middle" font-size="5.5" fill="#1ABC9C" font-weight="600">Pack 3</text>'+
      '<rect x="12" y="71" width="42" height="14" rx="2" fill="rgba(26,188,156,0.18)" stroke="#1ABC9C" stroke-width="1"/>'+
      '<text x="33" y="80" text-anchor="middle" font-size="5.5" fill="#1ABC9C" font-weight="600">Pack 4</text>'+
      '<rect x="12" y="88" width="42" height="14" rx="2" fill="rgba(26,188,156,0.18)" stroke="#1ABC9C" stroke-width="1"/>'+
      '<text x="33" y="97" text-anchor="middle" font-size="5.5" fill="#1ABC9C" font-weight="600">Pack 5</text>'+
      // PCS ×2
      '<rect x="60" y="20" width="30" height="24" rx="3" fill="rgba(243,156,18,0.15)" stroke="#F39C12" stroke-width="1.2"/>'+
      '<text x="75" y="30" text-anchor="middle" font-size="6" font-weight="700" fill="#F39C12">PCS1</text>'+
      '<text x="75" y="38" text-anchor="middle" font-size="5" fill="#F39C12" opacity="0.7">100kW</text>'+
      '<rect x="95" y="20" width="30" height="24" rx="3" fill="rgba(243,156,18,0.15)" stroke="#F39C12" stroke-width="1.2"/>'+
      '<text x="110" y="30" text-anchor="middle" font-size="6" font-weight="700" fill="#F39C12">PCS2</text>'+
      '<text x="110" y="38" text-anchor="middle" font-size="5" fill="#F39C12" opacity="0.7">100kW</text>'+
      // BMS
      '<rect x="60" y="50" width="30" height="16" rx="3" fill="rgba(52,152,219,0.12)" stroke="#3498DB" stroke-width="1.2"/>'+
      '<text x="75" y="60" text-anchor="middle" font-size="6" fill="#3498DB" font-weight="600">BMS</text>'+
      // EMS
      '<rect x="95" y="50" width="30" height="16" rx="3" fill="rgba(155,89,182,0.12)" stroke="#9B59B6" stroke-width="1.2"/>'+
      '<text x="110" y="60" text-anchor="middle" font-size="6" fill="#9B59B6" font-weight="600">EMS</text>'+
      // 风冷风扇 ×3
      '<circle cx="68" cy="90" r="7" fill="none" stroke="#F1C40F" stroke-width="1.2" stroke-dasharray="2 2"/>'+
      '<circle cx="68" cy="90" r="2" fill="#F1C40F" opacity="0.5"/>'+
      '<circle cx="90" cy="90" r="7" fill="none" stroke="#F1C40F" stroke-width="1.2" stroke-dasharray="2 2"/>'+
      '<circle cx="90" cy="90" r="2" fill="#F1C40F" opacity="0.5"/>'+
      '<circle cx="112" cy="90" r="7" fill="none" stroke="#F1C40F" stroke-width="1.2" stroke-dasharray="2 2"/>'+
      '<circle cx="112" cy="90" r="2" fill="#F1C40F" opacity="0.5"/>'+
      '<text x="90" y="104" text-anchor="middle" font-size="5.5" fill="#F1C40F">强制风冷 ×3</text>'+
      // 连接端子区
      '<rect x="12" y="108" width="42" height="18" rx="2" fill="none" stroke="rgba(241,196,15,0.5)" stroke-width="1"/>'+
      '<text x="33" y="120" text-anchor="middle" font-size="5" fill="rgba(241,196,15,0.7)">端子排</text>',
    desc:'风冷储能柜（含5电池Pack/2台PCS/BMS/EMS），强制风冷散热',
    hasConfig:true
  },
  {
    id:'ess-container',  category:'storage',
    name:'储能集装箱',  label:'储能集装箱',
    width:160, height:100,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg:
      '<rect x="4" y="2" width="152" height="96" rx="6" fill="rgba(100,120,140,0.08)" stroke="#6C7A89" stroke-width="2.5"/>'+
      '<text x="80" y="13" text-anchor="middle" font-size="8" font-weight="700" fill="#6C7A89">储能集装箱</text>'+
      // 箱内分区
      '<rect x="10" y="18" width="34" height="74" rx="3" fill="none" stroke="#6C7A89" stroke-width="0.8" stroke-dasharray="2 2"/>'+
      '<text x="27" y="28" text-anchor="middle" font-size="5" fill="#6C7A89">电池</text>'+
      '<text x="27" y="36" text-anchor="middle" font-size="5" fill="#6C7A89">Pack</text>'+
      // Pack小方块
      '<rect x="14" y="40" width="26" height="8" rx="2" fill="rgba(26,188,156,0.2)" stroke="#1ABC9C" stroke-width="1"/>'+
      '<rect x="14" y="52" width="26" height="8" rx="2" fill="rgba(26,188,156,0.2)" stroke="#1ABC9C" stroke-width="1"/>'+
      '<rect x="14" y="64" width="26" height="8" rx="2" fill="rgba(26,188,156,0.2)" stroke="#1ABC9C" stroke-width="1"/>'+
      '<rect x="14" y="76" width="26" height="8" rx="2" fill="rgba(26,188,156,0.2)" stroke="#1ABC9C" stroke-width="1"/>'+
      // PCS
      '<rect x="50" y="18" width="35" height="34" rx="3" fill="rgba(243,156,18,0.15)" stroke="#F39C12" stroke-width="1.2"/>'+
      '<text x="67" y="32" text-anchor="middle" font-size="7" font-weight="700" fill="#F39C12">PCS</text>'+
      '<text x="67" y="42" text-anchor="middle" font-size="5" fill="#F39C12">AC/DC</text>'+
      // BMS
      '<rect x="50" y="56" width="35" height="16" rx="3" fill="rgba(52,152,219,0.15)" stroke="#3498DB" stroke-width="1.2"/>'+
      '<text x="67" y="66" text-anchor="middle" font-size="6" fill="#3498DB" font-weight="600">BMS</text>'+
      // EMS
      '<rect x="50" y="76" width="35" height="16" rx="3" fill="rgba(155,89,182,0.15)" stroke="#9B59B6" stroke-width="1.2"/>'+
      '<text x="67" y="86" text-anchor="middle" font-size="6" fill="#9B59B6" font-weight="600">EMS</text>'+
      // 右侧门
      '<rect x="92" y="18" width="58" height="74" rx="3" fill="none" stroke="#6C7A89" stroke-width="1.2"/>'+
      '<line x1="92" y1="40" x2="150" y2="40" stroke="#6C7A89" stroke-width="1"/>'+
      '<line x1="92" y1="60" x2="150" y2="60" stroke="#6C7A89" stroke-width="1"/>'+
      '<text x="121" y="32" text-anchor="middle" font-size="5" fill="#6C7A89">温控系统</text>'+
      '<text x="121" y="52" text-anchor="middle" font-size="5" fill="#6C7A89">消防系统</text>'+
      '<text x="121" y="72" text-anchor="middle" font-size="5" fill="#6C7A89">动环监控</text>',
    desc:'储能集装箱（含电池Pack/PCS/BMS/EMS/温控/消防/动环）'
  },

  /* ─── PCS系统 ─── */
  {
    id:'pcs-module',  category:'power',
    name:'PCS模块',  label:'PCS模块',
    width:60, height:70,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.3 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<rect x="4" y="4" width="52" height="62" rx="5" fill="rgba(243,156,18,0.12)" stroke="#F39C12" stroke-width="2.2"/>'+
         '<rect x="10" y="10" width="40" height="18" rx="3" fill="rgba(243,156,18,0.2)"/>'+
         '<text x="30" y="17" text-anchor="middle" font-size="6" fill="#F39C12" font-weight="700">IGBT</text>'+
         '<text x="30" y="25" text-anchor="middle" font-size="5" fill="#F39C12">模块</text>'+
         '<line x1="16" y1="34" x2="44" y2="34" stroke="#F39C12" stroke-width="1.2"/>'+
         '<line x1="16" y1="40" x2="44" y2="40" stroke="#F39C12" stroke-width="1.2"/>'+
         '<line x1="16" y1="46" x2="44" y2="46" stroke="#F39C12" stroke-width="1.2"/>'+
         '<circle cx="20" cy="55" r="3" fill="none" stroke="#F39C12" stroke-width="1"/>'+
         '<circle cx="30" cy="55" r="3" fill="none" stroke="#F39C12" stroke-width="1"/>'+
         '<circle cx="40" cy="55" r="3" fill="none" stroke="#F39C12" stroke-width="1"/>',
    desc:'PCS功率模块，IGBT功率单元'
  },

  /* ─── 汇流柜（多路可配置） ─── */
  {
    id:'bus-cabinet-config',  category:'dist',
    name:'汇流柜(可配置)',  label:'汇流柜',
    width:100, height:105,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.3 },
      { id:'left2',  side:'left',   x:0,   y:0.5 },
      { id:'left3',  side:'left',   x:0,   y:0.7 },
      { id:'right',  side:'right',  x:1,   y:0.3 },
      { id:'right2', side:'right',  x:1,   y:0.5 },
      { id:'right3', side:'right',  x:1,   y:0.7 }
    ],
    svg: // 外壳
         '<rect x="2" y="2" width="96" height="101" rx="6" class="comp-body" fill="rgba(142,68,173,0.1)" stroke="#8E44AD" stroke-width="2.2"/>'+
         // 顶部分隔
         '<rect x="2" y="2" width="96" height="16" rx="6" fill="rgba(142,68,173,0.22)"/>'+
         '<rect x="2" y="12" width="96" height="6" fill="rgba(142,68,173,0.22)"/>'+
         '<text x="50" y="12" text-anchor="middle" font-size="8" fill="#fff" font-weight="700">汇流柜</text>'+
         // 回路1
         '<rect x="14" y="24" width="72" height="16" rx="3" fill="rgba(41,128,185,0.12)" stroke="rgba(41,128,185,0.4)" stroke-width="1"/>'+
         '<text x="50" y="34" text-anchor="middle" font-size="7" fill="rgba(41,128,185,0.7)">回路1 · DC+</text>'+
         // 回路2
         '<rect x="14" y="44" width="72" height="16" rx="3" fill="rgba(41,128,185,0.12)" stroke="rgba(41,128,185,0.4)" stroke-width="1"/>'+
         '<text x="50" y="54" text-anchor="middle" font-size="7" fill="rgba(41,128,185,0.7)">回路2 · DC+</text>'+
         // 回路3
         '<rect x="14" y="64" width="72" height="16" rx="3" fill="rgba(41,128,185,0.12)" stroke="rgba(41,128,185,0.4)" stroke-width="1"/>'+
         '<text x="50" y="74" text-anchor="middle" font-size="7" fill="rgba(41,128,185,0.7)">回路3 · DC+</text>'+
         // 汇流排
         '<rect x="22" y="84" width="56" height="5" rx="2" fill="rgba(243,156,18,0.4)" stroke="#F39C12" stroke-width="0.8"/>'+
         '<text x="50" y="96" text-anchor="middle" font-size="6" fill="rgba(243,156,18,0.5)">→ 总输出</text>',
    desc:'汇流柜（可配置回路数/开关数），直流多路汇流'
  },

  /* ─── 通信设备 ─── */
  {
    id:'network-switch',  category:'network',
    name:'交换机',  label:'交换机',
    width:100, height:44,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<rect x="6" y="4" width="88" height="36" rx="5" fill="rgba(52,152,219,0.12)" stroke="#3498DB" stroke-width="2.2"/>'+
         '<circle cx="18" cy="16" r="2.5" fill="#2ECC71"/>'+
         '<circle cx="28" cy="16" r="2.5" fill="#2ECC71"/>'+
         '<circle cx="38" cy="16" r="2.5" fill="#2ECC71"/>'+
         '<circle cx="48" cy="16" r="2.5" fill="#2ECC71"/>'+
         '<circle cx="58" cy="16" r="2.5" fill="#2ECC71"/>'+
         '<circle cx="68" cy="16" r="2.5" fill="#2ECC71"/>'+
         '<circle cx="78" cy="16" r="2.5" fill="#2ECC71"/>'+
         '<circle cx="88" cy="16" r="2.5" fill="#F39C12" opacity="0.6"/>'+
         '<circle cx="18" cy="28" r="2.5" fill="#2ECC71"/>'+
         '<circle cx="28" cy="28" r="2.5" fill="#2ECC71"/>'+
         '<circle cx="38" cy="28" r="2.5" fill="#2ECC71"/>'+
         '<circle cx="48" cy="28" r="2.5" fill="#2ECC71"/>'+
         '<circle cx="58" cy="28" r="2.5" fill="#2ECC71"/>'+
         '<circle cx="68" cy="28" r="2.5" fill="#2ECC71"/>'+
         '<circle cx="78" cy="28" r="2.5" fill="#2ECC71"/>'+
         '<circle cx="88" cy="28" r="2.5" fill="#F39C12" opacity="0.6"/>',
    desc:'以太网交换机，16口管理型'
  },
  {
    id:'ind-switch-4',  category:'network',
    name:'工业交换机4口',  label:'工业交换机\n4口',
    width:60, height:40,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<rect x="4" y="4" width="52" height="32" rx="5" fill="rgba(127,140,141,0.15)" stroke="#7F8C8D" stroke-width="2.2"/>'+
         '<rect x="10" y="9" width="40" height="8" rx="2" fill="none" stroke="#7F8C8D" stroke-width="1"/>'+
         '<circle cx="20" cy="24" r="2.5" fill="#2ECC71"/>'+
         '<circle cx="30" cy="24" r="2.5" fill="#2ECC71"/>'+
         '<circle cx="40" cy="24" r="2.5" fill="#2ECC71"/>'+
         '<circle cx="50" cy="24" r="2.5" fill="#F39C12" opacity="0.6"/>',
    desc:'工业交换机4口，导轨安装，宽温工作'
  },
  {
    id:'ind-switch-8',  category:'network',
    name:'工业交换机8口',  label:'工业交换机\n8口',
    width:80, height:40,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<rect x="4" y="4" width="72" height="32" rx="5" fill="rgba(127,140,141,0.15)" stroke="#7F8C8D" stroke-width="2.2"/>'+
         '<rect x="10" y="9" width="60" height="8" rx="2" fill="none" stroke="#7F8C8D" stroke-width="1"/>'+
         '<circle cx="16" cy="24" r="2" fill="#2ECC71"/>'+
         '<circle cx="24" cy="24" r="2" fill="#2ECC71"/>'+
         '<circle cx="32" cy="24" r="2" fill="#2ECC71"/>'+
         '<circle cx="40" cy="24" r="2" fill="#2ECC71"/>'+
         '<circle cx="48" cy="24" r="2" fill="#2ECC71"/>'+
         '<circle cx="56" cy="24" r="2" fill="#2ECC71"/>'+
         '<circle cx="64" cy="24" r="2" fill="#2ECC71"/>'+
         '<circle cx="72" cy="24" r="2" fill="#F39C12" opacity="0.6"/>',
    desc:'工业交换机8口，导轨安装，宽温工作'
  },
  {
    id:'ind-switch-16',  category:'network',
    name:'工业交换机16口',  label:'工业交换机\n16口',
    width:100, height:44,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<rect x="4" y="4" width="92" height="36" rx="5" fill="rgba(127,140,141,0.15)" stroke="#7F8C8D" stroke-width="2.2"/>'+
         '<rect x="10" y="9" width="80" height="10" rx="2" fill="none" stroke="#7F8C8D" stroke-width="1"/>'+
         '<circle cx="16" cy="26" r="2" fill="#2ECC71"/>'+
         '<circle cx="23" cy="26" r="2" fill="#2ECC71"/>'+
         '<circle cx="30" cy="26" r="2" fill="#2ECC71"/>'+
         '<circle cx="37" cy="26" r="2" fill="#2ECC71"/>'+
         '<circle cx="44" cy="26" r="2" fill="#2ECC71"/>'+
         '<circle cx="51" cy="26" r="2" fill="#2ECC71"/>'+
         '<circle cx="58" cy="26" r="2" fill="#2ECC71"/>'+
         '<circle cx="65" cy="26" r="2" fill="#2ECC71"/>'+
         '<circle cx="72" cy="26" r="2" fill="#2ECC71"/>'+
         '<circle cx="79" cy="26" r="2" fill="#2ECC71"/>'+
         '<circle cx="86" cy="26" r="2" fill="#2ECC71"/>'+
         '<circle cx="93" cy="26" r="2" fill="#F39C12" opacity="0.6"/>',
    desc:'工业交换机16口，导轨安装，宽温工作'
  },
  {
    id:'ind-switch-24',  category:'network',
    name:'工业交换机24口',  label:'工业交换机\n24口',
    width:120, height:48,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<rect x="4" y="4" width="112" height="40" rx="5" fill="rgba(127,140,141,0.15)" stroke="#7F8C8D" stroke-width="2.2"/>'+
         '<rect x="10" y="8" width="100" height="10" rx="2" fill="none" stroke="#7F8C8D" stroke-width="1"/>'+
         '<circle cx="16" cy="25" r="2" fill="#2ECC71"/>'+
         '<circle cx="23" cy="25" r="2" fill="#2ECC71"/>'+
         '<circle cx="30" cy="25" r="2" fill="#2ECC71"/>'+
         '<circle cx="37" cy="25" r="2" fill="#2ECC71"/>'+
         '<circle cx="44" cy="25" r="2" fill="#2ECC71"/>'+
         '<circle cx="51" cy="25" r="2" fill="#2ECC71"/>'+
         '<circle cx="58" cy="25" r="2" fill="#2ECC71"/>'+
         '<circle cx="65" cy="25" r="2" fill="#2ECC71"/>'+
         '<circle cx="72" cy="25" r="2" fill="#2ECC71"/>'+
         '<circle cx="79" cy="25" r="2" fill="#2ECC71"/>'+
         '<circle cx="86" cy="25" r="2" fill="#2ECC71"/>'+
         '<circle cx="93" cy="25" r="2" fill="#2ECC71"/>'+
         '<circle cx="100" cy="25" r="2" fill="#2ECC71"/>'+
         '<circle cx="18" cy="33" r="2" fill="#2ECC71"/>'+
         '<circle cx="25" cy="33" r="2" fill="#2ECC71"/>'+
         '<circle cx="32" cy="33" r="2" fill="#2ECC71"/>'+
         '<circle cx="39" cy="33" r="2" fill="#2ECC71"/>'+
         '<circle cx="46" cy="33" r="2" fill="#2ECC71"/>'+
         '<circle cx="53" cy="33" r="2" fill="#2ECC71"/>'+
         '<circle cx="60" cy="33" r="2" fill="#2ECC71"/>'+
         '<circle cx="67" cy="33" r="2" fill="#2ECC71"/>'+
         '<circle cx="74" cy="33" r="2" fill="#2ECC71"/>'+
         '<circle cx="81" cy="33" r="2" fill="#2ECC71"/>'+
         '<circle cx="88" cy="33" r="2" fill="#2ECC71"/>'+
         '<circle cx="109" cy="29" r="2" fill="#F39C12" opacity="0.6"/>',
    desc:'工业交换机24口，机架式，宽温工作'
  },
  {
    id:'router-4g',  category:'network',
    name:'4G路由器',  label:'4G路由器',
    width:78, height:66,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: // 外壳
         '<rect x="2" y="14" width="74" height="50" rx="7" fill="rgba(46,204,113,0.1)" stroke="#2ECC71" stroke-width="2.2"/>'+
         // ── 天线 ×2（突出外壳上方，高度延伸到 y=-8）──
         // 天线1（左）
         '<rect x="18" y="4" width="5" height="12" rx="2" fill="#2ECC71" opacity="0.4"/>'+
         '<line x1="20.5" y1="4" x2="20.5" y2="-4" stroke="#2ECC71" stroke-width="2" stroke-linecap="round"/>'+
         '<circle cx="20.5" cy="-5" r="3" fill="none" stroke="#2ECC71" stroke-width="1.2"/>'+
         '<circle cx="20.5" cy="-5" r="1.2" fill="#2ECC71" opacity="0.6"/>'+
         // 天线2（右）
         '<rect x="55" y="4" width="5" height="12" rx="2" fill="#2ECC71" opacity="0.4"/>'+
         '<line x1="57.5" y1="4" x2="57.5" y2="-4" stroke="#2ECC71" stroke-width="2" stroke-linecap="round"/>'+
         '<circle cx="57.5" cy="-5" r="3" fill="none" stroke="#2ECC71" stroke-width="1.2"/>'+
         '<circle cx="57.5" cy="-5" r="1.2" fill="#2ECC71" opacity="0.6"/>'+
         // 信号波纹（左侧天线）
         '<path d="M14 -2 Q12 -6 14 -10" fill="none" stroke="#2ECC71" stroke-width="1" opacity="0.5"/>'+
         '<path d="M10 -3 Q7 -8 10 -13" fill="none" stroke="#2ECC71" stroke-width="1" opacity="0.3"/>'+
         // 信号波纹（右侧天线）
         '<path d="M64 -2 Q66 -6 64 -10" fill="none" stroke="#2ECC71" stroke-width="1" opacity="0.5"/>'+
         '<path d="M68 -3 Q71 -8 68 -13" fill="none" stroke="#2ECC71" stroke-width="1" opacity="0.3"/>'+
         // 面板（主体内容区）
         '<rect x="12" y="18" width="54" height="24" rx="3" fill="#1a1a2e" stroke="#2ECC71" stroke-width="1"/>'+
         // LED指示灯行
         '<circle cx="20" cy="25" r="2.2" fill="#2ECC71"/>'+
         '<text x="20" y="21" text-anchor="middle" font-size="3.5" fill="#2ECC71">PWR</text>'+
         '<circle cx="32" cy="25" r="2.2" fill="#2ECC71"/>'+
         '<text x="32" y="21" text-anchor="middle" font-size="3.5" fill="#2ECC71">4G</text>'+
         '<circle cx="44" cy="25" r="2.2" fill="#F39C12"/>'+
         '<text x="44" y="21" text-anchor="middle" font-size="3.5" fill="#F39C12">SIG</text>'+
         '<circle cx="56" cy="25" r="2.2" fill="#2ECC71"/>'+
         '<text x="56" y="21" text-anchor="middle" font-size="3.5" fill="#2ECC71">LAN</text>'+
         // 以太网口
         '<rect x="16" y="32" width="46" height="6" rx="2" fill="none" stroke="#2ECC71" stroke-width="0.8"/>'+
         '<circle cx="24" cy="35" r="1" fill="#2ECC71"/>'+
         '<circle cx="30" cy="35" r="1" fill="#2ECC71"/>'+
         '<circle cx="36" cy="35" r="1" fill="#2ECC71"/>'+
         '<circle cx="42" cy="35" r="1" fill="#2ECC71"/>'+
         '<circle cx="48" cy="35" r="1" fill="#F39C12" opacity="0.6"/>'+
         '<circle cx="54" cy="35" r="1" fill="#F39C12" opacity="0.6"/>'+
         // SIM卡槽 ×2
         '<rect x="28" y="44" width="18" height="7" rx="1.5" fill="none" stroke="#2ECC71" stroke-width="0.8"/>'+
         '<text x="37" y="49" text-anchor="middle" font-size="4" fill="#2ECC71">SIM1</text>'+
         '<rect x="28" y="54" width="18" height="7" rx="1.5" fill="none" stroke="#2ECC71" stroke-width="0.8"/>'+
         '<text x="37" y="59" text-anchor="middle" font-size="4" fill="#2ECC71">SIM2</text>'+
         // 标签
         '<text x="39" y="12" text-anchor="middle" font-size="6" fill="#2ECC71" font-weight="700">4G</text>',
    desc:'4G路由器，双SIM卡+双天线，工业级4G无线通信'
  },
  {
    id:'serial-2',  category:'network',
    name:'串口服务器2口',  label:'串口服务器\n2口',
    width:82, height:60,
    ports:[
      { id:'serial1', side:'left',  x:0,   y:0.28 },
      { id:'serial2', side:'left',  x:0,   y:0.72 },
      { id:'eth',     side:'right', x:1,   y:0.5  },
      { id:'center',  side:'right', x:1,   y:0.75 }
    ],
    svg: // 外壳
         '<rect x="2" y="2" width="78" height="56" rx="6" fill="rgba(155,89,182,0.1)" stroke="#9B59B6" stroke-width="2.2"/>'+
         // 顶部标签栏
         '<rect x="2" y="2" width="78" height="14" rx="6" fill="rgba(155,89,182,0.22)"/>'+
         '<rect x="2" y="10" width="78" height="6" fill="rgba(155,89,182,0.22)"/>'+
         '<text x="41" y="11" text-anchor="middle" font-size="7" fill="#fff" font-weight="700">串口服务器</text>'+
         // ── 左侧 RS485 串口区 ──
         '<rect x="6" y="18" width="22" height="36" rx="3" fill="rgba(155,89,182,0.08)" stroke="#9B59B6" stroke-width="1"/>'+
         '<text x="17" y="29" text-anchor="middle" font-size="5" fill="#9B59B6">RS485</text>'+
         // 串口1 连接器
         '<rect x="3" y="25" width="6" height="7" rx="1.5" fill="#9B59B6" opacity="0.5"/>'+
         '<text x="14" y="29" text-anchor="middle" font-size="4.5" fill="#9B59B6">S1</text>'+
         // 串口2 连接器
         '<rect x="3" y="42" width="6" height="7" rx="1.5" fill="#9B59B6" opacity="0.5"/>'+
         '<text x="14" y="46" text-anchor="middle" font-size="4.5" fill="#9B59B6">S2</text>'+
         // 串口指示灯
         '<circle cx="22" cy="29" r="1.5" fill="#2ECC71"/>'+
         '<circle cx="22" cy="46" r="1.5" fill="#2ECC71"/>'+
         // ── 右侧 网口区 ──
         '<rect x="38" y="18" width="36" height="36" rx="3" fill="rgba(52,152,219,0.08)" stroke="#3498DB" stroke-width="1"/>'+
         '<text x="56" y="28" text-anchor="middle" font-size="5" fill="#3498DB">ETH</text>'+
         // RJ45 网口
         '<rect x="68" y="24" width="7" height="12" rx="2" fill="none" stroke="#3498DB" stroke-width="1.5"/>'+
         '<rect x="70" y="26" width="3" height="8" rx="1" fill="#3498DB" opacity="0.3"/>'+
         // 网口指示灯
         '<circle cx="46" cy="44" r="1.5" fill="#F39C12"/>'+
         '<circle cx="53" cy="44" r="1.5" fill="#2ECC71"/>'+
         '<text x="56" y="47" text-anchor="middle" font-size="4" fill="#3498DB">LINK</text>'+
         // 底部型号
         '<text x="41" y="55" text-anchor="middle" font-size="5" fill="rgba(155,89,182,0.5)">2×RS485</text>',
    desc:'串口服务器2口，RS485转以太网，2×RS485 + 1×RJ45'
  },
  {
    id:'serial-4',  category:'network',
    name:'串口服务器4口',  label:'串口服务器\n4口',
    width:82, height:75,
    ports:[
      { id:'serial1', side:'left',  x:0,   y:0.16 },
      { id:'serial2', side:'left',  x:0,   y:0.32 },
      { id:'serial3', side:'left',  x:0,   y:0.48 },
      { id:'serial4', side:'left',  x:0,   y:0.64 },
      { id:'eth',     side:'right', x:1,   y:0.5  },
      { id:'center',  side:'left',  x:0,   y:0.8  }
    ],
    svg: // 外壳
         '<rect x="2" y="2" width="78" height="71" rx="6" fill="rgba(155,89,182,0.1)" stroke="#9B59B6" stroke-width="2.2"/>'+
         // 顶部标签栏
         '<rect x="2" y="2" width="78" height="14" rx="6" fill="rgba(155,89,182,0.22)"/>'+
         '<rect x="2" y="10" width="78" height="6" fill="rgba(155,89,182,0.22)"/>'+
         '<text x="41" y="11" text-anchor="middle" font-size="7" fill="#fff" font-weight="700">串口服务器</text>'+
         // ── 左侧 RS485 串口区 ──
         '<rect x="6" y="18" width="22" height="52" rx="3" fill="rgba(155,89,182,0.08)" stroke="#9B59B6" stroke-width="1"/>'+
         '<text x="17" y="27" text-anchor="middle" font-size="4.5" fill="#9B59B6">RS485</text>'+
         // 4个串口连接器
         '<rect x="3" y="22" width="5" height="6" rx="1.5" fill="#9B59B6" opacity="0.5"/>'+
         '<text x="14" y="26" text-anchor="middle" font-size="4" fill="#9B59B6">S1</text>'+
         '<rect x="3" y="31" width="5" height="6" rx="1.5" fill="#9B59B6" opacity="0.5"/>'+
         '<text x="14" y="35" text-anchor="middle" font-size="4" fill="#9B59B6">S2</text>'+
         '<rect x="3" y="40" width="5" height="6" rx="1.5" fill="#9B59B6" opacity="0.5"/>'+
         '<text x="14" y="44" text-anchor="middle" font-size="4" fill="#9B59B6">S3</text>'+
         '<rect x="3" y="49" width="5" height="6" rx="1.5" fill="#9B59B6" opacity="0.5"/>'+
         '<text x="14" y="53" text-anchor="middle" font-size="4" fill="#9B59B6">S4</text>'+
         // 串口指示灯
         '<circle cx="22" cy="25" r="1.2" fill="#2ECC71"/>'+
         '<circle cx="22" cy="34" r="1.2" fill="#2ECC71"/>'+
         '<circle cx="22" cy="43" r="1.2" fill="#2ECC71"/>'+
         '<circle cx="22" cy="52" r="1.2" fill="#2ECC71"/>'+
         // ── 右侧 网口区 ──
         '<rect x="38" y="18" width="36" height="45" rx="3" fill="rgba(52,152,219,0.08)" stroke="#3498DB" stroke-width="1"/>'+
         '<text x="56" y="27" text-anchor="middle" font-size="5" fill="#3498DB">ETH</text>'+
         // RJ45 网口
         '<rect x="68" y="22" width="7" height="12" rx="2" fill="none" stroke="#3498DB" stroke-width="1.5"/>'+
         '<rect x="70" y="24" width="3" height="8" rx="1" fill="#3498DB" opacity="0.3"/>'+
         // 网口指示灯
         '<circle cx="43" cy="45" r="1.5" fill="#F39C12"/>'+
         '<circle cx="50" cy="45" r="1.5" fill="#2ECC71"/>'+
         '<text x="56" y="49" text-anchor="middle" font-size="4" fill="#3498DB">LINK</text>'+
         '<text x="56" y="58" text-anchor="middle" font-size="4.5" fill="rgba(52,152,219,0.4)">10/100M</text>'+
         // 底部型号
         '<text x="41" y="70" text-anchor="middle" font-size="5" fill="rgba(155,89,182,0.5)">4×RS485</text>',
    desc:'串口服务器4口，RS485转以太网，4×RS485 + 1×RJ45'
  },
  {
    id:'serial-8',  category:'network',
    name:'串口服务器8口',  label:'串口服务器\n8口',
    width:88, height:95,
    ports:[
      { id:'serial1', side:'left',  x:0,   y:0.10 },
      { id:'serial2', side:'left',  x:0,   y:0.21 },
      { id:'serial3', side:'left',  x:0,   y:0.32 },
      { id:'serial4', side:'left',  x:0,   y:0.43 },
      { id:'serial5', side:'left',  x:0,   y:0.54 },
      { id:'serial6', side:'left',  x:0,   y:0.65 },
      { id:'serial7', side:'left',  x:0,   y:0.76 },
      { id:'serial8', side:'left',  x:0,   y:0.87 },
      { id:'eth',     side:'right', x:1,   y:0.5  },
      { id:'center',  side:'left',  x:0,   y:0.95 }
    ],
    svg: // 外壳
         '<rect x="2" y="2" width="84" height="91" rx="6" fill="rgba(155,89,182,0.1)" stroke="#9B59B6" stroke-width="2.2"/>'+
         // 顶部标签栏
         '<rect x="2" y="2" width="84" height="14" rx="6" fill="rgba(155,89,182,0.22)"/>'+
         '<rect x="2" y="10" width="84" height="6" fill="rgba(155,89,182,0.22)"/>'+
         '<text x="44" y="11" text-anchor="middle" font-size="7" fill="#fff" font-weight="700">串口服务器</text>'+
         // ── 左侧 RS485 串口区 ──
         '<rect x="6" y="18" width="24" height="72" rx="3" fill="rgba(155,89,182,0.08)" stroke="#9B59B6" stroke-width="1"/>'+
         '<text x="18" y="26" text-anchor="middle" font-size="4.5" fill="#9B59B6">RS485</text>'+
         // 8个串口（分两列：4主＋4左外部连接器）
         '<rect x="3" y="22" width="4" height="5" rx="1" fill="#9B59B6" opacity="0.5"/>'+
         '<text x="13" y="26" text-anchor="middle" font-size="3.5" fill="#9B59B6">S1</text>'+
         '<rect x="3" y="30" width="4" height="5" rx="1" fill="#9B59B6" opacity="0.5"/>'+
         '<text x="13" y="34" text-anchor="middle" font-size="3.5" fill="#9B59B6">S2</text>'+
         '<rect x="3" y="38" width="4" height="5" rx="1" fill="#9B59B6" opacity="0.5"/>'+
         '<text x="13" y="42" text-anchor="middle" font-size="3.5" fill="#9B59B6">S3</text>'+
         '<rect x="3" y="46" width="4" height="5" rx="1" fill="#9B59B6" opacity="0.5"/>'+
         '<text x="13" y="50" text-anchor="middle" font-size="3.5" fill="#9B59B6">S4</text>'+
         '<rect x="3" y="54" width="4" height="5" rx="1" fill="#9B59B6" opacity="0.5"/>'+
         '<text x="13" y="58" text-anchor="middle" font-size="3.5" fill="#9B59B6">S5</text>'+
         '<rect x="3" y="62" width="4" height="5" rx="1" fill="#9B59B6" opacity="0.5"/>'+
         '<text x="13" y="66" text-anchor="middle" font-size="3.5" fill="#9B59B6">S6</text>'+
         '<rect x="3" y="70" width="4" height="5" rx="1" fill="#9B59B6" opacity="0.5"/>'+
         '<text x="13" y="74" text-anchor="middle" font-size="3.5" fill="#9B59B6">S7</text>'+
         '<rect x="3" y="78" width="4" height="5" rx="1" fill="#9B59B6" opacity="0.5"/>'+
         '<text x="13" y="82" text-anchor="middle" font-size="3.5" fill="#9B59B6">S8</text>'+
         // 串口指示灯
         '<circle cx="24" cy="24" r="1" fill="#2ECC71"/>'+
         '<circle cx="24" cy="32" r="1" fill="#2ECC71"/>'+
         '<circle cx="24" cy="40" r="1" fill="#2ECC71"/>'+
         '<circle cx="24" cy="48" r="1" fill="#2ECC71"/>'+
         '<circle cx="24" cy="56" r="1" fill="#2ECC71"/>'+
         '<circle cx="24" cy="64" r="1" fill="#2ECC71"/>'+
         '<circle cx="24" cy="72" r="1" fill="#2ECC71"/>'+
         '<circle cx="24" cy="80" r="1" fill="#2ECC71"/>'+
         // ── 右侧 网口区 ──
         '<rect x="40" y="18" width="38" height="55" rx="3" fill="rgba(52,152,219,0.08)" stroke="#3498DB" stroke-width="1"/>'+
         '<text x="59" y="27" text-anchor="middle" font-size="5" fill="#3498DB">ETH</text>'+
         // RJ45 网口
         '<rect x="72" y="22" width="8" height="14" rx="2" fill="none" stroke="#3498DB" stroke-width="1.5"/>'+
         '<rect x="74" y="24" width="4" height="10" rx="1" fill="#3498DB" opacity="0.3"/>'+
         // 网口指示灯
         '<circle cx="45" cy="50" r="1.5" fill="#F39C12"/>'+
         '<circle cx="53" cy="50" r="1.5" fill="#2ECC71"/>'+
         '<text x="59" y="54" text-anchor="middle" font-size="4" fill="#3498DB">LINK</text>'+
         '<text x="59" y="64" text-anchor="middle" font-size="4" fill="rgba(52,152,219,0.4)">10/100M</text>'+
         '<text x="59" y="72" text-anchor="middle" font-size="4" fill="rgba(52,152,219,0.3)">RJ45</text>'+
         // 底部型号
         '<text x="44" y="90" text-anchor="middle" font-size="5" fill="rgba(155,89,182,0.5)">8×RS485</text>',
    desc:'串口服务器8口，RS485转以太网，8×RS485 + 1×RJ45'
  },

  /* ─── 负载系统 ─── */
  {
    id:'factory-load',  category:'load',
    name:'工厂负载',  label:'工厂负载',
    width:80, height:64,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<rect x="10" y="10" width="60" height="44" rx="4" fill="rgba(149,165,166,0.12)" stroke="#7F8C8D" stroke-width="2.2"/>'+
         '<polygon points="40,8 20,22 28,22 28,54 52,54 52,22 60,22" fill="none" stroke="#7F8C8D" stroke-width="1.8"/>'+
         '<rect x="34" y="32" width="12" height="22" rx="3" fill="none" stroke="#7F8C8D" stroke-width="1.5"/>'+
         '<rect x="30" y="22" width="20" height="6" rx="2" fill="none" stroke="#7F8C8D" stroke-width="1.2"/>',
    desc:'工厂负载，工业用电设备'
  },
  {
    id:'business-load',  category:'load',
    name:'商业负载',  label:'商业负载',
    width:70, height:70,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<rect x="14" y="12" width="42" height="46" rx="3" fill="rgba(46,204,113,0.08)" stroke="#27AE60" stroke-width="2"/>'+
         '<rect x="20" y="18" width="12" height="10" rx="1" fill="none" stroke="#27AE60" stroke-width="1.2"/>'+
         '<rect x="38" y="18" width="12" height="10" rx="1" fill="none" stroke="#27AE60" stroke-width="1.2"/>'+
         '<rect x="20" y="34" width="12" height="10" rx="1" fill="none" stroke="#27AE60" stroke-width="1.2"/>'+
         '<rect x="38" y="34" width="12" height="10" rx="1" fill="none" stroke="#27AE60" stroke-width="1.2"/>'+
         '<line x1="35" y1="48" x2="35" y2="58" stroke="#27AE60" stroke-width="2"/>'+
         '<text x="35" y="14" text-anchor="middle" font-size="6" fill="#27AE60" font-weight="600">商业</text>',
    desc:'商业负载，商场/写字楼用电'
  },
  {
    id:'ev-charger',  category:'load',
    name:'充电桩',  label:'充电桩',
    width:60, height:64,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<rect x="14" y="20" width="32" height="38" rx="6" fill="rgba(52,152,219,0.1)" stroke="#3498DB" stroke-width="2.2"/>'+
         '<rect x="20" y="26" width="20" height="10" rx="3" fill="none" stroke="#3498DB" stroke-width="1.2"/>'+
         '<text x="30" y="33" text-anchor="middle" font-size="7" fill="#3498DB" font-weight="700">kW</text>'+
         '<line x1="30" y1="40" x2="30" y2="50" stroke="#3498DB" stroke-width="2"/>'+
         '<circle cx="30" cy="53" r="4" fill="none" stroke="#3498DB" stroke-width="1.5"/>'+
         '<line x1="18" y1="8" x2="42" y2="8" stroke="#3498DB" stroke-width="2.5"/>'+
         '<circle cx="18" cy="8" r="3" fill="none" stroke="#3498DB" stroke-width="1.2"/>'+
         '<circle cx="42" cy="8" r="3" fill="none" stroke="#3498DB" stroke-width="1.2"/>'+
         '<line x1="18" y1="8" x2="18" y2="20" stroke="#3498DB" stroke-width="1.5"/>'+
         '<line x1="42" y1="8" x2="42" y2="20" stroke="#3498DB" stroke-width="1.5"/>',
    desc:'充电桩，EV充电负载'
  },
  {
    id:'data-center',  category:'load',
    name:'数据中心',  label:'数据中心',
    width:80, height:60,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<rect x="6" y="6" width="68" height="48" rx="5" fill="rgba(142,68,173,0.08)" stroke="#8E44AD" stroke-width="2.2"/>'+
         '<rect x="12" y="12" width="14" height="16" rx="2" fill="none" stroke="#8E44AD" stroke-width="1.2"/>'+
         '<rect x="30" y="12" width="14" height="16" rx="2" fill="none" stroke="#8E44AD" stroke-width="1.2"/>'+
         '<rect x="48" y="12" width="14" height="16" rx="2" fill="none" stroke="#8E44AD" stroke-width="1.2"/>'+
         '<rect x="12" y="32" width="14" height="14" rx="2" fill="none" stroke="#8E44AD" stroke-width="1.2"/>'+
         '<rect x="30" y="32" width="14" height="14" rx="2" fill="none" stroke="#8E44AD" stroke-width="1.2"/>'+
         '<rect x="48" y="32" width="14" height="14" rx="2" fill="none" stroke="#8E44AD" stroke-width="1.2"/>'+
         '<circle cx="19" cy="19" r="2" fill="#F39C12"/>'+
         '<circle cx="37" cy="19" r="2" fill="#2ECC71"/>'+
         '<circle cx="55" cy="19" r="2" fill="#2ECC71"/>',
    desc:'数据中心，服务器/算力负载'
  },
  {
    id:'ac-load',  category:'load',
    name:'交流负载',  label:'交流负载',
    width:70, height:50,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<rect x="6" y="8" width="58" height="34" rx="6" fill="rgba(231,76,60,0.08)" stroke="#E74C3C" stroke-width="2.2"/>'+
         '<path d="M18 30 C10 30, 10 20, 18 20 C26 20, 26 30, 34 30 C42 30, 42 20, 50 20 C48 30, 48 30, 50 30" fill="none" stroke="#E74C3C" stroke-width="2.2" stroke-linecap="round"/>'+
         '<text x="35" y="14" text-anchor="middle" font-size="7" fill="#E74C3C" font-weight="700">AC</text>',
    desc:'交流负载，AC 380V/220V'
  },
  {
    id:'dc-load',  category:'load',
    name:'直流负载',  label:'直流负载',
    width:70, height:50,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<rect x="6" y="8" width="58" height="34" rx="6" fill="rgba(52,152,219,0.08)" stroke="#3498DB" stroke-width="2.2"/>'+
         '<line x1="18" y1="20" x2="52" y2="20" stroke="#3498DB" stroke-width="2.2" stroke-linecap="round"/>'+
         '<line x1="18" y1="30" x2="42" y2="30" stroke="#3498DB" stroke-width="2.2" stroke-linecap="round"/>'+
         '<circle cx="56" cy="20" r="2.5" fill="#3498DB"/>'+
         '<circle cx="46" cy="30" r="2.5" fill="#3498DB"/>'+
         '<text x="35" y="14" text-anchor="middle" font-size="7" fill="#3498DB" font-weight="700">DC</text>',
    desc:'直流负载，DC 48V/220V'
  },

  /* ─── 连接元件 ─── */
  {
    id:'conn-point',  category:'aux',
    name:'连接点',  label:'连接点',
    width:24, height:24,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<circle cx="12" cy="12" r="8" fill="rgba(255,255,255,0.07)" stroke="#1ABC9C" stroke-width="2.5"/>'+
         '<circle cx="12" cy="12" r="3" fill="#1ABC9C"/>',
    desc:'连接点，拓扑图中节点连接标记'
  },
  {
    id:'arrow-oneway',  category:'aux',
    name:'单向箭头',  label:'单向箭头',
    width:60, height:28,
    ports:[
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<line x1="6" y1="14" x2="42" y2="14" stroke="#E74C3C" stroke-width="2.5" stroke-linecap="round"/>'+
         '<polygon points="42,6 56,14 42,22" fill="#E74C3C"/>',
    desc:'单向箭头，表示功率/信号流向'
  },
  {
    id:'arrow-twoway',  category:'aux',
    name:'双向箭头',  label:'双向箭头',
    width:60, height:28,
    ports:[
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<line x1="8" y1="14" x2="52" y2="14" stroke="#F39C12" stroke-width="2.5" stroke-linecap="round"/>'+
         '<polygon points="8,6 0,14 8,22" fill="#F39C12"/>'+
         '<polygon points="52,6 60,14 52,22" fill="#F39C12"/>',
    desc:'双向箭头，表示双向功率/信号'
  },
  {
    id:'node-junction',  category:'aux',
    name:'节点',  label:'节点',
    width:32, height:32,
    ports:[
      { id:'top',    side:'top',    x:0.5, y:0   },
      { id:'bottom', side:'bottom', x:0.5, y:1   },
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<circle cx="16" cy="16" r="12" fill="rgba(52,152,219,0.1)" stroke="#3498DB" stroke-width="2.2"/>'+
         '<circle cx="16" cy="16" r="4" fill="#3498DB"/>'+
         '<circle cx="16" cy="16" r="1.5" fill="#fff"/>',
    desc:'节点，多线缆交叉/分支连接节点'
  },
  {
    id:'connector',  category:'aux',
    name:'连接器',  label:'连接器',
    width:44, height:24,
    ports:[
      { id:'left',   side:'left',   x:0,   y:0.5 },
      { id:'right',  side:'right',  x:1,   y:0.5 }
    ],
    svg: '<rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"3\" fill=\"rgba(155,89,182,0.15)\" stroke=\"#9B59B6\" stroke-width=\"2\"/>'+
         '<rect x=\"24\" y=\"4\" width=\"16\" height=\"16\" rx=\"3\" fill=\"rgba(155,89,182,0.1)\" stroke=\"#9B59B6\" stroke-width=\"1.5\" stroke-dasharray=\"2 2\"/>'+
         '<line x1=\"20\" y1=\"8\" x2=\"24\" y2=\"8\" stroke=\"#9B59B6\" stroke-width=\"1.5\"/>'+
         '<line x1=\"20\" y1=\"16\" x2=\"24\" y2=\"16\" stroke=\"#9B59B6\" stroke-width=\"1.5\"/>',
    desc:'连接器，端子/接线端子'
  }
];

// ══ 按分类索引的快速查找表 ══
var COMPONENT_BY_ID = {};
COMPONENT_LIB.forEach(function(c) { COMPONENT_BY_ID[c.id] = c; });

// ══ 新建场景时的默认元件建议 ══
var PRESET_LAYOUTS = {
  'standard': {
    label: '标准储能方案',
    nodes: [
      { id:'n1', compId:'grid',        x:300, y:60,  label:'电网 10kV' },
      { id:'n2', compId:'transformer', x:290, y:160, label:'变压器' },
      { id:'n3', compId:'hv-cabinet',  x:200, y:280, label:'高压柜' },
      { id:'n4', compId:'pcs',         x:360, y:280, label:'PCS' },
      { id:'n5', compId:'lv-cabinet',  x:200, y:380, label:'低压柜' },
      { id:'n6', compId:'ess-cabinet', x:360, y:380, label:'储能柜' },
      { id:'n7', compId:'load',        x:200, y:480, label:'负载' }
    ],
    edges: [
      { id:'e1', from:'n1', to:'n2', fromPort:'bottom', toPort:'top', cableType:'power220v' },
      { id:'e2', from:'n2', to:'n3', fromPort:'bottom', toPort:'top', cableType:'power220v' },
      { id:'e3', from:'n2', to:'n4', fromPort:'bottom', toPort:'top', cableType:'power220v' },
      { id:'e4', from:'n3', to:'n5', fromPort:'bottom', toPort:'top', cableType:'ethernet' },
      { id:'e5', from:'n4', to:'n6', fromPort:'bottom', toPort:'top', cableType:'power220v' },
      { id:'e6', from:'n5', to:'n7', fromPort:'bottom', toPort:'top', cableType:'rs485' }
    ]
  }
};
