from rest_framework import serializers
from .models import MonthlySalesLog

class MonthlySalesLogSerializer(serializers.ModelSerializer):
    month_name = serializers.SerializerMethodField()

    class Meta:
        model = MonthlySalesLog
        fields = [
            'id', 'year', 'month', 'month_name',
            'total_revenue', 'total_profit',
            'total_transactions', 'total_items_sold', 'created_at'
        ]

    def get_month_name(self, obj):
        import calendar
        return calendar.month_name[obj.month]