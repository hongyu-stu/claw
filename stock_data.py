#!/usr/bin/env python3
"""
美股行情与估值：按序尝试 yfinance → Alpha Vantage → Finnhub → StockData.org，输出 JSON（含 P/E）。
供 us-stock-analysis skill 使用；失败时由 Claw 用 web search 补全。
用法: python stock_data.py <TICKER> [--json]
"""
import json
import os
import sys

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

TICKER = (sys.argv[1] or "").strip().upper()
OUT_JSON = "--json" in sys.argv

if not TICKER:
    print("Usage: python stock_data.py <TICKER> [--json]", file=sys.stderr)
    sys.exit(1)


def _try_yfinance():
    try:
        import yfinance as yf
    except ImportError:
        return None, None
    try:
        t = yf.Ticker(TICKER)
        info = t.info
        if not info:
            return None, None
        price = info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose")
        if price is None:
            hist = t.history(period="5d")
            if hist is not None and not hist.empty:
                price = float(hist.iloc[-1]["Close"])
        if price is None:
            return None, None
        volume = info.get("volume") or info.get("regularMarketVolume")
        mcap = info.get("marketCap")
        pe = info.get("trailingPE") or info.get("forwardPE")
        if pe is None and info.get("trailingEps"):
            try:
                pe = float(price) / float(info["trailingEps"])
            except (TypeError, ZeroDivisionError):
                pass
        return {
            "symbol": TICKER,
            "price": round(float(price), 4),
            "volume": int(volume) if volume is not None else None,
            "market_cap": int(mcap) if mcap is not None else None,
            "pe": round(float(pe), 4) if pe is not None else None,
            "source": "yfinance",
        }, "yfinance"
    except Exception:
        return None, None


def _try_alpha_vantage():
    key = os.environ.get("ALPHA_VANTAGE_API_KEY", "").strip()
    if not key:
        return None, None
    try:
        import urllib.request
        url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={TICKER}&apikey={key}"
        req = urllib.request.Request(url, headers={"User-Agent": "stock_data.py"})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read().decode())
        q = (data or {}).get("Global Quote", {})
        if not q:
            return None, None
        price = q.get("05. price")
        volume = q.get("06. volume")
        if price is None:
            return None, None
        price = float(price)
        volume = int(volume) if volume else None
        pe_str = q.get("09. price to earnings ratio") or ""
        pe = float(pe_str) if pe_str else None
        return {
            "symbol": TICKER,
            "price": round(price, 4),
            "volume": volume,
            "market_cap": None,
            "pe": round(pe, 4) if pe is not None else None,
            "source": "alpha_vantage",
        }, "alpha_vantage"
    except Exception:
        return None, None


def _try_finnhub():
    key = os.environ.get("FINNHUB_API_KEY", "").strip()
    if not key:
        return None, None
    try:
        import urllib.request
        url = f"https://finnhub.io/api/v1/quote?symbol={TICKER}&token={key}"
        req = urllib.request.Request(url, headers={"User-Agent": "stock_data.py"})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read().decode())
        if not data or data.get("c") is None:
            return None, None
        price = float(data["c"])
        volume = data.get("v")
        volume = int(volume) if volume is not None else None
        return {
            "symbol": TICKER,
            "price": round(price, 4),
            "volume": volume,
            "market_cap": None,
            "pe": None,
            "source": "finnhub",
        }, "finnhub"
    except Exception:
        return None, None


def _try_stockdata():
    key = os.environ.get("STOCKDATA_API_KEY", "").strip()
    if not key:
        return None, None
    try:
        import urllib.request
        url = f"https://api.stockdata.org/v1/data/quote?symbols={TICKER}&api_token={key}"
        req = urllib.request.Request(url, headers={"User-Agent": "stock_data.py/1.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read().decode())
        arr = (data or {}).get("data", [])
        if not arr:
            return None, None
        row = arr[0]
        price = row.get("price") or row.get("close")
        if price is None:
            return None, None
        price = float(price)
        volume = row.get("volume")
        volume = int(volume) if volume is not None else None
        pe = row.get("price_to_earnings") or row.get("pe")
        pe = float(pe) if pe is not None else None
        mcap = row.get("market_cap")
        mcap = int(mcap) if mcap is not None else None
        return {
            "symbol": TICKER,
            "price": round(price, 4),
            "volume": volume,
            "market_cap": mcap,
            "pe": round(pe, 4) if pe is not None else None,
            "source": "stockdata",
        }, "stockdata"
    except Exception:
        return None, None


def main():
    for fn in (_try_yfinance, _try_alpha_vantage, _try_finnhub, _try_stockdata):
        out, source = fn()
        if out is not None:
            out["source"] = source
            if OUT_JSON:
                print(json.dumps(out, ensure_ascii=False))
            else:
                print(f"price={out['price']} pe={out.get('pe')} source={source}")
            return 0
    if OUT_JSON:
        print(json.dumps({"symbol": TICKER, "error": "all_sources_failed"}, ensure_ascii=False))
    else:
        print("All sources failed", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
