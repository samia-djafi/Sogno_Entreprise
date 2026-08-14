import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Plus,
  Paperclip,
  SendHorizontal,
  Bot,
  Loader2,
  MoreHorizontal,
  FileText,
  X,
  Bookmark,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  EyeOff,
  Check,
  AlertTriangle,
} from 'lucide-react'

import AppLayout from '../components/AppLayout'
import DemoNotice from '../components/DemoNotice'
import { useTheme } from '../context/ThemeContext'
import { useRequiredUser } from '../context/AuthContext'

import {
  supabase,
  type ConversationRow,
  type MessageRow,
  type DocumentRow,
  type ProfileRow,
} from '../lib/supabaseClient'

import { recordQuestionGap } from '../lib/questionGaps'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'


/*
 * ============================================================
 * TYPES
 * ============================================================
 */

type MessageSource = {
  document: string
  page: number
  section?: string
}

type MessageFeedback =
  | 'helpful'
  | 'not_helpful'

type RagResponse = {
  answer: string
  sources: MessageSource[]
  answered: boolean
}


/*
 * ============================================================
 * FALLBACK UNANSWERED DETECTION
 *
 * `answered` from the RAG API is the PRIMARY source of truth.
 *
 * This function is only kept as a fallback for old messages
 * already stored before the `answered` column existed.
 * ============================================================
 */

const NO_ANSWER_PATTERNS = [
  'cannot be answered',
  "can't be answered",
  'could not be answered',
  'couldn’t be answered',
  'no documents about',
  'no document about',
  'not found in the available documents',
  'not found in the available company documents',
  'no relevant documents',
  'i could not find this information',
  "i couldn't find this information",
  'i could not find this information',
  "i don't have information",
  'i do not have information'
]

function fallbackLooksUnanswered(
  content: string,
): boolean {
  const normalized = content.toLowerCase()

  return NO_ANSWER_PATTERNS.some((phrase) =>
    normalized.includes(phrase),
  )
}


/*
 * ============================================================
 * GROUP CONVERSATIONS BY RECENCY
 * ============================================================
 */

function groupByRecency(
  conversations: ConversationRow[],
) {
  const now = new Date()

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  )

  const startOfYesterday = new Date(
    startOfToday.getTime() - 86400000,
  )

  const startOfWeek = new Date(
    startOfToday.getTime() - 7 * 86400000,
  )

  const groups: {
    label: string
    items: ConversationRow[]
  }[] = [
    {
      label: 'Today',
      items: [],
    },
    {
      label: 'Yesterday',
      items: [],
    },
    {
      label: 'Previous 7 days',
      items: [],
    },
    {
      label: 'Older',
      items: [],
    },
  ]

  for (const conversation of conversations) {
    const created = new Date(
      conversation.created_at,
    )

    if (created >= startOfToday) {
      groups[0].items.push(conversation)
    } else if (created >= startOfYesterday) {
      groups[1].items.push(conversation)
    } else if (created >= startOfWeek) {
      groups[2].items.push(conversation)
    } else {
      groups[3].items.push(conversation)
    }
  }

  return groups.filter(
    (group) => group.items.length > 0,
  )
}


/*
 * ============================================================
 * ASSISTANT PAGE
 * ============================================================
 */

export default function AssistantPage() {
  const { theme } = useTheme()
  const { user } = useRequiredUser()

  const [searchParams, setSearchParams] =
    useSearchParams()

  const isDark = theme === 'dark'


  /*
   * ==========================================================
   * CONVERSATIONS
   * ==========================================================
   */

  const [conversations, setConversations] =
    useState<ConversationRow[]>([])

  const [activeId, setActiveId] =
    useState<string | null>(null)


  /*
   * ==========================================================
   * MESSAGES
   * ==========================================================
   */

  const [messages, setMessages] =
    useState<MessageRow[]>([])


  /*
   * ==========================================================
   * INPUT
   * ==========================================================
   */

  const [input, setInput] =
    useState('')


  /*
   * ==========================================================
   * DOCUMENT CONTEXT
   * ==========================================================
   */

  const [selectedDocument, setSelectedDocument] =
    useState<DocumentRow | null>(null)

  const [loadingDocument, setLoadingDocument] =
    useState(false)


  /*
   * ==========================================================
   * PROFILE
   * ==========================================================
   */

  const [profile, setProfile] =
    useState<ProfileRow | null>(null)


  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  const [loadingConversations, setLoadingConversations] =
    useState(true)

  const [loadingMessages, setLoadingMessages] =
    useState(false)

  const [sending, setSending] =
    useState(false)


  /*
   * ==========================================================
   * REGENERATE
   * ==========================================================
   */

  const [regeneratingId, setRegeneratingId] =
    useState<string | null>(null)


  /*
   * ==========================================================
   * FEEDBACK
   * ==========================================================
   */

  const [savingFeedbackId, setSavingFeedbackId] =
    useState<string | null>(null)


  /*
   * ==========================================================
   * HIDDEN SOURCES
   * ==========================================================
   */

  const [hiddenSources, setHiddenSources] =
    useState<Set<string>>(new Set())


  /*
   * ==========================================================
   * ERROR
   * ==========================================================
   */

  const [error, setError] =
    useState<string | null>(null)


  /*
   * ==========================================================
   * THREE DOT MENU
   * ==========================================================
   */

  const [openMenuId, setOpenMenuId] =
    useState<string | null>(null)


  /*
   * ==========================================================
   * INLINE RENAME
   * ==========================================================
   */

  const [renamingId, setRenamingId] =
    useState<string | null>(null)

  const [renameValue, setRenameValue] =
    useState('')


  /*
   * ==========================================================
   * COPY
   * ==========================================================
   */

  const [copiedId, setCopiedId] =
    useState<string | null>(null)


  /*
   * ==========================================================
   * TOAST
   * ==========================================================
   */

  const [toast, setToast] =
    useState<string | null>(null)

  const showToast = (
    message: string,
  ) => {
    setToast(message)

    window.setTimeout(() => {
      setToast((current) =>
        current === message
          ? null
          : current,
      )
    }, 2000)
  }


  /*
   * ============================================================
   * LOAD PROFILE
   * ============================================================
   */

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (
        profileError ||
        !data
      ) {
        console.error(
          'Failed to load profile:',
          profileError,
        )

        return
      }

      setProfile(data as ProfileRow)
    }

    void loadProfile()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  /*
   * ============================================================
   * LOAD DOCUMENT
   * ============================================================
   */

  const loadSelectedDocument = async (
    documentId: string,
  ) => {
    setLoadingDocument(true)
    setError(null)

    const {
      data,
      error: documentError,
    } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (
      documentError ||
      !data
    ) {
      console.error(
        'Failed to load selected document:',
        documentError,
      )

      setSelectedDocument(null)
      setError(
        'The selected document could not be loaded.',
      )

      setLoadingDocument(false)

      return
    }

    setSelectedDocument(
      data as DocumentRow,
    )

    setLoadingDocument(false)
  }


  /*
   * ============================================================
   * READ URL PARAMETERS
   * ============================================================
   */

  useEffect(() => {
    const isNewConversationRequest =
      searchParams.has('new')

    const documentId =
      searchParams.get('document')

    const question =
      searchParams.get('question')

    if (isNewConversationRequest) {
      setActiveId(null)
      setMessages([])
      setError(null)
      setOpenMenuId(null)
    }

    if (documentId) {
      void loadSelectedDocument(
        documentId,
      )
    } else {
      setSelectedDocument(null)
    }

    if (question) {
      setInput(question)
    } else if (
      isNewConversationRequest
    ) {
      setInput('')
    }

    if (isNewConversationRequest) {
      const nextParams =
        new URLSearchParams(
          searchParams,
        )

      nextParams.delete('new')

      setSearchParams(
        nextParams,
        {
          replace: true,
        },
      )
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])


  /*
   * ============================================================
   * LOAD CONVERSATIONS
   * ============================================================
   */

  const loadConversations = async (
    selectId?: string,
  ) => {
    setLoadingConversations(true)
    setError(null)

    const {
      data,
      error: conversationsError,
    } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', {
        ascending: false,
      })

    if (conversationsError) {
      console.error(
        'Failed to load conversations:',
        conversationsError,
      )

      setError(
        'Unable to load your conversations.',
      )

      setLoadingConversations(false)

      return
    }

    const list =
      data ?? []

    setConversations(list)
    setLoadingConversations(false)

    if (selectId) {
      setActiveId(selectId)
    }
  }


  /*
   * ============================================================
   * LOAD MESSAGES
   * ============================================================
   */

  const loadMessages = async (
    conversationId: string,
  ) => {
    setLoadingMessages(true)
    setError(null)

    const {
      data,
      error: messagesError,
    } = await supabase
      .from('messages')
      .select('*')
      .eq(
        'conversation_id',
        conversationId,
      )
      .order('created_at', {
        ascending: true,
      })

    if (messagesError) {
      console.error(
        'Failed to load messages:',
        messagesError,
      )

      setError(
        'Unable to load this conversation.',
      )

      setMessages([])
      setLoadingMessages(false)

      return
    }

    setMessages(
      data ?? [],
    )

    setLoadingMessages(false)
  }


  /*
   * ============================================================
   * INITIAL LOAD
   * ============================================================
   */

  useEffect(() => {
    void loadConversations()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  /*
   * ============================================================
   * LOAD ACTIVE CONVERSATION
   * ============================================================
   */

  useEffect(() => {
    if (activeId) {
      void loadMessages(activeId)
    } else {
      setMessages([])
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])


  /*
   * ============================================================
   * NEW CONVERSATION
   * ============================================================
   */

  const handleNewConversation = () => {
    setActiveId(null)
    setMessages([])
    setInput('')
    setError(null)
    setOpenMenuId(null)

    setSearchParams({})
    setSelectedDocument(null)
  }


  /*
   * ============================================================
   * CLEAR DOCUMENT
   * ============================================================
   */

  const handleClearDocument = () => {
    setSelectedDocument(null)

    const nextParams =
      new URLSearchParams(
        searchParams,
      )

    nextParams.delete(
      'document',
    )

    nextParams.delete(
      'question',
    )

    setSearchParams(
      nextParams,
    )
  }


  /*
   * ============================================================
   * RENAME CONVERSATION
   * ============================================================
   */

  const startRenameConversation = (
    conversation: ConversationRow,
  ) => {
    setOpenMenuId(null)
    setRenamingId(
      conversation.id,
    )

    setRenameValue(
      conversation.title || '',
    )
  }

  const cancelRenameConversation = () => {
    setRenamingId(null)
    setRenameValue('')
  }

  const commitRenameConversation = async (
    conversation: ConversationRow,
  ) => {
    const title =
      renameValue.trim()

    setRenamingId(null)

    if (
      !title ||
      title === conversation.title
    ) {
      return
    }

    const {
      error: renameError,
    } = await supabase
      .from('conversations')
      .update({
        title,
      })
      .eq(
        'id',
        conversation.id,
      )
      .eq(
        'user_id',
        user.id,
      )

    if (renameError) {
      console.error(
        'Failed to rename conversation:',
        renameError,
      )

      setError(
        'Unable to rename the conversation.',
      )

      return
    }

    setConversations(
      (current) =>
        current.map(
          (item) =>
            item.id ===
            conversation.id
              ? {
                  ...item,
                  title,
                }
              : item,
        ),
    )

    showToast(
      'Conversation renamed',
    )
  }


  /*
   * ============================================================
   * DELETE CONVERSATION
   * ============================================================
   */

  const handleDeleteConversation = async (
    conversation: ConversationRow,
  ) => {
    setOpenMenuId(null)

    const confirmed =
      window.confirm(
        `Delete "${
          conversation.title ||
          'Untitled conversation'
        }"?\n\nThis cannot be undone.`,
      )

    if (!confirmed) {
      return
    }

    const {
      error: deleteError,
    } = await supabase
      .from('conversations')
      .delete()
      .eq(
        'id',
        conversation.id,
      )
      .eq(
        'user_id',
        user.id,
      )

    if (deleteError) {
      console.error(
        'Failed to delete conversation:',
        deleteError,
      )

      setError(
        'Unable to delete the conversation.',
      )

      return
    }

    const remaining =
      conversations.filter(
        (item) =>
          item.id !==
          conversation.id,
      )

    setConversations(
      remaining,
    )

    if (
      activeId ===
      conversation.id
    ) {
      if (
        remaining.length > 0
      ) {
        setActiveId(
          remaining[0].id,
        )
      } else {
        setActiveId(null)
        setMessages([])
      }
    }
  }


  /*
   * ============================================================
   * SAVE / UNSAVE
   * ============================================================
   */

  const handleSaveConversation = async (
    conversation: ConversationRow,
  ) => {
    setOpenMenuId(null)

    const nextSaved =
      !conversation.saved

    const {
      error: saveError,
    } = await supabase
      .from('conversations')
      .update({
        saved: nextSaved,
      })
      .eq(
        'id',
        conversation.id,
      )
      .eq(
        'user_id',
        user.id,
      )

    if (saveError) {
      console.error(
        'Failed to update saved state:',
        saveError,
      )

      setError(
        'Unable to update this conversation.',
      )

      return
    }

    setConversations(
      (current) =>
        current.map(
          (item) =>
            item.id ===
            conversation.id
              ? {
                  ...item,
                  saved: nextSaved,
                }
              : item,
        ),
    )
  }


  /*
   * ============================================================
   * RAG API
   *
   * IMPORTANT:
   *
   * `answered` is now the source of truth.
   *
   * Sources are ONLY sources.
   * They do NOT determine whether the question was answered.
   * ============================================================
   */

  const callAssistant = async (
    question: string,
  ): Promise<RagResponse | null> => {
    try {
      const ragResponse =
        await fetch(
          'https://sogno-entreprise.onrender.com/ask',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              question,
              role:
                profile?.role ??
                'employee',
            }),
          },
        )

      if (!ragResponse.ok) {
        throw new Error(
          'RAG API returned an error',
        )
      }

      return await ragResponse.json()
    } catch (ragError) {
      console.error(
        'RAG request failed:',
        ragError,
      )

      setError(
        'The assistant could not be reached.',
      )

      return null
    }
  }


  /*
   * ============================================================
   * SEND MESSAGE
   * ============================================================
   */

  const handleSend = async () => {
    const question =
      input.trim()

    if (
      !question ||
      sending
    ) {
      return
    }

    setSending(true)
    setError(null)
    setInput('')

    let conversationId =
      activeId


    /*
     * ==========================================================
     * CREATE CONVERSATION
     * ==========================================================
     */

    if (!conversationId) {
      const {
        data: conversation,
        error:
          conversationError,
      } = await supabase
        .from('conversations')
        .insert({
          user_id:
            user.id,
          title:
            question.slice(
              0,
              60,
            ),
        })
        .select()
        .single()

      if (
        conversationError ||
        !conversation
      ) {
        console.error(
          'Failed to create conversation:',
          conversationError,
        )

        setError(
          'Unable to create the conversation.',
        )

        setInput(question)
        setSending(false)

        return
      }

      conversationId =
        conversation.id

      setConversations(
        (current) => [
          conversation,
          ...current,
        ],
      )

      setActiveId(
        conversation.id,
      )
    }


    /*
     * ==========================================================
     * SAVE USER MESSAGE
     * ==========================================================
     */

    const {
      data: userMessage,
      error:
        messageError,
    } = await supabase
      .from('messages')
      .insert({
        conversation_id:
          conversationId,
        role: 'user',
        content:
          question,
      })
      .select()
      .single()

    if (
      messageError ||
      !userMessage
    ) {
      console.error(
        'Failed to save message:',
        messageError,
      )

      setError(
        'Your question could not be sent.',
      )

      setInput(question)
      setSending(false)

      return
    }


    /*
     * ==========================================================
     * SHOW USER MESSAGE
     * ==========================================================
     */

    setMessages(
      (current) => [
        ...current,
        userMessage,
      ],
    )


    /*
     * ==========================================================
     * CALL RAG
     * ==========================================================
     */

    const ragData =
      await callAssistant(
        question,
      )

    if (!ragData) {
      setSending(false)
      return
    }


    /*
     * ==========================================================
     * SAVE ASSISTANT MESSAGE
     *
     * IMPORTANT:
     * Save `answered` explicitly.
     * ==========================================================
     */

    const {
      data:
        assistantMessage,
      error:
        assistantMessageError,
    } = await supabase
      .from('messages')
      .insert({
        conversation_id:
          conversationId,
        role: 'assistant',
        content:
          ragData.answer,
        sources:
          ragData.sources,
        answered:
          ragData.answered,
      })
      .select()
      .single()

    if (
      assistantMessageError ||
      !assistantMessage
    ) {
      console.error(
        'Failed to save assistant message:',
        assistantMessageError,
      )

      setError(
        'The answer could not be saved.',
      )

      setSending(false)
      return
    }


    /*
     * ==========================================================
     * DISPLAY ASSISTANT MESSAGE
     * ==========================================================
     */

    setMessages(
      (current) => [
        ...current,
        assistantMessage,
      ],
    )


    /*
     * ==========================================================
     * AUTOMATIC QUESTION GAP
     *
     * THIS IS THE NEW IMPORTANT PART.
     *
     * We do NOT care whether sources exist.
     *
     * If RAG says:
     *
     *     answered === false
     *
     * the question immediately goes into
     * question_gaps.
     * ==========================================================
     */

    if (
      ragData.answered === false
    ) {
      void recordQuestionGap({
        question,
        conversationId:
          conversationId as string,
        messageId:
          assistantMessage.id,
        reason:
          'unanswered',
      })

      showToast(
        'Question sent to Unanswered Questions for review',
      )
    }

    setSending(false)
  }


  /*
   * ============================================================
   * REGENERATE ANSWER
   * ============================================================
   */

  const handleRegenerate = async (
    messageId: string,
  ) => {
    const index =
      messages.findIndex(
        (item) =>
          item.id ===
          messageId,
      )

    const previousUserMessage =
      [
        ...messages.slice(
          0,
          index,
        ),
      ]
        .reverse()
        .find(
          (item) =>
            item.role ===
            'user',
        )

    if (
      !previousUserMessage ||
      !activeId
    ) {
      return
    }

    setRegeneratingId(
      messageId,
    )

    setError(null)

    const ragData =
      await callAssistant(
        previousUserMessage.content,
      )

    if (ragData) {
      const {
        error: updateError,
      } = await supabase
        .from('messages')
        .update({
          content:
            ragData.answer,
          sources:
            ragData.sources,
          answered:
            ragData.answered,
          feedback:
            null,
        })
        .eq(
          'id',
          messageId,
        )

      if (updateError) {
        console.error(
          'Failed to update message:',
          updateError,
        )

        setError(
          'The answer could not be regenerated.',
        )
      } else {
        setMessages(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                messageId
                  ? {
                      ...item,
                      content:
                        ragData.answer,
                      sources:
                        ragData.sources,
                      answered:
                        ragData.answered,
                      feedback:
                        null,
                    }
                  : item,
            ),
        )


        /*
         * If regeneration still cannot answer,
         * add it to question gaps.
         */

        if (
          ragData.answered ===
          false
        ) {
          void recordQuestionGap({
            question:
              previousUserMessage.content,
            conversationId:
              activeId,
            messageId,
            reason:
              'unanswered',
          })

          showToast(
            'Question sent to Unanswered Questions for review',
          )
        }
      }
    }

    setRegeneratingId(null)
  }


  /*
   * ============================================================
   * COPY
   * ============================================================
   */

  const handleCopy = async (
    messageId: string,
    content: string,
  ) => {
    try {
      await navigator.clipboard.writeText(
        content,
      )

      setCopiedId(
        messageId,
      )

      showToast(
        'Copied to clipboard',
      )

      window.setTimeout(
        () => {
          setCopiedId(
            (current) =>
              current ===
              messageId
                ? null
                : current,
          )
        },
        2000,
      )
    } catch (copyError) {
      console.error(
        'Failed to copy to clipboard:',
        copyError,
      )

      showToast(
        'Could not copy to clipboard',
      )
    }
  }


  /*
   * ============================================================
   * FEEDBACK
   * ============================================================
   */

  const handleFeedback = async (
    messageId: string,
    feedback: MessageFeedback,
  ) => {
    if (
      savingFeedbackId ===
      messageId
    ) {
      return
    }

    const targetMessage =
      messages.find(
        (item) =>
          item.id ===
          messageId,
      )

    const currentFeedback =
      (
        targetMessage as any
      )?.feedback as
        | MessageFeedback
        | null
        | undefined

    const nextFeedback =
      currentFeedback ===
      feedback
        ? null
        : feedback

    setSavingFeedbackId(
      messageId,
    )

    /*
     * Optimistic UI
     */

    setMessages(
      (current) =>
        current.map(
          (item) =>
            item.id ===
            messageId
              ? {
                  ...item,
                  feedback:
                    nextFeedback,
                }
              : item,
        ),
    )

    const {
      error: feedbackError,
    } = await supabase
      .from('messages')
      .update({
        feedback:
          nextFeedback,
      })
      .eq(
        'id',
        messageId,
      )

    setSavingFeedbackId(
      null,
    )

    if (feedbackError) {
      console.error(
        'Failed to save feedback:',
        feedbackError,
      )

      setMessages(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              messageId
                ? {
                    ...item,
                    feedback:
                      currentFeedback ??
                      null,
                  }
                : item,
          ),
      )

      showToast(
        'Unable to save your feedback',
      )

      return
    }

    if (
      nextFeedback ===
      null
    ) {
      showToast(
        'Feedback removed',
      )
    } else {
      showToast(
        nextFeedback ===
          'helpful'
          ? 'Thanks — marked as helpful'
          : 'Thanks — marked as not helpful',
      )
    }


    /*
     * ==========================================================
     * NOT HELPFUL → QUESTION GAP
     *
     * This remains a SECOND path to question_gaps.
     *
     * It is NOT required for unanswered RAG responses.
     * ==========================================================
     */

    if (
      nextFeedback ===
        'not_helpful' &&
      activeId
    ) {
      const index =
        messages.findIndex(
          (item) =>
            item.id ===
            messageId,
        )

      const previousUserMessage =
        [
          ...messages.slice(
            0,
            index,
          ),
        ]
          .reverse()
          .find(
            (item) =>
              item.role ===
              'user',
          )

      if (
        previousUserMessage
      ) {
        void recordQuestionGap({
          question:
            previousUserMessage.content,
          conversationId:
            activeId,
          messageId,
          reason:
            'not_helpful',
        })
      }
    }
  }


  /*
   * ============================================================
   * TOGGLE SOURCES
   * ============================================================
   */

  const handleToggleSources = (
    messageId: string,
  ) => {
    setHiddenSources(
      (current) => {
        const next =
          new Set(current)

        if (
          next.has(messageId)
        ) {
          next.delete(
            messageId,
          )
        } else {
          next.add(
            messageId,
          )
        }

        return next
      },
    )
  }


  /*
   * ============================================================
   * QUICK DOCUMENT QUESTIONS
   * ============================================================
   */

  const askAboutDocument = (
    question: string,
  ) => {
    if (
      !selectedDocument
    ) {
      return
    }

    setInput(question)
  }


  /*
   * ============================================================
   * GROUPS
   * ============================================================
   */

  const grouped =
    groupByRecency(
      conversations,
    )


  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <AppLayout>
      <div className="flex h-full min-h-0">


        {/* =====================================================
            SIDEBAR
        ====================================================== */}

        <aside
          className={`flex w-64 shrink-0 flex-col border-r ${
            isDark
              ? 'border-[#161c25]'
              : 'border-[#e8e1d3]'
          }`}
        >

          {/* NEW CONVERSATION */}

          <div className="p-3">
            <button
              onClick={
                handleNewConversation
              }
              className={`flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-[13px] font-medium transition-colors ${
                isDark
                  ? 'border-[#2a3340] text-[#e3e5e8] hover:bg-[#141a22]'
                  : 'border-[#d8cfba] text-[#1c2127] hover:bg-[#efe6d8]'
              }`}
            >
              <Plus size={15} />
              New conversation
            </button>
          </div>


          {/* CONVERSATION LIST */}

          <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-3">

            {loadingConversations && (
              <div
                className={`flex items-center gap-2 px-2 py-3 text-[12.5px] ${
                  isDark
                    ? 'text-[#6b7480]'
                    : 'text-[#9a927e]'
                }`}
              >
                <Loader2
                  size={14}
                  className="animate-spin"
                />
                Loading...
              </div>
            )}


            {!loadingConversations &&
              conversations.length ===
                0 && (
                <div
                  className={`px-2 py-3 text-[12.5px] ${
                    isDark
                      ? 'text-[#6b7480]'
                      : 'text-[#9a927e]'
                  }`}
                >
                  No conversations yet.
                  <br />
                  Ask your first question below.
                </div>
              )}


            {grouped.map(
              (group) => (
                <div
                  key={
                    group.label
                  }
                  className="mb-3"
                >

                  <div
                    className={`px-2 pb-1 text-[11px] font-semibold tracking-wide ${
                      isDark
                        ? 'text-[#6b7480]'
                        : 'text-[#9a927e]'
                    }`}
                  >
                    {group.label.toUpperCase()}
                  </div>


                  {group.items.map(
                    (
                      conversation,
                    ) =>
                      renamingId ===
                      conversation.id ? (

                        <div
                          key={
                            conversation.id
                          }
                          className="relative mb-0.5"
                        >
                          <input
                            autoFocus
                            value={
                              renameValue
                            }
                            onChange={(
                              event,
                            ) =>
                              setRenameValue(
                                event
                                  .target
                                  .value,
                              )
                            }
                            onBlur={() =>
                              void commitRenameConversation(
                                conversation,
                              )
                            }
                            onKeyDown={(
                              event,
                            ) => {
                              if (
                                event.key ===
                                'Enter'
                              ) {
                                event.preventDefault()

                                void commitRenameConversation(
                                  conversation,
                                )
                              } else if (
                                event.key ===
                                'Escape'
                              ) {
                                event.preventDefault()

                                cancelRenameConversation()
                              }
                            }}
                            className={`w-full rounded-md border px-2 py-1.5 text-[13px] outline-none ${
                              isDark
                                ? 'border-[#3a4552] bg-[#141a22] text-[#e3e5e8]'
                                : 'border-[#c9bfa8] bg-white text-[#1c2127]'
                            }`}
                          />
                        </div>

                      ) : (

                        <div
                          key={
                            conversation.id
                          }
                          className="group relative mb-0.5"
                        >

                          <button
                            type="button"
                            onClick={() => {
                              setActiveId(
                                conversation.id,
                              )

                              setOpenMenuId(
                                null,
                              )
                            }}
                            className={`flex w-full items-center gap-1.5 truncate rounded-md px-2 py-1.5 pr-9 text-left text-[13px] ${
                              activeId ===
                              conversation.id
                                ? isDark
                                  ? 'bg-[#123a3d] font-medium text-white'
                                  : 'bg-[#efe6d8] font-medium text-[#1c2127]'
                                : isDark
                                  ? 'text-[#9aa3af] hover:bg-[#11161e]'
                                  : 'text-[#6b6455] hover:bg-[#f2ede0]'
                            }`}
                          >

                            {conversation.saved && (
                              <Bookmark
                                size={12}
                                className="shrink-0 fill-current text-[#e3a857]"
                              />
                            )}

                            <span className="truncate">
                              {conversation.title ||
                                'Untitled conversation'}
                            </span>

                          </button>


                          {/* THREE DOTS */}

                          <button
                            type="button"
                            onClick={(
                              event,
                            ) => {
                              event.stopPropagation()

                              setOpenMenuId(
                                openMenuId ===
                                  conversation.id
                                  ? null
                                  : conversation.id,
                              )
                            }}
                            className={`absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1 ${
                              isDark
                                ? 'text-[#8a92a0] hover:bg-[#1a2028] hover:text-white'
                                : 'text-[#9a927e] hover:bg-[#efe6d8] hover:text-[#1c2127]'
                            }`}
                            aria-label="Conversation menu"
                          >
                            <MoreHorizontal size={16} />
                          </button>


                          {/* MENU */}

                          {openMenuId ===
                            conversation.id && (
                            <div
                              className={`absolute right-1 top-8 z-50 w-36 rounded-lg border p-1 shadow-xl ${
                                isDark
                                  ? 'border-[#2a3340] bg-[#10151c]'
                                  : 'border-[#e8e1d3] bg-white'
                              }`}
                            >

                              <button
                                type="button"
                                onClick={() =>
                                  startRenameConversation(
                                    conversation,
                                  )
                                }
                                className={`w-full rounded-md px-3 py-2 text-left text-[13px] ${
                                  isDark
                                    ? 'text-[#e3e5e8] hover:bg-[#1a2028]'
                                    : 'text-[#1c2127] hover:bg-[#f2ede0]'
                                }`}
                              >
                                Rename
                              </button>


                              <button
                                type="button"
                                onClick={() =>
                                  void handleSaveConversation(
                                    conversation,
                                  )
                                }
                                className={`w-full rounded-md px-3 py-2 text-left text-[13px] ${
                                  isDark
                                    ? 'text-[#e3e5e8] hover:bg-[#1a2028]'
                                    : 'text-[#1c2127] hover:bg-[#f2ede0]'
                                }`}
                              >
                                {conversation.saved
                                  ? 'Unsave'
                                  : 'Save'}
                              </button>


                              <button
                                type="button"
                                onClick={() =>
                                  void handleDeleteConversation(
                                    conversation,
                                  )
                                }
                                className={`w-full rounded-md px-3 py-2 text-left text-[13px] ${
                                  isDark
                                    ? 'text-red-400 hover:bg-[#1a2028]'
                                    : 'text-red-600 hover:bg-[#f2ede0]'
                                }`}
                              >
                                Delete
                              </button>

                            </div>
                          )}

                        </div>
                      ),
                  )}

                </div>
              ),
            )}

          </div>


          {/* PERMISSION NOTICE */}

          <div
            className={`border-t px-4 py-3 text-[11.5px] leading-relaxed ${
              isDark
                ? 'border-[#161c25] text-[#6b7480]'
                : 'border-[#e8e1d3] text-[#9a927e]'
            }`}
          >
            Answers are restricted to documents your role can
            access.
          </div>

        </aside>


        {/* =====================================================
            CHAT
        ====================================================== */}

        <main className="flex min-w-0 flex-1 flex-col">


          {/* MESSAGES */}

          <div className="flex-1 overflow-y-auto scrollbar-thin px-8 py-6">

            <div className="mx-auto max-w-3xl">


              {/* =================================================
                  SELECTED DOCUMENT
              ================================================== */}

              {selectedDocument && (
                <div
                  className={`mb-5 flex items-center justify-between rounded-lg border px-4 py-3 ${
                    isDark
                      ? 'border-[#2a3340] bg-[#10151c]'
                      : 'border-[#e8e1d3] bg-white'
                  }`}
                >

                  <div className="flex min-w-0 items-center gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#3a1f1f] text-[#e07a6f]">
                      <FileText size={16} />
                    </div>

                    <div className="min-w-0">

                      <div
                        className={`truncate text-[13px] font-medium ${
                          isDark
                            ? 'text-[#e3e5e8]'
                            : 'text-[#1c2127]'
                        }`}
                      >
                        {selectedDocument.name}
                      </div>

                      <div
                        className={`mt-0.5 text-[11.5px] ${
                          isDark
                            ? 'text-[#8a92a0]'
                            : 'text-[#6b6455]'
                        }`}
                      >
                        {selectedDocument.department}
                        {' · '}
                        v
                        {
                          selectedDocument.version
                        }
                        {' · '}
                        Document context selected
                      </div>

                    </div>

                  </div>


                  <button
                    type="button"
                    onClick={
                      handleClearDocument
                    }
                    className={`ml-3 shrink-0 rounded-md p-1.5 ${
                      isDark
                        ? 'text-[#8a92a0] hover:bg-[#1a2028] hover:text-white'
                        : 'text-[#9a927e] hover:bg-[#f2ede0] hover:text-[#1c2127]'
                    }`}
                    aria-label="Remove document context"
                  >
                    <X size={15} />
                  </button>

                </div>
              )}


              {/* DOCUMENT LOADING */}

              {loadingDocument && (
                <div
                  className={`mb-5 flex items-center gap-2 text-[12.5px] ${
                    isDark
                      ? 'text-[#8a92a0]'
                      : 'text-[#6b6455]'
                  }`}
                >
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                  Loading document context...
                </div>
              )}


              {/* ERROR */}

              {error && (
                <div
                  className={`mb-5 rounded-lg border px-4 py-3 text-[13px] ${
                    isDark
                      ? 'border-red-900/50 bg-red-950/20 text-red-300'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {error}
                </div>
              )}


              {/* LOADING */}

              {loadingMessages && (
                <div
                  className={`flex items-center gap-2 text-[13.5px] ${
                    isDark
                      ? 'text-[#8a92a0]'
                      : 'text-[#6b6455]'
                  }`}
                >
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                  Loading conversation...
                </div>
              )}


              {/* EMPTY */}

              {!loadingMessages &&
                messages.length ===
                  0 && (
                  <div
                    className={`flex min-h-[420px] flex-col items-center justify-center gap-3 text-center ${
                      isDark
                        ? 'text-[#6b7480]'
                        : 'text-[#9a927e]'
                    }`}
                  >

                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                        isDark
                          ? 'bg-[#151b23] text-[#e3a857]'
                          : 'bg-[#efe6d8] text-[#0f3d3d]'
                      }`}
                    >
                      <Bot size={22} />
                    </div>

                    <div>

                      <p className="text-[14px] font-medium">
                        {selectedDocument
                          ? `Ask about ${selectedDocument.name}`
                          : 'Ask about your company knowledge'}
                      </p>

                      <p className="mt-1 max-w-md text-[12.5px] leading-relaxed">
                        {selectedDocument
                          ? 'Your question will use this document as the selected context.'
                          : 'Ask a question to start a conversation.'}
                      </p>

                    </div>


                    {/* QUICK QUESTIONS */}

                    {selectedDocument && (
                      <div className="mt-3 flex flex-col gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            askAboutDocument(
                              'Summarize this document in five bullet points.',
                            )
                          }
                          className={`rounded-full border px-3 py-2 text-left text-[12px] ${
                            isDark
                              ? 'border-[#2a3340] text-[#c7cdd6] hover:bg-[#171e27]'
                              : 'border-[#ddd5c6] text-[#3a3628] hover:bg-[#f7f2e9]'
                          }`}
                        >
                          Summarize this document in five bullet points.
                        </button>


                        <button
                          type="button"
                          onClick={() =>
                            askAboutDocument(
                              'What are the three most important rules?',
                            )
                          }
                          className={`rounded-full border px-3 py-2 text-left text-[12px] ${
                            isDark
                              ? 'border-[#2a3340] text-[#c7cdd6] hover:bg-[#171e27]'
                              : 'border-[#ddd5c6] text-[#3a3628] hover:bg-[#f7f2e9]'
                          }`}
                        >
                          What are the three most important rules?
                        </button>


                        <button
                          type="button"
                          onClick={() =>
                            askAboutDocument(
                              'What does this document say about remote work?',
                            )
                          }
                          className={`rounded-full border px-3 py-2 text-left text-[12px] ${
                            isDark
                              ? 'border-[#2a3340] text-[#c7cdd6] hover:bg-[#171e27]'
                              : 'border-[#ddd5c6] text-[#3a3628] hover:bg-[#f7f2e9]'
                          }`}
                        >
                          What does this document say about remote work?
                        </button>

                      </div>
                    )}

                  </div>
                )}


              {/* =================================================
                  MESSAGE LOOP
              ================================================== */}

              {messages.map(
                (message) => {

                  /*
                   * USER MESSAGE
                   */

                  if (
                    message.role ===
                    'user'
                  ) {
                    return (
                      <div
                        key={
                          message.id
                        }
                        className="mb-4 flex justify-end"
                      >
                        <div className="max-w-lg rounded-2xl rounded-tr-sm bg-[#e3a857] px-4 py-2.5 text-[13.5px] font-medium text-[#1a1207]">
                          {
                            message.content
                          }
                        </div>
                      </div>
                    )
                  }


                  /*
                   * ASSISTANT MESSAGE
                   */

                  const sources =
                    (
                      message as any
                    )
                      .sources as
                      | MessageSource[]
                      | null
                      | undefined

                  const feedback =
                    (
                      message as any
                    )
                      .feedback as
                      | MessageFeedback
                      | null
                      | undefined

                  /*
                   * `answered` is the PRIMARY value.
                   *
                   * For old messages without the column,
                   * fallback to the old text detection.
                   */

                  const storedAnswered =
                    (
                      message as any
                    )
                      .answered as
                      | boolean
                      | null
                      | undefined

                  const unanswered =
                    storedAnswered ===
                    false
                      ? true
                      : storedAnswered ===
                          true
                        ? false
                        : fallbackLooksUnanswered(
                            message.content,
                          )

                  const isUnanswered =
                    unanswered ||
                    feedback ===
                      'not_helpful'

                  const isRegenerating =
                    regeneratingId ===
                    message.id

                  const isSavingFeedback =
                    savingFeedbackId ===
                    message.id

                  const sourcesHidden =
                    hiddenSources.has(
                      message.id,
                    )


                  return (
                    <div
                      key={
                        message.id
                      }
                      className="mb-6 flex gap-3"
                    >

                      {/* BOT ICON */}

                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                          isDark
                            ? 'bg-[#1a2028] text-[#e3a857]'
                            : 'bg-[#efe6d8] text-[#0f3d3d]'
                        }`}
                      >
                        <Bot size={16} />
                      </div>


                      {/* ANSWER CARD */}

                      <div
                        className={`min-w-0 flex-1 rounded-2xl rounded-tl-sm border px-5 py-4 text-[13.5px] leading-relaxed ${
                          isDark
                            ? 'border-[#1c2430] bg-[#10151c]'
                            : 'border-[#e8e1d3] bg-white'
                        }`}
                      >


                        {/* ANSWER */}

                        <div
                          className={`prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-blockquote:not-italic prose-blockquote:rounded-r-md prose-blockquote:border-l-4 prose-blockquote:border-[#e3a857] prose-blockquote:px-3 prose-blockquote:py-2 ${
                            isDark
                              ? 'prose-invert text-[#e3e5e8] prose-blockquote:bg-[#241d10]'
                              : 'text-[#1c2127] prose-blockquote:bg-[#faf3e6]'
                          }`}
                        >
                          <ReactMarkdown
                            remarkPlugins={[
                              remarkGfm,
                            ]}
                          >
                            {
                              message.content
                            }
                          </ReactMarkdown>
                        </div>


                        {/* =================================================
                            UNANSWERED WARNING
                        ================================================== */}

                        {isUnanswered && (
                          <div
                            className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-[12px] leading-relaxed ${
                              isDark
                                ? 'border-amber-900/40 bg-amber-950/20 text-amber-300'
                                : 'border-amber-200 bg-amber-50 text-amber-800'
                            }`}
                          >

                            <AlertTriangle
                              size={14}
                              className="mt-0.5 shrink-0"
                            />

                            <span>
                              {unanswered
                                ? 'This question could not be answered from the available company documents. It has been sent to Unanswered Questions for review.'
                                : 'You marked this answer as not helpful. It has been sent to Unanswered Questions for review.'}
                            </span>

                          </div>
                        )}


                        {/* =================================================
                            SOURCES
                            
                            IMPORTANT:
                            Sources are displayed independently
                            of `answered`.
                            
                            Even an unanswered response can have
                            sources.
                        ================================================== */}

                        {sources &&
                          sources.length >
                            0 &&
                          !sourcesHidden && (
                            <div
                              className={`mt-4 border-t pt-3 ${
                                isDark
                                  ? 'border-[#1c2430]'
                                  : 'border-[#e8e1d3]'
                              }`}
                            >

                              <div
                                className={`mb-2 text-[11px] font-semibold tracking-wide ${
                                  isDark
                                    ? 'text-[#6b7480]'
                                    : 'text-[#9a927e]'
                                }`}
                              >
                                SOURCES
                              </div>


                              <div className="flex flex-wrap gap-2">

                                {sources.map(
                                  (
                                    source,
                                    i,
                                  ) => (
                                    <div
                                      key={
                                        i
                                      }
                                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] ${
                                        isDark
                                          ? 'border-[#2a3340] bg-[#151b23] text-[#c7cdd6]'
                                          : 'border-[#e8e1d3] bg-[#faf7f0] text-[#3a3628]'
                                      }`}
                                    >

                                      <FileText
                                        size={
                                          14
                                        }
                                        className="shrink-0 opacity-60"
                                      />

                                      <div>

                                        <div className="font-medium">
                                          {
                                            source.document
                                          }
                                        </div>

                                        <div className="opacity-60">
                                          Page{' '}
                                          {
                                            source.page
                                          }
                                        </div>

                                      </div>

                                    </div>
                                  ),
                                )}

                              </div>

                            </div>
                          )}


                        {/* =================================================
                            ACTIONS
                        ================================================== */}

                        <div
                          className={`mt-3 flex flex-wrap items-center gap-3 text-[12px] ${
                            isDark
                              ? 'text-[#8a92a0]'
                              : 'text-[#6b6455]'
                          }`}
                        >

                          {/* COPY */}

                          <button
                            type="button"
                            onClick={() =>
                              void handleCopy(
                                message.id,
                                message.content,
                              )
                            }
                            className={`flex items-center gap-1 hover:opacity-100 ${
                              copiedId ===
                              message.id
                                ? 'text-green-500'
                                : ''
                            }`}
                          >

                            {copiedId ===
                            message.id ? (
                              <>
                                <Check size={13} />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy size={13} />
                                Copy
                              </>
                            )}

                          </button>


                          {/* HELPFUL */}

                          <button
                            type="button"
                            onClick={() =>
                              void handleFeedback(
                                message.id,
                                'helpful',
                              )
                            }
                            disabled={
                              isSavingFeedback
                            }
                            title={
                              feedback ===
                              'helpful'
                                ? 'Click to remove your rating'
                                : 'Mark as helpful'
                            }
                            className={`flex items-center gap-1 hover:opacity-100 disabled:opacity-40 ${
                              feedback ===
                              'helpful'
                                ? 'text-green-500'
                                : ''
                            }`}
                          >

                            {isSavingFeedback ? (
                              <Loader2
                                size={
                                  13
                                }
                                className="animate-spin"
                              />
                            ) : (
                              <ThumbsUp
                                size={
                                  13
                                }
                              />
                            )}

                            Helpful

                          </button>


                          {/* NOT HELPFUL */}

                          <button
                            type="button"
                            onClick={() =>
                              void handleFeedback(
                                message.id,
                                'not_helpful',
                              )
                            }
                            disabled={
                              isSavingFeedback
                            }
                            title={
                              feedback ===
                              'not_helpful'
                                ? 'Click to remove your rating'
                                : 'Mark as not helpful'
                            }
                            className={`flex items-center gap-1 hover:opacity-100 disabled:opacity-40 ${
                              feedback ===
                              'not_helpful'
                                ? 'text-red-500'
                                : ''
                            }`}
                          >

                            {isSavingFeedback ? (
                              <Loader2
                                size={
                                  13
                                }
                                className="animate-spin"
                              />
                            ) : (
                              <ThumbsDown
                                size={
                                  13
                                }
                              />
                            )}

                            Not helpful

                          </button>


                          {/* REGENERATE */}

                          <button
                            type="button"
                            onClick={() =>
                              void handleRegenerate(
                                message.id,
                              )
                            }
                            disabled={
                              isRegenerating
                            }
                            className="flex items-center gap-1 hover:opacity-100 disabled:opacity-40"
                          >

                            <RefreshCw
                              size={
                                13
                              }
                              className={
                                isRegenerating
                                  ? 'animate-spin'
                                  : ''
                              }
                            />

                            {isRegenerating
                              ? 'Regenerating...'
                              : 'Regenerate'}

                          </button>


                          {/* SOURCES TOGGLE */}

                          {sources &&
                            sources.length >
                              0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleSources(
                                    message.id,
                                  )
                                }
                                className="flex items-center gap-1 hover:opacity-100"
                              >

                                <EyeOff
                                  size={
                                    13
                                  }
                                />

                                {sourcesHidden
                                  ? 'Show sources'
                                  : 'Hide sources'}

                              </button>
                            )}

                        </div>

                      </div>

                    </div>
                  )
                },
              )}


              {/* =================================================
                  SENDING
              ================================================== */}

              {sending && (
                <div className="mb-6 flex gap-3">

                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                      isDark
                        ? 'bg-[#1a2028] text-[#e3a857]'
                        : 'bg-[#efe6d8] text-[#0f3d3d]'
                    }`}
                  >
                    <Bot size={16} />
                  </div>


                  <div
                    className={`flex items-center gap-2 rounded-2xl rounded-tl-sm border px-5 py-4 text-[13px] ${
                      isDark
                        ? 'border-[#1c2430] bg-[#10151c] text-[#8a92a0]'
                        : 'border-[#e8e1d3] bg-white text-[#6b6455]'
                    }`}
                  >
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                    Processing question...
                  </div>

                </div>
              )}

            </div>
          </div>


          {/* =====================================================
              INPUT
          ====================================================== */}

          <div className="px-8 pb-5 pt-2">

            <div className="mx-auto max-w-3xl">

              <div
                className={`flex items-end gap-2 rounded-xl border px-3 py-2.5 ${
                  isDark
                    ? 'border-[#1c2430] bg-[#10151c]'
                    : 'border-[#e8e1d3] bg-white'
                }`}
              >

                {/* ATTACHMENT */}

                <button
                  type="button"
                  disabled
                  className={`cursor-not-allowed ${
                    isDark
                      ? 'text-[#4f5865]'
                      : 'text-[#c1b9a8]'
                  }`}
                  aria-label="Attach file"
                  title="File attachments are not available yet"
                >
                  <Paperclip size={17} />
                </button>


                {/* INPUT */}

                <input
                  value={
                    input
                  }
                  onChange={(
                    event,
                  ) =>
                    setInput(
                      event.target
                        .value,
                    )
                  }
                  onKeyDown={(
                    event,
                  ) => {
                    if (
                      event.key ===
                        'Enter' &&
                      !event.shiftKey
                    ) {
                      event.preventDefault()

                      void handleSend()
                    }
                  }}
                  placeholder={
                    selectedDocument
                      ? 'Ask a question about this document...'
                      : 'Ask a question about your company...'
                  }
                  disabled={
                    sending
                  }
                  className={`flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-[#6b7480] disabled:opacity-60 ${
                    isDark
                      ? 'text-[#e3e5e8]'
                      : 'text-[#1c2127]'
                  }`}
                />


                {/* KEYBOARD HINT */}

                <span
                  className={`hidden shrink-0 text-[11px] sm:block ${
                    isDark
                      ? 'text-[#6b7480]'
                      : 'text-[#9a927e]'
                  }`}
                >
                  Enter to send · Shift + Enter for a new line
                </span>


                {/* SEND */}

                <button
                  type="button"
                  onClick={() =>
                    void handleSend()
                  }
                  disabled={
                    sending ||
                    !input.trim()
                  }
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md disabled:opacity-50 ${
                    isDark
                      ? 'bg-[#1a2028] text-[#e3a857]'
                      : 'bg-[#f0ece1] text-[#0f3d3d]'
                  }`}
                  aria-label="Send question"
                >

                  {sending ? (
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                  ) : (
                    <SendHorizontal
                      size={15}
                    />
                  )}

                </button>

              </div>

            </div>

          </div>


          <DemoNotice />


          {/* =====================================================
              TOAST
          ====================================================== */}

          {toast && (
            <div
              className={`pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border px-4 py-2 text-[12.5px] font-medium shadow-lg ${
                isDark
                  ? 'border-[#2a3340] bg-[#151b23] text-[#e3e5e8]'
                  : 'border-[#e8e1d3] bg-white text-[#1c2127]'
              }`}
            >
              {toast}
            </div>
          )}

        </main>
      </div>
    </AppLayout>
  )
}