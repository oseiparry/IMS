from rest_framework import filters, generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import F,Case,When,Value,BooleanField
from django.shortcuts import get_object_or_404
from django.db import transaction
from products.models import Product
from .models import InventoryLog
from .serializers import (
    InventoryLogSerializer,
    StockAddRemoveSerializer,
    InventorySummarySerializer
)
from rest_framework.pagination import PageNumberPagination


class IsAdminOrStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Allow anyone authenticated to VIEW (GET, HEAD, OPTIONS)
        if request.method in permissions.SAFE_METHODS:
            return True
            
        return request.user.is_admin_user

# -----------------------------
# Inventory List
# -----------------------------
from django.db.models.functions import Coalesce

class InventoryListView(generics.ListAPIView):
    serializer_class = InventorySummarySerializer
    permission_classes = [IsAdminOrStaff]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'sku'] 

    def get_queryset(self):
        return Product.objects.filter(is_active=True).annotate(
            low_stock_status=Case(  # Changed name from is_low_stock to low_stock_status
                When(quantity_in_stock__lte=F('reorder_level'), then=Value(True)),
                default=Value(False),
                output_field=BooleanField(),
            )
        ).order_by('low_stock_status', 'name', 'id')
    


# -----------------------------
# Low Stock
# -----------------------------
class LowStockPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100
    
class LowStockListView(generics.ListAPIView):
    serializer_class = InventorySummarySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = LowStockPagination

    def get_queryset(self):
        return Product.objects.filter(
            is_active=True,
            quantity_in_stock__lte=F('reorder_level')
        ).select_related('category').order_by('quantity_in_stock', 'name')




# -----------------------------
# Add Stock
# -----------------------------
class StockAddView(APIView):
    permission_classes = [IsAdminOrStaff]

    def post(self, request):
        serializer = StockAddRemoveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product = get_object_or_404(Product, id=serializer.validated_data['product_id'])
        quantity = serializer.validated_data['quantity']
        notes = serializer.validated_data.get('notes', '')

        with transaction.atomic():
            prev = product.quantity_in_stock
            product.quantity_in_stock += quantity
            product.save()

            InventoryLog.objects.create(
                product=product,
                change_type='add',
                quantity_change=quantity,
                previous_quantity=prev,
                new_quantity=product.quantity_in_stock,
                notes=notes,
                created_by=request.user
            )

        return Response({'message': 'Stock added', 'new_quantity': product.quantity_in_stock})


# -----------------------------
# Remove Stock
# -----------------------------
class StockRemoveView(APIView):
    permission_classes = [IsAdminOrStaff]

    def post(self, request):
        serializer = StockAddRemoveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product = get_object_or_404(Product, id=serializer.validated_data['product_id'])
        quantity = serializer.validated_data['quantity']

        if product.quantity_in_stock < quantity:
            return Response({'error': 'Insufficient stock'}, status=400)

        with transaction.atomic():
            prev = product.quantity_in_stock
            product.quantity_in_stock -= quantity
            product.save()

            InventoryLog.objects.create(
                product=product,
                change_type='remove',
                quantity_change=-quantity,
                previous_quantity=prev,
                new_quantity=product.quantity_in_stock,
                created_by=request.user
            )

        return Response({'message': 'Stock removed', 'new_quantity': product.quantity_in_stock})

class InventoryLogListView(generics.ListAPIView):
    serializer_class = InventoryLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = InventoryLog.objects.select_related('product', 'created_by').order_by('-created_at')
        product_id = self.request.query_params.get('product')
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        return queryset
    
    