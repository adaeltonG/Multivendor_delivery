import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import {
  ApolloError,
  useMutation,
  useQuery,
  useSubscription
} from '@apollo/client'
import {
  CLOSE,
  CONVERSATION_UPDATED,
  CONVERSATIONS,
  MARK_READ,
  MESSAGE_ADDED,
  MESSAGES,
  RESTAURANT_LOGIN,
  RELEASE,
  SEND,
  TAKE_OVER
} from './graphql'
import type {
  Conversation,
  ConversationStatus,
  WhatsAppMessage
} from './types'

type QueueFilter = 'ALL' | ConversationStatus

const filters: Array<{ label: string; value: QueueFilter }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Bot', value: 'BOT' },
  { label: 'Manual', value: 'MANUAL' },
  { label: 'Closed', value: 'CLOSED' }
]

const toInitials = (name?: string | null) =>
  (name || 'WhatsApp customer')
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

const formatTime = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short'
  }).format(date)
}

const formatDateMarker = (value: string) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  }).format(new Date(value))

const money = (value?: number | null) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(value || 0)

function Icon({
  name,
  size = 18
}: {
  name: 'search' | 'send' | 'info' | 'back' | 'close' | 'refresh' | 'note'
  size?: number
}) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6" /><path d="M12 7h.01" /></>,
    back: <><path d="m15 18-6-6 6-6" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    refresh: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M6.1 8a7 7 0 0 1 11.7-2.1L20 8M4 16l2.2 2.1A7 7 0 0 0 18 16" /></>,
    note: <><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h8M8 16h5" /></>
  }
  return (
    <svg
      aria-hidden="true"
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

function AuthRequired() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [login, loginState] = useMutation<{ restaurantLogin: { token: string } }>(
    RESTAURANT_LOGIN
  )

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const result = await login({
      variables: { username: username.trim(), password }
    })
    const token = result.data?.restaurantLogin.token
    if (token) {
      localStorage.setItem('nexthop_token', token)
      window.location.reload()
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-mark">
          <img src="./nexthop-logo.png" alt="" />
        </div>
        <p className="eyebrow">NextHop operations</p>
        <h1 id="auth-title">Your service desk is locked.</h1>
        <p>
          Use your restaurant account to access customer messages, baskets and
          live order details.
        </p>
        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <label>
            <span>Restaurant username</span>
            <input
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="restaurant@example.com"
              required
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              required
            />
          </label>
          {loginState.error && (
            <p className="auth-error" role="alert">
              Sign-in failed. Check your restaurant username and password.
            </p>
          )}
          <button className="primary-button" disabled={loginState.loading}>
            {loginState.loading ? 'Opening service desk…' : 'Sign in to inbox'}
          </button>
        </form>
        <div className="auth-help">
          <strong>Shared service terminal?</strong>
          <span>Sign out when your shift ends. Passwords are never stored in this app.</span>
        </div>
        <p className="auth-footnote">Secure NextHop restaurant session</p>
      </section>
    </main>
  )
}

function SkeletonQueue() {
  return (
    <div className="skeleton-list" aria-label="Loading conversations">
      {[1, 2, 3, 4, 5].map((item) => (
        <div className="skeleton-ticket" key={item}>
          <span className="skeleton avatar-skeleton" />
          <div>
            <span className="skeleton line long" />
            <span className="skeleton line short" />
          </div>
        </div>
      ))}
    </div>
  )
}

function QueueError({ error, retry }: { error: ApolloError; retry: () => void }) {
  return (
    <div className="queue-message" role="alert">
      <span className="queue-message-icon"><Icon name="refresh" /></span>
      <strong>Conversation rail unavailable</strong>
      <p>{error.message || 'The inbox could not reach NextHop.'}</p>
      <button className="text-button" onClick={retry}>Try again</button>
    </div>
  )
}

function ConversationTicket({
  conversation,
  active,
  onSelect
}: {
  conversation: Conversation
  active: boolean
  onSelect: () => void
}) {
  const name = conversation.customerName || 'WhatsApp customer'
  return (
    <button
      className={`conversation-ticket ${active ? 'active' : ''}`}
      onClick={onSelect}
      aria-current={active ? 'true' : undefined}
      data-conversation-id={conversation._id}
    >
      <span className="ticket-rail" />
      <span className="avatar">{toInitials(name)}</span>
      <span className="ticket-copy">
        <span className="ticket-line">
          <strong>{name}</strong>
          <time>{formatTime(conversation.lastMessageAt)}</time>
        </span>
        <span className="ticket-preview">
          {conversation.lastMessagePreview || 'Conversation started'}
        </span>
        <span className="ticket-meta">
          <span className={`status-stamp ${conversation.status.toLowerCase()}`}>
            {conversation.status === 'MANUAL' ? 'With team' : conversation.status}
          </span>
          {conversation.order?.orderId && (
            <span>Order {conversation.order.orderId}</span>
          )}
        </span>
      </span>
      {conversation.unreadCount > 0 && (
        <span className="unread-count" aria-label={`${conversation.unreadCount} unread`}>
          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
        </span>
      )}
    </button>
  )
}

function QueuePanel({
  conversations,
  selectedId,
  filter,
  search,
  loading,
  error,
  onFilter,
  onSearch,
  onSelect,
  onRetry
}: {
  conversations: Conversation[]
  selectedId: string | null
  filter: QueueFilter
  search: string
  loading: boolean
  error?: ApolloError
  onFilter: (filter: QueueFilter) => void
  onSearch: (search: string) => void
  onSelect: (id: string) => void
  onRetry: () => void
}) {
  return (
    <aside className={`queue-panel ${selectedId ? 'mobile-hidden' : ''}`} aria-label="Conversation queue">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Live queue</p>
          <h2>WhatsApp inbox</h2>
        </div>
        <span className="queue-total">{conversations.length}</span>
      </div>
      <div className="queue-tools">
        <label className="search-field">
          <span className="sr-only">Search conversations</span>
          <Icon name="search" />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Customer, phone or order"
          />
          {search && (
            <button aria-label="Clear search" onClick={() => onSearch('')} type="button">
              <Icon name="close" size={16} />
            </button>
          )}
        </label>
        <div className="filter-rail" role="group" aria-label="Conversation status">
          {filters.map((item) => (
            <button
              key={item.value}
              className={filter === item.value ? 'active' : ''}
              onClick={() => onFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="conversation-list">
        {loading && !conversations.length ? (
          <SkeletonQueue />
        ) : error && !conversations.length ? (
          <QueueError error={error} retry={onRetry} />
        ) : conversations.length === 0 ? (
          <div className="queue-message">
            <span className="queue-message-icon">0</span>
            <strong>No tickets on this rail</strong>
            <p>Try another filter or wait for a customer to message.</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <ConversationTicket
              key={conversation._id}
              conversation={conversation}
              active={conversation._id === selectedId}
              onSelect={() => onSelect(conversation._id)}
            />
          ))
        )}
      </div>
    </aside>
  )
}

function MessageTimeline({
  messages,
  loading,
  error,
  onRetry
}: {
  messages: WhatsAppMessage[]
  loading: boolean
  error?: ApolloError
  onRetry: () => void
}) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (loading && !messages.length) {
    return (
      <div className="timeline-loading" aria-label="Loading messages">
        <span className="skeleton bubble one" />
        <span className="skeleton bubble two" />
        <span className="skeleton bubble three" />
      </div>
    )
  }

  if (error && !messages.length) {
    return (
      <div className="timeline-state" role="alert">
        <Icon name="refresh" size={25} />
        <strong>Message history did not load</strong>
        <button className="text-button" onClick={onRetry}>Try again</button>
      </div>
    )
  }

  if (!messages.length) {
    return (
      <div className="timeline-state">
        <span className="empty-rings" aria-hidden="true" />
        <strong>No messages yet</strong>
        <p>The first customer reply will appear here.</p>
      </div>
    )
  }

  let previousDate = ''
  return (
    <div className="message-timeline" aria-live="polite">
      {messages.map((message) => {
        const date = new Date(message.createdAt).toDateString()
        const showDate = date !== previousDate
        previousDate = date
        return (
          <div key={message._id}>
            {showDate && <div className="date-marker">{formatDateMarker(message.createdAt)}</div>}
            <article className={`message-row ${message.direction.toLowerCase()}`}>
              <div className="message-bubble">
                {message.type !== 'TEXT' && (
                  <span className="message-type">{message.type}</span>
                )}
                <p>{message.text || 'Unsupported WhatsApp message'}</p>
                <footer>
                  <time>{formatTime(message.createdAt)}</time>
                  {message.direction === 'OUTBOUND' && (
                    <span className={`delivery-status ${(message.status || '').toLowerCase()}`}>
                      {message.status || 'queued'}
                    </span>
                  )}
                </footer>
              </div>
            </article>
          </div>
        )
      })}
      <div ref={endRef} />
    </div>
  )
}

function ContextPanel({
  conversation,
  visible,
  onClose
}: {
  conversation: Conversation
  visible: boolean
  onClose: () => void
}) {
  const cartTotal = conversation.cart?.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  )

  return (
    <aside className={`context-panel ${visible ? 'mobile-visible' : ''}`} aria-label="Customer and order context">
      <div className="context-mobile-heading">
        <strong>Conversation context</strong>
        <button className="icon-button" onClick={onClose} aria-label="Close context panel">
          <Icon name="close" />
        </button>
      </div>
      <section className="context-section customer-card">
        <p className="eyebrow">Customer</p>
        <div className="customer-identity">
          <span className="avatar large">{toInitials(conversation.customerName)}</span>
          <div>
            <h3>{conversation.customerName || 'WhatsApp customer'}</h3>
            <p>+{conversation.customerWaId}</p>
          </div>
        </div>
        <dl className="detail-list">
          <div>
            <dt>Channel</dt>
            <dd>WhatsApp</dd>
          </div>
          <div>
            <dt>Bot step</dt>
            <dd>{(conversation.botState || 'idle').replaceAll('_', ' ')}</dd>
          </div>
        </dl>
      </section>

      <section className="context-section">
        <div className="context-title">
          <div>
            <p className="eyebrow">Current basket</p>
            <h3>{conversation.cart?.length || 0} items</h3>
          </div>
          <strong>{money(cartTotal)}</strong>
        </div>
        {!conversation.cart?.length ? (
          <p className="muted-copy">The customer has not added anything yet.</p>
        ) : (
          <ul className="cart-list">
            {conversation.cart.map((item, index) => (
              <li key={`${item.foodId}-${item.variationId || index}`}>
                <span className="cart-quantity">{item.quantity}</span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{money(item.unitPrice)} each</small>
                </span>
                <b>{money(item.quantity * item.unitPrice)}</b>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="context-section order-block">
        <p className="eyebrow">Linked order</p>
        {conversation.order ? (
          <>
            <div className="order-number">
              <h3>{conversation.order.orderId || conversation.order._id.slice(-8)}</h3>
              <span>{conversation.order.orderStatus || 'Created'}</span>
            </div>
            <div className="order-total">
              <span>Total</span>
              <strong>{money(conversation.order.orderAmount)}</strong>
            </div>
          </>
        ) : (
          <p className="muted-copy">No order has been placed from this chat.</p>
        )}
      </section>

      <section className="context-section note-block">
        <div className="note-heading"><Icon name="note" /><strong>Service note</strong></div>
        <p>Manual takeover pauses automated replies. Release the chat when the team is finished.</p>
      </section>
    </aside>
  )
}

function Workspace({
  conversation,
  messages,
  messagesLoading,
  messagesError,
  contextOpen,
  busy,
  onBack,
  onContext,
  onRetryMessages,
  onTakeOver,
  onRelease,
  onClose,
  onSend
}: {
  conversation: Conversation
  messages: WhatsAppMessage[]
  messagesLoading: boolean
  messagesError?: ApolloError
  contextOpen: boolean
  busy: boolean
  onBack: () => void
  onContext: (open: boolean) => void
  onRetryMessages: () => void
  onTakeOver: () => void
  onRelease: () => void
  onClose: () => void
  onSend: (text: string) => Promise<void>
}) {
  const [draft, setDraft] = useState('')
  const [sendError, setSendError] = useState('')

  const send = async () => {
    const text = draft.trim()
    if (!text || busy || conversation.status !== 'MANUAL') return
    setSendError('')
    try {
      await onSend(text)
      setDraft('')
    } catch {
      setSendError('Message was not sent. Check the connection and try again.')
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void send()
  }

  const handleKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void send()
    }
  }

  return (
    <>
      <section className="chat-panel" aria-label="Active conversation">
        <header className="chat-header">
          <button className="icon-button mobile-only" onClick={onBack} aria-label="Back to conversations">
            <Icon name="back" />
          </button>
          <span className="avatar">{toInitials(conversation.customerName)}</span>
          <div className="chat-identity">
            <h2>{conversation.customerName || 'WhatsApp customer'}</h2>
            <p>
              <span className={`presence-dot ${conversation.status.toLowerCase()}`} />
              {conversation.status === 'MANUAL'
                ? 'Team is replying'
                : conversation.status === 'BOT'
                  ? `Bot active · ${(conversation.botState || 'ready').replaceAll('_', ' ')}`
                  : 'Conversation closed'}
            </p>
          </div>
          <div className="chat-actions">
            {conversation.status === 'BOT' && (
              <button className="action-button coral" onClick={onTakeOver} disabled={busy}>
                Take over
              </button>
            )}
            {conversation.status === 'MANUAL' && (
              <button className="action-button" onClick={onRelease} disabled={busy}>
                Return to bot
              </button>
            )}
            {conversation.status !== 'CLOSED' && (
              <button className="text-button quiet" onClick={onClose} disabled={busy}>
                Close
              </button>
            )}
            <button className="icon-button context-toggle" onClick={() => onContext(true)} aria-label="View order context">
              <Icon name="info" />
            </button>
          </div>
        </header>

        <div className={`mode-banner ${conversation.status.toLowerCase()}`}>
          <span className="mode-symbol">{conversation.status === 'BOT' ? 'B' : conversation.status === 'MANUAL' ? 'M' : '×'}</span>
          <p>
            <strong>
              {conversation.status === 'BOT'
                ? 'NextHop is handling this chat'
                : conversation.status === 'MANUAL'
                  ? 'Automation paused'
                  : 'This ticket is closed'}
            </strong>
            <span>
              {conversation.status === 'BOT'
                ? 'Take over when a customer needs a person.'
                : conversation.status === 'MANUAL'
                  ? 'Your replies are sent directly through WhatsApp.'
                  : 'Reopen from the queue if follow-up is needed.'}
            </span>
          </p>
        </div>

        <MessageTimeline
          messages={messages}
          loading={messagesLoading}
          error={messagesError}
          onRetry={onRetryMessages}
        />

        <form className="composer" onSubmit={submit}>
          {sendError && <p className="composer-error" role="alert">{sendError}</p>}
          <div className="composer-box">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKey}
              placeholder={
                conversation.status === 'MANUAL'
                  ? 'Reply to customer…'
                  : conversation.status === 'BOT'
                    ? 'Take over to reply manually'
                    : 'Conversation is closed'
              }
              disabled={conversation.status !== 'MANUAL' || busy}
              rows={2}
              aria-label="WhatsApp reply"
            />
            <button
              className="send-button"
              type="submit"
              disabled={!draft.trim() || conversation.status !== 'MANUAL' || busy}
              aria-label="Send WhatsApp message"
            >
              <Icon name="send" size={19} />
            </button>
          </div>
          <p className="composer-hint">
            {conversation.status === 'MANUAL'
              ? 'Enter to send · Shift + Enter for a new line'
              : 'Automated replies continue until a team member takes over.'}
          </p>
        </form>
      </section>
      <ContextPanel conversation={conversation} visible={contextOpen} onClose={() => onContext(false)} />
      {contextOpen && <button className="context-scrim" aria-label="Close context panel" onClick={() => onContext(false)} />}
    </>
  )
}

export default function App() {
  const token = localStorage.getItem('nexthop_token')
  const [filter, setFilter] = useState<QueueFilter>('ALL')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [contextOpen, setContextOpen] = useState(false)
  const [subscriptionOnline, setSubscriptionOnline] = useState(true)
  const keyboardNavigation = useRef(false)
  const status = filter === 'ALL' ? undefined : filter

  const conversationsQuery = useQuery<{ whatsappConversations: Conversation[] }>(
    CONVERSATIONS,
    {
      variables: { status, limit: 100, offset: 0 },
      skip: !token,
      pollInterval: subscriptionOnline ? 0 : 12000,
      notifyOnNetworkStatusChange: true
    }
  )

  const allConversations = conversationsQuery.data?.whatsappConversations || []
  const conversations = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return allConversations
    return allConversations.filter((conversation) =>
      [
        conversation.customerName,
        conversation.customerWaId,
        conversation.order?.orderId,
        conversation.lastMessagePreview
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    )
  }, [allConversations, search])

  const selected = allConversations.find((item) => item._id === selectedId) || null
  const messagesQuery = useQuery<{ whatsappMessages: WhatsAppMessage[] }>(MESSAGES, {
    variables: { conversationId: selectedId, limit: 100 },
    skip: !selectedId || !token,
    pollInterval: subscriptionOnline ? 0 : 8000
  })

  const [takeOver, takeOverState] = useMutation(TAKE_OVER, {
    refetchQueries: ['WhatsAppConversations']
  })
  const [release, releaseState] = useMutation(RELEASE, {
    refetchQueries: ['WhatsAppConversations']
  })
  const [closeConversation, closeState] = useMutation(CLOSE, {
    refetchQueries: ['WhatsAppConversations']
  })
  const [sendMessage, sendState] = useMutation(SEND)
  const [markRead] = useMutation(MARK_READ)

  const openConversation = useCallback(
    (id: string) => {
      setSelectedId(id)
      setContextOpen(false)
      void markRead({
        variables: { conversationId: id },
        optimisticResponse: {
          markWhatsAppConversationRead: {
            __typename: 'WhatsAppConversation',
            _id: id,
            unreadCount: 0,
            updatedAt: new Date().toISOString()
          }
        },
        update: (cache) => {
          cache.modify({
            id: cache.identify({
              __typename: 'WhatsAppConversation',
              _id: id
            }),
            fields: {
              unreadCount: () => 0
            }
          })
        }
      })
    },
    [markRead]
  )

  useSubscription(MESSAGE_ADDED, {
    skip: !token,
    onData: ({ data, client }) => {
      setSubscriptionOnline(true)
      const message = data.data?.whatsappMessageAdded as WhatsAppMessage | undefined
      if (!message) return
      client.cache.updateQuery<{ whatsappMessages: WhatsAppMessage[] }>(
        {
          query: MESSAGES,
          variables: { conversationId: message.conversation, limit: 100 }
        },
        (current) => {
          if (!current) {
            return current
          }
          const existingIndex = current.whatsappMessages.findIndex(
            (item) => item._id === message._id
          )
          if (existingIndex === -1) {
            return { whatsappMessages: [...current.whatsappMessages, message] }
          }
          return {
            whatsappMessages: current.whatsappMessages.map((item, index) =>
              index === existingIndex ? { ...item, ...message } : item
            )
          }
        }
      )
    },
    onError: () => setSubscriptionOnline(false)
  })

  useSubscription(CONVERSATION_UPDATED, {
    skip: !token,
    onData: () => {
      setSubscriptionOnline(true)
      void conversationsQuery.refetch()
    },
    onError: () => setSubscriptionOnline(false)
  })

  useEffect(() => {
    if (selectedId && !allConversations.some((item) => item._id === selectedId)) {
      setSelectedId(null)
    }
  }, [allConversations, selectedId])

  useEffect(() => {
    const handleQueueNavigation = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target?.matches('input, textarea, select, [contenteditable="true"]') ||
        !conversations.length ||
        (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')
      ) {
        return
      }

      event.preventDefault()
      const currentIndex = conversations.findIndex(
        (conversation) => conversation._id === selectedId
      )
      const nextIndex =
        event.key === 'ArrowDown'
          ? currentIndex < 0
            ? 0
            : Math.min(currentIndex + 1, conversations.length - 1)
          : currentIndex < 0
            ? conversations.length - 1
            : Math.max(currentIndex - 1, 0)

      keyboardNavigation.current = true
      openConversation(conversations[nextIndex]._id)
    }

    window.addEventListener('keydown', handleQueueNavigation)
    return () => window.removeEventListener('keydown', handleQueueNavigation)
  }, [conversations, selectedId, openConversation])

  useEffect(() => {
    if (!selectedId || !keyboardNavigation.current) return
    keyboardNavigation.current = false
    const escapedId =
      typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(selectedId) : selectedId
    document
      .querySelector<HTMLButtonElement>(
        `.conversation-ticket[data-conversation-id="${escapedId}"]`
      )
      ?.focus()
  }, [selectedId])

  if (!token) return <AuthRequired />

  const busy =
    takeOverState.loading ||
    releaseState.loading ||
    closeState.loading ||
    sendState.loading

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="NextHop home">
          <img src="./nexthop-logo.png" alt="" />
          <span>
            <strong>NextHop</strong>
            <small>Restaurant operations</small>
          </span>
        </a>
        <div className="service-status" role="status">
          <span className={`activity-pulse ${subscriptionOnline ? '' : 'offline'}`} />
          <span>
            <strong>{subscriptionOnline ? 'Live service' : 'Polling mode'}</strong>
            <small>{subscriptionOnline ? 'Updates are instant' : 'Realtime reconnecting'}</small>
          </span>
        </div>
        <div className="operator">
          <span className="operator-copy">
            <strong>Service desk</strong>
            <small>Restaurant team</small>
          </span>
          <span className="avatar operator-avatar">SD</span>
          <button
            className="logout-button"
            onClick={() => {
              localStorage.removeItem('nexthop_token')
              window.location.reload()
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="workspace">
        <QueuePanel
          conversations={conversations}
          selectedId={selectedId}
          filter={filter}
          search={search}
          loading={conversationsQuery.loading}
          error={conversationsQuery.error}
          onFilter={setFilter}
          onSearch={setSearch}
          onSelect={openConversation}
          onRetry={() => void conversationsQuery.refetch()}
        />

        {selected ? (
          <Workspace
            conversation={selected}
            messages={messagesQuery.data?.whatsappMessages || []}
            messagesLoading={messagesQuery.loading}
            messagesError={messagesQuery.error}
            contextOpen={contextOpen}
            busy={busy}
            onBack={() => setSelectedId(null)}
            onContext={setContextOpen}
            onRetryMessages={() => void messagesQuery.refetch()}
            onTakeOver={() => void takeOver({ variables: { conversationId: selected._id } })}
            onRelease={() => void release({ variables: { conversationId: selected._id } })}
            onClose={() => void closeConversation({ variables: { conversationId: selected._id } })}
            onSend={async (text) => {
              const result = await sendMessage({
                variables: { conversationId: selected._id, text }
              })
              const message = result.data?.sendWhatsAppInboxMessage as WhatsAppMessage | undefined
              if (message) {
                messagesQuery.updateQuery((current) => ({
                  whatsappMessages: [
                    ...(current?.whatsappMessages || []).filter((item) => item._id !== message._id),
                    message
                  ]
                }))
              }
            }}
          />
        ) : (
          <section className="empty-workspace" aria-labelledby="empty-title">
            <div className="empty-ticket-stack" aria-hidden="true">
              <span />
              <span />
              <span>
                <i />
                <i />
                <i />
              </span>
            </div>
            <p className="eyebrow">Service ready</p>
            <h1 id="empty-title">Pick up the next conversation.</h1>
            <p>Select a ticket from the live rail to review the customer, basket and order.</p>
            <div className="shortcut-hint"><kbd>↑</kbd><kbd>↓</kbd><span>Navigate the queue</span></div>
          </section>
        )}
      </main>
    </div>
  )
}
