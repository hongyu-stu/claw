/**
 * 将当日每日简报（总结 + 完整 MD）推送到飞书 Webhook
 * 用法: node feishu_push_briefing.js [--date YYYY-MM-DD]
 * 依赖: 环境变量 FEISHU_WEBHOOK_URL；workspace 下已有 daily_briefing_summary_*.txt 与 daily_briefing_full_*.md
 *
 * 推送策略：总结单条发送；完整 MD 按 ## 分段发送，避免单条过长、纯文本 Markdown 难以阅读。
 * 飞书 Webhook text 类型不渲染 Markdown，表格等会以纯文本显示。
 */
const fs = require('fs');
const path = require('path');

const WORKSPACE = process.env.OPENCLAW_WORKSPACE ||
  path.join(process.env.USERPROFILE || process.env.HOME || '', '.openclaw', 'workspace');

const webhookUrl = process.env.FEISHU_WEBHOOK_URL || '';
if (!webhookUrl.trim()) {
  console.error('未配置 FEISHU_WEBHOOK_URL，无法推送');
  process.exit(1);
}

/** 单条消息建议不超过 4KB，避免飞书截断或限流 */
const MAX_CHUNK = 3800;

function getDateArg() {
  const i = process.argv.indexOf('--date');
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function findLatest(prefix, ext) {
  if (!fs.existsSync(WORKSPACE)) return null;
  const files = fs.readdirSync(WORKSPACE)
    .filter((f) => f.startsWith(prefix) && f.endsWith(ext))
    .map((f) => {
      const match = f.match(/(\d{4}-\d{2}-\d{2})/);
      return { name: f, date: match ? match[1] : '' };
    })
    .filter((x) => x.date)
    .sort((a, b) => b.date.localeCompare(a.date));
  return files.length ? path.join(WORKSPACE, files[0].name) : null;
}

async function sendToFeishu(text) {
  const body = { msg_type: 'text', content: { text } };
  const res = await fetch(webhookUrl.trim(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Feishu webhook ${res.status}: ${await res.text()}`);
}

/**
 * 按 ## 标题切分 MD，每块不超过 MAX_CHUNK 字符；返回字符串数组
 */
function splitFullMd(fullMd) {
  const sections = [];
  const re = /^##\s+/m;
  let lastEnd = 0;
  let match;
  const line = (s) => s.trimEnd();
  while ((match = re.exec(fullMd)) !== null) {
    if (match.index > lastEnd) {
      const block = line(fullMd.slice(lastEnd, match.index));
      if (block) sections.push(block);
    }
    lastEnd = match.index;
  }
  if (lastEnd < fullMd.length) {
    const block = line(fullMd.slice(lastEnd));
    if (block) sections.push(block);
  }
  const out = [];
  for (const s of sections) {
    if (s.length <= MAX_CHUNK) {
      out.push(s);
    } else {
      for (let i = 0; i < s.length; i += MAX_CHUNK) {
        out.push(s.slice(i, i + MAX_CHUNK));
      }
    }
  }
  return out;
}

async function main() {
  const date = getDateArg();
  const summaryPath = path.join(WORKSPACE, `daily_briefing_summary_${date}.txt`);
  const fullPath = path.join(WORKSPACE, `daily_briefing_full_${date}.md`);

  let summary = '';
  let fullMd = '';

  if (fs.existsSync(summaryPath)) {
    summary = fs.readFileSync(summaryPath, 'utf8').trim();
  } else {
    const fallback = findLatest('daily_briefing_summary_', '.txt');
    if (fallback) summary = fs.readFileSync(fallback, 'utf8').trim();
  }
  if (fs.existsSync(fullPath)) {
    fullMd = fs.readFileSync(fullPath, 'utf8').trim();
  } else {
    const fallback = findLatest('daily_briefing_full_', '.md');
    if (fallback) fullMd = fs.readFileSync(fallback, 'utf8').trim();
  }

  if (!summary && !fullMd) {
    console.error('未找到当日或最近简报文件（summary/full），请先运行 daily-briefing 生成');
    process.exit(1);
  }

  if (summary) {
    await sendToFeishu(summary);
    console.log('已推送：100 字总结');
  }
  if (fullMd) {
    const chunks = splitFullMd(fullMd);
    for (let i = 0; i < chunks.length; i++) {
      await sendToFeishu(chunks[i]);
      if (chunks.length > 1) await new Promise((r) => setTimeout(r, 300));
    }
    console.log(`已推送：完整报告（${chunks.length} 条）`);
  }
  console.log('飞书推送完成');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
