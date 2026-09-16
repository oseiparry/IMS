# ─────────────────────────────────────────────────────────────────────
# accounts/urls.py
# ─────────────────────────────────────────────────────────────────────
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView, LogoutView, CurrentUserView,
    UserListCreateView, UserDetailView,
    ChangePasswordView, ActivityLogView,
    SetPasswordView,               
)

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', CurrentUserView.as_view(), name='current_user'),

    path('users/', UserListCreateView.as_view(), name='user_list'),
    path('users/<uuid:pk>/', UserDetailView.as_view(), name='user_detail'),

    # NEW – super‑admin sets the final password
    path('users/<uuid:pk>/set-password/',
         SetPasswordView.as_view(),
         name='admin_set_password'),

    path('change-password/', ChangePasswordView.as_view(),
         name='change_password'),

    path('activity-logs/', ActivityLogView.as_view(),
         name='activity_logs'),
]
