from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone

from products.models import Product
from inventory.models import InventoryLog
from .models import Sale, SaleItem
from .serializers import SaleSerializer, SaleCreateSerializer, SaleRecieptSerializer


class SaleListCreateView(generics.ListCreateAPIView):
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Sale.objects.select_related('cashier').prefetch_related('items')

        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)

        return queryset


class SaleDetailView(generics.RetrieveAPIView):
    serializer_class = SaleSerializer
    queryset = Sale.objects.select_related('cashier').prefetch_related('items')

from rest_framework.pagination import PageNumberPagination

class SalesPagination(PageNumberPagination):
    page_size = 20  # Matches your default 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class SaleListCreateView(generics.ListCreateAPIView):
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = SalesPagination  # Ensures we use 20 per page

    def get_queryset(self):
        # Optimized with select_related and prefetch_related for speed
        queryset = Sale.objects.select_related('cashier').prefetch_related('items__product').order_by('-created_at')

        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)

        return queryset
    
    
class SaleCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SaleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cash_received = serializer.validated_data.get('cash_received', None)

        items_data = serializer.validated_data['items']
        payment_method = serializer.validated_data['payment_method']

        with transaction.atomic():
            sale_items = []
            total_amount = 0
            total_cost = 0

            for item_data in items_data:
                product = Product.objects.get(id=item_data['product_id'], is_active=True)

                if product.quantity_in_stock < item_data['quantity']:
                    return Response(
                        {'error': f'Insufficient stock for {product.name}. Available: {product.quantity_in_stock}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                item_total = product.selling_price * item_data['quantity']
                item_cost = product.cost_price * item_data['quantity']
                total_amount += item_total
                total_cost += item_cost

                previous_qty = product.quantity_in_stock
                product.quantity_in_stock -= item_data['quantity']
                product.save()

                InventoryLog.objects.create(
                    product=product,
                    change_type='sale',
                    quantity_change=-item_data['quantity'],
                    previous_quantity=previous_qty,
                    new_quantity=product.quantity_in_stock,
                    notes=f'Sale transaction',
                    created_by=request.user
                )

                sale_items.append(SaleItem(
                    product=product,
                    quantity=item_data['quantity'],
                    cost_price=product.cost_price,
                    selling_price=product.selling_price
                ))
            change_given = 0
            if payment_method == 'cash' and cash_received :
                change_given = cash_received - total_amount
                
            sale = Sale.objects.create(
                total_amount=total_amount,
                total_cost=total_cost,
                total_profit=total_amount - total_cost,
                payment_method=payment_method,
                cashier=request.user,
                cash_received=cash_received,
                change_given=change_given,
            )

            for item in sale_items:
                item.sale = sale
                item.save()

        return Response(SaleSerializer(sale).data, status=status.HTTP_201_CREATED)


class ReceiptView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, sale_id):
        try:
            sale = Sale.objects.select_related('cashier').prefetch_related('items__product').get(sale_id=sale_id)
        except Sale.DoesNotExist:
            return Response({'error': 'Sale not found'}, status=404)

        items = []
        for item in sale.items.all():
            items.append({
                'product_name': item.product.name,
                'sku': item.product.sku,
                'quantity': item.quantity,
                'unit_price': float(item.selling_price),
                'total_price': float(item.total_price)
            })

        receipt = {
            'sale_id': sale.sale_id,
            'cashier_name': sale.cashier.username if sale.cashier else 'Unknown',
            'items': items,
            'cash_received': float(sale.cash_received or 0),
            'change_given': float(sale.change_given or 0),
            'total_amount': float(sale.total_amount),
            'payment_method': sale.payment_method,
            'created_at': sale.created_at.isoformat()
        }

        return Response(receipt)
    
class SaleReceiptView(generics.RetrieveAPIView):
    serializer_class = SaleRecieptSerializer
    queryset = Sale.objects.select_related('cashier').prefetch_related('items__product')
    lookup_field = 'sale_id'