"""
Tests for Django Admin configurations
"""
from django.test import TestCase, Client
from django.contrib.admin.sites import site
from django.contrib.auth import get_user_model
from apps.articles.models import Category, Tag, Article
from apps.entities.models import Entity, Address
from apps.core.models import AppModule

User = get_user_model()


class AdminRegistrationTest(TestCase):
    """Test that all models are properly registered in Django Admin"""
    
    def test_customuser_registered(self):
        """Test CustomUser model is registered"""
        self.assertIn(User, site._registry)
    
    def test_category_registered(self):
        """Test Category model is registered"""
        self.assertIn(Category, site._registry)
    
    def test_tag_registered(self):
        """Test Tag model is registered"""
        self.assertIn(Tag, site._registry)
    
    def test_article_registered(self):
        """Test Article model is registered"""
        self.assertIn(Article, site._registry)
    
    def test_entity_registered(self):
        """Test Entity model is registered"""
        self.assertIn(Entity, site._registry)
    
    def test_address_registered(self):
        """Test Address model is registered"""
        self.assertIn(Address, site._registry)
    
    def test_appmodule_registered(self):
        """Test AppModule model is registered"""
        self.assertIn(AppModule, site._registry)


class AdminAccessTest(TestCase):
    """Test admin interface access and functionality"""
    
    def setUp(self):
        """Create test user and client"""
        self.client = Client()
        self.admin_user = User.objects.create_superuser(
            email='admin@test.com',
            username='admin',
            password='testpass123'
        )
    
    def test_admin_login(self):
        """Test admin can login"""
        response = self.client.post('/admin/login/', {
            'username': 'admin@test.com',
            'password': 'testpass123'
        }, follow=True)
        self.assertEqual(response.status_code, 200)
    
    def test_admin_index_accessible(self):
        """Test admin index page is accessible"""
        self.client.force_login(self.admin_user)
        response = self.client.get('/admin/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'admin')
    
    def test_article_changelist_accessible(self):
        """Test article list page is accessible"""
        self.client.force_login(self.admin_user)
        response = self.client.get('/admin/articles/article/')
        self.assertEqual(response.status_code, 200)
    
    def test_category_changelist_accessible(self):
        """Test category list page is accessible"""
        self.client.force_login(self.admin_user)
        response = self.client.get('/admin/articles/category/')
        self.assertEqual(response.status_code, 200)
    
    def test_user_changelist_accessible(self):
        """Test user list page is accessible"""
        self.client.force_login(self.admin_user)
        response = self.client.get('/admin/accounts/customuser/')
        self.assertEqual(response.status_code, 200)


class AdminActionsTest(TestCase):
    """Test custom admin actions"""
    
    def setUp(self):
        """Create test data"""
        self.client = Client()
        self.admin_user = User.objects.create_superuser(
            email='admin@test.com',
            username='admin',
            password='testpass123'
        )
        self.client.force_login(self.admin_user)
        
        # Create test articles
        self.category = Category.objects.create(name='Test Category')
        self.article1 = Article.objects.create(
            title='Article 1',
            content='Content 1',
            category=self.category,
            is_published=False
        )
        self.article2 = Article.objects.create(
            title='Article 2',
            content='Content 2',
            category=self.category,
            is_published=False
        )
    
    def test_publish_articles_action(self):
        """Test bulk publish action"""
        data = {
            'action': 'publish_articles',
            '_selected_action': [str(self.article1.id), str(self.article2.id)],
        }
        response = self.client.post('/admin/articles/article/', data, follow=True)
        
        # Refresh from database
        self.article1.refresh_from_db()
        self.article2.refresh_from_db()
        
        self.assertTrue(self.article1.is_published)
        self.assertTrue(self.article2.is_published)
    
    def test_unpublish_articles_action(self):
        """Test bulk unpublish action"""
        # First publish them
        self.article1.is_published = True
        self.article1.save()
        self.article2.is_published = True
        self.article2.save()
        
        data = {
            'action': 'unpublish_articles',
            '_selected_action': [str(self.article1.id), str(self.article2.id)],
        }
        response = self.client.post('/admin/articles/article/', data, follow=True)
        
        # Refresh from database
        self.article1.refresh_from_db()
        self.article2.refresh_from_db()
        
        self.assertFalse(self.article1.is_published)
        self.assertFalse(self.article2.is_published)


class AdminSearchTest(TestCase):
    """Test admin search functionality"""
    
    def setUp(self):
        """Create test data"""
        self.client = Client()
        self.admin_user = User.objects.create_superuser(
            email='admin@test.com',
            username='admin',
            password='testpass123'
        )
        self.client.force_login(self.admin_user)
        
        self.category = Category.objects.create(
            name='Python Programming',
            description='Python tutorials'
        )
    
    def test_category_search(self):
        """Test searching categories"""
        response = self.client.get('/admin/articles/category/?q=Python')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Python Programming')
    
    def test_tag_search(self):
        """Test searching tags"""
        tag = Tag.objects.create(name='Django')
        response = self.client.get('/admin/articles/tag/?q=Django')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Django')
