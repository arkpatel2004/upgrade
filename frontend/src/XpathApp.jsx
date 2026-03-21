import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Plus, MoreVertical, Trash2, Code2, FilePlus, ChevronDown, ArrowRight } from 'lucide-react';

// ── Odoo versions list ────────────────────────────────────────
const ODOO_VERSIONS = [
    '15.0', '15.1', '15.2', '15.3', '15.4',
    '16.0', '16.1', '16.2', '16.3', '16.4',
    '17.0', '17.1', '17.2', '17.3',
    '18.0', '18.1', '18.2',
    '19.0',
];

// ── Helper: Generate next file id ─────────────────────────────
function getNextMainId(files) {
    const mains = files.filter(f => !f.parentId);
    if (mains.length === 0) return '1';
    const ids = mains.map(f => parseInt(f.id, 10)).filter(Boolean);
    return String(Math.max(...ids) + 1);
}

function getNextChildId(files, parentId) {
    const children = files.filter(f => f.parentId === parentId);
    if (children.length === 0) return `${parentId}.1`;
    const suffixes = children.map(f => {
        const parts = f.id.split('.');
        return parseInt(parts[parts.length - 1], 10);
    });
    return `${parentId}.${Math.max(...suffixes) + 1}`;
}

// ── Code Editor modal / inline ─────────────────────────────────
function CodePanel({ file, onUpdate, onClose }) {
    const [code, setCode] = useState(file.code || '');
    return (
        <div className="mt-1 mb-2 ml-4 rounded-lg border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#2A2D36] border-b border-white/10">
                <span className="text-xs font-mono text-gray-400">{file.name} — XML</span>
                <button
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    onClick={() => { onUpdate(file.id, code); onClose(); }}
                >
                    Save
                </button>
            </div>
            <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder={`<!-- Paste ${file.name} XML here -->`}
                className="w-full min-h-[140px] bg-[#1E2028] text-gray-300 text-xs font-mono p-3 resize-y focus:outline-none placeholder-gray-600"
            />
        </div>
    );
}

// ── Three-dot dropdown ─────────────────────────────────────────
function FileMenu({ file, onAddInherited, onAddCode, onDelete }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
                className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
                <MoreVertical className="w-3.5 h-3.5" />
            </button>
            {open && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-[#1E2028] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <button
                        className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-gray-300 hover:bg-white/5 transition-colors"
                        onClick={() => { onAddCode(file.id); setOpen(false); }}
                    >
                        <Code2 className="w-3.5 h-3.5 text-blue-400" />
                        Add Code
                    </button>
                    <button
                        className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-gray-300 hover:bg-white/5 transition-colors"
                        onClick={() => { onAddInherited(file.id); setOpen(false); }}
                    >
                        <FilePlus className="w-3.5 h-3.5 text-emerald-400" />
                        Add Inherited File
                    </button>
                    <div className="border-t border-white/5 my-0.5" />
                    <button
                        className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                        onClick={() => { onDelete(file.id); setOpen(false); }}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete File
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Single file row ────────────────────────────────────────────
// Dot colors cycling by depth level
const DOT_COLORS = [
    'bg-blue-400/70',
    'bg-purple-400/70',
    'bg-pink-400/70',
    'bg-amber-400/70',
    'bg-cyan-400/70',
];

function FileRow({ file, onAddInherited, onAddCode, onDelete, onUpdate, openCodeId, setOpenCodeId }) {
    const depth = file.id.split('.').length - 1;  // 0 for root, 1 for .1, 2 for .1.1 ...
    const isCodeOpen = openCodeId === file.id;
    const dotColor = DOT_COLORS[(depth - 1) % DOT_COLORS.length];

    return (
        <div style={{ marginLeft: `${depth * 18}px` }}>
            <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-default group
          ${depth === 0
                        ? 'bg-[#2A2D36] border-white/10 hover:border-white/20'
                        : 'bg-[#252830] border-white/5 hover:border-white/15'
                    }`}
            >
                {depth > 0 && (
                    <div className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                )}
                <span className={`text-xs font-medium flex-1 ${depth === 0 ? 'text-gray-200' : 'text-blue-100/90'}`}>
                    {file.name}
                </span>
                {file.code && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 rounded border border-emerald-500/20">
                        XML
                    </span>
                )}
                <button
                    onClick={() => setOpenCodeId(isCodeOpen ? null : file.id)}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors
            ${isCodeOpen
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            : 'bg-white/5 text-gray-500 border-white/10 hover:text-gray-300 hover:bg-white/10'
                        }`}
                >
                    {isCodeOpen ? 'Close' : 'Code'}
                </button>
                <FileMenu
                    file={file}
                    onAddInherited={onAddInherited}
                    onAddCode={id => { onAddCode(id); setOpenCodeId(id); }}
                    onDelete={onDelete}
                />
            </div>
            {isCodeOpen && (
                <CodePanel
                    file={file}
                    onUpdate={onUpdate}
                    onClose={() => setOpenCodeId(null)}
                />
            )}
        </div>
    );
}

// ── Panel (left or right) ──────────────────────────────────────
function Panel({ label, color }) {
    const [version, setVersion] = useState('');
    const [dropOpen, setDropOpen] = useState(false);
    const [files, setFiles] = useState([]);
    const [openCodeId, setOpenCodeId] = useState(null);
    const dropRef = useRef(null);

    useEffect(() => {
        const handler = e => { if (!dropRef.current?.contains(e.target)) setDropOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const addMainFile = () => {
        const id = getNextMainId(files);
        setFiles(prev => [...prev, { id, name: `File ${id}`, parentId: null, code: '' }]);
    };

    const addInheritedFile = (parentId) => {
        const id = getNextChildId(files, parentId);
        setFiles(prev => {
            // Insert after the last descendant of this parent (any file whose id starts with parentId+".")
            const prefix = parentId + '.';
            const parentIdx = prev.findIndex(f => f.id === parentId);
            const lastDescIdx = prev.reduce(
                (acc, f, i) => (f.id === parentId || f.id.startsWith(prefix)) ? i : acc,
                parentIdx
            );
            const newFiles = [...prev];
            newFiles.splice(lastDescIdx + 1, 0, { id, name: `File ${id}`, parentId, code: '' });
            return newFiles;
        });
    };

    const deleteFile = (id) => {
        // Remove the file and ALL its descendants (any id that starts with id+"." or equals id)
        const prefix = id + '.';
        setFiles(prev => prev.filter(f => f.id !== id && !f.id.startsWith(prefix)));
        if (openCodeId === id || openCodeId?.startsWith(prefix)) setOpenCodeId(null);
    };

    const openCode = (id) => setOpenCodeId(id);

    const updateCode = (id, code) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, code } : f));
    };

    const borderColor = color === 'emerald'
        ? 'border-emerald-500/30'
        : 'border-blue-500/30';

    const labelColor = color === 'emerald' ? 'text-emerald-400' : 'text-blue-400';
    const btnColor = color === 'emerald'
        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
        : 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-400';
    const versionGlow = color === 'emerald' ? 'focus:border-emerald-500/50' : 'focus:border-blue-500/50';

    return (
        <div className={`flex flex-col flex-1 min-w-0 bg-[#1C1E24] rounded-2xl border ${borderColor} overflow-hidden`}>
            {/* Panel header */}
            <div className="px-4 pt-4 pb-3 border-b border-white/5 shrink-0">
                <p className={`text-[11px] font-semibold uppercase tracking-widest mb-2 ${labelColor}`}>{label}</p>

                {/* Version selector */}
                <div className="relative" ref={dropRef}>
                    <button
                        onClick={() => setDropOpen(v => !v)}
                        className={`w-full flex items-center justify-between px-3 py-2 bg-[#252830] border border-white/10 rounded-lg text-sm text-gray-200 hover:border-white/20 transition-colors ${versionGlow}`}
                    >
                        <span>{version || 'Select version…'}</span>
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                    </button>
                    {dropOpen && (
                        <div className="absolute top-full mt-1 left-0 right-0 bg-[#1E2028] border border-white/10 rounded-xl shadow-2xl z-50 max-h-52 overflow-y-auto">
                            {ODOO_VERSIONS.map(v => (
                                <button
                                    key={v}
                                    onClick={() => { setVersion(v); setDropOpen(false); }}
                                    className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-white/5
                    ${version === v ? (color === 'emerald' ? 'text-emerald-400 bg-emerald-500/10' : 'text-blue-400 bg-blue-500/10') : 'text-gray-300'}`}
                                >
                                    v{v}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* File list */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
                {files.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-600 text-xs text-center gap-2">
                        <Code2 className="w-8 h-8 opacity-30" />
                        <span>No files yet.<br />Click "+ Add File" to start.</span>
                    </div>
                )}
                {files.map(file => (
                    <FileRow
                        key={file.id}
                        file={file}
                        onAddInherited={addInheritedFile}
                        onAddCode={openCode}
                        onDelete={deleteFile}
                        onUpdate={updateCode}
                        openCodeId={openCodeId}
                        setOpenCodeId={setOpenCodeId}
                    />
                ))}
            </div>

            {/* Add file button */}
            <div className="px-3 pb-3 shrink-0 border-t border-white/5 pt-3">
                <button
                    onClick={addMainFile}
                    className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg border text-xs font-semibold transition-all ${btnColor}`}
                >
                    <Plus className="w-3.5 h-3.5" />
                    Add File
                </button>
            </div>
        </div>
    );
}

// ── Main XpathApp component ────────────────────────────────────
export default function XpathApp({ onBack }) {
    return (
        <div className="flex flex-col h-screen w-screen bg-[#343541] text-gray-100 font-sans overflow-hidden">

            {/* Header */}
            <header className="flex items-center gap-4 px-5 py-3 border-b border-white/10 bg-[#343541] z-10 shrink-0">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/40 text-gray-400 hover:text-emerald-400 transition-all text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Home</span>
                </button>
                <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                    {/* Xpath SVG */}
                    <svg viewBox="0 0 64 64" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="xHdrApp" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#F97316" />
                                <stop offset="100%" stopColor="#EC4899" />
                            </linearGradient>
                        </defs>
                        <line x1="10" y1="10" x2="54" y2="54" stroke="url(#xHdrApp)" strokeWidth="10" strokeLinecap="round" />
                        <line x1="54" y1="10" x2="10" y2="54" stroke="url(#xHdrApp)" strokeWidth="10" strokeLinecap="round" />
                    </svg>
                    <h1 className="text-lg font-semibold">Xpath Upgrade Analyzer</h1>
                </div>
                <div className="ml-auto text-xs text-gray-500 font-mono bg-white/5 px-2 py-1 rounded hidden sm:block">
                    UI Preview
                </div>
            </header>

            {/* Two-panel body */}
            <main className="flex-1 flex gap-4 p-4 overflow-hidden min-h-0">

                {/* Source panel */}
                <Panel label="Source Version" color="emerald" />

                {/* Center arrow */}
                <div className="flex items-center justify-center shrink-0 self-center">
                    <div className="flex flex-col items-center gap-1">
                        <ArrowRight className="w-6 h-6 text-gray-600" />
                        <span className="text-[10px] text-gray-600 font-medium tracking-wide">UPGRADE</span>
                    </div>
                </div>

                {/* Target panel */}
                <Panel label="Target Version" color="blue" />

            </main>

            {/* Analyze footer */}
            <div className="shrink-0 px-4 pb-4 flex justify-center">
                <button
                    disabled
                    className="px-10 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-500 text-sm font-semibold cursor-not-allowed"
                    title="Coming soon"
                >
                    Analyze XPath Issues
                </button>
            </div>

        </div>
    );
}
