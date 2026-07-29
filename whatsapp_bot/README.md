# NextHop WhatsApp Inbox

A focused restaurant operations inbox for WhatsApp conversations handled by the
NextHop delivery backend. It supports a live queue, bot/manual takeover, message
history, contextual basket and order details, and direct staff replies.

## Requirements

- Node.js 22+
- The NextHop `delivery_api` GraphQL endpoint
- A valid NextHop restaurant account

## Local development

```bash
npm install
copy .env.example .env
npm run dev
```

The app runs at `http://localhost:4174`. Set the API URLs in `.env` when the
frontend and backend do not share an origin:

```env
VITE_GRAPHQL_URL=https://zetahub.co.uk/api/graphql
VITE_GRAPHQL_WS_URL=wss://zetahub.co.uk/api/graphql
```

By default, the Vite development server proxies `/api` requests and WebSocket
connections to `https://zetahub.co.uk`, so a local `.env` is not required when
testing against the deployed backend.

The sign-in form calls the backend `restaurantLogin` mutation and stores only
the returned JWT under `localStorage.nexthop_token`. Passwords are never stored.

To test with an existing restaurant token in the browser console instead:

```js
localStorage.setItem('nexthop_token', 'YOUR_RESTAURANT_JWT')
location.reload()
```

Never commit real JWTs or put them in `.env`.

## Production build

```bash
npm ci
npm run build
```

Serve the generated `dist/` directory with an SPA fallback to `index.html`.
The default GraphQL URLs are same-origin `/api/graphql` over HTTP and WebSocket.

For the existing Zetahub Nginx server, expose it at
`https://zetahub.co.uk/whatsapp/`:

```nginx
location = /whatsapp {
    return 301 /whatsapp/;
}

location /whatsapp/ {
    alias /var/www/Multivendor_delivery/whatsapp_bot/dist/;
    index index.html;
    try_files $uri $uri/ /whatsapp/index.html;
}
```

Then validate and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -I https://zetahub.co.uk/whatsapp/
```

## Realtime fallback

The client uses `graphql-ws` subscriptions. If the subscription transport fails,
the UI switches to polling automatically and displays **Polling mode** in the
top bar. Normal query and mutation operations remain available.

## Authentication

The inbox signs restaurant operators in through the existing GraphQL
`restaurantLogin(username, password)` mutation. The **Sign out** control removes
the local session token immediately.
