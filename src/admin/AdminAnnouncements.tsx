import { useState, useEffect } from 'react';
import { Plus, Trash2, Send, Save, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Announcement } from './types';

const CATEGORIES = ['General', 'Clinical Update', 'Training', 'Alert', 'System'] as const;
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;

const PRIORITY_COLORS: Record<string, string> = {
  Low: 'bg-gray-100 text-gray-600',
  Medium: 'bg-[#E1F5EE] text-[#0F6E56]',
  High: 'bg-[#FAEEDA] text-[#BA7517]',
  Critical: 'bg-[#FAECE7] text-[#A32D2D]',
};

const CAT_COLORS: Record<string, string> = {
  General: 'bg-gray-100 text-gray-600',
  'Clinical Update': 'bg-[#E1F5EE] text-[#0F6E56]',
  Training: 'bg-blue-50 text-[#185FA5]',
  Alert: 'bg-[#FAECE7] text-[#A32D2D]',
  System: 'bg-gray-100 text-gray-700',
};

type FormData = {
  title: string;
  body: string;
  category: string;
  priority: Announcement['priority'];
  is_published: boolean;
};

const EMPTY_FORM: FormData = {
  title: '',
  body: '',
  category: 'General',
  priority: 'Medium',
  is_published: false,
};

export default function AdminAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadAnnouncements = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    setItems((data as Announcement[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleNew = () => {
    setSelected(null);
    setForm(EMPTY_FORM);
  };

  const handleSelect = (ann: Announcement) => {
    setSelected(ann);
    setForm({
      title: ann.title,
      body: ann.body,
      category: ann.category,
      priority: ann.priority,
      is_published: ann.is_published,
    });
  };

  const handleSave = async (publish: boolean) => {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = { ...form, is_published: publish };

    if (selected) {
      await supabase.from('announcements').update(payload).eq('id', selected.id);
      setSelected({ ...selected, ...payload } as Announcement);
    } else {
      const { data } = await supabase
        .from('announcements')
        .insert(payload)
        .select()
        .single();
      if (data) setSelected(data as Announcement);
    }

    setForm({ ...form, is_published: publish });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    loadAnnouncements();
  };

  const handleDelete = async () => {
    if (!selected) return;
    await supabase.from('announcements').delete().eq('id', selected.id);
    setSelected(null);
    setForm(EMPTY_FORM);
    loadAnnouncements();
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#0F6E56]" /></div>;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-full">
      <div className="lg:w-80 xl:w-96 flex-shrink-0 space-y-3">
        <button
          onClick={handleNew}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0F6E56] hover:bg-[#0d5844] text-white text-sm font-semibold transition-colors"
        >
          <Plus size={16} />
          New Announcement
        </button>

        {items.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E3DC] p-6 text-center text-sm text-[#5F5E5A]">
            No announcements yet
          </div>
        ) : (
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {items.map((ann) => (
              <button
                key={ann.id}
                onClick={() => handleSelect(ann)}
                className={`w-full text-left bg-white rounded-xl border p-4 transition-all ${
                  selected?.id === ann.id ? 'border-[#0F6E56] shadow-md' : 'border-[#E5E3DC] hover:border-[#0F6E56]/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-sm text-[#1A1A1A] line-clamp-1">{ann.title}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                    ann.is_published ? 'bg-[#EAF3DE] text-[#27500A]' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {ann.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${CAT_COLORS[ann.category] || 'bg-gray-100 text-gray-600'}`}>
                    {ann.category}
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${PRIORITY_COLORS[ann.priority]}`}>
                    {ann.priority}
                  </span>
                  <span className="text-[10px] text-[#5F5E5A] ml-auto">
                    {new Date(ann.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 bg-white rounded-xl border border-[#E5E3DC] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E3DC] flex items-center justify-between">
          <h2 className="font-semibold text-[#1A1A1A] text-sm">
            {selected ? 'Edit Announcement' : 'New Announcement'}
          </h2>
          {saved && (
            <span className="text-xs text-[#27500A] bg-[#EAF3DE] px-2 py-1 rounded-lg font-medium">
              Saved successfully
            </span>
          )}
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Announcement title..."
              className="w-full px-4 py-2.5 border border-[#E5E3DC] rounded-xl text-sm text-[#1A1A1A] focus:outline-none focus:border-[#0F6E56] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full px-4 py-2.5 border border-[#E5E3DC] rounded-xl text-sm text-[#1A1A1A] focus:outline-none focus:border-[#0F6E56] bg-white"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Announcement['priority'] }))}
                className="w-full px-4 py-2.5 border border-[#E5E3DC] rounded-xl text-sm text-[#1A1A1A] focus:outline-none focus:border-[#0F6E56] bg-white"
              >
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">Body</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Write your announcement here..."
              rows={6}
              className="w-full px-4 py-3 border border-[#E5E3DC] rounded-xl text-sm text-[#1A1A1A] focus:outline-none focus:border-[#0F6E56] resize-none transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => handleSave(false)}
              disabled={!form.title.trim() || saving}
              className="flex items-center gap-2 px-4 py-2.5 border border-[#E5E3DC] rounded-xl text-sm font-semibold text-[#1A1A1A] hover:border-[#0F6E56] hover:text-[#0F6E56] transition-colors disabled:opacity-40 bg-white"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save Draft
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={!form.title.trim() || saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0F6E56] hover:bg-[#0d5844] text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Publish
            </button>
            {selected && (
              <button
                onClick={handleDelete}
                className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-[#FAECE7] hover:bg-[#A32D2D] text-[#A32D2D] hover:text-white rounded-xl text-sm font-semibold transition-colors"
              >
                <Trash2 size={15} />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
