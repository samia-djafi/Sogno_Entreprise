import { supabase } from './supabaseClient'

export type GapReason = 'ungrounded' | 'not_helpful' | 'unanswered'

function normalizeQuestion(question: string) {
  return question.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Look up the department for a conversation, via
 * conversations.user_id -> profiles.department.
 * Returns 'General' if either row can't be found.
 */
export async function getDepartmentForConversation(conversationId: string): Promise<string> {
  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .select('user_id')
    .eq('id', conversationId)
    .single()

  if (conversationError || !conversation) return 'General'

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('department')
    .eq('id', conversation.user_id)
    .single()

  if (profileError || !profile) return 'General'

  return profile.department ?? 'General'
}

/**
 * Record (or increment) a question gap. Call this the moment a gap
 * happens:
 *  - in callAssistant, right after an answer comes back with no
 *    sources
 *  - in handleFeedback, right when feedback is set to 'not_helpful'
 *
 * Fire-and-forget is fine here — a failed insert (e.g. before the
 * migration has been run) shouldn't block the chat UI, so this
 * only logs a warning on failure.
 */
/**export async function recordQuestionGap(params: {
  question: string
  conversationId: string
  messageId: string
  reason: GapReason
}) {
  const { question, conversationId, messageId, reason } = params
  const questionKey = normalizeQuestion(question)
  const department = await getDepartmentForConversation(conversationId)

  const { error } = await supabase.rpc('record_question_gap', {
    p_question_key: questionKey,
    p_question: question,
    p_department: department,
    p_conversation_id: conversationId,
    p_message_id: messageId,
    p_reason: reason,
  })

  if (error) {
    console.warn('Could not record question gap (has the migration run?):', error)
  }
}

*/
export async function recordQuestionGap(params: {
  question: string
  conversationId: string
  messageId: string
  reason: GapReason
}) {
  const { question, conversationId, messageId, reason } = params

  const questionKey = normalizeQuestion(question)

  const department = await getDepartmentForConversation(conversationId)

  console.log('Recording question gap:', {
    questionKey,
    question,
    department,
    conversationId,
    messageId,
    reason,
  })

  const { data, error } = await supabase.rpc('record_question_gap', {
    p_question_key: questionKey,
    p_question: question,
    p_department: department,
    p_conversation_id: conversationId,
    p_message_id: messageId,
    p_reason: reason,
  })

  if (error) {
    console.error('❌ record_question_gap RPC FAILED:', error)
    return false
  }

  console.log('✅ Question gap recorded:', data)

  return true
}