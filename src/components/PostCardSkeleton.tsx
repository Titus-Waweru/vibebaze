import { Skeleton } from "@/components/ui/skeleton";

const PostCardSkeleton = () => (
  <div className="bg-card border border-border/50 rounded-lg overflow-hidden">
    <div className="p-4 flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-2 w-20" />
      </div>
    </div>
    <Skeleton className="w-full aspect-square" />
    <div className="p-4 space-y-2">
      <div className="flex gap-4">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="h-3 w-3/4" />
    </div>
  </div>
);

export default PostCardSkeleton;