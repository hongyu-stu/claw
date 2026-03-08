/**
 * 顺序执行：1) Polymarket 报告  2) 宏观数据（yfinance，--json 写入 workspace）
 * 供 daily-briefing skill 第一步调用；简报撰写与飞书推送由 Claw 完成。
 */
const path = require('path');
const { execSync } = require('child_process');

const skillDir = __dirname;
const projectRoot = path.resolve(skillDir, '..', '..');

const PYTHON = process.env.PYTHON_PATH || 'C:\\Program Files\\Python314\\python.exe';
const polymarketScript = path.join(projectRoot, 'polymarket-daily.js');
const macroScript = path.join(projectRoot, 'macro_yfinance.py');

console.log('1/2 Polymarket 报告...');
execSync(`node "${polymarketScript}"`, { cwd: projectRoot, stdio: 'inherit' });

console.log('2/2 宏观数据 (yfinance --json)...');
try {
  execSync(`"${PYTHON}" "${macroScript}" --json`, { cwd: projectRoot, stdio: 'inherit' });
} catch (e) {
  console.error('宏观脚本执行失败，请确保已安装: pip install yfinance pandas');
  throw e;
}

console.log('Polymarket + 宏观 已就绪，请由 Claw 撰写合并简报并推送飞书。');
