/**
 * Polymarket 每日异动简报：拉取监控市场昨日开盘/收盘，检测异动，写报告并可选推送到飞书
 * 用法: node polymarket-daily.js
 * 建议由 Windows 计划任务每天 8:00 北京时间执行
 *
 * 环境变量（可选）:
 *   FEISHU_WEBHOOK_URL - 飞书机器人 incoming webhook，配置后会推送简报
 */

const fs = require('fs');
const path = require('path');

const GAMMA_API = 'https://gamma-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';

const CONFIG_PATH = path.join(__dirname, 'polymarket-watch.json');
const REPORT_DIR = process.env.OPENCLAW_WORKSPACE || path.join(process.env.USERPROFILE || process.env.HOME, '.openclaw', 'workspace');
const REPORT_JSON = path.join(REPORT_DIR, 'polymarket_daily_report.json');
const REPORT_MD = path.join(REPORT_DIR, 'polymarket_daily_report.md');
// 桌面带日期的报告目录（环境变量 POLYMARKET_REPORT_DIR 可覆盖）
const DATED_REPORT_DIR = process.env.POLYMARKET_REPORT_DIR || path.join(process.env.USERPROFILE || process.env.HOME, 'Desktop', 'polymarket_reports');

function loadConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  const cfg = JSON.parse(raw);
  cfg.thresholdPct = cfg.thresholdPct ?? 15;
  cfg.feishuWebhookUrl = cfg.feishuWebhookUrl || process.env.FEISHU_WEBHOOK_URL || '';
  cfg.discover = cfg.discover ?? { enabled: false, topN: 25, thresholdPct: 15 };
  if (cfg.discover.enabled) {
    cfg.discover.topN = cfg.discover.topN ?? 25;
    cfg.discover.thresholdPct = cfg.discover.thresholdPct ?? cfg.thresholdPct;
  }
  return cfg;
}

/** 拉取按 24h 成交量排序的热门市场（Gamma API） */
async function fetchHotMarkets(limit) {
  const params = new URLSearchParams({
    active: 'true',
    closed: 'false',
    order: 'volume24hr',
    ascending: 'false',
    limit: String(limit),
  });
  const res = await fetch(`${GAMMA_API}/markets?${params}`);
  if (!res.ok) throw new Error(`fetchHotMarkets HTTP ${res.status}`);
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchMarket(slug) {
  const url = `${GAMMA_API}/markets/slug/${slug}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${slug}`);
  return res.json();
}

/** 拉取多结果事件（multiple choice）：GET /events?slug=xxx，返回 event 或 null */
async function fetchEvent(slug) {
  const res = await fetch(`${GAMMA_API}/events?slug=${encodeURIComponent(slug)}`);
  if (!res.ok) return null;
  const arr = await res.json();
  return Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
}

function getYesTokenId(market) {
  const raw = market.clobTokenIds;
  if (typeof raw === 'string') {
    const arr = JSON.parse(raw);
    return arr[0] || null;
  }
  return Array.isArray(raw) ? raw[0] : null;
}

async function fetchPriceHistory(tokenId, startTs, endTs) {
  const params = new URLSearchParams({
    market: tokenId,
    interval: '1h',
    startTs: String(startTs),
    endTs: String(endTs),
  });
  const res = await fetch(`${CLOB_API}/prices-history?${params}`);
  if (!res.ok) throw new Error(`prices-history HTTP ${res.status}`);
  const data = await res.json();
  return data.history || [];
}

/** 最近 48 小时的 startTs/endTs，用于拉取后按北京日聚合得到「昨天」 */
function getLast48hRange() {
  const endTs = Math.floor(Date.now() / 1000);
  const startTs = endTs - 48 * 3600;
  return { startTs, endTs };
}

function aggregateByDayBeijing(history) {
  const byDay = new Map();
  for (const point of history) {
    const date = new Date(point.t * 1000);
    const dayKey = date.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
    if (!byDay.has(dayKey)) byDay.set(dayKey, []);
    byDay.get(dayKey).push({ t: point.t, p: point.p });
  }
  return byDay;
}

/** 是否与投资/宏观相关（排除体育、电竞、娱乐、技术发布） */
function isInvestmentRelated(question) {
  if (!question || typeof question !== 'string') return false;
  const q = question.toLowerCase();
  // 排除体育、电竞、娱乐、技术发布、足球/篮球比分等
  const exclude = /\b(nba|fifa|la liga|hornets|pacers|heat|paraguay|atletico|villarreal|esports|lol|weibo|top esports|lpl|playoffs|finals|world cup|gpt|openai|released|release|movie|box office|oscars|grammys|vs\.|ucl|premier league|serie a|bundesliga|tottenham|palace|arsenal|liverpool|city|united|chelsea|madrid|barca|psg|bayern|milan|inter|juventus|over\/under|odds|winner|score)\b/i;
  if (exclude.test(q)) return false;
  // 包含政治、宏观、经济、地缘政治、大宗/能源
  const include = /\b(fed|rate|interest|iran|israel|strike|ceasefire|regime|trump|election|bitcoin|crypto|venezuela|supreme leader|hormuz|nominee|nominate|chair|uk|germany|france|president|senate|house|gdp|inflation|cpi|recession|policy|bill|ministry|war|conflict|peace|sanctions|economy|fiscal|budget|tariff|trade|china|us|russia|ukraine|middle east|nato|eu|un|crude|oil|gas|gold|silver|commodity|energy|wti|brent|futures|settle)\b/i;
  return include.test(q);
}

/** 根据市场问题/主题返回相关资产标签 */
function getRelatedAssets(question) {
  if (!question || typeof question !== 'string') return '—';
  const q = question.toLowerCase();
  const assets = [];
  if (/\b(fed|rate|interest|bps|meeting)\b/i.test(q)) assets.push('美债', '美元指数');
  if (/\b(iran|israel|strike|ceasefire|hormuz|regime|supreme leader|middle east)\b/i.test(q)) assets.push('原油', '黄金');
  if (/\b(bitcoin|btc|crypto)\b/i.test(q)) assets.push('BTC');
  if (/\b(trump|nomination|nominee|republican|presidential)\b/i.test(q)) assets.push('美股', '美元');
  if (/\b(venezuela)\b/i.test(q)) assets.push('原油', '新兴市场');
  if (/\b(crude|oil|wti|brent|gas)\b/i.test(q)) assets.push('原油', 'WTI/布伦特');
  if (/\b(gold|silver)\b/i.test(q)) assets.push('黄金', '白银');
  if (assets.length === 0 && isInvestmentRelated(question)) assets.push('避险资产');
  return assets.length ? assets.join('、') : '—';
}

async function run() {
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
  const config = loadConfig();
  const { startTs, endTs } = getLast48hRange();
  const threshold = (config.thresholdPct ?? 15) / 100;
  const anomalies = [];
  const monitored = [];
  const errors = [];
  const allData = [];

  for (const { slug, label } of config.markets) {
    try {
      // 先尝试按多结果事件拉取（multiple choice）
      const event = await fetchEvent(slug);
      if (event && event.markets && event.markets.length > 0) {
        const eventTitle = event.title || event.question || label;
        const eventLink = `https://polymarket.com/event/${slug}`;
        for (let i = 0; i < event.markets.length; i++) {
          const m = event.markets[i];
          const tokenId = getYesTokenId(m);
          if (!tokenId) continue;
          await sleep(80);
          try {
            const history = await fetchPriceHistory(tokenId, startTs, endTs);
            const byDay = aggregateByDayBeijing(history);
            const keys = [...byDay.keys()].sort();
            const yesterdayKey = keys.length >= 2 ? keys[keys.length - 2] : keys[keys.length - 1];
            const points = byDay.get(yesterdayKey);
            if (!points || points.length === 0) continue;
            const open = points[0].p;
            const close = points[points.length - 1].p;
            const move = close - open;
            const pointsPrices = points.map(p => p.p);
            const high = Math.max(...pointsPrices);
            const low = Math.min(...pointsPrices);
            const highPct = (high * 100).toFixed(1);
            const lowPct = (low * 100).toFixed(1);
            const openPct = (open * 100).toFixed(1);
            const closePct = (close * 100).toFixed(1);
            const movePct = (move * 100).toFixed(1);
            const outcomeLabel = m.groupItemTitle || m.question || (m.outcomes ? (typeof m.outcomes === 'string' ? JSON.parse(m.outcomes)[0] : m.outcomes[0]) : 'Yes');
            const question = event.markets.length > 1 ? `${eventTitle} — ${outcomeLabel}` : eventTitle;
            const item = { question, label: label || slug, slug, outcome: outcomeLabel, openPct, closePct, movePct, highPct, lowPct, link: eventLink };
            monitored.push(item);
            const isAnomaly = Math.abs(move) >= threshold;
            allData.push({ label: question, yesterdayKey, openPct, closePct, movePct, highPct, lowPct, isAnomaly });
            if (isAnomaly) anomalies.push({ ...item, link: eventLink });
          } catch (_) {}
        }
        if (verbose && event.markets.length) console.log(`  [${label}] 多结果事件 ${event.markets.length} 个 outcome`);
        continue;
      }

      // 单市场
      const market = await fetchMarket(slug);
      const tokenId = getYesTokenId(market);
      if (!tokenId) {
        errors.push({ slug, err: 'no token id' });
        if (verbose) console.log(`  [${label}] 无 token id`);
        continue;
      }
      const history = await fetchPriceHistory(tokenId, startTs, endTs);
      const byDay = aggregateByDayBeijing(history);
      const keys = [...byDay.keys()].sort();
      const yesterdayKey = keys.length >= 2 ? keys[keys.length - 2] : keys[keys.length - 1];
      const points = byDay.get(yesterdayKey);
      if (!points || points.length === 0) {
        if (verbose) console.log(`  [${label}] 昨日无数据 (keys: ${keys.join(', ')})`);
        continue;
      }
      const open = points[0].p;
      const close = points[points.length - 1].p;
      const move = close - open;
      const pointsPrices = points.map(p => p.p);
      const high = Math.max(...pointsPrices);
      const low = Math.min(...pointsPrices);
      const highPct = (high * 100).toFixed(1);
      const lowPct = (low * 100).toFixed(1);

      const openPct = (open * 100).toFixed(1);
      const closePct = (close * 100).toFixed(1);
      const movePct = (move * 100).toFixed(1);
      const isAnomaly = Math.abs(move) >= threshold;
      const item = { question: market.question || label, label: label || market.slug, slug, openPct, closePct, movePct, highPct, lowPct, link: `https://polymarket.com/event/${slug}` };
      monitored.push(item);
      allData.push({ label, yesterdayKey, openPct, closePct, movePct, highPct, lowPct, isAnomaly });
      if (isAnomaly) {
        anomalies.push({ ...item, link: item.link });
      }
    } catch (e) {
      errors.push({ slug, err: e.message });
      if (verbose) console.log(`  [${label}] 错误: ${e.message}`);
    }
  }

  const hotMovers = [];
  if (config.discover?.enabled && config.discover.topN > 0) {
    const topN = Math.min(config.discover.topN, 50);
    if (verbose) console.log('\n[discover] 拉取热门市场 top' + topN + '，全部展示...');
    let hotList = [];
    try {
      hotList = await fetchHotMarkets(topN);
    } catch (e) {
      if (verbose) console.log('  fetchHotMarkets 失败:', e.message);
    }
    for (let i = 0; i < hotList.length; i++) {
      const market = hotList[i];
      const slug = market.slug;
      const tokenId = getYesTokenId(market);
      if (!tokenId) continue;
      try {
        await sleep(120);
        const history = await fetchPriceHistory(tokenId, startTs, endTs);
        const byDay = aggregateByDayBeijing(history);
        const keys = [...byDay.keys()].sort();
        const yesterdayKey = keys.length >= 2 ? keys[keys.length - 2] : keys[keys.length - 1];
        const points = byDay.get(yesterdayKey);
        if (!points || points.length === 0) continue;
        const open = points[0].p;
        const close = points[points.length - 1].p;
        const move = close - open;
        const pointsPrices = points.map(p => p.p);
        const high = Math.max(...pointsPrices);
        const low = Math.min(...pointsPrices);
        const highPct = (high * 100).toFixed(1);
        const lowPct = (low * 100).toFixed(1);

        const volume24hr = market.volume24hr ?? market.volumeNum ?? 0;
        hotMovers.push({
          question: market.question,
          slug,
          openPct: (open * 100).toFixed(1),
          closePct: (close * 100).toFixed(1),
          movePct: (move * 100).toFixed(1),
          highPct,
          lowPct,
          volume24hr: Math.round(volume24hr),
          link: `https://polymarket.com/market/${slug}`,
        });
      } catch (_) {}
    }
    hotMovers.sort((a, b) => Math.abs(Number(b.movePct)) - Math.abs(Number(a.movePct)));
    if (verbose) console.log('  热门市场(全部):', hotMovers.length, '条');
  }

  const reportDate = new Date((endTs - 24 * 3600) * 1000).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const reportDateFile = new Date((endTs - 24 * 3600) * 1000).toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' }); // YYYY-MM-DD

  const combined = [
    ...monitored.map((m) => ({ ...m, link: `https://polymarket.com/market/${m.slug}` })),
    ...hotMovers.filter((h) => !monitored.some((m) => m.slug === h.slug)),
  ];
  const investmentRelated = combined
    .filter((x) => isInvestmentRelated(x.question))
    .map((x) => ({ ...x, relatedAssets: getRelatedAssets(x.question) }))
    .sort((a, b) => Math.abs(Number(b.movePct)) - Math.abs(Number(a.movePct)));

  /** 投资相关 Top10：每个 event（同 slug）最多保留 2 条（按当前 Yes 取前二），再按异动排序取前 10 */
  const bySlug = new Map();
  for (const row of investmentRelated) {
    const s = row.slug || row.question;
    if (!bySlug.has(s)) bySlug.set(s, [row]);
    else {
      const arr = bySlug.get(s);
      arr.push(row);
      arr.sort((a, b) => Number(b.closePct) - Number(a.closePct));
      if (arr.length > 2) arr.pop();
    }
  }
  const upToTwoPerEvent = [];
  for (const arr of bySlug.values()) upToTwoPerEvent.push(...arr);
  upToTwoPerEvent.sort((a, b) => Math.abs(Number(b.movePct)) - Math.abs(Number(a.movePct)));
  const hotMoversInvestmentRelated = upToTwoPerEvent.slice(0, 10);

  const report = {
    date: reportDate,
    generatedAt: new Date().toISOString(),
    thresholdPct: config.thresholdPct,
    monitored,
    anomalies: anomalies.length ? anomalies : undefined,
    hotMovers: hotMovers.length ? hotMovers : undefined,
    investmentRelated: investmentRelated.length ? investmentRelated : undefined,
    hotMoversInvestmentRelated: hotMoversInvestmentRelated.length ? hotMoversInvestmentRelated : undefined,
    errors: errors.length ? errors : undefined,
  };

  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
  if (!fs.existsSync(DATED_REPORT_DIR)) fs.mkdirSync(DATED_REPORT_DIR, { recursive: true });

  const reportJsonPath = path.join(DATED_REPORT_DIR, `polymarket_daily_report_${reportDateFile}.json`);
  const reportMdPath = path.join(DATED_REPORT_DIR, `polymarket_daily_report_${reportDateFile}.md`);

  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2), 'utf8');
  fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2), 'utf8');

  let md = `# Polymarket 异动简报\n\n**日期（北京）**: ${reportDate}\n**异动阈值**: ±${config.thresholdPct}%\n\n`;

  const significantMovers = investmentRelated.filter(r => Math.abs(Number(r.movePct)) >= 5);
  const otherInvestment = investmentRelated.filter(r => Math.abs(Number(r.movePct)) < 5);

  if (significantMovers.length > 0) {
    md += '## ⚠️ 今日显著异动 (≥ 5%)\n\n';
    md += '| 市场 | 当日区间 | 收盘(涨跌) | 成交量 | 相关资产 | 链接 |\n|------|----------|------------|--------|----------|------|\n';
    for (const r of significantMovers) {
      const moveStr = (Number(r.movePct) >= 0 ? '+' : '') + r.movePct + '%';
      const volStr = r.volume24hr ? (r.volume24hr > 1000000 ? (r.volume24hr/1000000).toFixed(1) + 'M' : (r.volume24hr/1000).toFixed(0) + 'K') : '—';
      md += `| ${r.question} | ${r.lowPct}% - ${r.highPct}% | **${r.closePct}% (${moveStr})** | ${volStr} | ${r.relatedAssets} | [Polymarket](${r.link}) |\n`;
    }
    md += '\n';
  }

  if (otherInvestment.length > 0) {
    md += '## 🏛️ 政治/经济市场动态\n\n';
    md += '| 市场 | 当日区间 | 收盘(涨跌) | 成交量 | 相关资产 | 链接 |\n|------|----------|------------|--------|----------|------|\n';
    for (const r of otherInvestment) {
      const moveStr = (Number(r.movePct) >= 0 ? '+' : '') + r.movePct + '%';
      const volStr = r.volume24hr ? (r.volume24hr > 1000000 ? (r.volume24hr/1000000).toFixed(1) + 'M' : (r.volume24hr/1000).toFixed(0) + 'K') : '—';
      md += `| ${r.question} | ${r.lowPct}% - ${r.highPct}% | ${r.closePct}% (${moveStr}) | ${volStr} | ${r.relatedAssets} | [Polymarket](${r.link}) |\n`;
    }
    md += '\n';
  }

  if (errors.length) md += `\n(部分市场拉取失败: ${errors.map((e) => e.slug).join(', ')})\n`;
  fs.writeFileSync(REPORT_MD, md, 'utf8');
  fs.writeFileSync(reportMdPath, md, 'utf8');

  const webhookUrl = config.feishuWebhookUrl.trim();
  if (webhookUrl) {
    const body = {
      msg_type: 'text',
      content: { text: md.replace(/#+/g, '').replace(/\*\*/g, '') },
    };
    try {
      const wr = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!wr.ok) throw new Error(`Feishu webhook ${wr.status}`);
    } catch (e) {
      console.error('Feishu push failed:', e.message);
    }
  }

  console.log('Report date:', reportDate);
  console.log('Monitored:', monitored.length, '| Anomalies (≥阈值):', anomalies.length, '| Hot:', hotMovers.length, '| 投资相关:', investmentRelated.length, '| 简报Top10(投资相关):', hotMoversInvestmentRelated.length);
  if (verbose && hotMovers.length) {
    console.log('\n热门市场(当日 Yes 概率 开盘→收盘 涨跌):');
    hotMovers.forEach((h) => console.log(`  ${h.openPct}% → ${h.closePct}% (${(Number(h.movePct) >= 0 ? '+' : '')}${h.movePct}%)  ${h.question}`));
  }
  if (verbose && allData.length) {
    console.log('\n抓到的数据（昨日 开盘 → 收盘 涨跌）:');
    allData.forEach((d) => {
      const tag = d.isAnomaly ? ' [异动]' : '';
      console.log(`  ${d.label}  日期=${d.yesterdayKey}  ${d.openPct}% → ${d.closePct}% (${Number(d.movePct) >= 0 ? '+' : ''}${d.movePct}%)${tag}`);
    });
  }
  console.log('Report written to:', REPORT_JSON);
  console.log('Dated report:', reportJsonPath, '|', reportMdPath);
  if (anomalies.length) {
    anomalies.forEach((a) => console.log(`  ${a.label}  ${a.openPct}% → ${a.closePct}% (${a.movePct}%)`));
  }
  return report;
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
