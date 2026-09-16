# SMH Welfare Inventory & POS Management System - Current Specification

## 1. Project Overview

**Project name:** SMH Welfare Inventory & POS Management System  
**Backend project name:** `retailpos`  
**Frontend package name:** `retail-pos-frontend`  
**Type:** Full-stack web application  
**Primary users:** retail operators, store managers, administrators, and cashiers  

The system manages product catalog data, categories, inventory levels, low-stock alerts, POS sales, receipts, sales history, reporting, and user accounts.

## 2. Architecture

The project is split into:

- Django REST Framework backend in `backend/`
- React/Vite frontend in `frontend/`
- Root-level Python dependency file at `requirements.txt`
- Root-level environment file expected at `.env`

The frontend uses relative API calls under `/api`. During development, Vite proxies `/api` to `http://localhost:8000`.

## 3. Technical Stack

### Backend

- Django 5.2.x
- Django REST Framework 3.16.x
- Simple JWT for authentication
- PostgreSQL via Django database settings
- django-cors-headers
- WhiteNoise static file middleware/storage
- Pillow for image fields

### Frontend

- React 18
- Vite 5
- React Router 6
- Axios
- Recharts
- CSS variables and plain CSS in `frontend/src/styles/index.css`

## 4. Configuration

### Backend database

The backend reads PostgreSQL settings from environment variables:

```env
DB_NAME=...
DB_USER=...
DB_PASSWORD=...
DB_HOST=...
DB_PORT=...
```

### Current development settings

- `DEBUG = True`
- JWT access token lifetime: 6 hours
- JWT refresh token lifetime: 1 day
- JWT refresh rotation is enabled
- REST Framework default pagination: page size 20
- CORS allows all origins
- Static root: `backend/staticfiles`
- Frontend build/static source: `backend/frontend_dist`
- Media root: `backend/media`

## 5. User Roles and Permissions

### Roles

The custom user model supports:

- `super_admin`
- `admin`
- `staff`

Django `is_superuser` is treated as super-admin by model helper properties and several frontend checks.

### Effective role behavior

| Area | Staff | Admin | Super Admin |
|---|---:|---:|---:|
| Login/dashboard | Yes | Yes | Yes |
| POS sales | Yes | Yes | Yes |
| Inventory view | Yes | Yes | Yes |
| Add/remove stock | No | Yes | Yes |
| Sales history | Yes | Yes | Yes |
| Reports navigation | Hidden | Yes | Yes |
| Products navigation | Hidden | Yes | Yes |
| Product writes | No | No | Yes |
| Categories navigation | Hidden | Yes | Yes |
| Category writes | No | No | Yes |
| User management navigation | Hidden | Hidden | Yes |
| User list/create endpoint | No | Yes | Yes |
| Reset another user's password | No | No | Yes |

There is a mismatch to be aware of: the Categories page shows add/edit/delete for `is_admin_user`, but the backend category write permission requires `is_super_admin`.

## 6. Data Models

### `accounts.User`

Extends Django `AbstractUser`.

- `id`: UUID primary key
- `role`: `super_admin`, `admin`, or `staff`
- `phone`
- `address`
- `created_at`
- `updated_at`

Helper properties:

- `is_super_admin`
- `is_admin_user`
- `is_staff_user`

### `accounts.ActivityLog`

- `id`: UUID primary key
- `user`: nullable FK to user
- `action`
- `details`
- `created_at`

Used by login, user management, and password actions.

### `products.Category`

- `id`: UUID primary key
- `name`: unique
- `description`
- `created_at`

Ordered by name.

### `products.Product`

- `id`: UUID primary key
- `name`
- `sku`: unique
- `category`: nullable FK to category
- `cost_price`
- `selling_price`
- `quantity_in_stock`
- `reorder_level`
- `image`
- `is_active`
- `created_at`
- `updated_at`

Computed properties:

- `is_low_stock`: `quantity_in_stock <= reorder_level`
- `profit_margin`

Deletion is implemented as soft-delete by setting `is_active=False`.

### `inventory.InventoryLog`

- `id`: UUID primary key
- `product`
- `change_type`: `add`, `remove`, `sale`, `adjust`
- `quantity_change`
- `previous_quantity`
- `new_quantity`
- `notes`
- `created_by`
- `created_at`

### `sales.Sale`

- `id`: UUID primary key
- `sale_id`: generated unique sale identifier
- `total_amount`
- `total_cost`
- `total_profit`
- `payment_method`: `cash` or `other`
- `cashier`
- `created_at`
- `cash_received`
- `change_given`

Sale IDs are generated in the format:

```text
SAL-YYYYMMDD--<random-number>
```

### `sales.SaleItem`

- `id`: UUID primary key
- `sale`
- `product`
- `quantity`
- `cost_price`
- `selling_price`
- `total_price`
- `profit`

`total_price` and `profit` are calculated on save.

## 7. API Specification

All endpoints are mounted under `/api`.

### Authentication and users

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/login/` | Public | Authenticate username/password and return access token, refresh token, and user object |
| `POST` | `/api/auth/logout/` | Authenticated | Blacklist refresh token when supplied |
| `POST` | `/api/auth/refresh/` | Public token endpoint | Refresh JWT access token |
| `GET` | `/api/auth/me/` | Authenticated | Return current user |
| `GET` | `/api/auth/users/` | Admin+ | List users |
| `POST` | `/api/auth/users/` | Admin+ | Create user |
| `GET` | `/api/auth/users/<uuid:pk>/` | Authenticated in current overridden view | Retrieve user |
| `PUT/PATCH` | `/api/auth/users/<uuid:pk>/` | Authenticated in current overridden view | Update user |
| `DELETE` | `/api/auth/users/<uuid:pk>/` | Intended admin/super-admin | Current implementation should be reviewed |
| `POST` | `/api/auth/users/<uuid:pk>/set-password/` | Super-admin | Set another user's password |
| `POST` | `/api/auth/change-password/` | Authenticated | Change current user's password |
| `GET` | `/api/auth/activity-logs/` | Authenticated | Intended activity log list; serializer is not currently configured |

### Products and categories

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/products/` | Authenticated | Paginated active product list |
| `POST` | `/api/products/` | Super-admin | Create product |
| `GET` | `/api/products/<uuid:pk>/` | Authenticated | Product detail |
| `PUT/PATCH` | `/api/products/<uuid:pk>/` | Super-admin | Update product |
| `DELETE` | `/api/products/<uuid:pk>/` | Super-admin | Soft-delete product |
| `GET` | `/api/products/search/?q=<term>` | Authenticated | Search active in-stock products by name or SKU |
| `GET` | `/api/products/sku/<sku>/` | Authenticated | Lookup active product by SKU |
| `GET` | `/api/products/categories/` | Authenticated | List categories |
| `POST` | `/api/products/categories/` | Super-admin | Create category |
| `GET` | `/api/products/categories/<uuid:pk>/` | Authenticated | Category detail |
| `PUT/PATCH` | `/api/products/categories/<uuid:pk>/` | Super-admin | Update category |
| `DELETE` | `/api/products/categories/<uuid:pk>/` | Super-admin | Delete category |

Product list query parameters:

- `search`: searches name, SKU, and category name
- `ordering`: supports name, selling price, stock quantity, created timestamp
- `category`: filters by category UUID
- `low_stock=true`: filters to low-stock products
- `page`: pagination page

### Inventory

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/inventory/` | Authenticated | Paginated inventory summary |
| `GET` | `/api/inventory/low-stock/` | Authenticated | Paginated low-stock product list |
| `POST` | `/api/inventory/add/` | Admin+ | Add stock and write inventory log |
| `POST` | `/api/inventory/remove/` | Admin+ | Remove stock and write inventory log |
| `GET` | `/api/inventory/logs/` | Authenticated | Paginated stock movement history |

Inventory list supports:

- `search`: product name/SKU search
- `page`: pagination page

Inventory logs support:

- `product`: optional product UUID filter
- `page`: pagination page

Stock add/remove request body:

```json
{
  "product_id": "uuid",
  "quantity": 1,
  "notes": "optional text"
}
```

### Sales

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/sales/` | Authenticated | Paginated sales list |
| `POST` | `/api/sales/create/` | Authenticated | Create sale, sale items, inventory logs, and decrement stock |
| `GET` | `/api/sales/<uuid:pk>/` | Authenticated | Sale detail by internal UUID |
| `GET` | `/api/sales/receipt/<sale_id>/` | Authenticated | Receipt payload by generated sale ID |

Sales list supports:

- `start_date`: inclusive date filter
- `end_date`: inclusive date filter
- `page`: pagination page

Create sale request body:

```json
{
  "items": [
    { "product_id": "uuid", "quantity": 1 }
  ],
  "payment_method": "cash",
  "cash_received": "100.00"
}
```

Current supported `payment_method` values:

- `cash`
- `other`

The current POS UI uses cash checkout.

### Reports

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/reports/dashboard/` | Authenticated | Returns today, yesterday, current week, current month, product count, and low-stock count |
| `GET` | `/api/reports/sales-chart/?period=week` | Authenticated | Last 7 days of revenue/profit/transaction chart data |
| `GET` | `/api/reports/sales-chart/?period=month` | Authenticated | Last 30 days of revenue/profit/transaction chart data |
| `GET` | `/api/reports/top-products/?limit=10` | Authenticated | Top products from last 30 days |
| `GET` | `/api/reports/export-csv/` | Admin permission class | Sales CSV export |
| `GET` | `/api/reports/recent-sales/?limit=5` | Authenticated | Recent sales summary |

CSV export supports:

- `start_date`
- `end_date`

## 8. Frontend Routes and Pages

### `/login`

- Username/password login form
- Show/hide password control
- Caps Lock warning
- Stores access token and user object in `localStorage`

### `/dashboard`

Staff view:

- Today's revenue
- Today's sales count
- Today's items sold
- Open POS action
- Recent sales table

Admin/super-admin view:

- Quick actions
- Today's revenue/profit/products sold
- Low-stock count and low-stock alert table
- Weekly revenue/profit chart
- Recent sales
- Yesterday, weekly, and monthly summaries

### `/products`

- Paginated product table
- Debounced search
- Category loading for product form
- Low-stock row highlighting
- Super-admin-only frontend controls for add/edit/delete

### `/categories`

- Category table with product counts
- Add/edit/delete modal in UI for admin-like users
- Backend write permission currently requires super-admin

### `/inventory`

- Low-stock alert table with pagination
- Inventory summary table with search committed on Enter
- Admin/super-admin stock add/remove modal
- Stock history table with pagination

### `/pos`

- Product grid of active in-stock products
- Search products by name/SKU through `/api/products/search/`
- SKU lookup through `/api/products/sku/<sku>/`
- Cart quantity controls with live stock ceiling checks
- Cash received validation
- Sale creation through `/api/sales/create/`
- Receipt modal and browser print window

### `/sales`

- Paginated sales table
- Date range filters
- Receipt modal
- CSV export through reports endpoint

### `/reports`

- Week/month selector
- Revenue/profit line chart
- Top-selling products table for last 30 days
- Revenue/profit bar chart
- CSV export

### `/users`

- User table
- Create user modal
- Activate/deactivate action
- Super-admin reset-password action
- Client-side password confirmation validation

## 9. UI Specification

### Branding

- Sidebar logo: `SMH WELFARE`
- Login title: `SMH WELFARE MANAGEMENT SYSTEM`
- Header title: `Inventory & POS Management`
- Receipt title: `SMH WELFARE`

### CSS variables

```css
--primary: #1a1a2e;
--secondary: #16213e;
--accent: #0f3460;
--highlight: #e94560;
--success: #00d9a5;
--warning: #ffc107;
--danger: #dc3545;
--bg: #f8f9fa;
--surface: #ffffff;
--text: #1a1a2e;
--text-secondary: #6c757d;
--border: #dee2e6;
```

### Layout

- Fixed sidebar: 240px desktop
- Main content offset by sidebar
- Cards, tables, forms, modals, alert styles, and POS grid are implemented in plain CSS
- At widths below 1024px, sidebar compresses to 60px and POS stacks
- At widths below 768px, stat cards become single-column and header stacks

## 10. Important Current Implementation Notes

These are part of the current project state and should be resolved or accounted for during future development:

1. `backend/accounts/views.py` defines `UserDetailView` twice. The second class overrides the first at import time.
2. The second `UserDetailView.get_permissions()` returns `permissions.IsAdminUser()`, but DRF does not provide `IsAdminUser` in `rest_framework.permissions`. If that branch is hit, it may fail.
3. `UserSerializer` includes `must_change_password`, but the current `User` model does not define that field.
4. `ChangePasswordView` sets `request.user.must_change_password = False`, but the field is not present on the current model.
5. `ActivityLogView` has `serializer_class = None`, so the endpoint is incomplete.
6. `backend/requirements.txt` is empty; root `requirements.txt` is the dependency source.
7. The current backend settings file contains development-only values and should be hardened before deployment.
8. `backend/retailpos/urls.py` currently does not enable the catch-all route for serving the React SPA from Django; the catch-all lines are commented out.

## 11. Acceptance Criteria Reflected by Current Code

- Users can log in with username/password.
- Authenticated frontend routes are protected.
- JWT access tokens are attached to API requests.
- Products can be listed and searched.
- Super-admin can create, update, and soft-delete products.
- Categories can be listed and managed through backend endpoints by super-admin.
- Inventory shows stock levels, low-stock state, and movement history.
- Admin/super-admin can add and remove stock.
- POS can search products, add items to cart, validate cash received, create sales, and show receipts.
- Creating a sale reduces inventory and writes inventory logs.
- Sales history supports date filtering, pagination, receipt viewing, and CSV export.
- Reports show chart data, top products, and export support.
- User management supports creating users, status toggling, and super-admin password reset.

## 12. Suggested Next Improvements

- Fix the duplicated `UserDetailView` and permission logic.
- Remove or restore `must_change_password` consistently across model, migrations, serializers, and views.
- Add a serializer for `ActivityLogView`.
- Move `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, and CORS settings to environment-based production-safe configuration.
- Decide whether admins or only super-admins should manage categories, then align frontend checks and backend permissions.
- Decide whether sales/report exports should be staff-visible or admin-only, then align UI and API permissions.
- Add automated backend tests for permissions, sale creation, stock adjustments, and receipts.
- Add frontend route guards for role-specific pages, not only sidebar hiding.
