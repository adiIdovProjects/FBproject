"use client";

// Placeholder page - redirect to homepage
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

export default function AccountQuizPage() {
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    router.replace(`/${locale}/homepage`);
  }, [router, locale]);

  return null;
}
