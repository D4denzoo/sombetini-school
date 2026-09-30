'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Languages, Send, Sparkles, X } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const prompts: Record<'sw' | 'en', string[]> = {
  sw: ['Nawezaje kuona matokeo ya mtoto wangu?', 'Nawezaje kupata control number?', 'Mtihani wa muhula unaanza lini?', 'Shule itafunguliwa lini?'],
  en: ['How do I see my child’s results?', 'How do I get a control number?', 'When do term exams start?', 'When does school reopen?'],
};

type Message = { role: 'user' | 'assistant'; content: string };

export function Assistant() {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<'sw' | 'en'>('sw');
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Karibu! Mimi ni Msaidizi wa Sombetini. Naweza kukuelekeza kuhusu matokeo, malipo, mitihani na matukio ya shule. Uliza swali lolote.' },
  ]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  async function ask(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setMessages((current) => [...current, { role: 'user', content: message }]);
    setInput('');
    setBusy(true);
    try {
      const data = await api<{ sessionId: string; message: string }>('/ai/chat', { method: 'POST', body: JSON.stringify({ message, sessionId, language }) });
      setSessionId(data.sessionId);
      setMessages((current) => [...current, { role: 'assistant', content: data.message }]);
    } catch (error) {
      setMessages((current) => [...current, { role: 'assistant', content: error instanceof Error ? error.message : 'Samahani, msaidizi hapatikani kwa sasa.' }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {open && (
          <motion.section
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="mb-3 flex h-[min(34rem,calc(100vh-7rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-lift"
            aria-label="Msaidizi wa Sombetini"
          >
            <header className="dark-band flex items-center justify-between px-4 py-3.5 text-white">
              <div className="flex items-center gap-3">
                <span className="relative grid h-10 w-10 place-items-center rounded-2xl bg-white/15">
                  <Bot className="h-5 w-5" />
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-lime-400 ring-2 ring-brand-900" />
                </span>
                <div>
                  <p className="font-display text-sm font-semibold">Msaidizi wa Sombetini</p>
                  <p className="text-[11px] text-white/65">Swahili · English</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setLanguage(language === 'sw' ? 'en' : 'sw')} className="inline-flex items-center gap-1 rounded-full border border-white/20 px-2.5 py-1 text-[11px] font-semibold hover:bg-white/10" aria-label="Switch language">
                  <Languages className="h-3.5 w-3.5" /> {language.toUpperCase()}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-white/10" aria-label="Close assistant">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-muted/40 p-4">
              {messages.map((item, index) => (
                <motion.div key={index} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn('flex', item.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <p className={cn('max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-soft', item.role === 'assistant' ? 'rounded-tl-md bg-background' : 'rounded-tr-md bg-brand-600 text-white')}>
                    {item.content}
                  </p>
                </motion.div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <span className="inline-flex gap-1 rounded-2xl rounded-tl-md bg-background px-3.5 py-3 shadow-soft">
                    {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400" style={{ animationDelay: `${i * 120}ms` }} />)}
                  </span>
                </div>
              )}
              {messages.length <= 1 && (
                <div className="grid gap-2 pt-2">
                  {prompts[language].map((prompt) => (
                    <button key={prompt} type="button" onClick={() => ask(prompt)} className="rounded-xl border border-border bg-background px-3 py-2 text-left text-xs font-medium text-foreground transition hover:border-brand-300 hover:bg-secondary">
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form className="flex items-center gap-2 border-t p-3" onSubmit={(event: FormEvent) => { event.preventDefault(); ask(input); }}>
              <label className="sr-only" htmlFor="assistant-input">Message</label>
              <input id="assistant-input" value={input} onChange={(e) => setInput(e.target.value)} className="h-11 flex-1 rounded-full border border-input bg-background px-4 text-sm outline-none focus:border-brand-400" placeholder={language === 'sw' ? 'Andika swali lako…' : 'Type your question…'} />
              <button className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-50" disabled={busy} aria-label="Send">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen(!open)}
        className="ml-auto flex h-14 items-center gap-2.5 rounded-full bg-gradient-to-r from-brand-600 to-brand-700 pl-4 pr-5 font-semibold text-white shadow-lift ring-4 ring-brand-600/15"
        aria-expanded={open}
      >
        <span className="relative grid h-8 w-8 place-items-center rounded-full bg-white/15">
          <Sparkles className="h-4 w-4 text-gold-300" />
        </span>
        <span className="text-sm">Msaidizi</span>
      </motion.button>
    </div>
  );
}
