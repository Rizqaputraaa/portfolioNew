'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, fileUrl, fmtDate, fmtSize, isImage, uploadFeedFile } from './api';
import {
  MAX_SLIDES, ROLE_LABEL, STATUS_LABEL,
  type BriefRevision, type FeedDetail, type FeedFile, type Role, type Slide,
} from '@/lib/workspace/types';
import styles from './workspace.module.css';

interface Props {
  slug: string;
  number: number;
  role: Role;
  onClose: () => void;
  onChanged: () => void;
  onSeen?: () => void;
}

const MAX_REVISIONS = 2;
const emptySlide = (position: number): Slide => ({ position, headline: '', body: '', highlight: '' });

export default function FeedSheet({ slug, number, role, onClose, onChanged, onSeen }: Props) {
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
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [zoom, setZoom] = useState<FeedFile | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [revNote, setRevNote] = useState('');
  const [copied, setCopied] = useState(false);
  const briefInput = useRef<HTMLInputElement>(null);
  const designInput = useRef<HTMLInputElement>(null);
  const uploadSlide = useRef(1);

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
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
        <div className={styles.scrim} onClick={onClose} />
        <aside className={styles.sheet} role="dialog" aria-label={`Feed ${number}`}>
          <div className={styles.sheetHead}>
            <div className={styles.sheetTitle}>Feed {number}</div>
            <CloseButton onClick={onClose} />
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
        <div className={styles.scrim} onClick={onClose} />
        <aside className={styles.sheet} role="dialog" aria-label={`Feed ${number}`}>
          <div className={styles.sheetHead}>
            <div className={styles.sheetTitle}>Feed {number}</div>
            <CloseButton onClick={onClose} />
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
    run(`upload-${kind}`, async () => {
      for (const file of Array.from(files)) await uploadFeedFile(slug, number, file, kind, slide);
    });
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
              <textarea className={styles.textarea} rows={4} value={s.body} disabled={!canEditBrief}
                onChange={e => updateSlide(i, { body: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Highlight</label>
              <input className={styles.input} value={s.highlight} disabled={!canEditBrief}
                onChange={e => updateSlide(i, { highlight: e.target.value })} />
            </div>
          </div>
        ))}

        {canEditBrief && (
          <div className={styles.actions}>
            <button
              className={`${styles.btn} ${styles.btnGhost}`}
              disabled={slides.length >= MAX_SLIDES}
              onClick={() => { setSlides(prev => [...prev, emptySlide(prev.length + 1)]); setDirty(true); }}
            >
              + Slide ({slides.length}/{MAX_SLIDES})
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
          {detail.links.length === 0 && !canUploadBrief && (
            <span className={`${styles.muted} ${styles.small}`}>Belum ada link.</span>
          )}
          {detail.links.map(l => (
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
          {briefFiles.length === 0 && <span className={`${styles.muted} ${styles.small}`}>Belum ada file.</span>}
          {briefFiles.map(f => <FileRow key={f.id} slug={slug} file={f} />)}
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
      <div className={styles.scrim} onClick={onClose} />
      <aside className={styles.sheet} role="dialog" aria-label={`Feed ${number}`}>
        <div className={styles.sheetHead}>
          <div className={styles.sheetTitle}>Feed {number}{detail.title ? ` — ${detail.title}` : ''}</div>
          <span className={`${styles.chip} ${styles[`s_${status}`]}`}>{STATUS_LABEL[status]}</span>
          <CloseButton onClick={onClose} />
        </div>

        <div className={styles.sheetBody}>
          {error && <div className={styles.error} role="alert">{error}</div>}

          {/* ── Workflow actions ───────────────────────────────────── */}
          <div className={`${styles.actions} ${styles.actionBar}`}>
            {role === 'gozi' && status === 'brief' && (
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
            )}
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

          {/* ── Comments ───────────────────────────────────────────── */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Diskusi</h3>
            <div className={styles.chat}>
              {detail.comments.map(c => {
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
                  <div key={c.id} className={cls} style={mine ? { alignSelf: 'flex-end' } : undefined}>
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
        <div className={styles.modalScrim} onClick={() => setShareOpen(false)}>
          <div className={styles.modal} role="dialog" aria-label="Bagikan ke client" onClick={e => e.stopPropagation()}>
            <ShareBox
              url={shareUrl}
              message={shareMessage}
              copied={copied}
              onCopy={async () => {
                try {
                  await navigator.clipboard.writeText(shareMessage);
                } catch {
                  // Clipboard can be blocked (insecure origin / permissions): fall back to the old way.
                  const ta = document.createElement('textarea');
                  ta.value = shareMessage;
                  document.body.appendChild(ta);
                  ta.select();
                  document.execCommand('copy');
                  ta.remove();
                }
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              onClose={() => setShareOpen(false)}
            />
          </div>
        </div>
      )}

      {zoom && (
        <div className={styles.lightbox} onClick={() => setZoom(null)} role="dialog" aria-label="Pratinjau desain">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fileUrl(slug, zoom.id)} alt={zoom.file_name} onClick={e => e.stopPropagation()} />
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
          {kind === 'image' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl(slug, file.id)} alt={file.file_name} />
          )}
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
  slug, title, slideCount, files, canUpload, canDownload, busy, onPick, onZoom,
}: {
  slug: string; title: string; slideCount: number; files: FeedFile[];
  canUpload?: boolean; canDownload?: boolean; busy?: boolean;
  onPick?: (slide: number) => void; onZoom?: (file: FeedFile) => void;
}) {
  return (
    <div className={styles.group}>
      <div className={styles.versionTitle}><span className={styles.slideNum}>{title}</span></div>
      <div className={styles.thumbs}>
        {Array.from({ length: slideCount }, (_, i) => i + 1).map(slide => {
          const f = files.find(x => x.slide === slide);
          if (f) {
            return (
              <div key={slide} className={styles.thumb}>
                {isImage(f.mime_type, f.file_name)
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={fileUrl(slug, f.id)} alt={`Slide ${slide}`} loading="lazy" />
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

function ShareBox({
  url, message, copied, onCopy, onClose,
}: { url: string; message: string; copied: boolean; onCopy: () => void; onClose: () => void }) {
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  return (
    <div className={styles.group}>
      <div className={styles.slideHead}>
        <span className={styles.slideNum}>Bagikan ke client</span>
        <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={onClose}>Tutup</button>
      </div>
      <span className={`${styles.muted} ${styles.small}`}>
        Client membuka link ini, memasukkan PIN, lalu langsung melihat brief feed ini. PIN tidak ikut di link.
      </span>
      <textarea className={styles.textarea} readOnly rows={4} value={message} aria-label="Pesan untuk client"
        onFocus={e => e.currentTarget.select()} />
      <div className={styles.actions}>
        <button className={styles.btn} onClick={onCopy}>{copied ? 'Tersalin ✓' : 'Salin pesan'}</button>
        <a className={`${styles.btn} ${styles.btnTint}`} style={{ display: 'inline-flex', alignItems: 'center' }}
          href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
        {canShare && (
          <button className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => navigator.share({ text: message, url }).catch(() => {})}>
            Bagikan…
          </button>
        )}
      </div>
    </div>
  );
}

interface Change { label: string; before: string; after: string }

const FIELD_LABEL: Record<'headline' | 'body' | 'highlight', string> = {
  headline: 'Headline', body: 'Informasi utama', highlight: 'Highlight',
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
    for (const f of ['headline', 'body', 'highlight'] as const) {
      const before = (a?.[f] ?? '').trim();
      const after = (b?.[f] ?? '').trim();
      if (before !== after) {
        out.push({ label: `Slide ${i + 1} · ${FIELD_LABEL[f]}${a ? '' : ' (slide baru)'}`, before, after });
      }
    }
  }
  return out;
}
