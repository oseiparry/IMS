import uuid
from django.db import models
from django.conf import settings


class InventoryLog(models.Model):
    CHANGE_TYPE_CHOICES = [
        ('add', 'Add Stock'),
        ('remove', 'Remove Stock'),
        ('sale', 'Sale'),
        ('adjust', 'Adjustment'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE, related_name='inventory_logs')
    change_type = models.CharField(max_length=10, choices=CHANGE_TYPE_CHOICES)
    quantity_change = models.IntegerField()
    previous_quantity = models.IntegerField()
    new_quantity = models.IntegerField()
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.product.name} - {self.change_type} - {self.quantity_change}"