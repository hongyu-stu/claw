# stock_data.py 数据源与 API Key

脚本按顺序尝试以下数据源，成功即返回，失败则尝试下一个：

1. **yfinance**（无需 Key）— 优先使用  
2. **Alpha Vantage** — 需 `ALPHA_VANTAGE_API_KEY`  
3. **Finnhub** — 需 `FINNHUB_API_KEY`  
4. **StockData.org** — 需 `STOCKDATA_API_KEY`  

## 配置方式

在项目根目录创建 `.env`，或在本机/当前用户环境变量中设置：

```env
ALPHA_VANTAGE_API_KEY=你的Key
FINNHUB_API_KEY=你的Key
STOCKDATA_API_KEY=你的Key
```

仅配置的源会被尝试；未配置的源会自动跳过。yfinance 无需配置。

## 输出

- `python stock_data.py AAPL --json` 输出 JSON：`symbol`, `price`, `volume`, `market_cap`, `pe`, `source`。  
- 若某源无 P/E，JSON 中 `pe` 可能为 `null`，us-stock-analysis 会用 web search 补查并标注来源。
