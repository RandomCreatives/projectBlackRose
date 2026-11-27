export default function Mark({ className = "mk" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 3.6c5.4.2 9.4 4.1 9.4 9.3 0 6-4.2 9.7-9.4 9.7s-9.4-3.7-9.4-9.7c0-5.2 4-9.1 9.4-9.3Z" />
        <path d="M20.6 8c2.8 0 4.9 2.1 4.9 4.8 0 2.7-2.3 4.6-4.9 4.6-2.3 0-4.2-1.5-4.2-3.7 0-2.1 1.8-3.5 4.1-3.5 1.8 0 3 1 3 2.4 0 1.3-1.1 2.2-2.6 2.2" />
        <path d="M20 22.4v14" />
        <path d="M20 30.7c-4.6 0-6.9-2.2-6.9-5.7 3.5 0 6.9 1.7 6.9 5.7Z" />
      </g>
    </svg>
  );
}
