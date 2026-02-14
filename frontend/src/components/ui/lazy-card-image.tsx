import React, { useEffect, useRef, useState } from "react";

/**
 * Card preview image that only sets img src when the element is in (or near) the viewport.
 * Use in ticket cards to avoid requesting every image URI until the user scrolls to the card.
 */
export const LazyCardImage: React.FC<{
  src: string | undefined;
  alt: string;
  className?: string;
  placeholderClassName?: string;
}> = ({ src, alt, className = "w-full aspect-[3/2] object-cover", placeholderClassName }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (!src) return;
    const el = wrapperRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsInView(true);
        }
      },
      { rootMargin: "100px", threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [src]);

  if (!src) {
    return (
      <div
        className={placeholderClassName ?? "w-full aspect-[3/2] bg-muted flex items-center justify-center"}
        aria-hidden
      >
        <span className="text-muted-foreground text-sm">No image</span>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="w-full aspect-[3/2] overflow-hidden bg-muted">
      {isInView ? (
        <img
          src={src}
          alt={alt}
          className={className}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
          className={placeholderClassName ?? "w-full h-full bg-muted"}
          aria-hidden
        />
      )}
    </div>
  );
};
