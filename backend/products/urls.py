from django.urls import path
from .views import (
    CategoryListCreateView, CategoryDetailView,
    ProductListCreateView, ProductDetailView,
    ProductSearchView, ProductBySkuView
)

urlpatterns = [
    # Categories
    path('categories/', CategoryListCreateView.as_view(), name='category_list'),
    path('categories/<uuid:pk>/', CategoryDetailView.as_view(), name='category_detail'),

    # Products
    path('', ProductListCreateView.as_view(), name='product_list'),
    path('<uuid:pk>/', ProductDetailView.as_view(), name='product_detail'),
    path('search/', ProductSearchView.as_view(), name='product_search'),
    path('sku/<str:sku>/', ProductBySkuView.as_view(), name='product_by_sku'),
]