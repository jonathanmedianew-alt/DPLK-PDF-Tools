import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, ArrowLeft, Download, Upload, Plus, Trash2, 
  ChevronRight, AlignLeft, AlignCenter, AlignRight, Bold, Italic, 
  Underline, HelpCircle, FileText, Check, Sparkles, Filter, 
  Database, RefreshCw, BarChart3, LineChart, PieChart, AreaChart, 
  Trash, Save, Info, AlertTriangle, Play, CheckCircle2, Search,
  Scissors, Type, DollarSign, Percent, Calendar
} from 'lucide-react';

interface CellData {
  value: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  color?: string;
  bg?: string;
  align?: 'left' | 'center' | 'right';
  fontSize?: number;
  formatType?: 'text' | 'number' | 'currency' | 'percent' | 'date';
}

interface SheetState {
  name: string;
  cells: Record<string, CellData>;
  rowsCount: number;
  colsCount: number;
}

interface ExcelEditorProps {
  onBack: () => void;
}

// Convert Col Index to A, B, C, ... AA, AB, ...
export function getColumnLabel(index: number): string {
  let label = '';
  let temp = index;
  while (temp >= 0) {
    label = String.fromCharCode((temp % 26) + 65) + label;
    temp = Math.floor(temp / 26) - 1;
  }
  return label;
}

// Convert Excel reference string to indices (e.g. "A1" -> { col: 0, row: 0 })
export function parseCellRef(ref: string): { colLabel: string, col: number, row: number } | null {
  const match = ref.match(/^([A-Z]+)([0-9]+)$/i);
  if (!match) return null;
  const colLabel = match[1].toUpperCase();
  const rowNum = parseInt(match[2], 10) - 1;

  let colIdx = 0;
  for (let i = 0; i < colLabel.length; i++) {
    colIdx = colIdx * 26 + (colLabel.charCodeAt(i) - 64);
  }
  return { colLabel, col: colIdx - 1, row: rowNum };
}

// Extract a list of cell keys in a range (e.g. "A1:B3" -> ["A1", "A2", "A3", "B1", "B2", "B3"])
export function expandRange(rangeStr: string): string[] {
  const parts = rangeStr.split(':');
  if (parts.length !== 2) return [rangeStr];
  const start = parseCellRef(parts[0]);
  const end = parseCellRef(parts[1]);
  if (!start || !end) return [rangeStr];

  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);

  const cells: string[] = [];
  for (let c = minCol; c <= maxCol; c++) {
    for (let r = minRow; r <= maxRow; r++) {
      cells.push(`${getColumnLabel(c)}${r + 1}`);
    }
  }
  return cells;
}

export default function ExcelEditor({ onBack }: ExcelEditorProps) {
  // Pre-loaded Templates
  const templates = {
    budget: {
      name: 'Monthly Budget Planner',
      colsCount: 8,
      rowsCount: 20,
      cells: {
        'A1': { value: 'Monthly Personal Budget', bold: true, fontSize: 16, color: '#e11d48' },
        'A2': { value: 'Secure Client-Side Ledger', italic: true, fontSize: 11, color: '#6b7280' },
        
        'A4': { value: 'Expense Category', bold: true, bg: '#f1f5f9', align: 'left' },
        'B4': { value: 'Planned ($)', bold: true, bg: '#f1f5f9', align: 'right' },
        'C4': { value: 'Actual Spent ($)', bold: true, bg: '#f1f5f9', align: 'right' },
        'D4': { value: 'Variance ($)', bold: true, bg: '#f1f5f9', align: 'right' },
        'E4': { value: '% Reached', bold: true, bg: '#f1f5f9', align: 'right' },
        'F4': { value: 'Status Warning', bold: true, bg: '#f1f5f9', align: 'center' },

        'A5': { value: 'Housing & Rent', align: 'left' },
        'B5': { value: '1400', align: 'right', formatType: 'number' },
        'C5': { value: '1420', align: 'right', formatType: 'number' },
        'D5': { value: '=B5-C5', align: 'right', formatType: 'number', color: '#dc2626' },
        'E5': { value: '=C5/B5', align: 'right', formatType: 'percent' },
        'F5': { value: 'In Budget', align: 'center', color: '#16a34a' },

        'A6': { value: 'Groceries Store', align: 'left' },
        'B6': { value: '500', align: 'right', formatType: 'number' },
        'C6': { value: '480', align: 'right', formatType: 'number' },
        'D6': { value: '=B6-C6', align: 'right', formatType: 'number', color: '#16a34a' },
        'E6': { value: '=C6/B6', align: 'right', formatType: 'percent' },
        'F6': { value: 'In Budget', align: 'center', color: '#16a34a' },

        'A7': { value: 'Internet & Power', align: 'left' },
        'B7': { value: '250', align: 'right', formatType: 'number' },
        'C7': { value: '310', align: 'right', formatType: 'number' },
        'D7': { value: '=B7-C7', align: 'right', formatType: 'number', color: '#dc2626' },
        'E7': { value: '=C7/B7', align: 'right', formatType: 'percent' },
        'F7': { value: 'OVER BUDGET!', align: 'center', color: '#dc2626', bold: true },

        'A8': { value: 'Fun & Leisure', align: 'left' },
        'B8': { value: '300', align: 'right', formatType: 'number' },
        'C8': { value: '120', align: 'right', formatType: 'number' },
        'D8': { value: '=B8-C8', align: 'right', formatType: 'number', color: '#16a34a' },
        'E8': { value: '=C8/B8', align: 'right', formatType: 'percent' },
        'F8': { value: 'In Budget', align: 'center', color: '#16a34a' },

        'A9': { value: 'Savings Fund', align: 'left' },
        'B9': { value: '400', align: 'right', formatType: 'number' },
        'C9': { value: '400', align: 'right', formatType: 'number' },
        'D9': { value: '=B9-C9', align: 'right', formatType: 'number' },
        'E9': { value: '=C9/B9', align: 'right', formatType: 'percent' },
        'F9': { value: 'In Budget', align: 'center', color: '#16a34a' },

        'A11': { value: 'Total Calculated', bold: true, bg: '#f8fafc', align: 'left' },
        'B11': { value: '=SUM(B5:B9)', bold: true, bg: '#f8fafc', align: 'right', formatType: 'number' },
        'C11': { value: '=SUM(C5:C9)', bold: true, bg: '#f8fafc', align: 'right', formatType: 'number' },
        'D11': { value: '=B11-C11', bold: true, bg: '#f8fafc', align: 'right', formatType: 'number' },
        'E11': { value: '=C11/B11', bold: true, bg: '#f8fafc', align: 'right', formatType: 'percent' },
        'F11': { value: 'Completed Check', bold: true, bg: '#f8fafc', align: 'center' }
      }
    },
    project: {
      name: 'Project Timeline Tracker',
      colsCount: 10,
      rowsCount: 20,
      cells: {
        'A1': { value: 'DPLK Enterprise Agile Roadmap', bold: true, fontSize: 16, color: '#2563eb' },
        'A2': { value: 'Sprint Project Deliverables Checklist', italic: true, fontSize: 11, color: '#6b7280' },

        'A4': { value: 'Task ID', bold: true, bg: '#f1f5f9', align: 'center' },
        'B4': { value: 'Sprint Task Name', bold: true, bg: '#f1f5f9', align: 'left' },
        'C4': { value: 'Product Owner', bold: true, bg: '#f1f5f9', align: 'left' },
        'D4': { value: 'Days Estimate', bold: true, bg: '#f1f5f9', align: 'right' },
        'E4': { value: 'Hourly Rate', bold: true, bg: '#f1f5f9', align: 'right' },
        'F4': { value: 'Calculated Cost ($)', bold: true, bg: '#f1f5f9', align: 'right' },
        'G4': { value: 'Task Status', bold: true, bg: '#f1f5f9', align: 'center' },

        'A5': { value: 'TSK-101', align: 'center', bold: true },
        'B5': { value: 'Configure Security sandbox', align: 'left' },
        'C5': { value: 'Jonathan M.', align: 'left' },
        'D5': { value: '4', align: 'right', formatType: 'number' },
        'E5': { value: '75', align: 'right', formatType: 'number' },
        'F5': { value: '=D5*E5*8', align: 'right', formatType: 'currency' },
        'G5': { value: 'Completed', align: 'center', bg: '#dcfce7', color: '#16a34a' },

        'A6': { value: 'TSK-102', align: 'center', bold: true },
        'B6': { value: 'Client compiler optimizations', align: 'left' },
        'C6': { value: 'Alex Carter', align: 'left' },
        'D6': { value: '8', align: 'right', formatType: 'number' },
        'E6': { value: '90', align: 'right', formatType: 'number' },
        'F6': { value: '=D6*E6*8', align: 'right', formatType: 'currency' },
        'G6': { value: 'In Progress', align: 'center', bg: '#fef9c3', color: '#ca8a04' },

        'A7': { value: 'TSK-103', align: 'center', bold: true },
        'B7': { value: 'Formula parser unit checks', align: 'left' },
        'C7': { value: 'Janice Green', align: 'left' },
        'D7': { value: '5', align: 'right', formatType: 'number' },
        'E7': { value: '60', align: 'right', formatType: 'number' },
        'F7': { value: '=D7*E7*8', align: 'right', formatType: 'currency' },
        'G7': { value: 'In Progress', align: 'center', bg: '#fef9c3', color: '#ca8a04' },

        'A8': { value: 'TSK-104', align: 'center', bold: true },
        'B8': { value: 'PDF compression engine setup', align: 'left' },
        'C8': { value: 'Jonathan M.', align: 'left' },
        'D8': { value: '3', align: 'right', formatType: 'number' },
        'E8': { value: '75', align: 'right', formatType: 'number' },
        'F8': { value: '=D8*E8*8', align: 'right', formatType: 'currency' },
        'G8': { value: 'Draft', align: 'center', bg: '#f1f5f9', color: '#475569' },

        'A10': { value: 'Aggregate Dashboard Sum', bold: true, bg: '#eff6ff', align: 'left' },
        'D10': { value: '=SUM(D5:D8)', bold: true, bg: '#eff6ff', align: 'right', formatType: 'number' },
        'F10': { value: '=SUM(F5:F8)', bold: true, bg: '#eff6ff', align: 'right', formatType: 'currency' },
        'G10': { value: 'Sprint Stats', bold: true, bg: '#eff6ff', align: 'center' }
      }
    },
    forecast: {
      name: 'SaaS Financial Forecast',
      colsCount: 8,
      rowsCount: 20,
      cells: {
        'A1': { value: 'SaaS SaaS Gross Margin & Operating Model', bold: true, fontSize: 16, color: '#059669' },
        'A2': { value: 'Client revenue projections pro-forma quarterly metrics', italic: true, fontSize: 11, color: '#6b7280' },

        'A4': { value: 'Projected Metric', bold: true, bg: '#f1f5f9' },
        'B4': { value: 'Quarter 1', bold: true, bg: '#f1f5f9', align: 'right' },
        'C4': { value: 'Quarter 2', bold: true, bg: '#f1f5f9', align: 'right' },
        'D4': { value: 'Quarter 3', bold: true, bg: '#f1f5f9', align: 'right' },
        'E4': { value: 'Quarter 4', bold: true, bg: '#f1f5f9', align: 'right' },
        'F4': { value: 'Annual Total', bold: true, bg: '#f1f5f9', align: 'right' },

        'A5': { value: 'Subscribers count', bold: true },
        'B5': { value: '1200', align: 'right', formatType: 'number' },
        'C5': { value: '1850', align: 'right', formatType: 'number' },
        'D5': { value: '2600', align: 'right', formatType: 'number' },
        'E5': { value: '4100', align: 'right', formatType: 'number' },
        'F5': { value: '=MAX(B5:E5)', align: 'right', formatType: 'number', color: '#2563eb' },

        'A6': { value: 'MRR Value ($)' },
        'B6': { value: '=B5*15', align: 'right', formatType: 'currency' },
        'C6': { value: '=C5*15', align: 'right', formatType: 'currency' },
        'D6': { value: '=D5*15', align: 'right', formatType: 'currency' },
        'E6': { value: '=E5*15', align: 'right', formatType: 'currency' },
        'F6': { value: '=SUM(B6:E6)', align: 'right', formatType: 'currency', bold: true },

        'A7': { value: 'Support Expense' },
        'B7': { value: '4500', align: 'right', formatType: 'number' },
        'C7': { value: '6200', align: 'right', formatType: 'number' },
        'D7': { value: '9200', align: 'right', formatType: 'number' },
        'E7': { value: '12500', align: 'right', formatType: 'number' },
        'F7': { value: '=SUM(B7:E7)', align: 'right', formatType: 'number' },

        'A8': { value: 'Operating Income', bold: true, bg: '#ecfdf5' },
        'B8': { value: '=B6-B7', align: 'right', formatType: 'currency', bg: '#ecfdf5' },
        'C8': { value: '=C6-C7', align: 'right', formatType: 'currency', bg: '#ecfdf5' },
        'D8': { value: '=D6-D7', align: 'right', formatType: 'currency', bg: '#ecfdf5' },
        'E8': { value: '=E6-E7', align: 'right', formatType: 'currency', bg: '#ecfdf5' },
        'F8': { value: '=SUM(B8:E8)', align: 'right', formatType: 'currency', bold: true, bg: '#ecfdf5' }
      }
    }
  };

  // State
  const [activeTab, setActiveTab] = useState<'home' | 'insert' | 'data' | 'templates'>('home');
  const [sheets, setSheets] = useState<SheetState[]>([
    {
      name: 'Sheet1',
      colsCount: 10,
      rowsCount: 25,
      cells: {}
    }
  ]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [selectedCell, setSelectedCell] = useState<string>('A1');
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editInputValue, setEditInputValue] = useState<string>('');
  
  // Selection references
  const currentSheet = sheets[activeSheetIndex] || sheets[0];
  const cellsState = currentSheet.cells;

  // Formatting State
  const [cellFormatting, setCellFormatting] = useState<{
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikethrough: boolean;
    align: 'left' | 'center' | 'right';
    fontSize: number;
    color: string;
    bg: string;
    formatType: 'text' | 'number' | 'currency' | 'percent' | 'date';
  }>({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    align: 'left',
    fontSize: 12,
    color: '#000000',
    bg: '#ffffff',
    formatType: 'text'
  });

  // Chart configuration
  const [showChartModal, setShowChartModal] = useState(false);
  const [chartConfig, setChartConfig] = useState<{
    title: string;
    type: 'bar' | 'line' | 'pie' | 'area';
    labelRange: string; // e.g. "A5:A9"
    dataRange: string;  // e.g. "B5:B9"
  }>({
    title: 'Monthly Spending Breakdown',
    type: 'bar',
    labelRange: 'A5:A9',
    dataRange: 'B5:B9'
  });

  // Simple column-filter query
  const [searchFilter, setSearchFilter] = useState('');
  
  // Data Validation State
  const [showValidationSetup, setShowValidationSetup] = useState(false);
  const [validationRule, setValidationRule] = useState<{
    cellRef: string;
    type: 'numeric' | 'list';
    min?: number;
    max?: number;
    allowedList?: string; // comma separated
  }>({
    cellRef: 'B5',
    type: 'numeric',
    min: 0,
    max: 10000,
    allowedList: 'Approved, Pending, Denied'
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Help guides
  const [showHelp, setShowHelp] = useState(false);
  const [formulaResultCache, setFormulaResultCache] = useState<Record<string, string>>({});

  // Elements scroll handles
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync cell format toolbar when selectedCell updates
  useEffect(() => {
    if (selectedCell) {
      const activeCell = cellsState[selectedCell] || {};
      setCellFormatting({
        bold: !!activeCell.bold,
        italic: !!activeCell.italic,
        underline: !!activeCell.underline,
        strikethrough: !!activeCell.strikethrough,
        align: activeCell.align || 'left',
        fontSize: activeCell.fontSize || 12,
        color: activeCell.color || '#000000',
        bg: activeCell.bg || '#ffffff',
        formatType: activeCell.formatType || 'text'
      });
      setEditInputValue(activeCell.value || '');
    }
  }, [selectedCell, activeSheetIndex]);

  // Recalculate formula variables
  const resolvedCells = useMemo(() => {
    const results: Record<string, string> = {};
    const visiting = new Set<string>();

    const getCellValue = (ref: string): string => {
      const cell = cellsState[ref];
      if (!cell) return '';
      return cell.value;
    };

    const evaluate = (ref: string): string => {
      if (results[ref] !== undefined) return results[ref];
      if (visiting.has(ref)) {
        return '#REF_CIRCULAR';
      }

      visiting.add(ref);
      const rawVal = getCellValue(ref);
      
      if (!rawVal.startsWith('=')) {
        visiting.delete(ref);
        results[ref] = rawVal;
        return rawVal;
      }

      const expression = rawVal.substring(1).trim();
      const upperExpr = expression.toUpperCase();

      try {
        // SUM Formula (e.g. SUM(B5:B9))
        if (upperExpr.startsWith('SUM(')) {
          const inner = expression.substring(4, expression.length - 1);
          const cells = expandRange(inner);
          let sum = 0;
          cells.forEach(c => {
            const v = parseFloat(evaluate(c));
            if (!isNaN(v)) sum += v;
          });
          results[ref] = sum.toString();
        } 
        // AVERAGE Formula (e.g. AVERAGE(B5:B9))
        else if (upperExpr.startsWith('AVERAGE(')) {
          const inner = expression.substring(8, expression.length - 1);
          const cells = expandRange(inner);
          let sum = 0;
          let count = 0;
          cells.forEach(c => {
            const v = parseFloat(evaluate(c));
            if (!isNaN(v)) {
              sum += v;
              count++;
            }
          });
          results[ref] = count > 0 ? (sum / count).toFixed(2) : '0';
        }
        // PRODUCT Formula (e.g. PRODUCT(B5:E5))
        else if (upperExpr.startsWith('PRODUCT(')) {
          const inner = expression.substring(8, expression.length - 1);
          const cells = expandRange(inner);
          let prod = 1;
          let hasVal = false;
          cells.forEach(c => {
            const v = parseFloat(evaluate(c));
            if (!isNaN(v)) {
              prod *= v;
              hasVal = true;
            }
          });
          results[ref] = hasVal ? prod.toString() : '0';
        }
        // COUNT Formula (e.g. COUNT(B5:B9))
        else if (upperExpr.startsWith('COUNT(')) {
          const inner = expression.substring(6, expression.length - 1);
          const cells = expandRange(inner);
          let count = 0;
          cells.forEach(c => {
            const parsed = parseFloat(evaluate(c));
            if (!isNaN(parsed) && evaluate(c).trim() !== '') {
              count++;
            }
          });
          results[ref] = count.toString();
        }
        // MAX Formula (e.g. MAX(B5:B9))
        else if (upperExpr.startsWith('MAX(')) {
          const inner = expression.substring(4, expression.length - 1);
          const cells = expandRange(inner);
          let max = -Infinity;
          cells.forEach(c => {
            const v = parseFloat(evaluate(c));
            if (!isNaN(v)) {
              if (v > max) max = v;
            }
          });
          results[ref] = max !== -Infinity ? max.toString() : '0';
        }
        // MIN Formula (e.g. MIN(B5:B9))
        else if (upperExpr.startsWith('MIN(')) {
          const inner = expression.substring(4, expression.length - 1);
          const cells = expandRange(inner);
          let min = Infinity;
          cells.forEach(c => {
            const v = parseFloat(evaluate(c));
            if (!isNaN(v)) {
              if (v < min) min = v;
            }
          });
          results[ref] = min !== Infinity ? min.toString() : '0';
        }
        // CONCAT Formula (e.g. CONCAT(A1, B1))
        else if (upperExpr.startsWith('CONCAT(')) {
          const inner = expression.substring(7, expression.length - 1);
          const args = inner.split(',').map(s => s.trim());
          let strResult = '';
          args.forEach(arg => {
            if (/^[A-Z]+[0-9]+$/i.test(arg)) {
              strResult += evaluate(arg);
            } else {
              // String constant removal of matching quote letters
              strResult += arg.replace(/['"]/g, '');
            }
          });
          results[ref] = strResult;
        }
        // UPPER Formula (e.g. UPPER(A1))
        else if (upperExpr.startsWith('UPPER(')) {
          const inner = expression.substring(6, expression.length - 1).trim();
          const innerVal = /^[A-Z]+[0-9]+$/i.test(inner) ? evaluate(inner) : inner.replace(/['"]/g, '');
          results[ref] = innerVal.toUpperCase();
        }
        // LOWER Formula (e.g. LOWER(A1))
        else if (upperExpr.startsWith('LOWER(')) {
          const inner = expression.substring(6, expression.length - 1).trim();
          const innerVal = /^[A-Z]+[0-9]+$/i.test(inner) ? evaluate(inner) : inner.replace(/['"]/g, '');
          results[ref] = innerVal.toLowerCase();
        }
        // Dynamic Simple math operands evaluation (e.g. D5*E5 or B5-C5)
        else {
          const tokens = expression.split(/([\+\-\*\/])/);
          if (tokens.length >= 3) {
            let res = 0;
            let currentOp = '+';
            for (let i = 0; i < tokens.length; i++) {
              const token = tokens[i].trim();
              if (token === '+' || token === '-' || token === '*' || token === '/') {
                currentOp = token;
              } else {
                let termVal = 0;
                if (/^[A-Z]+[0-9]+$/i.test(token)) {
                  termVal = parseFloat(evaluate(token)) || 0;
                } else {
                  termVal = parseFloat(token) || 0;
                }

                if (currentOp === '+') res += termVal;
                else if (currentOp === '-') res -= termVal;
                else if (currentOp === '*') res *= termVal;
                else if (currentOp === '/') res = termVal !== 0 ? res / termVal : 0;
              }
            }
            results[ref] = res.toString();
          } else {
            // Direct reference e.g., =A1
            if (/^[A-Z]+[0-9]+$/i.test(expression)) {
              results[ref] = evaluate(expression);
            } else {
              results[ref] = expression;
            }
          }
        }
      } catch (err) {
        results[ref] = '#VALUE_ERROR';
      }

      visiting.delete(ref);
      return results[ref];
    };

    // Evaluate all cells in spreadsheet
    Object.keys(cellsState).forEach(ref => {
      evaluate(ref);
    });

    return results;
  }, [cellsState]);

  // Handle cell text changes
  const updateCellValue = (cellRef: string, val: string) => {
    setSheets(prev => {
      const copy = [...prev];
      const sheet = { ...copy[activeSheetIndex] };
      const cells = { ...sheet.cells };
      cells[cellRef] = {
        ...cells[cellRef],
        value: val
      };
      
      // Perform inline numeric checks if cell is selected for Custom Validation
      if (validationRule.cellRef === cellRef) {
        let isInvalid = false;
        let errMsg = '';
        if (validationRule.type === 'numeric') {
          const num = parseFloat(val);
          if (isNaN(num)) {
            isInvalid = true;
            errMsg = 'Must be a valid real number';
          } else {
            if (validationRule.min !== undefined && num < validationRule.min) {
              isInvalid = true;
              errMsg = `Value cannot be less than ${validationRule.min}`;
            }
            if (validationRule.max !== undefined && num > validationRule.max) {
              isInvalid = true;
              errMsg = `Value cannot exceed ${validationRule.max}`;
            }
          }
        } else if (validationRule.type === 'list') {
          const listVals = validationRule.allowedList ? validationRule.allowedList.split(',').map(s => s.trim().toLowerCase()) : [];
          if (listVals.length > 0 && !listVals.includes(val.trim().toLowerCase())) {
            isInvalid = true;
            errMsg = `Allowed options: ${validationRule.allowedList}`;
          }
        }

        if (isInvalid) {
          setValidationErrors(prevErrs => ({ ...prevErrs, [cellRef]: errMsg }));
        } else {
          setValidationErrors(prevErrs => {
            const next = { ...prevErrs };
            delete next[cellRef];
            return next;
          });
        }
      }

      sheet.cells = cells;
      copy[activeSheetIndex] = sheet;
      return copy;
    });
  };

  // Cell WYSIWYG Styling Updates
  const toggleStyle = (styleProp: 'bold' | 'italic' | 'underline' | 'strikethrough') => {
    setSheets(prev => {
      const copy = [...prev];
      const sheet = { ...copy[activeSheetIndex] };
      const cells = { ...sheet.cells };
      const active = cells[selectedCell] || { value: '' };
      
      cells[selectedCell] = {
        ...active,
        [styleProp]: !active[styleProp]
      };
      
      sheet.cells = cells;
      copy[activeSheetIndex] = sheet;
      return copy;
    });

    setCellFormatting(prev => ({
      ...prev,
      [styleProp]: !prev[styleProp]
    }));
  };

  const changeAlign = (alignment: 'left' | 'center' | 'right') => {
    setSheets(prev => {
      const copy = [...prev];
      const sheet = { ...copy[activeSheetIndex] };
      const cells = { ...sheet.cells };
      const active = cells[selectedCell] || { value: '' };

      cells[selectedCell] = {
        ...active,
        align: alignment
      };

      sheet.cells = cells;
      copy[activeSheetIndex] = sheet;
      return copy;
    });

    setCellFormatting(prev => ({
      ...prev,
      align: alignment
    }));
  };

  const changeFormatType = (type: 'text' | 'number' | 'currency' | 'percent' | 'date') => {
    setSheets(prev => {
      const copy = [...prev];
      const sheet = { ...copy[activeSheetIndex] };
      const cells = { ...sheet.cells };
      const active = cells[selectedCell] || { value: '' };

      cells[selectedCell] = {
        ...active,
        formatType: type
      };

      sheet.cells = cells;
      copy[activeSheetIndex] = sheet;
      return copy;
    });

    setCellFormatting(prev => ({
      ...prev,
      formatType: type
    }));
  };

  const changeColor = (colorHex: string) => {
    setSheets(prev => {
      const copy = [...prev];
      const sheet = { ...copy[activeSheetIndex] };
      const cells = { ...sheet.cells };
      const active = cells[selectedCell] || { value: '' };

      cells[selectedCell] = {
        ...active,
        color: colorHex
      };

      sheet.cells = cells;
      copy[activeSheetIndex] = sheet;
      return copy;
    });

    setCellFormatting(prev => ({
      ...prev,
      color: colorHex
    }));
  };

  const changeBg = (bgHex: string) => {
    setSheets(prev => {
      const copy = [...prev];
      const sheet = { ...copy[activeSheetIndex] };
      const cells = { ...sheet.cells };
      const active = cells[selectedCell] || { value: '' };

      cells[selectedCell] = {
        ...active,
        bg: bgHex
      };

      sheet.cells = cells;
      copy[activeSheetIndex] = sheet;
      return copy;
    });

    setCellFormatting(prev => ({
      ...prev,
      bg: bgHex
    }));
  };

  const changeFontSize = (sz: number) => {
    setSheets(prev => {
      const copy = [...prev];
      const sheet = { ...copy[activeSheetIndex] };
      const cells = { ...sheet.cells };
      const active = cells[selectedCell] || { value: '' };

      cells[selectedCell] = {
        ...active,
        fontSize: sz
      };

      sheet.cells = cells;
      copy[activeSheetIndex] = sheet;
      return copy;
    });

    setCellFormatting(prev => ({
      ...prev,
      fontSize: sz
    }));
  };

  // Row and columns insertions
  const insertRow = () => {
    setSheets(prev => {
      const copy = [...prev];
      const sheet = { ...copy[activeSheetIndex] };
      sheet.rowsCount = Math.min(200, sheet.rowsCount + 1);
      copy[activeSheetIndex] = sheet;
      return copy;
    });
  };

  const deleteRow = () => {
    setSheets(prev => {
      const copy = [...prev];
      const sheet = { ...copy[activeSheetIndex] };
      sheet.rowsCount = Math.max(5, sheet.rowsCount - 1);
      copy[activeSheetIndex] = sheet;
      return copy;
    });
  };

  const insertCol = () => {
    setSheets(prev => {
      const copy = [...prev];
      const sheet = { ...copy[activeSheetIndex] };
      sheet.colsCount = Math.min(50, sheet.colsCount + 1);
      copy[activeSheetIndex] = sheet;
      return copy;
    });
  };

  const deleteCol = () => {
    setSheets(prev => {
      const copy = [...prev];
      const sheet = { ...copy[activeSheetIndex] };
      sheet.colsCount = Math.max(3, sheet.colsCount - 1);
      copy[activeSheetIndex] = sheet;
      return copy;
    });
  };

  // Create new empty sheet
  const addNewSheet = () => {
    setSheets(prev => [
      ...prev,
      {
        name: `Sheet${prev.length + 1}`,
        colsCount: 10,
        rowsCount: 25,
        cells: {}
      }
    ]);
    setActiveSheetIndex(sheets.length);
  };

  // Remove current active sheet
  const removeCurrentSheet = () => {
    if (sheets.length <= 1) return;
    setSheets(prev => prev.filter((_, idx) => idx !== activeSheetIndex));
    setActiveSheetIndex(0);
  };

  // Excel template application loader
  const loadTemplate = (key: 'budget' | 'project' | 'forecast') => {
    const templ = templates[key];
    setSheets(prev => {
      const copy = [...prev];
      copy[activeSheetIndex] = {
        name: templ.name.substring(0, 15),
        colsCount: templ.colsCount,
        rowsCount: templ.rowsCount,
        cells: templ.cells
      };
      return copy;
    });
    setSearchFilter('');
    setValidationErrors({});
    setSelectedCell('A5');
  };

  // Clean the current spreadsheet entirely
  const clearCurrentSheet = () => {
    setSheets(prev => {
      const copy = [...prev];
      copy[activeSheetIndex] = {
        ...copy[activeSheetIndex],
        cells: {}
      };
      return copy;
    });
    setValidationErrors({});
  };

  // Excel Cell content sorting (asc / desc) by selecting column from selectedCell
  const sortActiveColumn = (direction: 'asc' | 'desc') => {
    const match = selectedCell.match(/^([A-Z]+)([0-9]+)$/);
    if (!match) return;
    const colLabel = match[1];

    // Find row boundaries (e.g., from row 5 down to 18)
    const validRows: { rowNum: number, originalVal: string, numericVal: number }[] = [];
    for (let r = 0; r < currentSheet.rowsCount; r++) {
      const ref = `${colLabel}${r + 1}`;
      const originalVal = cellsState[ref]?.value || '';
      
      // Let's exclude header labels at rows 1-4
      if (r >= 4 && originalVal !== '') {
        const numericVal = parseFloat(resolvedCells[ref] || originalVal);
        validRows.push({
          rowNum: r,
          originalVal,
          numericVal: isNaN(numericVal) ? -999999 : numericVal
        });
      }
    }

    if (validRows.length <= 1) return;

    // Apply sorting
    validRows.sort((a, b) => {
      const isNumA = a.numericVal !== -999999;
      const isNumB = b.numericVal !== -999999;

      if (isNumA && isNumB) {
        return direction === 'asc' ? a.numericVal - b.numericVal : b.numericVal - a.numericVal;
      }
      return direction === 'asc' 
        ? a.originalVal.localeCompare(b.originalVal)
        : b.originalVal.localeCompare(a.originalVal);
    });

    // Re-insert ordered sequence back into cellsState
    setSheets(prev => {
      const copy = [...prev];
      const sheet = { ...copy[activeSheetIndex] };
      const cells = { ...sheet.cells };

      validRows.forEach((item, idx) => {
        const destRowIndex = 4 + idx; // mapping relative to rows starting atIndex 4
        // Get elements cell configs
        const sourceRef = `${colLabel}${item.rowNum + 1}`;
        const sourceData = cellsState[sourceRef];
        const destRef = `${colLabel}${destRowIndex + 1}`;
        
        cells[destRef] = {
          ...sourceData,
          value: item.originalVal
        };
      });

      sheet.cells = cells;
      copy[activeSheetIndex] = sheet;
      return copy;
    });
  };

  // Dynamic Chart Elements computed on the fly
  const renderedChartData = useMemo(() => {
    const labelCells = expandRange(chartConfig.labelRange);
    const valueCells = expandRange(chartConfig.dataRange);

    const items: { label: string; rawValue: number; formattedValue: string }[] = [];
    
    labelCells.forEach((cRef, index) => {
      const valRef = valueCells[index];
      const name = resolvedCells[cRef] || cRef;
      const rawText = resolvedCells[valRef] || '0';
      const numVal = parseFloat(rawText);
      const isOk = !isNaN(numVal);
      
      items.push({
        label: name,
        rawValue: isOk ? numVal : 0,
        formattedValue: isOk ? numVal.toLocaleString() : '0'
      });
    });

    return items;
  }, [chartConfig, resolvedCells]);

  // Import Spreadsheet File (.xlsx, .csv)
  const handleSpreadsheetImport = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const targetFile = ev.target.files?.[0];
    if (!targetFile) return;

    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      try {
        const dataArr = new Uint8Array(e.target?.result as ArrayBuffer);
        const fetchedWb = XLSX.read(dataArr, { type: 'array' });
        const firstSheetName = fetchedWb.SheetNames[0];
        const firstSheet = fetchedWb.Sheets[firstSheetName];
        
        // Convert Sheet to rows objects list
        const rowsArray = XLSX.utils.sheet_to_json<any[]>(firstSheet, { header: 1 });
        if (rowsArray.length === 0) return;

        const importedCells: Record<string, CellData> = {};
        let maxCols = 8;
        let maxRows = 20;

        rowsArray.forEach((row, rIdx) => {
          if (rIdx >= 100) return; // limit grid boundaries
          row.forEach((colVal: any, cIdx: number) => {
            if (cIdx >= 26) return; // limit column columns
            const colLabel = getColumnLabel(cIdx);
            const ref = `${colLabel}${rIdx + 1}`;
            
            if (colVal !== undefined && colVal !== null) {
              const strVal = String(colVal);
              importedCells[ref] = {
                value: strVal,
                align: isNaN(Number(colVal)) ? 'left' : 'right',
                formatType: isNaN(Number(colVal)) ? 'text' : 'number'
              };
            }
            if (cIdx + 1 > maxCols) maxCols = cIdx + 1;
          });
          if (rIdx + 1 > maxRows) maxRows = rIdx + 1;
        });

        // Push parsed workbook config back
        setSheets(prev => {
          const copy = [...prev];
          copy[activeSheetIndex] = {
            name: targetFile.name.substring(0, 15),
            colsCount: Math.max(10, maxCols + 2),
            rowsCount: Math.max(25, maxRows + 5),
            cells: importedCells
          };
          return copy;
        });
        setSelectedCell('A1');
      } catch (err: any) {
        alert(`Error compiling selected Excel file: ${err?.message || err}`);
      }
    };
    fileReader.readAsArrayBuffer(targetFile);
  };

  // Export spreadsheet using SheetJS
  const triggerExcelExport = () => {
    const gridAoa: string[][] = [];
    
    // Construct Grid Array Of Arrays (AOA)
    for (let r = 0; r < currentSheet.rowsCount; r++) {
      const rowArr: string[] = [];
      for (let c = 0; c < currentSheet.colsCount; c++) {
        const ref = `${getColumnLabel(c)}${r + 1}`;
        const displayedText = resolvedCells[ref] || '';
        rowArr.push(displayedText);
      }
      gridAoa.push(rowArr);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(gridAoa);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, currentSheet.name);
    
    // Trigger local client side save
    XLSX.writeFile(workbook, `${currentSheet.name.replace(/\s+/g, '_')}_DPLK_Tools.xlsx`);
  };

  // Helper helper to format cell value previews correctly
  const renderFormattedCellText = (cellRef: string) => {
    const value = resolvedCells[cellRef] || '';
    if (value === '') return '';
    if (value.startsWith('#')) return value; // Error text (e.g., #VALUE_ERROR)

    const cellData = cellsState[cellRef] || {};
    const fType = cellData.formatType;

    const num = parseFloat(value);
    if (!isNaN(num)) {
      if (fType === 'currency') {
        return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      if (fType === 'percent') {
        return `${(num * 100).toFixed(1)}%`;
      }
      if (fType === 'number') {
        return num.toLocaleString();
      }
    }

    return value;
  };

  // Max visual height value inside custom chart
  const maxChartValue = useMemo(() => {
    const values = renderedChartData.map(d => Math.abs(d.rawValue));
    const max = Math.max(...values, 10);
    return max * 1.15; // 15% head cushion
  }, [renderedChartData]);

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 flex flex-col font-sans" id="excel-editor-view">
      
      {/* Visual Workspace Sub-Header / Back button */}
      <div className="bg-slate-900 text-white px-4 py-3 sm:px-6 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1 px-3 hover:bg-slate-800 rounded-lg flex items-center gap-2 text-slate-200 hover:text-white transition text-xs font-bold"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>PDF Toolbox</span>
          </button>
          <div className="h-5 w-[1px] bg-slate-700 hidden sm:block"></div>
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 text-white p-1 rounded-md">
              <FileSpreadsheet className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight">DPLK Excel Editor Workspace</span>
              <span className="ml-2 bg-emerald-500/10 text-emerald-400 font-mono text-[9px] uppercase px-1.5 py-0.5 rounded border border-emerald-500/20">
                WYSIWYG Formulas V2.5
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg flex items-center gap-1.5 text-xs font-bold transition cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Import Excel / CSV</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            className="hidden"
            onChange={handleSpreadsheetImport}
          />

          <button
            type="button"
            onClick={triggerExcelExport}
            className="p-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Sheet (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="p-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs"
            title="Formula Cheatsheet"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Spreadsheet Main Ribbon Tab bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="flex px-4 border-b border-slate-200">
          {[
            { id: 'templates', label: 'DPLK Ledger Presets', color: 'text-amber-600 border-amber-600' },
            { id: 'home', label: 'Styles & Formatting', color: 'text-emerald-600 border-emerald-600' },
            { id: 'insert', label: 'Table & Dynamic Charts', color: 'text-blue-600 border-blue-600' },
            { id: 'data', label: 'Data Processing & Sort', color: 'text-purple-600 border-purple-600' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-xs font-bold border-b-2 hover:bg-slate-50 transition ${
                activeTab === tab.id 
                  ? `${tab.color} bg-slate-50/50` 
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic Ribbon Content Panels */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 min-h-[56px] flex flex-wrap items-center gap-4 text-xs">
          
          {/* Preset templates tools Panel */}
          {activeTab === 'templates' && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Templates Library:</span>
              <button
                type="button"
                onClick={() => loadTemplate('budget')}
                className="p-1.5 px-3 bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 rounded-lg flex items-center gap-1.5 font-bold transition"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Monthly Budget Planner</span>
              </button>
              <button
                type="button"
                onClick={() => loadTemplate('project')}
                className="p-1.5 px-3 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-lg flex items-center gap-1.5 font-bold transition"
              >
                <FileText className="h-3.5 w-3.5 text-blue-500" />
                <span>Project Timeline & Costing</span>
              </button>
              <button
                type="button"
                onClick={() => loadTemplate('forecast')}
                className="p-1.5 px-3 bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 rounded-lg flex items-center gap-1.5 font-bold transition"
              >
                <BarChart3 className="h-3.5 w-3.5 text-emerald-500" />
                <span>SaaS Financial Forecast</span>
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={clearCurrentSheet}
                className="p-1.5 px-2 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 rounded-lg flex items-center gap-1 font-bold transition"
              >
                <Trash className="h-3 w-3" />
                <span>Clear All Cells</span>
              </button>
            </div>
          )}

          {/* Standard Text Formatting Ribbon Tab */}
          {activeTab === 'home' && (
            <div className="flex items-center gap-4 flex-wrap">
              
              {/* Typeface weights toggle */}
              <div className="flex border border-slate-200 rounded-lg bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleStyle('bold')}
                  className={`p-1.5 px-3 hover:bg-slate-100 ${cellFormatting.bold ? 'bg-slate-200 border-r border-slate-300 text-slate-900 font-black' : 'text-slate-600'}`}
                  title="Make Selected Cell Bold"
                >
                  <Bold className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleStyle('italic')}
                  className={`p-1.5 px-3 hover:bg-slate-100 ${cellFormatting.italic ? 'bg-slate-200 border-r border-slate-300 text-slate-900 italic' : 'text-slate-600'}`}
                  title="Make Italic"
                >
                  <Italic className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleStyle('underline')}
                  className={`p-1.5 px-3 hover:bg-slate-100 ${cellFormatting.underline ? 'bg-slate-200 border-r border-slate-300 text-slate-900 underline' : 'text-slate-600'}`}
                  title="Underline"
                >
                  <Underline className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Alignments Panel block */}
              <div className="flex border border-slate-200 rounded-lg bg-white overflow-hidden">
                {(['left', 'center', 'right'] as const).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => changeAlign(dir)}
                    className={`p-1.5 px-2.5 hover:bg-slate-100 ${cellFormatting.align === dir ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
                  >
                    {dir === 'left' && <AlignLeft className="h-3.5 w-3.5" />}
                    {dir === 'center' && <AlignCenter className="h-3.5 w-3.5" />}
                    {dir === 'right' && <AlignRight className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>

              {/* Font Size Selector */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-400">Size:</span>
                <select
                  value={cellFormatting.fontSize}
                  onChange={(e) => changeFontSize(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-md p-1 font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                >
                  {[9, 10, 11, 12, 14, 16, 18, 20, 24].map((size) => (
                    <option key={size} value={size}>{size}px</option>
                  ))}
                </select>
              </div>

              {/* Number format type selector */}
              <div className="flex items-center gap-1.5 mr-2">
                <span className="font-bold text-slate-400">Format:</span>
                <div className="flex border border-slate-200 rounded-lg bg-white overflow-hidden p-0.5">
                  <button
                    type="button"
                    onClick={() => changeFormatType('text')}
                    className={`px-2 py-0.5 rounded-md hover:bg-slate-100 flex items-center gap-1 text-[10px] ${cellFormatting.formatType === 'text' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}
                  >
                    <Type className="h-3 w-3" /> Abc
                  </button>
                  <button
                    type="button"
                    onClick={() => changeFormatType('number')}
                    className={`px-2 py-0.5 rounded-md hover:bg-slate-100 flex items-center gap-1 text-[10px] ${cellFormatting.formatType === 'number' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}
                  >
                    123
                  </button>
                  <button
                    type="button"
                    onClick={() => changeFormatType('currency')}
                    className={`px-2 py-0.5 rounded-md hover:bg-slate-100 flex items-center gap-1 text-[10px] ${cellFormatting.formatType === 'currency' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}
                  >
                    <DollarSign className="h-3 w-3" /> $
                  </button>
                  <button
                    type="button"
                    onClick={() => changeFormatType('percent')}
                    className={`px-2 py-0.5 rounded-md hover:bg-slate-100 flex items-center gap-1 text-[10px] ${cellFormatting.formatType === 'percent' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}
                  >
                    <Percent className="h-3 w-3" /> %
                  </button>
                </div>
              </div>

              {/* Palette Color Presets color selector */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-400">Text Color:</span>
                <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-200">
                  {['#000000', '#dc2626', '#2563eb', '#16a34a', '#d97706'].map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => changeColor(hex)}
                      className={`h-4.5 w-4.5 rounded-full border border-slate-300 relative`}
                      style={{ backgroundColor: hex }}
                    >
                      {cellFormatting.color === hex && (
                        <Check className="h-2 w-2 text-white absolute inset-0 m-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cell Background Shading fill tool */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-400">Fill:</span>
                <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-200">
                  {['#ffffff', '#f8fafc', '#f1f5f9', '#fee2e2', '#dbeafe', '#dcfce7', '#fef9c3'].map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => changeBg(hex)}
                      className={`h-4.5 w-4.5 rounded-full border border-slate-300 relative`}
                      style={{ backgroundColor: hex }}
                    >
                      {cellFormatting.bg === hex && (
                        <Check className="h-2 w-2 text-slate-700 absolute inset-0 m-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* Table Modifications & SVG dynamic statistics charts tab */}
          {activeTab === 'insert' && (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Add/Remove RowCol:</span>
                <button
                  type="button"
                  onClick={insertRow}
                  className="p-1 px-3 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 rounded-lg flex items-center gap-1 font-bold transition"
                >
                  <Plus className="h-3 w-3 text-emerald-600" /> Row
                </button>
                <button
                  type="button"
                  onClick={deleteRow}
                  className="p-1 px-3 bg-white border border-slate-200 hover:border-rose-300 hover:bg-rose-50 rounded-lg flex items-center gap-1 font-bold transition text-slate-600"
                >
                  <Trash2 className="h-3 w-3 text-rose-500" /> Row
                </button>
                <span className="text-slate-300 text-sm">|</span>
                <button
                  type="button"
                  onClick={insertCol}
                  className="p-1 px-3 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 rounded-lg flex items-center gap-1 font-bold transition"
                >
                  <Plus className="h-3 w-3 text-emerald-600" /> Column
                </button>
                <button
                  type="button"
                  onClick={deleteCol}
                  className="p-1 px-3 bg-white border border-slate-200 hover:border-rose-300 hover:bg-rose-50 rounded-lg flex items-center gap-1 font-bold transition text-slate-600"
                >
                  <Trash2 className="h-3 w-3 text-rose-500" /> Column
                </button>
              </div>

              <span className="text-slate-300">|</span>

              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Dynamic SVG Chart:</span>
                <button
                  type="button"
                  onClick={() => setShowChartModal(true)}
                  className="p-1.5 px-3 bg-emerald-600 text-white hover:bg-emerald-500 rounded-lg flex items-center gap-1.5 font-bold transition cursor-pointer"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Configure Live Chart</span>
                </button>
              </div>
            </div>
          )}

          {/* Advanced Sorting, Filtering and Numeric Rules Tab */}
          {activeTab === 'data' && (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Column Sorting:</span>
                <button
                  type="button"
                  onClick={() => sortActiveColumn('asc')}
                  className="p-1 px-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg flex items-center gap-1"
                  title="Sort entire rows by chosen column values ascending"
                >
                  <span>Sort A-Z</span>
                </button>
                <button
                  type="button"
                  onClick={() => sortActiveColumn('desc')}
                  className="p-1 px-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg flex items-center gap-1"
                  title="Sort entire rows by chosen column values descending"
                >
                  <span>Sort Z-A</span>
                </button>
              </div>

              <span className="text-slate-300">|</span>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Text Filtering:</span>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search query filter..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1 text-xs w-[180px] focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                {searchFilter && (
                  <button
                    type="button"
                    onClick={() => setSearchFilter('')}
                    className="text-[10px] text-rose-500 font-bold"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              <span className="text-slate-300">|</span>

              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Custom Data Validation:</span>
                <button
                  type="button"
                  onClick={() => setShowValidationSetup(true)}
                  className="p-1.5 px-3 bg-purple-600 text-white hover:bg-purple-500 rounded-lg flex items-center gap-1"
                >
                  <Database className="h-3 w-3" />
                  <span>Setup Validation Constraint</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Dynamic Formula Input Bar (fx) */}
      <div className="bg-white border-b border-slate-200 p-2 px-4 flex items-center gap-3">
        <div className="text-xs text-slate-500 font-mono font-bold bg-slate-100 px-2.5 py-1.5 rounded-md border border-slate-200 min-w-[50px] text-center">
          {selectedCell}
        </div>
        
        <div className="text-sm italic font-mono text-emerald-600 font-bold select-none select-none">
          fx
        </div>

        <input
          type="text"
          value={editInputValue}
          onChange={(e) => {
            setEditInputValue(e.target.value);
            updateCellValue(selectedCell, e.target.value);
          }}
          placeholder="Enter values or calculations e.g. =SUM(B5:B9) or =C5-B5 or =UPPER(A1)"
          className="flex-1 bg-slate-50 border border-slate-200 rounded-md py-1.5 px-3 text-xs font-mono focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 transition"
        />

        {editInputValue.startsWith('=') && (
          <div className="text-xs text-slate-400 font-mono mr-2 bg-slate-100 rounded px-1.5 py-1">
            Result: <span className="font-bold text-slate-700 font-sans">{resolvedCells[selectedCell] || ''}</span>
          </div>
        )}
      </div>

      {/* Primary Layout Workspace with Left Spreadsheet Grid & Right custom widgets docking layout */}
      <div className="flex-1 flex flex-col lg:flex-row" id="workspace-layout">
        
        {/* Spreadsheet spreadsheet grid container */}
        <div className="flex-[3] overflow-auto border-r border-slate-200 bg-white shadow-inner max-h-[60vh] lg:max-h-[calc(100vh-220px)] relative">
          
          <table className="border-collapse table-fixed w-full min-w-[800px] text-xs">
            {/* Table Header Row (A, B, C...) */}
            <thead>
              <tr className="bg-slate-100 divide-x divide-slate-200 border-b border-slate-200">
                <th className="w-[50px] font-bold text-slate-500 py-1.5 bg-slate-200 select-none text-center sticky top-0 left-0 z-20"></th>
                {Array.from({ length: currentSheet.colsCount }).map((_, cIdx) => {
                  const label = getColumnLabel(cIdx);
                  return (
                    <th
                      key={label}
                      className="font-bold text-slate-600 select-none text-center sticky top-0 bg-slate-100 z-10 hover:bg-slate-200"
                    >
                      {label}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Cell data rows */}
            <tbody>
              {Array.from({ length: currentSheet.rowsCount }).map((_, rIdx) => {
                const rowNum = rIdx + 1;
                
                // Let's filter row displaying based on simple search constraints
                if (searchFilter && searchFilter.trim() !== '') {
                  let hasMatch = false;
                  for (let colIndex = 0; colIndex < currentSheet.colsCount; colIndex++) {
                    const labelStr = getColumnLabel(colIndex);
                    const cellKey = `${labelStr}${rowNum}`;
                    const rawValStr = cellsState[cellKey]?.value || '';
                    const calcValStr = resolvedCells[cellKey] || '';
                    if (
                      rawValStr.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      calcValStr.toLowerCase().includes(searchFilter.toLowerCase())
                    ) {
                      hasMatch = true;
                      break;
                    }
                  }
                  if (!hasMatch) return null; // skip this row index entirely
                }

                return (
                  <tr key={rowNum} className="divide-x divide-slate-100 border-b border-slate-150 hover:bg-slate-50/50">
                    
                    {/* Sticky Row number tracker */}
                    <td className="font-mono text-slate-400 font-bold bg-slate-100 select-none text-center border-r border-slate-200 py-1 sticky left-0 z-10">
                      {rowNum}
                    </td>

                    {/* Sequential rows elements columns */}
                    {Array.from({ length: currentSheet.colsCount }).map((_, cIdx) => {
                      const colLabel = getColumnLabel(cIdx);
                      const keyRef = `${colLabel}${rowNum}`;
                      const cell = cellsState[keyRef] || {};
                      const isSelected = selectedCell === keyRef;
                      const isEditing = editingCell === keyRef;
                      const valueText = cell.value || '';
                      
                      const hasVError = validationErrors[keyRef];

                      return (
                        <td
                          key={keyRef}
                          onClick={() => {
                            setSelectedCell(keyRef);
                            setEditInputValue(valueText);
                          }}
                          onDoubleClick={() => {
                            setEditingCell(keyRef);
                            setEditInputValue(valueText);
                          }}
                          className={`relative select-none border-b border-r border-slate-100 transition duration-75 cursor-cell px-1.5 py-1 ${
                            isSelected 
                              ? 'bg-emerald-50/70 ring-2 ring-emerald-500/80 z-20' 
                              : ''
                          } ${
                            hasVError ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-400/50' : ''
                          }`}
                          style={{
                            textAlign: cell.align || 'left',
                            fontWeight: cell.bold ? 'black' : 'normal',
                            fontStyle: cell.italic ? 'italic' : 'normal',
                            textDecoration: `${cell.underline ? 'underline' : ''} ${cell.strikethrough ? 'line-through' : ''}`.trim(),
                            color: cell.color || '#1e293b',
                            backgroundColor: cell.bg || 'inherit',
                            fontSize: `${cell.fontSize || 12}px`
                          }}
                        >
                          {/* Inner inline live edit textbox */}
                          {isEditing ? (
                            <input
                              type="text"
                              value={editInputValue}
                              onChange={(e) => {
                                setEditInputValue(e.target.value);
                                updateCellValue(keyRef, e.target.value);
                              }}
                              onBlur={() => setEditingCell(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setEditingCell(null);
                                }
                              }}
                              className="absolute inset-0 w-full h-full bg-white text-slate-900 border-2 border-emerald-500 px-1 focus:outline-none z-30 font-mono text-xs"
                              autoFocus
                            />
                          ) : (
                            <div className="truncate min-h-[16px] overflow-hidden leading-tight select-text">
                              {renderFormattedCellText(keyRef)}
                            </div>
                          )}

                          {/* Data Validation small indicator warning dot */}
                          {hasVError && (
                            <span 
                              className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping"
                              title={hasVError}
                            />
                          )}
                        </td>
                      );
                    })}

                  </tr>
                );
              })}
            </tbody>
          </table>

        </div>

        {/* Right Dock sidebar element containing dynamic charts and interactive options */}
        <div className="flex-1 border-t lg:border-t-0 p-4 bg-slate-100 flex flex-col gap-4 overflow-y-auto max-h-[80vh] lg:max-h-[calc(100vh-220px)] lg:w-[420px]">
          
          {/* Active Preset Title header badge */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-1 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-amber-500" /> Current Workspace Ledger
            </h3>
            <p className="font-extrabold text-slate-800 text-sm">
              {currentSheet.name}
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <span className="font-mono text-[10px] bg-slate-150 px-2 py-0.5 rounded text-slate-600 border border-slate-200">
                {currentSheet.rowsCount} Rows
              </span>
              <span className="font-mono text-[10px] bg-slate-150 px-2 py-0.5 rounded text-slate-600 border border-slate-200">
                {currentSheet.colsCount} Columns
              </span>
              <span className="font-mono text-[10px] bg-emerald-100 px-2 py-0.5 rounded text-emerald-700 font-bold">
                100% Offline Crypt Secured
              </span>
            </div>
          </div>

          {/* DYNAMIC CHART VISUALIZATION BOARD */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div>
                <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                  <span>{chartConfig.title}</span>
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Live data mapping: Labels ({chartConfig.labelRange}) to Data ({chartConfig.dataRange})
                </p>
              </div>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[9px] font-bold tracking-wider uppercase">
                {chartConfig.type} View
              </span>
            </div>

            {renderedChartData.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <BarChart3 className="h-8 w-8 text-slate-300 stroke-[1.5] mb-2" />
                <p className="text-xs font-medium">No valid ranges selected.</p>
                <p className="text-[10px] text-slate-400 mt-1">Configure chart labels and column ranges under "Table & Dynamic Charts".</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-end min-h-[180px]">
                
                {/* SVG Live Rendered Chart */}
                <div className="flex-1 relative flex items-end justify-between gap-2 border-b border-l border-slate-200 pb-1 pl-2 mb-2 pt-4">
                  
                  {/* Grid Lines backgrounds */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-0">
                    <div className="border-t border-slate-100 w-full h-0"></div>
                    <div className="border-t border-slate-100 w-full h-0"></div>
                    <div className="border-t border-slate-100 w-full h-0"></div>
                  </div>

                  {renderedChartData.map((d, index) => {
                    // Normalize height metrics safely
                    const valHeightPercent = Math.min(100, Math.max(8, (Math.abs(d.rawValue) / maxChartValue) * 100));
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center group relative z-10 w-full">
                        
                        {/* Hover tag overlay details */}
                        <div className="absolute -top-6 bg-slate-900 text-white rounded text-[9px] px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-30 font-mono shadow-md pointer-events-none">
                          {d.label}: {d.formattedValue}
                        </div>

                        {/* Rendering by Chart style Config type */}
                        {chartConfig.type === 'bar' && (
                          <div 
                            className="w-full max-w-[28px] bg-gradient-to-t from-emerald-600 to-emerald-400 hover:from-emerald-500 hover:to-emerald-300 rounded-t-xs transition-all duration-300 cursor-pointer shadow-xs border border-emerald-700/10"
                            style={{ height: `${valHeightPercent}%` }}
                          />
                        )}

                        {chartConfig.type === 'line' && (
                          <div className="w-full flex flex-col items-center justify-end" style={{ height: '100%' }}>
                            <div 
                              className="h-3 w-3 bg-blue-600 hover:scale-150 rounded-full border border-white shadow-md transition duration-150 cursor-pointer"
                              style={{ marginBottom: `calc(${valHeightPercent}% - 6px)` }}
                            />
                            {/* Accent indicator line connector overlay */}
                            <div 
                              className="w-[2.5px] bg-blue-400/30 absolute"
                              style={{ height: `${valHeightPercent}%`, bottom: 0, zIndex: -1 }}
                            />
                          </div>
                        )}

                        {chartConfig.type === 'pie' && (
                          <div className="w-full flex items-end justify-center" style={{ height: '100%' }}>
                            <div 
                              className="w-5 hover:scale-110 rounded-t-full transition duration-150 cursor-pointer border border-amber-600/10"
                              style={{ 
                                height: `${valHeightPercent}%`, 
                                backgroundColor: `hsl(${(index * 55) % 360}, 75%, 55%)` 
                              }}
                            />
                          </div>
                        )}

                        {chartConfig.type === 'area' && (
                          <div 
                            className="w-full bg-indigo-500/20 hover:bg-indigo-500/35 border-t-2 border-indigo-500 transition-all duration-300 cursor-pointer"
                            style={{ height: `${valHeightPercent}%` }}
                          />
                        )}

                        <span className="text-[9px] text-slate-400 font-mono mt-1.5 truncate max-w-[45px] text-center" title={d.label}>
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono mt-1">
                  <span>Range Minimum: 0</span>
                  <span>Max Peak: {maxChartValue.toFixed(0)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Validation Check Warning block */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="bg-rose-50 border border-rose-150 rounded-xl p-3.5 flex items-start gap-2.5">
              <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-rose-950 font-bold text-xs select-none">
                  Data validation warning!
                </h5>
                <p className="text-[10.5px] text-rose-800 leading-relaxed mt-1">
                  Constraints violated at cell <span className="font-mono bg-rose-100 px-1 rounded font-bold">{Object.keys(validationErrors)[0]}</span>:
                  <br />
                  <span className="italic">"{Object.values(validationErrors)[0]}"</span>
                </p>
              </div>
            </div>
          )}

          {/* Quick interactive sandbox cheat footer info */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-[11px] text-slate-500 leading-relaxed flex items-center gap-2 select-none">
            <Info className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              All transactions are calculated securely inside deep sandboxed JS closures. Formulas compute in O(1) linear cascade stacks without external server calls.
            </span>
          </div>

        </div>
      </div>

      {/* Embedded Worksheet sheet tabs list bar */}
      <footer className="bg-slate-900 text-slate-400 px-4 py-2 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {sheets.map((sheetVal, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setActiveSheetIndex(index)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeSheetIndex === index 
                  ? 'bg-slate-800 text-white border border-slate-700' 
                  : 'hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
              <span>{sheetVal.name}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={addNewSheet}
            className="p-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs flex items-center gap-1 font-bold transition"
            title="Create new Worksheet"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {sheets.length > 1 && (
          <button
            type="button"
            onClick={removeCurrentSheet}
            className="text-xs font-bold text-rose-500 hover:text-rose-400 flex items-center gap-1"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Current Sheet</span>
          </button>
        )}
      </footer>

      {/* LIVE CHART CONFIGURATION DIALOG MODAL */}
      {showChartModal && (
        <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
                <span>Configure Live Spreadsheet Chart</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setShowChartModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Chart Title</label>
                <input
                  type="text"
                  value={chartConfig.title}
                  onChange={(e) => setChartConfig(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Chart Display Style</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'bar', label: 'Bar', icon: BarChart3 },
                    { id: 'line', label: 'Line', icon: LineChart },
                    { id: 'pie', label: 'Pie', icon: PieChart },
                    { id: 'area', label: 'Area', icon: AreaChart }
                  ].map((style) => {
                    const Ic = style.icon;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setChartConfig(prev => ({ ...prev, type: style.id as any }))}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 font-bold ${
                          chartConfig.type === style.id
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Ic className="h-4 w-4" />
                        <span className="text-[10px]">{style.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Label Range (Y-Axis)</label>
                  <input
                    type="text"
                    value={chartConfig.labelRange}
                    onChange={(e) => setChartConfig(prev => ({ ...prev, labelRange: e.target.value.toUpperCase() }))}
                    placeholder="e.g. A5:A9"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Categorical column coordinates</p>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Data Range (X-Axis values)</label>
                  <input
                    type="text"
                    value={chartConfig.dataRange}
                    onChange={(e) => setChartConfig(prev => ({ ...prev, dataRange: e.target.value.toUpperCase() }))}
                    placeholder="e.g. B5:B9"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Numerical data coordinates</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 flex items-start gap-2 text-slate-500 text-[10.5px]">
                <Info className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  The spreadsheet chart updates reactively in real-time when the referenced columns value change. Correct ranges match the row structures (e.g. labels <strong>A5:A9</strong> and values <strong>B5:B9</strong>).
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowChartModal(false)}
                className="p-2 px-5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition text-xs cursor-pointer"
              >
                Apply Constraints
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DATA VALIDATION SETUP MODAL */}
      {showValidationSetup && (
        <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-600" />
                <span>Create Grid Validation Rule</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setShowValidationSetup(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Target Cell Coordinate</label>
                  <input
                    type="text"
                    value={validationRule.cellRef}
                    onChange={(e) => setValidationRule(prev => ({ ...prev, cellRef: e.target.value.toUpperCase() }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-bold"
                    placeholder="B5"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Specific cell to validate</p>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Validation Constraint Type</label>
                  <select
                    value={validationRule.type}
                    onChange={(e) => setValidationRule(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  >
                    <option value="numeric">Numerical Bounds (Min/Max)</option>
                    <option value="list">Strict Option Choices List</option>
                  </select>
                </div>
              </div>

              {validationRule.type === 'numeric' ? (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-150">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Lower Floor Bound (Min)</label>
                    <input
                      type="number"
                      value={validationRule.min ?? ''}
                      onChange={(e) => setValidationRule(prev => ({ ...prev, min: e.target.value === '' ? undefined : Number(e.target.value) }))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2"
                      placeholder="e.g. 0"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Upper Ceiling Bound (Max)</label>
                    <input
                      type="number"
                      value={validationRule.max ?? ''}
                      onChange={(e) => setValidationRule(prev => ({ ...prev, max: e.target.value === '' ? undefined : Number(e.target.value) }))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2"
                      placeholder="e.g. 1000"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                  <label className="block text-slate-600 font-bold mb-1">Allowed Choices (comma separated)</label>
                  <input
                    type="text"
                    value={validationRule.allowedList}
                    onChange={(e) => setValidationRule(prev => ({ ...prev, allowedList: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2"
                    placeholder="Approved, Pending, Denied"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Cell will raise error if value matches none of these</p>
                </div>
              )}

              <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 flex items-start gap-2 text-purple-900 text-[10.5px]">
                <Info className="h-3.5 w-3.5 text-purple-600 shrink-0 mt-0.5" />
                <span>
                  Validation runs immediately upon text entry. Any violation triggers a warning glow and visual validation alert directly on the cell.
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowValidationSetup(false)}
                className="p-2 px-5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition text-xs cursor-pointer"
              >
                Apply Constraints
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HELP FORMULA CHEATSHEET MODAL */}
      {showHelp && (
        <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in-50 duration-150">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
              <h3 className="font-extrabold text-slate-950 text-sm flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-emerald-600" />
                <span>DPLK Formula Evaluator Cheatsheet</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setShowHelp(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600">
              <p className="font-medium text-slate-800">
                To trigger the calculation engine, start a cell value with the equal sign <strong className="font-mono text-emerald-600 bg-slate-100 p-0.5 rounded px-1.5">=</strong> value. Supported functions:
              </p>

              <div className="space-y-2 font-mono">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                  <span className="text-emerald-700 font-bold">=SUM(start:end)</span>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">Adds all numbers in the coordinate range: <span className="bg-slate-200/60 p-0.5 rounded font-mono">=SUM(B5:B9)</span></p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                  <span className="text-emerald-700 font-bold">=AVERAGE(start:end)</span>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">Finds mathematically centered mean of values: <span className="bg-slate-200/60 p-0.5 rounded font-mono">=AVERAGE(B5:B9)</span></p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                  <span className="text-emerald-700 font-bold">=PRODUCT(start:end)</span>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">Multiplies matching cells range sequentially: <span className="bg-slate-200/60 p-0.5 rounded font-mono">=PRODUCT(D5:D8)</span></p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                  <span className="text-emerald-700 font-bold">=COUNT(start:end)</span>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">Counts non-empty numeric cells: <span className="bg-slate-200/60 p-0.5 rounded font-mono">=COUNT(B5:E5)</span></p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                  <span className="text-emerald-700 font-bold">=MAX(start:end) / =MIN(start:end)</span>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">Returns highest or lowest value respectively</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                  <span className="text-emerald-700 font-bold">=CONCAT(val1, val2, ...)</span>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">Joins cells together as text: <span className="bg-slate-200/60 p-0.5 rounded font-mono">=CONCAT(A5, " : Completed")</span></p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                  <span className="text-emerald-700 font-bold">=UPPER(cell) / =LOWER(cell)</span>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">Converts cell string output characters to uppercase or lowercase format</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                  <span className="text-emerald-700 font-bold">Standard Operations e.g. =A5*B5</span>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">Calculates inline mathematics directly (supports addition +, subtraction -, product *, division /)</p>
                </div>
              </div>

              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 flex items-start gap-2.5 text-amber-900 text-[10.5px]">
                <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Tip:</strong> Circular dependencies (e.g., A1 referencing B2 which references A1) are caught by our secure stack compiler and yield a safety string <strong>#REF_CIRCULAR</strong> instead of crashing.
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="p-2 px-5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition text-xs cursor-pointer"
              >
                Close Library Guide
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
