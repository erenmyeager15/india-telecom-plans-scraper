# India Telecom Plans Scraper - Jio, Airtel & Vi

Collect current public prepaid plan data from the official Jio, Airtel, and Vi websites. The Actor combines Jio's public plan catalog with browser-rendered Airtel and Vi pages, then returns one normalized record per unique plan.

## What It Collects

- Operator and source
- Plan name, category, and public plan ID when available
- Price in INR
- Validity and data allowance
- Total data, calls, and SMS when published
- 5G availability
- Additional and OTT benefits
- Telecom circle or coverage label
- Official recharge URL and scrape timestamp

Unavailable values are returned as `null`; the Actor never invents missing plan details.

## How to Scrape India Telecom Plans

1. Select Jio, Airtel, Vi, or any combination of operators.
2. Optionally add filters such as `5G`, `OTT`, `annual`, or `data`.
3. Set a price range and result limit.
4. Run the Actor and export the dataset as JSON, CSV, Excel, XML, or another supported format.

## Input Example

```json
{
  "operators": ["jio", "airtel", "vi"],
  "categories": ["5G"],
  "minPrice": 200,
  "maxPrice": 4000,
  "maxResults": 100,
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"],
    "apifyProxyCountry": "IN"
  }
}
```

## Output Example

```json
{
  "source": "airtel",
  "operator": "Airtel",
  "planType": "prepaid",
  "position": 1,
  "category": "Prepaid plans",
  "planId": null,
  "planName": "Airtel prepaid plan INR 3599",
  "price": 3599,
  "currency": "INR",
  "validity": "365 Days",
  "data": "Unlimited 5G + 2GB/day",
  "totalData": null,
  "voice": "Unlimited local STD & Roaming Calls",
  "sms": null,
  "benefits": ["Unlimited 5G Data", "Adobe Express Premium"],
  "ottBenefits": [],
  "networkType": "5G",
  "circle": "India",
  "rechargeUrl": "https://www.airtel.in/recharge-online",
  "scrapedAt": "2026-06-13T12:00:00.000Z"
}
```

## Use Cases

- Compare prepaid prices and benefits across Indian operators
- Monitor plan launches, removals, and pricing changes
- Build telecom comparison dashboards
- Track 5G, OTT, annual, and data-plan availability
- Support market research and competitive analysis

## Pricing

| Event | Price |
|---|---:|
| `plan-scraped` | $0.001 per saved plan |

You are charged only after a clean unique plan is saved to the dataset. The Actor stops collecting more records when the user's maximum run charge is reached.

## Reliability Notes

Telecom catalogs can be regional and change frequently. India residential proxies are recommended for Airtel and Vi. Jio records come from Jio's public plan configuration; Airtel and Vi records are read from their official public recharge pages.

## Responsible Use

Use this Actor only for lawful purposes and in compliance with source website terms, robots.txt, and applicable regulations. The Actor collects public product facts and does not require customer accounts, phone numbers, or personal data.
