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
