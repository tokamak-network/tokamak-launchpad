/* eslint-disable @next/next/no-img-element */
import { ipfsToGateway } from "../lib/format";

const DEFAULT_IMAGE = "/default-token.png";

/**
 * Displays a token image from IPFS, or a default placeholder when no image is set.
 * The parent element should have explicit dimensions; this image fills it.
 */
export function TokenImage({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  sizes?: string;
  className?: string;
}) {
  const trimmed = src?.trim();
  const hasImage = trimmed && trimmed.length > 10 && trimmed !== "ipfs://";
  const resolved = hasImage ? ipfsToGateway(trimmed) : DEFAULT_IMAGE;

  return (
    <img
      src={resolved}
      alt={alt}
      loading="lazy"
      className={`absolute inset-0 h-full w-full object-cover ${className ?? ""}`}
      onError={(e) => { e.currentTarget.src = DEFAULT_IMAGE; }}
    />
  );
}
