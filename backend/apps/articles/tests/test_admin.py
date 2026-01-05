from django.test import TestCase, Client
from django.contrib import admin
from django.urls import reverse
from apps.articles.models import Article, Category, Tag
from apps.accounts.models import CustomUser

class ArticleAdminTest(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_superuser(
            email='admin@example.com',
            username='admin',
            password='password123'
        )
        self.client = Client()
        self.client.force_login(self.user)
        
        self.category = Category.objects.create(name='Tech')
        self.tag = Tag.objects.create(name='Django')
        self.article = Article.objects.create(
            title='Test Article',
            content='Test content',
            category=self.category,
            author=self.user
        )
        self.article.tags.add(self.tag)

    def test_article_model_registered(self):
        """Test that Article model is registered in admin"""
        self.assertIn(Article, admin.site._registry)
        
    def test_category_model_registered(self):
        """Test that Category model is registered in admin"""
        self.assertIn(Category, admin.site._registry)
        
    def test_tag_model_registered(self):
        """Test that Tag model is registered in admin"""
        self.assertIn(Tag, admin.site._registry)

    def test_article_changelist_view(self):
        """Test that article list view loads successfully"""
        url = reverse('admin:articles_article_changelist')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Test Article')

    def test_category_changelist_view(self):
        """Test that category list view loads successfully"""
        url = reverse('admin:articles_category_changelist')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Tech')
