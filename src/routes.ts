import type { Page } from 'playwright';
import type { TelecomPlanRecord } from './types.js';

const JIO_RECHARGE_URL = 'https://www.jio.com/selfcare/plans/mobility/prepaid-plans-list/';
const AIRTEL_RECHARGE_URL = 'https://www.airtel.in/recharge-online';
const VI_RECHARGE_URL = 'https://www.myvi.in/prepaid/online-mobile-recharge';
const BSNL_PREPAID_URL = 'https://bsnl.co.in/pricing-plans/prepaid';

const clean = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.replace(/\s+/g, ' ').trim();
    return normalized || null;
};

const numberValue = (value: unknown): number | null => {
    const parsed = Number(String(value ?? '').replace(/[^\d.]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
};

const objectValue = (value: unknown): Record<string, unknown> | null => (
    typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null
);

const arrayValue = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

const uniqueStrings = (values: Array<string | null | undefined>): string[] => (
    [...new Set(values.map((value) => clean(value)).filter((value): value is string => Boolean(value)))]
);

const stripHtml = (value: unknown): string | null => clean(
    typeof value === 'string' ? value.replace(/<[^>]+>/g, ' ') : value,
);

const isOttBenefit = (value: string): boolean => (
    /ott|netflix|prime|hotstar|sonyliv|zee5|jiocinema|movies?\s*&\s*tv|xstream|disney/i.test(value)
);

export const parseJioPlans = (payload: unknown): TelecomPlanRecord[] => {
    const root = objectValue(payload);
    const category = objectValue(root?.planCategory);
    const plans = arrayValue(category?.plans);
    const scrapedAt = new Date().toISOString();

    return plans.flatMap((rawPlan, index) => {
        const plan = objectValue(rawPlan);
        if (!plan) return [];
        const price = numberValue(plan.amount ?? plan.name);
        if (price === null) return [];

        const primeData = objectValue(plan.primeData);
        const misc = objectValue(plan.misc);
        const detailEntries = arrayValue(misc?.details)
            .map(objectValue)
            .filter((entry): entry is Record<string, unknown> => Boolean(entry));
        const detailMap = new Map<string, string>();
        for (const entry of detailEntries) {
            const header = clean(entry.header)?.toLowerCase();
            const value = clean(entry.value);
            if (header && value) detailMap.set(header, value);
        }

        const subscriptions = arrayValue(misc?.subscriptions)
            .map(objectValue)
            .map((entry) => clean(entry?.title))
            .filter((value): value is string => Boolean(value));
        const notes = [
            ...arrayValue(misc?.star).map(stripHtml),
            ...arrayValue(misc?.notes).map(stripHtml),
        ].filter((value): value is string => Boolean(value));
        const benefits = uniqueStrings([...subscriptions, ...notes]);
        const data = detailMap.get('data at high speed*')
            ?? clean(`${primeData?.offerBenefits1 ?? ''} ${primeData?.offerBenefits2 ?? ''}`)
            ?? null;
        const validity = detailMap.get('pack validity')
            ?? clean(`${primeData?.offerBenefits3 ?? ''} ${primeData?.offerBenefits4 ?? ''}`)
            ?? null;
        const searchable = [data, ...benefits, plan.description].filter(Boolean).join(' ');

        return [{
            source: 'jio',
            operator: 'Jio',
            planType: 'prepaid',
            position: index + 1,
            category: clean(plan.categoryLabel) ?? clean(category?.headingText),
            planId: clean(plan.id),
            planName: clean(plan.planName) ?? `Jio prepaid plan ₹${price}`,
            price,
            currency: 'INR',
            validity,
            data,
            totalData: detailMap.get('total data') ?? null,
            voice: detailMap.get('voice') ?? null,
            sms: detailMap.get('sms') ?? null,
            benefits,
            ottBenefits: subscriptions.filter(isOttBenefit),
            networkType: /\b5g\b/i.test(searchable) ? '5G' : null,
            circle: 'India',
            rechargeUrl: JIO_RECHARGE_URL,
            scrapedAt,
        } satisfies TelecomPlanRecord];
    });
};

export const extractAirtelPlans = async (page: Page): Promise<TelecomPlanRecord[]> => {
    const rawPlans = await page.locator('.pack-card-container').evaluateAll((cards) => cards.map((card, index) => {
        const detailNodes = [...card.querySelectorAll('.pack-card-detail')];
        const details = detailNodes.map((detail) => ({
            heading: detail.querySelector('.pack-card-heading')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
            subheading: detail.querySelector('.pack-card-sub-heading')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        }));
        const benefits = [...card.querySelectorAll('.pack-card-benefit label')]
            .map((label) => label.textContent?.replace(/\s+/g, ' ').trim() ?? '')
            .filter(Boolean);
        const priceText = details[0]?.heading || card.querySelector('.pack-card-right-section button')?.textContent || '';
        const section = card.closest('section');
        const category = section?.querySelector('h1, h2, h3, h4')?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
        return { index, details, benefits, priceText, category };
    }));

    const scrapedAt = new Date().toISOString();
    return rawPlans.flatMap((raw) => {
        const price = numberValue(raw.priceText);
        if (price === null) return [];
        const voice = clean(raw.details[0]?.subheading);
        const data = clean(`${raw.details[1]?.heading ?? ''} ${raw.details[1]?.subheading ?? ''}`);
        const validity = clean(`${raw.details[2]?.heading ?? ''} ${raw.details[2]?.subheading ?? ''}`)
            ?.replace(/\s+validity$/i, '') ?? null;
        const benefits = uniqueStrings(raw.benefits);
        const searchable = [data, ...benefits].filter(Boolean).join(' ');

        return [{
            source: 'airtel',
            operator: 'Airtel',
            planType: 'prepaid',
            position: raw.index + 1,
            category: clean(raw.category) ?? 'Prepaid plans',
            planId: null,
            planName: `Airtel prepaid plan INR ${price}`,
            price,
            currency: 'INR',
            validity,
            data,
            totalData: null,
            voice,
            sms: null,
            benefits,
            ottBenefits: benefits.filter(isOttBenefit),
            networkType: /\b5g\b/i.test(searchable) ? '5G' : null,
            circle: 'India',
            rechargeUrl: AIRTEL_RECHARGE_URL,
            scrapedAt,
        } satisfies TelecomPlanRecord];
    });
};

export const extractBsnlPlansFromPage = async (page: Page): Promise<TelecomPlanRecord[]> => {
    await page.waitForFunction(() => (
        [...document.querySelectorAll('main div')].some((element) => /₹\s*\d+/.test(element.textContent ?? ''))
    ), null, { timeout: 60_000 });

    const rawPlans = await page.locator('main div.bg-white.rounded-xl').evaluateAll((cards) => cards.map((card, index) => {
        const text = card.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        const category = card.querySelector('h4')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        const priceText = [...card.querySelectorAll('span')]
            .map((span) => span.textContent?.replace(/\s+/g, ' ').trim() ?? '')
            .find((value) => /^₹\s*\d+/.test(value)) ?? '';
        const validityText = card.querySelector('.text-sky-600')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        const description = [...card.querySelectorAll('p')]
            .map((paragraph) => paragraph.textContent?.replace(/\s+/g, ' ').trim() ?? '')
            .find(Boolean) ?? '';
        return { index, category, priceText, validityText, description, text };
    }));

    const scrapedAt = new Date().toISOString();
    return rawPlans.flatMap((raw) => {
        const price = numberValue(raw.priceText);
        if (price === null) return [];
        const description = clean(raw.description) ?? clean(raw.text);
        if (!description) return [];
        const benefits = uniqueStrings(description.split(/[;|]+/).map((part) => part.trim()));
        const data = description.match(/(?:^|\b)(?:unlimited\s+)?\d+(?:\.\d+)?\s*(?:GB|MB)(?:\s*\/\s*day)?/i)?.[0] ?? null;
        const sms = description.match(/\d+\s*SMS(?:\s*\/\s*day)?/i)?.[0] ?? null;
        const voice = /unlimited\s+(?:voice|calls?)/i.test(description) ? 'Unlimited calls' : null;
        const searchable = [raw.category, description].filter(Boolean).join(' ');

        return [{
            source: 'bsnl',
            operator: 'BSNL',
            planType: 'prepaid',
            position: raw.index + 1,
            category: clean(raw.category) ?? 'Popular',
            planId: null,
            planName: `BSNL prepaid plan INR ${price}`,
            price,
            currency: 'INR',
            validity: clean(raw.validityText),
            data,
            totalData: data && !/day/i.test(data) ? data : null,
            voice,
            sms,
            benefits,
            ottBenefits: benefits.filter(isOttBenefit),
            networkType: /\b5g\b/i.test(searchable) ? '5G' : null,
            circle: 'India',
            rechargeUrl: BSNL_PREPAID_URL,
            scrapedAt,
        } satisfies TelecomPlanRecord];
    });
};

const VI_CATEGORY_LINES = new Set([
    'popular recharge packs', 'unlimited 5g', 'nonstop hero', 'super hero', 'hero unlimited',
    'unlimited', 'ott', 'data', 'handset loss insurance', 'others', 'top up', 'plan voucher', 'filter',
]);

const findMetric = (lines: string[], marker: string): string | null => {
    const markerIndex = lines.findIndex((line) => line.toLowerCase() === marker);
    if (markerIndex < 0) return null;
    const first = lines[markerIndex - 2];
    const second = lines[markerIndex - 1];
    return clean(`${first ?? ''} ${second ?? ''}`);
};

export const extractViPlansFromText = (bodyText: string): TelecomPlanRecord[] => {
    const lines = bodyText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const circleIndex = lines.findIndex((line) => line.toLowerCase() === 'online mobile recharge');
    const circle = circleIndex >= 0 ? clean(lines[circleIndex + 1]) : null;
    const start = Math.max(lines.findIndex((line) => line.toLowerCase() === 'popular recharge packs'), 0);
    const endIndex = lines.findIndex((line, index) => index > start && /^faqs for vi/i.test(line));
    const end = endIndex > start ? endIndex : lines.length;
    const priceIndexes: number[] = [];

    for (let index = start; index < end - 1; index += 1) {
        if (lines[index] === '₹' && /^\d+(?:\.\d+)?$/.test(lines[index + 1])) priceIndexes.push(index);
    }

    const scrapedAt = new Date().toISOString();
    return priceIndexes.flatMap((priceIndex, position) => {
        const nextPriceIndex = priceIndexes[position + 1] ?? end;
        const block = lines.slice(priceIndex, nextPriceIndex);
        const price = numberValue(block[1]);
        if (price === null) return [];
        const nextLabel = nextPriceIndex < end ? clean(lines[nextPriceIndex - 1]) : null;

        let label: string | null = null;
        for (let cursor = priceIndex - 1; cursor >= Math.max(start, priceIndex - 3); cursor -= 1) {
            const candidate = clean(lines[cursor]);
            if (candidate && !VI_CATEGORY_LINES.has(candidate.toLowerCase()) && candidate !== '•') {
                label = candidate;
                break;
            }
        }

        const buyIndex = block.findIndex((line) => line.toLowerCase() === 'buy');
        const benefitLines = (buyIndex >= 0 ? block.slice(buyIndex + 1) : [])
            .filter((line) => line !== '•' && clean(line) !== nextLabel)
            .map((line) => line.replace(/^\+/, '').replace(/\+\.\.\.see more$/i, '').trim())
            .filter((line) => line.length > 2);
        const benefits = uniqueStrings(benefitLines);
        const data = findMetric(block, 'data');
        const validity = findMetric(block, 'validity');
        const voice = benefits.find((benefit) => /unlimited calls?/i.test(benefit)) ?? null;
        const searchable = [data, label, ...benefits].filter(Boolean).join(' ');

        return [{
            source: 'vi',
            operator: 'Vi',
            planType: 'prepaid',
            position: position + 1,
            category: 'Popular recharge packs',
            planId: null,
            planName: label ?? `Vi prepaid plan INR ${price}`,
            price,
            currency: 'INR',
            validity,
            data,
            totalData: data && !/day/i.test(data) ? data : null,
            voice,
            sms: null,
            benefits,
            ottBenefits: benefits.filter(isOttBenefit),
            networkType: /\b5g\b/i.test(searchable) ? '5G' : null,
            circle,
            rechargeUrl: VI_RECHARGE_URL,
            scrapedAt,
        } satisfies TelecomPlanRecord];
    });
};

export const isBlockedPage = (title: string, body: string): boolean => (
    /access denied|captcha|verify you are human|temporarily blocked|request blocked/i.test(`${title} ${body}`)
);
