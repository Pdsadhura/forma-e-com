import { BackButton } from "./BackButton";
import { Container } from "./Container";
import { serif } from "@/lib/fonts";

export function PolicyLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Container className="py-10 sm:py-14">
      <BackButton />
      <h1 className={`${serif.className} mt-3 text-4xl text-stone-950`}>{title}</h1>
      <div className="mt-8 max-w-3xl space-y-4 text-base leading-7 text-stone-700">{children}</div>
    </Container>
  );
}
