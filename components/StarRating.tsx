interface Props {
  rating: number;
  size?: number;
  showEmpty?: boolean;
  className?: string;
}

const PATH =
  "M8 1.4l1.96 4.06 4.44.6-3.24 3.1.8 4.44L8 11.5l-3.96 2.1.8-4.44L1.6 6.06l4.44-.6z";

export default function StarRating({
  rating,
  size = 11,
  showEmpty = true,
  className = "",
}: Props) {
  const n = Math.max(0, Math.min(5, Math.round(rating)));
  const items = showEmpty ? 5 : n;
  return (
    <span className={`inline-flex items-center gap-[2px] ${className}`} aria-label={`期待度 ${n}/5`}>
      {Array.from({ length: items }).map((_, i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 16 16"
          aria-hidden="true"
          className={i < n ? "text-gold" : "text-rule"}
        >
          <path d={PATH} fill={i < n ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.1" />
        </svg>
      ))}
    </span>
  );
}
