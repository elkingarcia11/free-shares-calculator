# Free Shares Calculator

Local-only calculator to answer:

> If I own `quantity` shares with an average cost of `avgCost`, and I want to keep `freeShares` shares, what **average sell price** do I need on the shares I sell so the remaining shares are effectively “free” (i.e. I’ve recovered my original cost basis)?

**“Free shares”** means: after selling some shares, you’ve recovered your entire original cost basis (ignoring taxes/fees), while still holding your remaining shares.

The page **auto-updates live** as you type—no calculate button.

## What this app is for

It helps you figure out the **average sell price** you’d need when selling some of your shares so that you **recover your entire original cost basis**, while still keeping a chosen number of shares as “free” (ignoring taxes/fees).

You enter **average cost**, **shares owned**, and **shares you want to keep** → it outputs:

- how many shares to sell
- the required average sell price to make the remaining shares effectively “free”

## How it calculates

- Shares to sell: `sharesToSell = quantity - freeShares`
- Required average sell price:

  `requiredPrice = (avgCost × quantity) / sharesToSell`

This ignores taxes, fees, bid/ask spread, and assumes average-cost basis.

## Run it

Recommended (avoids `file://` restrictions):

```bash
python3 -m http.server 5173
```

Then open `http://localhost:5173`.
