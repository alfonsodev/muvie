import { AppConfig } from "@/lib/config";

export const generateAPIUrl = (relativePath: string) => {
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${AppConfig.apiBaseUrl}${path}`;
};
