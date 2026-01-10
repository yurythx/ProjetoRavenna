from django.test import TestCase
from rest_framework.test import APIClient
from django.urls import reverse
from rest_framework import status
from apps.articles.models import Category

class AuthenticationTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = Category.objects.create(name="Test Category", slug="test-category")

    def test_public_endpoint_with_invalid_token(self):
        """
        Ensure public endpoints return 200 even with an invalid token.
        """
        # Set an invalid token
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalid_token_123')
        
        # Access a public endpoint (e.g., categories list)
        url = reverse('categories-list') # Assuming 'categories-list' is the route name
        response = self.client.get(url)
        
        # Should be 200 OK, not 401 Unauthorized
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_public_endpoint_without_token(self):
        """
        Ensure public endpoints return 200 without any token.
        """
        self.client.credentials() # No token
        url = reverse('categories-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
