from django.contrib import admin
from .models import Sale, SaleItem


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0
    readonly_fields = ['product', 'quantity', 'cost_price', 'selling_price', 'total_price', 'profit']


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ['sale_id', 'total_amount', 'total_profit', 'payment_method', 'cashier', 'created_at']
    list_filter = ['payment_method', 'created_at']
    search_fields = ['sale_id', 'cashier__username']
    inlines = [SaleItemInline]
    readonly_fields = ['sale_id', 'created_at']


@admin.register(SaleItem)
class SaleItemAdmin(admin.ModelAdmin):
    list_display = ['sale', 'product', 'quantity', 'selling_price', 'total_price', 'profit']
    search_fields = ['sale__sale_id', 'product__name']