import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Crown,
  Info,
  LoaderCircle,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  UserRoundPlus,
  X,
} from 'lucide-react';
import { Purchases, type CustomerInfo, type Offering, type PurchasePackage } from '@/lib/mock-purchases';

type Message = {
  id: string;
  text: string;
  sentAt: number;
  from: 'me' | 'them';
};

type Conversation = {
  id: string;
  name: string;
  initials: string;
  color: string;
  status: string;
  unread: number;
  messages: Message[];
};

type LocalUser = { name: string; initials: string };

const CHAT_KEY = 'messenger-local-conversations-v1';
const USER_KEY = 'messenger-local-user-v1';
const MOCK_REVENUECAT_API_KEY = 'revenuecat-demo-key-not-valid';

const ago = (minutes: number) => Date.now() - minutes * 60_000;
const makeMessage = (id: string, from: Message['from'], text: string, minutes: number): Message => ({
  id,
  from,
  text,
  sentAt: ago(minutes),
});

const seedConversations = (): Conversation[] => [
  {
    id: 'mara', name: 'Mara Chen', initials: 'MC', color: '#e6b58d', status: 'Around today',
    unread: 0, messages: [
      makeMessage('mara-1', 'them', 'I found that little bookshop you mentioned. The one with the blue door.', 264),
      makeMessage('mara-2', 'me', 'On Alder? I love that place. They have the best window seat.', 258),
      makeMessage('mara-3', 'them', 'Exactly. Thought of you when I walked by this morning.', 251),
      makeMessage('mara-4', 'me', 'That made my morning, honestly.', 246),
      makeMessage('mara-5', 'them', 'Want to meet there this weekend? I owe you a coffee.', 32),
      makeMessage('mara-6', 'me', 'Only if I get to pick the pastry too.', 26),
      makeMessage('mara-7', 'them', 'Deal. Saturday, around eleven?', 19),
    ],
  },
  {
    id: 'leo', name: 'Leo Alvarez', initials: 'LA', color: '#a8c2b3', status: 'Usually replies quickly',
    unread: 2, messages: [
      makeMessage('leo-1', 'me', 'Did you get the photos from the coast?', 1450),
      makeMessage('leo-2', 'them', 'Just sent them over. The light was unreal.', 1410),
      makeMessage('leo-3', 'them', 'Also, I think we should make that a yearly thing.', 88),
      makeMessage('leo-4', 'them', 'Already looking at dates for next spring.', 82),
    ],
  },
  {
    id: 'jules', name: 'Jules Park', initials: 'JP', color: '#d4a4a7', status: 'Around today',
    unread: 0, messages: [
      makeMessage('jules-1', 'them', 'I made the soup from your recipe.', 2800),
      makeMessage('jules-2', 'me', 'How did it turn out?', 2770),
      makeMessage('jules-3', 'them', 'Ridiculously good. I added a little lemon at the end.', 2760),
      makeMessage('jules-4', 'me', 'That is the move. Saving that variation.', 31),
    ],
  },
  {
    id: 'nina', name: 'Nina Okafor', initials: 'NO', color: '#d7c17e', status: 'Usually replies quickly',
    unread: 1, messages: [
      makeMessage('nina-1', 'them', 'Are we still on for the gallery Friday?', 610),
      makeMessage('nina-2', 'me', 'Wouldn’t miss it. I can meet you there at six.', 600),
      makeMessage('nina-3', 'them', 'Perfect. There’s a new print room I want to see.', 574),
    ],
  },
  {
    id: 'sam', name: 'Sam Rivera', initials: 'SR', color: '#b2b4d0', status: 'Around today',
    unread: 0, messages: [
      makeMessage('sam-1', 'me', 'How’s the new place feeling?', 4200),
      makeMessage('sam-2', 'them', 'Like home, finally. The plants survived the move too.', 4160),
      makeMessage('sam-3', 'me', 'That is the real measure of a successful move.', 4120),
      makeMessage('sam-4', 'them', 'Couldn’t agree more.', 4050),
    ],
  },
  {
    id: 'theo', name: 'Theo Bennett', initials: 'TB', color: '#dca18b', status: 'Around today',
    unread: 0, messages: [
      makeMessage('theo-1', 'them', 'Sent you the playlist. Track five is the one I was telling you about.', 5280),
      makeMessage('theo-2', 'me', 'Listening now. This is a very good walk home soundtrack.', 5220),
      makeMessage('theo-3', 'them', 'That’s exactly how it should be used.', 5190),
    ],
  },
];

const replyBank: Record<string, string[]> = {
  mara: ['I’ll save you the window seat.', 'That sounds like a very good plan.', 'I just walked past there again. Still thinking about Saturday.', 'You always know the right thing to say.'],
  leo: ['I’ll send the rest when I get home.', 'That coast is still on my mind.', 'We should make a little photo book this time.'],
  jules: ['I’ll bring you a jar next time I make it.', 'I’m putting that in my regular rotation.', 'You have to try it with toasted bread.'],
  nina: ['I’ll see you there. Looking forward to it.', 'They said the show is really lovely in the evening.', 'I can grab us tickets ahead of time.'],
  sam: ['Come by when you have a free afternoon.', 'The neighborhood has a tiny farmers market now.', 'I’m still finding little things to love about it.'],
  theo: ['I have a few more like that if you want them.', 'It’s an old favorite of mine.', 'Glad it found the right moment.'],
};

function readChats(): Conversation[] {
  try {
    const saved = localStorage.getItem(CHAT_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Conversation[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    // A broken local cache should never prevent a fresh local session.
  }
  return seedConversations();
}

function readUser(): LocalUser | null {
  try {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) as LocalUser : null;
  } catch {
    return null;
  }
}

function initialsFrom(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function timeLabel(time: number) {
  const date = new Date(time);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function compactTime(time: number) {
  const date = new Date(time);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return date.toLocaleDateString([], { weekday: 'short' });
}

function Avatar({ initials, color, small = false, you = false }: { initials: string; color: string; small?: boolean; you?: boolean }) {
  return <div className={`avatar${small ? ' small' : ''}${you ? ' you' : ''}`} style={{ background: you ? undefined : color }}>{initials}</div>;
}

function Login({ onSignIn }: { onSignIn: (user: LocalUser) => void }) {
  const [name, setName] = useState('');
  const [avatarText, setAvatarText] = useState('');
  const [passcode, setPasscode] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !passcode.trim()) return;
    const user = { name: name.trim(), initials: avatarText.trim().slice(0, 2).toUpperCase() || initialsFrom(name) };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    onSignIn(user);
  };

  return (
    <main className="login-screen">
      <section className="login-aside">
        <div className="brand-lockup"><span className="brand-mark"><MessageCircle size={18} strokeWidth={2.5} /></span><span className="brand-name">Messenger</span></div>
        <div className="login-story">
          <div className="eyebrow">A little closer, every day</div>
          <h1>Good talks<br />live here.</h1>
          <p>A quiet place for the people you keep close. Pick up a conversation right where it feels natural.</p>
        </div>
        <div className="aside-foot">Your conversations stay on this device.</div>
      </section>
      <section className="login-main">
        <form className="login-form" onSubmit={submit}>
          <div className="eyebrow" style={{ color: '#829087' }}>Your local space</div>
          <h2>Come on in.</h2>
          <p className="subcopy">Choose how you’d like to show up. This is a private demo session on this browser.</p>
          <label className="field-label" htmlFor="display-name">Display name</label>
          <input id="display-name" className="text-field" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Rowan Ellis" autoComplete="nickname" required data-testid="input-display-name" />
          <label className="field-label" htmlFor="avatar-initials">Avatar initials <span style={{ color: '#929990', fontWeight: 400 }}>(optional)</span></label>
          <input id="avatar-initials" className="text-field" value={avatarText} onChange={(event) => setAvatarText(event.target.value.slice(0, 2))} placeholder={name ? initialsFrom(name) : 'RE'} maxLength={2} data-testid="input-avatar-initials" />
          <label className="field-label" htmlFor="demo-passcode">Demo passcode</label>
          <input id="demo-passcode" className="text-field" type="password" value={passcode} onChange={(event) => setPasscode(event.target.value)} placeholder="Anything you’ll remember" required data-testid="input-demo-passcode" />
          <div className="field-hint">Any passcode works. It’s never saved or checked.</div>
          <button type="submit" className="primary-button" data-testid="button-sign-in">Start chatting <span aria-hidden="true">→</span></button>
          <div className="demo-note">This is local sign-in for a demo, not secure account authentication. Your profile and conversations are saved only in this browser’s local storage.</div>
        </form>
      </section>
    </main>
  );
}

function App() {
  const [user, setUser] = useState<LocalUser | null>(() => readUser());
  const [conversations, setConversations] = useState<Conversation[]>(() => readChats());
  const [selectedId, setSelectedId] = useState<string | null>(() => readChats()[0]?.id ?? null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [typingId, setTypingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [mobileChat, setMobileChat] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [currentOffering, setCurrentOffering] = useState<Offering | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const isPremium = Boolean(customerInfo?.entitlements.active.premium);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setCurrentOffering(null);
      setCustomerInfo(null);
      setShowPaywall(false);
      return () => { cancelled = true; };
    }

    setCustomerInfo(null);
    Purchases.configure({
      apiKey: MOCK_REVENUECAT_API_KEY,
      appUserID: `local:${user.name.trim().toLowerCase()}`,
    });
    void Promise.all([Purchases.getOfferings(), Purchases.getCustomerInfo()])
      .then(([offerings, info]) => {
        if (cancelled) return;
        setCurrentOffering(offerings.current);
        setCustomerInfo(info);
      })
      .catch(() => {
        if (!cancelled) setToast('The local demo offering could not be loaded.');
      });

    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!showPaywall) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !purchaseBusy) setShowPaywall(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [showPaywall, purchaseBusy]);

  useEffect(() => {
    localStorage.setItem(CHAT_KEY, JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) return;
    setConversations((current) => current.map((conversation) => conversation.id === selectedId && conversation.unread ? { ...conversation, unread: 0 } : conversation));
  }, [selectedId]);

  useEffect(() => {
    if (!user) return undefined;
    let timeout = 0;
    let replyTimeout = 0;
    let cancelled = false;
    const schedule = () => {
      timeout = window.setTimeout(() => {
        if (cancelled) return;
        const chats = readChats();
        const id = Math.random() < 0.58 ? selectedRef.current : chats[Math.floor(Math.random() * chats.length)]?.id;
        const target = chats.find((chat) => chat.id === id) ?? chats[0];
        if (!target) return schedule();
        setTypingId(target.id);
        replyTimeout = window.setTimeout(() => {
          if (cancelled) return;
          const responses = replyBank[target.id] ?? ['Just wanted to say hi.', 'That sounds lovely.', 'I’ll tell you more soon.'];
          const text = responses[Math.floor(Math.random() * responses.length)];
          const message: Message = { id: `incoming-${Date.now()}-${Math.random().toString(16).slice(2)}`, text, from: 'them', sentAt: Date.now() };
          setConversations((current) => current.map((conversation) => conversation.id === target.id
            ? { ...conversation, unread: selectedRef.current === target.id ? 0 : conversation.unread + 1, messages: [...conversation.messages, message] }
            : conversation));
          setTypingId((current) => current === target.id ? null : current);
          schedule();
        }, 1400 + Math.random() * 1100);
      }, 21000 + Math.random() * 16000);
    };
    schedule();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      window.clearTimeout(replyTimeout);
      setTypingId(null);
    };
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [selectedId, selected?.messages.length, typingId]);

  const sortedConversations = useMemo(() => [...conversations].sort((a, b) => {
    const aTime = a.messages[a.messages.length - 1]?.sentAt ?? 0;
    const bTime = b.messages[b.messages.length - 1]?.sentAt ?? 0;
    return bTime - aTime;
  }), [conversations]);

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sortedConversations;
    return sortedConversations.filter((conversation) => conversation.name.toLowerCase().includes(term) || conversation.messages.some((message) => message.text.toLowerCase().includes(term)));
  }, [search, sortedConversations]);

  const visibleMessages = useMemo(() => {
    if (!selected) return [];
    const term = search.trim().toLowerCase();
    return term && !selected.name.toLowerCase().includes(term)
      ? selected.messages.filter((message) => message.text.toLowerCase().includes(term))
      : selected.messages;
  }, [search, selected]);

  const selectConversation = useCallback((id: string) => {
    setSelectedId(id);
    setMobileChat(true);
    setConversations((current) => current.map((conversation) => conversation.id === id ? { ...conversation, unread: 0 } : conversation));
  }, []);

  const sendMessage = (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || !selectedId) return;
    const message: Message = { id: `outgoing-${Date.now()}`, text, from: 'me', sentAt: Date.now() };
    setConversations((current) => current.map((conversation) => conversation.id === selectedId ? { ...conversation, messages: [...conversation.messages, message] } : conversation));
    setDraft('');
  };

  const signOut = () => {
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setMobileChat(false);
  };

  const purchasePremium = async (packageToPurchase: PurchasePackage) => {
    setPurchaseBusy(true);
    try {
      const info = await Purchases.purchasePackage(packageToPurchase);
      setCustomerInfo(info);
      setShowPaywall(false);
      setToast('Premium demo enabled on this browser. No payment was made.');
    } catch {
      setToast('The demo purchase could not be completed.');
    } finally {
      setPurchaseBusy(false);
    }
  };

  const restorePremium = async () => {
    setPurchaseBusy(true);
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      setToast(info.entitlements.active.premium
        ? 'The local Premium demo entitlement was restored.'
        : 'There is no Premium demo purchase to restore.');
    } catch {
      setToast('The demo purchase could not be restored.');
    } finally {
      setPurchaseBusy(false);
    }
  };

  if (!user) return <div className="messenger-app"><Login onSignIn={setUser} /></div>;

  return (
    <main className={`messenger-app app-shell${mobileChat ? ' mobile-chat' : ''}`}>
      <aside className="conversation-panel">
        <div className="panel-top">
          <div className="panel-brand-row">
            <div className="panel-brand"><span className="brand-mark"><MessageCircle size={16} strokeWidth={2.5} /></span>Messenger</div>
            <button className="icon-button" aria-label="Start a new conversation" title="Start a conversation" onClick={() => { setSearch(''); setToast('Choose someone below to pick up a conversation.'); }} data-testid="button-new-conversation"><UserRoundPlus size={17} /></button>
          </div>
        </div>
        <div className="user-mini">
          <Avatar initials={user.initials} color="" small you />
          <div className="user-meta"><strong data-testid="text-username">{user.name}</strong><span>Your local space</span></div>
          <button className="icon-button" onClick={signOut} aria-label="Sign out" title="Sign out" data-testid="button-sign-out"><LogOut size={16} /></button>
        </div>
        <button
          className={`premium-card${isPremium ? ' premium-card-active' : ''}`}
          type="button"
          onClick={() => setShowPaywall(true)}
          data-testid="button-upgrade-premium"
        >
          <span className="premium-card-icon"><Crown size={17} /></span>
          <span className="premium-card-copy">
            <strong>{isPremium ? 'Premium is active' : 'Upgrade to Premium'}</strong>
            <small>{isPremium ? 'Local demo entitlement' : 'See the monthly demo plan'}</small>
          </span>
          <span className="premium-card-arrow" aria-hidden="true">→</span>
        </button>
        <div className="section-head"><h2>Conversations</h2><span className="count-label">{conversations.length}</span></div>
        <div className="search-box">
          <Search size={15} />
          <input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people or messages" aria-label="Search people or messages" data-testid="input-search" />
          {search && <button type="button" className="icon-button" style={{ width: 23, height: 23 }} onClick={() => setSearch('')} aria-label="Clear search" data-testid="button-clear-search"><X size={14} /></button>}
        </div>
        <div className="conversation-list">
          {filteredConversations.map((conversation) => {
            const last = conversation.messages[conversation.messages.length - 1];
            return (
              <button key={conversation.id} className={`conversation-item${selectedId === conversation.id ? ' active' : ''}`} onClick={() => selectConversation(conversation.id)} data-testid={`button-conversation-${conversation.id}`}>
                <Avatar initials={conversation.initials} color={conversation.color} small />
                <div className="user-meta">
                  <strong>{conversation.name}</strong>
                  <span className="preview-line">{typingId === conversation.id ? 'typing…' : `${last?.from === 'me' ? 'You: ' : ''}${last?.text ?? 'Say hello'}`}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7 }}>
                  <span className="last-time">{last ? compactTime(last.sentAt) : ''}</span>
                  {conversation.unread > 0 && <span className="unread">{conversation.unread}</span>}
                </div>
              </button>
            );
          })}
          {filteredConversations.length === 0 && <div className="no-results">No conversations found.<br />Try another name or phrase.</div>}
        </div>
        <div className="panel-bottom"><i /> Mock conversations, just for you</div>
      </aside>

      <section className="chat-panel" aria-label="Conversation">
        {selected ? <>
          <header className="chat-header">
            <button className="icon-button chat-back" onClick={() => setMobileChat(false)} aria-label="Back to conversations" data-testid="button-back-conversations"><ArrowLeft size={19} /></button>
            <Avatar initials={selected.initials} color={selected.color} small />
            <div className="chat-heading"><strong data-testid="text-conversation-name">{selected.name}</strong><span>{typingId === selected.id ? 'Typing a reply…' : selected.status}</span></div>
            <div className="chat-actions">
              <button className="icon-button optional-action" aria-label="Search this conversation" title="Search conversations" onClick={() => searchRef.current?.focus()} data-testid="button-focus-search"><Search size={17} /></button>
              <button className="icon-button optional-action" aria-label="About this conversation" title="About this conversation" onClick={() => setToast('These are private, simulated messages stored only in your browser.')} data-testid="button-chat-info"><Info size={17} /></button>
              <button className="icon-button optional-action" aria-label="More conversation information" title={selected.status} onClick={() => setToast(`${selected.name} · ${selected.status}`)} data-testid="button-chat-more"><MoreHorizontal size={18} /></button>
            </div>
          </header>
          <div className="message-scroll" ref={scrollRef}>
            <div className="date-divider">{search.trim() ? `Matches for “${search.trim()}”` : 'Today, and a little earlier'}</div>
            {visibleMessages.map((message, index) => (
              <div key={message.id} className={`message-row${message.from === 'me' ? ' mine' : ''}`} data-testid={`message-${message.id}`}>
                {message.from === 'them' && <Avatar initials={selected.initials} color={selected.color} small />}
                <div className="message-content">
                  <div className="message-bubble">{message.text}</div>
                  <div className="message-time">{timeLabel(message.sentAt)}{message.from === 'me' && index === visibleMessages.length - 1 && <span style={{ marginLeft: 6, color: '#78a08d' }}><Check size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /></span>}</div>
                </div>
              </div>
            ))}
            {search.trim() && visibleMessages.length === 0 && <div className="empty-state"><div><div className="empty-ornament"><Search size={25} /></div><h2>No message matches</h2><p>Try another phrase, or clear your search to see the whole conversation.</p></div></div>}
            {typingId === selected.id && !search.trim() && <div className="typing-line"><Avatar initials={selected.initials} color={selected.color} small /><span className="typing-dots"><span /><span /><span /></span><span>{selected.name.split(' ')[0]} is writing</span></div>}
          </div>
          <div className="composer-area">
            <form className="composer" onSubmit={sendMessage}>
              <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }} placeholder={`Write to ${selected.name.split(' ')[0]}…`} rows={1} aria-label="Write a message" data-testid="input-message" />
              <button type="submit" className="send-button" aria-label="Send message" title="Send message" disabled={!draft.trim()} style={{ opacity: draft.trim() ? 1 : .58 }} data-testid="button-send-message"><Send size={17} /></button>
            </form>
            <div className="composer-hint">Enter to send <span style={{ margin: '0 5px', color: '#c4c7bd' }}>·</span> Shift + Enter for a new line</div>
          </div>
        </> : <div className="empty-state"><div><div className="empty-ornament"><Sparkles size={27} /></div><h2>A good place to begin.</h2><p>Pick a conversation on the left and say what’s on your mind.</p></div></div>}
      </section>
      {showPaywall && (
        <div
          className="paywall-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !purchaseBusy) setShowPaywall(false);
          }}
        >
          <section className="paywall-sheet" role="dialog" aria-modal="true" aria-labelledby="premium-title" data-testid="dialog-premium">
            <button className="paywall-close" type="button" onClick={() => setShowPaywall(false)} aria-label="Close Premium details" disabled={purchaseBusy} data-testid="button-close-premium">
              <X size={18} />
            </button>
            <div className="paywall-mark"><Crown size={25} /></div>
            <div className="paywall-kicker">Messenger · Premium</div>
            <h2 id="premium-title">{isPremium ? 'Premium is active.' : 'A little more, together.'}</h2>
            <p className="paywall-intro">
              {isPremium
                ? 'This browser has an active local demo entitlement.'
                : 'Preview the in-app purchase flow with a mock RevenueCat offering.'}
            </p>
            {currentOffering?.availablePackages[0] ? (
              <div className="premium-plan" data-testid="text-premium-plan">
                <span className="premium-plan-dot"><Check size={13} /></span>
                <span className="premium-plan-info">
                  <strong>{currentOffering.availablePackages[0].product.title}</strong>
                  <small>{currentOffering.availablePackages[0].product.description}</small>
                </span>
                <span className="premium-plan-price">
                  <strong>{currentOffering.availablePackages[0].product.priceString}</strong>
                  <small>/ month</small>
                </span>
              </div>
            ) : (
              <div className="premium-plan premium-plan-loading">Loading local demo offering…</div>
            )}
            <div className="premium-demo-note">
              Mock Purchases configuration only. No RevenueCat project, app store, or payment is connected; this does not charge you.
            </div>
            <button
              className="premium-purchase-button"
              type="button"
              disabled={purchaseBusy || isPremium || !currentOffering?.availablePackages[0]}
              onClick={() => {
                const packageToPurchase = currentOffering?.availablePackages[0];
                if (packageToPurchase) void purchasePremium(packageToPurchase);
              }}
              data-testid="button-purchase-premium"
            >
              {purchaseBusy
                ? <><LoaderCircle className="purchase-spinner" size={17} /> Processing demo…</>
                : isPremium ? 'Premium enabled' : 'Try demo purchase'}
            </button>
            <button className="premium-restore-button" type="button" onClick={() => void restorePremium()} disabled={purchaseBusy} data-testid="button-restore-premium">
              {purchaseBusy ? null : <RotateCcw size={14} />}
              Restore demo purchase
            </button>
            <button className="premium-back-button" type="button" onClick={() => setShowPaywall(false)} disabled={purchaseBusy}>
              Back to your conversations
            </button>
          </section>
        </div>
      )}
      {toast && <div className="toast-note" role="status" data-testid="status-toast">{toast}</div>}
    </main>
  );
}

export default App;