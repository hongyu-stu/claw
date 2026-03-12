#!/usr/bin/env python3
"""
全球宏观数据（yfinance）：当前值 vs 24h 前，写 workspace 的 macro_data_YYYY-MM-DD.json
用法: python macro_yfinance.py [--json]
"""
import json
import os
import sys
from datetime import datetime

try:
    import yfinance as yf
except ImportError:
    print("请安装: pip install yfinance pandas")
    sys.exit(1)

# workspace 目录：环境变量优先，否则默认 .openclaw/workspace
WORKSPACE = os.environ.get(
    "OPENCLAW_WORKSPACE",
    os.path.join(os.environ.get("USERPROFILE", os.environ.get("HOME", "")), ".openclaw", "workspace"),
)

# 宏观标的 (ticker, 中文名, 单位)
MACRO_TICKERS = [
    ("^IRX", "美债3月期", "%"),
    ("^FVX", "美债5年期", "%"),
    ("^TNX", "美债10年期", "%"),
    ("^TYX", "美债30年期", "%"),
    ("GC=F", "黄金期货", ""),
    ("SI=F", "白银期货", ""),
    ("CL=F", "WTI原油", ""),
    ("BZ=F", "布伦特原油", ""),
    ("DX-Y.NYB", "美元指数", ""),
    ("^VIX", "VIX", ""),
    ("^SKEW", "CBOE Skew", ""),
    ("^GSPC", "标普500", ""),
    ("^IXIC", "纳斯达克", ""),
    ("^DJI", "道琼斯", ""),
]


def fetch_row(ticker, name, unit):
    """拉取当前值，并计算相对 24h 前的涨跌幅 day_pct。优先 1h K 线，无则用日线近似。"""
    try:
        tk = yf.Ticker(ticker)
        df = tk.history(period="5d", interval="1h")
        if df is None or df.empty:
            df = tk.history(period="7d")
            if df is None or df.empty:
                return None, None
            # 日线：当前=最后一根 Close，24h 前=前一根 Close
            close_now = float(df.iloc[-1]["Close"])
            if len(df) < 2:
                day_pct = 0.0
            else:
                close_24h = float(df.iloc[-2]["Close"])
                day_pct = (close_now - close_24h) / close_24h * 100 if close_24h and close_24h != 0 else 0.0
            out = {"name": name, "value": close_now, "day_pct": round(day_pct, 4), "unit": unit, "source": "yfinance"}
            last_ts = df.index[-1]
            trade_date = last_ts.strftime("%Y-%m-%d") if hasattr(last_ts, "strftime") else str(last_ts)[:10]
            return out, trade_date
        # 1h：当前=最后一根 Close，24h 前≈24 根前
        close_now = float(df.iloc[-1]["Close"])
        idx_24h = max(0, len(df) - 25)
        close_24h = float(df.iloc[idx_24h]["Close"]) if len(df) >= 2 else close_now
        day_pct = (close_now - close_24h) / close_24h * 100 if close_24h and close_24h != 0 else 0.0
        out = {"name": name, "value": close_now, "day_pct": round(day_pct, 4), "unit": unit, "source": "yfinance"}
        last_ts = df.index[-1]
        trade_date = last_ts.strftime("%Y-%m-%d") if hasattr(last_ts, "strftime") else str(last_ts)[:10]
        return out, trade_date
    except Exception as e:
        print(f"  [跳过] {name} ({ticker}): {e}")
        return None, None


def main():
    out_json = "--json" in sys.argv
    rows = []
    failed = []
    data_date = None

    for ticker, name, unit in MACRO_TICKERS:
        row, trade_date = fetch_row(ticker, name, unit)
        if row:
            rows.append(row)
            if trade_date:
                data_date = trade_date
        else:
            failed.append(name)

    if not data_date:
        data_date = datetime.now().strftime("%Y-%m-%d")

    run_at = datetime.now().strftime("%Y-%m-%d %H:%M")
    payload = {
        "data_date": data_date,
        "run_at": run_at,
        "rows": rows,
        "failed": failed,
    }

    if out_json:
        os.makedirs(WORKSPACE, exist_ok=True)
        filename = os.path.join(WORKSPACE, f"macro_data_{datetime.now().strftime('%Y-%m-%d')}.json")
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        print(f"已写入: {filename}")
        print(f"数据日期: {data_date} | 实时 vs 24h 前 | 成功 {len(rows)} 条, 失败 {len(failed)} 条")
    else:
        print(json.dumps(payload, ensure_ascii=False, indent=2))

    return 0 if rows else 1


if __name__ == "__main__":
    sys.exit(main())
