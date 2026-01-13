from django.urls import path
from .views import EntityConfigView

urlpatterns = [
    path('config/', EntityConfigView.as_view(), name='entity-config'),
]
