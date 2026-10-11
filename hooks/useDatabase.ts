'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Category, Group, Person, PersonGroup, PersonWithDetails, CategoryWithCount, GroupWithCount } from '@/types';
import { useAuth } from './useAuth';

// Cookies are sent automatically — no Authorization header needed.
// This authFetch simply dispatches 'auth:unauthorized' on 401 so useAuth can clear the session.
const authFetch = async (url: string, options: RequestInit = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    },
  });
  if (res.status === 401 || res.status === 403) {
    window.dispatchEvent(new Event('auth:unauthorized'));
  }
  return res;
};

export const useDatabase = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [personGroups, setPersonGroups] = useState<PersonGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      setLoading(true);
      const res = await fetch('/api/init-data', { signal: controller.signal });
      if (res.status === 401 || res.status === 403) {
        window.dispatchEvent(new Event('auth:unauthorized'));
        return;
      }
      if (!res.ok) throw new Error('Failed to load data');
      const data = await res.json();
      setCategories(data.categories || []);
      setGroups(data.groups || []);
      setPeople(data.people || []);
      setPersonGroups(data.personGroups || []);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error && err.name === 'AbortError'
        ? 'Request timed out. The server may be waking up — please refresh.'
        : (err instanceof Error ? err.message : 'Failed to load data');
      setError(msg);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Memoized computed values — only recalculate when raw data changes
  const peopleWithDetails: PersonWithDetails[] = useMemo(() =>
    people.map(person => {
      const category = categories.find(c => c.category_id === person.category_id);
      const personGroupIds = personGroups
        .filter(pg => pg.person_id === person.person_id)
        .map(pg => pg.group_id);
      return { ...person, category, groups: groups.filter(g => personGroupIds.includes(g.group_id)) };
    }),
    [people, categories, groups, personGroups]
  );

  const categoriesWithCount: CategoryWithCount[] = useMemo(() =>
    categories.map(cat => ({
      ...cat,
      person_count: people.filter(p => p.category_id === cat.category_id).length,
    })),
    [categories, people]
  );

  const groupsWithCount: GroupWithCount[] = useMemo(() =>
    groups.map(group => ({
      ...group,
      person_count: personGroups.filter(pg => pg.group_id === group.group_id).length,
    })),
    [groups, personGroups]
  );

  // ── CRUD helpers ────────────────────────────────────────────────────────────
  const addCategory = async (name: string) => {
    const res = await authFetch('/api/categories', { method: 'POST', body: JSON.stringify({ category_name: name }) });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to create category'); }
    const newCat = await res.json();
    setCategories(prev => [...prev, newCat]);
    return newCat;
  };

  const updateCategory = async (id: number, name: string) => {
    const res = await authFetch('/api/categories', { method: 'PUT', body: JSON.stringify({ id, category_name: name }) });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to update category'); }
    setCategories(prev => prev.map(c => c.category_id === id ? { ...c, category_name: name } : c));
  };

  const deleteCategory = async (id: number) => {
    const res = await authFetch('/api/categories', { method: 'DELETE', body: JSON.stringify({ id }) });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to delete category'); }
    setCategories(prev => prev.filter(c => c.category_id !== id));
    setPeople(prev => prev.map(p => p.category_id === id ? { ...p, category_id: undefined } : p));
  };

  const addGroup = async (name: string) => {
    const res = await authFetch('/api/groups', { method: 'POST', body: JSON.stringify({ group_name: name }) });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to create group'); }
    const newGroup = await res.json();
    setGroups(prev => [...prev, newGroup]);
    return newGroup;
  };

  const updateGroup = async (id: number, name: string) => {
    const res = await authFetch('/api/groups', { method: 'PUT', body: JSON.stringify({ id, group_name: name }) });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to update group'); }
    setGroups(prev => prev.map(g => g.group_id === id ? { ...g, group_name: name } : g));
  };

  const deleteGroup = async (id: number) => {
    const res = await authFetch('/api/groups', { method: 'DELETE', body: JSON.stringify({ id }) });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to delete group'); }
    setGroups(prev => prev.filter(g => g.group_id !== id));
    setPersonGroups(prev => prev.filter(pg => pg.group_id !== id));
  };

  const addPerson = async (personData: Omit<Person, 'person_id'>, groupIds: number[]) => {
    const res = await authFetch('/api/people', {
      method: 'POST',
      body: JSON.stringify({ ...personData, group_ids: groupIds }),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to add person'); }
    const newPerson = await res.json();
    setPeople(prev => [...prev, newPerson]);
    setPersonGroups(prev => [
      ...prev,
      ...groupIds.map(gid => ({ person_id: newPerson.person_id, group_id: gid })),
    ]);
    return newPerson;
  };

  const updatePerson = async (id: number, personData: Omit<Person, 'person_id'>, groupIds: number[]) => {
    const res = await authFetch(`/api/people/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...personData, group_ids: groupIds }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Save failed (HTTP ${res.status})`);
    }
    const updated = await res.json();
    setPeople(prev => prev.map(p => p.person_id === id ? { ...updated } : p));
    setPersonGroups(prev => [
      ...prev.filter(pg => pg.person_id !== id),
      ...groupIds.map(gid => ({ person_id: id, group_id: gid })),
    ]);
    return updated;
  };

  const deletePerson = async (id: number) => {
    const res = await authFetch('/api/people', { method: 'DELETE', body: JSON.stringify({ id }) });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to delete person'); }
    setPeople(prev => prev.filter(p => p.person_id !== id));
    setPersonGroups(prev => prev.filter(pg => pg.person_id !== id));
  };

  return {
    categories, groups, people, personGroups,
    peopleWithDetails, categoriesWithCount, groupsWithCount,
    loading, error, reload: loadData,
    addCategory, updateCategory, deleteCategory,
    addGroup, updateGroup, deleteGroup,
    addPerson, updatePerson, deletePerson,
  };
};

