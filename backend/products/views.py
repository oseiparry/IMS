from rest_framework import generics, permissions, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q, F
from .models import Category, Product
from .serializers import (
    CategorySerializer, CategoryCreateSerializer,
    ProductSerializer, ProductCreateSerializer, ProductUpdateSerializer
)


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and request.user.is_admin_user

class IsSuperAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and request.user.is_super_admin


# -----------------------------
# Category Views
# -----------------------------
class CategoryListCreateView(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    permission_classes = [IsSuperAdminOrReadOnly]


    def get_serializer_class(self):
        return CategoryCreateSerializer if self.request.method == 'POST' else CategorySerializer


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Category.objects.all()
    permission_classes = [IsSuperAdminOrReadOnly]

    def get_serializer_class(self):
        return CategoryCreateSerializer if self.request.method in ['PUT', 'PATCH'] else CategorySerializer


# -----------------------------
# Product Views
# -----------------------------
class ProductListCreateView(generics.ListCreateAPIView):
    queryset = Product.objects.filter(is_active=True)
    permission_classes = [IsSuperAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'sku', 'category__name']
    ordering_fields = ['name', 'selling_price', 'quantity_in_stock', 'created_at']

    def get_serializer_class(self):
        return ProductCreateSerializer if self.request.method == 'POST' else ProductSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category_id=category)

        low_stock = self.request.query_params.get('low_stock')
        if low_stock == 'true':
            queryset = queryset.filter(quantity_in_stock__lte=F('reorder_level'))

        return queryset


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.all()
    permission_classes = [IsSuperAdminOrReadOnly]

    def get_serializer_class(self):
        return ProductUpdateSerializer if self.request.method in ['PUT', 'PATCH'] else ProductSerializer

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()


class ProductSearchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '')
        if len(query) < 2:
            return Response([])

        products = Product.objects.filter(
            Q(name__icontains=query) | Q(sku__icontains=query),
            is_active=True,
            quantity_in_stock__gt=0
        )[:20]

        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)

class ProductBySkuView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, sku):
        try:
            product = Product.objects.get(sku=sku, is_active=True)
            serializer = ProductSerializer(product)
            return Response(serializer.data)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=404)