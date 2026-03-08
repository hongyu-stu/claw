---
name: us-stock-analysis
description: Comprehensive US stock analysis including fundamental analysis (financial metrics, business quality, valuation), technical analysis (indicators, chart patterns, support/resistance), stock comparisons, and investment report generation. Use when user requests analysis of US stock tickers (e.g., "analyze AAPL", "compare TSLA vs NVDA", "give me a report on Microsoft"), evaluation of financial metrics, technical chart analysis, or investment recommendations for American stocks.
---

# US Stock Analysis

## Overview

Perform comprehensive analysis of US stocks covering fundamental analysis (financials, business quality, valuation), technical analysis (indicators, trends, patterns), peer comparisons, and generate detailed investment reports. **行情与估值数据优先用 stock_data.py，失败再用 web search；研报来自 workspace 的 stock research；输出必须写明信息来源，且必须包含公司 P/E。**

## Data Sources

### 1. 行情与估值（优先脚本，失败再用 web search）

**必须优先执行**：在项目根目录（如 `C:\Users\Administrator\Desktop\claw`）运行  
`python stock_data.py <TICKER> --json`  
获取当前价格、成交量、市值、**P/E** 等；脚本内部按序尝试 yfinance → Alpha Vantage → Finnhub → StockData.org。

- 若脚本成功返回 JSON：**必须使用该数据**作为行情与估值基础，并在分析中**明确标注**「行情/估值数据来源：stock_data.py（yfinance / Alpha Vantage / Finnhub / StockData.org，以脚本返回为准）」。
- **输出中必须包含该公司 P/E**（来自脚本或后续补查）；若脚本无 P/E，用 web search 补查并标注来源。
- 若脚本执行失败或无可用数据：再用 **web search** 获取价格、P/E、成交量等，并**明确标注**「行情/估值数据来源：web search」。

### 2. 研报

- 研报来自 **workspace 的 stock research** 目录（如 `~/.openclaw/workspace/stock research` 或当前 workspace 下的 `stock research`）。
- 对当前分析标的，**先在该目录下查找相关 PDF 研报**，若有则：注明报告日期（通常在 PDF 开头）、概括核心观点，并在输出中标注「研报来源：workspace/stock research」。

### 3. 其他数据（财报、新闻、同业、技术）

- 财报、新闻、同业对比、技术指标等可继续用 **web search** 或引用上述脚本/研报；所有引用均需**写明信息来源**（如 Yahoo Finance、SEC、web search、研报路径等）。

## Analysis Types

This skill supports four types of analysis. Determine which type(s) the user needs:

1. **Basic Stock Info** - Quick overview with key metrics
2. **Fundamental Analysis** - Deep dive into business, financials, valuation
3. **Technical Analysis** - Chart patterns, indicators, trend analysis
4. **Comprehensive Report** - Complete analysis combining all approaches

## Analysis Workflows

### 1. Basic Stock Information

**When to Use:** User asks for quick overview or basic info

**Steps:**
1. **先运行** `python stock_data.py <TICKER> --json`（项目根目录）获取行情与估值；若失败再用 web search。
2. **必须包含公司 P/E**（来自脚本或 web search）；并写明「行情/估值数据来源：stock_data.py（或 web search）」。
3. 在 workspace 的 **stock research** 目录查找该标的相关 PDF 研报；若有则注明报告日期并概括要点，标注「研报来源：workspace/stock research」。
4. 补全 52 周区间、近期新闻等（可 web search），并标注来源。
5. 以简洁摘要呈现，**文末或表中注明各数据来源**。

**Output Format:**
- Company description (1-2 sentences)
- Current price and trading metrics（含 **P/E**）
- Key valuation metrics (table)，并写数据来源
- Recent performance
- 研报要点（如有）
- Notable recent news (if any)

### 2. Fundamental Analysis

**When to Use:** User wants financial analysis, valuation assessment, or business evaluation

**Steps:**
1. **先运行** `python stock_data.py <TICKER> --json` 获取行情与估值；若失败再用 web search。**输出必须包含该公司 P/E**，并写明行情/估值数据来源。
2. **查阅 workspace/stock research** 中与该标的相关的 PDF 研报，注明报告日期并概括核心观点，标注研报来源。
3. **Gather comprehensive financial data**（可 web search）：
   - Revenue, earnings, cash flow (3-5 year trends)
   - Balance sheet metrics (debt, cash, working capital)
   - Profitability metrics (margins, ROE, ROIC)
   
4. **Read references/fundamental-analysis.md** for analytical framework

5. **Read references/financial-metrics.md** for metric definitions and calculations

6. **Analyze business quality:**
   - Competitive advantages
   - Management track record
   - Industry position
   
7. **Perform valuation analysis:**
   - **必须包含 P/E**（来自 stock_data.py 或 web search）；其余比率 PEG, P/B, EV/EBITDA 等
   - Compare to historical averages and peer group
   - Estimate fair value range
   
8. **Identify risks:**
   - Company-specific risks
   - Market/macro risks
   - Red flags from financial data

9. **Generate output** following references/report-template.md structure，**文内注明行情/估值与研报来源**

**Critical Analyses:**
- Profitability trends (improving/declining margins)
- Cash flow quality (FCF vs earnings)
- Balance sheet strength (debt levels, liquidity)
- Growth sustainability
- Valuation vs peers and historical average

### 3. Technical Analysis

**When to Use:** User asks for technical analysis, chart patterns, or trading signals

**Steps:**
1. **先运行** `python stock_data.py <TICKER> --json` 获取当前价、成交量等；若失败再用 web search。输出中**写明行情数据来源**。
2. **Gather technical data**（可 web search 补全）：
   - Current price and recent price action
   - Volume trends
   - Moving averages (20-day, 50-day, 200-day)
   - Technical indicators (RSI, MACD, Bollinger Bands)
   
3. **Read references/technical-analysis.md** for indicator definitions and patterns

4. **Identify trend:**
   - Uptrend, downtrend, or sideways
   - Strength of trend
   
5. **Locate support and resistance levels:**
   - Recent highs and lows
   - Moving average levels
   - Round numbers
   
6. **Analyze indicators:**
   - RSI: Overbought (>70) or oversold (<30)
   - MACD: Crossovers and divergences
   - Volume: Confirmation or divergence
   - Bollinger Bands: Squeeze or expansion
   
7. **Identify chart patterns:**
   - Reversal patterns (head and shoulders, double top/bottom)
   - Continuation patterns (flags, triangles)
   
8. **Generate technical outlook:**
   - Current trend assessment
   - Key levels to watch
   - Risk/reward analysis
   - Short and medium-term outlook

**Interpretation Guidelines:**
- Confirm signals with multiple indicators
- Consider volume for validation
- Note divergences between price and indicators
- Always identify risk levels (stop-loss)

### 4. Comprehensive Investment Report

**When to Use:** User asks for detailed report, investment recommendation, or complete analysis

**Steps:**
1. **先运行** `python stock_data.py <TICKER> --json` 获取行情与估值；失败再用 web search。**必须包含 P/E**，并写明数据来源。
2. **查阅 workspace/stock research** 中相关研报，注明报告日期与核心观点，标注研报来源。
3. **Perform data gathering**（含 P/E 与来源标注，同 Basic Info）

4. **Execute fundamental analysis** (follow workflow above)

5. **Execute technical analysis** (follow workflow above)

4. **Read references/report-template.md** for complete report structure

5. **Synthesize findings:**
   - Integrate fundamental and technical insights
   - Develop bull and bear cases
   - Assess risk/reward
   
6. **Generate recommendation:**
   - Buy/Hold/Sell rating
   - Target price with timeframe
   - Conviction level
   - Entry strategy
   
7. **Create formatted report** following template structure，**文内注明行情/估值与研报来源**。

**Report Must Include:**
- Executive summary with recommendation
- Company overview
- Investment thesis (bull and bear cases)
- Fundamental analysis section
- Technical analysis section
- Valuation analysis
- Risk assessment
- Catalysts and timeline
- Conclusion

## Stock Comparison Analysis

**When to Use:** User asks to compare two or more stocks (e.g., "compare AAPL vs MSFT")

**Steps:**
1. **对每个标的先运行** `python stock_data.py <TICKER> --json` 获取行情与估值（含 **P/E**）；失败再用 web search。**必须包含各公司 P/E**，并写明各标的数据来源。
2. **查阅 workspace/stock research** 中与各标的相关的研报，注明报告日期与要点，标注研报来源。
3. **Gather data for all stocks**（含 P/E 与来源，可比时间范围）
   
4. **Read references/fundamental-analysis.md** and references/financial-metrics.md

5. **Create side-by-side comparison:**
   - Business models comparison
   - Financial metrics table (all key ratios，**含 P/E**)
   - Valuation metrics table
   - Growth rates comparison
   - Profitability comparison
   - Balance sheet strength
   - 各数据来源标注
   
6. **Identify relative strengths:**
   - Where each company excels
   - Quantified advantages
   
7. **Technical comparison:**
   - Relative strength
   - Momentum comparison
   - Which is in better technical position
   
8. **Generate recommendation:**
   - Which stock is more attractive and why
   - Consider both fundamental and technical factors
   - Portfolio allocation suggestion
   - Risk-adjusted return assessment

**Output Format:** Follow "Comparison Report Structure" in references/report-template.md

## Output Guidelines

**General Principles:**
- Use tables for financial data and comparisons (easy to scan)
- **必须包含公司 P/E**，并写明行情/估值数据来源（stock_data.py 或 web search）
- 若引用研报，注明「研报来源：workspace/stock research」及报告日期
- Bold key metrics and findings
- Include data sources and dates
- Quantify whenever possible
- Present both bull and bear perspectives
- Be clear about assumptions and uncertainties

**Formatting:**
- **Headers** for clear section separation
- **Tables** for metrics, comparisons, historical data
- **Bullet points** for lists, factors, risks
- **Bold text** for key findings, important metrics
- **Percentages** for growth rates, returns, margins
- **Currency** formatted consistently ($B for billions, $M for millions)

**Tone:**
- Objective and balanced
- Acknowledge uncertainty
- Support claims with data
- Avoid hyperbole
- Present risks clearly

## Reference Files

Load these references as needed during analysis:

**references/technical-analysis.md**
- When: Performing technical analysis or interpreting indicators
- Contains: Indicator definitions, chart patterns, support/resistance concepts, analysis workflow

**references/fundamental-analysis.md**
- When: Performing fundamental analysis or business evaluation
- Contains: Business quality assessment, financial health analysis, valuation frameworks, risk assessment, red flags

**references/financial-metrics.md**
- When: Need definitions or calculation methods for financial ratios
- Contains: All key metrics with formulas (profitability, valuation, growth, liquidity, leverage, efficiency, cash flow)

**references/report-template.md**
- When: Creating comprehensive report or comparison
- Contains: Complete report structure, formatting guidelines, section templates, comparison format

## Example Queries

**Basic Info:**
- "What's the current price of AAPL?"
- "Give me key metrics for Tesla"
- "Quick overview of Microsoft stock"

**Fundamental:**
- "Analyze NVDA's financials"
- "Is Amazon overvalued?"
- "Evaluate Apple's business quality"
- "What's Google's debt situation?"

**Technical:**
- "Technical analysis of TSLA"
- "Is Netflix oversold?"
- "Show me support levels for AAPL"
- "What's the trend for AMD?"

**Comprehensive:**
- "Complete analysis of Microsoft"
- "Give me a full report on AAPL"
- "Should I invest in Tesla? Give me detailed analysis"

**Comparison:**
- "Compare AAPL vs MSFT"
- "Tesla vs Nvidia - which is better?"
- "Analyze Meta vs Google"
