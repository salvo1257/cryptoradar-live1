import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { cn } from '../../lib/utils';

export function NotesPage() {
  const { t, notes, createNote, updateNote, deleteNote } = useApp();
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCreate = async () => {
    if (!newNote.trim()) return;
    const success = await createNote(newNote);
    if (success) {
      setNewNote('');
    }
  };

  const handleUpdate = async (noteId) => {
    if (!editContent.trim()) return;
    const success = await updateNote(noteId, editContent);
    if (success) {
      setEditingId(null);
      setEditContent('');
    }
  };

  const startEdit = (note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  return (
    <div className="p-4 space-y-4" data-testid="notes-page">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight">{t('notes')}</h1>
      </div>
      
      {/* New note form */}
      <div className="bg-crypto-card/60 border border-crypto-border rounded-sm p-4 space-y-3">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Write your trading notes here..."
          className="bg-crypto-surface border-crypto-border min-h-[100px] resize-none"
          data-testid="new-note-input"
        />
        <Button 
          onClick={handleCreate}
          disabled={!newNote.trim()}
          className="bg-bullish text-black hover:bg-bullish/90"
          data-testid="add-note-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('addNote')}
        </Button>
      </div>

      {/* Notes list */}
      <div className="space-y-3">
        {notes.length > 0 ? (
          notes.map((note) => (
            <div 
              key={note.id}
              className="bg-crypto-card/60 border border-crypto-border rounded-sm p-4"
            >
              {editingId === note.id ? (
                <div className="space-y-3">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="bg-crypto-surface border-crypto-border min-h-[100px] resize-none"
                    data-testid={`edit-note-${note.id}`}
                  />
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm"
                      onClick={() => handleUpdate(note.id)}
                      className="bg-bullish text-black hover:bg-bullish/90"
                    >
                      <Save className="w-4 h-4 mr-1" />
                      {t('save')}
                    </Button>
                    <Button 
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      {t('cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm whitespace-pre-wrap mb-3">{note.content}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      {formatDate(note.updated_at || note.created_at)}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => startEdit(note)}
                        className="text-zinc-500 hover:text-white"
                        data-testid={`edit-btn-${note.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteNote(note.id)}
                        className="text-zinc-500 hover:text-bearish"
                        data-testid={`delete-note-${note.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-32 text-zinc-500 text-sm bg-crypto-card/30 rounded-sm border border-crypto-border">
            No notes yet. Start writing!
          </div>
        )}
      </div>
    </div>
  );
}

export default NotesPage;
