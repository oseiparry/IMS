from django.urls import path
from .views import (
    DashboardStatsView, MonthlySalesLogView, SalesChartView, TopProductsView,
    SalesExportCSVView, RecentSalesView
)

urlpatterns = [
    path('dashboard/', DashboardStatsView.as_view(), name='dashboard_stats'),
    path('sales-chart/', SalesChartView.as_view(), name='sales_chart'),
    path('top-products/', TopProductsView.as_view(), name='top_products'),
    path('export-csv/', SalesExportCSVView.as_view(), name='export_csv'),
    path('recent-sales/', RecentSalesView.as_view(), name='recent_sales'),
    path('monthly-sales-log/', MonthlySalesLogView.as_view(), name='monthly_sales_log'),
]