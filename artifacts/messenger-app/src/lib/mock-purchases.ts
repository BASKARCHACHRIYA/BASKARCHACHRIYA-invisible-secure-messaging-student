/**
 * A browser-only mock of the small RevenueCat Purchases surface used by the
 * Premium demo. This intentionally does not import or contact RevenueCat.
 */
export type PurchasesConfiguration = {
  apiKey: string;
  appUserID?: string;
};

export type PurchasePackage = {
  identifier: string;
  product: {
    identifier: string;
    title: string;
    description: string;
    price: number;
    priceString: string;
    currencyCode: string;
  };
};

export type CustomerInfo = {
  entitlements: {
    active: Record<string, {
      identifier: string;
      productIdentifier: string;
      expirationDate: string | null;
    }>;
  };
  activeSubscriptions: string[];
};

export type Offering = {
  identifier: string;
  availablePackages: PurchasePackage[];
};

const storagePrefix = 'messenger-mock-revenuecat-v1:';

const demoMonthlyPackage: PurchasePackage = {
  identifier: '$rc_monthly',
  product: {
    identifier: 'messenger_premium_monthly_demo',
    title: 'Messenger Premium',
    description: 'Monthly demo subscription',
    price: 4.99,
    priceString: '$4.99',
    currencyCode: 'USD',
  },
};

const demoOffering: Offering = {
  identifier: 'messenger_demo_default',
  availablePackages: [demoMonthlyPackage],
};

let configured = false;
let currentAppUserID = 'local-browser';

function requireConfiguration() {
  if (!configured) {
    throw new Error('Mock Purchases must be configured before use.');
  }
}

function customerStorageKey() {
  return `${storagePrefix}${encodeURIComponent(currentAppUserID)}`;
}

function readCustomerInfo(): CustomerInfo {
  try {
    const saved = localStorage.getItem(customerStorageKey());
    if (saved) {
      const parsed = JSON.parse(saved) as CustomerInfo;
      if (parsed?.entitlements?.active && Array.isArray(parsed.activeSubscriptions)) {
        return parsed;
      }
    }
  } catch {
    // A damaged demo entitlement is treated as a new, non-premium session.
  }

  return { entitlements: { active: {} }, activeSubscriptions: [] };
}

function saveCustomerInfo(info: CustomerInfo) {
  localStorage.setItem(customerStorageKey(), JSON.stringify(info));
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

export const Purchases = {
  configure(configuration: PurchasesConfiguration) {
    if (!configuration.apiKey.trim()) {
      throw new Error('A mock Purchases configuration key is required.');
    }
    currentAppUserID = configuration.appUserID || 'local-browser';
    configured = true;
  },

  async getOfferings(): Promise<{ current: Offering | null; all: Record<string, Offering> }> {
    requireConfiguration();
    return { current: demoOffering, all: { [demoOffering.identifier]: demoOffering } };
  },

  async getCustomerInfo(): Promise<CustomerInfo> {
    requireConfiguration();
    return readCustomerInfo();
  },

  async purchasePackage(packageToPurchase: PurchasePackage): Promise<CustomerInfo> {
    requireConfiguration();
    await delay(700);
    const info: CustomerInfo = {
      entitlements: {
        active: {
          premium: {
            identifier: 'premium',
            productIdentifier: packageToPurchase.product.identifier,
            expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
      },
      activeSubscriptions: [packageToPurchase.product.identifier],
    };
    saveCustomerInfo(info);
    return info;
  },

  async restorePurchases(): Promise<CustomerInfo> {
    requireConfiguration();
    await delay(350);
    return readCustomerInfo();
  },
};