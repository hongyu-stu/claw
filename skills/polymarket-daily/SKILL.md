---
name: polymarket-daily
description: "生成并总结 Polymarket 每日异动简报。先执行脚本跑报告，再读取当天生成的文档并说明文件已生成、总结内容；若文档未生成则说明没跑出来并由 AI 临时访问网站总结。触发：今日/昨天 Polymarket 异动、跑一下 Polymarket 报告、Polymarket 异动简报、投资相关异动。"
homepage: ""
metadata:
  openclaw:
    emoji: "📈"
    requires: { "bins": ["node"] }
---

# Polymarket 每日异动

先执行脚本生成报告，再读取当天跑的文档并总结；若报告未生成则说明情况并由 AI 临时访问网站总结。

## 何时使用（触发语）

- 「今天 / 昨天 Polymarket 有什么异动」
- 「跑一下 Polymarket 报告」「Polymarket 异动简报」
- 「投资相关异动」「Polymarket 概率异动」

## 执行步骤

1. **执行脚本跑报告**  
   在 skill 所在项目根目录（含 `polymarket-daily.js` 的目录）执行：

   ```bash
   node run.js
   ```

   若当前工作目录不在项目根，先 `cd` 到该目录再执行；或直接执行 `node polymarket-daily.js`。  
   脚本会拉取数据并写入 `~/.openclaw/workspace/polymarket_daily_report.md`（及 `.json`），同时按日期写入桌面 `polymarket_reports` 文件夹。

2. **读取当天跑的文档并反馈**  
   读取工作区报告文件：`~/.openclaw/workspace/polymarket_daily_report.md`（Windows：`%USERPROFILE%\.openclaw\workspace\polymarket_daily_report.md`）。

   - **若文件存在**  
     - 明确告知用户：**「报告文件已生成。」**（或类似表述）
     - 基于报告内容总结：**必须展示全部宏观数据**（美债、黄金、原油、VIX、指数等）以及**至少 10 条 Polymarket 异动数据**。
     - **Polymarket 数据细节**：每条数据必须包含：当日波动区间 (Low-High)、收盘概率 (及涨跌幅)、24h 成交量。
     - **交叉验证 (核心)**：必须对比 Polymarket 概率变动与宏观资产（如原油、美债、VIX）的走势，判断变动是“顺势”还是“背离（Alpha）”。
     - **新增：仓位风险评估模块**：
       - 分别分析以下三类仓位的潜在变化与风险：
         1. **美股科技**：结合纳指走势、VIX 恐慌指数及 Polymarket 相关预测（如利率预期）。
         2. **港股科技**：结合美元指数走势、地缘政治紧张度（如海峡封锁概率）及相关政策预测。
         3. **韩国半导体**：结合地缘政治溢价、原油/能源成本变动对生产端的影响。
     - **链接**：总结中提到的**每一个市场**都必须附上其 Polymarket 链接。报告中「投资相关」与「今日热门」表格的「链接」列即对应市场的 `https://polymarket.com/market/<slug>`；总结时每条市场用「[市场名](链接)」或直接给出链接，确保用户可点击跳转。

   - **若文件不存在（报告没跑出来）**  
     - 明确告知用户：**「本次报告未生成（脚本可能失败或未正确写入）。」**
     - 由 AI **临时访问 Polymarket 网站**（如 https://polymarket.com 或相关市场页面），查看当前热门/投资相关市场的概率与异动，用自然语言总结后回复用户。
     - 总结中提到的**每一个市场**都尽量附上其 Polymarket 链接（如 https://polymarket.com/market/&lt;slug&gt;），便于用户点击查看。

## 配置

- 监控市场与阈值在项目根目录的 **polymarket-watch.json** 中配置（`markets`、`thresholdPct`）。
- 脚本无需 API Key；访问 Polymarket 时若本机有代理，请确保 `HTTP_PROXY` / `HTTPS_PROXY` 已设置。

## 与 cron 的配合

若已用 `openclaw cron add ... --announce --channel feishu` 配置每日推送，则每天会自动跑脚本并总结发飞书。用户也可随时通过对话触发本 skill 手动「跑报告并总结」。
