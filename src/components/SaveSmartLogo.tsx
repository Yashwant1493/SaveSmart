export function SaveSmartLogo({
  variant = 'dark',
  className = '',
}: {
  variant?: 'dark' | 'light';
  className?: string;
}) {
  const textColor = variant === 'light' ? 'text-white' : 'text-[#101B35]';

  return (
    <span className={`inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 ${className}`}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="28" height="28" rx="7" fill={variant === 'light' ? '#182746' : '#101B35'} />
        <path
          d="M8.5 17.5L12.5 13.5L15.5 16L20 10.5"
          stroke="#10B981"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16.5 10.5H20V14"
          stroke="#10B981"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={`font-display text-lg font-bold tracking-tight ${textColor}`}>
        SaveSmart
      </span>
    </span>
  );
}
