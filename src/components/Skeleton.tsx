export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-[#ece6da] rounded animate-pulse ${className}`} />
  )
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white border border-[#ece6da] rounded-xl p-4 shadow-sm">
      <Skeleton className="h-3 w-16 mb-2" />
      <Skeleton className="h-6 w-20" />
    </div>
  )
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-t border-[#ece6da]">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  )
}