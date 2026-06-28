import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../lib/supabase'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/join/:inviteCode',
    name: 'join',
    component: () => import('../views/JoinView.vue'),
    meta: { public: true },
  },
  {
    path: '/demo',
    name: 'demo',
    component: () => import('../views/DemoView.vue'),
    meta: { public: true },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
  },
  {
    path: '/handler/:groupId',
    name: 'handler',
    component: () => import('../views/handler/HandlerView.vue'),
  },
  {
    path: '/play/:groupId',
    name: 'play',
    component: () => import('../views/play/PlayView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  if (to.meta.public) return true

  const { data } = await supabase.auth.getSession()
  if (!data.session) return { name: 'login', query: { redirect: to.fullPath } }

  if (to.name === 'handler' && to.params.groupId) {
    const userId = data.session.user.id
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', to.params.groupId)
      .eq('user_id', userId)
      .single()
    if (!membership || membership.role !== 'handler') {
      return { name: 'play', params: { groupId: to.params.groupId } }
    }
  }

  return true
})

export default router
