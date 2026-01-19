from django.http import HttpResponse
from apps.articles.models import Article
from apps.core.tenant_context import get_current_tenant_id
from django.utils import timezone

def tenant_sitemap(request):
    """
    Generate a dynamic sitemap.xml for the current tenant.
    """
    tenant_id = get_current_tenant_id()
    if not tenant_id:
        return HttpResponse("No tenant active", status=404)

    articles = Article.objects.filter(is_published=True).order_by('-updated_at')
    
    # We use a simple XML format
    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    
    # Homepage
    host = request.get_host()
    protocol = "https" if request.is_secure() else "http"
    base_url = f"{protocol}://{host}"
    
    xml_content += f'  <url>\n    <loc>{base_url}/</loc>\n    <priority>1.0</priority>\n  </url>\n'
    
    # Articles
    for article in articles:
        xml_content += f'  <url>\n    <loc>{base_url}/artigos/{article.slug}</loc>\n'
        xml_content += f'    <lastmod>{article.updated_at.date().isoformat()}</lastmod>\n'
        xml_content += f'    <priority>0.8</priority>\n  </url>\n'
        
    xml_content += '</urlset>'
    
    return HttpResponse(xml_content, content_type="application/xml")
