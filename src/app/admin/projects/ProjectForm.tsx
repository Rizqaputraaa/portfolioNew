'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { adminCreateProject, adminUpdateProject } from '@/lib/admin-db';
import type { Project, ProjectCategory, ProjectSection } from '@/types';
import ImageUpload from '../ImageUpload';
import styles from '../admin.module.css';

const CATEGORIES: ProjectCategory[] = ['insta_pack', 'logo', 'poster', 'printing', 'ui_design'];
const TOOLS = [
  'photoshop', 'illustrator', 'figma', 'after_effects', 'premiere_pro',
  'lightroom', 'indesign', 'blender', 'cinema4d',
];

function generateSlug(title: string): string {
  return title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

interface ProjectFormProps {
  project?: Project;
}

type FormData = {
  title: string;
  slug: string;
  category: ProjectCategory;
  client: string;
  description: string;
  tools: string[];
  images: string[];
  thumbnail: string;
  sections: ProjectSection[];
  is_new: boolean;
  published: boolean;
};

const STORAGE_KEY = 'projectForm_draft';

export default function ProjectForm({ project }: ProjectFormProps) {
  const router = useRouter();
  const isEdit = !!project;

  const getInitialForm = (): FormData => {
    // Edit mode: selalu pakai data dari project, bukan localStorage
    if (isEdit) {
      return {
        title: project?.title ?? '',
        slug: project?.slug ?? '',
        category: project?.category ?? 'logo',
        client: project?.client ?? '',
        description: project?.description ?? '',
        tools: project?.tools ?? [],
        images: project?.images ?? [],
        thumbnail: project?.thumbnail ?? '',
        sections: project?.sections ?? [],
        is_new: project?.is_new ?? false,
        published: project?.published ?? false,
      };
    }

    // New project: load draft dari localStorage kalau ada
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try { return JSON.parse(saved); } catch { /* ignore */ }
      }
    }

    return {
      title: '', slug: '', category: 'logo', client: '',
      description: '', tools: [], images: [], thumbnail: '',
      sections: [], is_new: false, published: false,
    };
  };

  const [form, setForm] = useState<FormData>(getInitialForm);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auto-save ke localStorage setiap kali form berubah
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    }, 500); // Debounce 500ms
    return () => clearTimeout(timer);
  }, [form]);

  const handleTitleChange = (title: string) => {
    setForm((prev) => ({
      ...prev,
      title,
      slug: isEdit ? prev.slug : generateSlug(title),
    }));
  };

  const toggleTool = (tool: string) => {
    setForm((prev) => ({
      ...prev,
      tools: prev.tools.includes(tool)
        ? prev.tools.filter((t) => t !== tool)
        : [...prev.tools, tool],
    }));
  };

  const removeImage = (index: number) => {
    setForm((prev) => {
      const images = prev.images.filter((_, i) => i !== index);
      return {
        ...prev,
        images,
        thumbnail: prev.thumbnail === prev.images[index]
          ? (images[0] ?? '')
          : prev.thumbnail,
      };
    });
  };

  const addSection = () => {
    setForm((prev) => ({
      ...prev,
      sections: [...prev.sections, { name: '', image: '', description: '' }],
    }));
  };

  const removeSection = (index: number) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
    }));
  };

  const updateSection = (index: number, field: keyof ProjectSection, value: string) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    const payload = {
      title: form.title,
      slug: form.slug,
      category: form.category,
      client: form.client || undefined,
      description: form.description || null,
      tools: form.tools,
      images: form.images,
      thumbnail: form.thumbnail || null,
      sections: form.sections.length > 0 ? form.sections : undefined,
      is_new: form.is_new,
      published: form.published,
    };

    let result: Project | null = null;
    if (isEdit && project) {
      result = await adminUpdateProject(project.id, payload);
    } else {
      result = await adminCreateProject(payload);
    }

    if (result) {
      setSuccess(isEdit ? 'Project updated!' : 'Project created!');
      localStorage.removeItem(STORAGE_KEY); // Clear draft after success
      setTimeout(() => router.push('/admin/projects'), 1200);
    } else {
      setError('Something went wrong. Please try again.');
    }

    setSubmitting(false);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <div className={styles.errorMsg}>{error}</div>}
      {success && <div className={styles.successMsg}>{success}</div>}

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="pf-title">Title *</label>
          <input
            id="pf-title"
            className={styles.input}
            type="text"
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
            placeholder="Project title"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="pf-slug">Slug *</label>
          <input
            id="pf-slug"
            className={styles.input}
            type="text"
            value={form.slug}
            onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
            required
            placeholder="project-slug"
          />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="pf-category">Category *</label>
          <select
            id="pf-category"
            className={styles.select}
            value={form.category}
            onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as ProjectCategory }))}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="pf-client">Client</label>
          <input
            id="pf-client"
            className={styles.input}
            type="text"
            value={form.client}
            onChange={(e) => setForm((prev) => ({ ...prev, client: e.target.value }))}
            placeholder="Client / brand name"
          />
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="pf-description">Description</label>
        <textarea
          id="pf-description"
          className={styles.textarea}
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Short project description…"
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Tools</label>
        <div className={styles.checkboxGroup}>
          {TOOLS.map((tool) => (
            <label key={tool} className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.tools.includes(tool)}
                onChange={() => toggleTool(tool)}
              />
              {tool.replace(/_/g, ' ')}
            </label>
          ))}
        </div>
      </div>

      {/* Cover */}
      <div className={styles.formGroup}>
        <label className={styles.label}>Cover (Maximum 5 images)</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {form.images.map((url, i) => (
            <div key={i} className={styles.sectionBlock}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Cover {i + 1}</span>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}
                  onClick={() => removeImage(i)}
                >
                  Remove
                </button>
              </div>
              <p style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>Ukuran: 1920 × 700 px (optional)</p>
              <ImageUpload
                value={url}
                onChange={(newUrl) => {
                  setForm((prev) => ({
                    ...prev,
                    images: prev.images.map((img, idx) => (idx === i ? newUrl : img)),
                    thumbnail: prev.thumbnail === url ? newUrl : prev.thumbnail,
                  }));
                }}
                folder="projects"
                label={`cover-${i}`}
              />
            </div>
          ))}
          {form.images.length < 5 && (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={() => setForm((prev) => ({ ...prev, images: [...prev.images, ''] }))}
              style={{ alignSelf: 'flex-start' }}
            >
              + Add Cover Image
            </button>
          )}
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="pf-thumbnail">Thumbnail URL</label>
        <input
          id="pf-thumbnail"
          className={styles.input}
          type="text"
          value={form.thumbnail}
          onChange={(e) => setForm((prev) => ({ ...prev, thumbnail: e.target.value }))}
          placeholder="Auto-set to first image if left blank"
        />
      </div>

      {/* Sections */}
      <div className={styles.formGroup}>
        <label className={styles.label}>Sections</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {form.sections.map((section, i) => (
            <div key={i} className={styles.sectionBlock}>
              <div className={styles.sectionHeader}>
                <input
                  type="text"
                  className={styles.input}
                  value={section.name || ''}
                  onChange={(e) => updateSection(i, 'name', e.target.value)}
                  placeholder={`Section ${i + 1}`}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}
                  onClick={() => removeSection(i)}
                >
                  Remove
                </button>
              </div>
              <p style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>Ukuran: 1600 × 900 px (optional)</p>
              <ImageUpload
                value={section.image}
                onChange={(url) => updateSection(i, 'image', url)}
                folder="projects/sections"
                label={`section-${i}`}
              />
              <textarea
                className={styles.textarea}
                value={section.description}
                onChange={(e) => updateSection(i, 'description', e.target.value)}
                placeholder="Section description…"
                style={{ minHeight: 80 }}
              />
            </div>
          ))}
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={addSection}
            style={{ alignSelf: 'flex-start' }}
          >
            + Add Section
          </button>
        </div>
      </div>

      <div className={styles.checkboxGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={form.is_new}
            onChange={(e) => setForm((prev) => ({ ...prev, is_new: e.target.checked }))}
          />
          Mark as New
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => setForm((prev) => ({ ...prev, published: e.target.checked }))}
          />
          Published
        </label>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          type="submit"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={submitting}
        >
          {submitting ? 'Saving…' : isEdit ? 'Update Project' : 'Create Project'}
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={() => router.push('/admin/projects')}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
