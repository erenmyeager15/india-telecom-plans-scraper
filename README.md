# India Telecom Plans Scraper - Jio, Airtel, Vi & BSNL

Compare public prepaid mobile plans from the official Jio, Airtel, Vi, and BSNL websites in one normalized Apify dataset.

The Actor collects plan-level facts such as price, validity, daily and total data, calls, SMS, 5G signals, benefits, OTT subscriptions, circle, and official recharge URL. It does not require subscriber accounts, mobile numbers, or personal data.

## What It Extracts

- Plan identity: operator, source, plan type, position, category, public plan ID, and plan name.
- Price and allowance: INR price, validity, daily data, total data, voice, and SMS.
- Benefits: general plan benefits, OTT subscriptions, and 5G availability when published.
- Regional and source details: telecom circle, official recharge URL, and scrape timestamp.

Unavailable values remain `null`; the Actor does not invent missing plan details.

## Supported Operators

| Operator | Input value | Collection path | Proxy guidance |
| --- | --- | --- | --- |
| Jio | `jio` | Official public prepaid-plan catalog | Start without a proxy |
| Airtel | `airtel` | Official rendered recharge page | India residential proxy recommended |
| Vi | `vi` | Official rendered recharge page | India residential proxy recommended |
| BSNL | `bsnl` | Official public catalog, with fresh-session retries | India residential proxy recommended for retries |

Each selected operator is isolated. If one operator is blocked or temporarily unavailable, the Actor logs the issue and continues with the remaining operators.

## Quick Start

### Lowest-cost Jio sample

This matches the Store example and uses the fast public Jio catalog.

```json
{
  "operators": ["jio"],
  "categories": [],
  "minPrice": 0,
  "maxPrice": 5000,
  "maxResults": 5,
  "proxyConfiguration": {
    "useApifyProxy": false
  }
}
```

### Compare all four operators

```json
{
  "operators": ["jio", "airtel", "vi", "bsnl"],
  "categories": [],
  "minPrice": 200,
  "maxPrice": 4000,
  "maxResults": 20,
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"],
    "apifyProxyCountry": "IN"
  }
}
```

### Find 5G or OTT plans

```json
{
  "operators": ["jio", "airtel", "vi"],
  "categories": ["5G", "OTT"],
  "minPrice": 200,
  "maxPrice": 4000,
  "maxResults": 20,
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"],
    "apifyProxyCountry": "IN"
  }
}
```

## Input Fields

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `operators` | array | `["jio"]` | Select one or more of `jio`, `airtel`, `vi`, and `bsnl`. |
| `categories` | array | Empty | Optional case-insensitive text filters such as `5G`, `OTT`, `annual`, `data`, or `popular`. A plan is kept when any filter matches. |
| `minPrice` | number | `0` | Minimum plan price in INR. |
| `maxPrice` | number | `100000` | Maximum plan price in INR. |
| `maxResults` | integer | `5` | Maximum unique plans saved across all selected operators, capped at `500`. |
| `proxyConfiguration` | object | No proxy | Optional Apify Proxy settings. India residential proxy is recommended for Airtel, Vi, and BSNL. |

When multiple operators are selected, the Actor divides the result cap across them so one catalog does not consume every result slot.

## Output Overview

Each dataset item is one normalized prepaid-plan record.

| Field group | Fields |
| --- | --- |
| Source and identity | `source`, `operator`, `planType`, `position`, `category`, `planId`, `planName` |
| Price and allowance | `price`, `currency`, `validity`, `data`, `totalData`, `voice`, `sms` |
| Benefits and network | `benefits`, `ottBenefits`, `networkType`, `circle` |
| Link and timing | `rechargeUrl`, `scrapedAt` |

## Verified Sample Output

The following record came from a successful Jio run on June 23, 2026.

```json
{
  "source": "jio",
  "operator": "Jio",
  "planType": "prepaid",
  "position": 1,
  "category": "Popular Plans",
  "planId": "1013090",
  "planName": "Rs 299-1M-2GB/D",
  "price": 299,
  "currency": "INR",
  "validity": "28 days",
  "data": "2 GB/day",
  "totalData": "56 GB",
  "voice": "Unlimited",
  "sms": "100 SMS/day",
  "benefits": [
    "JioTV",
    "JioCinema",
    "JioSecurity",
    "JioCloud",
    "Post which unlimited @ 64 Kbps",
    "Unlimited 5G data for eligible subscribers"
  ],
  "ottBenefits": ["JioCinema"],
  "networkType": "5G",
  "circle": "India",
  "rechargeUrl": "https://www.jio.com/selfcare/plans/mobility/prepaid-plans-list/",
  "scrapedAt": "2026-06-23T17:43:22.972Z"
}
```

## Tips For Better Results

- Start with Jio, five results, and no proxy to verify the workflow quickly.
- Add Airtel, Vi, or BSNL only when needed, then enable an India residential proxy.
- Keep `maxResults` small for comparisons because browser-rendered operator pages take longer than the Jio catalog.
- Use multiple category filters when either match is acceptable; filters use OR logic.
- Schedule the same input to monitor plan price, validity, data, 5G, and benefit changes.
- Compare plans by normalized fields instead of relying only on marketing plan names.

## Known Limits

- Operator websites and public catalogs can change without notice.
- Airtel and Vi require browser rendering and can be slower or temporarily blocked.
- BSNL availability and plan details can vary by circle; the public catalog path may require fresh residential sessions.
- Some operator pages do not expose SMS, total data, plan ID, circle, or OTT details for every plan.
- `networkType: "5G"` means the source text mentions 5G; eligibility can still depend on device, coverage, plan terms, and operator rules.
- The Actor currently collects public prepaid plans, not postpaid bills, subscriber usage, account balances, or personalized offers.

## Pricing

This Actor uses pay-per-event pricing. The currently active Store prices are:

| Event | When charged | Price |
| --- | --- | ---: |
| `apify-actor-start` | At run start; event count depends on memory (one per GB, minimum one) | `$0.00005` per event |
| `plan-scraped` | One clean unique plan saved | `$0.001` |

The Actor saves and charges each plan atomically, and stops adding records when the user's maximum cost per run is reached. Apify displays the authoritative current prices before each run; scheduled pricing changes may take effect later than documentation changes.

## Data Safety

The Actor collects public telecom product information only. It does not request or output subscriber names, mobile numbers, account IDs, addresses, contact details, usage history, or other personal data.

## Responsible Use

Use this Actor only for lawful collection and processing of publicly available plan information. Users are responsible for complying with operator terms, robots.txt, applicable privacy laws, India's DPDP Act, and local regulations.

## License

Apache-2.0
