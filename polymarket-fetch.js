/**
 * 抓取 Polymarket「US x Iran ceasefire by 03/31」当前概率 + 历史数据
 * 用法: node polymarket-fetch.js          # 仅当前
 *       node polymarket-fetch.js --history # 当前 + 近期历史(按天)
 */

const MARKET_SLUG = 'us-x-iran-ceasefire-by-march-31';
const GAMMA_API = 'https://gamma-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';

async function fetchMarket(slug) {
  const url = `${GAMMA_API}/markets/slug/${slug}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

/** 从市场数据中取出 Yes 对应的 CLOB token ID（用于请求价格历史） */
function getYesTokenId(market) {
  const raw = market.clobTokenIds;
  if (typeof raw === 'string') {
    const arr = JSON.parse(raw);
    return arr[0] || null;
  }
  return Array.isArray(raw) ? raw[0] : null;
}

/**
 * 拉取价格历史
 * @param {string} tokenId - Yes 代币 ID
 * @param {{ interval?: string, startTs?: number, endTs?: number }} opts - interval: 1h|6h|1d|1w 等
 */
async function fetchPriceHistory(tokenId, opts = {}) {
  const params = new URLSearchParams({ market: tokenId });
  if (opts.interval) params.set('interval', opts.interval);
  if (opts.startTs != null) params.set('startTs', String(opts.startTs));
  if (opts.endTs != null) params.set('endTs', String(opts.endTs));
  const url = `${CLOB_API}/prices-history?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const data = await res.json();
  return data.history || [];
}

function parseYesProbability(market) {
  const raw = market.outcomePrices;
  if (typeof raw === 'string') {
    const arr = JSON.parse(raw);
    return arr[0] != null ? Number(arr[0]) : null;
  }
  if (Array.isArray(raw) && raw[0] != null) return Number(raw[0]);
  return null;
}

/** 将 ISO UTC 时间转为北京时间 (UTC+8) 显示 */
function toChinaTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
}

async function main() {
  const wantHistory = process.argv.includes('--history');

  const market = await fetchMarket(MARKET_SLUG);
  const yesProb = parseYesProbability(market);
  const pct = yesProb != null ? (yesProb * 100).toFixed(1) : '—';

  console.log('Market:', market.question || market.slug);
  console.log('Yes (会停火) 概率:', pct + '%');
  console.log('更新时间(北京时间):', toChinaTime(market.updatedAt));
  console.log('Link: https://polymarket.com/event/us-x-iran-ceasefire-by');

  if (wantHistory) {
    const tokenId = getYesTokenId(market);
    if (!tokenId) {
      console.log('\n历史: 无法获取 token ID，跳过');
    } else {
      const endTs = Math.floor(Date.now() / 1000);
      const startTs = endTs - 7 * 24 * 3600;
      const history = await fetchPriceHistory(tokenId, { interval: '1h', startTs, endTs });
      // 按北京时间“日期”聚合：每天取首个为开盘、末个为收盘
      const byDay = new Map();
      for (const point of history) {
        const date = new Date(point.t * 1000);
        const dayKey = date.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
        if (!byDay.has(dayKey)) byDay.set(dayKey, []);
        byDay.get(dayKey).push(point.p);
      }
      console.log('\n近期历史 (按天 开盘→收盘, 北京时间):');
      const sortedDays = [...byDay.keys()].sort();
      for (const day of sortedDays) {
        const vals = byDay.get(day);
        const open = (vals[0] * 100).toFixed(1);
        const close = (vals[vals.length - 1] * 100).toFixed(1);
        console.log(`  ${day}  ${open}% → ${close}%`);
      }
      if (sortedDays.length === 0) console.log('  (无数据)');
    }
  }

  return { question: market.question, yesPct: pct, updatedAt: toChinaTime(market.updatedAt) };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
