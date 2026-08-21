import "@/styles/marketing/site.css";
import "@/styles/marketing/sections.css";
import "@/styles/marketing/legal.css";

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
