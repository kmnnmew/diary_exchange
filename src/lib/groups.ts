import { supabase } from './supabase'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface GroupData {
  id: string
  name: string
  description: string
  owner_id: string
  max_members: number
  is_private: boolean
  invite_code: string
  invite_method: string
  invite_password?: string | null
  created_at: string
}

export interface GroupWithCount extends GroupData {
  member_count: number
  is_owner: boolean
}

// ── Create a new group ────────────────────────────────────────────────────────
export async function createGroup(
  params: {
    name: string
    description?: string
    maxMembers?: number
    isPrivate?: boolean
    inviteMethod?: 'link' | 'password'
    invitePassword?: string
  },
  userId: string
): Promise<{ data: GroupData | null; error: string | null }> {
  const { data: group, error } = await supabase
    .from('groups')
    .insert({
      name: params.name,
      description: params.description ?? '',
      owner_id: userId,
      max_members: params.maxMembers ?? 6,
      is_private: params.isPrivate ?? false,
      invite_method: params.inviteMethod ?? 'link',
      invite_password: params.invitePassword || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[groups] createGroup error:', error)
    return { data: null, error: error.message }
  }

  // Auto-join creator as owner
  const { error: memberError } = await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      user_id: userId,
      role: 'owner',
      status: 'active',
    })

  if (memberError) {
    console.error('[groups] createGroup member insert error:', memberError)
  }

  return { data: group as GroupData, error: null }
}

// ── Get public groups with member count ──────────────────────────────────────
export async function getPublicGroups(): Promise<GroupWithCount[]> {
  const { data: groups, error } = await supabase
    .from('groups')
    .select('*')
    .eq('is_private', false)

  if (error || !groups) {
    console.error('[groups] getPublicGroups error:', error)
    return []
  }

  const withCounts = await Promise.all(
    groups.map(async (g) => {
      const { count } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', g.id)
        .eq('status', 'active')
      return { ...(g as GroupData), member_count: count ?? 0, is_owner: false }
    })
  )

  return withCounts
}

// ── Get groups the user is a member of ──────────────────────────────────────
export async function getMyGroups(userId: string): Promise<GroupWithCount[]> {
  const { data: memberships, error } = await supabase
    .from('group_members')
    .select('group_id, role')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (error || !memberships || memberships.length === 0) {
    if (error) console.error('[groups] getMyGroups memberships error:', error)
    return []
  }

  const groupIds = memberships.map((m) => m.group_id)
  const roleMap: Record<string, string> = Object.fromEntries(
    memberships.map((m) => [m.group_id, m.role])
  )

  const { data: groups, error: groupsError } = await supabase
    .from('groups')
    .select('*')
    .in('id', groupIds)

  if (groupsError || !groups) {
    console.error('[groups] getMyGroups groups error:', groupsError)
    return []
  }

  const withCounts = await Promise.all(
    groups.map(async (g) => {
      const { count } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', g.id)
        .eq('status', 'active')
      return {
        ...(g as GroupData),
        member_count: count ?? 0,
        is_owner: roleMap[g.id] === 'owner',
      }
    })
  )

  return withCounts
}

// ── Join a group by invite code ──────────────────────────────────────────────
export async function joinGroupByInviteCode(
  code: string,
  userId: string,
  password?: string
): Promise<{ success: boolean; error?: string; groupId?: string }> {
  const { data: group, error } = await supabase
    .from('groups')
    .select('id, max_members, invite_method, invite_password')
    .eq('invite_code', code)
    .maybeSingle()

  if (error || !group) {
    return { success: false, error: '유효하지 않은 초대 코드입니다.' }
  }

  // Check password for password-protected groups
  if (group.invite_method === 'password') {
    if (!password) {
      return { success: false, error: '비밀번호가 필요합니다.' }
    }
    if (password !== group.invite_password) {
      return { success: false, error: '비밀번호가 올바르지 않습니다.' }
    }
  }

  return joinGroup(group.id, userId)
}

// ── Join a group directly ────────────────────────────────────────────────────
export async function joinGroup(
  groupId: string,
  userId: string
): Promise<{ success: boolean; error?: string; groupId?: string }> {
  // Check if already a member
  const { data: existing } = await supabase
    .from('group_members')
    .select('id, status')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'active') {
      return { success: false, error: '이미 참여 중인 그룹입니다.' }
    }
    // Re-activate if previously left
    await supabase
      .from('group_members')
      .update({ status: 'active' })
      .eq('id', existing.id)
    return { success: true, groupId }
  }

  // Check capacity
  const { data: group } = await supabase
    .from('groups')
    .select('max_members')
    .eq('id', groupId)
    .single()

  const { count } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .eq('status', 'active')

  if (group && count !== null && count >= group.max_members) {
    return { success: false, error: '그룹 정원이 가득 찼습니다.' }
  }

  const { error } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: userId, role: 'member', status: 'active' })

  if (error) {
    console.error('[groups] joinGroup error:', error)
    return { success: false, error: '그룹 참여에 실패했습니다.' }
  }

  return { success: true, groupId }
}

// ── Submit a group diary ─────────────────────────────────────────────────────
export async function submitGroupDiary(params: {
  groupId: string
  userId: string
  content: string
  emotion?: string
  stamp?: string
  paper?: string
}): Promise<{ success: boolean; diaryId?: string; error?: string }> {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })

  // Daily limit: one group diary per day
  const { data: existing } = await supabase
    .from('diaries')
    .select('id')
    .eq('author_id', params.userId)
    .eq('exchange_mode', 'group')
    .eq('created_date', today)
    .maybeSingle()

  if (existing) {
    return { success: false, error: '오늘 이미 그룹 일기를 작성했습니다.' }
  }

  const insertPayload: Record<string, unknown> = {
    author_id: params.userId,
    content: params.content,
    exchange_mode: 'group',
    created_date: today,
    status: 'waiting',
  }
  if (params.emotion) insertPayload.emotion = params.emotion
  if (params.stamp) insertPayload.stamp = params.stamp
  if (params.paper) insertPayload.paper_design = params.paper

  const { data: diary, error } = await supabase
    .from('diaries')
    .insert(insertPayload)
    .select('id')
    .single()

  if (error || !diary) {
    console.error('[groups] submitGroupDiary error:', error)
    return { success: false, error: '일기 저장에 실패했습니다.' }
  }

  // Try to match with another group member
  await matchGroupDiary(diary.id, params.groupId, params.userId)

  return { success: true, diaryId: diary.id }
}

// ── Match a group diary with a receiver ─────────────────────────────────────
export async function matchGroupDiary(
  diaryId: string,
  groupId: string,
  senderId: string
): Promise<void> {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })

  // Get all active group members except sender
  const { data: members } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('status', 'active')
    .neq('user_id', senderId)

  if (!members || members.length === 0) return

  const memberIds = members.map((m) => m.user_id)

  // Find sender IDs already matched today in this group
  const { data: alreadyMatched } = await supabase
    .from('group_match_cycles')
    .select('sender_id')
    .eq('group_id', groupId)
    .eq('match_date', today)

  const matchedSenderIds = new Set((alreadyMatched ?? []).map((m) => m.sender_id))

  // Find members who haven't been matched as sender yet today
  const unmatchedMemberIds = memberIds.filter((id) => !matchedSenderIds.has(id))

  if (unmatchedMemberIds.length === 0) return

  // Pick the first available unmatched member
  const receiverId = unmatchedMemberIds[0]

  // Find receiver's group diary for today
  const { data: receiverDiary } = await supabase
    .from('diaries')
    .select('id')
    .eq('author_id', receiverId)
    .eq('exchange_mode', 'group')
    .eq('created_date', today)
    .maybeSingle()

  if (!receiverDiary) return // Receiver hasn't written yet; will be matched when they do

  // Get current cycle count for numbering
  const { count } = await supabase
    .from('group_match_cycles')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId)

  const cycleNumber = (count ?? 0) + 1

  // Create mutual match: sender↔receiver
  await supabase.from('group_match_cycles').insert([
    {
      group_id: groupId,
      cycle_number: cycleNumber,
      sender_id: senderId,
      receiver_id: receiverId,
      diary_id: diaryId,
      match_date: today,
    },
    {
      group_id: groupId,
      cycle_number: cycleNumber + 1,
      sender_id: receiverId,
      receiver_id: senderId,
      diary_id: receiverDiary.id,
      match_date: today,
    },
  ])
}

// ── Leave a group ────────────────────────────────────────────────────────────
export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .update({ status: 'left' })
    .eq('group_id', groupId)
    .eq('user_id', userId)

  if (error) console.error('[groups] leaveGroup error:', error)
}
