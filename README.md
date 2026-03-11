# QuickBasket

Next.js 14 grocery quick-commerce storefront using the App Router, React, TailwindCSS, Lucide icons, and a React Context cart.

The app is currently configured to use live WooCommerce product data.

## Current Data Source

The active catalog source is controlled by `CATALOG_SOURCE` in `.env.local`.

Current value:

```env
CATALOG_SOURCE=woocommerce
```

When this is set to `woocommerce`, the app loads products from the WordPress WooCommerce REST API.

## APIs Consumed

### 1. WooCommerce Products API

- Method: `GET`
- Endpoint: `/wp-json/wc/v3/products?status=publish&per_page=100`
- Base URL: `WORDPRESS_URL`
- Full URL today:

```text
https://ecommerce.efoxtechnologies.com/wp-json/wc/v3/products?status=publish&per_page=100
```

- Auth: Basic Auth using:
  - `WC_CONSUMER_KEY`
  - `WC_CONSUMER_SECRET`
- Source file: `lib/woocommerce.ts`
- Entry function: `fetchWooProducts()`

### What this API powers

The single WooCommerce products request is reused across the app:

- Home page product sections
- Category pages
- Product detail pages
- Related products
- Brand filter values
- Diet-type filter values
- Category navigation, derived from live product categories

### 2. Internal OTP Verification API

- Method: `POST`
- Endpoint: `/api/auth/verify-otp`
- Purpose: verifies the master OTP and syncs the signed-in user into WooCommerce as a customer
- Source file: `app/api/auth/verify-otp/route.ts`

### 3. WooCommerce Customers API

- Method: `GET`
- Endpoint: `/wp-json/wc/v3/customers?email={placeholderEmail}`
- Purpose: look up an existing customer using the deterministic placeholder email derived from the phone number

- Method: `POST`
- Endpoint: `/wp-json/wc/v3/customers`
- Purpose: create a new WooCommerce customer after OTP verification

- Method: `PUT`
- Endpoint: `/wp-json/wc/v3/customers/{id}`
- Purpose: update the existing WooCommerce customer when the same phone signs in again

### 4. Internal Checkout API

- Method: `POST`
- Endpoint: `/api/checkout`
- Purpose: validates checkout details, ensures the WooCommerce customer exists, and creates a WooCommerce order with Cash on Delivery
- Source file: `app/api/checkout/route.ts`

### 5. WooCommerce Orders API

- Method: `POST`
- Endpoint: `/wp-json/wc/v3/orders`
- Purpose: create COD orders with billing, shipping, line items, and delivery fee

### 6. Internal Orders API

- Method: `GET`
- Endpoint: `/api/orders?customerId={id}`
- Purpose: surface the signed-in customer’s orders from WooCommerce for the storefront order history
- Source file: `app/api/orders/route.ts`

## API Flow in Code

### External fetch layer

File: `lib/woocommerce.ts`

- `wcFetch(path, init)` builds the WooCommerce REST URL and sends the authenticated request.
- `fetchWooProducts()` fetches the product list and maps the WooCommerce payload into the frontend grocery product shape.
- `mapWooProduct()` normalizes:
  - name
  - category
  - slug
  - stock
  - image
  - weight
  - description
- `findWooCustomerByEmail()` looks up the customer using the generated placeholder email
- `upsertWooCustomer()` creates or updates the Woo customer record
- `createWooOrder()` creates the WooCommerce order
- `fetchWooOrdersForCustomer()` reads WooCommerce orders tied to one customer

### Catalog layer

File: `lib/catalog.ts`

- `loadProducts()` switches between WooCommerce and mock data.
- `getProducts()` filters products by category, brand, diet type, search, and price.
- `getProductBySlug()` resolves product detail pages.
- `getCategories()` derives categories from live WooCommerce product categories when WooCommerce mode is enabled.

### Auth write layer

File: `app/api/auth/verify-otp/route.ts`

- Validates `name`, `phone`, and the master OTP
- Generates a placeholder email in the format `{phone}@quickbasket.local`
- Creates or updates the WooCommerce customer
- Returns the stored customer payload back to the frontend auth context

### Checkout write layer

File: `app/api/checkout/route.ts`

- Validates customer, address, and cart payloads
- Reuses customer upsert so every order is attached to a WooCommerce customer
- Creates the WooCommerce order with `payment_method = cod`
- Saves billing, shipping, item metadata, and delivery fee into the order

### Orders read layer

File: `app/api/orders/route.ts`

- Reads WooCommerce orders for the authenticated customer so the storefront can render an orders list


## Environment Variables Used for API Access

```env
CATALOG_SOURCE=woocommerce
WORDPRESS_URL=https://ecommerce.efoxtechnologies.com/
WC_CONSUMER_KEY=...
WC_CONSUMER_SECRET=...
AUTH_MASTER_OTP=123456
NEXT_PUBLIC_MASTER_OTP=123456
NEXT_PUBLIC_STORE_CURRENCY=INR
NEXT_PUBLIC_STORE_LOCALE=en-IN
```

## Revalidation

WooCommerce requests are cached with Next.js fetch revalidation:

- Revalidate interval: `60` seconds
- Defined in: `lib/woocommerce.ts`

## Image Source Also Used

The app also renders remote product images returned by WooCommerce.

Allowed remote hosts are configured in `next.config.mjs`:

- `images.unsplash.com`
- `ecommerce.efoxtechnologies.com`

This is not a separate API call from frontend code, but it is an external remote asset dependency used by the UI.

## APIs Not Yet Consumed

These WooCommerce APIs are not wired into the app yet:

- Categories endpoint: `/wp-json/wc/v3/products/categories`
- Single-product endpoint: `/wp-json/wc/v3/products/{id}`
- Cart API
- Search API beyond local filtering of the fetched product list

## Current Cart Behavior

The cart stays local until checkout.

- State: React Context
- Persistence: `localStorage`
- Source: `context/CartContext.tsx`
- At checkout, cart line items are written into WooCommerce orders through `app/api/checkout/route.ts`

## Current Auth Behavior

Authentication now creates or updates a WooCommerce customer record after OTP verification.

- Client state: `context/AuthContext.tsx`
- OTP UI: `components/AuthModal.tsx`
- Backend verification route: `app/api/auth/verify-otp/route.ts`
- WooCommerce persistence: `lib/woocommerce.ts`

## Mock Data Fallback

If `CATALOG_SOURCE` is not set to `woocommerce`, the app falls back to local mock data:

- `data/groceryProducts.ts`
- `data/categories.ts`

## Main Files Involved

- `lib/woocommerce.ts`
- `lib/catalog.ts`
- `context/CartContext.tsx`
- `context/AuthContext.tsx`
- `components/AuthModal.tsx`
- `app/api/auth/verify-otp/route.ts`
- `components/CheckoutPageContent.tsx`
- `app/api/checkout/route.ts`
- `app/checkout/page.tsx`
- `components/AccountOrdersPane.tsx`
- `app/account/orders/page.tsx`
- `app/api/orders/route.ts`
- `app/page.tsx`
- `app/category/[slug]/page.tsx`
- `app/product/[slug]/page.tsx`
- `app/cart/page.tsx`
# quickbasket
