# SMH Welfare Inventory & POS Management System

A full-stack inventory and point-of-sale system for managing products, categories, stock movement, sales, receipts, users, and sales reports.

The application is built with a Django REST Framework API and a React/Vite frontend. The current UI branding is **SMH WELFARE MANAGEMENT SYSTEM**.

## Current Features

- JWT-based login with protected frontend routes.
- Role-aware navigation and permissions for `super_admin`, `admin`, and `staff`.
- Product catalog with SKU, category, cost price, selling price, stock quantity, reorder level, image field, and active/inactive status.
- Category management with product counts.
- Inventory dashboard with stock search, low-stock alerts, stock add/remove actions, and stock history.
- POS workflow with product search, SKU lookup/scanning, cart management, cash checkout, change calculation, and printable receipts.
- Sales history with date filters, pagination, receipt viewing, and CSV export.
- Dashboard summaries for today, yesterday, current week, and current month.
- Reports with revenue/profit charts, top-selling products, and CSV export.
- User management with create user, activate/deactivate, role assignment, and super-admin password reset.

## Tech Stack

### Backend

- Python
- Django 5.2.x
- Django REST Framework
- djangorestframework-simplejwt
- PostgreSQL
- django-cors-headers
- WhiteNoise for static file serving
- Pillow for product image support

### Frontend

- React 18
- Vite 5
- React Router 6
- Axios
- Recharts
- react-to-print dependency is installed, though receipt printing is currently handled with a browser print window.

## Project Structure

```text
IMS-main/
├── README.md
├── SPEC.md
├── requirements.txt
├── backend/
│   ├── manage.py
│   ├── retailpos/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── accounts/
│   ├── products/
│   ├── inventory/
│   ├── sales/
│   ├── reports/
│   ├── frontend_dist/
│   └── staticfiles/
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── components/
        ├── context/
        ├── pages/
        ├── services/
        └── styles/
```

Generated/vendor directories such as `frontend/node_modules`, `frontend/dist`, `backend/staticfiles`, `backend/frontend_dist`, and Python `__pycache__` directories are not part of the maintained source.

## Environment Variables

The backend is currently configured for PostgreSQL through environment variables loaded from `.env` at the project root.

Create or update `.env` with:

```env
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_HOST=localhost
DB_PORT=5432
```

The current settings file also contains development defaults:

- `DEBUG = True`
- allowed hosts include `localhost`, `127.0.0.1`, and `10.251.215.30`
- `CORS_ALLOW_ALL_ORIGINS = True`

Tighten these before production deployment.

## Backend Setup

From the project root:

```bash
python -m venv venv
```

Activate the virtual environment:

```bash
# Windows PowerShell
.\venv\Scripts\Activate.ps1

# Windows cmd
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run migrations:

```bash
cd backend
python manage.py migrate
```

Create an initial superuser:

```bash
python manage.py createsuperuser
```

Run the API server:

```bash
python manage.py runserver
```

The backend runs at `http://localhost:8000` by default.

## Frontend Setup

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

Vite proxies `/api/*` requests to `http://localhost:8000`, so the frontend can call API paths such as `/api/auth/login/`.

## Build Frontend

```bash
cd frontend
npm run build
```

The Django project is configured to serve a built frontend from `backend/frontend_dist` and collect static files into `backend/staticfiles`. If deploying through Django, copy or configure the Vite build output accordingly before running `collectstatic`.

## Frontend Routes

All routes except `/login` require authentication.

| Route | Page | Notes |
|---|---|---|
| `/login` | Login | Username/password login, show-password toggle, Caps Lock warning |
| `/dashboard` | Dashboard | Summary stats, charts, recent sales, low-stock alerts |
| `/products` | Products | Hidden from staff navigation; write actions are super-admin only |
| `/categories` | Categories | Hidden from staff navigation; backend writes require super-admin |
| `/inventory` | Inventory | Stock list, low-stock list, stock history; admin+ can add/remove stock |
| `/pos` | POS | Product search, SKU lookup, cash checkout, receipt modal |
| `/sales` | Sales History | Date filters, pagination, receipt viewing, CSV export |
| `/reports` | Reports | Hidden from staff navigation; charts, top products, CSV export |
| `/users` | Users | Super-admin navigation item; user page also allows admin access in component logic |

## API Endpoints

All API routes are mounted under `/api/`.

### Authentication and Users

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/auth/login/` | Login and receive access/refresh JWTs |
| `POST` | `/api/auth/logout/` | Logout; blacklists refresh token when provided |
| `POST` | `/api/auth/refresh/` | Refresh JWT access token |
| `GET` | `/api/auth/me/` | Current authenticated user |
| `GET` | `/api/auth/users/` | List users; admin permission |
| `POST` | `/api/auth/users/` | Create user; admin permission |
| `GET` | `/api/auth/users/<uuid>/` | Retrieve user |
| `PUT/PATCH` | `/api/auth/users/<uuid>/` | Update user |
| `DELETE` | `/api/auth/users/<uuid>/` | Delete/deactivate behavior depends on active view implementation |
| `POST` | `/api/auth/users/<uuid>/set-password/` | Super-admin sets another user's password |
| `POST` | `/api/auth/change-password/` | Current user changes password |
| `GET` | `/api/auth/activity-logs/` | Latest activity logs endpoint is present but serializer is not currently implemented |

### Products and Categories

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/products/` | Paginated active product list; supports `search`, `ordering`, `category`, `low_stock=true` |
| `POST` | `/api/products/` | Create product; super-admin write permission |
| `GET` | `/api/products/<uuid>/` | Product detail |
| `PUT/PATCH` | `/api/products/<uuid>/` | Update product; super-admin write permission |
| `DELETE` | `/api/products/<uuid>/` | Soft-delete product by setting `is_active=False`; super-admin write permission |
| `GET` | `/api/products/search/?q=<term>` | POS product search, returns in-stock active matches |
| `GET` | `/api/products/sku/<sku>/` | Lookup product by SKU |
| `GET` | `/api/products/categories/` | Category list |
| `POST` | `/api/products/categories/` | Create category; super-admin write permission |
| `GET` | `/api/products/categories/<uuid>/` | Category detail |
| `PUT/PATCH` | `/api/products/categories/<uuid>/` | Update category; super-admin write permission |
| `DELETE` | `/api/products/categories/<uuid>/` | Delete category; super-admin write permission |

### Inventory

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/inventory/` | Paginated inventory summary; supports `search` by product name/SKU |
| `GET` | `/api/inventory/low-stock/` | Paginated low-stock products |
| `POST` | `/api/inventory/add/` | Add stock; admin+ |
| `POST` | `/api/inventory/remove/` | Remove stock; admin+ |
| `GET` | `/api/inventory/logs/` | Paginated inventory movement history; optional `product=<uuid>` |

### Sales

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/sales/` | Paginated sales list; supports `start_date` and `end_date` |
| `POST` | `/api/sales/create/` | Create a sale, reduce stock, and create inventory logs |
| `GET` | `/api/sales/<uuid>/` | Sale detail by internal UUID |
| `GET` | `/api/sales/receipt/<sale_id>/` | Receipt payload by sale ID |

### Reports

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/reports/dashboard/` | Today, yesterday, week, month, product, and low-stock stats |
| `GET` | `/api/reports/sales-chart/?period=week\|month` | Sales chart data for 7 or 30 days |
| `GET` | `/api/reports/top-products/?limit=10` | Top products from the last 30 days |
| `GET` | `/api/reports/export-csv/` | Export sales CSV; admin permission |
| `GET` | `/api/reports/recent-sales/?limit=5` | Recent sales summary |

## User Roles

| Role | Current Behavior |
|---|---|
| `super_admin` | Fullest role. Product/category writes, user navigation, password reset endpoint, reports, inventory, POS, sales. Django `is_superuser` is also treated as super-admin in several places. |
| `admin` | Inventory stock add/remove, users page access in component logic, sales/POS/reports access. Product/category write endpoints are stricter and require super-admin. |
| `staff` | Dashboard, POS, inventory read access, and sales access. Products, categories, reports, and users are hidden from navigation. |

## Data Model Summary

- `accounts.User`: UUID primary key, username/email/name fields from Django, role, phone, address, timestamps.
- `accounts.ActivityLog`: user action history for login, user creation/update, password changes, and similar events.
- `products.Category`: UUID, name, description, created timestamp.
- `products.Product`: UUID, name, SKU, category, cost/selling prices, stock quantity, reorder level, image, active flag, timestamps.
- `inventory.InventoryLog`: product, change type, quantity change, previous/new quantities, notes, user, timestamp.
- `sales.Sale`: UUID, generated `sale_id`, totals, profit, payment method, cashier, cash received, change given, timestamp.
- `sales.SaleItem`: sale line items with product, quantity, cost/selling price, total price, and profit.

## Notes and Known Implementation Details

- Payment methods currently defined by the backend are `cash` and `other`; the UI currently exposes cash checkout.
- Sale IDs are generated as `SAL-YYYYMMDD--<random-number>`.
- `backend/accounts/views.py` defines `UserDetailView` twice; the later definition overrides the earlier one in Python. This affects the exact behavior of retrieve/update/delete permissions and should be reviewed before relying on delete/deactivate semantics.
- `UserSerializer` includes `must_change_password`, but the current `User` model no longer defines that field. If this endpoint errors in runtime, remove the serializer field or restore the model field.
- `ActivityLogView` has `serializer_class = None`, so the activity logs endpoint is not currently production-ready.
- `backend/requirements.txt` is empty; the root `requirements.txt` is the active Python dependency file.

## License

No license file is currently present. Add one before distributing the project.
