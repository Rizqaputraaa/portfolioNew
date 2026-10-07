'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api, copyText, fileUrl, fmtDate, fmtSize, isImage, uploadFeedFile } from './api';
import {
  ROLE_LABEL, STATUS_LABEL,
  type BriefRevision, type FeedDetail, type FeedFile, type Role, type Slide,
} from '@/lib/workspace/types';
import SmartImage from './SmartImage';
import styles from './workspace.module.css';

interface Props {
  slug: string;
  number: number;
  role: Role;
  clientEnabled: boolean;
  onClose: () => void;
  onChanged: () => void;
  onSeen?: () => void;
}

const MAX_REVISIONS = 2;

/** A file that is being uploaded right now: shown inside its slot / row so it never looks empty. */
interface PendingUpload {
  id: string;
  kind: 'brief' | 'design';
  slide?: number;
  name: string;
  previewUrl?: string;
  stage: string;
}
const emptySlide = (position: number): Slide => ({ position, headline: '', body: '' });

export default function FeedSheet({ slug, number, role, clientEnabled, onClose, onChanged, onSeen }: Props) {
  const [detail, setDetail] = useState<FeedDetail | null>(null);
  const [title, setTitle] = useState('');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [revisionNote, setRevisionNote] = useState('');
  const [showRevision, setShowRevision] = useState(false);
  const [comment, setComment] = useState('');
  const [toClient, setToClient] = useState(false);
  const [closing, setClosing] = useState(false);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [resultLabel, setResultLabel] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [zoom, setZoom] = useState<FeedFile | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [resultShareOpen, setResultShareOpen] = useState(false);
  const [revNote, setRevNote] = useState('');
  const briefInput = useRef<HTMLInputElement>(null);
  const designInput = useRef<HTMLInputElement>(null);
  const uploadSlide = useRef(1);

  // The sheet leaves the way it came in, then unmounts.
  const requestClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 230);
  }, [closing, onClose]);

  const load = useCallback(async (keepDraft = false) => {
    try {
      const d = await api<FeedDetail>(slug, `/feeds/${number}`);
      setDetail(d);
      if (!keepDraft) {
        const src = role === 'client' && d.revision ? d.revision : d;
        setTitle(src.title);
        setSlides(src.slides.length ? src.slides : [emptySlide(1)]);
        setDirty(false);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [slug, number, role]);

  useEffect(() => { load().then(() => onSeen?.()); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && requestClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose]);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    setError('');
    try {
      await fn();
      await load(label !== 'save');
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy('');
  };

  if (!detail) {
    return (
      <>
        <div className={`${styles.scrim} ${closing ? styles.closing : ''}`} onClick={requestClose} />
        <aside className={`${styles.sheet} ${closing ? styles.closing : ''}`} role="dialog" aria-label={`Feed ${number}`}>
          <div className={styles.sheetHead}>
            <div className={styles.sheetTitle}>Feed {number}</div>
            <CloseButton onClick={requestClose} />
          </div>
          <div className={styles.sheetBody}>
            {error ? <div className={styles.error}>{error}</div> : <div className={styles.empty}>Memuat…</div>}
          </div>
        </aside>
      </>
    );
  }

  if (detail.draft_hidden) {
    return (
      <>
        <div className={`${styles.scrim} ${closing ? styles.closing : ''}`} onClick={requestClose} />
        <aside className={`${styles.sheet} ${closing ? styles.closing : ''}`} role="dialog" aria-label={`Feed ${number}`}>
          <div className={styles.sheetHead}>
            <div className={styles.sheetTitle}>Feed {number}</div>
            <CloseButton onClick={requestClose} />
          </div>
          <div className={styles.sheetBody}>
            <div className={styles.empty}>
              Danta sedang menyiapkan ide dan brief untuk feed ini. Kamu akan dapat link saat sudah siap direview.
            </div>
          </div>
        </aside>
      </>
    );
  }

  const { status } = detail;
  const isTeam = role !== 'client';
  // Danta and the client edit the same brief: Danta always, the client once it is sent for review
  // (or when the client started the feed themselves). Only Danta can hand it to the designer.
  const canEditBrief = role === 'gozi'
    || (role === 'client' && (status === 'brief_review' || (detail.created_by === 'client' && status === 'brief')));
  const canUploadBrief = role === 'gozi' || (role === 'client' && status !== 'posted');
  const open = detail.version + 1; // version being worked on
  // In review the client proposes changes; Danta decides what lands in the brief.
  const clientRevising = role === 'client' && status === 'brief_review';
  const referenceLinks = detail.links.filter(l => l.kind !== 'result');
  const resultLinks = detail.links.filter(l => l.kind === 'result');
  // The designer and Danta add result links, but only once the brief has gone to the designer.
  const canAddResult = (role === 'designer' || role === 'gozi') && status !== 'brief' && status !== 'brief_review';
  const feedName = detail.title && !/^Feed \d+$/.test(detail.title) ? `Feed ${number} (${detail.title})` : `Feed ${number}`;
  const resultMessage =
    `Halo kak, hasil ${feedName} sudah selesai.\n` +
    (resultLinks.length === 1
      ? `Link hasil: ${resultLinks[0].url}`
      : `Link hasil:\n${resultLinks.map(l => `${l.label}: ${l.url}`).join('\n')}`) +
    '\nSilakan diunduh ya kak, terima kasih.';
  const working = role === 'designer' && (status === 'design' || status === 'revision');
  // NEXT_PUBLIC_SITE_URL pins the address used in shared links (e.g. https://rizqaputra.site), whichever
  // address the page was opened from. Without it, links use the address currently in the browser.
  const siteBase = (process.env.NEXT_PUBLIC_SITE_URL || (typeof window === 'undefined' ? '' : window.location.origin)).replace(/\/$/, '');
  const shareUrl = siteBase ? `${siteBase}/w/${slug}/${number}` : '';
  const shareMessage = `Halo kak, brief Feed ${number}${detail.title ? ` (${detail.title})` : ''} sudah siap direview.\n` +
    `Buka: ${shareUrl}\nMasukkan PIN workspace yang sudah dikirim sebelumnya.`;

  const briefFiles = detail.files.filter(f => f.kind === 'brief');
  const designFiles = detail.files.filter(f => f.kind === 'design');
  const versions = Array.from(new Set(designFiles.map(f => f.version as number))).sort((a, b) => b - a);
  const slideCount = Math.max(detail.slides.length, 1);
  const openHasFiles = designFiles.some(f => f.version === open);

  const updateSlide = (i: number, patch: Partial<Slide>) => {
    setSlides(prev => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
    setDirty(true);
  };

  const saveBrief = () => run('save', async () => {
    if (clientRevising) {
      await api(slug, `/feeds/${number}/revisions`, { method: 'POST', json: { title, slides, note: revNote } });
      setRevNote('');
    } else {
      await api(slug, `/feeds/${number}`, { method: 'PATCH', json: { title, slides } });
    }
  });

  const resolveRevision = (action: 'apply' | 'dismiss') =>
    run('revision', () => api(slug, `/feeds/${number}/revisions`, { method: 'PATCH', json: { action } }));

  const doAction = (action: string, extra: Record<string, unknown> = {}) =>
    run(action, () => api(slug, `/feeds/${number}/action`, { method: 'POST', json: { action, ...extra } }));

  const upload = (kind: 'brief' | 'design', files: FileList | null, slide?: number) => {
    if (!files?.length) return;
    const list = Array.from(files);
    const items: PendingUpload[] = list.map(f => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      kind, slide, name: f.name, stage: 'Menunggu…',
      // Show the picked image straight away, dimmed, while it uploads.
      previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
    }));
    setPending(p => [...p, ...items]);

    run(`upload-${kind}`, async () => {
      for (let i = 0; i < list.length; i++) {
        await uploadFeedFile(slug, number, list[i], kind, slide, stage =>
          setPending(p => p.map(x => (x.id === items[i].id ? { ...x, stage } : x))));
      }
    }).finally(() => {
      // Removed only after the list reloaded, so the slot goes straight from "uploading" to the real file.
      items.forEach(it => it.previewUrl && URL.revokeObjectURL(it.previewUrl));
      setPending(p => p.filter(x => !items.some(it => it.id === x.id)));
    });
  };

  const copyLink = async (id: string, url: string) => {
    await copyText(url);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(cur => (cur === id ? '' : cur)), 1800);
  };

  const sendComment = () => {
    const note = comment.trim();
    if (!note) return;
    run('comment', async () => {
      await api(slug, `/feeds/${number}/action`, {
        method: 'POST',
        json: { action: 'comment', note, visibility: toClient ? 'all' : 'internal' },
      });
      setComment('');
    });
  };

  const briefSection = (
    <>
      {/* ── Brief ──────────────────────────────────────────────── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Brief</h3>
        <div className={styles.group}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="ft">Judul feed</label>
            <input
              id="ft"
              className={styles.input}
              value={title}
              autoFocus={canEditBrief && /^Feed \d+$/.test(detail.title)}
              onFocus={e => { if (/^Feed \d+$/.test(e.currentTarget.value)) e.currentTarget.select(); }}
              disabled={!canEditBrief}
              onChange={e => { setTitle(e.target.value); setDirty(true); }}
            />
          </div>
        </div>

        {slides.map((s, i) => (
          <div key={i} className={styles.group}>
            <div className={styles.slideHead}>
              <span className={styles.slideNum}>Slide {i + 1}</span>
              {canEditBrief && slides.length > 1 && (
                <button
                  className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
                  onClick={() => { setSlides(prev => prev.filter((_, idx) => idx !== i)); setDirty(true); }}
                >
                  Hapus
                </button>
              )}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Headline</label>
              <input className={styles.input} value={s.headline} disabled={!canEditBrief}
                onChange={e => updateSlide(i, { headline: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Informasi utama</label>
              <ListTextarea value={s.body} disabled={!canEditBrief}
                onChange={body => updateSlide(i, { body })} />
            </div>
          </div>
        ))}

        {canEditBrief && (
          <div className={styles.actions}>
            <button
              className={`${styles.btn} ${styles.btnGhost}`}
              onClick={() => { setSlides(prev => [...prev, emptySlide(prev.length + 1)]); setDirty(true); }}
            >
              + Slide
            </button>
            <button className={styles.btn} disabled={!dirty || !!busy || !title.trim()} onClick={saveBrief}>
              {busy === 'save' ? 'Mengirim…'
                : clientRevising ? (detail.revision ? 'Perbarui revisi' : 'Kirim revisi ke Danta')
                : 'Simpan brief'}
            </button>
          </div>
        )}
      </section>

    </>
  );

  // Danta's view: exactly what the client changed, compared with the live brief.
  const changes = detail.revision ? diffBrief({ title: detail.title, slides: detail.slides }, detail.revision) : [];
  const revisionPanel = role === 'gozi' && detail.revision ? (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Revisi dari client</h3>
      <div className={styles.group}>
        <span className={`${styles.muted} ${styles.small}`}>
          Dikirim {fmtDate(detail.revision.created_at)} · {changes.length} perubahan
        </span>
        {detail.revision.note && <div className={styles.revNote}>“{detail.revision.note}”</div>}
        {changes.length === 0 && (
          <span className={`${styles.muted} ${styles.small}`}>Tidak ada beda dengan brief sekarang.</span>
        )}
        {changes.map((c, i) => (
          <div key={i} className={styles.diffRow}>
            <div className={styles.diffLabel}>{c.label}</div>
            {c.before && <div className={styles.diffBefore}>{c.before}</div>}
            <div className={styles.diffAfter}>{c.after || <i>(dikosongkan)</i>}</div>
          </div>
        ))}
        <div className={styles.actions}>
          <button className={styles.btn} disabled={!!busy || dirty} onClick={() => resolveRevision('apply')}
            title={dirty ? 'Simpan perubahanmu dulu' : ''}>
            Terapkan semua perubahan
          </button>
          <button className={`${styles.btn} ${styles.btnGhost}`} disabled={!!busy} onClick={() => resolveRevision('dismiss')}>
            Sudah saya masukkan manual
          </button>
        </div>
        <span className={`${styles.muted} ${styles.small}`}>
          Atau ubah brief di atas sesuai masukan client, simpan, lalu tekan &quot;Sudah saya masukkan manual&quot;.
        </span>
      </div>
    </section>
  ) : null;

  // Client's view: a note field while editing, and a reminder that a revision is waiting.
  const revisionStatus = clientRevising ? (
    <section className={styles.section}>
      {dirty && (
        <div className={styles.group}>
          <label className={styles.label} htmlFor="revnote">Catatan untuk Danta (opsional)</label>
          <textarea id="revnote" className={styles.textarea} rows={2} value={revNote}
            placeholder="Mis. headline slide 2 diganti karena…" onChange={e => setRevNote(e.target.value)} />
        </div>
      )}
      {detail.revision && !dirty && (
        <div className={styles.hint}>
          Revisimu sudah terkirim ke Danta ({fmtDate(detail.revision.created_at)}). Kamu bisa mengubahnya lagi
          sebelum Danta memprosesnya.
        </div>
      )}
    </section>
  ) : null;

  const materialSection = (
    <>
      {/* ── Reference links ────────────────────────────────────── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Link referensi</h3>
        <div className={styles.group}>
          {referenceLinks.length === 0 && !canUploadBrief && (
            <span className={`${styles.muted} ${styles.small}`}>Belum ada link.</span>
          )}
          {referenceLinks.map(l => (
            <div key={l.id} className={styles.fileRow}>
              <a className={`${styles.fileName} ${styles.fileLink}`} href={l.url} target="_blank" rel="noopener noreferrer">
                {l.label}
                <span className={styles.fileMeta}> · {hostOf(l.url)}</span>
              </a>
              {(role === 'gozi' || (role === 'client' && l.added_by === 'client')) && canUploadBrief && (
                <button
                  className={styles.iconBtn}
                  aria-label={`Hapus link ${l.label}`}
                  disabled={!!busy}
                  onClick={() => run('link', () => api(slug, `/feeds/${number}/links?id=${l.id}`, { method: 'DELETE' }))}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          {canUploadBrief && (
            <form
              className={styles.linkForm}
              onSubmit={e => {
                e.preventDefault();
                if (!linkUrl.trim()) return;
                run('link', async () => {
                  await api(slug, `/feeds/${number}/links`, {
                    method: 'POST', json: { label: linkLabel, url: linkUrl },
                  });
                  setLinkLabel('');
                  setLinkUrl('');
                });
              }}
            >
              <input className={styles.input} placeholder="Label (mis. Drive logo, Ref IG)" aria-label="Label link"
                value={linkLabel} onChange={e => setLinkLabel(e.target.value)} maxLength={80} />
              <input className={styles.input} placeholder="Tempel link…" aria-label="URL link" inputMode="url"
                autoCapitalize="none" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} />
              <button className={`${styles.btn} ${styles.btnTint}`} type="submit" disabled={!!busy || !linkUrl.trim()}>
                + Tambah link
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── Brief files ────────────────────────────────────────── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>File brief</h3>
        <div className={styles.group}>
          {briefFiles.length === 0 && pending.every(p => p.kind !== 'brief') && (
            <span className={`${styles.muted} ${styles.small}`}>Belum ada file.</span>
          )}
          {briefFiles.map(f => <FileRow key={f.id} slug={slug} file={f} />)}
          {pending.filter(p => p.kind === 'brief').map(p => (
            <div key={p.id} className={`${styles.fileRow} ${styles.fileRowPending}`} role="status">
              <span className={styles.spinner} aria-hidden />
              <span className={styles.fileName}>{p.name}</span>
              <span className={styles.fileMeta}>{p.stage}</span>
            </div>
          ))}
          {canUploadBrief && (
            <>
              <input ref={briefInput} type="file" multiple hidden
                onChange={e => { upload('brief', e.target.files); e.target.value = ''; }} />
              <button className={`${styles.btn} ${styles.btnTint} ${styles.btnSm}`} style={{ alignSelf: 'flex-start' }}
                disabled={!!busy} onClick={() => briefInput.current?.click()}>
                {busy === 'upload-brief' ? 'Mengunggah…' : '+ Upload file'}
              </button>
            </>
          )}
        </div>
      </section>

    </>
  );

  return (
    <>
      <div className={`${styles.scrim} ${closing ? styles.closing : ''}`} onClick={requestClose} />
      <aside className={`${styles.sheet} ${closing ? styles.closing : ''}`} role="dialog" aria-label={`Feed ${number}`}>
        <div className={styles.sheetHead}>
          <div className={styles.sheetTitle}>Feed {number}{detail.title ? ` — ${detail.title}` : ''}</div>
          <span key={status} className={`${styles.chip} ${styles.chipPop} ${styles[`s_${status}`]}`}>{STATUS_LABEL[status]}</span>
          <CloseButton onClick={requestClose} />
        </div>

        <div className={styles.sheetBody}>
          {error && <div className={styles.error} role="alert">{error}</div>}

          {/* ── Workflow actions ───────────────────────────────────── */}
          <div className={`${styles.actions} ${styles.actionBar}`}>
            {role === 'gozi' && status === 'brief' && (clientEnabled ? (
              <>
                <button className={styles.btn} disabled={!!busy || dirty}
                  onClick={async () => { await doAction('send_brief_to_client'); setShareOpen(true); }}>
                  Kirim ke client untuk review
                </button>
                <button className={`${styles.btn} ${styles.btnGhost}`} disabled={!!busy || dirty}
                  onClick={() => doAction('send_to_designer')}>
                  Langsung ke designer
                </button>
              </>
            ) : (
              <button className={styles.btn} disabled={!!busy || dirty} onClick={() => doAction('send_to_designer')}>
                Kirim ke designer
              </button>
            ))}
            {role === 'gozi' && status === 'brief_review' && (
              <>
                <button className={styles.btn} disabled={!!busy || dirty || !!detail.revision}
                  title={detail.revision ? 'Tangani revisi client dulu' : ''}
                  onClick={() => doAction('send_to_designer')}>
                  Kirim ke designer
                </button>
                <button className={`${styles.btn} ${styles.btnTint}`} onClick={() => setShareOpen(o => !o)}>
                  Bagikan link
                </button>
              </>
            )}
            {role === 'client' && status === 'brief_review' && (
              <button className={`${styles.btn} ${styles.btnGreen}`} disabled={!!busy || dirty || !!detail.revision || !!detail.brief_confirmed}
                title={detail.revision ? 'Revisimu masih menunggu Danta'
                  : detail.brief_confirmed ? 'Sudah dikonfirmasi. Aktif lagi kalau ada perubahan baru.' : ''}
                onClick={() => doAction('approve_brief')}>
                {detail.brief_confirmed ? 'Brief sudah dikonfirmasi ✓' : 'Brief sudah sesuai'}
              </button>
            )}
            {working && (
              <button
                className={styles.btn}
                disabled={!!busy || !openHasFiles}
                title={openHasFiles ? '' : 'Upload minimal 1 file desain dulu'}
                onClick={() => doAction('send_to_review')}
              >
                Kirim ke review (v{open})
              </button>
            )}
            {role === 'gozi' && status === 'review' && (
              <>
                <button className={`${styles.btn} ${styles.btnGreen}`} disabled={!!busy} onClick={() => doAction('approve')}>
                  Setujui v{detail.version}
                </button>
                <button className={`${styles.btn} ${styles.btnDanger}`} disabled={!!busy} onClick={() => setShowRevision(v => !v)}>
                  Minta revisi
                </button>
              </>
            )}
            {role === 'gozi' && (status === 'approved' || status === 'posted') && (
              <button className={styles.btn} disabled={!!busy || resultLinks.length === 0}
                title={resultLinks.length === 0 ? 'Tambahkan link hasil (Google Drive) dulu' : ''}
                onClick={() => setResultShareOpen(true)}>
                Kirim hasil ke client
              </button>
            )}
            {status === 'approved' && role !== 'designer' && (
              <button className={`${styles.btn} ${styles.btnTint}`} disabled={!!busy} onClick={() => doAction('mark_posted')}>
                Tandai sudah diposting
              </button>
            )}
            {isTeam && (
              <span className={`${styles.muted} ${styles.small}`} style={{ alignSelf: 'center' }}>
                Revisi {detail.revisions_used}/{MAX_REVISIONS}
                {detail.revisions_used >= MAX_REVISIONS && ' · batas tercapai'}
              </span>
            )}
          </div>

          {role === 'client' && status === 'brief_review' && (
            <div className={styles.hint}>
              Danta sudah menyiapkan brief ini. Cek di bawah, ubah langsung kalau ada yang kurang, atau tambah file
              dan link. Kalau sudah pas, tekan <b>Brief sudah sesuai</b>.
            </div>
          )}

          {showRevision && role === 'gozi' && status === 'review' && (
            <div className={styles.group}>
              <label className={styles.label} htmlFor="rev">Catatan revisi untuk designer</label>
              <textarea
                id="rev"
                className={styles.textarea}
                rows={3}
                value={revisionNote}
                onChange={e => setRevisionNote(e.target.value)}
                placeholder="Apa yang perlu diperbaiki?"
              />
              <div className={styles.actions}>
                <button
                  className={`${styles.btn} ${styles.btnDanger}`}
                  disabled={!!busy || !revisionNote.trim()}
                  onClick={async () => {
                    await doAction('request_revision', { note: revisionNote });
                    setRevisionNote('');
                    setShowRevision(false);
                  }}
                >
                  Kirim revisi
                </button>
              </div>
            </div>
          )}

          {briefSection}
          {revisionPanel}
          {revisionStatus}
          {materialSection}

          {/* ── Design versions ────────────────────────────────────── */}
          {(isTeam || versions.length > 0) && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>{isTeam ? 'Desain' : 'Hasil final'}</h3>
              <input ref={designInput} type="file" accept="image/*,.pdf" hidden
                onChange={e => { upload('design', e.target.files, uploadSlide.current); e.target.value = ''; }} />

              {working && (
                <VersionBlock
                  slug={slug} title={`Versi ${open} · sedang dikerjakan`} slideCount={slideCount}
                  files={designFiles.filter(f => f.version === open)}
                  canUpload busy={busy === 'upload-design'} onZoom={setZoom}
                  pending={pending.filter(p => p.kind === 'design')}
                  onPick={s => { uploadSlide.current = s; designInput.current?.click(); }}
                />
              )}

              {versions.filter(v => !(working && v === open)).map(v => (
                <VersionBlock
                  key={v} slug={slug} title={`Versi ${v}`} slideCount={slideCount}
                  files={designFiles.filter(f => f.version === v)}
                  canDownload={status === 'approved' || status === 'posted' || isTeam}
                  onZoom={setZoom}
                />
              ))}

              {!working && versions.length === 0 && (
                <div className={styles.empty}>Belum ada desain.</div>
              )}
            </section>
          )}

          {/* ── Result links ───────────────────────────────────────── */}
          {(canAddResult || resultLinks.length > 0) && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Link hasil</h3>
              <div className={styles.group}>
                {resultLinks.length === 0 && (
                  <span className={`${styles.muted} ${styles.small}`}>
                    Tempel link folder hasil akhir (Drive, dll.) supaya mudah disalin.
                  </span>
                )}
                {resultLinks.map(l => (
                  <div key={l.id} className={styles.fileRow}>
                    <span className={styles.fileName}>
                      {l.label}
                      <span className={styles.fileMeta}> · {hostOf(l.url)}</span>
                    </span>
                    <button className={styles.linkBtn} onClick={() => copyLink(l.id, l.url)}
                      aria-label={`Salin link ${l.label}`}>
                      {copiedId === l.id ? 'Tersalin ✓' : 'Salin'}
                    </button>
                    <a className={styles.fileLink} href={l.url} target="_blank" rel="noopener noreferrer">Buka</a>
                    {canAddResult && (
                      <button className={styles.iconBtn} aria-label={`Hapus link ${l.label}`} disabled={!!busy}
                        onClick={() => run('link', () => api(slug, `/feeds/${number}/links?id=${l.id}`, { method: 'DELETE' }))}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                {canAddResult && (
                  <form
                    className={styles.linkForm}
                    onSubmit={e => {
                      e.preventDefault();
                      if (!resultUrl.trim()) return;
                      run('link', async () => {
                        await api(slug, `/feeds/${number}/links`, {
                          method: 'POST', json: { kind: 'result', label: resultLabel, url: resultUrl },
                        });
                        setResultLabel('');
                        setResultUrl('');
                      });
                    }}
                  >
                    <input className={styles.input} placeholder="Label (mis. Hasil akhir, Folder Drive)" aria-label="Label link hasil"
                      value={resultLabel} onChange={e => setResultLabel(e.target.value)} maxLength={80} />
                    <input className={styles.input} placeholder="Tempel link hasil…" aria-label="URL link hasil" inputMode="url"
                      autoCapitalize="none" value={resultUrl} onChange={e => setResultUrl(e.target.value)} />
                    <button className={`${styles.btn} ${styles.btnTint}`} type="submit" disabled={!!busy || !resultUrl.trim()}>
                      + Tambah link hasil
                    </button>
                  </form>
                )}
              </div>
            </section>
          )}

          {/* ── Comments ───────────────────────────────────────────── */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Diskusi</h3>
            <div className={styles.chat}>
              {detail.comments.map((c, idx) => {
                if (c.kind === 'system') {
                  return <div key={c.id} className={styles.system}>{c.body} · {fmtDate(c.created_at)}</div>;
                }
                const mine = c.role === role;
                const cls = [
                  styles.bubble,
                  mine && c.kind === 'comment' ? styles.bubbleRight : '',
                  c.kind === 'revision' ? styles.bubbleRevision : '',
                  c.kind === 'approval' ? styles.bubbleApproval : '',
                ].join(' ');
                return (
                  <div key={c.id} className={cls}
                    style={{ ...(mine ? { alignSelf: 'flex-end' } : {}), '--i': idx } as React.CSSProperties}>
                    <div className={styles.bubbleMeta}>
                      {ROLE_LABEL[c.role as Role] ?? c.role}
                      {c.kind === 'revision' && ' · revisi'}
                      {c.kind === 'approval' && ' · disetujui'}
                      {' · '}{fmtDate(c.created_at)}
                      {isTeam && c.visibility === 'internal' && <span className={styles.internalTag}>internal</span>}
                    </div>
                    {c.body}
                  </div>
                );
              })}
              {detail.comments.length === 0 && <div className={styles.empty}>Belum ada diskusi.</div>}
            </div>

            <div className={styles.composer}>
              <textarea
                className={styles.textarea}
                rows={1}
                value={comment}
                placeholder="Tulis komentar…"
                aria-label="Komentar"
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendComment(); }}
              />
              <button className={styles.btn} disabled={!comment.trim() || !!busy} onClick={sendComment}>Kirim</button>
            </div>
            {role === 'gozi' && (
              <label className={`${styles.muted} ${styles.small}`} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={toClient} onChange={e => setToClient(e.target.checked)} />
                Tampilkan komentar ini ke client
              </label>
            )}
          </section>
        </div>
      </aside>

      {shareOpen && role === 'gozi' && (
        <SharePopup
          title="Bagikan ke client"
          hint="Client membuka link ini, memasukkan PIN, lalu langsung melihat brief feed ini. PIN tidak ikut di link."
          message={shareMessage}
          url={shareUrl}
          onClose={() => setShareOpen(false)}
        />
      )}

      {resultShareOpen && role === 'gozi' && (
        <SharePopup
          title="Kirim hasil ke client"
          hint="Salin pesan ini lalu tempel di WhatsApp ke client, atau tekan tombol WhatsApp. Isinya link hasil Google Drive."
          message={resultMessage}
          url={resultLinks[0]?.url ?? ''}
          onClose={() => setResultShareOpen(false)}
        />
      )}

      {zoom && (
        <div className={styles.lightbox} onClick={() => setZoom(null)} role="dialog" aria-label="Pratinjau desain">
          <SmartImage mode="flow" src={fileUrl(slug, zoom.id)} alt={zoom.file_name} onClick={e => e.stopPropagation()} />
          <div className={styles.lightboxBar} onClick={e => e.stopPropagation()}>
            <span className={`${styles.small} ${styles.muted}`}>
              {zoom.file_name}{zoom.size_bytes ? ` · asli ${fmtSize(zoom.size_bytes)}` : ''}
            </span>
            {(status === 'approved' || status === 'posted' || isTeam) && (
              <a className={`${styles.btn} ${styles.btnSm}`} style={{ display: 'inline-flex', alignItems: 'center' }}
                href={fileUrl(slug, zoom.id, true)}>Unduh asli</a>
            )}
            <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => setZoom(null)}>Tutup</button>
          </div>
        </div>
      )}
    </>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button className={styles.iconBtn} onClick={onClick} aria-label="Tutup">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  );
}

const hostOf = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
};

type Kind = 'image' | 'pdf' | 'docx' | 'other';
const kindOf = (f: FeedFile): Kind =>
  isImage(f.mime_type, f.file_name) ? 'image'
  : /\.pdf$/i.test(f.file_name) ? 'pdf'
  : /\.docx$/i.test(f.file_name) ? 'docx'
  : 'other';

/** Brief file row: tap to read it right here (image / PDF / Word) — no download needed. */
function FileRow({ slug, file }: { slug: string; file: FeedFile }) {
  const kind = kindOf(file);
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open || kind !== 'docx' || html !== null) return;
    api<{ html: string }>(slug, `/files/${file.id}/preview`)
      .then(r => setHtml(r.html))
      .catch(e => setErr((e as Error).message));
  }, [open, kind, html, slug, file.id]);

  return (
    <div>
      <div className={styles.fileRow}>
        <span className={styles.fileName}>{file.file_name}</span>
        <span className={styles.fileMeta}>{fmtSize(file.size_bytes)}</span>
        {kind !== 'other' && (
          <button className={styles.linkBtn} onClick={() => setOpen(o => !o)} aria-expanded={open}>
            {open ? 'Tutup' : 'Lihat'}
          </button>
        )}
        <a className={styles.fileLink} href={fileUrl(slug, file.id, true)}>Unduh</a>
      </div>

      {open && (
        <div className={styles.viewer}>
          {kind === 'image' && <SmartImage mode="flow" src={fileUrl(slug, file.id)} alt={file.file_name} />}
          {kind === 'pdf' && (
            <>
              <iframe src={fileUrl(slug, file.id)} title={file.file_name} className={styles.viewerFrame} />
              <a className={styles.fileLink} href={fileUrl(slug, file.id)} target="_blank" rel="noopener noreferrer">
                Buka di tab baru
              </a>
            </>
          )}
          {kind === 'docx' && (
            err ? <span className={styles.error}>{err}</span>
            : html === null ? <span className={`${styles.muted} ${styles.small}`}>Memuat dokumen…</span>
            : (
              // Sandboxed with no permissions: the converted HTML can never run scripts.
              <iframe
                sandbox=""
                title={file.file_name}
                className={styles.viewerFrame}
                srcDoc={`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:15px/1.5 -apple-system,system-ui,sans-serif;color:#fff;background:#1c1c1e;margin:12px;overflow-wrap:anywhere}a{color:#0a84ff}img{max-width:100%}table{border-collapse:collapse}td,th{border:1px solid #48484a;padding:4px 8px}p{margin:0 0 10px}</style>${html}`}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function VersionBlock({
  slug, title, slideCount, files, canUpload, canDownload, busy, onPick, onZoom, pending,
}: {
  slug: string; title: string; slideCount: number; files: FeedFile[];
  canUpload?: boolean; canDownload?: boolean; busy?: boolean;
  onPick?: (slide: number) => void; onZoom?: (file: FeedFile) => void;
  pending?: PendingUpload[];
}) {
  return (
    <div className={styles.group}>
      <div className={styles.versionTitle}><span className={styles.slideNum}>{title}</span></div>
      <div className={styles.thumbs}>
        {Array.from({ length: slideCount }, (_, i) => i + 1).map(slide => {
          const f = files.find(x => x.slide === slide);
          const up = pending?.find(x => x.slide === slide);
          if (up) {
            // The card itself shows the upload: the picked image (dimmed), a spinner and the current step.
            return (
              <div key={slide} className={`${styles.thumb} ${styles.thumbPending}`} role="status" aria-live="polite">
                {up.previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={up.previewUrl} alt="" />
                )}
                <span className={styles.thumbTag}>Slide {slide}</span>
                <div className={styles.uploadOverlay}>
                  <span className={`${styles.spinner} ${styles.spinnerLg}`} aria-hidden />
                  <span className={styles.uploadStage}>{up.stage}</span>
                </div>
                <span className={styles.indeterminate} aria-hidden />
              </div>
            );
          }
          if (f) {
            return (
              <div key={slide} className={styles.thumb}>
                {isImage(f.mime_type, f.file_name)
                  ? <SmartImage src={fileUrl(slug, f.id)} alt={`Slide ${slide}`} />
                  : <span>{f.file_name}</span>}
                <span className={styles.thumbTag}>Slide {slide}</span>
                {onZoom && isImage(f.mime_type, f.file_name) && (
                  <button className={styles.thumbZoom} onClick={() => onZoom(f)} aria-label={`Perbesar slide ${slide}`} />
                )}
                {canDownload && <a className={styles.thumbDl} href={fileUrl(slug, f.id, true)}>Unduh asli</a>}
                {canUpload && (
                  <button className={styles.thumbDl} style={{ border: 'none', cursor: 'pointer' }}
                    onClick={() => onPick?.(slide)}>Ganti</button>
                )}
              </div>
            );
          }
          return canUpload ? (
            <button key={slide} className={`${styles.thumb} ${styles.thumbUpload}`} disabled={busy}
              onClick={() => onPick?.(slide)}>
              <span>+</span><span>Slide {slide}</span>
            </button>
          ) : (
            <div key={slide} className={styles.thumb}>Slide {slide}</div>
          );
        })}
      </div>
    </div>
  );
}

/** Popup with a ready-to-send message: copy it, open WhatsApp with it, or use the phone's share sheet. */
function SharePopup({ title, hint, message, url, onClose }: {
  title: string; hint: string; message: string; url: string; onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copy = async () => {
    await copyText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={styles.modalScrim} onClick={onClose}>
      <div className={styles.modal} role="dialog" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className={styles.group}>
          <div className={styles.slideHead}>
            <span className={styles.slideNum}>{title}</span>
            <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={onClose}>Tutup</button>
          </div>
          <span className={`${styles.muted} ${styles.small}`}>{hint}</span>
          <textarea className={styles.textarea} readOnly rows={5} value={message} aria-label="Pesan untuk client"
            onFocus={e => e.currentTarget.select()} />
          <div className={styles.actions}>
            <button className={styles.btn} onClick={copy}>{copied ? 'Tersalin ✓' : 'Salin pesan'}</button>
            <a className={`${styles.btn} ${styles.btnTint}`} style={{ display: 'inline-flex', alignItems: 'center' }}
              href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
            {canShare && (
              <button className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => navigator.share({ text: message, url: url || undefined }).catch(() => {})}>
                Bagikan…
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface Change { label: string; before: string; after: string }

const FIELD_LABEL: Record<'headline' | 'body', string> = {
  headline: 'Headline', body: 'Informasi utama',
};

/** Field-by-field comparison of the live brief and the client's proposal. */
function diffBrief(
  live: { title: string; slides: Slide[] },
  proposed: Pick<BriefRevision, 'title' | 'slides'>,
): Change[] {
  const out: Change[] = [];
  if (live.title.trim() !== proposed.title.trim()) {
    out.push({ label: 'Judul feed', before: live.title, after: proposed.title });
  }
  const count = Math.max(live.slides.length, proposed.slides.length);
  for (let i = 0; i < count; i++) {
    const a = live.slides[i];
    const b = proposed.slides[i];
    if (a && !b) {
      out.push({ label: `Slide ${i + 1}`, before: [a.headline, a.body].filter(Boolean).join(' — ') || '(kosong)', after: '(slide dihapus)' });
      continue;
    }
    for (const f of ['headline', 'body'] as const) {
      const before = (a?.[f] ?? '').trim();
      const after = (b?.[f] ?? '').trim();
      if (before !== after) {
        out.push({ label: `Slide ${i + 1} · ${FIELD_LABEL[f]}${a ? '' : ' (slide baru)'}`, before, after });
      }
    }
  }
  return out;
}

const BULLET_RE = /^(\s*)•\s/;
const NUMBER_RE = /^(\s*)(\d+)\.\s/;

/** "- item" and "* item" become real bullets, so pasted lists look right too. */
const normalizeBullets = (t: string) => t.replace(/^(\s*)[-*]\s/gm, '$1• ');

/**
 * Textarea with list support: bullet / numbered buttons, Enter continues the list,
 * Enter on an empty item ends it. Stored as plain text ("• item", "1. item"), so it
 * pastes cleanly into Figma, WhatsApp or Word.
 */
function ListTextarea({ value, onChange, disabled }: {
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const selection = useRef<[number, number] | null>(null);

  // Grow with the content and restore the caret after list edits.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight + 2, 96)}px`;
    if (selection.current) {
      el.setSelectionRange(selection.current[0], selection.current[1]);
      selection.current = null;
    }
  }, [value]);

  const commit = (next: string, start: number, end = start) => {
    selection.current = [start, end];
    onChange(next);
  };

  const toggleList = (kind: 'bullet' | 'number') => {
    const el = ref.current;
    if (!el) return;
    const from = value.lastIndexOf('\n', el.selectionStart - 1) + 1;
    const nl = value.indexOf('\n', el.selectionEnd);
    const to = nl === -1 ? value.length : nl;
    const lines = value.slice(from, to).split('\n');

    const marker = kind === 'bullet' ? BULLET_RE : NUMBER_RE;
    const filled = lines.filter(l => l.trim());
    const allMarked = filled.length > 0 && filled.every(l => marker.test(l));
    const strip = (l: string) => l.replace(BULLET_RE, '$1').replace(NUMBER_RE, '$1');

    let n = 0;
    const next = lines.map(l => {
      if (!l.trim()) return l;
      const bare = strip(l);
      if (allMarked) return bare;
      return kind === 'bullet' ? `• ${bare.trimStart()}` : `${++n}. ${bare.trimStart()}`;
    }).join('\n');

    const updated = value.slice(0, from) + next + value.slice(to);
    commit(updated, from, from + next.length);
    el.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    const el = e.currentTarget;
    if (el.selectionStart !== el.selectionEnd) return;
    const pos = el.selectionStart;
    const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
    const lineEndIdx = value.indexOf('\n', pos);
    const line = value.slice(lineStart, lineEndIdx === -1 ? value.length : lineEndIdx);

    const bullet = line.match(BULLET_RE);
    const number = line.match(NUMBER_RE);
    const m = bullet ?? number;
    if (!m) return;

    e.preventDefault();
    if (!line.slice(m[0].length).trim()) {
      // Empty item: Enter ends the list.
      commit(value.slice(0, lineStart) + value.slice(lineStart + m[0].length), lineStart);
      return;
    }
    const next = bullet ? `${m[1]}• ` : `${m[1]}${Number(number![2]) + 1}. `;
    const insert = `\n${next}`;
    commit(value.slice(0, pos) + insert + value.slice(pos), pos + insert.length);
  };

  return (
    <div className={styles.listEditor}>
      {!disabled && (
        <div className={styles.listBar}>
          <button type="button" className={styles.listBtn} onMouseDown={e => e.preventDefault()}
            onClick={() => toggleList('bullet')} aria-label="Daftar poin" title="Daftar poin">
            • Poin
          </button>
          <button type="button" className={styles.listBtn} onMouseDown={e => e.preventDefault()}
            onClick={() => toggleList('number')} aria-label="Daftar nomor" title="Daftar nomor">
            1. Nomor
          </button>
        </div>
      )}
      <textarea
        ref={ref}
        className={styles.textarea}
        value={value}
        disabled={disabled}
        onKeyDown={onKeyDown}
        onChange={e => {
          selection.current = [e.target.selectionStart, e.target.selectionEnd];
          onChange(normalizeBullets(e.target.value));
        }}
      />
    </div>
  );
}
