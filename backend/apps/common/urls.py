from django.urls import path

from apps.common.views import HealthLiveView, HealthReadyView, HealthVersionView

urlpatterns = [
    path("live/", HealthLiveView.as_view(), name="health_live"),
    path("ready/", HealthReadyView.as_view(), name="health_ready"),
    path("version/", HealthVersionView.as_view(), name="health_version"),
]
