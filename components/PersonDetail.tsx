'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Save, User, Users, Heart, GraduationCap,
  X, Camera, Loader2, Phone, AlertCircle, Check,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/hooks/useAuth';
import { Person } from '@/types';
import SelectSheet from './SelectSheet';

interface PersonDetailProps {
  personId: number;
  onBack: () => void;
}

type TabId = 'personal' | 'contact' | 'spiritual' | 'education' | 'groups';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'personal',   label: 'Personal',        icon: User },
  { id: 'contact',    label: 'Contact',          icon: Phone },
  { id: 'spiritual',  label: 'Spiritual',        icon: Heart },
  { id: 'education',  label: 'Education & Work', icon: GraduationCap },
  { id: 'groups',     label: 'Groups',           icon: Users },
];

const EMPTY_FORM: Omit<Person, 'person_id'> = {
  full_name: '', mobile_number: '', mobile_number_2: '', dob: '', category_id: undefined,
  photo_url: '', address: '', email: '', blood_group: '', is_ambrish: false, dixa_date: '',
  avd_code: '', aadhar_card_no: '', marital_status: undefined, anniversary_date: '',
  attended_mahotsav: '', education_qualification: '', running_education: '',
  occupation: undefined, job_business_details: '', reference_person: '',
  attending_sabha_since: '', hobby: '',
};

const PersonDetail: React.FC<PersonDetailProps> = ({ personId, onBack }) => {
  const { peopleWithDetails, categories, groups, addPerson, updatePerson, reload } = useData();
  useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('personal');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [showLeavePrompt, setShowLeavePrompt] = useState(false);

  const [formData, setFormData] = useState<Omit<Person, 'person_id'>>(EMPTY_FORM);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);

  const person = peopleWithDetails.find(p => p.person_id === personId);
  const isNewPerson = personId === 0;

  const populateForm = useCallback((p?: typeof person) => {
    if (p && !isNewPerson) {
      const safeDate = (v?: string | null) => {
        if (!v) return '';
        const s = String(v).split('T')[0];
        return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
      };
      setFormData({
        full_name: p.full_name || '',
        mobile_number: p.mobile_number || '',
        mobile_number_2: p.mobile_number_2 || '',
        dob: safeDate(p.dob),
        category_id: p.category_id,
        photo_url: p.photo_url || '',
        address: p.address || '',
        email: p.email || '',
        blood_group: p.blood_group || '',
        is_ambrish: p.is_ambrish || false,
        dixa_date: safeDate(p.dixa_date),
        avd_code: p.avd_code || '',
        aadhar_card_no: p.aadhar_card_no || '',
        marital_status: p.marital_status,
        anniversary_date: safeDate(p.anniversary_date),
        attended_mahotsav: p.attended_mahotsav || '',
        education_qualification: p.education_qualification || '',
        running_education: p.running_education || '',
        occupation: p.occupation,
        job_business_details: p.job_business_details || '',
        reference_person: p.reference_person || '',
        attending_sabha_since: p.attending_sabha_since || '',
        hobby: p.hobby || '',
      });
      setSelectedGroups(p.groups?.map(g => g.group_id) || []);
      setIsDirty(false);
    } else if (isNewPerson) {
      setFormData(EMPTY_FORM);
      setSelectedGroups([]);
      setIsDirty(false);
    }
  }, [isNewPerson]);

  const hasPopulatedIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (isNewPerson) {
      setFormData(EMPTY_FORM);
      setSelectedGroups([]);
      setIsDirty(false);
      return;
    }
    if (person && hasPopulatedIdRef.current !== personId) {
      populateForm(person);
      hasPopulatedIdRef.current = personId;
    }
  }, [person, personId, isNewPerson, populateForm]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const set = (key: keyof Omit<Person, 'person_id'>, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleGroupToggle = (groupId: number) => {
    setSelectedGroups(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
    setIsDirty(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('File size must be less than 5MB'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const res = await fetch('/api/upload/photo', {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Upload not supported');
      }
      const data = await res.json();
      set('photo_url', data.photo_url);
    } catch (err: any) {
      alert(err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (andLeave = false): Promise<boolean> => {
    if (!formData.full_name?.trim()) {
      setSaveError('Full Name is required');
      setActiveTab('personal');
      return false;
    }
    setSaving(true);
    setSaveError('');
    const personData: Omit<Person, 'person_id'> = {
      ...formData,
      full_name: formData.full_name.trim(),
      mobile_number: formData.mobile_number?.trim() || undefined,
      mobile_number_2: formData.mobile_number_2?.trim() || undefined,
      dob: formData.dob || undefined,
      photo_url: formData.photo_url || undefined,
      address: formData.address?.trim() || undefined,
      email: formData.email?.trim() || undefined,
      blood_group: formData.blood_group || undefined,
      is_ambrish: Boolean(formData.is_ambrish),
      dixa_date: formData.is_ambrish ? (formData.dixa_date || undefined) : undefined,
      avd_code: formData.avd_code?.trim() || undefined,
      aadhar_card_no: formData.aadhar_card_no?.trim() || undefined,
      marital_status: formData.marital_status || undefined,
      anniversary_date: formData.marital_status === 'married' && formData.anniversary_date ? formData.anniversary_date : undefined,
      attended_mahotsav: formData.attended_mahotsav?.trim() || undefined,
      education_qualification: formData.education_qualification?.trim() || undefined,
      running_education: formData.running_education?.trim() || undefined,
      job_business_details: formData.job_business_details?.trim() || undefined,
      reference_person: formData.reference_person?.trim() || undefined,
      attending_sabha_since: formData.attending_sabha_since?.trim() || undefined,
      hobby: formData.hobby?.trim() || undefined,
    };

    try {
      if (isNewPerson) {
        await addPerson(personData, selectedGroups);
      } else {
        await updatePerson(personId, personData, selectedGroups);
      }
      setIsDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      hasPopulatedIdRef.current = null;
      await reload();
      if (andLeave) {
        onBack();
      }
      return true;
    } catch (err) {
      const msg = (err as Error).message || 'Failed to save';
      setSaveError(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (isDirty) {
      setShowLeavePrompt(true);
    } else {
      onBack();
    }
  };

  const inputClass = "input";

  const PersonalTab = (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          {formData.photo_url ? (
            <img src={formData.photo_url} alt="Profile" className="w-12 h-12 rounded-xl object-cover ring-1 ring-gray-200" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200/80 flex items-center justify-center text-gray-700 text-base font-bold">
              {(formData.full_name || '?')[0]?.toUpperCase()}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 w-5 h-5 bg-black hover:bg-gray-800 text-white rounded-full flex items-center justify-center shadow transition-colors"
            title="Upload photo"
          >
            {uploading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Camera className="w-2.5 h-2.5" />}
          </button>
          {formData.photo_url && (
            <button
              type="button"
              onClick={() => set('photo_url', '')}
              className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow"
              title="Remove photo"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
        </div>

        <div className="flex-1 min-w-0">
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name *</label>
          <input
            type="text"
            value={formData.full_name}
            onChange={e => set('full_name', e.target.value)}
            className={inputClass}
            placeholder="Enter full name"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
          <SelectSheet
            label="Category"
            placeholder="Select category"
            value={formData.category_id || ''}
            onChange={val => set('category_id', val ? Number(val) : undefined)}
            options={[
              { value: '', label: 'None' },
              ...categories.map(c => ({ value: c.category_id, label: c.category_name })),
            ]}
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Date of Birth</label>
          <input
            type="date"
            value={formData.dob || ''}
            onChange={e => set('dob', e.target.value)}
            className="input"
            placeholder="Select date of birth"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Marital Status</label>
          <SelectSheet
            label="Marital Status"
            placeholder="Select status"
            value={formData.marital_status || ''}
            onChange={val => {
              set('marital_status', val || undefined);
              if (val !== 'married') {
                set('anniversary_date', '');
              }
            }}
            options={[
              { value: '', label: 'Select status' },
              { value: 'single', label: 'Single' },
              { value: 'married', label: 'Married' },
              { value: 'widowed', label: 'Widowed' },
            ]}
          />
        </div>
        {formData.marital_status === 'married' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Anniversary Date
              </label>
              <span className="text-[10px] text-gray-400 font-medium">Optional</span>
            </div>
            <input
              type="date"
              value={formData.anniversary_date || ''}
              onChange={e => set('anniversary_date', e.target.value)}
              className="input"
              placeholder="Select anniversary date"
            />
          </div>
        )}
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Blood Group</label>
          <SelectSheet
            label="Blood Group"
            placeholder="Select blood group"
            value={formData.blood_group || ''}
            onChange={val => set('blood_group', val || undefined)}
            options={[
              { value: '', label: 'Select blood group' },
              ...['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => ({ value: bg, label: bg })),
            ]}
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Aadhar Card No.</label>
          <input
            type="text"
            value={formData.aadhar_card_no || ''}
            onChange={e => set('aadhar_card_no', e.target.value)}
            className={inputClass}
            placeholder="12-digit number"
            maxLength={12}
          />
        </div>

        {/* Ambrish Selection: Dedicated Radio Field on Personal Tab */}
        <div className="sm:col-span-2 p-3.5 rounded-xl border border-surface-line bg-paper/60 space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-bold text-ink uppercase tracking-wider">
              Ambrish Status
            </label>
            <span className="text-[10px] text-ink-muted">Spiritual designation</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => set('is_ambrish', true)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                formData.is_ambrish === true
                  ? 'border-maroon bg-white shadow-sm font-bold text-maroon'
                  : 'border-surface-line bg-white/70 hover:bg-white text-ink-muted'
              }`}
            >
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                formData.is_ambrish === true ? 'border-maroon bg-white' : 'border-surface-line'
              }`}>
                {formData.is_ambrish === true && <span className="w-2 h-2 rounded-full bg-maroon" />}
              </span>
              <span className="text-xs sm:text-sm">★ Yes, Ambrish</span>
            </button>

            <button
              type="button"
              onClick={() => {
                set('is_ambrish', false);
                set('dixa_date', '');
              }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                formData.is_ambrish !== true
                  ? 'border-maroon bg-white shadow-sm font-bold text-ink'
                  : 'border-surface-line bg-white/70 hover:bg-white text-ink-muted'
              }`}
            >
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                formData.is_ambrish !== true ? 'border-maroon bg-white' : 'border-surface-line'
              }`}>
                {formData.is_ambrish !== true && <span className="w-2 h-2 rounded-full bg-maroon" />}
              </span>
              <span className="text-xs sm:text-sm">No</span>
            </button>
          </div>

          {formData.is_ambrish && (
            <div className="pt-2 border-t border-surface-soft/60">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Dixa Date (Optional)
              </label>
              <input
                type="date"
                value={formData.dixa_date || ''}
                onChange={e => set('dixa_date', e.target.value)}
                className="input max-w-xs"
                placeholder="Select dixa date"
              />
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Address</label>
        <textarea
          value={formData.address || ''}
          onChange={e => set('address', e.target.value)}
          className="input resize-none"
          rows={2}
          placeholder="Enter address"
        />
      </div>
    </div>
  );

  const ContactTab = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Mobile No. 1</label>
          <input
            type="tel"
            value={formData.mobile_number || ''}
            onChange={e => set('mobile_number', e.target.value)}
            className={inputClass}
            placeholder="Primary phone"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Mobile No. 2</label>
          <input
            type="tel"
            value={formData.mobile_number_2 || ''}
            onChange={e => set('mobile_number_2', e.target.value)}
            className={inputClass}
            placeholder="Secondary phone"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
          <input
            type="email"
            value={formData.email || ''}
            onChange={e => set('email', e.target.value)}
            className={inputClass}
            placeholder="email@example.com"
          />
        </div>
      </div>
    </div>
  );

  const SpiritualTab = (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border border-surface-line bg-paper/60 space-y-2.5">
        <label className="block text-xs font-bold text-ink uppercase tracking-wider">
          Ambrish Status
        </label>
        <p className="text-xs text-ink-muted">Specify whether this member is an Ambrish</p>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => set('is_ambrish', true)}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
              formData.is_ambrish === true
                ? 'border-maroon bg-white shadow-sm font-bold text-maroon'
                : 'border-surface-line bg-paper hover:bg-surface-soft text-ink'
            }`}
          >
            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
              formData.is_ambrish === true ? 'border-maroon bg-white' : 'border-surface-line'
            }`}>
              {formData.is_ambrish === true && <span className="w-2 h-2 rounded-full bg-maroon" />}
            </span>
            <span className="text-xs sm:text-sm">★ Yes, Ambrish</span>
          </button>

          <button
            type="button"
            onClick={() => {
              set('is_ambrish', false);
              set('dixa_date', '');
            }}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
              formData.is_ambrish !== true
                ? 'border-maroon bg-white shadow-sm font-bold text-ink'
                : 'border-surface-line bg-paper hover:bg-surface-soft text-ink-muted'
            }`}
          >
            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
              formData.is_ambrish !== true ? 'border-maroon bg-white' : 'border-surface-line'
            }`}>
              {formData.is_ambrish !== true && <span className="w-2 h-2 rounded-full bg-maroon" />}
            </span>
            <span className="text-xs sm:text-sm">No</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {formData.is_ambrish && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Dixa Date</label>
            <input
              type="date"
              value={formData.dixa_date || ''}
              onChange={e => set('dixa_date', e.target.value)}
              className="input"
              placeholder="Select dixa date"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Attended Mahotsav</label>
          <input
            type="text"
            value={formData.attended_mahotsav || ''}
            onChange={e => set('attended_mahotsav', e.target.value)}
            className={inputClass}
            placeholder="e.g. 2023, 2024"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Attending Sabha Since</label>
          <input
            type="text"
            value={formData.attending_sabha_since || ''}
            onChange={e => set('attending_sabha_since', e.target.value)}
            className={inputClass}
            placeholder="e.g. 2020"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Reference Person</label>
          <input
            type="text"
            value={formData.reference_person || ''}
            onChange={e => set('reference_person', e.target.value)}
            className={inputClass}
            placeholder="Who invited them"
          />
        </div>
      </div>
    </div>
  );

  const EducationTab = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Education Qualification</label>
          <input
            type="text"
            value={formData.education_qualification || ''}
            onChange={e => set('education_qualification', e.target.value)}
            className={inputClass}
            placeholder="e.g. B.Tech, MBA"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Running Education</label>
          <input
            type="text"
            value={formData.running_education || ''}
            onChange={e => set('running_education', e.target.value)}
            className={inputClass}
            placeholder="If currently studying"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Occupation</label>
          <SelectSheet
            label="Occupation"
            placeholder="Select occupation"
            value={formData.occupation || ''}
            onChange={val => set('occupation', val || undefined)}
            options={[
              { value: '', label: 'Select occupation' },
              { value: 'job', label: 'Job' },
              { value: 'business', label: 'Business' },
              { value: 'student', label: 'Student' },
              { value: 'other', label: 'Other' },
            ]}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Job / Business Details</label>
          <input
            type="text"
            value={formData.job_business_details || ''}
            onChange={e => set('job_business_details', e.target.value)}
            className={inputClass}
            placeholder="Company & designation"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Hobbies</label>
          <input
            type="text"
            value={formData.hobby || ''}
            onChange={e => set('hobby', e.target.value)}
            className={inputClass}
            placeholder="e.g. Reading, Sports, Music"
          />
        </div>
      </div>
    </div>
  );

  const GroupsTab = (
    <div>
      <p className="text-xs text-ink-muted mb-3">Select the groups this member belongs to:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {groups.map(group => (
          <label
            key={group.group_id}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
              selectedGroups.includes(group.group_id)
                ? 'border-maroon bg-maroon-soft/30'
                : 'border-surface-line bg-paper hover:bg-surface-soft'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              selectedGroups.includes(group.group_id) ? 'bg-maroon border-maroon' : 'border-surface-line'
            }`}>
              {selectedGroups.includes(group.group_id) && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <input
              type="checkbox"
              checked={selectedGroups.includes(group.group_id)}
              onChange={() => handleGroupToggle(group.group_id)}
              className="sr-only"
            />
            <span className="text-sm font-medium text-ink">{group.group_name}</span>
          </label>
        ))}
      </div>
    </div>
  );

  const tabContent: Record<TabId, React.ReactNode> = {
    personal: PersonalTab,
    contact: ContactTab,
    spiritual: SpiritualTab,
    education: EducationTab,
    groups: GroupsTab,
  };

  const onSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave(false);
  };

  return (
    <div className="px-4 pb-4 max-w-3xl mx-auto space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pt-2 pb-1">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={handleBack} className="roundbtn" title="Back">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="page-title truncate">
              {isNewPerson ? 'Add Member' : person?.full_name || 'Member Details'}
            </h1>
            <p className="page-subtitle">
              {isNewPerson ? 'Enter member details and save' : 'Directly edit fields and save changes'}
            </p>
          </div>
        </div>

        {/* Top Direct Save Button */}
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={saving}
          className={`pill-btn ${
            isDirty
              ? 'pill-solid shadow-md'
              : 'bg-paper text-ink-muted border border-surface-line'
          }`}
          title="Save member details"
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : saveSuccess ? (
            <Check className="w-3.5 h-3.5 text-sage" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>
            {saving ? 'Saving...' : saveSuccess ? 'Saved' : isDirty ? 'Save Changes' : 'Saved'}
          </span>
        </button>
      </div>

      {saveError && (
        <div className="p-3 bg-rose-soft border border-rose-soft rounded-xl text-xs text-rose font-medium">
          {saveError}
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 bg-sage-soft border border-sage-soft rounded-xl text-xs text-sage font-medium flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>Member details saved successfully!</span>
        </div>
      )}

      <form onSubmit={onSubmitForm}>
        {/* Tabs */}
        <div className="card overflow-hidden">
          <div className="flex border-b border-surface-line overflow-x-auto bg-paper">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                    active
                      ? 'border-maroon text-maroon bg-white shadow-sm'
                      : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface-soft/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-4 sm:p-5">
            {tabContent[activeTab]}
          </div>

          {/* Footer actions */}
          <div className="px-4 py-3 border-t border-surface-line flex items-center justify-between gap-2 bg-paper/60">
            <div className="text-xs font-semibold">
              {isDirty ? (
                <span className="text-marigold font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-marigold animate-pulse" />
                  Unsaved changes
                </span>
              ) : (
                <span className="text-ink-muted font-medium flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-sage" />
                  All changes saved
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBack}
                className="btn-ghost py-2 px-3.5 text-xs"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={saving || (!isDirty && !isNewPerson)}
                className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{isNewPerson ? 'Create Member' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Unsaved Changes Confirmation Modal */}
      {showLeavePrompt && (
        <div className="modal-backdrop">
          <div className="modal-card max-w-sm">
            <div className="w-12 h-12 rounded-2xl bg-marigold-soft text-marigold flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-ink text-base text-center mb-1">
              Unsaved Changes
            </h3>
            <p className="text-xs text-ink-muted text-center mb-5 leading-relaxed">
              You have unsaved changes in this member profile. Would you like to save them before leaving?
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={async () => {
                  const ok = await handleSave(true);
                  if (ok) setShowLeavePrompt(false);
                }}
                disabled={saving}
                className="btn-primary w-full py-2.5 text-xs justify-center flex items-center gap-1.5"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save & Leave</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLeavePrompt(false);
                  setIsDirty(false);
                  onBack();
                }}
                className="btn-ghost w-full py-2 text-xs justify-center text-rose hover:bg-rose-soft/50"
              >
                Discard Changes
              </button>
              <button
                type="button"
                onClick={() => setShowLeavePrompt(false)}
                className="btn-ghost w-full py-2 text-xs justify-center text-ink-muted"
              >
                Keep Editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonDetail;

