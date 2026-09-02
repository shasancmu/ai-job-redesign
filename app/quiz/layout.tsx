// The page itself is a Client Component and can't export metadata, so the
// title lives here.
export const metadata = { title: "Quiz" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
