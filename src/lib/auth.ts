import { supabase } from './supabase'

export async function signUp(email: string, password: string, nickname: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nickname } }, // picked up by handle_new_user trigger
  })
  if (error) throw error

  // Upsert profile so nickname is correct even if trigger already ran
  if (data.user) {
    await supabase
      .from('profiles')
      .upsert({ id: data.user.id, email, nickname }, { onConflict: 'id' })
  }

  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}
