import calendar
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, F
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta
import csv
from django.http import HttpResponse
from products.models import Product
from sales.models import Sale, SaleItem
from .models import MonthlySalesLog
from .serializers import MonthlySalesLogSerializer
from sales.serializers import SaleSerializer


# Helper function to auto-generate/seal closed monthly summaries
def generate_or_update_monthly_log(year, month):
    _, last_day = calendar.monthrange(year, month)
    start_date = timezone.make_aware(timezone.datetime(year, month, 1, 0, 0, 0))
    end_date = timezone.make_aware(timezone.datetime(year, month, last_day, 23, 59, 59))

    sales = Sale.objects.filter(created_at__range=[start_date, end_date])
    stats = sales.aggregate(
        rev=Sum('total_amount'),
        prof=Sum('total_profit'),
        trans=Count('id')
    )
    items = SaleItem.objects.filter(sale__in=sales).aggregate(qty=Sum('quantity'))

    log, created = MonthlySalesLog.objects.update_or_create(
        year=year,
        month=month,
        defaults={
            'total_revenue': stats['rev'] or 0.00,
            'total_profit': stats['prof'] or 0.00,
            'total_transactions': stats['trans'] or 0,
            'total_items_sold': items['qty'] or 0
        }
    )
    return log

class IsAdminOrStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_admin_user

#class RecentSalesView(generics.ListAPIView):
    #queryset = Sale.objects.all().order_by('-created_at')[:5]
    #serializer_class = SaleSerializer
    #pagination_class = None 
    
class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]


    def get(self, request):
        now = timezone.now()
        today_date = now.date()
        
        # 1. Today's Range
        today_start = timezone.make_aware(timezone.datetime.combine(today_date, timezone.datetime.min.time()))
        
        # 2. Yesterday's Range
        yesterday_date = today_date - timedelta(days=1)
        yesterday_start = timezone.make_aware(timezone.datetime.combine(yesterday_date, timezone.datetime.min.time()))
        
        # 3. Calendar Week (Starts Monday)
        # weekday() returns 0 for Monday, 6 for Sunday
        start_of_week = today_date - timedelta(days=today_date.weekday())
        week_start = timezone.make_aware(timezone.datetime.combine(start_of_week, timezone.datetime.min.time()))
        
        # 4. Month Start
        month_start = timezone.make_aware(timezone.datetime.combine(today_date.replace(day=1), timezone.datetime.min.time()))

        def get_period_stats(start_time, end_time=None):
            filters = {'created_at__gte': start_time}
            if end_time:
                filters['created_at__lt'] = end_time
            
            sales = Sale.objects.filter(**filters)
            stats = sales.aggregate(
                rev=Sum('total_amount'),
                prof=Sum('total_profit'),
                trans=Count('id')
            )
            items = SaleItem.objects.filter(sale__in=sales).aggregate(qty=Sum('quantity'))
            
            return {
                'revenue': float(stats['rev'] or 0),
                'profit': float(stats['prof'] or 0),
                'transactions': stats['trans'] or 0,
                'items_sold': items['qty'] or 0
            }

        # Calculate all blocks
        today_stats = get_period_stats(today_start)
        yesterday_stats = get_period_stats(yesterday_start, today_start)
        week_stats = get_period_stats(week_start)
        month_stats = get_period_stats(month_start)

        # Inventory Counts
        low_stock_count = Product.objects.filter(
            is_active=True,
            quantity_in_stock__lte=F('reorder_level')
        ).count()
        total_products = Product.objects.filter(is_active=True).count()

        return Response({
            'today': today_stats,
            'yesterday': yesterday_stats,
            'week': week_stats,
            'month': month_stats,
            'total_products': total_products,
            'low_stock_count': low_stock_count
        })


class SalesChartView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        period = request.query_params.get('period', 'week')
        days = 7 if period == 'week' else 30

        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)

        sales = Sale.objects.filter(
            created_at__range=[start_date, end_date]
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            revenue=Sum('total_amount'),
            profit=Sum('total_profit'),
            transactions=Count('id')
        ).order_by('date')

        return Response(list(sales))


class TopProductsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = int(request.query_params.get('limit', 10))

        top_products = SaleItem.objects.filter(
            sale__created_at__gte=timezone.now() - timedelta(days=30)
        ).values(
            'product__id', 'product__name', 'product__sku'
        ).annotate(
            total_quantity=Sum('quantity'),
            total_revenue=Sum('total_price'),
            total_profit=Sum('profit')
        ).order_by('-total_quantity')[:limit]

        return Response(list(top_products))


class SalesExportCSVView(APIView):
    permission_classes = [permissions.IsAuthenticated]  # Changed to IsAuthenticated so staff can export if needed (or keep IsAdminUser)

    def get(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        sales = Sale.objects.select_related('cashier').prefetch_related('items__product').order_by('-created_at')

        if start_date:
            sales = sales.filter(created_at__date__gte=start_date)
        if end_date:
            sales = sales.filter(created_at__date__lte=end_date)

        filename = f"sales_report_{timezone.now().strftime('%Y%m%d_%H%M%S')}.csv"
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow(['Sale ID', 'Date & Time', 'Items Count', 'Total Amount (GHS)', 'Profit (GHS)', 'Payment Method', 'Cashier'])

        for sale in sales:
            writer.writerow([
                sale.sale_id,
                sale.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                sale.items.count(),
                f"{sale.total_amount:.2f}",
                f"{sale.total_profit:.2f}",
                sale.payment_method.capitalize(),
                sale.cashier.username if sale.cashier else 'N/A'
            ])

        return response


class RecentSalesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = int(request.query_params.get('limit', 5))

        sales = Sale.objects.select_related('cashier').order_by('-created_at')[:limit]

        result = []
        for sale in sales:
            result.append({
                'sale_id': sale.sale_id,
                'total_amount': float(sale.total_amount),  # FIX 2: was 'total', frontend expects 'total_amount'
                'items_count': sale.items.count(),
                'cashier_name': sale.cashier.username if sale.cashier else 'Unknown',  # consistent with other views
                'created_at': sale.created_at.isoformat()
            })

        return Response(result)


class MonthlySalesLogView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        
        # Ensure the current month is calculated/updated dynamically
        generate_or_update_monthly_log(now.year, now.month)
        
        # Also ensure last month is sealed
        last_month_date = now.replace(day=1) - timedelta(days=1)
        generate_or_update_monthly_log(last_month_date.year, last_month_date.month)

        logs = MonthlySalesLog.objects.all()
        serializer = MonthlySalesLogSerializer(logs, many=True)
        return Response(serializer.data)

    def post(self, request):
        """Allows manual triggering to seal/re-calculate a specific month"""
        year = request.data.get('year')
        month = request.data.get('month')

        if not year or not month:
            return Response({'error': 'Year and month are required'}, status=status.HTTP_400_BAD_REQUEST)

        log = generate_or_update_monthly_log(int(year), int(month))
        return Response(MonthlySalesLogSerializer(log).data)