'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, CheckCircle, AlertCircle, BookOpen, Layers, FileText, UploadCloud, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadFileToCloudinary } from '@/lib/images/cloudinaryUpload';
import { Modal } from '@/components/ui/Modal';

type ContentType = 'TASK' | 'MATERIAL' | 'PDF' | 'TOOL';

interface CourseContent {
  id: string;
  title: string;
  description?: string | null;
  resourceUrl?: string | null;
  type: ContentType;
}

interface CourseAssignment {
  id: string;
  studentName: string;
  studentEmail: string;
}

interface Course {
  id: string;
  title: string;
  description?: string | null;
  sectionId: string;
  active: boolean;
  order: number;
  contents: CourseContent[];
  assignments: CourseAssignment[];
}

interface Section {
  id: string;
  title: string;
  description?: string | null;
  active: boolean;
  order: number;
  courses: Course[];
}

interface Message {
  type: 'success' | 'error';
  text: string;
}

export function CoursesManager() {
  const [sections, setSections] = useState<Section[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showContentForm, setShowContentForm] = useState(false);
  const [editSectionId, setEditSectionId] = useState<string | null>(null);
  const [editCourseId, setEditCourseId] = useState<string | null>(null);
  const [editContentId, setEditContentId] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [sectionForm, setSectionForm] = useState({ title: '', description: '' });
  const [courseForm, setCourseForm] = useState({ title: '', description: '', sectionId: '', order: 0 });
  const [contentForm, setContentForm] = useState({ title: '', description: '', resourceUrl: '', type: 'TASK' as ContentType });
  const [editSectionForm, setEditSectionForm] = useState({ title: '', description: '', active: true, order: 0 });
  const [editCourseForm, setEditCourseForm] = useState({ title: '', description: '', active: true, order: 0, sectionId: '' });
  const [editContentForm, setEditContentForm] = useState({ title: '', description: '', resourceUrl: '', type: 'TASK' as ContentType });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const selectedSection = useMemo(
    () => sections.find((section) => section.id === activeSectionId) || sections[0] || null,
    [sections, activeSectionId]
  );

  const selectedCourse = useMemo(
    () => (selectedSection?.courses || []).find((course) => course.id === selectedCourseId) || null,
    [selectedSection, selectedCourseId]
  );

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const fetchSections = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/course-sections', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo cargar secciones');
      setSections(Array.isArray(data) ? data : []);
      if (!activeSectionId && Array.isArray(data) && data.length > 0) {
        setActiveSectionId(data[0].id);
      }
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Error al cargar secciones');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchSections();
  }, []);

  useEffect(() => {
    if (!selectedSection) {
      setSelectedCourseId(null);
    }
  }, [selectedSection]);

  const selectSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    setSelectedCourseId(null);
  };

  const resetSectionForm = () => setSectionForm({ title: '', description: '' });
  const resetCourseForm = () => setCourseForm({ title: '', description: '', sectionId: selectedSection?.id || '', order: 0 });
  const resetContentForm = () => {
    setContentForm({ title: '', description: '', resourceUrl: '', type: 'TASK' });
    setSelectedFile(null);
    setFileError(null);
  };

  const createSection = async () => {
    if (!sectionForm.title.trim()) {
      return showMessage('error', 'El título de la sección es obligatorio');
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/course-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sectionForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo crear la sección');

      setSections((prev) => [...prev, { ...data, courses: [] }]);
      selectSection(data.id);
      resetSectionForm();
      setShowSectionForm(false);
      showMessage('success', 'Sección creada correctamente');
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Error al crear sección');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSection = async () => {
    if (!editSectionId) return;
    if (!editSectionForm.title.trim()) {
      return showMessage('error', 'El título de la sección es obligatorio');
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/course-sections/${editSectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editSectionForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo actualizar la sección');

      setSections((prev) => prev.map((section) =>
        section.id === editSectionId
          ? { ...section, ...data, courses: section.courses || [] }
          : section
      ));
      setEditSectionId(null);
      setShowSectionForm(false);
      resetSectionForm();
      showMessage('success', 'Sección actualizada');
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Error al actualizar sección');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSection = async (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    const courseCount = section?.courses.length || 0;
    const totalContents = section?.courses.reduce((acc, course) => acc + course.contents.length, 0) || 0;

    const message = `¿Estás seguro de eliminar la sección "${section?.title}"?\n\nEsto eliminará permanentemente:\n• ${courseCount} curso${courseCount !== 1 ? 's' : ''}\n• ${totalContents} material${totalContents !== 1 ? 'es' : ''}\n\nEsta acción no se puede deshacer.`;

    if (!confirm(message)) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/course-sections/${sectionId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo eliminar la sección');

      setSections((prev) => prev.filter((section) => section.id !== sectionId));
      if (activeSectionId === sectionId) {
        const nextSection = sections.find((section) => section.id !== sectionId);
        setActiveSectionId(nextSection?.id || null);
      }
      showMessage('success', 'Sección eliminada');
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Error al eliminar sección');
    } finally {
      setIsLoading(false);
    }
  };

  const createCourse = async () => {
    if (!courseForm.title.trim()) {
      return showMessage('error', 'El título del curso es obligatorio');
    }
    if (!courseForm.sectionId) {
      return showMessage('error', 'Selecciona una sección');
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo crear el curso');

      setSections((prev) => prev.map((section) =>
        section.id === data.sectionId
          ? { ...section, courses: [...(section.courses || []), data] }
          : section
      ));
      setSelectedCourseId(data.id);
      resetCourseForm();
      setShowCourseForm(false);
      showMessage('success', 'Curso creado correctamente');
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Error al crear curso');
    } finally {
      setIsLoading(false);
    }
  };

  const updateCourse = async () => {
    if (!editCourseId) return;
    if (!editCourseForm.title.trim()) {
      return showMessage('error', 'El título del curso es obligatorio');
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/courses/${editCourseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editCourseForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo actualizar el curso');

      setSections((prev) => {
        const updated = prev.map((section) => ({
          ...section,
          courses: (section.courses || []).filter((course) => course.id !== editCourseId),
        }));
        return updated.map((section) => {
          if (section.id === data.sectionId) {
            return { ...section, courses: [...(section.courses || []), data] };
          }
          return section;
        });
      });

      setSelectedCourseId(data.id);
      setEditCourseId(null);
      setShowCourseForm(false);
      resetCourseForm();
      showMessage('success', 'Curso actualizado');
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Error al actualizar curso');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCourse = async (courseId: string) => {
    const course = sections.flatMap(s => s.courses).find(c => c.id === courseId);
    const contentCount = course?.contents.length || 0;

    const message = `¿Estás seguro de eliminar el curso "${course?.title}"?\n\nEsto eliminará permanentemente:\n• ${contentCount} material${contentCount !== 1 ? 'es' : ''}\n\nEsta acción no se puede deshacer.`;

    if (!confirm(message)) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo eliminar el curso');

      setSections((prev) => prev.map((section) => ({
        ...section,
        courses: section.courses.filter((course) => course.id !== courseId),
      })));
      if (selectedCourseId === courseId) setSelectedCourseId(null);
      showMessage('success', 'Curso eliminado');
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Error al eliminar curso');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (file: File | null) => {
    setFileError(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
    if (!allowedTypes.includes(file.type)) {
      setFileError('Formato no soportado. Usa imagen, PDF, Word o PowerPoint.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    if (file.name.toLowerCase().endsWith('.pdf')) {
      if (editContentId) {
        setEditContentForm((prev) => ({ ...prev, type: 'PDF' }));
      } else {
        setContentForm((prev) => ({ ...prev, type: 'PDF' }));
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const createContent = async () => {
    if (!selectedCourse) return showMessage('error', 'Selecciona un curso primero');
    if (!contentForm.title.trim()) {
      return showMessage('error', 'El título del material es obligatorio');
    }

    setIsLoading(true);
    try {
      let resourceUrl = contentForm.resourceUrl;
      let contentType = contentForm.type;

      if (selectedFile) {
        resourceUrl = await uploadFileToCloudinary(selectedFile, 'merrash/course-materials');
        if (selectedFile.name.toLowerCase().endsWith('.pdf')) {
          contentType = 'PDF';
        } else if (selectedFile.type.startsWith('image/')) {
          contentType = contentType === 'TASK' ? 'MATERIAL' : contentType;
        }
      }

      const res = await fetch('/api/admin/course-contents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          title: contentForm.title,
          description: contentForm.description,
          resourceUrl: resourceUrl || null,
          type: contentType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo agregar el contenido');

      setSections((prev) => prev.map((section) => ({
        ...section,
        courses: section.courses.map((course) => course.id === selectedCourse.id ? { ...course, contents: [...course.contents, data] } : course),
      })));
      resetContentForm();
      setShowContentForm(false);
      showMessage('success', 'Contenido agregado');
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Error al agregar contenido');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteContent = async (contentId: string) => {
    if (!selectedCourse) return;
    const content = selectedCourse.contents.find(c => c.id === contentId);

    const message = `¿Estás seguro de eliminar el material "${content?.title}"?\n\nEsta acción no se puede deshacer.`;

    if (!confirm(message)) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/course-contents/${contentId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo eliminar el contenido');

      setSections((prev) => prev.map((section) => ({
        ...section,
        courses: section.courses.map((course) => course.id === selectedCourse.id ? {
          ...course,
          contents: course.contents.filter((content) => content.id !== contentId),
        } : course),
      })));
      showMessage('success', 'Contenido eliminado');
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Error al eliminar contenido');
    } finally {
      setIsLoading(false);
    }
  };

  const enterEditSection = (section: Section) => {
    setEditSectionId(section.id);
    setEditSectionForm({
      title: section.title,
      description: section.description || '',
      active: section.active,
      order: section.order,
    });
    setShowSectionForm(true);
  };

  const enterEditCourse = (course: Course) => {
    setEditCourseId(course.id);
    setEditCourseForm({
      title: course.title,
      description: course.description || '',
      active: course.active,
      order: course.order,
      sectionId: course.sectionId,
    });
    setShowCourseForm(true);
  };

  const enterEditContent = (content: CourseContent) => {
    setEditContentId(content.id);
    setEditContentForm({
      title: content.title,
      description: content.description || '',
      resourceUrl: content.resourceUrl || '',
      type: content.type,
    });
    setSelectedFile(null);
    setFileError(null);
    setShowContentForm(true);
  };

  const updateContent = async () => {
    if (!selectedCourse || !editContentId) return;
    if (!editContentForm.title.trim()) {
      return showMessage('error', 'El título del material es obligatorio');
    }

    setIsLoading(true);
    try {
      let resourceUrl = editContentForm.resourceUrl;
      let contentType = editContentForm.type;

      if (selectedFile) {
        resourceUrl = await uploadFileToCloudinary(selectedFile, 'merrash/course-materials');
        if (selectedFile.name.toLowerCase().endsWith('.pdf')) {
          contentType = 'PDF';
        } else if (selectedFile.type.startsWith('image/')) {
          contentType = contentType === 'TASK' ? 'MATERIAL' : contentType;
        }
      }

      const res = await fetch(`/api/admin/course-contents/${editContentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editContentForm.title,
          description: editContentForm.description,
          resourceUrl: resourceUrl || null,
          type: contentType,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo actualizar el contenido');

      setSections((prev) => prev.map((section) => ({
        ...section,
        courses: section.courses.map((course) => course.id === selectedCourse.id ? {
          ...course,
          contents: course.contents.map((c) => c.id === editContentId ? data : c),
        } : course),
      })));

      resetContentForm();
      setEditContentId(null);
      setShowContentForm(false);
      showMessage('success', 'Contenido actualizado');
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Error al actualizar el contenido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className={cn(
          'rounded-2xl border p-4 flex items-center gap-3 shadow-sm font-medium',
          message.type === 'success'
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400'
        )}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      <Modal
        isOpen={showSectionForm}
        onClose={() => {
          setShowSectionForm(false);
          setEditSectionId(null);
          resetSectionForm();
        }}
        title={editSectionId ? 'Editar sección' : 'Nueva sección'}
        description="Crea o actualiza una sección para organizar cursos."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Título de la sección</label>
            <input
              value={editSectionId ? editSectionForm.title : sectionForm.title}
              onChange={(e) => {
                const value = e.target.value;
                if (editSectionId) {
                  setEditSectionForm((prev) => ({ ...prev, title: value }));
                } else {
                  setSectionForm((prev) => ({ ...prev, title: value }));
                }
              }}
              className="w-full rounded-2xl border border-border px-4 py-3 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ej. Formación Básica"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Descripción</label>
            <textarea
              value={editSectionId ? editSectionForm.description : sectionForm.description}
              onChange={(e) => {
                const value = e.target.value;
                if (editSectionId) {
                  setEditSectionForm((prev) => ({ ...prev, description: value }));
                } else {
                  setSectionForm((prev) => ({ ...prev, description: value }));
                }
              }}
              className="w-full min-h-[120px] rounded-2xl border border-border px-4 py-3 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Descripción breve de la sección"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={editSectionId ? updateSection : createSection}
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
            >
              {editSectionId ? 'Actualizar sección' : 'Guardar sección'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSectionForm(false);
                setEditSectionId(null);
                resetSectionForm();
              }}
              className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showCourseForm}
        onClose={() => {
          setShowCourseForm(false);
          setEditCourseId(null);
          resetCourseForm();
        }}
        title={editCourseId ? 'Editar curso' : 'Nuevo curso'}
        description="Crea o actualiza un curso dentro de una sección."
        maxWidthClassName="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Título del curso</label>
              <input
                value={editCourseId ? editCourseForm.title : courseForm.title}
                onChange={(e) => {
                  const value = e.target.value;
                  if (editCourseId) {
                    setEditCourseForm((prev) => ({ ...prev, title: value }));
                  } else {
                    setCourseForm((prev) => ({ ...prev, title: value }));
                  }
                }}
                className="w-full rounded-2xl border border-border px-4 py-3 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ej. Rituales de bienestar"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sección</label>
              <select
                value={editCourseId ? editCourseForm.sectionId : courseForm.sectionId}
                onChange={(e) => {
                  const value = e.target.value;
                  if (editCourseId) {
                    setEditCourseForm((prev) => ({ ...prev, sectionId: value }));
                  } else {
                    setCourseForm((prev) => ({ ...prev, sectionId: value }));
                  }
                }}
                className="w-full rounded-2xl border border-border px-4 py-3 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Selecciona una sección</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>{section.title}</option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-2 space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <textarea
                value={editCourseId ? editCourseForm.description : courseForm.description}
                onChange={(e) => {
                  const value = e.target.value;
                  if (editCourseId) {
                    setEditCourseForm((prev) => ({ ...prev, description: value }));
                  } else {
                    setCourseForm((prev) => ({ ...prev, description: value }));
                  }
                }}
                className="w-full min-h-[120px] rounded-2xl border border-border px-4 py-3 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Describe el curso y sus objetivos"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={editCourseId ? updateCourse : createCourse}
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
            >
              {editCourseId ? 'Actualizar curso' : 'Guardar curso'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCourseForm(false);
                setEditCourseId(null);
                resetCourseForm();
              }}
              className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showContentForm}
        onClose={() => {
          setShowContentForm(false);
          setEditContentId(null);
          resetContentForm();
        }}
        title={editContentId ? 'Editar material' : 'Nuevo material'}
        description="Sube, edita o elimina un recurso para este curso."
        maxWidthClassName="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Título</label>
              <input
                value={editContentId ? editContentForm.title : contentForm.title}
                onChange={(e) => {
                  const value = e.target.value;
                  if (editContentId) {
                    setEditContentForm((prev) => ({ ...prev, title: value }));
                  } else {
                    setContentForm((prev) => ({ ...prev, title: value }));
                  }
                }}
                className="w-full rounded-2xl border border-border px-4 py-3 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ej. Guía descargable"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <select
                value={editContentId ? editContentForm.type : contentForm.type}
                onChange={(e) => {
                  const value = e.target.value as ContentType;
                  if (editContentId) {
                    setEditContentForm((prev) => ({ ...prev, type: value }));
                  } else {
                    setContentForm((prev) => ({ ...prev, type: value }));
                  }
                }}
                className="w-full rounded-2xl border border-border px-4 py-3 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="TASK">Tarea</option>
                <option value="MATERIAL">Material</option>
                <option value="PDF">PDF</option>
                <option value="TOOL">Herramienta</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Descripción</label>
            <textarea
              value={editContentId ? editContentForm.description : contentForm.description}
              onChange={(e) => {
                const value = e.target.value;
                if (editContentId) {
                  setEditContentForm((prev) => ({ ...prev, description: value }));
                } else {
                  setContentForm((prev) => ({ ...prev, description: value }));
                }
              }}
              className="w-full min-h-[120px] rounded-2xl border border-border px-4 py-3 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Incluye instrucciones o notas adicionales"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Archivo o URL</label>
            <input
              value={editContentId ? editContentForm.resourceUrl : contentForm.resourceUrl}
              onChange={(e) => {
                const value = e.target.value;
                if (editContentId) {
                  setEditContentForm((prev) => ({ ...prev, resourceUrl: value }));
                } else {
                  setContentForm((prev) => ({ ...prev, resourceUrl: value }));
                }
              }}
              className="w-full rounded-2xl border border-border px-4 py-3 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Pega el enlace de un video (YouTube, Vimeo, etc.) o deja vacío para subir un archivo"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Subir archivo</label>
            <div
              className={cn(
                'rounded-3xl border-2 border-dashed p-6 bg-muted transition-colors',
                isDragOver ? 'border-primary bg-primary/5' : 'border-border'
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="text-center space-y-4">
                <UploadCloud className="w-8 h-8 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Arrastre archivo o imagen aquí</p>
                  <p className="text-xs text-muted-foreground">o</p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-sm font-medium hover:bg-primary/90 cursor-pointer">
                    <UploadCloud className="w-4 h-4" />
                    Agregar archivo o imagen
                    <input
                      type="file"
                      onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.ppt,.pptx"
                    />
                  </label>
                </div>
                {selectedFile && (
                  <p className="text-sm text-primary">Archivo seleccionado: {selectedFile.name}</p>
                )}
                {fileError && <p className="text-sm text-rose-600">{fileError}</p>}
                {(editContentId ? editContentForm.resourceUrl : contentForm.resourceUrl) && !selectedFile && (
                  <a
                    href={editContentId ? editContentForm.resourceUrl : contentForm.resourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Link2 className="w-4 h-4" /> Ver archivo actual
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={editContentId ? updateContent : createContent}
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
            >
              {editContentId ? 'Guardar cambios' : 'Agregar material'}
            </button>
            {editContentId && (
              <button
                type="button"
                onClick={() => {
                  if (selectedCourse && editContentId) deleteContent(editContentId);
                }}
                className="inline-flex items-center justify-center rounded-full bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition shadow-sm border-none"
              >
                Eliminar material
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowContentForm(false);
                setEditContentId(null);
                resetContentForm();
              }}
              className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold">Secciones</h2>
              <p className="text-sm text-muted-foreground">Organiza tus cursos por grupos.</p>
            </div>
            <button
              type="button"
              onClick={() => { setShowSectionForm(true); setEditSectionId(null); resetSectionForm(); }}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition"
            >
              <Plus className="w-4 h-4" />
              Nueva sección
            </button>
          </div>

          <div className="space-y-3">
            {sections.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border/70 bg-background p-6 text-center text-sm text-muted-foreground">
                No hay secciones todavía. Crea una sección para comenzar a agregar cursos.
              </div>
            ) : (
              sections.map((section) => (
                <div
                  key={section.id}
                  className={cn(
                    'rounded-3xl border p-4 transition cursor-pointer',
                    activeSectionId === section.id ? 'border-primary bg-primary/5' : 'border-border/60 bg-background hover:border-primary/80'
                  )}
                  onClick={() => selectSection(section.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">{section.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{section.description || 'Sin descripción'}</p>
                    </div>
                    <span className={cn(
                      'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                      section.active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    )}>
                      {section.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{section.courses.length} curso{section.courses.length !== 1 ? 's' : ''}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); enterEditSection(section); setShowSectionForm(true); }}
                        className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition shadow-sm border-none"
                      >
                        <Pencil className="w-3 h-3" /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); deleteSection(section.id); }}
                        className="inline-flex items-center gap-1 rounded-full bg-destructive px-3 py-1 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 transition shadow-sm border-none"
                      >
                        <Trash2 className="w-3 h-3" /> Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Sección activa</p>
                <h2 className="text-2xl font-semibold">{selectedSection?.title || 'Selecciona una sección'}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{selectedSection?.description || 'Aquí verás los cursos y materiales de la sección seleccionada.'}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="rounded-3xl bg-muted px-4 py-3 text-sm font-medium text-foreground">
                  <span className="block text-xs text-muted-foreground">Cursos</span>
                  <span className="text-lg font-semibold">{selectedSection?.courses.length ?? 0}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCourseForm(true);
                    resetCourseForm();
                    setCourseForm((prev) => ({ ...prev, sectionId: selectedSection?.id || '' }));
                    setEditCourseId(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground hover:bg-secondary/90 transition"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo curso
                </button>
              </div>
            </div>

          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <h3 className="text-lg font-semibold">Cursos</h3>
                  <p className="text-sm text-muted-foreground">Selecciona uno para ver y administrar su contenido.</p>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {selectedSection?.courses.length ?? 0} total
                </span>
              </div>
              <div className="space-y-4">
                {selectedSection?.courses.length ? selectedSection.courses.map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => setSelectedCourseId(course.id)}
                    className={cn(
                      'w-full rounded-3xl border p-4 text-left transition',
                      selectedCourseId === course.id ? 'border-primary bg-primary/5' : 'border-border/70 bg-background hover:border-primary/80'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-base font-semibold">{course.title}</h4>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{course.description || 'Sin descripción'}</p>
                      </div>
                      <span className={cn(
                        'rounded-full px-3 py-1 text-[11px] font-semibold',
                        course.active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      )}>
                        {course.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{course.contents.length} material{course.contents.length !== 1 ? 'es' : ''}</span>
                      <span>{course.assignments.length} estudiante{course.assignments.length !== 1 ? 's' : ''}</span>
                    </div>
                  </button>
                )) : (
                  <div className="rounded-3xl border border-dashed border-border/70 bg-background p-6 text-center text-sm text-muted-foreground">
                    No hay cursos en esta sección. Crea uno para comenzar.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              {selectedCourse ? (
                <>
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Curso seleccionado</p>
                      <h3 className="text-xl font-semibold">{selectedCourse.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">Clave de acceso: <span className="font-semibold text-foreground">{selectedCourse.id.slice(0, 8).toUpperCase()}</span></p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setShowContentForm(true); setEditContentId(null); resetContentForm(); }}
                      className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground hover:bg-secondary/90"
                    >
                      <Plus className="w-4 h-4" /> Nuevo material
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-3xl border border-border bg-background p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">Materiales</p>
                          <p className="text-sm text-muted-foreground">Lo que verá el alumno.</p>
                        </div>
                        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">{selectedCourse.contents.length}</span>
                      </div>
                      {selectedCourse.contents.length === 0 ? (
                        <p className="mt-3 text-sm text-muted-foreground">No hay materiales todavía. Agrega un recurso para empezar.</p>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {selectedCourse.contents.map((content) => (
                            <button
                              key={content.id}
                              type="button"
                              onClick={() => enterEditContent(content)}
                              className="w-full rounded-3xl border border-border p-4 bg-card text-left transition hover:border-primary/80"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{content.type}</p>
                                  <h4 className="mt-2 text-sm font-semibold">{content.title}</h4>
                                  <p className="mt-1 text-sm text-muted-foreground">{content.description || 'Sin descripción'}</p>
                                  {content.resourceUrl && (
                                    <p className="mt-3 inline-flex items-center gap-2 text-sm text-primary">
                                      <Link2 className="w-3.5 h-3.5" /> Archivo disponible
                                    </p>
                                  )}
                                </div>
                                <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-2 text-xs font-semibold text-foreground">
                                  Ver material
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-3xl border border-border bg-background p-4">
                      <div className="flex items-center gap-3">
                        <Layers className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm font-semibold">Estudiantes asignados</p>
                          <p className="text-sm text-muted-foreground">No hay estudiantes inscritos aún.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-3xl border border-dashed border-border/70 bg-background p-6 text-center text-sm text-muted-foreground">
                  Selecciona un curso para ver su material aquí.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
