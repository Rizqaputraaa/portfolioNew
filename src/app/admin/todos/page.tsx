'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useAdminAuth } from '../useAdminAuth';
import styles from './todos.module.css';

type Priority = 'low' | 'normal' | 'high';
type Filter   = 'all' | 'active' | 'done';

interface Todo {
  id: string;
  text: string;
  done: boolean;
  priority: Priority;
  created_at: string;
}

const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
};

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all',    label: 'All'    },
  { value: 'active', label: 'Active' },
  { value: 'done',   label: 'Done'   },
];

export default function TodosPage() {
  const { user } = useAdminAuth();
  const [todos,    setTodos]    = useState<Todo[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [text,     setText]     = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [filter,   setFilter]   = useState<Filter>('all');
  const [adding,   setAdding]   = useState(false);
  const [error,    setError]    = useState('');

  const supabase = getSupabase();

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false });
    setTodos((data as Todo[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !supabase) return;
    setAdding(true);
    setError('');
    const { error: err } = await supabase
      .from('todos')
      .insert({ text: text.trim(), priority, done: false });
    if (err) setError(err.message);
    else { setText(''); setPriority('normal'); await load(); }
    setAdding(false);
  };

  const toggle = async (todo: Todo) => {
    if (!supabase) return;
    await supabase.from('todos').update({ done: !todo.done }).eq('id', todo.id);
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, done: !t.done } : t));
  };

  const remove = async (id: string) => {
    if (!supabase) return;
    await supabase.from('todos').delete().eq('id', id);
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const clearDone = async () => {
    if (!supabase) return;
    const ids = todos.filter(t => t.done).map(t => t.id);
    if (!ids.length) return;
    await supabase.from('todos').delete().in('id', ids);
    setTodos(prev => prev.filter(t => !t.done));
  };

  const filtered = todos.filter(t => {
    if (filter === 'active') return !t.done;
    if (filter === 'done')   return t.done;
    return true;
  });

  const doneCount   = todos.filter(t => t.done).length;
  const activeCount = todos.filter(t => !t.done).length;

  if (!user) return null;

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Todo List</h1>
          <p className={styles.subtitle}>Synced across all devices</p>
        </div>
        <div className={styles.stats}>
          <span className={styles.statChip}>{activeCount} active</span>
          <span className={`${styles.statChip} ${styles.statDone}`}>{doneCount} done</span>
        </div>
      </div>

      {/* Add form */}
      <form className={styles.addForm} onSubmit={handleAdd}>
        <input
          className={styles.addInput}
          type="text"
          placeholder="New task…"
          aria-label="New task"
          value={text}
          onChange={e => setText(e.target.value)}
          required
        />
        <select
          aria-label="Priority"
          className={styles.prioritySelect}
          value={priority}
          onChange={e => setPriority(e.target.value as Priority)}
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
        <button className={styles.addBtn} type="submit" disabled={adding || !text.trim()}>
          {adding ? 'Adding…' : 'Add'}
        </button>
      </form>

      {error && <div className={styles.error} role="alert">{error}</div>}

      {/* Filter row */}
      <div className={styles.filterRow}>
        <div className={styles.segmentedControl} role="tablist" aria-label="Filter tasks">
          {FILTERS.map(f => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              className={`${styles.segment} ${filter === f.value ? styles.segmentActive : ''}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {doneCount > 0 && (
          <button type="button" className={styles.clearBtn} onClick={clearDone}>
            Clear Done
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className={styles.empty}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          {filter === 'done' ? 'No completed tasks yet.' : 'No tasks. Add one above!'}
        </div>
      ) : (
        <ul className={styles.list}>
          {filtered.map(todo => (
            <li key={todo.id} className={`${styles.item} ${todo.done ? styles.itemDone : ''}`}>

              {/* Circle checkbox */}
              <button
                type="button"
                className={`${styles.check} ${todo.done ? styles.checkDone : ''}`}
                aria-pressed={todo.done}
                onClick={() => toggle(todo)}
                aria-label={todo.done ? 'Mark as not done' : 'Mark as done'}
              >
                {todo.done && (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.2"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>

              {/* Task text */}
              <span className={styles.itemText}>{todo.text}</span>

              {/* Priority */}
              <span className={`${styles.priorityBadge} ${styles[`p_${todo.priority}`]}`}>
                {PRIORITY_LABEL[todo.priority]}
              </span>

              {/* Delete */}
              <button type="button" className={styles.deleteBtn} onClick={() => remove(todo.id)} aria-label="Delete">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>

            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
