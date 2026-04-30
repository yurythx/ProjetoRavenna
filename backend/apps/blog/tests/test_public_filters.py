from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.blog.models import Category, Post, Tag
from apps.blog.views import (
    CategoryViewSet,
    PostViewSet,
    PublicCategoryViewSet,
    PublicPostViewSet,
    PublicTagViewSet,
    TagViewSet,
)


class PublicPostFiltersTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.author = User.objects.create_user(email="author2@example.com", password="Pass1234!", username="author2")
        self.reader = User.objects.create_user(email="reader@example.com", password="Pass1234!", username="reader")

        self.cat_a = Category.objects.create(name="Categoria A", slug="categoria-a", is_active=True)
        self.cat_b = Category.objects.create(name="Categoria B", slug="categoria-b", is_active=True)
        self.tag_one = Tag.objects.create(name="Tag One", slug="tag-one")
        self.tag_two = Tag.objects.create(name="Tag Two", slug="tag-two")
        self.tag_private = Tag.objects.create(name="Private Tag", slug="private-tag")

        self.p1 = Post.objects.create(
            title="Post 1",
            slug="post-1",
            excerpt="e1",
            content="c1",
            author=self.author,
            category=self.cat_a,
            status=Post.Status.PUBLISHED,
            is_public=True,
        )
        self.p1.tags.set([self.tag_one, self.tag_two])

        self.p2 = Post.objects.create(
            title="Post 2",
            slug="post-2",
            excerpt="e2",
            content="c2",
            author=self.author,
            category=self.cat_b,
            status=Post.Status.PUBLISHED,
            is_public=True,
        )
        self.p2.tags.set([self.tag_one])

        self.private_published = Post.objects.create(
            title="Private Published",
            slug="private-published",
            excerpt="epriv",
            content="cpriv",
            author=self.author,
            category=self.cat_a,
            status=Post.Status.PUBLISHED,
            is_public=False,
        )
        self.private_published.tags.set([self.tag_private])

        self.p3 = Post.objects.create(
            title="Post 3",
            slug="post-3",
            excerpt="e3",
            content="c3",
            author=self.author,
            category=self.cat_a,
            status=Post.Status.DRAFT,
            is_public=True,
        )
        self.p3.tags.set([self.tag_one])

    def _slugs_from_list(self, res_json):
        return sorted([p["slug"] for p in res_json.get("results", [])])

    def test_public_list_filter_by_category_slug_and_uuid(self):
        self.client.force_authenticate(user=None)

        res_slug = self.client.get(f"/api/blog/posts/?category={self.cat_a.slug}&page_size=50")
        self.assertEqual(res_slug.status_code, 200)
        self.assertEqual(self._slugs_from_list(res_slug.json()), ["post-1"])

        res_uuid = self.client.get(f"/api/blog/posts/?category={self.cat_a.id}&page_size=50")
        self.assertEqual(res_uuid.status_code, 200)
        self.assertEqual(self._slugs_from_list(res_uuid.json()), ["post-1"])

        res_slug_articles = self.client.get(f"/api/articles/articles/?category={self.cat_a.slug}&page_size=50")
        self.assertEqual(res_slug_articles.status_code, 200)
        self.assertEqual(self._slugs_from_list(res_slug_articles.json()), ["post-1"])

        res_uuid_articles = self.client.get(f"/api/articles/articles/?category={self.cat_a.id}&page_size=50")
        self.assertEqual(res_uuid_articles.status_code, 200)
        self.assertEqual(self._slugs_from_list(res_uuid_articles.json()), ["post-1"])

    def test_public_list_filter_by_tag_slug_and_uuid(self):
        self.client.force_authenticate(user=None)

        res_slug = self.client.get(f"/api/blog/posts/?tag={self.tag_one.slug}&page_size=50")
        self.assertEqual(res_slug.status_code, 200)
        self.assertEqual(self._slugs_from_list(res_slug.json()), ["post-1", "post-2"])

        res_uuid = self.client.get(f"/api/blog/posts/?tag={self.tag_one.id}&page_size=50")
        self.assertEqual(res_uuid.status_code, 200)
        self.assertEqual(self._slugs_from_list(res_uuid.json()), ["post-1", "post-2"])

        res_slug_articles = self.client.get(f"/api/articles/articles/?tag={self.tag_one.slug}&page_size=50")
        self.assertEqual(res_slug_articles.status_code, 200)
        self.assertEqual(self._slugs_from_list(res_slug_articles.json()), ["post-1", "post-2"])

        res_uuid_articles = self.client.get(f"/api/articles/articles/?tag={self.tag_one.id}&page_size=50")
        self.assertEqual(res_uuid_articles.status_code, 200)
        self.assertEqual(self._slugs_from_list(res_uuid_articles.json()), ["post-1", "post-2"])

    def test_public_list_excludes_private_posts_for_anonymous(self):
        self.client.force_authenticate(user=None)
        res = self.client.get("/api/blog/posts/?page_size=50")
        self.assertEqual(res.status_code, 200)
        self.assertNotIn("private-published", self._slugs_from_list(res.json()))

        res2 = self.client.get("/api/blog/public/posts/?page_size=50")
        self.assertEqual(res2.status_code, 200)
        self.assertNotIn("private-published", self._slugs_from_list(res2.json()))

    def test_private_post_requires_auth_for_detail(self):
        self.client.force_authenticate(user=None)
        res_anon = self.client.get("/api/blog/posts/private-published/")
        self.assertEqual(res_anon.status_code, 404)

        self.client.force_authenticate(user=self.reader)
        res_auth = self.client.get("/api/blog/posts/private-published/")
        self.assertEqual(res_auth.status_code, 200)

    def test_public_detail_does_not_expose_editor_fields(self):
        self.client.force_authenticate(user=None)
        res = self.client.get("/api/blog/posts/post-1/")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertNotIn("rejection_reason", data)
        self.assertNotIn("author_email", data)
        self.assertNotIn("status", data)

        res2 = self.client.get("/api/blog/public/posts/post-1/")
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        self.assertNotIn("rejection_reason", data2)
        self.assertNotIn("author_email", data2)
        self.assertNotIn("status", data2)

    def test_public_categories_post_count_ignores_private_posts(self):
        self.client.force_authenticate(user=None)
        res = self.client.get("/api/blog/categories/")
        self.assertEqual(res.status_code, 200)
        categories = res.json()
        cat_a = next(c for c in categories if c["slug"] == self.cat_a.slug)
        self.assertEqual(cat_a["post_count"], 1)

        res2 = self.client.get("/api/blog/public/categories/")
        self.assertEqual(res2.status_code, 200)
        categories2 = res2.json()
        cat_a2 = next(c for c in categories2 if c["slug"] == self.cat_a.slug)
        self.assertEqual(cat_a2["post_count"], 1)

    def test_public_tags_excludes_tags_only_used_in_private_posts(self):
        self.client.force_authenticate(user=None)
        res = self.client.get("/api/blog/tags/")
        self.assertEqual(res.status_code, 200)
        slugs = sorted([t["slug"] for t in res.json()])
        self.assertNotIn("private-tag", slugs)

        res2 = self.client.get("/api/blog/public/tags/")
        self.assertEqual(res2.status_code, 200)
        slugs2 = sorted([t["slug"] for t in res2.json()])
        self.assertNotIn("private-tag", slugs2)

    def test_viewsets_have_throttling_enabled(self):
        self.assertTrue(PublicPostViewSet.throttle_classes)
        self.assertTrue(PublicCategoryViewSet.throttle_classes)
        self.assertTrue(PublicTagViewSet.throttle_classes)
        self.assertTrue(PostViewSet.throttle_classes)
        self.assertTrue(CategoryViewSet.throttle_classes)
        self.assertTrue(TagViewSet.throttle_classes)
