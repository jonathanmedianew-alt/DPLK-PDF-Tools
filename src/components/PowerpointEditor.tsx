import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import JSZip from 'jszip';
import { 
  Presentation, ArrowLeft, Plus, Trash2, Copy, ArrowUp, ArrowDown,
  Play, Download, Upload, Type, Square, Circle, HelpCircle,
  FileDown, RefreshCw, ZoomIn, ZoomOut, Check, Sliders, 
  Info, AlertCircle, Sparkles, Layout, Palette, ChevronLeft, 
  ChevronRight, Maximize2, MonitorPlay, List, LayoutGrid, Eye, 
  Settings, Save, AlignLeft, AlignCenter, AlignRight, FileText, 
  Moon, Sun, Clock, MousePointerClick
} from 'lucide-react';

interface PowerpointEditorProps {
  onBack: () => void;
}

interface SlideElement {
  id: string;
  type: 'heading' | 'subheading' | 'text' | 'bullet' | 'shape';
  content: string;
  x: number; // percentage (0 to 100)
  y: number; // percentage (0 to 100)
  fontSize: number; // pt
  color: string;
  fontFamily: 'sans' | 'serif' | 'mono';
  bold: boolean;
  italic: boolean;
  align: 'left' | 'center' | 'right';
  width: number; // percentage width
  shapeType?: 'rectangle' | 'circle' | 'triangle' | 'quote' | 'badge';
  shapeStyle?: {
    fill: string;
    stroke: string;
    strokeWidth: number;
    rx?: number; // roundness
  };
}

interface Slide {
  id: string;
  backgroundColor: string;
  backgroundGradient?: string;
  textColor: string;
  transition: 'fade' | 'slide' | 'zoom' | 'none';
  elements: SlideElement[];
}

// XML Helper Utilities for resilient PPTX parsing using element localNames (bypassing browser namespace variations)
const findElementsByLocalName = (root: Element | Document | null, matchName: string): Element[] => {
  if (!root) return [];
  const result: Element[] = [];
  const walk = (node: Element) => {
    if (node.localName === matchName) {
      result.push(node);
    }
    for (let i = 0; i < node.children.length; i++) {
      walk(node.children[i]);
    }
  };
  
  if (root instanceof Document) {
    if (root.documentElement) walk(root.documentElement);
  } else {
    walk(root);
  }
  return result;
};

const findFirstElementByLocalName = (root: Element | Document | null, matchName: string): Element | null => {
  if (!root) return null;
  let found: Element | null = null;
  const walk = (node: Element): boolean => {
    if (node.localName === matchName) {
      found = node;
      return true; // stop search
    }
    for (let i = 0; i < node.children.length; i++) {
      if (walk(node.children[i])) return true;
    }
    return false;
  };
  
  if (root instanceof Document) {
    if (root.documentElement) walk(root.documentElement);
  } else {
    walk(root);
  }
  return found;
};

export default function PowerpointEditor({ onBack }: PowerpointEditorProps) {
  // Master Slide list
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);
  
  // Editor and Zoom scales
  const [zoomScale, setZoomScale] = useState<number>(92);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  
  // Active UI Navigation Tabs (left toolbar control drawers)
  const [activeTab, setActiveTab] = useState<'slides' | 'insert' | 'design' | 'transition'>('slides');
  
  // Presentation Mode Status
  const [isPresenting, setIsPresenting] = useState<boolean>(false);
  const [presentSlideIdx, setPresentSlideIdx] = useState<number>(0);
  const [presentationTransition, setPresentationTransition] = useState<boolean>(false);
  const [laserPointerActive, setLaserPointerActive] = useState<boolean>(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [speechTimer, setSpeechTimer] = useState<number>(0);
  const [speechTimerActive, setSpeechTimerActive] = useState<boolean>(false);
  
  // Presentation helper logs
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [deckTitle, setDeckTitle] = useState<string>('Strategic Pitch Deck');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Hidden input file ref
  const importInputRef = useRef<HTMLInputElement>(null);
  const timerIntervalRef = useRef<any>(null);

  // Preset Colors Palette for sliders/textboxes/shapes background
  const themeGradients = [
    { name: 'Clean White', bg: '#ffffff', text: '#1e293b' },
    { name: 'Cosmic Indigo', bg: '#0f172a', gradient: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', text: '#f8fafc' },
    { name: 'Ethereal Sunset', bg: '#fef3c7', gradient: 'linear-gradient(135deg, #fef3c7 0%, #fde047 50%, #f97316 100%)', text: '#1e293b' },
    { name: 'Aurora Teal', bg: '#042f2e', gradient: 'linear-gradient(135deg, #042f2e 0%, #115e59 50%, #0d9488 100%)', text: '#f0fdfa' },
    { name: 'Slate Brutalist', bg: '#18181b', gradient: 'linear-gradient(135deg, #181c24 0%, #111317 100%)', text: '#e4e4e7' },
    { name: 'Bubblegum Dream', bg: '#fae8ff', gradient: 'linear-gradient(135deg, #fae8ff 0%, #fbcfe8 100%)', text: '#47104b' },
    { name: 'Forest Moss', bg: '#064e3b', gradient: 'linear-gradient(135deg, #022c22 0%, #064e3b 100%)', text: '#ecfdf5' },
    { name: 'Nordic Charcoal', bg: '#111827', text: '#f3f4f6' }
  ];

  const themeColors = [
    '#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#10b981', 
    '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#475569'
  ];

  // Initialize presentation setup on load with EXACTLY ONE empty clean template
  // To keep it transparently ready for user input, as per user's structural workflow preference.
  useEffect(() => {
    const blankSlide: Slide = {
      id: 'blank-1',
      backgroundColor: '#ffffff',
      textColor: '#1e293b',
      transition: 'fade',
      elements: [
        {
          id: 'title-1',
          type: 'heading',
          content: 'Click here or double click to type heading',
          x: 10,
          y: 35,
          fontSize: 34,
          color: '#1e293b',
          fontFamily: 'sans',
          bold: true,
          italic: false,
          align: 'center',
          width: 80
        },
        {
          id: 'sub-1',
          type: 'subheading',
          content: 'Introduce your message or edit text layouts with PowerPoint tools',
          x: 10,
          y: 52,
          fontSize: 16,
          color: '#475569',
          fontFamily: 'serif',
          bold: false,
          italic: true,
          align: 'center',
          width: 80
        }
      ]
    };
    setSlides([blankSlide]);
    setActiveSlideIdx(0);
  }, []);

  // Timer logic for Presentation Speech Practice
  useEffect(() => {
    if (speechTimerActive) {
      timerIntervalRef.current = setInterval(() => {
        setSpeechTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [speechTimerActive]);

  const toggleSpeechTimer = () => {
    setSpeechTimerActive(!speechTimerActive);
  };

  const resetSpeechTimer = () => {
    setSpeechTimer(0);
    setSpeechTimerActive(false);
  };

  // Close help banner timer or message indicators
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  // Handle hotkeys (arrows) for transitioning slideshow slides
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPresenting) return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        goToNextPresentSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        goToPrevPresentSlide();
      } else if (e.key === 'Escape') {
        exitPresentationMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresenting, presentSlideIdx, slides]);

  // Slide CRUD Actions
  const handleAddNewSlide = (layoutPreset: 'title' | 'content' | 'split' | 'blank' = 'content') => {
    const freshId = `slide-${Date.now()}`;
    
    // Choose specific mock outline elements
    let presetElements: SlideElement[] = [];
    if (layoutPreset === 'title') {
      presetElements = [
        {
          id: `elem-${Date.now()}-1`,
          type: 'heading',
          content: 'NEW CORE PRESENTATION',
          x: 15,
          y: 35,
          fontSize: 32,
          color: '#1e293b',
          fontFamily: 'sans',
          bold: true,
          italic: false,
          align: 'center',
          width: 70
        },
        {
          id: `elem-${Date.now()}-2`,
          type: 'subheading',
          content: 'Slide Deck Tagline Or Subtitle Layout Section',
          x: 20,
          y: 52,
          fontSize: 15,
          color: '#64748b',
          fontFamily: 'sans',
          bold: false,
          italic: false,
          align: 'center',
          width: 60
        }
      ];
    } else if (layoutPreset === 'content') {
      presetElements = [
        {
          id: `elem-${Date.now()}-1`,
          type: 'heading',
          content: 'Key Slide Title Header',
          x: 8,
          y: 12,
          fontSize: 24,
          color: '#1e293b',
          fontFamily: 'sans',
          bold: true,
          italic: false,
          align: 'left',
          width: 80
        },
        {
          id: `elem-${Date.now()}-2`,
          type: 'bullet',
          content: '• First key highlight point explaining operations details.',
          x: 8,
          y: 28,
          fontSize: 13,
          color: '#334155',
          fontFamily: 'sans',
          bold: false,
          italic: false,
          align: 'left',
          width: 84
        },
        {
          id: `elem-${Date.now()}-3`,
          type: 'bullet',
          content: '• Second major parameter explaining quantitative performance values.',
          x: 8,
          y: 40,
          fontSize: 13,
          color: '#334155',
          fontFamily: 'sans',
          bold: false,
          italic: false,
          align: 'left',
          width: 84
        },
        {
          id: `elem-${Date.now()}-4`,
          type: 'text',
          content: 'Add double-click description texts or summary here inside the footer text box.',
          x: 8,
          y: 65,
          fontSize: 11,
          color: '#64748b',
          fontFamily: 'serif',
          bold: false,
          italic: true,
          align: 'left',
          width: 84
        }
      ];
    } else if (layoutPreset === 'split') {
      presetElements = [
        {
          id: `elem-${Date.now()}-1`,
          type: 'heading',
          content: 'Comparative Layout Structure',
          x: 10,
          y: 12,
          fontSize: 22,
          color: '#0f172a',
          fontFamily: 'sans',
          bold: true,
          italic: false,
          align: 'center',
          width: 80
        },
        {
          id: `elem-${Date.now()}-2`,
          type: 'subheading',
          content: 'Left Channel Option',
          x: 8,
          y: 30,
          fontSize: 15,
          color: '#1e3a8a',
          fontFamily: 'sans',
          bold: true,
          italic: false,
          align: 'left',
          width: 40
        },
        {
          id: `elem-${Date.now()}-3`,
          type: 'text',
          content: 'Detailed parameters of alternative paths. High speed, fully client-secured compilations keeping zero data transfer hazards.',
          x: 8,
          y: 45,
          fontSize: 12,
          color: '#334155',
          fontFamily: 'sans',
          bold: false,
          italic: false,
          align: 'left',
          width: 40
        },
        {
          id: `elem-${Date.now()}-4`,
          type: 'subheading',
          content: 'Right Channel Option',
          x: 52,
          y: 30,
          fontSize: 15,
          color: '#115e59',
          fontFamily: 'sans',
          bold: true,
          italic: false,
          align: 'left',
          width: 40
        },
        {
          id: `elem-${Date.now()}-5`,
          type: 'text',
          content: 'Secondary comparative criteria explaining database modular structures, sandboxed storage configurations.',
          x: 52,
          y: 45,
          fontSize: 12,
          color: '#334155',
          fontFamily: 'sans',
          bold: false,
          italic: false,
          align: 'left',
          width: 40
        }
      ];
    }

    // Capture standard look of current active slide
    const currentSlide = slides[activeSlideIdx];
    const newSlide: Slide = {
      id: freshId,
      backgroundColor: currentSlide ? currentSlide.backgroundColor : '#ffffff',
      backgroundGradient: currentSlide ? currentSlide.backgroundGradient : undefined,
      textColor: currentSlide ? currentSlide.textColor : '#1e293b',
      transition: 'fade',
      elements: presetElements
    };

    const updated = [...slides];
    updated.splice(activeSlideIdx + 1, 0, newSlide);
    setSlides(updated);
    setActiveSlideIdx(activeSlideIdx + 1);
    setActiveElementId(null);
    setSuccessMsg('Inserted slide with chosen template');
  };

  const handleDeleteSlide = (idx: number) => {
    if (slides.length <= 1) {
      setErrorMsg('Your deck must contain at least one presentation slide.');
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }
    const updated = slides.filter((_, sIdx) => sIdx !== idx);
    setSlides(updated);
    // Secure bounds focus
    const targetIdx = Math.max(0, idx - 1);
    setActiveSlideIdx(targetIdx);
    setActiveElementId(null);
    setSuccessMsg('Removed selected slide');
  };

  const handleDuplicateSlide = (idx: number) => {
    const target = slides[idx];
    if (!target) return;
    const duplicated: Slide = {
      ...target,
      id: `dup-${Date.now()}`,
      // Clone sub elements
      elements: target.elements.map(el => ({ ...el, id: `elem-clone-${Math.random()}` }))
    };
    const updated = [...slides];
    updated.splice(idx + 1, 0, duplicated);
    setSlides(updated);
    setActiveSlideIdx(idx + 1);
    setSuccessMsg('Duplicated slide layout');
  };

  const handleMoveSlide = (idx: number, dir: 'up' | 'down') => {
    if (dir === 'up' && idx === 0) return;
    if (dir === 'down' && idx === slides.length - 1) return;

    const updated = [...slides];
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;

    setSlides(updated);
    setActiveSlideIdx(targetIdx);
  };

  // Drag and Drop ordering helper in slides preview list
  const [draggedSlideIdx, setDraggedSlideIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedSlideIdx(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedSlideIdx === null || draggedSlideIdx === index) return;

    const list = [...slides];
    const dragItem = list[draggedSlideIdx];
    list.splice(draggedSlideIdx, 1);
    list.splice(index, 0, dragItem);

    setSlides(list);
    setActiveSlideIdx(index);
    setDraggedSlideIdx(null);
  };

  // Element CRUD Action additions on current slide
  const handleAddTextElement = (presetType: 'heading' | 'subheading' | 'text' | 'bullet') => {
    if (slides.length === 0) return;
    const activeSlide = slides[activeSlideIdx];
    
    let defaultContent = 'New Text Layer';
    let defaultSize = 13;
    let isHeading = false;

    if (presetType === 'heading') {
      defaultContent = 'New Title Heading';
      defaultSize = 26;
      isHeading = true;
    } else if (presetType === 'subheading') {
      defaultContent = 'Brief informative subheading tagline';
      defaultSize = 15;
    } else if (presetType === 'bullet') {
      defaultContent = '• Enter visual bullet points element details';
      defaultSize = 12;
    }

    const newElement: SlideElement = {
      id: `elem-${Date.now()}`,
      type: presetType,
      content: defaultContent,
      x: 20,
      y: 40 + (activeSlide.elements.length * 6) % 30, // Stack staggered offsets
      fontSize: defaultSize,
      color: activeSlide.textColor,
      fontFamily: 'sans',
      bold: isHeading,
      italic: false,
      align: 'center',
      width: 60
    };

    const updatedSlides = [...slides];
    updatedSlides[activeSlideIdx].elements.push(newElement);
    setSlides(updatedSlides);
    setActiveElementId(newElement.id);
    setSuccessMsg(`Added target ${presetType} layer block`);
  };

  const handleAddShapeElement = (shapeType: 'rectangle' | 'circle' | 'triangle' | 'quote' | 'badge') => {
    if (slides.length === 0) return;
    const activeSlide = slides[activeSlideIdx];

    const elementId = `shape-${Date.now()}`;
    const newElement: SlideElement = {
      id: elementId,
      type: 'shape',
      content: shapeType === 'quote' ? '"Professional wisdom drives alignment and trust."' : 'Interactive Shape Title',
      x: 30,
      y: 40 + (activeSlide.elements.length * 7) % 30,
      fontSize: shapeType === 'quote' ? 14 : 11,
      color: activeSlide.textColor,
      fontFamily: 'sans',
      bold: false,
      italic: shapeType === 'quote',
      align: 'center',
      width: 40,
      shapeType: shapeType,
      shapeStyle: {
        fill: shapeType === 'quote' ? '#eff6ff' : '#3b82f622',
        stroke: '#3b82f6',
        strokeWidth: 2,
        rx: shapeType === 'rectangle' ? 8 : undefined
      }
    };

    const updatedSlides = [...slides];
    updatedSlides[activeSlideIdx].elements.push(newElement);
    setSlides(updatedSlides);
    setActiveElementId(elementId);
    setSuccessMsg(`Inserted geometric ${shapeType} decoration`);
  };

  const handleRemoveElement = (elemId: string) => {
    const updatedSlides = [...slides];
    const activeSlide = updatedSlides[activeSlideIdx];
    activeSlide.elements = activeSlide.elements.filter((el) => el.id !== elemId);
    setSlides(updatedSlides);
    setActiveElementId(null);
  };

  // Update specific attributes of selected slide element
  const handleUpdateElementAttr = (elemId: string, attr: keyof SlideElement, value: any) => {
    const updatedSlides = [...slides];
    const activeSlide = updatedSlides[activeSlideIdx];
    activeSlide.elements = activeSlide.elements.map((el) => {
      if (el.id === elemId) {
        return { ...el, [attr]: value };
      }
      return el;
    });
    setSlides(updatedSlides);
  };

  // Shape design properties modifier
  const handleUpdateShapeStyle = (elemId: string, key: keyof Exclude<SlideElement['shapeStyle'], undefined>, value: any) => {
    const updatedSlides = [...slides];
    const activeSlide = updatedSlides[activeSlideIdx];
    activeSlide.elements = activeSlide.elements.map((el) => {
      if (el.id === elemId && el.shapeStyle) {
        return {
          ...el,
          shapeStyle: {
            ...el.shapeStyle,
            [key]: value
          }
        };
      }
      return el;
    });
    setSlides(updatedSlides);
  };

  // Modify active slide overall theme details
  const handleApplySlideBackgroundPreset = (theme: { bg: string, gradient?: string, text: string }) => {
    const updatedSlides = [...slides];
    const activeSlide = updatedSlides[activeSlideIdx];
    activeSlide.backgroundColor = theme.bg;
    activeSlide.backgroundGradient = theme.gradient;
    activeSlide.textColor = theme.text;
    
    // Automatically match the base text elements of the slide!
    activeSlide.elements = activeSlide.elements.map(el => {
      if (el.type !== 'shape') {
        return { ...el, color: theme.text };
      }
      return el;
    });

    setSlides(updatedSlides);
    setSuccessMsg('Applied background template color scheme');
  };

  // Layout preset helper generator (completely rewrites current slide items structure)
  const handleSwapSlideLayoutStructure = (preset: 'title' | 'content' | 'split' | 'blank') => {
    const updatedSlides = [...slides];
    const activeSlide = updatedSlides[activeSlideIdx];
    if (!activeSlide) return;

    // Reset components to target presets
    let freshItems: SlideElement[] = [];
    const color = activeSlide.textColor;

    if (preset === 'title') {
      freshItems = [
        {
          id: `elem-sw-${Date.now()}-1`,
          type: 'heading',
          content: 'Title Topic Heading Line',
          x: 10,
          y: 35,
          fontSize: 32,
          color: color,
          fontFamily: 'sans',
          bold: true,
          italic: false,
          align: 'center',
          width: 80
        },
        {
          id: `elem-sw-${Date.now()}-2`,
          type: 'subheading',
          content: 'Enter presentation summary tags, credentials or date timeline',
          x: 15,
          y: 54,
          fontSize: 14,
          color: color + 'dd',
          fontFamily: 'serif',
          bold: false,
          italic: true,
          align: 'center',
          width: 70
        }
      ];
    } else if (preset === 'content') {
      freshItems = [
        {
          id: `elem-sw-${Date.now()}-1`,
          type: 'heading',
          content: 'Topics Scope Description Title',
          x: 8,
          y: 10,
          fontSize: 24,
          color: color,
          fontFamily: 'sans',
          bold: true,
          italic: false,
          align: 'left',
          width: 80
        },
        {
          id: `elem-sw-${Date.now()}-2`,
          type: 'bullet',
          content: '• Point A: Detail of primary product feature. Fast dynamic offline rendering.',
          x: 8,
          y: 28,
          fontSize: 13,
          color: color,
          fontFamily: 'sans',
          bold: false,
          italic: false,
          align: 'left',
          width: 84
        },
        {
          id: `elem-sw-${Date.now()}-3`,
          type: 'bullet',
          content: '• Point B: Optimization benchmarks showing zero data leak risks.',
          x: 8,
          y: 40,
          fontSize: 13,
          color: color,
          fontFamily: 'sans',
          bold: false,
          italic: false,
          align: 'left',
          width: 84
        },
        {
          id: `elem-sw-${Date.now()}-4`,
          type: 'text',
          content: 'Complete detail summary explaining spreadsheet or report links here inside the presentation frame container.',
          x: 8,
          y: 60,
          fontSize: 12,
          color: color + 'bb',
          fontFamily: 'sans',
          bold: false,
          italic: false,
          align: 'left',
          width: 84
        }
      ];
    } else if (preset === 'split') {
      freshItems = [
        {
          id: `elem-sw-${Date.now()}-1`,
          type: 'heading',
          content: 'Comparative Layout Structure',
          x: 10,
          y: 12,
          fontSize: 22,
          color: color,
          fontFamily: 'sans',
          bold: true,
          italic: false,
          align: 'center',
          width: 80
        },
        {
          id: `elem-sw-${Date.now()}-2`,
          type: 'subheading',
          content: 'First Comparative Column',
          x: 8,
          y: 30,
          fontSize: 15,
          color: color,
          fontFamily: 'sans',
          bold: true,
          italic: false,
          align: 'left',
          width: 40
        },
        {
          id: `elem-sw-${Date.now()}-3`,
          type: 'text',
          content: 'Detailed parameters of alternative paths. High speed, fully client-secured compilations keeping zero data transfer hazards.',
          x: 8,
          y: 45,
          fontSize: 12,
          color: color,
          fontFamily: 'sans',
          bold: false,
          italic: false,
          align: 'left',
          width: 40
        },
        {
          id: `elem-sw-${Date.now()}-4`,
          type: 'subheading',
          content: 'Second Comparative Column',
          x: 52,
          y: 30,
          fontSize: 15,
          color: color,
          fontFamily: 'sans',
          bold: true,
          italic: false,
          align: 'left',
          width: 40
        },
        {
          id: `elem-sw-${Date.now()}-5`,
          type: 'text',
          content: 'Secondary comparative criteria explaining database modular structures, sandboxed storage configurations.',
          x: 52,
          y: 45,
          fontSize: 12,
          color: color,
          fontFamily: 'sans',
          bold: false,
          italic: false,
          align: 'left',
          width: 40
        }
      ];
    }

    activeSlide.elements = freshItems;
    setSlides(updatedSlides);
    setActiveElementId(null);
    setSuccessMsg('Updated whole slide to selected layout outline');
  };

  // Drag handles for manually positioning elements in Slide Canvas edit zone
  const [isDraggingElement, setIsDraggingElement] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const startDragElement = (e: React.MouseEvent, elemId: string, currentX: number, currentY: number) => {
    e.stopPropagation();
    setActiveElementId(elemId);
    setIsDraggingElement(true);
    
    const editorBounds = document.getElementById('slide-master-editor-surface')?.getBoundingClientRect();
    if (!editorBounds) return;

    // Relative click calculation
    const clickX = e.clientX - editorBounds.left;
    const clickY = e.clientY - editorBounds.top;

    const currentXpixels = (currentX / 100) * editorBounds.width;
    const currentYpixels = (currentY / 100) * editorBounds.height;

    setDragOffset({
      x: clickX - currentXpixels,
      y: clickY - currentYpixels
    });
  };

  const onDragMoving = (e: React.MouseEvent) => {
    if (!isDraggingElement || !activeElementId) return;
    
    const editorBounds = document.getElementById('slide-master-editor-surface')?.getBoundingClientRect();
    if (!editorBounds) return;

    const movingX = e.clientX - editorBounds.left - dragOffset.x;
    const movingY = e.clientY - editorBounds.top - dragOffset.y;

    // Bound values in percentages
    const pctX = Math.max(0, Math.min(95, (movingX / editorBounds.width) * 100));
    const pctY = Math.max(0, Math.min(95, (movingY / editorBounds.height) * 100));

    handleUpdateElementAttr(activeElementId, 'x', Math.round(pctX));
    handleUpdateElementAttr(activeElementId, 'y', Math.round(pctY));
  };

  const stopDraggingElement = () => {
    setIsDraggingElement(false);
  };

  // Launch presentation mode triggers
  const launchPresentationSlideshow = (startFromIndex: number = 0) => {
    setIsPresenting(true);
    setPresentSlideIdx(startFromIndex);
    setPresentationTransition(false);
    resetSpeechTimer();
    setSpeechTimerActive(true);
  };

  const exitPresentationMode = () => {
    setIsPresenting(false);
    setSpeechTimerActive(false);
    setLaserPointerActive(false);
  };

  const goToNextPresentSlide = () => {
    if (presentSlideIdx >= slides.length - 1) {
      // Confetti celebration on completion of deck presentation slides!
      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.6 }
      });
      exitPresentationMode();
      setSuccessMsg('Presentation Completed Successfully!');
      return;
    }
    setPresentationTransition(true);
    setTimeout(() => {
      setPresentSlideIdx(presentSlideIdx + 1);
      setPresentationTransition(false);
    }, 150);
  };

  const goToPrevPresentSlide = () => {
    if (presentSlideIdx <= 0) return;
    setPresentationTransition(true);
    setTimeout(() => {
      setPresentSlideIdx(presentSlideIdx - 1);
      setPresentationTransition(false);
    }, 150);
  };

  // Laser Pointer simulator on slide stage
  const handlePresentationMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!laserPointerActive) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top
    });
  };

  // Export slides deck as custom self-contained presentation HTML file
  // This exported file features responsiveness, full style, dynamic slide navigation buttons, and is 100% playable offline!
  const handleExportDeckToHtml = () => {
    const slideJson = JSON.stringify(slides, null, 2);
    
    // Inject slides rendering loop directly in independent static html
    const compiledSlidesHtml = slides.map((slide, idx) => {
      const gradientStyle = slide.backgroundGradient ? `background: ${slide.backgroundGradient};` : `background-color: ${slide.backgroundColor};`;
      const transitionClass = slide.transition === 'slide' ? 'slide-anim' : slide.transition === 'zoom' ? 'zoom-anim' : 'fade-anim';
      
      return `
        <div class="slide ${idx === 0 ? 'active' : ''} ${transitionClass}" style="${gradientStyle} color: ${slide.textColor};" id="slide-${idx}">
          <div class="slide-content-wrapper">
            ${slide.elements.map((el) => {
              if (el.type === 'shape') {
                const shapeStyle = el.shapeStyle ? `background-color: ${el.shapeStyle.fill}; border: ${el.shapeStyle.strokeWidth}px solid ${el.shapeStyle.stroke}; border-radius: ${el.shapeStyle.rx || 0}px;` : '';
                return `
                  <div class="element shape-item" style="left: ${el.x}%; top: ${el.y}%; width: ${el.width}%; ${shapeStyle} color: ${el.color}; size: ${el.fontSize}pt; font-family: ${el.fontFamily}; text-align: ${el.align}; font-weight: ${el.bold ? 'bold' : 'normal'}; font-style: ${el.italic ? 'italic' : 'normal'};">
                    ${el.content}
                  </div>
                `;
              }
              const fontStyle = `font-family: ${el.fontFamily === 'serif' ? 'Georgia, serif' : el.fontFamily === 'mono' ? 'Courier, monospace' : 'Arial, sans'}`;
              const textStyle = `font-size: ${el.fontSize}pt; color: ${el.color}; font-weight: ${el.bold ? 'bold' : 'normal'}; font-style: ${el.italic ? 'italic' : 'normal'}; text-align: ${el.align};`;
              return `
                <div class="element text-item" style="left: ${el.x}%; top: ${el.y}%; width: ${el.width}%; ${fontStyle} ${textStyle}">
                  ${el.content}
                </div>
              `;
            }).join('')}
          </div>
          <div class="footer-index">Page ${idx + 1} of ${slides.length}</div>
        </div>
      `;
    }).join('');

    const htmlOutput = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${deckTitle} - DPLK PowerPoint Slides</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body, html { width: 100%; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; overflow: hidden; background: #0b0f19; }
    
    #presentation-stage {
      width: 100vw;
      height: 100vh;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .slide {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }

    .slide.active {
      display: flex;
    }

    .slide-content-wrapper {
      position: relative;
      width: 100%;
      max-width: 960px;
      height: 100%;
      max-height: 540px;
      aspect-ratio: 16/9;
    }

    .element {
      position: absolute;
      word-wrap: break-word;
    }

    .shape-item {
      padding: 12px 20px;
    }

    /* Transition Animations */
    .fade-anim { animation: fadeIn 0.4s ease-in-out; }
    .slide-anim { animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    .zoom-anim { animation: zoomIn 0.4s ease-out; }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    @keyframes zoomIn {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    /* Controls bar overlays */
    #slides-nav-bar {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(255,255,255,0.1);
      backdrop-filter: blur(8px);
      border-radius: 9999px;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 16px;
      z-index: 9999;
      color: #fff;
    }

    .nav-btn {
      background: rgba(255,255,255,0.1);
      border: none;
      color: white;
      padding: 6px 14px;
      border-radius: 9999px;
      cursor: pointer;
      font-size: 13px;
      font-weight: bold;
      transition: background 0.2s;
    }
    .nav-btn:hover {
      background: rgba(255,255,255,0.25);
    }

    #progress-indicator {
      font-size: 11px;
      font-family: monospace;
      color: #94a3b8;
    }

    .footer-index {
      position: absolute;
      bottom: 24px;
      right: 24px;
      font-size: 12px;
      opacity: 0.5;
    }

    #deck-title-stamp {
      position: absolute;
      top: 24px;
      left: 24px;
      font-size: 13px;
      font-weight: bold;
      opacity: 0.65;
    }

    /* Laser pointer styles */
    #laser-pointer {
      position: absolute;
      width: 14px;
      height: 14px;
      background: #ef4444;
      border-radius: 50%;
      box-shadow: 0 0 20px 8px #ef4444;
      pointer-events: none;
      display: none;
      z-index: 10000;
    }
    body.laser-on {
      cursor: none;
    }
    body.laser-on #laser-pointer {
      display: block;
    }

    #laser-toggle {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid #ef4444;
      color: #fca5a5;
    }

    /* Print styling rules */
    @media print {
      body, html { overflow: visible; height: auto; background: white; }
      #slides-nav-bar { display: none !important; }
      .slide {
        position: relative !important;
        display: block !important;
        page-break-after: always !important;
        height: 100vh !important;
        width: 100vw !important;
        border: none !important;
      }
    }
  </style>
</head>
<body>
  
  <div id="deck-title-stamp">${deckTitle}</div>

  <div id="presentation-stage">
    ${compiledSlidesHtml}
    <div id="laser-pointer"></div>
  </div>

  <div id="slides-nav-bar">
    <button class="nav-btn" onclick="goToPrevSlide()">&larr; Back</button>
    <div id="progress-indicator">Slide 1 of ${slides.length}</div>
    <button class="nav-btn" onclick="goToNextSlide()">Next &rarr;</button>
    <button class="nav-btn" id="laser-toggle" onclick="toggleLaserPointer()">Laser Pointer</button>
  </div>

  <script>
    let currentIdx = 0;
    const totalSlides = ${slides.length};
    const slidesList = document.querySelectorAll('.slide');
    const indicator = document.getElementById('progress-indicator');
    const laserObj = document.getElementById('laser-pointer');

    function updateNav() {
      slidesList.forEach((s, i) => s.classList.toggle('active', i === currentIdx));
      indicator.innerText = "Slide " + (currentIdx + 1) + " of " + totalSlides;
    }

    function goToNextSlide() {
      if (currentIdx < totalSlides - 1) {
        currentIdx++;
        updateNav();
      }
    }

    function goToPrevSlide() {
      if (currentIdx > 0) {
        currentIdx--;
        updateNav();
      }
    }

    function toggleLaserPointer() {
      document.body.classList.toggle('laser-on');
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') goToNextSlide();
      if (e.key === 'ArrowLeft' || e.key === 'Backspace') goToPrevSlide();
    });

    document.addEventListener('mousemove', (e) => {
      if (document.body.classList.contains('laser-on')) {
        laserObj.style.left = e.clientX - 7 + 'px';
        laserObj.style.top = e.clientY - 7 + 'px';
      }
    });
  </script>
</body>
</html>
    `;

    // Download compiled DOM to system folder
    const blob = new Blob([htmlOutput], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = `${deckTitle.replace(/\s+/g, '_')}_Presentation.html`;
    downloadAnchor.click();

    setSuccessMsg('Exported standalone HTML file to download directory');
    confetti({
      particleCount: 110,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  // Convert presentation payload to JSON config
  const handleExportDeckToJson = () => {
    const payload = {
      title: deckTitle,
      savedAt: new Date().toISOString(),
      slides: slides
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deckTitle.replace(/\s+/g, '_')}_config.json`;
    a.click();

    setSuccessMsg('Config layout saved as JSON file.');
  };

  // Import existing presentations config (.json) or real powerpoint presentation (.pptx)
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.pptx')) {
      const r = new FileReader();
      r.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const zip = await JSZip.loadAsync(arrayBuffer);
          
          // 1. Read slide dimensions first or assume standard 16:9 widescreen (12,192,000 x 6,858,000 EMUs)
          let slideWidth = 12192000;
          let slideHeight = 6858000;
          
          const presRel = zip.file("ppt/presentation.xml");
          if (presRel) {
            const presXmlText = await presRel.async("text");
            const parser = new DOMParser();
            const presDoc = parser.parseFromString(presXmlText, "application/xml");
            const sldSz = findFirstElementByLocalName(presDoc, "sldSz");
            if (sldSz) {
              const cxAttr = sldSz.getAttribute("cx");
              const cyAttr = sldSz.getAttribute("cy");
              if (cxAttr && cyAttr) {
                slideWidth = parseInt(cxAttr, 10) || 12192000;
                slideHeight = parseInt(cyAttr, 10) || 6858000;
              }
            }
          }
          
          // 2. Discover slide XML files inside ppt/slides/
          const slideFiles = Object.keys(zip.files).filter((path) => 
            path.startsWith("ppt/slides/slide") && path.endsWith(".xml")
          );
          
          if (slideFiles.length === 0) {
            throw new Error("Could not find any slide xml layout files inside this PowerPoint presentation.");
          }
          
          // Sort slide numbers numerically correctly e.g., slide1.xml, slide2.xml... slide10.xml
          slideFiles.sort((a, b) => {
            const numA = parseInt(a.replace(/[^\d]/g, ""), 10) || 0;
            const numB = parseInt(b.replace(/[^\d]/g, ""), 10) || 0;
            return numA - numB;
          });
          
          const parsedSlides: Slide[] = [];
          
          for (let i = 0; i < slideFiles.length; i++) {
            const path = slideFiles[i];
            const slideXmlText = await zip.files[path].async("text");
            const parser = new DOMParser();
            const slideDoc = parser.parseFromString(slideXmlText, "application/xml");
            
            // Standard background color extraction
            let bgHex = "#ffffff";
            let textHex = "#1e293b";
            
            const bg = findFirstElementByLocalName(slideDoc, "bg");
            if (bg) {
              const solidFill = findFirstElementByLocalName(bg, "solidFill");
              if (solidFill) {
                const srgbClr = findFirstElementByLocalName(solidFill, "srgbClr");
                if (srgbClr) {
                  const val = srgbClr.getAttribute("val");
                  if (val) bgHex = "#" + val;
                }
              }
            }
            
            // Brightness check for high contrast text color fallback
            const cleanHex = bgHex.replace("#", "");
            if (cleanHex.length === 6) {
              const rv = parseInt(cleanHex.substring(0, 2), 16);
              const gv = parseInt(cleanHex.substring(2, 4), 16);
              const bv = parseInt(cleanHex.substring(4, 6), 16);
              const brightness = (rv * 299 + gv * 587 + bv * 114) / 1000;
              textHex = brightness > 128 ? "#1e293b" : "#f8fafc";
            }
            
            const elements: SlideElement[] = [];
            const shapes = findElementsByLocalName(slideDoc, "sp");
            
            shapes.forEach((shape, idx) => {
              const xfrm = findFirstElementByLocalName(shape, "xfrm");
              if (!xfrm) return;
              
              const off = findFirstElementByLocalName(xfrm, "off");
              const ext = findFirstElementByLocalName(xfrm, "ext");
              if (!off || !ext) return;
              
              const xEmu = parseInt(off.getAttribute("x") || "0", 10);
              const yEmu = parseInt(off.getAttribute("y") || "0", 10);
              const cxEmu = parseInt(ext.getAttribute("cx") || "100", 10);
              const cyEmu = parseInt(ext.getAttribute("cy") || "100", 10);
              
              // Map EMUs to relative percentage coordinates
              const xPercent = Math.round((xEmu / slideWidth) * 100);
              const yPercent = Math.round((yEmu / slideHeight) * 100);
              const widthPercent = Math.round((cxEmu / slideWidth) * 100);
              
              // Traverse paragraphs and runs
              const paragraphs = findElementsByLocalName(shape, "p");
              let textRuns: string[] = [];
              let isBold = false;
              let isItalic = false;
              let align: 'left' | 'center' | 'right' = 'left';
              let fontSizePt = 14;
              let fontColor = textHex;
              let fontFamily: SlideElement['fontFamily'] = 'sans';
              
              paragraphs.forEach((p) => {
                const pPr = findFirstElementByLocalName(p, "pPr");
                if (pPr) {
                  const algnAttr = pPr.getAttribute("algn");
                  if (algnAttr === "ctr") align = "center";
                  else if (algnAttr === "r") align = "right";
                }
                
                const runs = findElementsByLocalName(p, "r");
                runs.forEach((r) => {
                  const rPr = findFirstElementByLocalName(r, "rPr");
                  if (rPr) {
                    if (rPr.getAttribute("b") === "1") isBold = true;
                    if (rPr.getAttribute("i") === "1") isItalic = true;
                    
                    const szAttr = rPr.getAttribute("sz");
                    if (szAttr) {
                      fontSizePt = Math.round(parseInt(szAttr, 10) / 100);
                    }
                    
                    const solidFillPr = findFirstElementByLocalName(rPr, "solidFill");
                    if (solidFillPr) {
                      const srgbClr = findFirstElementByLocalName(solidFillPr, "srgbClr");
                      if (srgbClr) {
                        const valAttr = srgbClr.getAttribute("val");
                        if (valAttr) fontColor = "#" + valAttr;
                      }
                    }
                    
                    const latin = findFirstElementByLocalName(rPr, "latin");
                    if (latin) {
                      const typeface = latin.getAttribute("typeface")?.toLowerCase();
                      if (typeface) {
                        if (typeface.includes("georgia") || typeface.includes("times") || typeface.includes("serif")) {
                          fontFamily = 'serif';
                        } else if (typeface.includes("courier") || typeface.includes("consolas") || typeface.includes("mono")) {
                          fontFamily = 'mono';
                        }
                      }
                    }
                  }
                  
                  const t = findFirstElementByLocalName(r, "t");
                  if (t && t.textContent) {
                    textRuns.push(t.textContent);
                  }
                });
                
                // Fallback custom fields txt
                const flds = findElementsByLocalName(p, "fld");
                flds.forEach((fld) => {
                  const t = findFirstElementByLocalName(fld, "t");
                  if (t && t.textContent) {
                    textRuns.push(t.textContent);
                  }
                });
              });
              
              let fullText = textRuns.join("").trim();
              if (!fullText) {
                const generalText = findFirstElementByLocalName(shape, "t");
                if (generalText && generalText.textContent) {
                  fullText = generalText.textContent.trim();
                }
              }
              
              const spPr = findFirstElementByLocalName(shape, "spPr");
              const prstGeom = spPr ? findFirstElementByLocalName(spPr, "prstGeom") : null;
              
              let shapeType: SlideElement['shapeType'] = undefined;
              let hasShapeGeometry = false;
              
              if (prstGeom) {
                const prstName = prstGeom.getAttribute("prst");
                if (prstName) {
                  hasShapeGeometry = true;
                  if (prstName === "rect" || prstName === "roundRect") shapeType = "rectangle";
                  else if (prstName === "ellipse" || prstName === "circle") shapeType = "circle";
                  else if (prstName === "triangle") shapeType = "triangle";
                  else shapeType = "rectangle";
                }
              }
              
              if (!fullText && !hasShapeGeometry) return;
              
              let elementType: SlideElement['type'] = 'text';
              if (hasShapeGeometry) {
                elementType = 'shape';
              } else if (fontSizePt >= 28) {
                elementType = 'heading';
              } else if (fontSizePt >= 18) {
                elementType = 'subheading';
              } else if (fullText.startsWith("•") || fullText.startsWith("-")) {
                elementType = 'bullet';
              }
              
              elements.push({
                id: `imported-elem-${Date.now()}-${idx}-${Math.random()}`,
                type: elementType,
                content: fullText || "Shape",
                x: Math.max(0, Math.min(xPercent, 95)),
                y: Math.max(0, Math.min(yPercent, 95)),
                width: Math.max(10, Math.min(widthPercent, 100)),
                fontSize: fontSizePt || 14,
                color: fontColor,
                fontFamily: fontFamily,
                bold: isBold,
                italic: isItalic,
                align: align,
                shapeType: shapeType,
                shapeStyle: hasShapeGeometry ? {
                  fill: shapeType === 'rectangle' ? '#eff6ff' : '#3b82f622',
                  stroke: '#3b82f6',
                  strokeWidth: 2,
                  rx: shapeType === 'rectangle' ? 8 : undefined
                } : undefined
              });
            });
            
            if (elements.length === 0) {
              elements.push({
                id: `imported-empty-${Date.now()}-${i}`,
                type: 'heading',
                content: `Slide ${i + 1}`,
                x: 10,
                y: 40,
                width: 80,
                fontSize: 32,
                color: textHex,
                fontFamily: 'sans',
                bold: true,
                italic: false,
                align: 'center'
              });
            }
            
            parsedSlides.push({
              id: `imported-slide-${Date.now()}-${i}`,
              backgroundColor: bgHex,
              textColor: textHex,
              transition: 'fade',
              elements: elements
            });
          }
          
          setSlides(parsedSlides);
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
          setDeckTitle(nameWithoutExt);
          setActiveSlideIdx(0);
          setActiveElementId(null);
          setSuccessMsg(`Successfully imported ${parsedSlides.length} slides from "${file.name}"!`);
          confetti({ particleCount: 100, spread: 60 });
        } catch (err: any) {
          console.error(err);
          setErrorMsg("Error parsing PPTX presentation: " + (err.message || "Invalid structure."));
          setTimeout(() => setErrorMsg(null), 5000);
        }
      };
      r.readAsArrayBuffer(file);
    } else if (file.name.endsWith('.json')) {
      const r = new FileReader();
      r.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && Array.isArray(parsed.slides)) {
            setSlides(parsed.slides);
            if (parsed.title) setDocTitle(parsed.title);
            setActiveSlideIdx(0);
            setActiveElementId(null);
            setSuccessMsg('Restored client slide-deck config successfully.');
            confetti({ particleCount: 80, spread: 50 });
          } else {
            throw new Error('Unsupported JSON format. Check file structure.');
          }
        } catch (err: any) {
          setErrorMsg('Import error: ' + (err.message || 'Malformed layout file.'));
          setTimeout(() => setErrorMsg(null), 4000);
        }
      };
      r.readAsText(file);
    } else {
      setErrorMsg("Unsupported file type. Please upload a .json presentation or a real PowerPoint (.pptx) file.");
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const triggerImportClick = () => {
    importInputRef.current?.click();
  };

  const setDocTitle = (val: string) => {
    setDeckTitle(val);
  };

  return (
    <div className="bg-slate-900/5 dark:bg-slate-950 min-h-screen pb-16 relative font-sans" id="powerpoint-tool-root">
      
      {/* Top Main Navigation Strip bar */}
      <div className="bg-slate-900 text-white py-3 px-4 sm:px-6 shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 px-3 hover:bg-slate-800 rounded-lg flex items-center gap-2 text-slate-300 hover:text-white transition text-xs font-bold shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>DPLK Tools Hub</span>
            </button>
            <div className="h-5 w-[1px] bg-slate-700"></div>
            
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="bg-amber-500 p-1.5 rounded-lg">
                <Presentation className="h-4 w-4 text-slate-950" />
              </div>
              <input
                type="text"
                value={deckTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="bg-transparent border-b border-dashed border-slate-600 hover:border-amber-400 focus:border-amber-400 focus:outline-none text-white text-sm font-bold font-sans py-0.5 px-1 w-44 sm:w-60 transition"
                placeholder="Deck Title name"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Import / Export action bar elements */}
            <button
              type="button"
              onClick={triggerImportClick}
              className="p-1.5 px-2.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition text-xs flex items-center gap-1.5"
              title="Import PowerPoint Slide (.pptx) or Layouts JSON file"
            >
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Import PPTX / JSON</span>
              <input
                type="file"
                ref={importInputRef}
                accept=".json,.pptx"
                className="hidden"
                onChange={handleImportFile}
              />
            </button>

            <button
              type="button"
              onClick={handleExportDeckToJson}
              className="p-1.5 px-2.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition text-xs flex items-center gap-1.5"
              title="Save layout offline configurations as JSON"
            >
              <Save className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Save JSON Config</span>
            </button>

            <button
              type="button"
              onClick={handleExportDeckToHtml}
              className="p-1.5 px-3 bg-teal-600 hover:bg-teal-500 text-white transition text-xs rounded-lg flex items-center gap-1.5 shadow-sm font-semibold"
              title="Download fully playable interactive Presentation HTML package"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>Export HTML slide deck</span>
            </button>

            <button
              type="button"
              onClick={() => launchPresentationSlideshow(activeSlideIdx)}
              className="p-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 transition text-xs rounded-lg flex items-center gap-1.5 shadow-md font-bold"
              title="Start Play presenting model fullscreen mode"
            >
              <Play className="h-3.5 w-3.5 fill-slate-950" />
              <span>Present Deck</span>
            </button>
          </div>
        </div>
      </div>

      {/* Editor Sub-Header Tabs */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 z-10 print:hidden shadow-xs">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between overflow-x-auto gap-2">
          {/* Controls tabs choosing drawer menu panels */}
          <div className="flex gap-1 py-1">
            {[
              { id: 'slides', label: 'Slides Manager', icon: LayoutGrid },
              { id: 'insert', label: 'Insert Element', icon: Plus },
              { id: 'design', label: 'Design & Colors', icon: Palette },
              { id: 'transition', label: 'Slides Layout Presets', icon: Layout }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-3 sm:px-4 text-xs font-bold rounded-lg flex items-center gap-1.5 transition whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-amber-500/10 text-amber-900 dark:text-amber-400 border-b-2 border-amber-500' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 py-1.5 shrink-0">
            {/* View status bar info */}
            <div className="flex items-center bg-zinc-100 dark:bg-slate-800 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setZoomScale(Math.max(60, zoomScale - 10))}
                className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="text-[10px] font-mono font-semibold px-2 text-slate-600 dark:text-slate-300">
                {zoomScale}% Scale
              </span>
              <button
                type="button"
                onClick={() => setZoomScale(Math.min(150, zoomScale + 10))}
                className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              title="Help Manual and Tips"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Primary Workspace Panels grid */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        
        {/* Help Panel display drawer */}
        {showHelp && (
          <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-150 text-xs text-amber-950 shadow-sm animate-fade-in">
            <div className="flex justify-between items-center mb-2.5">
              <h4 className="font-bold flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-600 animate-pulse" />
                DPLK PowerPoint Editor Guide
              </h4>
              <button 
                type="button" 
                onClick={() => setShowHelp(false)} 
                className="text-amber-700 hover:text-amber-950 font-bold hover:underline"
              >
                Dismiss Mode
              </button>
            </div>
            <p className="leading-relaxed text-amber-900 mb-2">
              Our presentation engine allows offline slide construction natively in your client browser. Double-click any element to edit content, click the drag points on elements to freely position layout configurations on cards, and tweak backgrounds with gradients to make amazing slide decks.
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] list-disc list-inside text-amber-800">
              <li><strong>Interactive presentation mode</strong> has beautiful smooth transitions, timing clock, and simulation laser pointer overlays.</li>
              <li><strong>HTML Presentation export</strong> results in dynamic slideshow static packs containing full-fidelity styled scripts.</li>
              <li><strong>Offline saving formats</strong> allows saving to systems directories natively without complex external backend databases.</li>
            </ul>
          </div>
        )}

        {/* Action responses widgets */}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-100 rounded-xl text-emerald-950 text-xs border border-emerald-200 flex items-center gap-2 animate-fade-in shadow-xs">
            <Check className="h-4 w-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-150 rounded-xl text-red-950 text-xs border border-red-200 flex items-center gap-2 animate-fade-in shadow-xs">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Master grid viewport panels */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* SLIDE DECK LEFT BAR PANEL (or chosen Navigation Tab Drawer Option) */}
          <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            
            {/* Header description of selected tab toolbar */}
            <div className="bg-slate-50 border-b border-gray-100 px-4 py-2.5 flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
              {activeTab === 'slides' && (
                <>
                  <span className="text-slate-800">Slides Deck List ({slides.length})</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddNewSlide('blank')}
                      className="p-1 px-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-md transition font-bold text-[10px] flex items-center gap-1 shrink-0"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Blank Slide</span>
                    </button>
                  </div>
                </>
              )}
              {activeTab === 'insert' && <span className="text-slate-800">Insert Elements Panel</span>}
              {activeTab === 'design' && <span className="text-slate-800">Design Backgrounds Theme</span>}
              {activeTab === 'transition' && <span className="text-slate-800">Predefined Slide Outline layouts</span>}
            </div>

            {/* TAB CONTENT DRAWER PANEL */}
            <div className="p-4 flex-1 overflow-y-auto max-h-[550px]">
              
              {/* TAB 1: SLIDES LIST (with Rearrange drag indexes) */}
              {activeTab === 'slides' && (
                <div className="flex flex-col gap-3">
                  {slides.map((slide, idx) => {
                    const isActive = idx === activeSlideIdx;
                    return (
                      <div
                        key={slide.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={(e) => handleDrop(e, idx)}
                        onClick={() => { setActiveSlideIdx(idx); setActiveElementId(null); }}
                        className={`group border rounded-xl p-2.5 cursor-pointer transition select-none flex gap-3 relative overflow-hidden ${
                          isActive 
                            ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500' 
                            : 'border-slate-200 hover:border-slate-350 bg-white'
                        }`}
                      >
                        {/* Slide numbered index */}
                        <div className="flex flex-col items-center justify-center font-mono text-[11px] font-bold text-slate-400 bg-slate-100 rounded-lg w-8 h-8 shrink-0">
                          {idx + 1}
                        </div>

                        {/* Slide Tiny Thumbnail Preview representation */}
                        <div 
                          className="flex-1 rounded-md border border-slate-300 h-10 relative overflow-hidden flex flex-col justify-center px-2 py-1 select-none pointer-events-none text-[8px] opacity-75"
                          style={{ 
                            background: slide.backgroundGradient ? slide.backgroundGradient : slide.backgroundColor,
                            color: slide.textColor
                          }}
                        >
                          <div className="font-bold truncate max-w-[120px]">
                            {slide.elements.find(el => el.type === 'heading')?.content || 'Untranslated slide'}
                          </div>
                          <div className="text-[7px] truncate max-w-[120px] opacity-80 mt-0.5">
                            {slide.elements.find(el => el.type === 'subheading')?.content || 'Empty deck text details'}
                          </div>
                        </div>

                        {/* Action buttons list in list row overlay */}
                        <div className="flex flex-col sm:flex-row items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition duration-150">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleMoveSlide(idx, 'up'); }}
                            className="p-1 hover:bg-slate-150 rounded text-slate-500 hover:text-slate-800"
                            disabled={idx === 0}
                            title="Rearrange slide up"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleMoveSlide(idx, 'down'); }}
                            className="p-1 hover:bg-slate-150 rounded text-slate-500 hover:text-slate-800"
                            disabled={idx === slides.length - 1}
                            title="Rearrange slide down"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDuplicateSlide(idx); }}
                            className="p-1 hover:bg-slate-150 rounded text-slate-500 hover:text-slate-800"
                            title="Duplicate layout"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteSlide(idx); }}
                            className="p-1 hover:bg-slate-150 rounded text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Delete slide"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <div className="border-t border-slate-150 pt-4 mt-2">
                    <span className="text-[10px] text-slate-400 block mb-2 uppercase font-mono tracking-wider">Quick Layout Inserts:</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddNewSlide('title')}
                        className="p-2 border border-slate-200 hover:border-amber-400 bg-white font-medium hover:bg-amber-50 rounded-xl text-left text-[11px] text-slate-700 transition"
                      >
                        Add Cover slide
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddNewSlide('content')}
                        className="p-2 border border-slate-200 hover:border-amber-400 bg-white font-medium hover:bg-amber-50 rounded-xl text-left text-[11px] text-slate-700 transition"
                      >
                        Add Topic layout
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddNewSlide('split')}
                        className="p-2 border border-slate-200 hover:border-amber-400 bg-white font-medium hover:bg-amber-50 rounded-xl text-left text-[11px] text-slate-700 transition col-span-2"
                      >
                        Add Comparative Split Columns
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: INSERT ELEMENTS CONTROLS */}
              {activeTab === 'insert' && (
                <div className="flex flex-col gap-4">
                  
                  {/* Text Layer Types Presets */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">1. Rich Text Blocks</span>
                    <div className="grid grid-cols-1 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleAddTextElement('heading')}
                        className="p-2 border border-slate-250 hover:border-amber-500 text-left bg-white text-slate-800 text-xs font-bold rounded-xl hover:bg-amber-50 transition flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Type className="h-4 w-4 text-amber-600" />
                          <span>Main Layout Title Heading</span>
                        </div>
                        <span className="text-[10px] font-mono font-semibold bg-gray-100 text-slate-500 px-1.5 py-0.2 rounded">Pt 26</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddTextElement('subheading')}
                        className="p-2 border border-slate-250 hover:border-amber-500 text-left bg-white text-slate-800 text-xs font-semibold rounded-xl hover:bg-amber-50 transition flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Type className="h-4 w-4 text-sky-600" />
                          <span>Corporate Subheading</span>
                        </div>
                        <span className="text-[10px] font-mono font-semibold bg-gray-100 text-slate-500 px-1.5 py-0.2 rounded">Pt 15</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddTextElement('bullet')}
                        className="p-2 border border-slate-250 hover:border-amber-500 text-left bg-white text-slate-800 text-xs rounded-xl hover:bg-amber-50 transition flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <List className="h-4 w-4 text-emerald-600" />
                          <span>Bullet Point Line</span>
                        </div>
                        <span className="text-[10px] font-mono font-semibold bg-gray-100 text-slate-500 px-1.5 py-0.2 rounded">Pt 12</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddTextElement('text')}
                        className="p-2 border border-slate-250 hover:border-amber-500 text-left bg-white text-slate-700 text-xs rounded-xl hover:bg-amber-50 transition flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-500" />
                          <span>Paragraph Description Block</span>
                        </div>
                        <span className="text-[10px] font-mono font-semibold bg-gray-100 text-slate-500 px-1.5 py-0.2 rounded">Pt 11</span>
                      </button>
                    </div>
                  </div>

                  {/* Aesthetic Geometric Shapes inserters */}
                  <div className="border-t border-slate-100 pt-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2.5">2. PowerPoint Shapes & Indicators</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddShapeElement('rectangle')}
                        className="p-2 bg-slate-50 border border-slate-200 hover:border-amber-400 hover:bg-white rounded-xl text-center text-xs text-slate-700 flex flex-col items-center gap-1.5 transition"
                      >
                        <Square className="h-6 w-6 text-indigo-600 shrink-0" />
                        <span className="font-semibold">Rounded Card</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddShapeElement('circle')}
                        className="p-2 bg-slate-50 border border-slate-200 hover:border-amber-400 hover:bg-white rounded-xl text-center text-xs text-slate-700 flex flex-col items-center gap-1.5 transition"
                      >
                        <Circle className="h-6 w-6 text-indigo-600" />
                        <span className="font-semibold">Pill Circle</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddShapeElement('quote')}
                        className="p-2 bg-slate-50 border border-slate-200 hover:border-amber-400 hover:bg-white rounded-xl text-center text-xs text-slate-700 flex flex-col items-center gap-1.5 transition col-span-2"
                      >
                        <div className="text-xl font-serif text-teal-600 block line-none">&ldquo;&rdquo;</div>
                        <span className="font-bold">Decorative Callout Box</span>
                      </button>
                    </div>
                  </div>

                  {/* Drag drop guidelines tooltip bar */}
                  <div className="border-t border-slate-100 pt-3.5 bg-amber-500/10 p-3 rounded-xl text-[10px] text-amber-900 flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Arranging layouts:</strong> Selected items inside the editor can be dragged freely to any pixel alignment coordinates.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 3: DESIGN THEMES CONTROLS */}
              {activeTab === 'design' && (
                <div className="flex flex-col gap-4">
                  
                  {/* Preset Gradients */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Slide Layout Palette Theme:</span>
                    <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">Choose from curated color designs to format backgrounds, card layouts, and element typography colors immediately.</p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {themeGradients.map((theme) => {
                        return (
                          <button
                            key={theme.name}
                            type="button"
                            onClick={() => handleApplySlideBackgroundPreset(theme)}
                            className="p-2 rounded-xl border border-slate-200 hover:border-amber-500 bg-white text-left transition relative flex flex-col justify-between h-20 overflow-hidden"
                          >
                            <div 
                              className="absolute inset-0 pointer-events-none opacity-90"
                              style={{ background: theme.gradient ? theme.gradient : theme.bg }}
                            />
                            <div className="relative z-10 w-full flex flex-col justify-between h-full select-none">
                              <span 
                                className="font-bold text-[10px] px-1 py-0.2 rounded-sm max-w-min whitespace-nowrap"
                                style={{ color: theme.text, backgroundColor: theme.text + '22' }}
                              >
                                {theme.name}
                              </span>
                              <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.text }} />
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.text + 'aa' }} />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Manual Theme Background input color pickers */}
                  <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Manual Background Tuning:</span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Canvas Hex:</label>
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1.5">
                          <input
                            type="color"
                            value={slides[activeSlideIdx]?.backgroundColor || '#ffffff'}
                            onChange={(e) => {
                              const updated = [...slides];
                              updated[activeSlideIdx].backgroundColor = e.target.value;
                              updated[activeSlideIdx].backgroundGradient = undefined; // override
                              setSlides(updated);
                            }}
                            className="w-5 h-5 border-none p-0 cursor-pointer rounded bg-transparent"
                          />
                          <span className="font-mono text-[9px] text-slate-600 truncate">{slides[activeSlideIdx]?.backgroundColor}</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Paragraph Text Hex:</label>
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1.5">
                          <input
                            type="color"
                            value={slides[activeSlideIdx]?.textColor || '#1e293b'}
                            onChange={(e) => {
                              const updated = [...slides];
                              updated[activeSlideIdx].textColor = e.target.value;
                              updated[activeSlideIdx].elements = updated[activeSlideIdx].elements.map(el => {
                                if (el.type !== 'shape') return { ...el, color: e.target.value };
                                return el;
                              });
                              setSlides(updated);
                            }}
                            className="w-5 h-5 border-none p-0 cursor-pointer rounded bg-transparent"
                          />
                          <span className="font-mono text-[9px] text-slate-600 truncate">{slides[activeSlideIdx]?.textColor}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: TRANSITION OUTLINES CONTROLS */}
              {activeTab === 'transition' && (
                <div className="flex flex-col gap-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Transform Active Slide Outline</span>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Select a predefined outline below to instantly structure your active slide elements. Warning: choosing a preset will sweep original overlays.
                  </p>

                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSwapSlideLayoutStructure('title')}
                      className="p-3 border border-slate-200 bg-white hover:border-amber-500 hover:bg-amber-50 rounded-xl transition text-left"
                    >
                      <h5 className="font-bold text-xs text-slate-800 mb-0.5">Big Title & Tagline Cover</h5>
                      <p className="text-[10px] text-slate-400">Centers a hero heading and elegant secondary descriptor citation block on the slide page.</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSwapSlideLayoutStructure('content')}
                      className="p-3 border border-slate-200 bg-white hover:border-amber-500 hover:bg-amber-50 rounded-xl transition text-left"
                    >
                      <h5 className="font-bold text-xs text-slate-800 mb-0.5">Headline + Core Bullet Points list</h5>
                      <p className="text-[10px] text-slate-400">Standard operational layout with subtitle alignment blocks, numbered listings, and a notes footer.</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSwapSlideLayoutStructure('split')}
                      className="p-3 border border-slate-200 bg-white hover:border-amber-500 hover:bg-amber-50 rounded-xl transition text-left"
                    >
                      <h5 className="font-bold text-xs text-slate-800 mb-0.5">Comparison Two Columns Division</h5>
                      <p className="text-[10px] text-slate-400">Splits content areas left-and-right to compare features, values, metrics, or financial balances.</p>
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Selected Element Style Editor Row if any element is active */}
            {activeElementId && slides[activeSlideIdx] && (
              <div className="bg-slate-50 border-t border-slate-200 p-4 animate-fade-in flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">Format Element Properties:</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveElement(activeElementId)}
                    className="p-1 px-2 text-[10px] text-red-600 font-bold bg-white rounded-md border border-red-200 hover:bg-red-50 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Delete Layer</span>
                  </button>
                </div>

                {/* Content Input Fields */}
                <div>
                  <label className="text-[9px] text-slate-400 font-semibold block mb-0.5">Edit Text Content:</label>
                  <textarea
                    rows={2}
                    value={slides[activeSlideIdx].elements.find(el => el.id === activeElementId)?.content || ''}
                    onChange={(e) => handleUpdateElementAttr(activeElementId, 'content', e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs font-sans focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Text Formatting buttons */}
                {(() => {
                  const activeEl = slides[activeSlideIdx]?.elements.find(el => el.id === activeElementId);
                  if (!activeEl) return null;

                  return (
                    <div className="flex flex-col gap-3">
                      {/* Typography, size, scale */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-slate-400 font-semibold block">Font Pt ({activeEl.fontSize}):</label>
                          <input
                            type="range"
                            min={9}
                            max={64}
                            value={activeEl.fontSize}
                            onChange={(e) => handleUpdateElementAttr(activeElementId, 'fontSize', parseInt(e.target.value, 10))}
                            className="w-full accent-amber-500 mt-1 cursor-pointer"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] text-slate-400 font-semibold block">Box Width ({activeEl.width}%):</label>
                          <input
                            type="range"
                            min={20}
                            max={100}
                            value={activeEl.width}
                            onChange={(e) => handleUpdateElementAttr(activeElementId, 'width', parseInt(e.target.value, 10))}
                            className="w-full accent-amber-500 mt-1 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2.5 items-center justify-between pt-1">
                        <div className="flex border border-slate-250 bg-white rounded-lg overflow-hidden shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateElementAttr(activeElementId, 'bold', !activeEl.bold)}
                            className={`p-1 px-1.5 text-xs font-bold transition-all ${activeEl.bold ? 'bg-amber-100 text-amber-900 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
                            title="Bold"
                          >
                            B
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateElementAttr(activeElementId, 'italic', !activeEl.italic)}
                            className={`p-1 px-1.5 text-xs italic transition-all ${activeEl.italic ? 'bg-amber-100 text-amber-900 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
                            title="Italic"
                          >
                            I
                          </button>
                        </div>

                        {/* Alignment buttons */}
                        <div className="flex border border-slate-250 bg-white rounded-lg overflow-hidden shrink-0">
                          {(['left', 'center', 'right'] as const).map((dir) => (
                            <button
                              key={dir}
                              type="button"
                              onClick={() => handleUpdateElementAttr(activeElementId, 'align', dir)}
                              className={`p-1 px-2 text-xs transition-all uppercase font-mono ${activeEl.align === dir ? 'bg-amber-100 text-amber-900 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                              {dir[0]}
                            </button>
                          ))}
                        </div>

                        {/* Font Fam switch */}
                        <select
                          value={activeEl.fontFamily}
                          onChange={(e) => handleUpdateElementAttr(activeElementId, 'fontFamily', e.target.value)}
                          className="bg-white border border-slate-250 rounded-lg p-1 text-xs focus:outline-none text-slate-600 font-medium scale-95"
                        >
                          <option value="sans">Sans-serif</option>
                          <option value="serif">Times Serif</option>
                          <option value="mono">JetBrains Mono</option>
                        </select>
                      </div>

                      {/* Element specific custom color */}
                      <div className="flex items-center justify-between border-t border-slate-200/60 pt-2.5">
                        <span className="text-[10px] text-slate-500 font-semibold">Element Color Paint:</span>
                        <div className="flex items-center gap-1">
                          {themeColors.map((colHex) => (
                            <button
                              key={colHex}
                              type="button"
                              onClick={() => handleUpdateElementAttr(activeElementId, 'color', colHex)}
                              className={`w-4 h-4 rounded-full border border-white transition ${activeEl.color === colHex ? 'ring-1 ring-amber-500 scale-110' : 'opacity-85'}`}
                              style={{ backgroundColor: colHex }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Decors Specific shape properties */}
                      {activeEl.type === 'shape' && activeEl.shapeStyle && (
                        <div className="border-t border-slate-200/60 pt-2 flex flex-col gap-2 bg-zinc-50 rounded-lg p-2 mt-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Shape Fill & Outline:</span>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-500">Fill Hex:</span>
                            <input
                              type="color"
                              value={activeEl.shapeStyle.fill}
                              onChange={(e) => handleUpdateShapeStyle(activeElementId, 'fill', e.target.value)}
                              className="w-5 h-5 cursor-pointer bg-transparent border-none p-0 rounded"
                            />
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-500">Outline:</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={activeEl.shapeStyle.stroke}
                                onChange={(e) => handleUpdateShapeStyle(activeElementId, 'stroke', e.target.value)}
                                className="w-5 h-5 cursor-pointer bg-transparent border-none p-0 rounded"
                              />
                              <input
                                type="range"
                                min={0}
                                max={8}
                                value={activeEl.shapeStyle.strokeWidth}
                                onChange={(e) => handleUpdateShapeStyle(activeElementId, 'strokeWidth', parseInt(e.target.value, 10))}
                                className="w-16 h-1 bg-gray-200 rounded accent-amber-500 cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

              </div>
            )}
          </div>


          {/* RIGHT COLUMN: Slide interactive design playground canvas board */}
          <div className="lg:col-span-8 flex flex-col items-center select-none" id="main-canvas-column">
            
            {/* Play bar status and indicator line */}
            <div className="w-full bg-slate-200/90 border border-slate-300 rounded-t-2xl p-2.5 px-5 flex items-center justify-between text-[11px] text-slate-600 print:hidden font-sans select-none shadow-xs">
              <div className="flex items-center gap-2 font-semibold">
                <Layout className="h-4 w-4 text-amber-600" />
                <span>Active Design Canvas Board (16:9 Presentation Format)</span>
              </div>
              <span className="font-bold text-amber-700">Slide {activeSlideIdx + 1} of {slides.length}</span>
            </div>

            {/* Simulated 16:9 Slideshow editor board */}
            <div className="w-full bg-slate-100 border-x border-b border-slate-300 rounded-b-2xl p-6 sm:p-10 flex items-center justify-center min-h-[460px] relative overflow-hidden shadow-xs">
              
              {slides[activeSlideIdx] ? (
                <div 
                  id="slide-master-editor-surface"
                  onMouseMove={onDragMoving}
                  onMouseUp={stopDraggingElement}
                  onMouseLeave={stopDraggingElement}
                  className="w-full bg-white border border-slate-300 shadow-xl rounded-xl p-8 relative overflow-hidden transition-transform ease-out duration-100 cursor-default select-none group"
                  style={{
                    wordBreak: 'break-word',
                    transform: `scale(${zoomScale / 100})`,
                    background: slides[activeSlideIdx].backgroundGradient ? slides[activeSlideIdx].backgroundGradient : slides[activeSlideIdx].backgroundColor,
                    color: slides[activeSlideIdx].textColor,
                    aspectRatio: '16/9',
                    maxWidth: '840px'
                  }}
                >
                  
                  {/* Embedded slide items renderer */}
                  {slides[activeSlideIdx].elements.map((el) => {
                    const isSelected = el.id === activeElementId;
                    
                    if (el.type === 'shape') {
                      const shapeStyle = el.shapeStyle ? {
                        backgroundColor: el.shapeStyle.fill,
                        border: `${el.shapeStyle.strokeWidth}px solid ${el.shapeStyle.stroke}`,
                        borderRadius: el.shapeStyle.rx ? `${el.shapeStyle.rx}px` : undefined
                      } : {};

                      return (
                        <div
                          key={el.id}
                          onMouseDown={(e) => startDragElement(e, el.id, el.x, el.y)}
                          onClick={(e) => { e.stopPropagation(); setActiveElementId(el.id); }}
                          className={`absolute p-3 group/item font-sans text-center transition-all ${
                            isSelected 
                              ? 'ring-2 ring-amber-500 cursor-move border-dashed border border-amber-500/50' 
                              : 'hover:ring-1 hover:ring-indigo-400 cursor-default'
                          }`}
                          style={{
                            left: `${el.x}%`,
                            top: `${el.y}%`,
                            width: `${el.width}%`,
                            color: el.color,
                            fontSize: `${el.fontSize}px`,
                            fontStyle: el.italic ? 'italic' : 'normal',
                            fontWeight: el.bold ? 'bold' : 'normal',
                            ...shapeStyle
                          }}
                        >
                          {/* Anchor point handle */}
                          {isSelected && (
                            <div className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center pointer-events-none shadow-sm text-white font-bold text-[8px] select-none animate-pulse">
                              ✥
                            </div>
                          )}

                          {/* Editable visual content block element */}
                          <div className={el.fontFamily === 'serif' ? 'font-serif' : el.fontFamily === 'mono' ? 'font-mono' : 'font-sans'}>
                            {el.content}
                          </div>
                        </div>
                      );
                    }

                    // Standard text elements: headings or taglines
                    return (
                      <div
                        key={el.id}
                        onMouseDown={(e) => startDragElement(e, el.id, el.x, el.y)}
                        onClick={(e) => { e.stopPropagation(); setActiveElementId(el.id); }}
                        className={`absolute p-2.5 group/item transition-all select-none ${
                          isSelected 
                            ? 'ring-2 ring-amber-500 cursor-move border-dashed border border-amber-500/50 bg-amber-500/5' 
                            : 'hover:ring-1 hover:ring-slate-400 cursor-default'
                        } ${
                          el.fontFamily === 'serif' ? 'font-serif' : el.fontFamily === 'mono' ? 'font-mono' : 'font-sans'
                        }`}
                        style={{
                          left: `${el.x}%`,
                          top: `${el.y}%`,
                          width: `${el.width}%`,
                          color: el.color,
                          fontSize: `${el.fontSize}px`,
                          fontWeight: el.bold ? 'bold' : 'normal',
                          fontStyle: el.italic ? 'italic' : 'normal',
                          textAlign: el.align
                        }}
                      >
                        {/* Drag Handle Indicator */}
                        {isSelected && (
                          <div className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center pointer-events-none shadow-sm text-white font-bold text-[8px] animate-pulse">
                            ✥
                          </div>
                        )}

                        <div>
                          {el.content}
                        </div>
                      </div>
                    );
                  })}

                  {/* Empty warning banner instructions */}
                  {slides[activeSlideIdx].elements.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center font-sans text-center bg-slate-100/30 p-8">
                      <Presentation className="h-10 w-10 text-slate-400 mb-2 animate-bounce" />
                      <p className="font-bold text-xs text-slate-700 leading-none">Your slide canvas is completely blank</p>
                      <p className="text-[10px] text-slate-500 max-w-xs mt-1">Choose layout presets inside "Slides Layout Presets" tab above or click "Insert Element" to begin adding layers.</p>
                    </div>
                  )}

                  {/* Absolute subtle slide watermarking indicators overlay inside the editor bounds */}
                  <div className="absolute bottom-3 right-6 text-[9px] font-mono tracking-wider opacity-40 select-none pointer-events-none">
                    {deckTitle} • Page {activeSlideIdx + 1}
                  </div>

                </div>
              ) : (
                <div className="text-center p-8">
                  <RefreshCw className="h-8 w-8 text-amber-500 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Constructing slide board layouts...</p>
                </div>
              )}

            </div>

            {/* Layout helpful tips underneath */}
            <div className="mt-5 p-3.5 bg-zinc-100 rounded-xl text-[11px] text-slate-600 border border-slate-200 flex items-start gap-2.5 max-w-xl">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Formatting tip:</strong> Click directly on any text or shape layer overlay to reveal its styling control knobs (color picker, bold setting, item sizes, and coordinates deletion) inside the left sidebar.
              </div>
            </div>

          </div>

        </div>

      </div>


      {/* PRESENTATION OVERLAY slideshow (Full screen modal simulation with glowing laser mouse tracking) */}
      {isPresenting && slides[presentSlideIdx] && (
        <div 
          className="fixed inset-0 bg-slate-950 text-white z-50 overflow-hidden flex flex-col items-center justify-center select-none cursor-default"
          style={{ cursor: laserPointerActive ? 'none' : 'default' }}
          onMouseMove={handlePresentationMouseMove}
          id="presenter-overlay-viewport"
        >
          {/* Glowing laser dot emulator */}
          {laserPointerActive && (
            <div 
              className="absolute pointer-events-none rounded-full bg-red-500"
              style={{
                left: mousePos.x - 7,
                top: mousePos.y - 7,
                width: '14px',
                height: '14px',
                boxShadow: '0 0 20px 8px #ef4444',
                zIndex: 10000
              }}
            />
          )}

          {/* Mini Header stats controls */}
          <div className="absolute top-4 left-6 right-6 flex items-center justify-between text-[11px] text-slate-400 font-bold z-35 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800 backdrop-blur-xs select-none">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500 p-1 rounded">
                <Presentation className="h-3 w-3 text-slate-950 shrink-0" />
              </div>
              <span className="uppercase tracking-widest text-[#f59e0b]">{deckTitle}</span>
              <div className="h-4 w-[1px] bg-slate-800"></div>
              <span className="text-slate-300">Slide {presentSlideIdx + 1} of {slides.length}</span>
            </div>

            {/* Elapsed speech practicing timer widget */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 font-mono text-emerald-400">
                <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0 select-none" />
                <span>Practicing speech: {Math.floor(speechTimer / 60)}m {speechTimer % 60}s</span>
              </div>
              <button
                type="button"
                onClick={toggleSpeechTimer}
                className={`p-1 px-2.5 rounded text-[10px] font-bold ${speechTimerActive ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}
              >
                {speechTimerActive ? 'Pause practice' : 'Resume timer'}
              </button>
              <button
                type="button"
                onClick={resetSpeechTimer}
                className="p-1 px-2 text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 rounded transition"
              >
                Reset timing
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLaserPointerActive(!laserPointerActive)}
                className={`p-1.5 px-3 rounded-md border text-[10px] font-bold transition flex items-center gap-1 shrink-0 ${
                  laserPointerActive 
                    ? 'bg-red-600 font-bold border-red-500 text-white animate-pulse' 
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
                title="Toggle visual laser mouse indicator marker"
              >
                <MousePointerClick className="h-3.5 w-3.5 shrink-0" />
                <span>{laserPointerActive ? 'Laser pointer: On' : 'Laser point pointer marker'}</span>
              </button>
              
              <button
                type="button"
                onClick={exitPresentationMode}
                className="p-1 px-2 text-[10px] bg-red-600 hover:bg-red-500 text-white font-bold rounded-md transition"
              >
                Exit Slides [ESC]
              </button>
            </div>
          </div>

          {/* Immersive centered active PowerPoint slide page */}
          <div 
            className={`w-full max-w-[960px] aspect-[16/9] bg-white border border-slate-800 shadow-2xl relative rounded-xl p-12 transition-all duration-300 ${
              presentationTransition ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
            }`}
            style={{
              background: slides[presentSlideIdx].backgroundGradient ? slides[presentSlideIdx].backgroundGradient : slides[presentSlideIdx].backgroundColor,
              color: slides[presentSlideIdx].textColor,
              wordBreak: 'break-word'
            }}
          >
            {/* Map and draw elements specifically */}
            {slides[presentSlideIdx].elements.map((el) => {
              if (el.type === 'shape') {
                const shapeStyle = el.shapeStyle ? {
                  backgroundColor: el.shapeStyle.fill,
                  border: `${el.shapeStyle.strokeWidth}px solid ${el.shapeStyle.stroke}`,
                  borderRadius: el.shapeStyle.rx ? `${el.shapeStyle.rx}px` : undefined
                } : {};

                return (
                  <div
                    key={el.id}
                    className="absolute p-4 font-sans text-center z-10"
                    style={{
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      width: `${el.width}%`,
                      color: el.color,
                      fontSize: `${el.fontSize * 1.25}px`, // slightly scaled-up for fullscreen feel
                      fontStyle: el.italic ? 'italic' : 'normal',
                      fontWeight: el.bold ? 'bold' : 'normal',
                      ...shapeStyle
                    }}
                  >
                    <div className={el.fontFamily === 'serif' ? 'font-serif' : el.fontFamily === 'mono' ? 'font-mono' : 'font-sans'}>
                      {el.content}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={el.id}
                  className={`absolute p-2.5 whitespace-pre-wrap select-none leading-relaxed ${
                    el.fontFamily === 'serif' ? 'font-serif' : el.fontFamily === 'mono' ? 'font-mono' : 'font-sans'
                  }`}
                  style={{
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    width: `${el.width}%`,
                    color: el.color,
                    fontSize: `${el.fontSize * 1.25}px`, // dynamic scale presentation magnification multiplier
                    fontWeight: el.bold ? 'bold' : 'normal',
                    fontStyle: el.italic ? 'italic' : 'normal',
                    textAlign: el.align
                  }}
                >
                  {el.content}
                </div>
              );
            })}

            {/* Bottom active tag overlay */}
            <div className="absolute bottom-5 right-10 text-[10px] opacity-40 font-mono select-none">
              DPLK Presentations Hub • Page {presentSlideIdx + 1} of {slides.length}
            </div>
          </div>

          {/* Presentation control bar bottom indicator buttons */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center justify-between gap-6 z-40 bg-slate-900/60 p-2 border border-slate-800/80 rounded-full backdrop-blur-md">
            <button
              type="button"
              onClick={goToPrevPresentSlide}
              disabled={presentSlideIdx === 0}
              className="p-2 bg-slate-800 disabled:opacity-45 hover:bg-slate-700 text-white rounded-full transition disabled:cursor-not-allowed"
              title="Previous slide"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="text-xs font-mono text-slate-350">
              Slide {presentSlideIdx + 1} of {slides.length}
            </span>

            <button
              type="button"
              onClick={goToNextPresentSlide}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition"
              title="Next slide (or Finish slide presentation)"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
