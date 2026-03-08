/**
 * 供 OpenClaw skill 调用：在项目根目录执行 polymarket-daily.js 生成异动报告。
 * 用法（在 skill 目录或项目根执行）: node run.js  或  node skills/polymarket-daily/run.js
 */
const path = require('path');
const { execSync } = require('child_process');

const skillDir = __dirname;
const projectRoot = path.resolve(skillDir, '..', '..');
const scriptPath = path.join(projectRoot, 'polymarket-daily.js');

execSync(`node "${scriptPath}"`, { cwd: projectRoot, stdio: 'inherit' });
