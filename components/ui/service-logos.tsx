interface LogoProps {
  size?: number;
}

export function VercelLogo({ size = 14 }: LogoProps) {
  return (
    <svg
      width={size}
      height={(size * 12) / 14}
      viewBox="0 0 14 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Vercel"
    >
      <path d="M7 0L14 12H0L7 0Z" fill="currentColor" />
    </svg>
  );
}

export function NetlifyLogo({ size = 14 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Netlify"
    >
      <path
        d="M7 0.5L13 7L7 13.5L1 7L7 0.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <circle cx="7" cy="7" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function SupabaseLogo({ size = 14 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Supabase"
    >
      <path d="M7.5 1L2 7.5H7L6.5 13L12 6.5H7L7.5 1Z" fill="currentColor" />
    </svg>
  );
}
