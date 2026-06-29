# India Telecom Plans Scraper Promotion Notes

## YouTube Tutorial Title Options

- Compare Jio, Airtel, Vi and BSNL Prepaid Plans with Apify
- India Telecom Plans Scraper Tutorial: Prices, Data, Validity and 5G
- Build an Indian Mobile Plan Comparison Dataset from Official Operator Sites

## 60-Second Tutorial Script

1. Show the Actor page: "This Actor normalizes public prepaid plans from Jio, Airtel, Vi, and BSNL."
2. Open the input form and keep Jio selected for the first run.
3. Leave category filters empty.
4. Set `maxResults` to `5`.
5. Keep the proxy disabled for the Jio sample.
6. Run the Actor.
7. Show `price`, `validity`, `data`, `totalData`, `voice`, `sms`, `networkType`, `ottBenefits`, and `rechargeUrl`.
8. Export the dataset as CSV or Excel.
9. Closing line: "Use the same input on a schedule to monitor public plan and benefit changes."

## Short Post Copy

I polished an India Telecom Plans Scraper on Apify.

It collects public prepaid plan data from the official Jio, Airtel, Vi, and BSNL sources into one normalized dataset for plan comparison, telecom research, and recurring change monitoring.

The output includes operator, category, plan ID and name, price, validity, daily and total data, calls, SMS, benefits, OTT subscriptions, 5G signals, circle, official recharge URL, and scrape timestamp.

The Actor collects product-level plan facts only. It does not require or output subscriber names, mobile numbers, accounts, balances, addresses, usage history, or other personal data.

Example input:

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

## SEO Keywords

- India telecom plans scraper
- Jio Airtel Vi BSNL plan comparison
- prepaid recharge plan data India
- Indian mobile plan price tracker
- 5G prepaid plans dataset
- telecom market research India
- Apify telecom scraper

## Promotion Guard

Use real public plan outputs only. Do not position the Actor as a subscriber-data scraper, mobile-number lookup tool, account or balance checker, personalized-offer collector, or guaranteed real-time tariff authority. Operator eligibility, circle availability, coverage, and terms can change.
