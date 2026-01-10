from django.urls import reverse
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.articles.models import Article, Category, Tag

User = get_user_model()

class ArticleAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Users
        self.admin = User.objects.create_superuser('admin', 'admin@example.com', 'pass123')
        self.author = User.objects.create_user('author', 'author@example.com', 'pass123')
        self.other_user = User.objects.create_user('other', 'other@example.com', 'pass123')
        
        # Data
        self.category = Category.objects.create(name='Tech', slug='tech')
        self.tag = Tag.objects.create(name='Django', slug='django')
        
        self.article = Article.objects.create(
            title='Test Article',
            content='Content here',
            category=self.category,
            author=self.author,
            is_published=True
        )
        self.article.tags.add(self.tag)
        
        self.draft = Article.objects.create(
            title='Draft Article',
            content='Draft content',
            category=self.category,
            author=self.author,
            is_published=False
        )

    def test_list_articles_anonymous(self):
        """Anonymous users see only published articles"""
        url = reverse('articles-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Handle pagination or list
        results = response.data.get('results') if isinstance(response.data, dict) and 'results' in response.data else response.data
        
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], str(self.article.id))

    def test_list_articles_author(self):
        """Author sees published AND their own drafts"""
        self.client.force_authenticate(user=self.author)
        url = reverse('articles-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Handle pagination or list
        results = response.data.get('results') if isinstance(response.data, dict) and 'results' in response.data else response.data

        # Should see both
        self.assertEqual(len(results), 2)

    def test_create_article(self):
        """Authenticated user can create article"""
        self.client.force_authenticate(user=self.author)
        url = reverse('articles-list')
        data = {
            'title': 'New Post',
            'content': 'Amazing content',
            'category': self.category.id,
            'tag_ids': [self.tag.id],
            'is_published': True
        }
        
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Article.objects.count(), 3)
        
        new_article = Article.objects.get(title='New Post')
        self.assertTrue(new_article.tags.filter(id=self.tag.id).exists())

    def test_update_article_permission(self):
        """Only author can update their article"""
        self.client.force_authenticate(user=self.other_user)
        url = reverse('articles-detail', kwargs={'slug': self.article.slug})
        data = {'title': 'Hacked'}
        
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Author can update
        self.client.force_authenticate(user=self.author)
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.article.refresh_from_db()
        self.assertEqual(self.article.title, 'Hacked')

    def test_search_vector_update(self):
        """Test if search vector is updated on save (Model test via API)"""
        self.client.force_authenticate(user=self.author)
        url = reverse('articles-list')
        data = {
            'title': 'Python Search',
            'content': 'Postgres is powerful',
            'category': self.category.id,
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        article = Article.objects.get(title='Python Search')
        
        from django.db import connection
        if connection.vendor != 'sqlite':
            self.assertIsNotNone(article.search_vector)
        else:
            print("Skipping search_vector check on SQLite")
