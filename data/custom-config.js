// data/custom-config.js
// 自定义需求字段配置（由管理后台导出）
// 此文件覆盖 js/data.js 中的默认 DATA.reqFieldRegistry
// 将此文件放入 data/ 目录后，应用会自动加载

(function() {
  if (typeof DATA === 'undefined') return;

  // 自定义需求字段注册表
  // 格式与 js/data.js 中的 DATA.reqFieldRegistry 完全一致
  DATA.reqFieldRegistry = [
  {
    "id": "r-projectName",
    "section": "A",
    "label": "项目名称",
    "type": "text",
    "options": null,
    "defaultValue": "",
    "linkedCategory": null,
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-location",
    "section": "A",
    "label": "项目地区",
    "type": "select",
    "options": [
      "请选择地区",
      "华东",
      "华南",
      "华中",
      "华北",
      "西南",
      "西北",
      "东北",
      "港澳台",
      "海外"
    ],
    "defaultValue": "",
    "linkedCategory": null,
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-voltage",
    "section": "A",
    "label": "并网电压",
    "type": "select",
    "options": [
      "0.4kV",
      "10kV",
      "35kV"
    ],
    "defaultValue": "0.4kV",
    "linkedCategory": null,
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-power",
    "section": "A",
    "label": "并网功率",
    "type": "select",
    "options": [
      "请选择功率",
      "62.5kW",
      "120kW",
      "125kW",
      "187kW",
      "218kW",
      "420kW"
    ],
    "defaultValue": "125KW",
    "linkedCategory": null,
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-capacity",
    "section": "A",
    "label": "单台容量(kWh)",
    "type": "select",
    "options": [
      "请选择容量",
      "215",
      "218",
      "241",
      "261",
      "350"
    ],
    "defaultValue": "",
    "linkedCategory": null,
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-cabinetDemandQty",
    "section": "A",
    "label": "需求台数",
    "type": "text",
    "defaultValue": "",
    "options": null,
    "linkedCategory": null,
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-packCool",
    "section": "A",
    "label": "PACK冷却方式",
    "type": "select",
    "options": [
      "液冷",
      "风冷",
      "其他"
    ],
    "defaultValue": "液冷",
    "linkedCategory": null,
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-cellBrand",
    "section": "A",
    "label": "电芯品牌",
    "type": "select",
    "options": [
      "EVE",
      "楚能",
      "CATL",
      "海辰",
      "其他"
    ],
    "defaultValue": "EVE",
    "linkedCategory": null,
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-scene",
    "section": "A",
    "label": "应用场景/拓扑",
    "type": "select",
    "options": [
      "拓扑1",
      "拓扑2",
      "拓扑3",
      "拓扑4",
      "拓扑5",
      "拓扑6",
      "拓扑7",
      "其他"
    ],
    "defaultValue": "",
    "linkedCategory": null,
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-contractNo",
    "section": "A",
    "label": "合同编号",
    "type": "text",
    "options": null,
    "defaultValue": "",
    "linkedCategory": null,
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-antiReverse",
    "section": "B",
    "label": "防逆流",
    "type": "select",
    "options": [
      "需要",
      "不需要"
    ],
    "linkedBlockId": null,
    "linkedCategory": "secondaryMeters",
    "hiddenOn": "不需要",
    "defaultValue": "需要",
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-meterRead",
    "section": "B",
    "label": "抄表",
    "type": "select",
    "options": [
      "需要",
      "不需要"
    ],
    "linkedBlockId": null,
    "linkedCategory": "primaryMeters",
    "hiddenOn": "不需要",
    "defaultValue": "需要",
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-busCabinet",
    "section": "B",
    "label": "汇流柜",
    "type": "select",
    "options": [
      "不需要",
      "需要"
    ],
    "linkedBlockId": null,
    "linkedCategory": "combiners",
    "hiddenOn": "不需要",
    "defaultValue": "不需要",
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-isolation",
    "section": "B",
    "label": "隔离变压器",
    "type": "select",
    "options": [
      "不需要",
      "需要"
    ],
    "defaultValue": "不需要",
    "linkedCategory": null,
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-offGrid",
    "section": "B",
    "label": "离网功能",
    "type": "select",
    "options": [
      "不需要",
      "需要"
    ],
    "defaultValue": "不需要",
    "linkedCategory": "stsCabinets",
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-nLine",
    "section": "B",
    "label": "N线处理",
    "type": "select",
    "options": [
      "N线不断,保持接地",
      "N线断开"
    ],
    "defaultValue": "",
    "linkedCategory": null,
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-fastSwitch",
    "section": "B",
    "label": "快切功能",
    "type": "select",
    "options": [
      "不需要",
      "需要"
    ],
    "defaultValue": "不需要",
    "linkedCategory": null,
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": false,
    "isLinked": false
  },
  {
    "id": "r-sts",
    "section": "B",
    "label": "STS功能",
    "type": "select",
    "options": [
      "不需要",
      "需要"
    ],
    "linkedBlockId": null,
    "linkedCategory": "stsCabinets",
    "hiddenOn": "不需要",
    "defaultValue": "不需要",
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-diesel",
    "section": "B",
    "label": "柴发接入",
    "type": "select",
    "options": [
      "不需要",
      "需要"
    ],
    "defaultValue": "不需要",
    "linkedCategory": null,
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-solar",
    "section": "B",
    "label": "光伏接入",
    "type": "select",
    "options": [
      "不需要",
      "需要"
    ],
    "defaultValue": "不需要",
    "linkedCategory": null,
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-acSwitch",
    "section": "B",
    "label": "交流断路器",
    "type": "select",
    "options": [
      "标准配置",
      "定制"
    ],
    "defaultValue": "标准配置",
    "linkedCategory": null,
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-demandMgmt",
    "section": "B",
    "label": "需量管理",
    "type": "select",
    "options": [
      "不需要",
      "需要"
    ],
    "defaultValue": "不需要",
    "linkedCategory": null,
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-cabinetCable",
    "section": "B",
    "label": "柜间线缆",
    "type": "select",
    "options": [
      "不需要",
      "需要"
    ],
    "defaultValue": "不需要",
    "linkedCategory": null,
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-network",
    "section": "C",
    "label": "网络方式",
    "type": "select",
    "options": [
      "4G路由",
      "WIFI",
      "有线",
      "其他"
    ],
    "defaultValue": "4G路由",
    "linkedCategory": "routers",
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-simCard",
    "section": "C",
    "label": "流量卡",
    "type": "select",
    "options": [
      "需要",
      "不需要"
    ],
    "defaultValue": "需要",
    "linkedCategory": "simCards",
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-monitorCabinet",
    "section": "C",
    "label": "监控柜",
    "type": "select",
    "options": [
      "不需要",
      "需要"
    ],
    "linkedBlockId": null,
    "linkedCategory": "monitorCabinets",
    "hiddenOn": "不需要",
    "defaultValue": "不需要",
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-monitorDemand",
    "section": "C",
    "label": "监控需求",
    "type": "select",
    "options": [
      "需要",
      "不需要"
    ],
    "defaultValue": "需要",
    "linkedCategory": "ems",
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-software",
    "section": "C",
    "label": "后台软件",
    "type": "select",
    "options": [
      "INFY后台",
      "客户定制"
    ],
    "defaultValue": "INFY后台",
    "linkedCategory": null,
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-gridPoint",
    "section": "C",
    "label": "并网点",
    "type": "text",
    "options": null,
    "defaultValue": "",
    "linkedCategory": null,
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-silkPrint",
    "section": "D",
    "label": "丝印",
    "type": "select",
    "options": [
      "INFY丝印",
      "客户定制"
    ],
    "defaultValue": "INFY丝印",
    "linkedCategory": null,
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-nameplate",
    "section": "D",
    "label": "铭牌",
    "type": "select",
    "options": [
      "采用INFY信息",
      "客户定制"
    ],
    "defaultValue": "采用INFY信息",
    "linkedCategory": null,
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-liftHook",
    "section": "D",
    "label": "吊钩",
    "type": "select",
    "options": [
      "不需要",
      "需要"
    ],
    "defaultValue": "不需要",
    "linkedCategory": null,
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  },
  {
    "id": "r-otherReq",
    "section": "D",
    "label": "其他需求",
    "type": "textarea",
    "options": null,
    "defaultValue": "",
    "linkedCategory": null,
    "linkedBlockId": null,
    "hiddenOn": null,
    "showInReq": true,
    "isLinked": false
  }
];
})();
