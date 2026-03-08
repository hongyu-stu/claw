/**
 * 将当日每日简报（总结 + 完整 MD）推送到飞书 Webhook
 * 用法: node feishu_push_briefing.js [--date YYYY-MM-DD]
 * 依赖: 环境变量 FEISHU_WEBHOOK_URL；workspace 下已有 daily_briefing_summary_*.txt 与 daily_briefing_full_*.md
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
    await sendToFeishu(fullMd);
    console.log('已推送：完整报告');
  }
  console.log('飞书推送完成');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
