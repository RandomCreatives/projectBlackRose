export default function Mark({ className = "mk" }: { className?: string }) {
  return (
    <img
      className={className}
      src="/favicon/favicon-192.png"
      alt=""
      width={32}
      height={32}
      aria-hidden="true"
      decoding="async"
    />
  );
}
