const { app, BrowserWindow, ipcMain, shell, Menu, Tray, screen, globalShortcut } = require('electron');
const { spawn, execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');

const PORT = 47823;
const PS = ['-NoProfile', '-ExecutionPolicy', 'Bypass'];
// Los .ps1 se desempaquetan fuera del asar para que PowerShell pueda leerlos
const U = p => p.replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep);
const EXE = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
let win, tray, audioOn = false, shutdownWins = [], shutdownTimer = null;
const DRY = process.argv.includes('--dry-run') || process.env.CAPRI_DRYRUN === '1';

function createWindow() {
  const { x, y, width, height } = screen.getPrimaryDisplay().workArea;
  win = new BrowserWindow({
    x, y, width, height, transparent: true, frame: false, resizable: false, hasShadow: false,
    alwaysOnTop: true, skipTaskbar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true }
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile('index.html');
}

function createTray() {
  const toggle = () => (win.isVisible() ? win.hide() : win.show());
  tray = new Tray(path.join(__dirname, 'assets', 'icon.png'));
  tray.setToolTip('Capri');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Mostrar / ocultar', click: toggle },
    { label: 'Dormir / despertar', click: () => win.webContents.send('toggle-sleep') },
    { label: 'Editar lista de apps', click: () => shell.openPath(appsPath()) },
    { label: 'Iniciar con Windows', type: 'checkbox', enabled: app.isPackaged,
      checked: app.getLoginItemSettings({ path: EXE }).openAtLogin,
      click: i => app.setLoginItemSettings({ openAtLogin: i.checked, path: EXE }) },
    { type: 'separator' },
    { label: 'Apagar el PC', click: () => startShutdown(6) },
    { label: 'Salir', click: () => app.quit() }
  ]));
  tray.on('click', toggle);
}

// ---- Detección de audio del sistema (cualquier app o pestaña que suene) ----
function startAudioMonitor() {
  if (process.platform !== 'win32') return;
  const ps = spawn('powershell.exe', [...PS, '-File', U(path.join(__dirname, 'scripts', 'audio-meter.ps1'))], { windowsHide: true });
  let buf = '', hi = 0, lo = 0;
  ps.stdout.on('data', d => {
    buf += d; const lines = buf.split(/\r?\n/); buf = lines.pop();
    for (const l of lines) {
      const v = parseFloat(l); if (isNaN(v)) continue;
      if (v > 0.01) { hi++; lo = 0; } else { lo++; hi = 0; }
      let next = audioOn;
      if (!audioOn && hi >= 2) next = true;      // suena ~1 s -> activar
      if (audioOn && lo >= 10) next = false;     // silencio ~5 s -> desactivar
      if (next !== audioOn) { audioOn = next; win && win.webContents.send('audio', audioOn); }
    }
  });
  ps.stderr.on('data', d => console.error('[capri] audio:', String(d).trim()));
  ps.on('error', e => console.error('[capri] audio:', e.message));
  app.on('quit', () => ps.kill());
}

// ---- Apagado con pantalla negra y logo ----
function startShutdown(seconds = 6) {
  if (shutdownWins.length) return;
  win && win.hide();
  for (const d of screen.getAllDisplays()) {
    const w = new BrowserWindow({
      x: d.bounds.x, y: d.bounds.y, width: d.bounds.width, height: d.bounds.height,
      frame: false, resizable: false, skipTaskbar: true, show: false, backgroundColor: '#000000',
      webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true }
    });
    w.setAlwaysOnTop(true, 'screen-saver');
    w.loadFile('shutdown.html', { query: { s: String(seconds) } });
    w.once('ready-to-show', () => { w.show(); w.focus(); });
    shutdownWins.push(w);
  }
  globalShortcut.register('Escape', cancelShutdown);   // salida garantizada aunque la ventana no tenga foco
  shutdownTimer = setTimeout(() => {
    if (DRY) { console.log('[capri] --dry-run: no se apaga el equipo'); cancelShutdown(); return; }
    execFile('shutdown', ['/s', '/t', '0'], { windowsHide: true }, () => {});
  }, seconds * 1000);
}
function cancelShutdown() {
  clearTimeout(shutdownTimer); shutdownTimer = null;
  globalShortcut.unregister('Escape');
  shutdownWins.forEach(w => { if (!w.isDestroyed()) w.close(); });
  shutdownWins = [];
  win && win.show();
}
ipcMain.on('cancel-shutdown', cancelShutdown);

// ---- Acciones ----
const MEDIA = { play: [179, 'Play / pausa enviado.'], next: [176, 'Siguiente pista.'], prev: [177, 'Pista anterior.'] };
// apps.json vive en la carpeta de datos del usuario para poder editarlo (se copia la primera vez)
const appsPath = () => {
  const f = path.join(app.getPath('userData'), 'apps.json');
  if (!fs.existsSync(f)) {
    try { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, fs.readFileSync(path.join(__dirname, 'apps.json'))); } catch {}
  }
  return f;
};
const loadApps = () => { try { return JSON.parse(fs.readFileSync(appsPath(), 'utf8')); } catch { return []; } };

async function launch(target) {
  if (/^[a-z][a-z0-9+.-]+:/i.test(target)) { await shell.openExternal(target); return ''; }
  return shell.openPath(target);
}
const safe = async (fn, ok, fail) => { try { const r = await fn(); return r ? fail : ok; } catch { return fail; } };

const actions = {
  'open-claude': () => safe(() => shell.openPath(path.join(os.homedir(), '.claude')), 'Carpeta de Claude abierta.', 'No encuentro la carpeta .claude.'),
  'open-explorer': () => safe(() => shell.openPath(os.homedir()), 'Abriendo tu carpeta de usuario.', 'No he podido abrirla.'),
  'open-spotify': () => safe(() => launch('spotify:'), 'Abriendo Spotify...', 'No he podido abrir Spotify. ¿Está instalado?'),
  shutdown: () => { startShutdown(6); return 'Apagando...'; },
  launch: (arg) => { const a = loadApps()[arg]; return a ? safe(() => launch(a.open), `Abriendo ${a.name}...`, `No he podido abrir ${a.name}.`) : 'App desconocida.'; },
  media: (arg) => {
    const m = MEDIA[arg]; if (!m) return 'Comando desconocido.';
    execFile('powershell.exe', [...PS, '-File', U(path.join(__dirname, 'scripts', 'media-key.ps1')), '-Key', String(m[0])], { windowsHide: true }, () => {});
    return m[1];
  },
  'spotify-title': () => new Promise(resolve => {
    const cmd = '(Get-Process Spotify -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle } | Select-Object -First 1).MainWindowTitle';
    execFile('powershell.exe', [...PS, '-Command', cmd], { windowsHide: true }, (err, out) => {
      const t = String(out || '').trim();
      resolve(!t || /^Spotify( (Free|Premium))?$/i.test(t) ? 'Spotify no está reproduciendo nada (o está minimizado en la bandeja).' : 'Sonando: ' + t);
    });
  })
};

ipcMain.handle('get-character', () => JSON.parse(fs.readFileSync(path.join(__dirname, 'assets', 'character.json'), 'utf8')));
ipcMain.handle('get-apps', () => loadApps().map(a => a.name));
ipcMain.handle('get-audio', () => audioOn);
ipcMain.on('set-ignore', (_e, v) => win && win.setIgnoreMouseEvents(v, { forward: true }));
ipcMain.handle('action', (_e, id, arg) => (actions[id] ? actions[id](arg) : 'Acción desconocida.'));
ipcMain.on('context-menu', () => {
  Menu.buildFromTemplate([
    { label: 'Dormir / despertar', click: () => win.webContents.send('toggle-sleep') },
    { label: 'Salir', click: () => app.quit() }
  ]).popup({ window: win });
});

// ---- Servidor local para avisos externos ----
function startServer() {
  const srv = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/event') {
      let body = '';
      req.on('data', c => { body += c; if (body.length > 4096) req.destroy(); });
      req.on('end', () => {
        try {
          const j = JSON.parse(body || '{}');
          win && win.webContents.send('event', { message: String(j.message || 'Hola').slice(0, 200) });
          res.writeHead(204).end();
        } catch { res.writeHead(400).end(); }
      });
    } else res.writeHead(404).end();
  });
  srv.on('error', e => console.error('[capri] servidor:', e.message));
  srv.listen(PORT, '127.0.0.1', () => console.log(`[capri] escuchando en 127.0.0.1:${PORT}`));
}

if (!app.requestSingleInstanceLock()) app.quit();
else app.whenReady().then(() => { createWindow(); createTray(); startServer(); startAudioMonitor(); });
app.on('window-all-closed', () => app.quit());
