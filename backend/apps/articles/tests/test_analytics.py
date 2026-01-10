from django.urls import reverse
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.articles.models import Article, Category
from apps.articles.analytics_models import ArticleView
from django.core.cache import cache

User = get_user_model()

class AnalyticsTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear() # Clear throttling and view cache
        
        self.user = User.objects.create_user('reader', 'reader@example.com', 'pass123')
        self.category = Category.objects.create(name='Tech', slug='tech')
        self.article = Article.objects.create(
            title='Popular Article',
            content='Content',
            category=self.category,
            is_published=True
        )
        self.track_url = reverse('article-analytics-track-view', kwargs={'pk': self.article.id})

    def test_track_view_anonymous(self):
        """Should track view for anonymous user"""
        response = self.client.post(self.track_url, {})
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['tracked'])
        self.assertEqual(ArticleView.objects.count(), 1)
        self.assertTrue(ArticleView.objects.first().is_anonymous)

    def test_track_view_authenticated(self):
        """Should track view for authenticated user"""
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.track_url, {})
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ArticleView.objects.first().user, self.user)

    def test_view_deduplication(self):
        """Should not count duplicate views from same session in short time"""
        # First view
        self.client.post(self.track_url, {})
        self.assertEqual(ArticleView.objects.count(), 1)
        
        # Second view (same session)
        response = self.client.post(self.track_url, {})
        
        # Should return success but not create new record (unless updating time)
        self.assertEqual(response.status_code, status.HTTP_200_OK) 
        self.assertFalse(response.data['unique'])
        self.assertEqual(ArticleView.objects.count(), 1)

    def test_dashboard_stats(self):
        """Test dashboard aggregation logic"""
        # Create some views
        ArticleView.objects.create(article=self.article, session_id='1', ip_hash='a')
        ArticleView.objects.create(article=self.article, session_id='2', ip_hash='b')
        
        self.client.force_authenticate(user=self.user)
        # Assuming user is staff to see all stats or author
        self.user.is_staff = True
        self.user.save()
        
        url = reverse('article-analytics-dashboard')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_views'], 2)
        self.assertEqual(response.data['total_articles'], 1)
        self.assertEqual(len(response.data['top_articles']), 1)
