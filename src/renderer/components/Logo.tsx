export default function Logo({ size = 20 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="12" fill="url(#logo-grad)" />
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor="#F27A20" />
          <stop offset="100%" stopColor="#1558BC" />
        </linearGradient>
      </defs>
      {/* Stylized JT mark */}
      <rect x="12" y="14" width="6" height="36" rx="3" fill="white" />
      <rect x="22" y="14" width="6" height="36" rx="3" fill="white" />
      <path d="M32 14h20a4 4 0 010 8H36v8h12a4 4 0 010 8H36v10a4 4 0 01-8 0V18a4 4 0 014-4z" fill="white" fillOpacity="0.9" />
    </svg>
  )
}
