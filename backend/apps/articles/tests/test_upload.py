from django.urls import reverse
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.conf import settings
from PIL import Image
import io
import tempfile
from django.test import override_settings

User = get_user_model()

class UploadImageTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser', 
            email='test@example.com', 
            password='password123'
        )
        self.client.force_authenticate(user=self.user)
        self.url = '/api/v1/articles/uploads/' # Assumindo essa rota baseada no urls.py

    def generate_image_file(self, name='test.jpg', size=(100, 100), color='red'):
        file = io.BytesIO()
        image = Image.new('RGB', size, color)
        image.save(file, 'JPEG')
        file.name = name
        file.seek(0)
        return file

    def test_upload_image_success(self):
        """Should successfully upload a valid image"""
        image_file = self.generate_image_file()
        response = self.client.post(self.url, {'file': image_file}, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('location', response.data)
        self.assertTrue(response.data['location'].endswith('.jpg'))

    def test_upload_invalid_file_type(self):
        """Should reject non-image files"""
        text_file = io.BytesIO(b"This is not an image")
        text_file.name = 'test.txt'
        
        response = self.client.post(self.url, {'file': text_file}, format='multipart')
        
        # Expect 400 Bad Request due to validation error
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(MAX_UPLOAD_SIZE=100) # Set very small limit (100 bytes)
    def test_upload_file_too_large(self):
        """Should reject files larger than MAX_UPLOAD_SIZE"""
        # Generate a small valid image first
        image_file = self.generate_image_file(size=(10, 10))
        # Pad it with zeros to ensure it exceeds 100 bytes
        content = image_file.read()
        padding = b'\x00' * 200
        large_file = io.BytesIO(content + padding)
        large_file.name = 'large.jpg'
        large_file.seek(0)
        
        response = self.client.post(self.url, {'file': large_file}, format='multipart')
        
        if response.status_code != status.HTTP_400_BAD_REQUEST:
            self.fail(f"Expected 400 but got {response.status_code}. Data: {response.data}")
            
        # Check for error in standard DRF format or custom 'details' format
        errors = response.data.get('file')
        if not errors and 'details' in response.data:
            errors = response.data['details'].get('file')
            
        if not errors:
             self.fail(f"No file errors found. Data: {response.data}")

        if not any('too large' in str(err) for err in errors):
             self.fail(f"Expected 'too large' error but got: {response.data}")

    def test_upload_unauthenticated(self):
        """Unauthenticated users should not be able to upload"""
        self.client.logout()
        image_file = self.generate_image_file()
        response = self.client.post(self.url, {'file': image_file}, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
