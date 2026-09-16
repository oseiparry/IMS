from django.contrib import admin
from .models import MonthlySalesLog

@admin.register(MonthlySalesLog)
class MonthlySalesLogAdmin(admin.ModelAdmin):
    list_display = ['year', 'month', 'total_revenue', 'total_profit', 'total_transactions', 'total_items_sold', 'created_at']
    list_filter = ['year', 'month']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['-year', '-month']