# 每日合并简报 Cron 故障排查

针对「每日合并简报 (美股收盘版)」定时任务常见报错的排查与修复。

---

## 0. 完整报告如何推送到飞书

- **Cron 的 announce**：只会向飞书发送**摘要**（短句），不会发完整报告。
- **优先：直接发到你的聊天框**：若 agent 有「向当前会话/当前用户发消息」的工具（如 message、chat.send），应**优先**用该工具把完整报告发给你，这样会直接进你的飞书聊天，**无需 webhook**。
- **备选：Webhook**：若无发消息能力或发送失败，再在项目根执行 **`node feishu_push_briefing.js`**，脚本会向 `FEISHU_WEBHOOK_URL` 发送两条（总结 + 完整 MD）。需确保 **FEISHU_WEBHOOK_URL** 已配置（见下文「飞书推送失败」）。

---

## 1. 执行时间（已修正）

- **当前**：已改为 **美东 16:00，周一至周五**（`0 16 * * 1-5`，`America/New_York`）= 美股收盘。
- 若需再改：`openclaw cron edit <任务ID> --cron "0 16 * * 1-5" --tz America/New_York`

---

## 2. macro_yfinance.py 脚本调用失败（Python 环境/路径）

**现象**：简报里写「macro 未能成功运行」或宏观数据来自 web search。

**原因**：Gateway 跑 cron 时用的环境里，`python` 不在 PATH 或不是 Python 3.14，导致 `macro_yfinance.py` 没跑成。

**处理**：

1. **用绝对路径跑 Python**  
   在「每日合并简报」的 cron 消息里已建议使用：  
   `C:\Program Files\Python314\python.exe`  
   确保执行「daily-briefing」的 run.js 或脚本里，调用宏观脚本时用该路径，例如：  
   `"C:\\Program Files\\Python314\\python.exe" macro_yfinance.py --json`

2. **或让 Gateway 继承正确 PATH**  
   用**同一用户、已配置好 PATH 的终端**启动 OpenClaw Gateway（`openclaw start`），这样 cron 子进程会继承到 `python` / `py`。

3. **确认依赖已装**  
   在该 Python 下执行：  
   `"C:\Program Files\Python314\python.exe" -m pip install yfinance pandas python-dotenv`  
   并确认：  
   `"C:\Program Files\Python314\python.exe" macro_yfinance.py --json`  
   能在项目根目录正常运行并生成 `macro_data_*.json`。

---

## 3. 飞书推送失败：feishu_push_briefing.js 缺少 Webhook

**现象**：feishu_push_briefing.js 报错缺少 Webhook 配置。

**原因**：简报推送依赖 **FEISHU_WEBHOOK_URL**（或脚本内同含义配置），未配置或未传入则推送失败。

**处理**：

1. 在飞书群中添加「自定义机器人」，拿到 **incoming webhook 地址**。
2. 任选一种方式配置，且**对运行 feishu_push_briefing.js 的进程可见**：
   - **环境变量**（推荐）：在运行 Gateway / 计划任务的用户环境中设置  
     `FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/xxxx`
   - 或在脚本/配置中读取的 `.env`、`polymarket-watch.json` 等里填写同一 webhook。
3. 若通过 Windows 计划任务或系统服务跑，需在**该任务/服务的环境**里配置上述变量（如「任务计划程序」→ 该任务 → 属性 → 环境变量），否则 Gateway 子进程拿不到。

---

## 4. API 额度受限：Gemini RESOURCE_EXHAUSTED (Quota exceeded)

**现象**：凌晨或定时跑时出现多次 `RESOURCE_EXHAUSTED`、Quota exceeded，输入 Token 达上限。

**原因**：当前使用的 Gemini API 配额（按分钟/按天）用尽。

**处理**：

- 打开 [Google AI Studio](https://aistudio.google.com/) 或 Cloud 控制台，查看该 API Key 的用量与限额。
- 短期：错峰跑（例如把 cron 调到配额重置之后）、或减少单次请求长度。
- 长期：升级付费档或换用其他 Key；若有多 Key，可在 OpenClaw 里配置多 profile/降级，分散用量。

---

## 5. 消息发送失败：⚠️ ✉️ Message failed

**现象**：Cron 运行结果里出现 `Message failed`，或 lastDeliveryStatus / lastError 为发送失败。

**原因**：多为**飞书侧投递失败**：例如 `delivery.to` 填的会话/群 ID 不对、机器人未加群/无权限、或上述 Webhook 未配导致脚本推送失败后，Claw 再发「简报已推送」时也失败。

**处理**：

1. **核对 delivery.to**  
   `openclaw cron edit <任务ID> --to <你的飞书 user_id 或群 chat_id>`  
   确保与飞书开放平台/管理后台里的一致，且机器人已加入该群或已与用户成为好友。

2. **确保 Webhook 已配**  
   见上文「3. 飞书推送失败」：`FEISHU_WEBHOOK_URL` 配好后，`feishu_push_briefing.js` 能成功发两条（总结 + 全文），再配合正确的 `--to`，Claw 的「简报已推送」回复也能发到同一会话。

3. **查看 Gateway 日志**  
   运行 `openclaw logs --follow` 或查看 Gateway 输出，看是「webhook 返回 4xx/5xx」还是「channel feishu 投递 to 失败」，再对症修 Webhook 或 `--to`。

---

## 快速检查清单

| 项目 | 检查 |
|------|------|
| 执行时间 | `openclaw cron list` 中该任务为 `0 16 * * 1-5`、`America/New_York` |
| Python 宏观 | `"C:\Program Files\Python314\python.exe" macro_yfinance.py --json` 在项目根可运行并生成 JSON |
| 飞书 Webhook | 已设 `FEISHU_WEBHOOK_URL`，且对运行 cron 的进程可见 |
| 飞书 delivery | cron 的 `--to` 为正确飞书 user_id/群 chat_id，机器人已入群/已加好友 |
| Gemini 额度 | AI Studio / Cloud 中该 Key 未超限，必要时错峰或换 Key |
