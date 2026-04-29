import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 md:px-6">
      <div className="flex h-14 items-center border-b border-border">
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="flex flex-col gap-6 py-6 md:gap-8 md:py-8">
        <Skeleton className="h-4 w-40" />
        <section className="space-y-2 border border-border bg-surface px-4 py-3">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </section>
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
          <div className="space-y-1.5 border border-border bg-surface p-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-full" />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
