'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

/**
 * Uploader page now redirects to campaign-control with the create tab
 * The actual create/edit functionality is now part of the combined campaign management page
 */
export default function UploaderRedirectPage() {
    const router = useRouter();
    const params = useParams();
    const locale = params.locale as string;

    useEffect(() => {
        router.replace(`/${locale}/campaign-control?tab=create`);
    }, [router, locale]);

    // Show nothing while redirecting
    return null;
}
