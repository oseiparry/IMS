from rest_framework import serializers
from products.models import Product
from .models import InventoryLog


class InventoryLogSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = InventoryLog
        fields = '__all__'


class StockAddRemoveSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_product_id(self, value):
        if not Product.objects.filter(id=value).exists():
            raise serializers.ValidationError('Product not found')
        return value


class InventorySummarySerializer(serializers.ModelSerializer):
    product_id = serializers.UUIDField(source='id')
    product_name = serializers.CharField(source='name')
    product_sku = serializers.CharField(source='sku')
    category_name = serializers.CharField(source='category.name', allow_null=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'product_id', 'product_name', 'product_sku',
            'category_name', 'quantity_in_stock',
            'reorder_level', 'is_low_stock',
            'cost_price', 'selling_price'
        ]