---
name: daily-briefing
description: |
  生成每日合并简报：Polymarket 投资相关 Top10 + 宏观数据表格 + 数据解读 + 三块仓位（美股科技、港股科技、韩国半导体），并写入 workspace 与推飞书。
  只要用户提到「每日简报」「今日简报」「跑简报」「写简报」「简报并推飞书」「执行简报」「检查简报」「daily briefing」或想要一份包含 Polymarket 与宏观的每日市场总结，就使用本 skill，即使用户没有说「daily briefing」四个字。
---

# Daily Briefing（每日合并简报）

生成并推送每日合并简报：先跑 Polymarket 与宏观脚本，再按固定四部分写 MD（表格 + 解读 + 三块仓位），写文件并推飞书。**所有表格必须写明数据获取时间；宏观缺失项用 web_search 补全并标注来源。**

**数据来源**：本 skill 的 `run.js` 会先执行 `polymarket-daily.js`，再执行 `macro_yfinance.py`，将结果写入 workspace 的 `polymarket_daily_report_*.json` 与 `macro_data_*.json`。宏观以 JSON 为准，仅对 `failed` 或缺失项用 web_search 补全。

---

## 执行步骤

### 1. 跑数据

在**项目根目录**（含 `polymarket-daily.js` 与 `macro_yfinance.py` 的目录）执行：

```bash
node skills/daily-briefing/run.js
```

输出写入 workspace（默认 `~/.openclaw/workspace`）：`polymarket_daily_report_*.json` / `.md`、`macro_data_*.json`。

### 2. 读报告

从 workspace 读取当日（或最近）的：

- `polymarket_daily_report_*.json`：字段含 `generatedAt`、`hotMoversInvestmentRelated` 等。
- `macro_data_*.json`：字段含 `run_at`、`data_date`、`rows`、`failed`。

### 3. 写简报（四部分，必须用表格）

按下面四部分撰写，**不得用纯文字段落替代表格**。

- **① Polymarket Top10 热门市场**  
  - 从 `polymarket_daily_report_*.json` 的 **`hotMoversInvestmentRelated`** 取数（脚本已按事件标题去重，同一事件最多 2 条）。  
  - 用 **Markdown 表格**，列：**市场名称 | 当前 Yes 概率 | diff（涨跌）| 链接**。  
  - 表格正上方单独一行写：**Polymarket 数据获取时间：\<report 的 generatedAt\>**。  
  - 若同一大类事件在数据中仍超过 2 条，只保留涨跌幅绝对值最大的 2 条，其余用其他事件替补。  
  - 若 `hotMoversInvestmentRelated` 为空，保留表头，表内注明「当日暂无投资相关热门数据」。

- **② 宏观数据**  
  - 从 `macro_data_*.json` 的 `rows` 建表；若有 `failed`，用 web_search 补全后并入同一表。  
  - 用 **Markdown 表格**，列：**指标名称 | 当前值 | 涨跌幅 | 单位 | 来源**。来源列每行填 **yfinance** 或 **web_search**。  
  - 表格正上方写：**宏观数据获取时间：\<run_at\>，数据日期：\<data_date\>**。

- **③ 数据解读**  
  - 对上述 Polymarket 与宏观数据做简短分析（异动、趋势、与近期事件的关联）。

- **④ 仓位分析（三块，不可替换）**  
  - 按以下三块各写 1～2 句，不得改用其他分类：**1. 美股科技**；**2. 港股科技**；**3. 韩国半导体**。

### 4. 写文件

- 100 字总结 → `workspace/daily_briefing_summary_YYYY-MM-DD.txt`  
- 完整 MD → `workspace/daily_briefing_full_YYYY-MM-DD.md`  

日期用北京日期 YYYY-MM-DD。正文中须包含 Polymarket 与宏观的数据获取时间。

### 5. 推飞书

- **首选**：若有向当前会话/当前用户发消息的工具（如 `message`、`chat.send`），先发 100 字总结，再发完整报告正文，这样格式由飞书解析，体验最好。  
- **备选**：在项目根执行 `node feishu_push_briefing.js`（需配置 `FEISHU_WEBHOOK_URL`）。脚本会先发总结，再将完整 MD 按 `##` 分段发送；Webhook 文本类型不渲染 Markdown，若需更好排版请优先用发消息到会话。

---

## 输出模板（必须符合）

```markdown
## 1. Polymarket Top10 热门市场（投资相关）
Polymarket 数据获取时间：<generatedAt>
（数据来源：hotMoversInvestmentRelated；同一事件最多 2 条）

| 市场名称 | 当前 Yes 概率 | diff（涨跌）| 链接 |
|----------|---------------|-------------|------|
| ...      | ...           | ...         | ...  |

## 2. 宏观数据
宏观数据获取时间：<run_at>，数据日期：<data_date>

| 指标名称 | 当前值 | 涨跌幅 | 单位 | 来源 |
|----------|--------|--------|------|------|
| ...      | ...    | ...    | yfinance 或 web_search |

## 3. 数据解读
（简短分析）

## 4. 仓位分析（三块）
- **1. 美股科技**：（1～2 句）
- **2. 港股科技**：（1～2 句）
- **3. 韩国半导体**：（1～2 句）
```

---

## 数据与格式约定

- Polymarket 与宏观均用 **Markdown 表格** 呈现，不得仅用列表或段落。  
- Polymarket：diff 为涨跌幅，以报告字段为准。  
- 宏观：优先用 `macro_data_*.json` 的 `rows`（来源标 yfinance）；补全项来源标 web_search，不得遗漏或混用不标注。
