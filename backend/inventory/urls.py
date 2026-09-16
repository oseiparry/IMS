from django.urls import path
from .views import (
    InventoryListView, LowStockListView,
    StockAddView, StockRemoveView,
    InventoryLogListView
)

urlpatterns = [
    path('', InventoryListView.as_view(), name='inventory_list'),
    path('low-stock/', LowStockListView.as_view(), name='low_stock'),
    path('add/', StockAddView.as_view(), name='stock_add'),
    path('remove/', StockRemoveView.as_view(), name='stock_remove'),
    path('logs/', InventoryLogListView.as_view(), name='inventory_logs'),
]