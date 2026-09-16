from django.urls import path
from .views import ReceiptView, SaleListCreateView, SaleDetailView, SaleCreateView,  SaleReceiptView

urlpatterns = [
    path('', SaleListCreateView.as_view(), name='sale_list'),
    path('create/', SaleCreateView.as_view(), name='sale_create'),
    path('<uuid:pk>/', SaleDetailView.as_view(), name='sale_detail'),
    path('receipt/<str:sale_id>/', ReceiptView.as_view(), name='receipt'),
    #path('sales/receipt/<str:sale_id>/', ReceiptView.as_view()),
]