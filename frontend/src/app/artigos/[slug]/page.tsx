import type { Metadata, ResolvingMetadata } from 'next';
import ArticleClient from './ArticleClient';
import { notFound } from 'next/navigation';

async function getArticle(slug: string) {
  const baseUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
  const res = await fetch(`${baseUrl}/articles/posts/${slug}/`, {
    next: { revalidate: 60 }, // Revalidate every minute
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    console.error('Failed to fetch article', await res.text());
    return null; // Or throw
  }

  return res.json();
}

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
  props: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const params = await props.params;
  const article = await getArticle(params.slug);

  if (!article) {
    return {
      title: 'Artigo não encontrado',
    };
  }

  const previousImages = (await parent).openGraph?.images || [];
  const images = article.banner ? [article.banner, ...previousImages] : previousImages;

  return {
    title: article.title,
    description: article.content.substring(0, 160).replace(/<[^>]*>/g, ''), // Strip HTML for description
    openGraph: {
      title: article.title,
      description: article.content.substring(0, 160).replace(/<[^>]*>/g, ''),
      url: `/artigos/${article.slug}`,
      images: images,
      type: 'article',
      publishedTime: article.created_at,
      authors: [article.author_name || 'Projetos Ravenna'],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.content.substring(0, 160).replace(/<[^>]*>/g, ''),
      images: images,
    },
    alternates: {
      canonical: `/artigos/${article.slug}`,
    }
  };
}

export default async function ArticlePage(props: Props) {
  const params = await props.params;
  const article = await getArticle(params.slug);

  if (!article) {
    notFound();
  }

  return <ArticleClient slug={params.slug} initialData={article} />;
}

