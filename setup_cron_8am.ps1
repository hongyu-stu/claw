# 每日合并简报 (美股收盘版) - 一键添加 cron
# 运行时间：美东 16:05 (对应北京时间 05:05/04:05，取决于夏令时)
# 交付内容：严格四部分表格格式的完整 MD 报告

$feishuChatId = "user:ou_bcd4a86da34f5bde696f9aca66847071"

$msg = @"
请执行每日合并简报：严格按照 daily-briefing 技能要求的四部分表格格式输出（1. Polymarket Top10 表格，需含链接；2. 宏观数据表格，需标注来源 yfinance/web_search；3. 数据解读；4. 仓位分析三块：美股科技、港股科技、韩国半导体）。使用 Python 3.14 (C:\Program Files\Python314\python.exe) 先运行 run.js。交付要求：直接向当前会话发送完整报告内容，无需发送 100 字总结版。
"@

Set-Location $PSScriptRoot
# 对应美东收盘后 5 分钟 (1-5 工作日)
openclaw cron add --name "每日合并简报 (美股收盘版)" --message $msg --cron "5 16 * * 1-5" --tz America/New_York --announce --channel feishu --to $feishuChatId

Write-Host "任务已添加：每日美东 16:05 (收盘后 5 分钟)。完整报告直接推送至飞书。"
