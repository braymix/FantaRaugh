/** Sprite pixel di un'unità, reso a scala intera per restare nitido. */

import { SPRITE_SIZE } from '../art/pixel';
import { spriteUrl } from '../art/sprites';

export function Sprite({
  defId,
  role,
  scale = 2,
  className = '',
}: {
  defId: string;
  role?: string;
  scale?: number;
  className?: string;
}) {
  const url = spriteUrl(defId, role);
  const size = SPRITE_SIZE * scale;
  if (!url) return <div style={{ width: size, height: size }} className={className} />;
  return (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={`select-none ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
