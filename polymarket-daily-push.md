# Polymarket 每日异动推送方案

## 目标

每天早晨（如 8:00 北京时间）自动向你推送：**前一天有概率异动的、投资相关**的 Polymarket 市场，方便你在 Claw/飞书里一眼看到。

---

## 方案一（推荐）：OpenClaw cron + Windows 计划任务

推送由 **Claw 定时读报告并发到飞书** 完成，无需在脚本里配飞书 webhook。

### 流程

1. **7:50**（或 8:00）**Windows 计划任务** 运行 `polymarket-daily.js`，把昨日异动写入 `~/.openclaw/workspace/polymarket_daily_report.md`（及 .json）。
2. **8:05**（或 8:10）**OpenClaw cron** 触发一次会话：Claw 读 workspace 里的报告并总结，结果 **--deliver feishu** 发到你飞书。

### 1. 添加 OpenClaw cron 任务（一次性）

在 PowerShell 中执行（Gateway 需已启动）：

```powershell
openclaw cron add --message "请读取工作区文件 polymarket_daily_report.md 的完整内容；若文件不存在就回复「今日暂无报告」。若存在，用 2～4 句话总结昨日 Polymarket 异动（市场名、涨跌幅度），并直接把你这段总结发给我。" --cron "5 8 * * *" --announce --channel feishu
```

- `--message`：Claw 收到的提示词（读报告并总结）。
- `--cron "5 8 * * *"`：每天 8:05 运行（分 时 日 月 周；若系统是北京时区即 8:05 北京）。
- `--announce`：把本次运行结果以摘要形式发到指定渠道。
- `--channel feishu`：发到飞书；若你有多个飞书连接，可用 `--to <具体会话或群 ID>` 指定目标。
- 若要 8:30 运行：改为 `--cron "30 8 * * *"`。若要用北京时区解析 cron：加 `--tz Asia/Shanghai`。

查看已添加的任务：

```powershell
openclaw cron list
```

### 2. 添加 Windows 计划任务（先于 cron 生成报告）

1. 打开 **任务计划程序**（`taskschd.msc`）→ 创建基本任务。
2. 名称：**Polymarket 每日报告**；触发器：**每天**，时间 **7:50**（早于上面 cron 约 15 分钟）。
3. 操作：**启动程序**
   - 程序/脚本：`node`（或 `C:\Program Files\nodejs\node.exe`）
   - 添加参数：`polymarket-daily.js`
   - 起始于：`C:\Users\Administrator\Desktop\claw`

若访问 Polymarket 需代理，可把「程序」改为 `cmd`，参数改为 `/c "set HTTP_PROXY=http://127.0.0.1:7890 && set HTTPS_PROXY=http://127.0.0.1:7890 && node polymarket-daily.js"`，起始于不变。

### 3. 注意

- **方案一** 下不必在 `polymarket-watch.json` 或环境变量里配置 `feishuWebhookUrl`（推送由 Claw cron 负责）。
- 确保 OpenClaw Gateway 在 cron 触发时在运行（本机常驻或随开机/计划任务启动）。

---

## 整体架构（方案一）

```
7:50  Windows 计划任务 → polymarket-daily.js → 写 report 到 ~/.openclaw/workspace/
8:05  OpenClaw cron → Claw 读 report → 总结 → --deliver feishu → 飞书收到简报
```

---

## 方案二：Skill 让 AI 直接跑（按需）

已沉淀为 **OpenClaw skill**，AI 可随时按需执行「生成报告 → 读报告 → 总结」：

- **Skill 位置**：`C:\Users\Administrator\Desktop\claw\skills\polymarket-daily\`（已通过 `skills.load.extraDirs` 注册）。
- **触发语**：对 Claw 说「今天 Polymarket 有什么异动」「跑一下 Polymarket 报告」「Polymarket 异动简报」等，AI 会加载该 skill，执行 `node run.js`（或同目录下的 `node polymarket-daily.js`），再读 `~/.openclaw/workspace/polymarket_daily_report.md` 并总结回复。
- **与 cron 的关系**：cron 负责每天定时推送；你也可随时在对话里触发该 skill 手动跑一次并要总结。

---

## 其他说明（原方案：仅脚本 + webhook）

若不用 OpenClaw cron，可仅用 **Windows 计划任务 + 脚本内飞书 webhook**：在 `polymarket-watch.json` 填 `feishuWebhookUrl`，脚本写报告后自己 POST 到飞书。此时无需添加 openclaw cron。

---

## 1. 监控列表（投资相关）

在配置里维护一份「要监控的市场」列表，例如：

- **地缘 / 宏观**：US x Iran ceasefire（03/06、03/31 等）、Fed 决议、大选相关
- **政治 / 政策**：Trump、Biden、国会、重大立法
- 可先只放你关心的几个 slug，后续按需扩展

---

## 2. 每日脚本做什么

1. 读取配置：市场 slug 列表、异动阈值（如 15%）、飞书 webhook URL（可选）。
2. 对每个市场：用 Gamma 取市场信息与 Yes token ID，用 CLOB 拉取最近 2 天 1h 粒度价格历史。
3. 按**北京时间**以「日」聚合，取**昨天**的开盘（当日首点）与收盘（当日末点）。
4. 若 `|收盘 - 开盘| ≥ 阈值`，记入「当日异动」列表。
5. 生成简报（标题 + 列表：市场名、开盘%、收盘%、涨跌%）。
6. 把简报写入 `~/.openclaw/workspace/polymarket_daily_report.json`（及可选 .md），便于 Claw 读取。
7. 若配置了 `FEISHU_WEBHOOK_URL`，则对飞书 webhook 发 POST，把简报推送到群/私聊。

---

## 3. 飞书推送（早晨收到消息）

1. 在飞书建一个群（或使用现有群）→ 群设置 → 群机器人 → 添加机器人 → 自定义机器人 → 勾选「消息接收」下的「接收群聊消息」或仅用「发送到群」→ 完成，复制 ** incoming webhook 地址**。
2. 配置到脚本任选其一：
   - **环境变量**：在计划任务或系统/用户环境变量里设置 `FEISHU_WEBHOOK_URL=复制的地址`。
   - **配置文件**：在 `polymarket-watch.json` 里把 `feishuWebhookUrl` 填为复制的地址。
3. 脚本每天运行时会向该 webhook 发一条「Polymarket 异动简报」文本消息，你早晨在飞书里即可看到。

---

## 4. Claw 如何参与

- **被动推送**：不依赖 Claw；由脚本 + 飞书 webhook 完成。
- **主动查询**：你问 Claw「今天 Polymarket 有什么异动 / 投资相关异动」时，Claw 需要能读到简报。有两种方式：
  - **方式 A**：在 OpenClaw 里加一个 skill 或工具，读取 `~/.openclaw/workspace/polymarket_daily_report.json`（或 .md），用自然语言总结后回答。
  - **方式 B**：若 Claw 已支持「读工作区某文件」的通用能力，你只需告诉 Claw：「请读 workspace 下的 polymarket_daily_report.md 并总结异动」。

---

## 5. 定时执行（每天早晨）

1. 打开 **任务计划程序**（taskschd.msc）→ 创建基本任务。
2. 名称例如「Polymarket 每日异动」→ 触发器选「每天」→ 时间设为 **8:00**（按你本地时区，若系统是北京时区即 8:00 北京）。
3. 操作选「启动程序」：
   - **程序/脚本**：`node`（或 `C:\Program Files\nodejs\node.exe`）
   - **添加参数**：`polymarket-daily.js`
   - **起始于**：`C:\Users\Administrator\Desktop\claw`
4. 若本机访问 Polymarket 需代理，在「任务」→ 该任务 → 属性 → 常规/条件 之外，可在「操作」同一任务里配置环境变量：新建操作「启动程序」前，用脚本包装一层（如 `.cmd` 里先 `set HTTP_PROXY=...` 再 `node polymarket-daily.js`），或在该任务的「操作」里用 `cmd /c "set HTTP_PROXY=... && node polymarket-daily.js"`。

---

## 6. 文件与配置

| 文件 | 说明 |
|------|------|
| `polymarket-watch.json` | 监控市场 slug 列表、异动阈值、可选 webhook |
| `polymarket-daily.js` | 每日脚本：拉数据、算异动、写报告、发飞书 |
| `~/.openclaw/workspace/polymarket_daily_report.json` | 当日简报（结构化，供 Claw 读） |
| `~/.openclaw/workspace/polymarket_daily_report.md` | 当日简报（人类可读，可选） |

---

## 小结

- **每天谁推送**：Windows 计划任务 + `polymarket-daily.js` + 飞书 webhook。
- **推送内容**：前一天有概率异动的、投资相关的 Polymarket 市场列表（市场名、开盘/收盘、涨跌%）。
- **Claw 的作用**：你主动问「今天有什么异动」时，读 workspace 里的报告并总结回答（需 skill/工具或通用读文件能力）。
