from django.contrib import admin
from .models import InventoryLog


@admin.register(InventoryLog)
class InventoryLogAdmin(admin.ModelAdmin):
    list_display = ['product', 'change_type', 'quantity_change', 'previous_quantity', 'new_quantity', 'created_by', 'created_at']
    list_filter = ['change_type', 'created_at']
    search_fields = ['product__name', 'product__sku']
    readonly_fields = ['id', 'created_at']