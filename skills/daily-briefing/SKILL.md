# daily-briefing

每日合并简报：先跑 Polymarket 与宏观脚本，再写合并简报（含 Polymarket Top10 热门、宏观数据、数据解读、三块仓位分析），并推送到飞书（100 字总结 + 完整 MD）。**简报中必须写明 Polymarket 与 macro 的数据获取时间。** 宏观数据：yfinance 拉取失败时用 **web_search 补全**，但**每条宏观数据必须明确标注来源**（yfinance 或 web_search）。

## 何时使用

用户说「每日合并简报」「写今日简报」「跑简报」「跑简报并推飞书」「检查简报配置」「执行今日简报」或类似意思时，使用本 skill。

## 执行步骤

1. **跑数据**：在项目根目录（`C:\Users\Administrator\Desktop\claw`）执行  
   `node skills/daily-briefing/run.js`  
   会先跑 Polymarket 报告，再跑宏观脚本（yfinance），输出写入 workspace（`~/.openclaw/workspace`）。

2. **读报告**：读取 workspace 中当日生成的：
   - `polymarket_daily_report_*.json` / `polymarket_daily_report_*.md`（含 `generatedAt`、`hotMovers` 等）；
   - `macro_data_*.json`（含 `run_at`、`data_date`、`rows`）。

3. **写简报**（必须严格按以下四部分与表格结构，**不得用纯文字段落替代表格**）：

   - **① Polymarket Top10 热门市场**  
     **必须用 Markdown 表格**。从 `polymarket_daily_report_*.json` 的 **`hotMoversInvestmentRelated`** 取表（该数组最多 10 条，均为投资相关，已按异动排序）。表格**必须包含**列：**市场名称 | 当前 Yes 概率 | diff（涨跌）| 链接**。  
     表格**正上方**单独一行写：**Polymarket 数据获取时间：\<report 的 generatedAt\>**。  
     若 `hotMoversInvestmentRelated` 为空或不存在，仍保留表头，表中可无数据行并注明「当日暂无投资相关热门数据」。

   - **② 宏观数据**  
     **必须用 Markdown 表格**。从 `macro_data_*.json` 的 `rows`（及 web_search 补全项）列出，表格**必须包含**列：**指标名称 | 当前值 | 涨跌幅 | 单位 | 来源**。来源列每行填 **yfinance** 或 **web_search**，不得省略。  
     若存在 `failed`，用 web_search 补全后放入同一表，来源列填 **web_search**。  
     表格**正上方**单独一行写：**宏观数据获取时间：\<run_at\>，数据日期：\<data_date\>**。

   - **③ 数据解读**  
     对上述 Polymarket 与宏观数据做简短分析（异动、趋势、与近期事件的关联等）。

   - **④ 仓位分析（三块，不可替换）**  
     本小节**必须**按以下三块分别写 1～2 句，不得用「能源/AI/传统板块」等其它分类替代：  
     - **1. 美股科技**  
     - **2. 港股科技**  
     - **3. 韩国半导体**

4. **数据获取时间（必须写明）**  
   - **Polymarket**：使用报告中的 `generatedAt`（或脚本输出中的等价时间），在简报中写清「Polymarket 数据获取时间：YYYY-MM-DDTHH:mm:ssZ」或本地时间等价表述。  
   - **Macro**：使用 `macro_data_*.json` 中的 `run_at` 与 `data_date`，在简报中写清「宏观数据获取时间：run_at」及「数据日期：data_date」。

5. **写文件**  
   - 100 字总结 → `workspace/daily_briefing_summary_当日日期.txt`  
   - 完整 MD → `workspace/daily_briefing_full_当日日期.md`  
   当日日期用北京日期 YYYY-MM-DD；MD 正文中须包含上述数据获取时间。

6. **推飞书（完整报告）——优先直接发到用户聊天框**  
   - **首选**：若你有向当前会话/当前用户发送消息的工具（如 `message`、`chat.send` 等），请**直接**将完整报告内容（即 `daily_briefing_full_*.md` 的正文）通过该工具发给我，这样会**直接进入我的飞书聊天框**，无需 webhook。可先发一条 100 字总结，再发一条完整报告。  
   - **备选**：若无发消息能力或发送失败，再在项目根执行 `node feishu_push_briefing.js`，通过 `FEISHU_WEBHOOK_URL` 推送（两条：总结 + 完整 MD）。

## 数据说明

- **Polymarket 与宏观数据均须用表格呈现**（Markdown 表格），不得仅用列表或段落。
- Polymarket：当前报告为「当日开盘 / 收盘」或「当前 vs 24h 前」的 Yes 概率与涨跌，以实际报告字段为准；diff 即涨跌幅。
- **宏观数据**：优先使用 `macro_data_*.json` 中 `rows` 的数据（来源列标 **yfinance**）。若某指标在 `failed` 中或缺失，**必须用 web_search 补全**，并在表格中**来源列标 web_search**，不得遗漏或混用不标注。

## 简报结构模板（输出时必须符合）

```markdown
## 1. Polymarket Top10 热门市场（投资相关）
Polymarket 数据获取时间：<generatedAt>
（数据来源：report 的 hotMoversInvestmentRelated，仅投资相关市场）

| 市场名称 | 当前 Yes 概率 | diff（涨跌）| 链接 |
|----------|---------------|-------------|------|
| ...      | ...           | ...         | ...  |

## 2. 宏观数据
宏观数据获取时间：<run_at>，数据日期：<data_date>

| 指标名称 | 当前值 | 涨跌幅 | 单位 | 来源 |
|----------|--------|--------|------|------|
| ...      | ...    | ...    | ...  | yfinance 或 web_search |

## 3. 数据解读
（简短分析）

## 4. 仓位分析（三块）
- **1. 美股科技**：（1～2 句）
- **2. 港股科技**：（1～2 句）
- **3. 韩国半导体**：（1～2 句）
```
