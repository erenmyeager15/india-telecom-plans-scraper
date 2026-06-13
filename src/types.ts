export type TelecomOperator = 'jio' | 'airtel' | 'vi';

export interface ProxyInput {
    useApifyProxy?: boolean;
    apifyProxyGroups?: string[];
    apifyProxyCountry?: string;
    proxyUrls?: string[];
}

export interface ActorInput {
    operators?: TelecomOperator[];
    categories?: string[];
    minPrice?: number;
    maxPrice?: number;
    maxResults?: number;
    proxyConfiguration?: ProxyInput;
}

export interface RequestData {
    operator: Exclude<TelecomOperator, 'jio'>;
}

export interface TelecomPlanRecord {
    source: TelecomOperator;
    operator: 'Jio' | 'Airtel' | 'Vi';
    planType: 'prepaid';
    position: number;
    category: string | null;
    planId: string | null;
    planName: string;
    price: number;
    currency: 'INR';
    validity: string | null;
    data: string | null;
    totalData: string | null;
    voice: string | null;
    sms: string | null;
    benefits: string[];
    ottBenefits: string[];
    networkType: string | null;
    circle: string | null;
    rechargeUrl: string;
    scrapedAt: string;
}
