import { StoreCollectionFeed, StoreHatchPurchase } from '../types/models';

const DEFAULT_STORE_BASE_URL = 'https://meekycart.com';

const fallbackHatchFeed: StoreCollectionFeed = {
  collection: {
    id: 'fallback-meeky-hatch',
    name: 'Meeky Hatch',
    slug: 'meeky-hatch',
    url: `${DEFAULT_STORE_BASE_URL}/collection/meeky-hatch`,
  },
  items: [
    {
      id: 'fallback-incubator',
      title: 'Shop incubators and hatchers',
      description: 'Browse MeekyCart hatch gear including incubators and hatch accessories.',
      price: 0,
      currency: 'USD',
      imageUrl: null,
      productUrl: `${DEFAULT_STORE_BASE_URL}/collection/meeky-hatch`,
    },
    {
      id: 'fallback-brooder',
      title: 'Find brooders and chick care gear',
      description: 'Continue from hatch into brooding with the right follow-up equipment.',
      price: 0,
      currency: 'USD',
      imageUrl: null,
      productUrl: `${DEFAULT_STORE_BASE_URL}/collection/meeky-hatch`,
    },
  ],
};

export function getMeekyCartBaseUrl() {
  return (process.env.EXPO_PUBLIC_MEEKYCART_BASE_URL || DEFAULT_STORE_BASE_URL).replace(/\/$/, '');
}

export async function fetchStoreCollection(slug: string) {
  const baseUrl = getMeekyCartBaseUrl();
  const response = await fetch(`${baseUrl}/api/store/collection/${slug}`);

  if (!response.ok) {
    throw new Error(`Unable to load ${slug} collection from MeekyCart.`);
  }

  const payload = (await response.json()) as
    | ({ success: true } & StoreCollectionFeed)
    | { success: false; error?: string };

  if (!payload.success) {
    throw new Error(payload.error || `Unable to load ${slug} collection from MeekyCart.`);
  }

  return {
    collection: payload.collection,
    items: payload.items,
  } satisfies StoreCollectionFeed;
}

export async function lookupHatchPurchases(params: { email?: string; phone?: string }) {
  const baseUrl = getMeekyCartBaseUrl();
  const response = await fetch(`${baseUrl}/api/store/hatch-purchases/lookup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Unable to look up MeekyCart hatch purchases.');
  }

  const payload = (await response.json()) as
    | { success: true; purchases: StoreHatchPurchase[] }
    | { success: false; error?: string };

  if (!payload.success) {
    throw new Error(payload.error || 'Unable to look up MeekyCart hatch purchases.');
  }

  return payload.purchases;
}

export function getFallbackHatchCollection() {
  return fallbackHatchFeed;
}
