from django.contrib import admin
from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'created_at']
    search_fields = ['name', 'description']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'sku', 'category', 'cost_price', 'selling_price', 'quantity_in_stock', 'is_active']
    list_filter = ['category', 'is_active']
    search_fields = ['name', 'sku']
    list_editable = ['quantity_in_stock', 'is_active']
    readonly_fields = ['created_at', 'updated_at']