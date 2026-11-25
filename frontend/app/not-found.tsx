import Link from "next/link";
import { Container } from "@/components/Container";

export default function NotFound() {
  return (
    <Container className="py-20">
      <h1 className="text-3xl font-medium">Page not found</h1>
      <Link href="/products" className="mt-4 inline-block text-sm text-emerald-950">Back to the shop</Link>
    </Container>
  );
}
