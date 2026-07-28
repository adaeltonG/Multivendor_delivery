# Enatega Delivery API

Apollo Server v5, Express, MongoDB/Mongoose, JWT authentication, and GraphQL
subscriptions for the customer, web, rider, restaurant, and admin applications in
this repository.

## What is implemented

- Customer registration/login, profile, addresses, favourites, menus, checkout,
  order history, reviews, chat, coupons, and live tracking.
- Rider login, availability, GeoJSON location updates, available/assigned orders,
  earnings, withdrawals, chat, and live assignment/location events.
- Restaurant login, availability, order acceptance/cancellation, preparation,
  pickup, notification settings, and live incoming-order events.
- Admin/vendor catalog, restaurant, menu, rider, zone, offer, section, cuisine,
  coupon, banner, taxation, tipping, configuration, dispatch, withdrawal, and
  dashboard operations.
- The GraphQL field and operation names used by all five frontend folders.
- MongoDB `2dsphere` indexes. All points use `[longitude, latitude]`.
- Modern `graphql-transport-ws` subscriptions plus the repository's legacy
  `graphql-ws` protocol during migration.

Third-party delivery is deliberately separated from the core API. WhatsApp Cloud
API transactional notifications are implemented as an optional provider adapter.
Real OTP/email delivery, push notifications, Stripe/PayPal account creation, and
Cloudinary uploads still require provider-specific adapters before production.

## WhatsApp Cloud API

Set `WHATSAPP_VERIFY_TOKEN` first so Meta can verify the callback while
`WHATSAPP_ENABLED=false`. Set `WHATSAPP_ENABLED=true` only after the Meta app,
permanent system-user token, phone-number ID, app secret, verification token,
and approved templates are ready. The public webhook callback is:

```text
https://zetahub.co.uk/webhooks/whatsapp
```

Create these templates in WhatsApp Manager with language `en_GB` (or change
`WHATSAPP_TEMPLATE_LANGUAGE`). Body variables must remain in this order:

- `zetahub_new_order`: restaurant/owner name, order ID, order amount.
- `zetahub_order_status`: customer name, order ID, status, restaurant name.
- `zetahub_rider_assigned`: rider name, order ID, restaurant name, pickup address.

Example template bodies:

```text
New Zetahub order for {{1}}. Order {{2}}, total £{{3}}. Open the restaurant app to respond.
Hi {{1}}, order {{2}} is now {{3}} at {{4}}.
Hi {{1}}, order {{2}} is ready for you at {{3}}. Pickup: {{4}}.
```

The API verifies `X-Hub-Signature-256` on webhook POST requests and immediately
acknowledges valid Meta events. Notification delivery runs asynchronously:
WhatsApp outages are logged but never roll back an order operation.

## Run locally

Requirements: Node.js 20+, npm, and MongoDB 7+.

```powershell
cd delivery_api
Copy-Item .env.example .env
docker compose up -d
npm install
npm run seed
npm run dev
```

The endpoints are:

- GraphQL HTTP: `http://localhost:8001/graphql`
- GraphQL websocket: `ws://localhost:8001/graphql`
- Health: `http://localhost:8001/health`

Use a long random `JWT_SECRET`, change every seed password, and set
`CORS_ORIGINS` to an explicit comma-separated allowlist before deployment.

## Connect the frontends

On a physical phone, replace `localhost` with the computer's LAN IP. The phone
and computer must be on the same network.

Customer app (`enatega-multivendor-app/environment.js`):

```js
GRAPHQL_URL: 'http://192.168.1.10:8001/graphql',
WS_GRAPHQL_URL: 'ws://192.168.1.10:8001/graphql',
SERVER_URL: 'http://192.168.1.10:8001/'
```

Use the same HTTP/websocket values in the rider and restaurant `environment.js`
files. For admin, set `SERVER_URL` to `http://localhost:8001` and
`WS_SERVER_URL` to `ws://localhost:8001`. The web app expects a trailing slash
on both base URLs.

The existing Apollo `WebSocketLink` instances do not currently send their JWT.
Add `connectionParams` wherever a websocket link is created:

```js
const wsLink = new WebSocketLink({
  uri: WS_GRAPHQL_URL,
  options: {
    reconnect: true,
    connectionParams: async () => ({
      authorization: `Bearer ${await loadTheSameTokenUsedByTheHttpLink()}`
    })
  }
})
```

The token loader is app-specific:

- customer: the token used by its HTTP Apollo link
- rider: `AsyncStorage.getItem('rider-token')`
- restaurant: `SecureStore.getItemAsync('token')`
- admin/web: `localStorage.getItem('token')`

The legacy server exists only because these checked-in clients still import
`@apollo/client/link/ws`. New code should use `GraphQLWsLink` from
`@apollo/client/link/subscriptions` and `createClient` from `graphql-ws`.

## Useful commands

```powershell
npm run typecheck
npm run check:frontend-contract
npm test
npm run build
npm run migrate
npm start
```

`npm run seed` is idempotent and creates an admin, vendor, restaurant, rider,
zone, sample menu, coupon, and configuration using `.env` values.
`npm run migrate` is idempotent and normalizes legacy MongoDB documents to the
current GraphQL contract before production traffic is served.

## Production notes

- Apollo Server v5 requires Node.js 20 or newer and GraphQL.js 16.11 or newer.
  The Express 4 middleware is provided by `@as-integrations/express4`.
- `enatega-multivendor-admin/src/apollo/queries.js` contains one pre-existing,
  malformed withdrawal pagination document (`$page: Int` is used as an argument
  value). The compatibility checker reports and skips that frontend syntax error;
  it cannot be corrected from the backend.
- The in-memory subscription event bus is appropriate for one API instance. For
  horizontal scaling, replace `src/graphql/pubsub.ts` with Redis-backed pub/sub.
- Disable the legacy subscription protocol after all clients move to
  `graphql-ws`.
- Build unique indexes before accepting traffic and run MongoDB as a replica set
  if transaction-based workflows are added.
- Put the service behind TLS; use `https://` and `wss://` in production.
