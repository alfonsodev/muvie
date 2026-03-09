import { BASE_URL } from '@/lib/auth-client';

export const generateAPIUrl = (relativePath: string) => {
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${BASE_URL}${path}`;
};

