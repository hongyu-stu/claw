# polymarket-watch.json 说明

监控列表**不限于 US×Iran 停火**，任意 Polymarket 市场只要知道 **slug** 都可以加进来。

## 每日自动发现「热门且异动大」

配置里增加 **discover** 后，脚本每天会：

1. 按 **24h 成交量** 从 Gamma API 拉取 top N 个热门市场（默认 25）。
2. 对每个市场拉取昨日价格，算开盘→收盘涨跌。
3. 只保留 **涨跌绝对值 ≥ discover.thresholdPct**（默认 15%）的，按异动幅度排序。
4. 写入报告的 **「今日热门且异动大」** 小节，并随 cron/飞书推送给你。

配置示例：

```json
"discover": {
  "enabled": true,
  "topN": 25,
  "thresholdPct": 15
}
```

- **enabled**: 是否开启发现；关掉则只跑下面「监控列表」。
- **topN**: 取前几名按成交量排序的市场来算异动（建议 20～50，太大请求多、耗时长）。
- **thresholdPct**: 昨日涨跌超过 ±几% 才列入「热门且异动大」（可与主阈值不同）。

## 如何添加其他市场

1. **拿到 slug**
   - 打开 [Polymarket](https://polymarket.com)，进入你要监控的那条市场的页面。
   - 浏览器地址栏里，**slug 就是「市场」或「事件」在 URL 里的那一段**，例如：
     - 事件页：`https://polymarket.com/event/fed-decisions-jan-apr` → 事件 slug 是 `fed-decisions-jan-apr`（下面可能有多个子市场）。
     - 单市场页：URL 里常有 `.../market/xxx` 或 `.../event/事件名`，其中「事件名」或「市场名」对应的就是 slug。
   - 不确定时，可以用 API 查：  
     `https://gamma-api.polymarket.com/markets?limit=50&active=true`  
     在返回的 JSON 里看每条市场的 `"slug"` 和 `"question"`，选你要的 slug。

2. **写进配置**
   - 打开 `polymarket-watch.json`，在 `markets` 数组里加一项：
     ```json
     { "slug": "这里填从 URL 或 API 拿到的 slug", "label": "你起的显示名（简报里用）" }
     ```
   - 例如加一个 Fed 相关市场（slug 需从 Polymarket 或 API 确认）：
     ```json
     { "slug": "fed-rate-pause-march-2026", "label": "Fed 3 月按兵不动" }
     ```

3. **保存后重跑**
   - 再执行 `node polymarket-daily.js --verbose`，就会多抓这个市场，并在「抓到的数据」里看到它的昨日开盘/收盘。

## 当前配置

- **thresholdPct**：昨日开盘→收盘涨跌超过 ±15% 才记作「异动」。
- **markets**：目前是 4 个 US×Iran 停火（03/06、03/15、03/31、04/30），可按上面步骤随意增删、改成 Fed/大选/其他话题。

## 注意

- slug 必须和 Polymarket 上**该市场**的 slug 完全一致（一般全小写、单词用 `-` 连接）。
- 若某条市场已关闭或不存在，脚本会报错或跳过，用 `--verbose` 能看到是哪条。
