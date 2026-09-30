import { PortalAccessGuard } from '@/components/portal-access-guard';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalAccessGuard>{children}</PortalAccessGuard>;
}
