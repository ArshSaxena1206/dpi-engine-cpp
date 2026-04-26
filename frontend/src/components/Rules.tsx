import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Info, Plus, Trash2, Globe, ShieldCheck, AppWindow, Network, HelpCircle, Upload, Download, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import toast from 'react-hot-toast';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API = 'http://localhost:3001/api/v1';

interface Rule {
  id: number;
  type: 'app' | 'domain' | 'ip';
  value: string;
  enabled: boolean;
  created_at: string;
}

// ── Sortable Rule Row ────────────────────────────────────────────
function SortableRule({ rule, onDelete, onToggle }: { rule: Rule; onDelete: (id: number) => void; onToggle: (id: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rule.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined, opacity: isDragging ? 0.6 : 1 };

  const typeBadge = {
    app:    'bg-[#EAE6FF] text-[#403294]',
    domain: 'bg-[#E3FCEF] text-[#006644]',
    ip:     'bg-[#DEEBFF] text-[#0052CC]',
  }[rule.type];

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="bg-surface-container-low/30 border border-outline-variant p-3 rounded-lg flex items-center justify-between group"
    >
      <div className="flex items-center gap-3">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-outline hover:text-on-surface-variant p-0.5 touch-none">
          <GripVertical className="w-4 h-4" />
        </button>
        <div className={`w-1.5 h-6 rounded-full ${rule.enabled ? 'bg-[#36B37E]' : 'bg-outline'}`} />
        <div>
          <p className="text-xs font-bold text-on-surface font-mono">{rule.value}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${typeBadge}`}>{rule.type}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggle(rule.id)}
          className={cn(
            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
            rule.enabled ? "bg-[#36B37E]" : "bg-surface-container-high"
          )}
        >
          <span className={cn(
            "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 shadow-sm",
            rule.enabled ? "translate-x-4" : "translate-x-0.5"
          )} />
        </button>
        <button
          onClick={() => onDelete(rule.id)}
          className="p-1.5 text-outline hover:text-error hover:bg-error-container rounded transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

export default function Rules() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [newValue, setNewValue] = useState('');
  const [newType, setNewType] = useState<'app' | 'domain' | 'ip'>('domain');
  const importRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ── Fetch rules from backend ──────────────────────────────────
  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch(`${API}/rules`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setRules(json.data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  // ── Create rule ───────────────────────────────────────────────
  const addRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim()) return;
    try {
      const res = await fetch(`${API}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newType, value: newValue.trim(), enabled: true }),
      });
      if (res.ok) {
        const json = await res.json();
        setRules(prev => [json.data, ...prev]);
        setNewValue('');
        toast.success(`Rule added: ${newValue.trim()}`);
      } else {
        const err = await res.json().catch(() => null);
        toast.error(err?.error?.message ?? 'Failed to add rule');
      }
    } catch { toast.error('Network error'); }
  };

  // ── Toggle enabled ────────────────────────────────────────────
  const toggleRule = async (id: number) => {
    const rule = rules.find(r => r.id === id);
    if (!rule) return;
    try {
      const res = await fetch(`${API}/rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: rule.type, value: rule.value, enabled: !rule.enabled }),
      });
      if (res.ok) {
        const json = await res.json();
        setRules(prev => prev.map(r => r.id === id ? json.data : r));
      }
    } catch { /* ignore */ }
  };

  // ── Delete rule ───────────────────────────────────────────────
  const deleteRule = async (id: number) => {
    try {
      const res = await fetch(`${API}/rules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRules(prev => prev.filter(r => r.id !== id));
        toast.success('Rule deleted');
      }
    } catch { /* ignore */ }
  };

  // ── Import rules from JSON ────────────────────────────────────
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data: { type: string; value: string; enabled: boolean }[] = JSON.parse(text);
      let added = 0;
      for (const item of data) {
        const res = await fetch(`${API}/rules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        if (res.ok) added++;
      }
      toast.success(`Imported ${added} rules`);
      fetchRules();
    } catch { toast.error('Invalid JSON file'); }
    e.target.value = '';
  };

  // ── Export rules as JSON ──────────────────────────────────────
  const handleExport = async () => {
    try {
      const res = await fetch(`${API}/rules`);
      if (!res.ok) return;
      const json = await res.json();
      const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rules.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); }
  };

  // ── Drag-and-drop reorder (visual only — no backend order) ───
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setRules(prev => {
        const oldIdx = prev.findIndex(r => r.id === active.id);
        const newIdx = prev.findIndex(r => r.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  const appRules = rules.filter(r => r.type === 'app');
  const otherRules = rules.filter(r => r.type !== 'app');

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold font-display text-on-surface">Traffic Rules Configuration</h2>
        <p className="text-on-surface-variant text-sm">Manage DPI filtering policies across applications and domains.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-primary-fixed/30 border border-primary-fixed rounded-xl p-5 flex items-start gap-4"
      >
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary-container shrink-0 shadow-sm">
          <Info className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-primary-container text-sm">Active Filtering Enabled</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Rules configured here are persisted in SQLite and applied to every PCAP you process. Toggle, add, import, or export rules below.
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Application Control — quick toggles for common apps */}
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-outline-variant bg-surface-container-low/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AppWindow className="w-5 h-5 text-on-surface-variant" />
              <h3 className="font-bold text-on-surface font-display">Application Rules</h3>
            </div>
            <span className="bg-error-container text-on-error-container text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
              {appRules.filter(r => r.enabled).length} Active
            </span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-surface-container max-h-[400px]">
            {loading ? (
              <div className="p-8 text-center text-sm text-on-surface-variant">Loading…</div>
            ) : appRules.length === 0 ? (
              <div className="p-8 text-center text-sm text-outline italic">No app rules. Add one below.</div>
            ) : (
              appRules.map((rule) => (
                <div key={rule.id} className="p-4 flex items-center justify-between hover:bg-surface-container-low/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-surface-container flex items-center justify-center text-primary">
                      <Globe className="w-4 h-4 opacity-80" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">{rule.value}</p>
                      <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">App Block</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                        rule.enabled ? "bg-error" : "bg-surface-container-high"
                      )}
                    >
                      <span className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm",
                        rule.enabled ? "translate-x-6" : "translate-x-1"
                      )} />
                    </button>
                    <button onClick={() => deleteRule(rule.id)} className="p-1 text-outline hover:text-error rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Rule Manager — add + sortable list */}
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-outline-variant bg-surface-container-low/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-on-surface-variant" />
              <h3 className="font-bold text-on-surface font-display">Rule Manager</h3>
            </div>
            <div className="flex gap-1">
              <input type="file" ref={importRef} accept=".json" className="hidden" onChange={handleImport} />
              <button onClick={() => importRef.current?.click()} className="p-1.5 text-outline hover:text-primary hover:bg-primary-fixed/30 rounded transition-all" title="Import JSON">
                <Upload className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleExport} className="p-1.5 text-outline hover:text-primary hover:bg-primary-fixed/30 rounded transition-all" title="Export JSON">
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="p-4 flex flex-col gap-6 flex-1">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Add Rule</label>
                <form onSubmit={addRule} className="flex gap-2">
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value as 'app' | 'domain' | 'ip')}
                    className="bg-surface-container-low/50 border border-outline-variant rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-container"
                  >
                    <option value="app">App</option>
                    <option value="domain">Domain</option>
                    <option value="ip">IP</option>
                  </select>
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
                    <input
                      value={newValue}
                      onChange={e => setNewValue(e.target.value)}
                      className="w-full bg-surface-container-low/50 border border-outline-variant rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
                      placeholder={newType === 'ip' ? '192.168.1.50' : newType === 'app' ? 'YouTube' : 'tiktok.com'}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!newValue.trim()}
                    className="bg-primary-container text-white px-4 rounded-lg font-bold text-sm hover:bg-primary transition-all shadow-sm flex items-center gap-1 disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>
              </div>

              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">All Rules (drag to reorder)</label>
                  <span className="text-[10px] text-outline font-bold uppercase">{otherRules.length} entries</span>
                </div>
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={otherRules.map(r => r.id)} strategy={verticalListSortingStrategy}>
                      <AnimatePresence>
                        {otherRules.length === 0 ? (
                          <p className="text-xs text-outline italic">No domain/IP rules configured.</p>
                        ) : (
                          otherRules.map(rule => (
                            <SortableRule key={rule.id} rule={rule} onDelete={deleteRule} onToggle={toggleRule} />
                          ))
                        )}
                      </AnimatePresence>
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Network Policy */}
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-outline-variant bg-surface-container-low/50 flex items-center gap-2">
            <Network className="w-5 h-5 text-on-surface-variant" />
            <h3 className="font-bold text-on-surface font-display">Network Policy</h3>
          </div>
          <div className="p-6 flex flex-col items-center justify-center text-center space-y-4 flex-1">
            <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant/30">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-on-surface">Compliance Verified</h4>
              <p className="text-sm text-on-surface-variant leading-relaxed px-4">
                Standard enterprise policies are applied across all network zones.
              </p>
            </div>
            <button className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5 pt-2">
              Download Policy Document
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
