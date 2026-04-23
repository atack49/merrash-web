'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, CheckCircle, Edit2, Eye, EyeOff, Pencil, Plus, Settings2, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadServiceImageToCloudinary } from '@/lib/images/cloudinaryUpload';

interface Course {
  id: string;
  title: string;
  description: string;
  icon?: string | null;
  category: string;
  price?: string | null;
  active: boolean;
  order?: number;
}

interface CourseSection {
  id: string;
  name: string;
  order: number;
}

interface Message {
  type: 'success' | 'error';
  text: string;
}

const isImageSource = (value?: string | null) => {
  if (!value) return false;
  return value.trim().length > 5;
};

export function CoursesManager() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [sections, setSections] = useState<CourseSection[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Course>>({});

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [newCourse, setNewCourse] = useState({ title: '', description: '', icon: '', category: '', price: '' });

  const [showSectionsModal, setShowSectionsModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const categories = useMemo(() => {
    const manual = sections.map((section) => section.name).filter(Boolean);
    const fromCourses = courses.map((course) => course.category).filter(Boolean);
    return Array.from(new Set([...manual, ...fromCourses]));
  }, [courses, sections]);

  const filteredCourses = useMemo(
    () => courses.filter((course) => (selectedSection ? course.category === selectedSection : true)),
    [courses, selectedSection]
  );

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const fetchCourses = useCallback(async () => {
    const res = await fetch('/api/admin/courses', { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'No se pudieron cargar los cursos');
    return Array.isArray(data) ? data : [];
  }, []);

  const fetchSections = useCallback(async () => {
    const res = await fetch('/api/admin/course-sections', { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'No se pudieron cargar las secciones');
    return Array.isArray(data) ? data : [];
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [nextCourses, nextSections] = await Promise.all([fetchCourses(), fetchSections()]);
      setCourses(nextCourses);
      setSections(nextSections);

      const allAvailable = Array.from(
        new Set([...nextSections.map((item: CourseSection) => item.name), ...nextCourses.map((item: Course) => item.category)])
      );
      if (!selectedSection && allAvailable.length > 0) {
        setSelectedSection(allAvailable[0]);
      }
      if (selectedSection && !allAvailable.includes(selectedSection)) {
        setSelectedSection(allAvailable[0] || '');
      }
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Error al cargar cursos');
      setCourses([]);
      setSections([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchCourses, fetchSections, selectedSection]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const toggleActive = async (id: string, currentActive: boolean) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/courses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'Error al actualizar');

      setCourses((prev) => prev.map((course) => (course.id === id ? payload : course)));
      showMessage('success', `Curso ${!currentActive ? 'mostrado' : 'ocultado'}`);
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Error al actualizar');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCourse = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este curso?')) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/courses/${id}`, { method: 'DELETE' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'Error al eliminar');

      setCourses((prev) => prev.filter((course) => course.id !== id));
      showMessage('success', 'Curso eliminado');
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Error al eliminar');
    } finally {
      setIsLoading(false);
    }
  };

  const saveEdit = async (id: string) => {
    const updateData: Record<string, unknown> = {};

    if (editData.title !== undefined && editData.title !== '') updateData.title = editData.title;
    if (editData.description !== undefined && editData.description !== '') updateData.description = editData.description;
    if (editData.icon !== undefined) updateData.icon = editData.icon;
    if (editData.category !== undefined && editData.category !== '') updateData.category = editData.category;
    if (editData.price !== undefined) updateData.price = editData.price;

    if (Object.keys(updateData).length === 0) {
      showMessage('error', 'No hay cambios para guardar');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/courses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'Error al guardar');

      setCourses((prev) => prev.map((course) => (course.id === id ? payload : course)));
      setEditingId(null);
      setEditData({});
      showMessage('success', 'Cambios guardados correctamente');
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Error al guardar');
    } finally {
      setIsLoading(false);
    }
  };

  const addCourse = async () => {
    if (!newCourse.title.trim() || !newCourse.description.trim() || !newCourse.category.trim()) {
      showMessage('error', 'Completa título, descripción y sección');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCourse,
          order: courses.length + 1,
        }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'Error al agregar');

      setCourses((prev) => [...prev, payload]);
      setSelectedSection(payload.category);
      setShowAddForm(false);
      setNewCourse({ title: '', description: '', icon: '', category: payload.category, price: '' });
      showMessage('success', 'Curso agregado');
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Error al agregar');
    } finally {
      setIsLoading(false);
    }
  };

  const addSection = async () => {
    if (!newSectionName.trim()) {
      showMessage('error', 'Escribe el nombre de la sección');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/course-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSectionName }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'No se pudo crear la sección');

      setSections((prev) => [...prev, payload]);
      setNewSectionName('');
      setSelectedSection(payload.name);
      setNewCourse((prev) => ({ ...prev, category: payload.name }));
      showMessage('success', 'Sección creada');
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'No se pudo crear la sección');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSectionEdit = async (id: string) => {
    if (!editingSectionName.trim()) {
      showMessage('error', 'El nombre no puede quedar vacío');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/course-sections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingSectionName }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'No se pudo actualizar la sección');

      await refreshData();
      setEditingSectionId(null);
      setEditingSectionName('');
      showMessage('success', 'Sección actualizada');
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'No se pudo actualizar la sección');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSection = async (section: CourseSection) => {
    const ok = window.confirm(`¿Eliminar la sección \"${section.name}\"?`);
    if (!ok) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/course-sections/${section.id}`, { method: 'DELETE' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'No se pudo eliminar la sección');

      await refreshData();
      showMessage('success', 'Sección eliminada');
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'No se pudo eliminar la sección');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelection = async (file: File, mode: 'new' | 'edit') => {
    setIsLoading(true);
    try {
      const imageUrl = await uploadServiceImageToCloudinary(file);
      if (mode === 'new') {
        setNewCourse((prev) => ({ ...prev, icon: imageUrl }));
      } else {
        setEditData((prev) => ({ ...prev, icon: imageUrl }));
      }
      showMessage('success', 'Imagen cargada correctamente');
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'No se pudo subir la imagen');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {message && (
        <div
          className={cn(
            'fixed top-4 right-4 z-50 p-4 rounded-lg flex items-center gap-3 shadow-lg animate-in slide-in-from-top-4',
            message.type === 'success'
              ? 'bg-green-100 border border-green-300 text-green-800'
              : 'bg-red-100 border border-red-300 text-red-800'
          )}
        >
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full hover:bg-primary/90 transition font-medium shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nuevo Curso
        </button>
        <button
          onClick={() => setShowSectionsModal(true)}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80 transition font-medium shadow-sm"
        >
          <Settings2 className="w-5 h-5" />
          Administrar secciones
        </button>
      </div>

      {showSectionsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border max-w-xl w-full p-6 md:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground">Administrar secciones</h3>
              <button onClick={() => setShowSectionsModal(false)} className="p-2 hover:bg-muted rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl border border-border p-3 bg-background space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Agregar sección</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej. Belleza Integral"
                />
                <button onClick={addSection} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90">
                  Agregar
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
              {sections.map((section) => (
                <div key={section.id} className="rounded-xl border border-border p-3 bg-background">
                  {editingSectionId === section.id ? (
                    <div className="flex gap-2">
                      <input
                        value={editingSectionName}
                        onChange={(e) => setEditingSectionName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button
                        onClick={() => saveSectionEdit(section.id)}
                        className="px-3 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => {
                          setEditingSectionId(null);
                          setEditingSectionName('');
                        }}
                        className="px-3 py-2 bg-slate-200 text-foreground rounded-xl text-sm font-medium hover:bg-slate-300"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{section.name}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingSectionId(section.id);
                            setEditingSectionName(section.name);
                          }}
                          className="h-8 w-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 flex items-center justify-center"
                          title="Editar sección"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteSection(section)}
                          className="h-8 w-8 rounded-full bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 flex items-center justify-center"
                          title="Eliminar sección"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border max-w-md w-full p-6 md:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground">Nuevo Curso</h3>
              <button onClick={() => setShowAddForm(false)} className="p-2 hover:bg-muted rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Título</label>
                <input
                  type="text"
                  placeholder="Ej. Curso de Acupuntura Integral"
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Descripción</label>
                <textarea
                  placeholder="Describe brevemente el curso"
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-border rounded-xl h-28 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Precio (opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. $3,999"
                  value={newCourse.price}
                  onChange={(e) => setNewCourse({ ...newCourse, price: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Imagen del curso</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await handleImageSelection(file, 'new');
                  }}
                  className="w-full px-3 py-2 border border-border rounded-xl text-sm file:mr-3 file:px-3 file:py-1.5 file:border-0 file:rounded-lg file:bg-primary/10 file:text-primary"
                />
                {isImageSource(newCourse.icon) && (
                  <div className="h-24 rounded-xl border border-border bg-cover bg-center" style={{ backgroundImage: `url(${newCourse.icon})` }} />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Sección</label>
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setNewCourse({ ...newCourse, category })}
                      className={cn(
                        'px-5 py-2.5 text-sm font-medium rounded-full transition-colors whitespace-nowrap',
                        newCourse.category === category ? 'bg-primary text-white' : 'text-foreground hover:bg-muted'
                      )}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={addCourse}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-50 font-medium transition"
              >
                Guardar
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-4 py-2.5 bg-slate-200 text-foreground rounded-full hover:bg-slate-300 font-medium transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center flex-wrap gap-2 md:gap-3 mb-6 md:mb-8">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => {
              setSelectedSection(category);
              setNewCourse((prev) => ({ ...prev, category }));
            }}
            className={cn(
              'px-5 py-2.5 text-sm font-medium rounded-full transition-colors whitespace-nowrap',
              selectedSection === category ? 'bg-primary text-white' : 'text-foreground hover:bg-muted'
            )}
          >
            {category}
          </button>
        ))}
      </div>

      {filteredCourses.length > 0 && (
        <p className="text-xs md:text-sm lg:text-base text-muted-foreground text-center mb-4 md:mb-6">
          Mostrando <span className="font-semibold">{filteredCourses.length}</span> curso
          {filteredCourses.length !== 1 ? 's' : ''} en {selectedSection}
        </p>
      )}

      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className={cn(
                'p-4 rounded-2xl border border-border/50 transition-all bg-gradient-to-br',
                editingId === course.id
                  ? 'border-primary/50 from-primary/5 to-white ring-2 ring-primary/30 shadow-lg'
                  : course.active
                    ? 'from-secondary/5 to-secondary/10 hover:from-secondary/10 hover:to-secondary/20 hover:shadow-md'
                    : 'from-gray-50 to-gray-100 opacity-70'
              )}
            >
              {editingId === course.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Título"
                    value={editData.title !== undefined ? editData.title : course.title}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <textarea
                    placeholder="Descripción"
                    value={editData.description !== undefined ? editData.description : course.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="text"
                    placeholder="Precio"
                    value={editData.price !== undefined ? editData.price ?? '' : course.price ?? ''}
                    onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Imagen</label>
                    <input
                      id={`edit-image-${course.id}`}
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        await handleImageSelection(file, 'edit');
                      }}
                      className="hidden"
                    />

                    <div className="flex gap-2 items-center">
                      <div className="flex-1">
                        {(() => {
                          const hasEditedIcon = Object.prototype.hasOwnProperty.call(editData, 'icon');
                          const currentImage = hasEditedIcon ? (editData.icon as string | null | undefined) : course.icon;
                          return isImageSource(currentImage) ? (
                            <div className="h-16 rounded-xl border border-border bg-cover bg-center" style={{ backgroundImage: `url(${currentImage})` }} />
                          ) : (
                            <div className="h-16 rounded-xl border border-dashed border-border bg-card flex items-center justify-center text-[11px] text-muted-foreground">
                              Sin imagen
                            </div>
                          );
                        })()}
                      </div>

                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor={`edit-image-${course.id}`}
                          className="h-9 w-9 rounded-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 flex items-center justify-center cursor-pointer transition"
                          title="Cambiar imagen"
                        >
                          <Pencil className="w-4 h-4" />
                        </label>
                        <button
                          type="button"
                          onClick={() => setEditData({ ...editData, icon: null })}
                          className="h-9 w-9 rounded-full bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 flex items-center justify-center transition"
                          title="Borrar imagen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Sección</label>
                    <div className="flex flex-wrap justify-center gap-2 pt-1">
                      {categories.map((category) => {
                        const selected = (editData.category !== undefined ? editData.category : course.category) === category;
                        return (
                          <button
                            key={category}
                            type="button"
                            onClick={() => setEditData({ ...editData, category })}
                            className={cn(
                              'px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap',
                              selected ? 'bg-primary text-white' : 'text-foreground hover:bg-muted'
                            )}
                          >
                            {category}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 mt-2 border-t border-primary/20">
                    <button
                      onClick={() => saveEdit(course.id)}
                      disabled={isLoading}
                      className="flex-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition shadow-sm"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditData({});
                      }}
                      className="flex-1 px-3 py-1.5 bg-slate-200 text-foreground rounded-full text-xs font-medium hover:bg-slate-300 transition shadow-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative -m-4 mb-3 min-h-[190px] rounded-2xl overflow-hidden border border-border/70">
                    <div className="absolute inset-0 bg-service-card" />

                    {!isImageSource(course.icon) && (
                      <div
                        className="absolute inset-0 service-card-shapes"
                        style={{
                          backgroundImage:
                            'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 800 600\' preserveAspectRatio=\'xMidYMid slice\'%3E%3Cpath fill=\'%2343C6B5\' fill-opacity=\'0.15\' d=\'M0 0 L0 250 Q 200 350 450 150 T 800 50 L 800 0 Z\' /%3E%3Cpath fill=\'%238FD9D0\' fill-opacity=\'0.25\' d=\'M0 0 L0 100 Q 250 200 500 50 T 800 200 L 800 0 Z\' /%3E%3Cpath fill=\'%231DB4A1\' fill-opacity=\'0.1\' d=\'M800 600 L800 350 Q 550 200 300 450 T 0 500 L 0 600 Z\' /%3E%3C/svg%3E")',
                          backgroundSize: 'cover',
                        }}
                      />
                    )}

                    {isImageSource(course.icon) && (
                      <>
                        <div
                          className="absolute inset-0 bg-cover bg-no-repeat bg-center"
                          style={{ backgroundImage: `url('${course.icon}')` }}
                        />
                        <div className="absolute inset-0 bg-card/75 dark:bg-card/65 transition-colors" />
                      </>
                    )}

                    <div className="absolute inset-0 service-card-highlight" />

                    <div className="relative z-10 h-full p-4 flex flex-col justify-between">
                      <div className="h-9 w-9 text-primary rounded-full bg-card/70 shadow-sm backdrop-blur-md flex items-center justify-center border border-white">
                        <BookOpen className="w-4.5 h-4.5 text-primary" />
                      </div>

                      <div>
                        <h3 className="font-bold text-foreground text-base mb-1 line-clamp-2">{course.title}</h3>
                        <p className="text-xs font-medium text-muted-foreground mb-2 line-clamp-2 max-w-[85%]">{course.description}</p>
                        <div className="flex flex-wrap gap-1">
                          <span className="text-[11px] bg-card text-primary px-2 py-0.5 rounded-full border border-primary/20 shadow-sm font-medium">
                            {course.category}
                          </span>
                          {course.price && (
                            <span className="text-[11px] bg-card text-muted-foreground px-2 py-0.5 rounded-full border border-border shadow-sm font-medium">
                              {course.price}
                            </span>
                          )}
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-medium border shadow-sm ${
                              course.active
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                : 'bg-rose-100 text-rose-700 border-rose-200'
                            }`}
                          >
                            {course.active ? 'Visible' : 'Oculto'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={() => {
                        setEditingId(course.id);
                        setEditData({});
                      }}
                      className="flex-1 min-w-[30%] flex items-center justify-center gap-1.5 px-2 py-2 bg-primary text-primary-foreground rounded-full text-xs font-medium hover:bg-primary/90 transition shadow-sm"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={() => toggleActive(course.id, course.active)}
                      className="flex-1 min-w-[30%] flex items-center justify-center gap-1.5 px-2 py-2 bg-secondary text-secondary-foreground rounded-full text-xs font-medium hover:bg-secondary/80 transition shadow-sm border border-secondary-foreground/10"
                    >
                      {course.active ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          Ocultar
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          Mostrar
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => deleteCourse(course.id)}
                      className="flex-1 min-w-[30%] flex items-center justify-center gap-1.5 px-2 py-2 bg-destructive text-destructive-foreground rounded-full text-xs font-medium hover:bg-destructive/90 transition shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-sm">
            {isLoading ? 'Cargando cursos...' : `No hay cursos en la sección ${selectedSection || 'seleccionada'}`}
          </p>
        </div>
      )}
    </div>
  );
}
