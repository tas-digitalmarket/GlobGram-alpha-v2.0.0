import { useMemo, useState } from 'react'
import { useChatStore } from '../state/chatStore'
import { useContactStore } from '../state/contactStore'
import { nip19 } from 'nostr-tools'
import { bytesToHex } from '../nostr/utils'
import { QRScan } from './QRScan'

export function ChatList() {
  const conversations = useChatStore(s => s.conversations)
  const selected = useChatStore(s => s.selectedPeer)
  const selectPeer = useChatStore(s => s.selectPeer)
  const [newPeer, setNewPeer] = useState('')
  const [qrOpen, setQrOpen] = useState(false)
  const aliases = useContactStore(s => s.aliases)
  const setAlias = useContactStore(s => s.setAlias)
  const lastRead = useChatStore(s => s.lastRead)

  const peers = useMemo(() => {
    const keys = Object.keys(conversations)
    return keys.sort((a, b) => {
      const la = conversations[a]?.[conversations[a].length - 1]?.ts ?? 0
      const lb = conversations[b]?.[conversations[b].length - 1]?.ts ?? 0
      return lb - la
    })
  }, [conversations])

  return (
    <aside style={{ width: 300, borderRight: '1px solid #eee', padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>Chats</h3>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input placeholder="start chat: pubkey hex or npub" value={newPeer} onChange={(e) => setNewPeer(e.target.value)} style={{ flex: 1 }} />
        <button onClick={() => {
          let pk = newPeer.trim()
          if (!pk) return
          try {
            if (pk.startsWith('npub')) {
              const dec = nip19.decode(pk)
              pk = typeof dec.data === 'string' ? dec.data : bytesToHex(dec.data as Uint8Array)
            }
          } catch {}
          if (!/^[0-9a-fA-F]{64}$/.test(pk)) { alert('Invalid pubkey'); return }
          selectPeer(pk)
          setNewPeer('')
        }}>Start</button>
        <button title="Scan QR" onClick={() => setQrOpen(true)}>📷</button>
      </div>
      {qrOpen && (
        <QRScan onResult={(text) => {
          setQrOpen(false)
          try {
            if (text.startsWith('npub')) {
              const dec = nip19.decode(text)
              const pk = typeof dec.data === 'string' ? dec.data : bytesToHex(dec.data as Uint8Array)
              if (/^[0-9a-fA-F]{64}$/.test(pk)) selectPeer(pk)
            }
          } catch {}
        }} onClose={() => setQrOpen(false)} />
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {peers.length === 0 && (
          <li style={{ color: '#777', fontSize: 12 }}>No chats yet</li>
        )}
        {peers.map(pk => {
      const msgs = conversations[pk]
          const last = msgs[msgs.length - 1]
          const name = aliases[pk]
      const unread = msgs.filter(m => m.ts > (lastRead[pk] || 0)).length
          return (
            <li key={pk} style={{ padding: '8px 6px', cursor: 'pointer', background: selected===pk? '#f5f5f5': undefined }} onClick={() => selectPeer(pk)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: name ? 'inherit' : 'monospace', fontSize: 12 }}>{name || `${pk.slice(0, 10)}…`}</div>
        {unread > 0 && <span style={{ background: '#1976d2', color: '#fff', borderRadius: 999, padding: '0 6px', fontSize: 11 }}>{unread}</span>}
                <button title="edit alias" onClick={(e) => { e.stopPropagation(); const v = prompt('Alias for contact:', name || ''); if (v !== null) setAlias(pk, v) }}>✏️</button>
              </div>
              {last && (
                <div style={{ color: '#666', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {last.text ||
                    (last.attachments && last.attachments.length > 0
                      ? `[${last.attachments.map(a => a.startsWith('data:image/') ? 'image' : a.startsWith('data:video/') ? 'video' : 'audio').join(', ')}]`
                      : (last.attachment?.startsWith('data:image/') ? '[image]' : last.attachment?.startsWith('data:video/') ? '[video]' : last.attachment ? '[audio]' : ''))}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
