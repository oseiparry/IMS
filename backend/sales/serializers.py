from rest_framework import serializers
from .models import Sale, SaleItem
from products.serializers import ProductSerializer


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)

    class Meta:
        model = SaleItem
        fields = [
            'id', 'product', 'product_name', 'product_sku',
            'quantity', 'cost_price', 'selling_price',
            'total_price', 'profit'
        ]


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    cashier_name = serializers.CharField(source='cashier.username', read_only=True)

    class Meta:
        model = Sale
        fields = [
            'id', 'sale_id', 'items', 'total_amount', 'total_cost', 'total_profit',
            'payment_method', 'cashier', 'cashier_name', 'created_at'
        ]
        read_only_fields = ['id', 'sale_id', 'total_amount', 'total_cost', 'total_profit', 'created_at']


class SaleItemCreateSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1)
    


class SaleCreateSerializer(serializers.Serializer):
    items = SaleItemCreateSerializer(many=True)
    payment_method = serializers.ChoiceField(choices=Sale.PAYMENT_METHODS, default='cash')
    cash_received = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError('At least one item is required')
        return value
    
class SaleRecieptSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    cashier_name = serializers.CharField(source='cashier.username', read_only=True)

    class Meta:
        model = Sale
        fields = [
            'sale_id', 'items', 'total_amount', 'payment_method',
            'cashier_name', 'created_at', 'cash_received', 'change_given'
        ]
        read_only_fields = ['sale_id', 'total_amount', 'created_at']