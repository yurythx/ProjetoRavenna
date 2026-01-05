import { notFound } from 'next/navigation';
import ServiceTemplate from '@/components/ServiceTemplate';
import { servicesData, getServiceBySlug } from '@/data/services';
import * as Icons from 'lucide-react';

export default async function ServicePage(props: { params: Promise<{ slug: string }> }) {
    const params = await props.params;
    const service = getServiceBySlug(params.slug);

    if (!service) {
        notFound();
    }

    // Get icon component dynamically
    const IconComponent = (Icons as any)[service.icon];

    return (
        <ServiceTemplate
            serviceId={service.id}
            title={service.title}
            color={service.color}
            icon={IconComponent ? <IconComponent className="w-12 h-12" /> : null}
            shortDescription={service.shortDescription}
            fullDescription={service.fullDescription}
            whyUse={service.whyUse}
            url={service.url}
            internal={service.internal}
            badge={service.badge}
            features={service.features}
            useCases={service.useCases}
            benefits={service.benefits}
            technologies={service.technologies}
        />
    );
}

// Generate static params for all services
export async function generateStaticParams() {
    return servicesData.map((service) => ({
        slug: service.slug,
    }));
}

