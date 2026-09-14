import { createRoot } from 'react-dom/client';
import { SPRITE_IDS } from '@ui/art/sprites';
import { Sprite } from '@ui/components/Sprite';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <div style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
    {SPRITE_IDS.map((id) => (
      <div key={id} style={{ textAlign: 'center', width: 130 }}>
        <Sprite defId={id} scale={4} />
        <div style={{ fontSize: 10, color: '#aaa' }}>{id.replace(/^(hero|enemy)_/, '')}</div>
      </div>
    ))}
  </div>,
);
