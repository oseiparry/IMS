import uuid
from django.db import models

class MonthlySalesLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    year = models.IntegerField()
    month = models.IntegerField()  # 1 to 12
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_profit = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_transactions = models.IntegerField(default=0)
    total_items_sold = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-year', '-month']
        unique_together = ('year', 'month')

    def __str__(self):
        return f"{self.year}-{self.month:02d} Log | Rev: GH₵{self.total_revenue}"