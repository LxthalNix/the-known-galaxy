import { useEffect, useRef, useState } from 'react';
import type { GalleryImage } from '../../types/experiment';
import { withBase } from '../../utils/paths';
import { Icon } from '../ui/Icon';

export function RecordGallery({ images, base }: { images: GalleryImage[]; base: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState(new Set<string>());
  const [failedFull, setFailedFull] = useState<string | null>(null);
  const [failedThumbnails, setFailedThumbnails] = useState(new Set<string>());
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const touchStart = useRef<number | null>(null);
  const valid = images.filter(image => !unavailable.has(image.image));
  const current = index === null ? undefined : valid[index];
  useEffect(() => {
    const dialog = dialogRef.current;
    if (current && dialog && !dialog.open) dialog.showModal();
    if (!current && dialog?.open) { dialog.close(); triggerRef.current?.focus({ preventScroll: true }); }
  }, [Boolean(current)]);
  function open(i: number, trigger: HTMLButtonElement) { triggerRef.current = trigger; setIndex(i); setFailedFull(null); }
  function close() { setIndex(null); }
  function step(direction: number) { if (index !== null) { setIndex((index + direction + valid.length) % valid.length); setFailedFull(null); } }
  if (!valid.length) return null;
  return <div className="record-gallery">
    <figure className="cover-figure"><button className="cover-image" aria-label={`View image: ${valid[0].alt}`} onClick={e => open(0, e.currentTarget)}><img src={withBase(valid[0].image, base)} alt={valid[0].alt} loading="lazy" decoding="async" onError={() => setUnavailable(new Set([...unavailable, valid[0].image]))} /><span className="image-expand"><Icon name="right" />View image</span></button>{valid[0].caption && <figcaption>{valid[0].caption}</figcaption>}</figure>
    {valid.length > 1 && <div className="gallery-filmstrip" aria-label="Additional historical images">{valid.slice(1).map((image, i) => <figure key={image.image}><button aria-label={`View image: ${image.alt}`} onClick={e => open(i + 1, e.currentTarget)}><img src={withBase(failedThumbnails.has(image.image) ? image.image : image.thumbnail ?? image.image, base)} alt={image.alt} loading="lazy" decoding="async" onError={() => { if (image.thumbnail && !failedThumbnails.has(image.image)) setFailedThumbnails(previous => new Set([...previous, image.image])); else setUnavailable(previous => new Set([...previous, image.image])); }} /></button>{image.caption && <figcaption>{image.caption}</figcaption>}</figure>)}</div>}
    <dialog ref={dialogRef} className="image-lightbox" aria-label="Historical image viewer" onCancel={close} onClose={close} onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); step(e.key === 'ArrowLeft' ? -1 : 1); } }} onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close(); } }}>
      <div className="lightbox-bar"><span>{index === null ? '' : `${index + 1} / ${valid.length}`}</span><button className="icon-button" aria-label="Close image viewer" onClick={close}><Icon name="close" /></button></div>
      {current && <figure onTouchStart={e => { touchStart.current = e.touches[0]?.clientX ?? null; }} onTouchEnd={e => { const end = e.changedTouches[0]?.clientX; if (touchStart.current !== null && end !== undefined && Math.abs(end - touchStart.current) > 45) step(end < touchStart.current ? 1 : -1); touchStart.current = null; }}>
        {failedFull === current.image ? <p role="status">This image could not be loaded.</p> : <img key={current.image} src={withBase(current.image, base)} alt={current.alt} decoding="async" onError={() => setFailedFull(current.image)} />}
        <figcaption>{current.caption ?? current.alt}</figcaption>
      </figure>}
      {valid.length > 1 && <div className="lightbox-controls"><button className="text-button" onClick={() => step(-1)}><Icon name="left" />Previous image</button><button className="text-button" onClick={() => step(1)}>Next image<Icon name="right" /></button></div>}
    </dialog>
  </div>;
}
