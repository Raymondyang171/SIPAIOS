import { ProductionShell } from "./shell";

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProductionShell>{children}</ProductionShell>;
}
