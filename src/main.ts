import { Actor, log } from 'apify';
import { PlaywrightCrawler } from 'crawlee';
import { extractAirtelPlans, extractViPlansFromText, isBlockedPage, parseJioPlans } from './routes.js';
import type { ActorInput, RequestData, TelecomOperator, TelecomPlanRecord } from './types.js';

const JIO_CONFIG_URL = 'https://myjiostatic.cdn.jio.com/jiocom/static/plans-config/prepaidPlansConfig.json';
const SOURCE_URLS = {
    airtel: 'https://www.airtel.in/recharge-online',
    vi: 'https://www.myvi.in/prepaid/online-mobile-recharge',
} as const;

await Actor.init();

const input = (await Actor.getInput<ActorInput>()) ?? {};
const allowedOperators = new Set<TelecomOperator>(['jio', 'airtel', 'vi']);
const requestedOperators: TelecomOperator[] = input.operators ?? ['jio', 'airtel', 'vi'];
const operators = [...new Set<TelecomOperator>(requestedOperators)]
    .filter((operator): operator is TelecomOperator => allowedOperators.has(operator));
const categoryFilters = (input.categories ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean);
const minPrice = Math.max(input.minPrice ?? 0, 0);
const maxPrice = Math.max(input.maxPrice ?? 100_000, minPrice);
const maxResults = Math.min(Math.max(input.maxResults ?? 100, 1), 500);

if (operators.length === 0) throw new Error('Select at least one operator: Jio, Airtel, or Vi.');

const seenKeys = new Set<string>();
let savedCount = 0;
let spendingLimitReached = false;

const planKey = (plan: TelecomPlanRecord): string => [
    plan.source,
    plan.planId ?? '',
    plan.price,
    plan.validity ?? '',
    plan.data ?? '',
    plan.planName,
].join(':').toLowerCase();

const matchesFilters = (plan: TelecomPlanRecord): boolean => {
    if (plan.price < minPrice || plan.price > maxPrice) return false;
    if (categoryFilters.length === 0) return true;
    const searchable = [plan.category, plan.planName, plan.data, ...plan.benefits]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
    return categoryFilters.some((filter) => searchable.includes(filter));
};

const savePlans = async (plans: TelecomPlanRecord[]): Promise<void> => {
    for (const plan of plans) {
        if (savedCount >= maxResults || spendingLimitReached) break;
        if (!matchesFilters(plan)) continue;
        const key = planKey(plan);
        if (seenKeys.has(key)) continue;

        seenKeys.add(key);
        await Actor.pushData(plan);
        const chargeResult = await Actor.charge({ eventName: 'plan-scraped' });
        savedCount += 1;

        if (chargeResult.eventChargeLimitReached) {
            spendingLimitReached = true;
            await Actor.setStatusMessage(`Stopped at the user's spending limit after ${savedCount} plans`);
            log.info('User spending limit reached; no more plan records will be collected.');
            break;
        }
    }
};

if (operators.includes('jio')) {
    try {
        const response = await fetch(JIO_CONFIG_URL, {
            headers: {
                accept: 'application/json',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36',
            },
            signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const plans = parseJioPlans(await response.json());
        if (plans.length === 0) throw new Error('The official Jio catalog returned no plans.');
        await savePlans(plans);
        log.info(`Processed ${plans.length} official Jio plans`, { totalSaved: savedCount });
    } catch (error) {
        log.error('Jio plan collection failed', { error: String(error) });
    }
}

const browserOperators = operators.filter((operator): operator is 'airtel' | 'vi' => operator !== 'jio');
if (browserOperators.length > 0 && savedCount < maxResults && !spendingLimitReached) {
    const proxyConfiguration = await Actor.createProxyConfiguration(
        input.proxyConfiguration ?? {
            useApifyProxy: true,
            apifyProxyGroups: ['RESIDENTIAL'],
            apifyProxyCountry: 'IN',
        },
    );

    const requests = browserOperators.map((operator) => ({
        url: SOURCE_URLS[operator],
        uniqueKey: `telecom-${operator}`,
        skipNavigation: true,
        userData: { operator } satisfies RequestData,
    }));

    const crawler = new PlaywrightCrawler({
        proxyConfiguration,
        headless: true,
        maxConcurrency: 1,
        minConcurrency: 1,
        maxRequestRetries: 3,
        retryOnBlocked: true,
        requestHandlerTimeoutSecs: 180,
        maxRequestsPerCrawl: requests.length,
        sessionPoolOptions: {
            maxPoolSize: 30,
            sessionOptions: { maxUsageCount: 30 },
        },
        browserPoolOptions: { useFingerprints: true },
        launchContext: {
            useChrome: true,
            launchOptions: {
                args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-dev-shm-usage'],
            },
        },
        preNavigationHooks: [async ({ page }) => {
            await page.setExtraHTTPHeaders({ 'accept-language': 'en-IN,en;q=0.9' });
            page.setDefaultTimeout(20_000);
            await page.waitForTimeout(1_000 + Math.floor(Math.random() * 2_000));
        }],
        requestHandler: async ({ page, request, session }) => {
            if (savedCount >= maxResults || spendingLimitReached) return;
            const { operator } = request.userData as RequestData;

            await page.goto(request.url, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch((error) => {
                log.warning(`${operator} navigation did not settle; inspecting the rendered page`, { error: String(error) });
            });

            let plans: TelecomPlanRecord[] = [];
            if (operator === 'airtel') {
                await page.locator('.pack-card-container').first().waitFor({ state: 'visible', timeout: 60_000 });
                plans = await extractAirtelPlans(page);
            } else {
                await page.getByText('popular recharge packs', { exact: false }).first()
                    .waitFor({ state: 'visible', timeout: 60_000 });
                await page.waitForTimeout(5_000);
                const body = await page.locator('body').innerText();
                plans = extractViPlansFromText(body);
            }

            const title = await page.title().catch(() => '');
            const bodyPreview = await page.locator('body').innerText().catch(() => '');
            if (isBlockedPage(title, bodyPreview)) {
                session?.markBad();
                throw new Error(`${operator} challenge page detected.`);
            }
            if (plans.length === 0) {
                session?.markBad();
                throw new Error(`No ${operator} plans were found on the official page.`);
            }

            await savePlans(plans);
            log.info(`Processed ${plans.length} ${operator} plans`, { totalSaved: savedCount });
            if (spendingLimitReached || savedCount >= maxResults) await crawler.autoscaledPool?.abort();
            if (!spendingLimitReached) await Actor.setStatusMessage(`Saved ${savedCount}/${maxResults} telecom plans`);
        },
        failedRequestHandler: async ({ request }, error) => {
            log.error(`Official telecom page failed after retries: ${request.url}`, { error: String(error) });
        },
    });

    await crawler.run(requests);
}

if (savedCount === 0) {
    throw new Error('No clean telecom plan records were collected from the selected official sources.');
}

if (!spendingLimitReached) await Actor.setStatusMessage(`Finished with ${savedCount} unique telecom plans`);
log.info(`Telecom plan scrape finished with ${savedCount} unique plans.`);

await Actor.exit();
