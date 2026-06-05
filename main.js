// ============================================================
// main.js — Electron 主进程入口
// ============================================================
//
// 创建 BrowserWindow（1400×900）并加载 index.html。
// 通过 electron-builder 打包为 Windows NSIS 安装包。
// ============================================================
const { app, BrowserWindow } = require('electron')

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    autoHideMenuBar: true  // 隐藏菜单栏，界面更简洁
  })

  win.loadFile('login.html')
}

app.whenReady().then(createWindow)