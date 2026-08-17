'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Ticket, Copy, Check, QrCode, Trash2, Loader2, Plus } from 'lucide-react';
import type { EventInvite } from '@/types/database';

interface EventInvitesProps {
  eventId: string;
}

export default function EventInvites({ eventId }: EventInvitesProps) {
  const [invites, setInvites] = useState<EventInvite[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [qrOpenFor, setQrOpenFor] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [eventId]);

  async function load() {
    const res = await fetch(`/api/admin/event-access?eventId=${eventId}`);
    const data = await res.json();
    setInvites(data.invites ?? []);
  }

  function inviteUrl(token: string) {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/convite/${token}`;
  }

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/event-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, label }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao criar convite.');
      setInvites((prev) => [data.invite, ...(prev ?? [])]);
      setLabel('');
    } catch (err: any) {
      setError(err.message ?? 'Erro inesperado.');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    const confirmed = window.confirm('Revogar este convite? Quem já tiver o link deixa de conseguir acessar.');
    if (!confirmed) return;

    const res = await fetch('/api/admin/event-access', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_revoked: true }),
    });
    const data = await res.json();
    if (res.ok) {
      setInvites((prev) => prev?.map((i) => (i.id === id ? data.invite : i)) ?? prev);
    }
  }

  async function handleCopy(token: string, id: string) {
    await navigator.clipboard.writeText(inviteUrl(token));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function handleShowQr(token: string) {
    const url = inviteUrl(token);
    const dataUrl = await QRCode.toDataURL(url, {
      width: 320,
      margin: 1,
      color: { dark: '#1e1b4b', light: '#ffffff' },
    });
    setQrDataUrl(dataUrl);
    setQrOpenFor(token);
  }

  return (
    <div className="rounded-3xl bg-white shadow-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="h-8 w-8 rounded-xl bg-brand-gradient flex items-center justify-center shrink-0">
          <Ticket size={15} className="text-white" />
        </span>
        <span className="text-sm font-bold text-slate-900">Convites de acesso</span>
      </div>
      <p className="text-sm text-slate-500 mt-2 mb-4">
        Só quem tiver um destes links (ou escanear o QR Code) consegue ver a programação deste evento.
      </p>

      <div className="flex gap-2 mb-4">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Rótulo opcional (ex: Turma A)"
          className="flex-1 text-sm px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-fuchsia-400 outline-none transition-colors placeholder:text-slate-300"
        />
        <button
          onClick={handleCreate}
          disabled={creating}
          className="shrink-0 h-11 px-4 rounded-xl bg-brand-gradient text-white text-sm font-bold flex items-center gap-1.5 shadow-glow active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          Gerar link
        </button>
      </div>

      {error && <p className="text-sm text-rose-500 mb-3">{error}</p>}

      <div className="flex flex-col gap-2">
        {invites?.map((invite) => (
          <div
            key={invite.id}
            className={[
              'flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3',
              invite.is_revoked ? 'border-slate-100 opacity-50' : 'border-slate-100',
            ].join(' ')}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{invite.label || 'Convite geral'}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {invite.use_count} acesso{invite.use_count === 1 ? '' : 's'}
                {invite.is_revoked ? ' · revogado' : ''}
              </p>
            </div>
            {!invite.is_revoked && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleShowQr(invite.token)}
                  className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-violet-600 transition-colors"
                  aria-label="Mostrar QR Code"
                >
                  <QrCode size={15} />
                </button>
                <button
                  onClick={() => handleCopy(invite.token, invite.id)}
                  className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-violet-600 transition-colors"
                  aria-label="Copiar link"
                >
                  {copiedId === invite.id ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                </button>
                <button
                  onClick={() => handleRevoke(invite.id)}
                  className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
                  aria-label="Revogar convite"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>
        ))}

        {invites?.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">Nenhum convite gerado ainda.</p>
        )}
      </div>

      {qrOpenFor && qrDataUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          onClick={() => setQrOpenFor(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 shadow-2xl max-w-xs w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR Code do convite" className="w-full rounded-2xl" />
            <p className="text-xs text-slate-400 mt-3 break-all">{inviteUrl(qrOpenFor)}</p>
            <button
              onClick={() => setQrOpenFor(null)}
              className="mt-4 w-full h-11 rounded-2xl bg-slate-900 text-white text-sm font-semibold"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
