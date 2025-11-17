import { getTranslations } from 'next-intl/server';
import { VendorDetailsPage } from '@/components/dashboard/vendor-details-page';

interface VendorDetailPageProps {
  params: {
    id: string;
    locale: string;
  };
}

export default async function VendorDetailPage({ params }: VendorDetailPageProps) {
  const t = await getTranslations('vendors');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('vendorDetails')}</h1>
        <p className="text-muted-foreground">{t('vendorDetailsDescription')}</p>
      </div>
      <VendorDetailsPage vendorId={params.id} />
    </div>
  );
}

