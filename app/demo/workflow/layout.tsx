// The page itself is a Client Component and can't export metadata, so the
// title lives here.
export const metadata = { title: "Demo · workflow" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
