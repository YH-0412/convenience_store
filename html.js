// --- UI helpers ---
function scrollToSection(id){
  const el = document.getElementById(id);
  if(!el) return;
  const y = el.getBoundingClientRect().top + window.pageYOffset - 80;
  window.scrollTo({ top: y, behavior: "smooth" });
  closeNavMenu(); // ✅ 手機點選後自動收合
}

function scrollToTop(){ window.scrollTo({ top: 0, behavior: "smooth" }); }

function toggleBrandInfo(element){
  document.querySelectorAll('.brand-card').forEach(card => {
    if(card !== element) card.classList.remove('active');
  });
  element.classList.toggle('active');
}

function toggleTheme(){
  document.body.classList.toggle('dark-mode');
  const btn = document.querySelector('.theme-toggle');
  const isDark = document.body.classList.contains('dark-mode');
  btn.textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function animateCard(el){
  el.style.transform = "translateY(-7px) scale(1.02)";
  setTimeout(()=>{ el.style.transform = ""; }, 180);
}

// ✅ 折疊 Navbar logic
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");

function toggleNavMenu(){
  navLinks.classList.toggle("show");
  const opened = navLinks.classList.contains("show");
  navToggle.setAttribute("aria-expanded", opened ? "true" : "false");
  navToggle.textContent = opened ? "✕" : "☰";
}
function closeNavMenu(){
  navLinks.classList.remove("show");
  navToggle.setAttribute("aria-expanded", "false");
  navToggle.textContent = "☰";
}

navToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleNavMenu();
});

// 點外面收起（手機體驗）
document.addEventListener("click", (e) => {
  if(!navLinks.classList.contains("show")) return;
  const clickedInside = navLinks.contains(e.target) || navToggle.contains(e.target);
  if(!clickedInside) closeNavMenu();
});

// 捲動就收起（避免遮住內容）
window.addEventListener("scroll", () => {
  if(navLinks.classList.contains("show")) closeNavMenu();
}, { passive: true });

// Navbar shadow + scrollTop button + cc 動態
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  const btn = document.getElementById('scrollTopBtn');

  if(window.scrollY > 10) navbar.classList.add('scrolled');
  else navbar.classList.remove('scrolled');

  if(window.scrollY > 350) btn.classList.add('visible');
  else btn.classList.remove('visible');

  if (window.scrollY > 40) navbar.classList.add('cc');
  else navbar.classList.remove('cc');
});

// Load saved theme
if(localStorage.getItem('theme') === 'dark'){
  document.body.classList.add('dark-mode');
  document.querySelector('.theme-toggle').textContent = '☀️';
}

// --- MongoDB Charts embed ---
const baseUrl = "https://charts.mongodb.com/charts-project-0-hrywltb";
const dashboardId = "69424a29-3617-4b8e-8c65-12ff665a20f7";

const sdk = new ChartsEmbedSDK({ baseUrl });

const dashboard = sdk.createDashboard({
  dashboardId,
  height: "100%",
  width: "100%",
  theme: "light",
  autoRefresh: true
});

const overlay = document.getElementById("loadingOverlay");
dashboard.render(document.getElementById("dashboardMount"))
  .then(() => {
    if(overlay) overlay.style.display = "none";
  })
  .catch(err => {
    console.error("Error rendering dashboard:", err);
    if(overlay){
      overlay.innerHTML = '<span style="color:#e53e3e; font-weight:800;">⚠️ 儀表板載入失敗，請檢查網路或 Dashboard ID</span>';
    }
  });

/* =========================================================
   ✅ KPI Carousel logic（多卡版本）
   - 每頁移動 perView 張
   - dots 代表頁數
   - 手機拖曳 / 左右鍵支援
   ========================================================= */
(function(){
  const root = document.getElementById("kpiCarousel");
  if(!root) return;

  const track = root.querySelector(".kpi-track");
  const cards = Array.from(root.querySelectorAll(".kpi-card"));
  const prev = root.querySelector(".kpi-arrow.prev");
  const next = root.querySelector(".kpi-arrow.next");
  const dotsWrap = document.getElementById("kpiDots");

  let page = 0;
  let perView = 5;
  let totalPages = 1;
  let cardW = 0;
  let gap = 14;

  function readLayout(){
    const pv = getComputedStyle(root).getPropertyValue("--perView").trim();
    perView = Math.max(1, parseInt(pv || "5", 10));

    const tg = getComputedStyle(track).gap || "14px";
    gap = parseFloat(tg);

    cardW = cards[0]?.getBoundingClientRect().width || 0;

    totalPages = Math.max(1, Math.ceil(cards.length / perView));
    page = Math.min(page, totalPages - 1);

    buildDots();
    render();
  }

  function buildDots(){
    dotsWrap.innerHTML = "";
    for(let i=0;i<totalPages;i++){
      const b = document.createElement("button");
      b.type = "button";
      b.className = "kpi-dot" + (i===page ? " active" : "");
      b.setAttribute("aria-label", `第 ${i+1} 頁`);
      b.addEventListener("click", ()=> { page = i; render(); });
      dotsWrap.appendChild(b);
    }
  }

  function render(){
    const offsetCards = page * perView;
    const x = -(offsetCards * (cardW + gap));
    track.style.transform = `translateX(${x}px)`;

    prev.disabled = (page === 0);
    next.disabled = (page === totalPages - 1);

    Array.from(dotsWrap.children).forEach((d, i) => {
      d.classList.toggle("active", i === page);
    });
  }

  prev.addEventListener("click", ()=> { page = Math.max(0, page - 1); render(); });
  next.addEventListener("click", ()=> { page = Math.min(totalPages - 1, page + 1); render(); });

  // 鍵盤左右鍵
  window.addEventListener("keydown", (e) => {
    if(document.activeElement && ["INPUT","TEXTAREA"].includes(document.activeElement.tagName)) return;
    if(e.key === "ArrowLeft") { page = Math.max(0, page - 1); render(); }
    if(e.key === "ArrowRight") { page = Math.min(totalPages - 1, page + 1); render(); }
  });

  // 手機拖曳滑動
  const viewport = root.querySelector(".kpi-viewport");
  let startX = 0;
  let startTranslate = 0;
  let dragging = false;

  function getCurrentTranslate(){
    const m = track.style.transform.match(/translateX\(([-0-9.]+)px\)/);
    return m ? parseFloat(m[1]) : 0;
  }

  viewport.addEventListener("pointerdown", (e) => {
    dragging = true;
    startX = e.clientX;
    startTranslate = getCurrentTranslate();
    viewport.setPointerCapture(e.pointerId);
    track.style.transition = "none";
  });

  viewport.addEventListener("pointermove", (e) => {
    if(!dragging) return;
    const dx = e.clientX - startX;
    track.style.transform = `translateX(${startTranslate + dx}px)`;
  });

  viewport.addEventListener("pointerup", (e) => {
    if(!dragging) return;
    dragging = false;
    track.style.transition = "transform .35s ease";

    const dx = e.clientX - startX;
    if(Math.abs(dx) > 60){
      if(dx < 0) page = Math.min(totalPages - 1, page + 1);
      else page = Math.max(0, page - 1);
    }
    render();
  });

  viewport.addEventListener("pointercancel", ()=> {
    dragging = false;
    track.style.transition = "transform .35s ease";
    render();
  });

  window.addEventListener("resize", () => {
    clearTimeout(window.__kpiResizeTimer);
    window.__kpiResizeTimer = setTimeout(readLayout, 80);
  });

  readLayout();
})();

// ✅ Chatbot logic (no backend)
(function(){
  const launcher = document.getElementById("botLauncher");
  const panel = document.getElementById("botPanel");
  const closeBtn = document.getElementById("botClose");
  const badge = document.getElementById("botBadge");
  const msgBox = document.getElementById("botMessages");
  const form = document.getElementById("botForm");
  const input = document.getElementById("botText");
  const quick = document.getElementById("botQuick");

  const KB = [
    {
      keys: ["做什麼", "介紹", "網站", "專題"],
      answer:
`這個網站是「台灣五大便利商店門市分析」的儀表板展示。
流程：開放資料 → Python 清洗 → MongoDB Atlas → Atlas Charts → 嵌入到此網頁。
你可以在下方視覺化區查看縣市分布、品牌市占、人口/密度關係等結果。`
    },
    {
      keys: ["五大", "幾間", "店數", "總店數", "各有幾間"],
      answer:
`五大品牌的全台門市數是以「status=1（營業中）」為條件，
在 MongoDB 用 Aggregation 依 brand 分組計算得到。`
    },
    {
      keys: ["資料來源", "opendata", "開放資料"],
      answer:
`資料來源：政府開放資料（門市清冊）＋（可選）人口資料（用於每萬人店數等指標）。
我們先清洗欄位/縣市映射/statusText，再匯入 MongoDB Atlas 進行分析。`
    },
    {
      keys: ["status", "status=1", "營業中", "停業", "撤銷", "廢止"],
      answer:
`status 是門市狀態欄位。
常見對應：
1=核准設立（營業中）、2=停業、3=廢止、6=撤銷。
目前統計通常會用 status=1 代表「營業中門市」。`
    },
    {
      keys: ["為什麼", "不直接", "連", "mongodb", "前端"],
      answer:
`前端不直接連 MongoDB 是為了安全與架構正確：
1) 會暴露連線字串/帳密
2) 需要後端才能安全存取
我們改用 Atlas Charts 做視覺化中介，前端只負責嵌入與展示。`
    }
  ];

  function addMessage(text, who){
    const row = document.createElement("div");
    row.className = "bot-row " + who;
    const bubble = document.createElement("div");
    bubble.className = "bot-bubble";
    bubble.innerHTML = text;
    row.appendChild(bubble);
    msgBox.appendChild(row);
    msgBox.scrollTop = msgBox.scrollHeight;
  }
  window.addMessage = addMessage;

  function botReply(userText){
    const t = (userText || "").trim();
    if(!t) return;

    const hit = KB.find(item => item.keys.some(k => t.toLowerCase().includes(k.toLowerCase())));
    const reply = hit ? hit.answer :
`喵！我的功能是幫你解釋這個儀表板的圖表與指標～你可以問我：資料來源、status 意義、品牌市占怎麼算、為什麼用 Atlas Charts 等。`;

    setTimeout(() => addMessage(reply, "bot"), 220);
  }

  function openBot(){
    panel.style.display = "block";
    badge.style.display = "none";
    if(msgBox.childElementCount === 0){
      addMessage(`喵！我是喵喵小幫手 <img src="cat1.png" width="20" height="20" style="vertical-align:middle; margin:0 6px; border-radius:20%;"> 你想了解哪一部分？`, "bot");
    }
    setTimeout(()=> input.focus(), 0);
  }

  function closeBot(){ panel.style.display = "none"; }

  launcher.addEventListener("click", openBot);
  closeBtn.addEventListener("click", closeBot);

  quick.addEventListener("click", (e) => {
    const btn = e.target.closest(".bot-chip");
    if(!btn) return;
    const q = btn.textContent.trim();
    addMessage(q, "user");
    botReply(q);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value;
    input.value = "";
    addMessage(text, "user");
    botReply(text);
  });
})();

// ======= [新增] 喵喵分析資料（由你的 A/B 結果整理） =======
window.MEOW_ANALYTICS = {
  city_count: {
    "新北市": { total: 2612, rank: 1 },
    "臺北市": { total: 1842, rank: 2 },
    "臺中市": { total: 1767, rank: 3 },
    "桃園市": { total: 1584, rank: 4 },
    "高雄市": { total: 1330, rank: 5 },
    "臺南市": { total: 942, rank: 6 },
    "彰化縣": { total: 490, rank: 7 },
    "新竹縣": { total: 380, rank: 8 },
    "屏東縣": { total: 370, rank: 9 },
    "新竹市": { total: 316, rank: 10 },
    "苗栗縣": { total: 314, rank: 11 },
    "雲林縣": { total: 274, rank: 12 },
    "宜蘭縣": { total: 242, rank: 13 },
    "基隆市": { total: 228, rank: 14 },
    "南投縣": { total: 222, rank: 15 },
    "嘉義縣": { total: 189, rank: 16 },
    "花蓮縣": { total: 169, rank: 17 },
    "嘉義市": { total: 138, rank: 18 },
    "臺東縣": { total: 111, rank: 19 },
    "澎湖縣": { total: 56, rank: 20 },
    "金門縣": { total: 33, rank: 21 },
    "連江縣": { total: 13, rank: 22 }
  },

  city_brand_counts: {
    "嘉義市": { "7-ELEVEN": 74, "FamilyMart": 33, "PX MART": 20, "Hi-Life": 11 },
    "新竹市": { "PX MART": 23, "FamilyMart": 80, "OK MART": 1, "7-ELEVEN": 155, "Hi-Life": 57 },
    "苗栗縣": { "OK MART": 9, "7-ELEVEN": 161, "PX MART": 26, "FamilyMart": 81, "Hi-Life": 37 },
    "新北市": { "Hi-Life": 311, "FamilyMart": 840, "OK MART": 61, "7-ELEVEN": 1213, "PX MART": 187 },
    "臺南市": { "Hi-Life": 56, "OK MART": 1, "7-ELEVEN": 572, "PX MART": 119, "FamilyMart": 194 },
    "連江縣": { "FamilyMart": 3, "7-ELEVEN": 10 },
    "南投縣": { "PX MART": 25, "OK MART": 8, "FamilyMart": 57, "Hi-Life": 18, "7-ELEVEN": 114 },
    "宜蘭縣": { "PX MART": 28, "FamilyMart": 61, "OK MART": 10, "Hi-Life": 23, "7-ELEVEN": 120 },
    "臺北市": { "7-ELEVEN": 947, "PX MART": 149, "FamilyMart": 556, "Hi-Life": 177, "OK MART": 13 },
    "基隆市": { "PX MART": 24, "FamilyMart": 62, "OK MART": 34, "7-ELEVEN": 97, "Hi-Life": 11 },
    "屏東縣": { "PX MART": 41, "FamilyMart": 71, "7-ELEVEN": 202, "Hi-Life": 54, "OK MART": 2 },
    "臺東縣": { "7-ELEVEN": 69, "PX MART": 11, "FamilyMart": 31 },
    "澎湖縣": { "7-ELEVEN": 38, "FamilyMart": 10, "PX MART": 8 },
    "新竹縣": { "PX MART": 31, "OK MART": 13, "7-ELEVEN": 187, "FamilyMart": 93, "Hi-Life": 56 },
    "雲林縣": { "PX MART": 38, "OK MART": 3, "7-ELEVEN": 142, "FamilyMart": 63, "Hi-Life": 28 },
    "彰化縣": { "Hi-Life": 54, "OK MART": 19, "7-ELEVEN": 265, "PX MART": 60, "FamilyMart": 92 },
    "高雄市": { "FamilyMart": 298, "PX MART": 163, "OK MART": 11, "7-ELEVEN": 734, "Hi-Life": 124 },
    "桃園市": { "PX MART": 116, "7-ELEVEN": 771, "Hi-Life": 303, "OK MART": 60, "FamilyMart": 334 },
    "嘉義縣": { "PX MART": 19, "7-ELEVEN": 104, "Hi-Life": 24, "OK MART": 2, "FamilyMart": 40 },
    "花蓮縣": { "FamilyMart": 42, "PX MART": 21, "7-ELEVEN": 106 },
    "臺中市": { "OK MART": 39, "FamilyMart": 509, "PX MART": 177, "7-ELEVEN": 906, "Hi-Life": 136 },
    "金門縣": { "FamilyMart": 7, "PX MART": 3, "7-ELEVEN": 23 }
  }
};

// ======= [新增] 喵喵縣市分析外掛（支援多縣市比較） =======
(function(){
  const form = document.getElementById("botForm");
  const input = document.getElementById("botText");
  if(!form || !input) return;

  const D = window.MEOW_ANALYTICS || {};

  const norm = s => (s || "")
    .replace(/\s/g, "")
    .replace(/臺/g, "台")
    .toLowerCase();

  // 讓回傳一定對得到你資料的 key（你資料是 "臺北市"、"臺中市"、"臺南市"）
  const CITY_CANONICAL = {
    "台北市": "臺北市",
    "台中市": "臺中市",
    "台南市": "臺南市",
    "台東縣": "臺東縣"
  };
  const canonCity = c => CITY_CANONICAL[c] || c;

  // 1) 縣市同義詞（你可自己再加）
  const CITY_ALIASES = [
    { city: "台北市", keys: ["台北市","台北","北市","taipei"] },
    { city: "新北市", keys: ["新北市","新北","ntpc"] },
    { city: "桃園市", keys: ["桃園市","桃園","taoyuan"] },
    { city: "台中市", keys: ["台中市","台中","中市","taichung"] },
    { city: "台南市", keys: ["台南市","台南","南市","tainan"] },
    { city: "高雄市", keys: ["高雄市","高雄","kaohsiung"] },

    { city: "基隆市", keys: ["基隆市","基隆"] },
    { city: "新竹市", keys: ["新竹市","竹市"] },
    { city: "新竹縣", keys: ["新竹縣","竹縣"] },
    { city: "苗栗縣", keys: ["苗栗縣","苗栗"] },
    { city: "彰化縣", keys: ["彰化縣","彰化"] },
    { city: "南投縣", keys: ["南投縣","南投"] },
    { city: "雲林縣", keys: ["雲林縣","雲林"] },
    { city: "嘉義市", keys: ["嘉義市"] },
    { city: "嘉義縣", keys: ["嘉義縣"] },
    { city: "屏東縣", keys: ["屏東縣","屏東"] },
    { city: "宜蘭縣", keys: ["宜蘭縣","宜蘭"] },
    { city: "花蓮縣", keys: ["花蓮縣","花蓮"] },
    { city: "台東縣", keys: ["台東縣","台東","臺東縣","臺東"] },
    { city: "澎湖縣", keys: ["澎湖縣","澎湖"] },
    { city: "金門縣", keys: ["金門縣","金門"] },
    { city: "連江縣", keys: ["連江縣","馬祖","連江"] }
  ];

  // 2) 行政區 → 縣市（先放常用的；可慢慢補）
  const DISTRICT_TO_CITY = {
    // 台北市
    "中山": "台北市", "大安": "台北市", "信義": "台北市", "士林": "台北市",
    "北投": "台北市", "內湖": "台北市", "文山": "台北市", "萬華": "台北市",
    "中正": "台北市", "松山": "台北市", "大同": "台北市", "南港": "台北市",

    // 新北市
    "板橋": "新北市", "三重": "新北市", "中和": "新北市", "永和": "新北市",
    "新莊": "新北市", "新店": "新北市", "土城": "新北市", "樹林": "新北市",
    "汐止": "新北市", "蘆洲": "新北市", "淡水": "新北市", "林口": "新北市",

    // 桃園市
    "中壢": "桃園市", "平鎮": "桃園市", "八德": "桃園市", "龜山": "桃園市",
    "蘆竹": "桃園市", "大溪": "桃園市", "楊梅": "桃園市", "大園": "桃園市",
    "觀音": "桃園市",

    // 高雄市
    "左營": "高雄市", "三民": "高雄市", "苓雅": "高雄市", "鳳山": "高雄市",
    "鼓山": "高雄市", "前鎮": "高雄市", "楠梓": "高雄市"
  };

  function detectCitiesSmart(text){
    const t = norm(text);
    const found = new Set();

    // A) 抓縣市（含別名）
    for(const item of CITY_ALIASES){
      for(const k of item.keys){
        if(t.includes(norm(k))){
          found.add(canonCity(item.city));
          break;
        }
      }
    }

    // B) 抓行政區 → 推縣市
    for(const [dist, city] of Object.entries(DISTRICT_TO_CITY)){
      const d = norm(dist);
      if(t.includes(d) || t.includes(d + "區")){
        found.add(canonCity(city));
      }
    }

    const arr = Array.from(found);
    arr.sort((c1, c2) => {
      const r1 = (D.city_count?.[c1]?.rank ?? 9999);
      const r2 = (D.city_count?.[c2]?.rank ?? 9999);
      return r1 - r2;
    });

    return arr.slice(0, 5);
  }

  function topN(obj, n=3){
    return Object.entries(obj || {}).sort((a,b)=>b[1]-a[1]).slice(0,n);
  }

  function buildCityReport(city){
    const cityCount = D.city_count?.[city];
    const brandCounts = D.city_brand_counts?.[city];

    if(!cityCount && !brandCounts){
      return `我找不到「${city.replace(/臺/g,"台")}」的分析資料🥲`;
    }

    let html = `📍 <b>${city.replace(/臺/g,"台")}｜分析結果</b><br><br>`;

    if(cityCount){
      html += `<b>① 縣市別便利商店數量排行</b><br>`;
      html += `- 總門市：<b>${cityCount.total}</b> 間<br>`;
      html += `- 全台排名：第 <b>${cityCount.rank}</b> 名<br><br>`;
    }

    if(brandCounts){
      const total = Object.values(brandCounts).reduce((s,v)=>s+v,0);
      const top3 = topN(brandCounts, 3);

      html += `<b>② 各縣市便利商店品牌組成（Top3）</b><br>`;
      html += `- 品牌合計門市：<b>${total}</b> 間<br>`;
      html += `- Top3：<br>` + top3.map(([k,v])=>{
        const pct = total ? ((v/total)*100).toFixed(1) : "0.0";
        return `　• ${k}：${v} 間（<b>${pct}%</b>）`;
      }).join("<br>");
      html += "<br><br>";

      html += `<b>③ 品牌 × 城市（熱度）</b><br>`;
      html += `- 你目前那張「品牌 × 城市密度」其實是「門市數熱度（count）」<br>`;
      html += `- 若要真正密度，需要除以人口（stores / 10k）。`;
    }

    return html;
  }

  function buildCompareReport(cities){
    const parts = [];
    const showName = c => c.replace(/臺/g,"台");

    parts.push(`📊 <b>縣市比較</b>（${cities.map(showName).join(" vs ")}）<br><br>`);

    // ① 總門市 / 排名
    parts.push(`<b>① 總門市 / 全台排名</b><br>`);
    for(const city of cities){
      const a = D.city_count?.[city];
      if(!a){ parts.push(`- ${showName(city)}：找不到總量資料<br>`); continue; }
      parts.push(`- <b>${showName(city)}</b>：${a.total} 間（第 ${a.rank} 名）<br>`);
    }
    parts.push("<br>");

    // ② Top1 品牌（含占比）
    parts.push(`<b>② Top1 品牌（含占比）</b><br>`);
    for(const city of cities){
      const bc = D.city_brand_counts?.[city];
      if(!bc){ parts.push(`- ${showName(city)}：找不到品牌資料<br>`); continue; }
      const total = Object.values(bc).reduce((s,v)=>s+v,0);
      const [topBrand, topCount] = Object.entries(bc).sort((a,b)=>b[1]-a[1])[0];
      const pct = total ? ((topCount/total)*100).toFixed(1) : "0.0";
      parts.push(`- <b>${showName(city)}</b>：${topBrand}（${topCount} 間 / ${pct}%）<br>`);
    }
    parts.push("<br>");

    // ③ 簡短洞察（取前兩個）
    if(cities.length >= 2){
      const c0 = cities[0], c1 = cities[1];
      const a0 = D.city_count?.[c0], a1 = D.city_count?.[c1];
      if(a0 && a1){
        const diff = a0.total - a1.total;
        const abs = Math.abs(diff);
        const lead = diff >= 0 ? c0 : c1;
        const lag  = diff >= 0 ? c1 : c0;
        parts.push(`🧠 洞察：<b>${showName(lead)}</b> 比 <b>${showName(lag)}</b> 多 ${abs} 間門市。`);
      }
    }

    parts.push(`<br><span style="color:#64748b;">提示：可輸入「台北 新北」、「板橋 中壢」、「台北 桃園 台中」</span>`);
    return parts.join("");
  }

  // 捕獲階段攔截：命中縣市/行政區才接手；支援多個
  form.addEventListener("submit", function(e){
    const text = input.value || "";
    const cities = detectCitiesSmart(text);

    if(!cities.length) return; // 沒命中 → 讓原本 botReply 流程處理

    e.preventDefault();
    e.stopImmediatePropagation();

    if(typeof window.addMessage === "function"){
      window.addMessage(text, "user");

      if(cities.length >= 2){
        window.addMessage(buildCompareReport(cities), "bot");
      }else{
        window.addMessage(buildCityReport(cities[0]), "bot");
      }

      input.value = "";
    }
  }, true);
})();

