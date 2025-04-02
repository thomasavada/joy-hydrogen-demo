# Hydrogen template: Skeleton

Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dovetail with [Remix](https://remix.run/), Shopify’s full stack web framework. This template contains a **minimal setup** of components, queries and tooling to get started with Hydrogen.

[Check out Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen)
[Get familiar with Remix](https://remix.run/docs/en/v1)

## What's included

- Remix
- Hydrogen
- Oxygen
- Vite
- Shopify CLI
- ESLint
- Prettier
- GraphQL generator
- TypeScript and JavaScript flavors
- Minimal setup of components and routes

## Getting started

**Requirements:**

- Node.js version 18.0.0 or higher

```bash
npm create @shopify/hydrogen@latest
```

## Building for production

```bash
npm run build
```

## Local development

```bash
npm run dev
```

## Setup for using Customer Account API (`/account` section)

Follow step 1 and 2 of <https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#step-1-set-up-a-public-domain-for-local-development>

## Installation joy-hydrogen-sdk

```bash
npm install joyso-hydrogen-sdk
# or
yarn add joyso-hydrogen-sdk
```

## Implementation 

### 1. Load Joy Loyalty Data

In your `app/root.jsx` or `app/layout.jsx` loader:

```jsx
import {getJoyConfigData} from 'joyso-hydrogen-sdk';
import {HEADER_QUERY} from '~/lib/fragments';

/**
 * Load critical data for the page
 */
async function loadCriticalData({context}) {
  const {storefront, session} = context;

  // Load both header and Joy data in parallel
  const [header, joyData] = await Promise.all([
    storefront.query(HEADER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        headerMenuHandle: 'main-menu',
      },
    }),
    getJoyConfigData({storefront, session, shopId: 'JOY_APP_ID'})
  ]);

  return {
    header,
    ...joyData,
  };
}

export async function loader({context}) {
  const criticalData = await loadCriticalData({context});

  return {
    ...criticalData,
    // ... other loader data
  };
}
```

### 2. Initialize Joy Loyalty in Root Layout

In your `app/root.jsx` or `app/layout.jsx`:

```jsx
import {useJoyLoyalty} from 'joyso-hydrogen-sdk';

export default function App() {
  const data = useLoaderData();

  useJoyLoyalty(data);

  return <Outlet />;
}
```

### 3. Add CSP whitelist

Update your entry.server.jsx to include the CSP whitelist for Joy Loyalty:

```jsx

import {RemixServer} from '@remix-run/react';
import {isbot} from 'isbot';
import {renderToReadableStream} from 'react-dom/server';
import {createContentSecurityPolicy} from '@shopify/hydrogen';

/**
 * @param {Request} request
 * @param {number} responseStatusCode
 * @param {Headers} responseHeaders
 * @param {EntryContext} remixContext
 * @param {AppLoadContext} context
 */
export default async function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  remixContext,
  context, // Prefix with _ to indicate it's intentionally unused
) {
  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    shop: {
      checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
      storeDomain: context.env.PUBLIC_STORE_DOMAIN,
    },
    scriptSrc: [
      'self',
      'https://cdn.shopify.com',
      'https://shopify.com',
      'https://www.google-analytics.com',
      'https://www.googletagmanager.com',
      'https://*.joy.avada.io',
      'https://joy.avada.io',
      'https://geoip.apps.getjoy.ai',
      ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:*'] : []),
    ],
    connectSrc: [
      'self',
      'https://cdn.shopify.com',
      'https://shop.app',
      'https://*.joy.avada.io',
      'https://joy.avada.io',
      'https://monorail-edge.shopifysvc.com',
      'https://geoip.apps.getjoy.ai',
      'https://thomas-shopify-production-36.myshopify.com',
      'ws://127.0.0.1:*',
      'ws://localhost:*',
      'ws://*:*',
    ],
    styleSrc: [
      'self',
      'unsafe-inline',
      'https://cdn.shopify.com',
      'https://cdn.builder.io',
      'https://fonts.bunny.net',
      'https://*.joy.avada.io',
    ],
    imgSrc: [
      'self',
      'data:',
      'https://cdn.shopify.com',
      'https://*.joy.avada.io',
      'https://cdnapps.avada.io',
    ],
    frameSrc: [
      'self',
      'https://cdn.shopify.com',
      'https://shop.app',
      'https://*.joy.avada.io',
      'https://geoip.apps.getjoy.ai',
    ],
    fontSrc: ['self', 'https://fonts.bunny.net', 'data:', 'https://*.joy.avada.io'],
    mediaSrc: ['self'],
    objectSrc: ['none'],
    defaultSrc: ['self', 'https://*.joy.avada.io', 'https://joy.avada.io'],
  });

  const body = await renderToReadableStream(
    <NonceProvider>
      <RemixServer context={remixContext} url={request.url} nonce={nonce} />
    </NonceProvider>,
    {
      nonce,
      signal: request.signal,
      onError(error) {
        console.error(error);
        responseStatusCode = 500;
      },
    },
  );

  if (isbot(request.headers.get('user-agent'))) {
    await body.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html');
  responseHeaders.set('Content-Security-Policy', header);

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}

/** @typedef {import('@shopify/remix-oxygen').EntryContext} EntryContext */
/** @typedef {import('@shopify/remix-oxygen').AppLoadContext} AppLoadContext */


```

After this, you should be able to see the Joy Loyalty widget in your storefront. Besides, the quickstart template of
Hydrogen has `box-sizing: content-box` so the floating button may look a bit weird. You can add this CSS to `app.
css` to fix it. Otherwise, there should be no CSS issues.

```css

*,
*::before,
*::after {
  box-sizing: inherit;
}

html {
  box-sizing: border-box;
  height: 100%;
}

```

### 3. Point Calculator

#### GraphQL Query and Loader

First, update your product page loader and query:

```jsx
// app/routes/products.$handle.jsx
import {AnalyticsPageType} from '@shopify/hydrogen';

async function loadCriticalData({context, params, request}) {
  const {handle} = params;
  const {storefront} = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const [{product}] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {handle, selectedOptions: getSelectedProductOptions(request)},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  return {
    product,
    // We need this to detect the page type
    analytics: {
      pageType: AnalyticsPageType.product,
    },
  };
}

const PRODUCT_QUERY = `#graphql
  query Product($handle: String!, $selectedOptions: [SelectedOptionInput!]!) {
    product(handle: $handle) {
      id
      title
      handle
      productType
      tags

      selectedVariant: selectedOrFirstAvailableVariant {
        id
        price {
          amount
        }
        compareAtPrice {
          amount
        }
        selectedOptions {
          name
          value
        }
      }

      # Need to add this if have not had it in the query
      collections(first: 100) {
        nodes {
          title
        }
      }

      # Need to add this if have not had it in the query
      variants(first: 250) {
        nodes {
          ...ProductVariant
          selectedOptions {
            name
            value
          }
          # Required for limitations
          limitation: metafield(namespace: "custom", key: "limitation") {
            value
          }
        }
      }
    }
  }
`;

```

#### Component Implementation

In your product page (e.g., `app/routes/products.$handle.jsx`):

```jsx
import {useJoyLoyaltyCalculator} from 'joyso-hydrogen-sdk';

export default function Product() {
  // 1. Get product data from loader
  const {product, analytics} = useLoaderData();

  // 2. Initialize the calculator
  useJoyLoyaltyCalculator({
    product,
    analytics,
  });

  // 3. Render product details with calculator
  return (
    <div className="product">
      <ProductImage image={selectedVariant?.image} />
      <div className="product-main">
        <h1>{title}</h1>
        <ProductPrice
          price={selectedVariant?.price}
          compareAtPrice={selectedVariant?.compareAtPrice}
        />
        <br />
        {/* Add the calculator block */}
        <div className="joy-points-calculator__block"></div>
        <br />
        <ProductForm
          productOptions={productOptions}
          selectedVariant={selectedVariant}
        />
      </div>
    </div>
  );
}
```

## API Reference

### Hooks

#### `useJoyLoyalty(options)`

Initializes Joy Loyalty in your app.

#### `useJoyLoyaltyCalculator(options)`

Calculates points for products.

Options:

- `product`: Product data
- `analytics`: Analytics data with page type

### Utilities

#### `getJoyConfigData(options)`

Loads Joy Loyalty configuration data.

Options:

- `storefront`: Shopify storefront client
- `session`: Current session

## Requirements

- Shopify Hydrogen >=2023.1.0
- React >=18.0.0

## License

MIT © Avada
