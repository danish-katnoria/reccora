'use client';
import { useState } from 'react';
import { Img } from './img';

export function Gallery({ images, title }: { images: { id: string; url: string; alt: string | null }[]; title: string }) {
  const [i, setI] = useState(0);
  const list = images.length ? images : [{ id: 'none', url: '', alt: title }];
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[88px_1fr]">
      <div className="order-2 flex gap-3 lg:order-1 lg:flex-col" role="tablist" aria-label="Product images">
        {list.map((img, idx) => (
          <button key={img.id} role="tab" aria-selected={idx === i} aria-label={`Image ${idx + 1}`} onClick={() => setI(idx)} className={`h-20 w-16 shrink-0 overflow-hidden rounded-2xl border-2 transition lg:h-28 lg:w-full ${idx === i ? 'border-ink' : 'border-transparent opacity-70 hover:opacity-100'}`}>
            <Img src={img.url} alt="" w={200} h={250} className="h-full w-full" />
          </button>
        ))}
      </div>
      <div className="order-1 overflow-hidden rounded-[2rem] bg-sand shadow-card lg:order-2">
        <Img key={list[i].id} src={list[i].url} alt={list[i].alt ?? title} w={1100} h={1375} priority className="rise aspect-[4/5] w-full" />
      </div>
    </div>
  );
}
