from rest_framework import serializers
from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    products_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'products_count', 'created_at']

    def get_products_count(self, obj):
        return obj.products.filter(is_active=True).count()


class CategoryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['name', 'description']


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    profit_margin = serializers.FloatField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'sku', 'category', 'category_name',
            'cost_price', 'selling_price',
            'quantity_in_stock', 'reorder_level',
            'image', 'is_active',
            'is_low_stock', 'profit_margin',
            'created_at', 'updated_at'
        ]


class ProductCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            'name', 'sku', 'category', 'cost_price', 'selling_price',
            'quantity_in_stock', 'reorder_level', 'image'
        ]

    def validate_sku(self, value):
        if Product.objects.filter(sku=value, is_active=True).exists():
            raise serializers.ValidationError('SKU already exists')
        return value

    def validate(self, attrs):
        if attrs['cost_price'] >= attrs['selling_price']:
            raise serializers.ValidationError('Selling price must be greater than cost price')
        return attrs


class ProductUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            'name', 'sku', 'category', 'cost_price', 'selling_price',
            'quantity_in_stock', 'reorder_level', 'image', 'is_active'
        ]