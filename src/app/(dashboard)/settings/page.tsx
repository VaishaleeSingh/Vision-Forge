'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Key, User, Zap, Save, Check, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useSession } from 'next-auth/react'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<'account' | 'api' | 'usage'>('api')
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<any>(null)

  const [keys, setKeys] = useState({
    gemini: '',
    groq: '',
    fal: '',
    huggingface: '',
    mongodb: '',
    googleId: '',
    googleSecret: '',
    githubId: '',
    githubSecret: '',
    nextauthSecret: ''
  })
  const [keysLoading, setKeysLoading] = useState(true)

  // Fetch API keys on mount
  useEffect(() => {
    fetch('/api/settings/env')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setKeys({
            gemini: data.gemini || '',
            groq: data.groq || '',
            fal: data.fal || '',
            huggingface: data.huggingface || '',
            mongodb: data.mongodb || '',
            googleId: data.googleId || '',
            googleSecret: data.googleSecret || '',
            githubId: data.githubId || '',
            githubSecret: data.githubSecret || '',
            nextauthSecret: data.nextauthSecret || ''
          })
        }
        setKeysLoading(false)
      })
      .catch(e => {
        console.error('Failed to fetch keys:', e)
        setKeysLoading(false)
      })
  }, [])

  // Fetch usage stats when usage tab is clicked or on mount
  useEffect(() => {
    if (activeTab === 'usage' && !stats) {
      setLoading(true)
      fetch('/api/analytics')
        .then(res => res.json())
        .then(data => {
          setStats(data.stats)
          setLoading(false)
        })
        .catch(e => {
          console.error(e)
          setLoading(false)
        })
    }
  }, [activeTab, stats])

  const handleSave = async () => {
    try {
      const res = await fetch('/api/settings/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keys)
      })
      if (res.ok) {
        setSaved(true)
        setIsEditing(false)
        setTimeout(() => setSaved(false), 2000)
      } else {
        alert('Failed to save API keys')
      }
    } catch (e) {
      console.error(e)
      alert('Error saving API keys')
    }
  }

  const toggleShow = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-serif text-3xl text-[#1a2332] flex items-center gap-3 mb-2">
          <span className="inline-flex w-10 h-10 rounded-xl items-center justify-center bg-gradient-to-br from-aqua-400 to-aqua-600">
            <SettingsIcon size={20} className="text-white" />
          </span>
          Settings
        </h1>
        <p className="text-sm text-[#718096] ml-[52px]">
          Manage your account, API keys, and usage limits.
        </p>
      </motion.div>

      <div className="glass-card p-1.5 flex gap-1 w-fit mb-6">
        {[
          { id: 'api', label: 'API Keys', icon: Key },
          { id: 'account', label: 'Account', icon: User },
          { id: 'usage', label: 'Usage', icon: Zap },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                relative px-5 py-2 rounded-xl text-sm font-semibold transition-all
                ${activeTab === tab.id ? 'text-white' : 'text-[#718096] hover:text-[#1a2332]'}
              `}
            >
              {activeTab === tab.id && (
                <motion.span
                  layoutId="settings-tab"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #0bbfbf, #0899a0)' }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon size={14} />
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'api' && (
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-[#1a2332]">Environment Configuration</h2>
                <p className="text-sm text-[#718096]">
                  Manage all system keys and secrets securely.
                </p>
              </div>
              {!isEditing && !keysLoading && (
                <button onClick={() => setIsEditing(true)} className="btn-secondary text-xs px-4 py-2">
                  Edit Keys
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {keysLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-aqua-500" />
                </div>
              ) : (
                <>
                  <h3 className="text-md font-semibold text-[#1a2332] mt-6 border-b border-beige-200 pb-2">AI Provider Keys</h3>
                  
                  {/* Gemini */}
                  <div>
                    <label className="block text-sm font-semibold text-[#1a2332] mb-1">
                      Google Gemini API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showKeys.gemini ? 'text' : 'password'}
                        value={keys.gemini}
                        onChange={e => setKeys(k => ({ ...k, gemini: e.target.value }))}
                        disabled={!isEditing}
                        className="input-base pr-10 disabled:opacity-50 disabled:bg-beige-50 disabled:cursor-not-allowed"
                        placeholder="AIzaSy..."
                      />
                      <button 
                        onClick={() => toggleShow('gemini')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718096] hover:text-aqua-600"
                      >
                        {showKeys.gemini ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Groq */}
                  <div>
                    <label className="block text-sm font-semibold text-[#1a2332] mb-1">
                      Groq API Key <span className="badge badge-beige text-[10px] ml-2">Optional</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showKeys.groq ? 'text' : 'password'}
                        value={keys.groq}
                        onChange={e => setKeys(k => ({ ...k, groq: e.target.value }))}
                        disabled={!isEditing}
                        className="input-base pr-10 disabled:opacity-50 disabled:bg-beige-50 disabled:cursor-not-allowed"
                        placeholder="gsk_..."
                      />
                      <button 
                        onClick={() => toggleShow('groq')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718096] hover:text-aqua-600"
                      >
                        {showKeys.groq ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Fal.ai */}
                  <div>
                    <label className="block text-sm font-semibold text-[#1a2332] mb-1">
                      Fal.ai API Key <span className="badge badge-aqua text-[10px] ml-2">Images</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showKeys.fal ? 'text' : 'password'}
                        value={keys.fal}
                        onChange={e => setKeys(k => ({ ...k, fal: e.target.value }))}
                        disabled={!isEditing}
                        className="input-base pr-10 disabled:opacity-50 disabled:bg-beige-50 disabled:cursor-not-allowed"
                        placeholder="fal_key_..."
                      />
                      <button 
                        onClick={() => toggleShow('fal')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718096] hover:text-aqua-600"
                      >
                        {showKeys.fal ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* HuggingFace */}
                  <div>
                    <label className="block text-sm font-semibold text-[#1a2332] mb-1">
                      HuggingFace API Key <span className="badge badge-beige text-[10px] ml-2">Optional</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showKeys.huggingface ? 'text' : 'password'}
                        value={keys.huggingface}
                        onChange={e => setKeys(k => ({ ...k, huggingface: e.target.value }))}
                        disabled={!isEditing}
                        className="input-base pr-10 disabled:opacity-50 disabled:bg-beige-50 disabled:cursor-not-allowed"
                        placeholder="hf_..."
                      />
                      <button 
                        onClick={() => toggleShow('huggingface')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718096] hover:text-aqua-600"
                      >
                        {showKeys.huggingface ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <h3 className="text-md font-semibold text-[#1a2332] mt-8 border-b border-beige-200 pb-2">System Configuration</h3>

                  {/* MongoDB */}
                  <div>
                    <label className="block text-sm font-semibold text-[#1a2332] mb-1">
                      MongoDB URI
                    </label>
                    <div className="relative">
                      <input
                        type={showKeys.mongodb ? 'text' : 'password'}
                        value={keys.mongodb}
                        onChange={e => setKeys(k => ({ ...k, mongodb: e.target.value }))}
                        disabled={!isEditing}
                        className="input-base pr-10 disabled:opacity-50 disabled:bg-beige-50 disabled:cursor-not-allowed"
                        placeholder="mongodb+srv://..."
                      />
                      <button 
                        onClick={() => toggleShow('mongodb')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718096] hover:text-aqua-600"
                      >
                        {showKeys.mongodb ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* NextAuth Secret */}
                  <div>
                    <label className="block text-sm font-semibold text-[#1a2332] mb-1">
                      NextAuth Secret
                    </label>
                    <div className="relative">
                      <input
                        type={showKeys.nextauthSecret ? 'text' : 'password'}
                        value={keys.nextauthSecret}
                        onChange={e => setKeys(k => ({ ...k, nextauthSecret: e.target.value }))}
                        disabled={!isEditing}
                        className="input-base pr-10 disabled:opacity-50 disabled:bg-beige-50 disabled:cursor-not-allowed"
                        placeholder="Secret string..."
                      />
                      <button 
                        onClick={() => toggleShow('nextauthSecret')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718096] hover:text-aqua-600"
                      >
                        {showKeys.nextauthSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Google OAuth */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-[#1a2332]">Google OAuth</h4>
                      <div>
                        <label className="block text-xs font-semibold text-[#718096] mb-1">Client ID</label>
                        <input
                          type="text"
                          value={keys.googleId}
                          onChange={e => setKeys(k => ({ ...k, googleId: e.target.value }))}
                          disabled={!isEditing}
                          className="input-base disabled:opacity-50 disabled:bg-beige-50 disabled:cursor-not-allowed"
                          placeholder="Client ID"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#718096] mb-1">Client Secret</label>
                        <div className="relative">
                          <input
                            type={showKeys.googleSecret ? 'text' : 'password'}
                            value={keys.googleSecret}
                            onChange={e => setKeys(k => ({ ...k, googleSecret: e.target.value }))}
                            disabled={!isEditing}
                            className="input-base pr-10 disabled:opacity-50 disabled:bg-beige-50 disabled:cursor-not-allowed"
                            placeholder="Client Secret"
                          />
                          <button onClick={() => toggleShow('googleSecret')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718096]">
                            {showKeys.googleSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Github OAuth */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-[#1a2332]">GitHub OAuth</h4>
                      <div>
                        <label className="block text-xs font-semibold text-[#718096] mb-1">Client ID</label>
                        <input
                          type="text"
                          value={keys.githubId}
                          onChange={e => setKeys(k => ({ ...k, githubId: e.target.value }))}
                          disabled={!isEditing}
                          className="input-base disabled:opacity-50 disabled:bg-beige-50 disabled:cursor-not-allowed"
                          placeholder="Client ID"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#718096] mb-1">Client Secret</label>
                        <div className="relative">
                          <input
                            type={showKeys.githubSecret ? 'text' : 'password'}
                            value={keys.githubSecret}
                            onChange={e => setKeys(k => ({ ...k, githubSecret: e.target.value }))}
                            disabled={!isEditing}
                            className="input-base pr-10 disabled:opacity-50 disabled:bg-beige-50 disabled:cursor-not-allowed"
                            placeholder="Client Secret"
                          />
                          <button onClick={() => toggleShow('githubSecret')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718096]">
                            {showKeys.githubSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
            </>
          )}
            </div>

            <div className="pt-4 border-t border-beige-200 flex justify-end gap-3">
              {isEditing && (
                <button onClick={() => setIsEditing(false)} className="btn-ghost">
                  Cancel
                </button>
              )}
              <button 
                onClick={isEditing ? handleSave : () => setIsEditing(true)} 
                disabled={keysLoading} 
                className="btn-primary disabled:opacity-50"
              >
                {saved ? (
                  <><Check size={16} /> Saved Successfully</>
                ) : isEditing ? (
                  <><Save size={16} /> Save Configuration</>
                ) : (
                  'Edit Keys'
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="glass-card p-6 flex flex-col items-center justify-center text-center h-[300px]">
            <div className="w-20 h-20 bg-aqua-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm overflow-hidden">
              {session?.user?.image ? (
                <img src={session.user.image} alt={session?.user?.name || 'User'} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-aqua-700">
                  {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : <User size={32} className="text-aqua-600" />}
                </span>
              )}
            </div>
            <h2 className="text-xl font-semibold text-[#1a2332]">{session?.user?.name || 'VisionForge User'}</h2>
            <p className="text-sm text-[#718096] mb-4">{session?.user?.email || 'Not logged in'}</p>
            <span className="badge badge-aqua">Pro Plan Active</span>
          </div>
        )}

        {activeTab === 'usage' && (
          <div className="glass-card p-6 space-y-6">
            <h2 className="text-lg font-semibold text-[#1a2332]">Current Billing Cycle</h2>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-aqua-500" />
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-[#1a2332]">Text Generations (Tokens)</span>
                    <span className="text-[#718096]">
                      {stats?.totalTokens > 1000 ? `${(stats?.totalTokens / 1000).toFixed(1)}k` : stats?.totalTokens || 0} / 100k
                    </span>
                  </div>
                  <div className="w-full bg-beige-200 rounded-full h-2">
                    <div className="bg-aqua-500 h-2 rounded-full" style={{ width: `${Math.min(((stats?.totalTokens || 0) / 100000) * 100, 100)}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-[#1a2332]">Image Generations</span>
                    <span className="text-[#718096]">{stats?.imagesCreated || 0} / 50</span>
                  </div>
                  <div className="w-full bg-beige-200 rounded-full h-2">
                    <div className="bg-teal-500 h-2 rounded-full" style={{ width: `${Math.min(((stats?.imagesCreated || 0) / 50) * 100, 100)}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-[#1a2332]">RAG Documents</span>
                    <span className="text-[#718096]">{stats?.docsUploaded || 0} / 10</span>
                  </div>
                  <div className="w-full bg-beige-200 rounded-full h-2">
                    <div className="bg-cyan-500 h-2 rounded-full" style={{ width: `${Math.min(((stats?.docsUploaded || 0) / 10) * 100, 100)}%` }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}
