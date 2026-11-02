const http = require('http');

const PORT = process.env.MOBILE_PORT || 3005;
const TARGET_PORT = process.env.TARGET_PORT || 3000;

const html = `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Animem.uz - Telefon Ko'rinishi (Mobile Preview)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #09090f;
      color: #fff;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
      background-image: 
        radial-gradient(circle at 15% 15%, rgba(255, 0, 106, 0.12) 0%, transparent 40%),
        radial-gradient(circle at 85% 85%, rgba(121, 40, 202, 0.12) 0%, transparent 40%),
        linear-gradient(to bottom, #09090f, #050508);
    }
    
    /* Top Control Bar */
    header {
      background: rgba(14, 14, 20, 0.85);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-badge {
      background: linear-gradient(135deg, #ff006a, #7928ca);
      color: #fff;
      font-size: 11px;
      font-weight: 900;
      padding: 4px 10px;
      border-radius: 999px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      box-shadow: 0 0 15px rgba(255, 0, 106, 0.5);
    }
    .brand-title {
      font-size: 16px;
      font-weight: 800;
      letter-spacing: -0.3px;
    }
    .brand-title span {
      color: #ff006a;
    }

    .controls-group {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    
    .btn-group {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 3px;
      display: flex;
      align-items: center;
      gap: 3px;
    }
    
    .btn {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.7);
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.1);
    }
    .btn.active {
      background: #ff006a;
      color: #fff;
      box-shadow: 0 0 12px rgba(255, 0, 106, 0.5);
    }

    .url-input-box {
      display: flex;
      align-items: center;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 4px 10px;
      gap: 8px;
    }
    .url-input-box input {
      background: transparent;
      border: none;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      font-family: inherit;
      outline: none;
      width: 140px;
    }
    .url-btn {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #fff;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
    .url-btn:hover {
      background: #ff006a;
    }

    /* Main Stage */
    main {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      perspective: 1200px;
    }

    /* Phone Shell */
    .phone-container {
      position: relative;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      transform-origin: center center;
    }

    .phone-bezel {
      background: #1c1c20;
      border-radius: 54px;
      padding: 13px;
      box-shadow: 
        0 0 0 4px #2e2e34,
        0 0 0 6px #131316,
        0 30px 80px rgba(0, 0, 0, 0.9),
        0 0 50px rgba(255, 0, 106, 0.2);
      position: relative;
    }

    /* Side Buttons */
    .phone-bezel::before {
      content: '';
      position: absolute;
      left: -9px;
      top: 115px;
      width: 4px;
      height: 32px;
      background: #2e2e34;
      border-radius: 3px 0 0 3px;
      box-shadow: 0 45px 0 #2e2e34, 0 90px 0 #2e2e34;
    }
    .phone-bezel::after {
      content: '';
      position: absolute;
      right: -9px;
      top: 140px;
      width: 4px;
      height: 55px;
      background: #2e2e34;
      border-radius: 0 3px 3px 0;
    }

    .phone-screen {
      background: #000;
      border-radius: 42px;
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column;
    }

    /* Dynamic Island */
    .dynamic-island {
      position: absolute;
      top: 11px;
      left: 50%;
      transform: translateX(-50%);
      width: 105px;
      height: 28px;
      background: #000;
      border-radius: 20px;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.05);
      pointer-events: none;
    }
    .camera-lens {
      width: 11px;
      height: 11px;
      background: #080816;
      border-radius: 50%;
      border: 1px solid #16162a;
      position: relative;
    }
    .camera-lens::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 4px;
      height: 4px;
      background: #1a3055;
      border-radius: 50%;
    }
    .sensor {
      width: 7px;
      height: 7px;
      background: #0e0e1a;
      border-radius: 50%;
    }

    /* Status Bar */
    .status-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      font-size: 12px;
      font-weight: 700;
      color: #fff;
      z-index: 45;
      pointer-events: none;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
    }
    .status-bar-icons {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
    }

    /* Home Bar */
    .home-bar {
      position: absolute;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      width: 130px;
      height: 4px;
      background: rgba(255, 255, 255, 0.6);
      border-radius: 10px;
      z-index: 50;
      pointer-events: none;
    }

    /* Target Iframe */
    iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: #09090b;
    }

    /* Device Dimensions */
    .device-iphone-15-pro {
      width: 393px;
      height: 852px;
    }
    .device-galaxy-s24 {
      width: 360px;
      height: 780px;
    }
    .device-iphone-se {
      width: 375px;
      height: 667px;
    }
    .device-ipad-mini {
      width: 768px;
      height: 980px;
    }

    .landscape .device-iphone-15-pro {
      width: 852px;
      height: 393px;
    }
    .landscape .dynamic-island {
      top: 50%;
      left: 14px;
      transform: translateY(-50%) rotate(90deg);
    }

    /* Quick Shortcuts bar */
    .shortcuts-bar {
      background: rgba(14, 14, 20, 0.7);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding: 10px 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .shortcut-pill {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.8);
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s;
      cursor: pointer;
    }
    .shortcut-pill:hover {
      background: rgba(255, 0, 106, 0.2);
      border-color: rgba(255, 0, 106, 0.4);
      color: #fff;
    }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <span class="brand-badge">Mobil Rejim</span>
      <div class="brand-title">Animem<span>.uz</span> Simulator</div>
    </div>

    <!-- Controls -->
    <div class="controls-group">
      <!-- Device Switcher -->
      <div class="btn-group">
        <button class="btn active" onclick="setDevice('iphone-15-pro', this)">
          📱 iPhone 15 Pro
        </button>
        <button class="btn" onclick="setDevice('galaxy-s24', this)">
          🤖 Galaxy S24
        </button>
        <button class="btn" onclick="setDevice('iphone-se', this)">
          📱 iPhone SE
        </button>
        <button class="btn" onclick="setDevice('ipad-mini', this)">
          📋 Planshet
        </button>
      </div>

      <!-- Orientation -->
      <div class="btn-group">
        <button class="btn active" id="btn-portrait" onclick="setOrientation('portrait')">
          📱 Tik (Portret)
        </button>
        <button class="btn" id="btn-landscape" onclick="setOrientation('landscape')">
          🔄 Yotiq (Albom)
        </button>
      </div>

      <!-- Scale -->
      <div class="btn-group">
        <button class="btn" onclick="setScale(0.85, this)">85%</button>
        <button class="btn active" onclick="setScale(1, this)">100%</button>
      </div>

      <!-- URL Input & Refresh -->
      <div class="url-input-box">
        <input type="text" id="routeInput" value="/" placeholder="/animelar" onkeydown="if(event.key==='Enter') navigateIframe()">
        <button class="url-btn" onclick="navigateIframe()">O'tish</button>
      </div>

      <button class="btn" style="background: rgba(255,255,255,0.08);" onclick="reloadIframe()" title="Qayta yuklash">
        🔄 Yangilash
      </button>

      <a href="http://localhost:${TARGET_PORT}" target="_blank" class="btn" style="background: #ff006a; color: #fff;">
        ↗️ Katta ekranda ochish
      </a>
    </div>
  </header>

  <!-- Quick Page Shortcuts -->
  <div class="shortcuts-bar">
    <span style="font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.4); text-transform: uppercase; margin-right: 4px;">Tezkor sahifalar:</span>
    <span class="shortcut-pill" onclick="goTo('/')">🏠 Bosh sahifa</span>
    <span class="shortcut-pill" onclick="goTo('/animelar')">🎬 Animelar</span>
    <span class="shortcut-pill" onclick="goTo('/jadval')">📅 Jadval</span>
    <span class="shortcut-pill" onclick="goTo('/yangi-chiqishlar')">⏰ Yangi chiqishlar</span>
    <span class="shortcut-pill" onclick="goTo('/top100')">⭐ Top 100</span>
    <span class="shortcut-pill" onclick="goTo('/music')">🎵 Musiqa</span>
    <span class="shortcut-pill" onclick="goTo('/donat')">💖 Donat</span>
  </div>

  <main>
    <div class="phone-container" id="phoneWrapper">
      <div class="phone-bezel">
        <div class="phone-screen device-iphone-15-pro" id="screenBox">
          
          <!-- Dynamic Island -->
          <div class="dynamic-island">
            <div class="sensor"></div>
            <div class="camera-lens"></div>
          </div>

          <!-- Status Bar -->
          <div class="status-bar">
            <span id="currentTime">09:41</span>
            <div class="status-bar-icons">
              <span>5G</span>
              <span>📶</span>
              <span>🔋 100%</span>
            </div>
          </div>

          <!-- Embedded Website -->
          <iframe id="previewIframe" src="http://localhost:${TARGET_PORT}"></iframe>

          <!-- Home Bar -->
          <div class="home-bar"></div>
        </div>
      </div>
    </div>
  </main>

  <script>
    const iframe = document.getElementById('previewIframe');
    const screenBox = document.getElementById('screenBox');
    const phoneWrapper = document.getElementById('phoneWrapper');
    const routeInput = document.getElementById('routeInput');
    const baseUrl = 'http://localhost:${TARGET_PORT}';

    let currentDevice = 'device-iphone-15-pro';

    function setDevice(deviceClass, btn) {
      document.querySelectorAll('.btn-group button').forEach(b => {
        if (b.innerText.includes('iPhone') || b.innerText.includes('Galaxy') || b.innerText.includes('Planshet')) {
          b.classList.remove('active');
        }
      });
      if (btn) btn.classList.add('active');

      screenBox.classList.remove('device-iphone-15-pro', 'device-galaxy-s24', 'device-iphone-se', 'device-ipad-mini');
      currentDevice = 'device-' + deviceClass;
      screenBox.classList.add(currentDevice);
    }

    function setOrientation(mode) {
      document.getElementById('btn-portrait').classList.toggle('active', mode === 'portrait');
      document.getElementById('btn-landscape').classList.toggle('active', mode === 'landscape');
      phoneWrapper.classList.toggle('landscape', mode === 'landscape');
    }

    function setScale(scale, btn) {
      document.querySelectorAll('.btn-group button').forEach(b => {
        if (b.innerText.includes('%')) b.classList.remove('active');
      });
      if (btn) btn.classList.add('active');
      phoneWrapper.style.transform = 'scale(' + scale + ')';
    }

    function navigateIframe() {
      let path = routeInput.value.trim();
      if (!path.startsWith('/')) path = '/' + path;
      iframe.src = baseUrl + path;
    }

    function goTo(path) {
      routeInput.value = path;
      iframe.src = baseUrl + path;
    }

    function reloadIframe() {
      iframe.contentWindow.location.reload();
    }

    function updateTime() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const el = document.getElementById('currentTime');
      if (el) el.innerText = h + ':' + m;
    }
    setInterval(updateTime, 1000);
    updateTime();
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });
  res.end(html);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`📱 Mobile Preview Simulator running on http://localhost:${PORT}`);
  console.log(`   Target web app: http://localhost:${TARGET_PORT}`);
});

