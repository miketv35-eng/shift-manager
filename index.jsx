import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Users, Clock, FileSpreadsheet, Upload, Download, AlertTriangle, Check, X, ChevronLeft, ChevronRight, Settings, BarChart3 } from 'lucide-react';
import * as XLSX from 'xlsx';

// SKAP Levels in order of progression
const SKAP_LEVELS = [
  'New Starter',
  'Beginner',
  'Warehouse Intermediate',
  'Warehouse Advanced',
  'Distop Intermediate',
  'Distop Advanced',
  'Multiop (MOP)'
];

// Work Areas Configuration - base config with skill requirements
// SKAP Levels: 0=New Starter, 1=Beginner, 2=WH Intermediate, 3=WH Advanced, 4=Distop Intermediate, 5=Distop Advanced, 6=MOP
const WORK_AREAS_CONFIG = {
  'Can Line': {
    positions: {
      'MAC1': { minSkapLevel: 1, kegTrainedRequired: false }, // Beginner+
      'MAC2': { minSkapLevel: 1, kegTrainedRequired: false }, // Beginner+
      'MAB3': { minSkapLevel: 2, kegTrainedRequired: false }  // Warehouse Intermediate+
    },
    color: 'bg-blue-100 border-blue-300',
    type: 'line'
  },
  'Bot Line': {
    positions: {
      'MAB1': { minSkapLevel: 2, kegTrainedRequired: false }, // Warehouse Intermediate+
      'MAB2': { minSkapLevel: 2, kegTrainedRequired: false }  // Warehouse Intermediate+
    },
    color: 'bg-green-100 border-green-300',
    type: 'line'
  },
  'Corona Line': {
    positions: {
      'Corona': { minSkapLevel: 2, kegTrainedRequired: false } // Warehouse Intermediate+
    },
    color: 'bg-yellow-100 border-yellow-300',
    type: 'line'
  },
  'Keg Line': {
    positions: {
      'MAK1 Outside': { minSkapLevel: 1, kegTrainedRequired: false }, // Beginner+
      'MAK1 Inside': { minSkapLevel: 2, kegTrainedRequired: true }    // Intermediate + Keg Trained
    },
    color: 'bg-purple-100 border-purple-300',
    type: 'line'
  },
  'Magor 1 Loading': {
    positions: {
      'Magor 1': { minSkapLevel: 2, kegTrainedRequired: false } // Warehouse Intermediate+
    },
    color: 'bg-orange-100 border-orange-300',
    loadsPerOp: 15,
    type: 'loading'
  },
  'Tents Loading': {
    positions: {
      'Tents': { minSkapLevel: 1, kegTrainedRequired: false } // Beginner+ (May Transfers)
    },
    color: 'bg-orange-200 border-orange-400',
    loadsPerOp: 15,
    type: 'loading'
  },
  'Keg Loading': {
    positions: {
      'Keg Loading': { minSkapLevel: 2, kegTrainedRequired: true } // Intermediate + Keg Trained
    },
    color: 'bg-pink-100 border-pink-300',
    loadsPerOp: 6,
    type: 'loading'
  },
  'Packaging': {
    positions: {
      'Packaging': { minSkapLevel: 2, kegTrainedRequired: false } // Warehouse Intermediate+
    },
    color: 'bg-teal-100 border-teal-300',
    type: 'line'
  },
  'Pilot': {
    positions: {
      'Pilot 1': { minSkapLevel: 4, kegTrainedRequired: false, isPilot: true }, // Distop+
      'Pilot 2': { minSkapLevel: 4, kegTrainedRequired: false, isPilot: true }  // Distop+
    },
    color: 'bg-red-100 border-red-300',
    type: 'coordinator'
  }
};

// Default production plan template
const DEFAULT_PRODUCTION_PLAN = {
  lines: {
    'MAC1': false,
    'MAC2': false,
    'MAB3': false,
    'MAB1': false,
    'MAB2': false,
    'Corona': false,
    'MAK1': false,
    'Packaging': false
  },
  canLineOps: 4, // When can line is running, use 4 ops
  loading: {
    magor1Loads: 0,
    tentsLoads: 0,
    kegLoads: 0
  },
  pilotCount: 2
};

// Status codes from the manning file
const STATUS_CODES = {
  'D': { label: 'Day Shift', color: 'bg-green-200', available: true, shift: 'Day' },
  'N': { label: 'Night Shift', color: 'bg-blue-200', available: true, shift: 'Night' },
  'O': { label: 'Off', color: 'bg-gray-100', available: false, shift: null },
  'A': { label: 'Annual Leave', color: 'bg-yellow-200', available: false, shift: null },
  'S': { label: 'Sick', color: 'bg-red-200', available: false, shift: null },
  'T': { label: 'TOIL', color: 'bg-purple-200', available: false, shift: null }
};

// Initial staff from the manning file
const INITIAL_STAFF = [
  // FTE Staff
  { id: 1, name: 'Paul Williams', skapLevel: 6, role: 'Operator', kegTrained: true, isAgency: false },
  { id: 2, name: 'Anthony Johnston', skapLevel: 6, role: 'Operator', kegTrained: true, isAgency: false },
  { id: 3, name: 'Scott Jarvis', skapLevel: 6, role: 'Operator', kegTrained: true, isAgency: false },
  { id: 4, name: 'Robert Stallard', skapLevel: 3, role: 'Operator', kegTrained: true, isAgency: false },
  { id: 5, name: 'Shaun Dorrington', skapLevel: 3, role: 'Operator', kegTrained: true, isAgency: false },
  { id: 6, name: 'Brian Jones', skapLevel: 3, role: 'Operator', kegTrained: true, isAgency: false },
  { id: 7, name: 'Russel Jones', skapLevel: 3, role: 'Operator', kegTrained: true, isAgency: false },
  { id: 8, name: 'Chris Fullick', skapLevel: 3, role: 'Operator', kegTrained: true, isAgency: false },
  { id: 9, name: 'Martin Hegarty', skapLevel: 3, role: 'Operator', kegTrained: true, isAgency: false },
  { id: 10, name: 'Chris Guscott', skapLevel: 3, role: 'Operator', kegTrained: true, isAgency: false },
  { id: 11, name: 'Mark Watkins', skapLevel: 3, role: 'Operator', kegTrained: true, isAgency: false },
  { id: 12, name: 'William John', skapLevel: 2, role: 'Operator', kegTrained: false, isAgency: false },
  { id: 13, name: 'Tom Rosser', skapLevel: 2, role: 'Operator', kegTrained: false, isAgency: false },
  { id: 14, name: 'James Fagan', skapLevel: 2, role: 'Operator', kegTrained: false, isAgency: false },
  { id: 15, name: 'Ian Hennessy', skapLevel: 2, role: 'Operator', kegTrained: false, isAgency: false },
  { id: 16, name: 'Andy Childs', skapLevel: 2, role: 'Operator', kegTrained: false, isAgency: false },
  { id: 17, name: 'Lee Bates', skapLevel: 1, role: 'Operator', kegTrained: false, isAgency: false },
  { id: 18, name: 'Karl Lewis', skapLevel: 1, role: 'Operator', kegTrained: false, isAgency: false },
  { id: 19, name: 'Shaun Burrows', skapLevel: 0, role: 'Operator', kegTrained: false, isAgency: false },
  
  // Agency Staff - with area restrictions
  { id: 100, name: 'Kim Palmer', skapLevel: 1, role: 'Agency', kegTrained: false, isAgency: true, 
    areaRestrictions: ['Tents Loading'] }, // Only ever Tents
  { id: 101, name: 'Curtis Price', skapLevel: 2, role: 'Agency', kegTrained: false, isAgency: true,
    areaRestrictions: ['Can Line'], followsAShift: true }, // Follows A Shift, Can Line default
  { id: 102, name: 'Rolandas Rinkevicius', skapLevel: 2, role: 'Agency', kegTrained: false, isAgency: true,
    areaRestrictions: ['Can Line'], followsAShift: true }, // Follows A Shift, Can Line default
  { id: 103, name: 'Dmytro Moiseinko', skapLevel: 2, role: 'Agency', kegTrained: false, isAgency: true,
    areaRestrictions: ['Can Line'], followsAShift: true }, // Follows A Shift, Can Line default
  { id: 104, name: 'Daniel Edwards', skapLevel: 2, role: 'Agency', kegTrained: false, isAgency: true,
    areaRestrictions: ['Can Line', 'Bot Line', 'Corona Line', 'Magor 1 Loading', 'Tents Loading'] }, // Any line or Magor 1 or Tents
  { id: 105, name: 'Kenode Germain', skapLevel: 1, role: 'Agency', kegTrained: false, isAgency: true,
    areaRestrictions: ['Keg Line', 'Tents Loading'], kegLineOutsideOnly: true } // Keg Outside if running, else Tents only
];

export default function ShiftManagement() {
  // Format date as YYYY-MM-DD - defined first so it can be used in state init
  const formatDateFn = (date) => {
    return date.toISOString().split('T')[0];
  };

  const [activeTab, setActiveTab] = useState('dashboard');
  const [staff, setStaff] = useState(INITIAL_STAFF);
  const [availability, setAvailability] = useState({}); // { 'YYYY-MM-DD': { staffId: 'D'|'N'|'O'|'A'|'S'|'T' } }
  const [rotas, setRotas] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [assignmentHistory, setAssignmentHistory] = useState({}); // { staffId: { 'YYYY-MM': ['area1', 'area2'] } }
  const [editingStaff, setEditingStaff] = useState(null);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', skapLevel: 0, role: 'Operator' });
  const [importStatus, setImportStatus] = useState(null);
  const [weeklyImportStatus, setWeeklyImportStatus] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // Staff ID to confirm deletion
  const [confirmRotaDelete, setConfirmRotaDelete] = useState(null); // Rota ID to confirm deletion
  const [productionPlans, setProductionPlans] = useState({}); // { 'YYYY-MM-DD-Day': plan, 'YYYY-MM-DD-Night': plan }
  const [planDate, setPlanDate] = useState(() => formatDateFn(new Date()));
  const [planShift, setPlanShift] = useState('Day');
  const [previewRota, setPreviewRota] = useState(null);
  const [previewShift, setPreviewShift] = useState(null);

  // Format date as YYYY-MM-DD (alias for use throughout component)
  const formatDate = formatDateFn;

  // Load saved data on mount
  useEffect(() => {
    const savedData = localStorage.getItem('shiftManagementData');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      if (parsed.staff) setStaff(parsed.staff);
      if (parsed.availability) setAvailability(parsed.availability);
      if (parsed.rotas) setRotas(parsed.rotas);
      if (parsed.assignmentHistory) setAssignmentHistory(parsed.assignmentHistory);
      if (parsed.productionPlans) setProductionPlans(parsed.productionPlans);
    }
  }, []);

  // Save data whenever it changes
  const saveData = useCallback(() => {
    localStorage.setItem('shiftManagementData', JSON.stringify({
      staff,
      availability,
      rotas,
      assignmentHistory,
      productionPlans
    }));
  }, [staff, availability, rotas, assignmentHistory, productionPlans]);

  useEffect(() => {
    saveData();
  }, [saveData]);

  // Get or create production plan for a date/shift
  const getProductionPlan = (date, shiftType) => {
    const dateStr = typeof date === 'string' ? date : formatDate(date);
    const key = `${dateStr}-${shiftType}`;
    return productionPlans[key] || JSON.parse(JSON.stringify(DEFAULT_PRODUCTION_PLAN));
  };

  // Update production plan
  const updateProductionPlan = (date, shiftType, updates) => {
    const dateStr = typeof date === 'string' ? date : formatDate(date);
    const key = `${dateStr}-${shiftType}`;
    const currentPlan = getProductionPlan(dateStr, shiftType);
    setProductionPlans(prev => ({
      ...prev,
      [key]: { ...currentPlan, ...updates }
    }));
  };

  // Copy day shift plan to night shift
  const copyDayToNight = (date) => {
    const dateStr = typeof date === 'string' ? date : formatDate(date);
    const dayPlan = getProductionPlan(dateStr, 'Day');
    const nightKey = `${dateStr}-Night`;
    setProductionPlans(prev => ({
      ...prev,
      [nightKey]: JSON.parse(JSON.stringify(dayPlan))
    }));
  };

  // Calculate required operators from production plan
  const calculateRequiredOps = (plan) => {
    const requirements = {};
    
    // Can Line - if any can line is running
    const canLinesRunning = ['MAC1', 'MAC2', 'MAB3'].filter(l => plan.lines[l]);
    if (canLinesRunning.length > 0) {
      const positions = {};
      canLinesRunning.forEach(line => {
        positions[`${line} Operator`] = WORK_AREAS_CONFIG['Can Line'].positions[line];
      });
      // Add extra ops for break cover if needed
      const totalOps = plan.canLineOps || Math.max(canLinesRunning.length, 4);
      for (let i = canLinesRunning.length + 1; i <= totalOps; i++) {
        // Extra break cover ops - use lowest skill requirement from running lines
        const lowestReq = canLinesRunning.includes('MAB3') ? 
          WORK_AREAS_CONFIG['Can Line'].positions['MAC1'] : 
          WORK_AREAS_CONFIG['Can Line'].positions['MAC1'];
        positions[`Can Line Op ${i}`] = lowestReq;
      }
      requirements['Can Line'] = {
        positions,
        totalOps,
        color: WORK_AREAS_CONFIG['Can Line'].color,
        linesRunning: canLinesRunning
      };
    }

    // Bot Line
    const botLinesRunning = ['MAB1', 'MAB2'].filter(l => plan.lines[l]);
    if (botLinesRunning.length > 0) {
      const positions = {};
      botLinesRunning.forEach(line => {
        positions[`${line} Operator`] = WORK_AREAS_CONFIG['Bot Line'].positions[line];
      });
      requirements['Bot Line'] = {
        positions,
        totalOps: botLinesRunning.length,
        color: WORK_AREAS_CONFIG['Bot Line'].color,
        linesRunning: botLinesRunning
      };
    }

    // Corona Line
    if (plan.lines['Corona']) {
      requirements['Corona Line'] = {
        positions: {
          'Corona Operator': WORK_AREAS_CONFIG['Corona Line'].positions['Corona']
        },
        totalOps: 1,
        color: WORK_AREAS_CONFIG['Corona Line'].color
      };
    }

    // Keg Line - always 2 ops (inside + outside)
    if (plan.lines['MAK1']) {
      requirements['Keg Line'] = {
        positions: {
          'MAK1 Outside': WORK_AREAS_CONFIG['Keg Line'].positions['MAK1 Outside'],
          'MAK1 Inside': WORK_AREAS_CONFIG['Keg Line'].positions['MAK1 Inside']
        },
        totalOps: 2,
        color: WORK_AREAS_CONFIG['Keg Line'].color
      };
    }

    // Packaging
    if (plan.lines['Packaging']) {
      requirements['Packaging'] = {
        positions: {
          'Packaging Operator': WORK_AREAS_CONFIG['Packaging'].positions['Packaging']
        },
        totalOps: 1,
        color: WORK_AREAS_CONFIG['Packaging'].color
      };
    }

    // Magor 1 Loading
    const magor1Ops = Math.ceil((plan.loading?.magor1Loads || 0) / 15);
    if (magor1Ops > 0) {
      const positions = {};
      for (let i = 1; i <= magor1Ops; i++) {
        positions[`Magor 1 Op ${i}`] = WORK_AREAS_CONFIG['Magor 1 Loading'].positions['Magor 1'];
      }
      requirements['Magor 1 Loading'] = {
        positions,
        totalOps: magor1Ops,
        color: WORK_AREAS_CONFIG['Magor 1 Loading'].color,
        loads: plan.loading.magor1Loads
      };
    }

    // Tents Loading
    const tentsOps = Math.ceil((plan.loading?.tentsLoads || 0) / 15);
    if (tentsOps > 0) {
      const positions = {};
      for (let i = 1; i <= tentsOps; i++) {
        positions[`Tents Op ${i}`] = WORK_AREAS_CONFIG['Tents Loading'].positions['Tents'];
      }
      requirements['Tents Loading'] = {
        positions,
        totalOps: tentsOps,
        color: WORK_AREAS_CONFIG['Tents Loading'].color,
        loads: plan.loading.tentsLoads
      };
    }

    // Keg Loading
    const kegLoadingOps = Math.ceil((plan.loading?.kegLoads || 0) / 6);
    if (kegLoadingOps > 0) {
      const positions = {};
      for (let i = 1; i <= kegLoadingOps; i++) {
        positions[`Keg Loading Op ${i}`] = WORK_AREAS_CONFIG['Keg Loading'].positions['Keg Loading'];
      }
      requirements['Keg Loading'] = {
        positions,
        totalOps: kegLoadingOps,
        color: WORK_AREAS_CONFIG['Keg Loading'].color,
        loads: plan.loading.kegLoads
      };
    }

    // Pilot
    const pilotCount = plan.pilotCount || 2;
    if (pilotCount > 0) {
      const positions = {};
      for (let i = 1; i <= pilotCount; i++) {
        positions[`Pilot ${i}`] = WORK_AREAS_CONFIG['Pilot'].positions[`Pilot ${i}`] || 
          { minSkapLevel: 4, kegTrainedRequired: false, isPilot: true };
      }
      requirements['Pilot'] = {
        positions,
        totalOps: pilotCount,
        color: WORK_AREAS_CONFIG['Pilot'].color
      };
    }

    return requirements;
  };

  // Format date for display
  const formatDisplayDate = (date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Get month key for fairness tracking
  const getMonthKey = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  // Parse the manning file
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImportStatus({ type: 'loading', message: 'Processing file...' });

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      
      let importedCount = 0;
      let staffFound = new Set();
      const newAvailability = { ...availability };

      // Month sheet mapping
      const monthSheets = {
        '1 Jan': 0, '2 Feb': 1, '3 Mar': 2, '4 Apr': 3,
        '5 May': 4, '6 Jun': 5, '7 Jul': 6, '8 Aug': 7,
        '9 Sep': 8, '10 Oct': 9, '11 Nov': 10, '12 Dec': 11
      };

      // Process each month sheet
      for (const [sheetName, monthIndex] of Object.entries(monthSheets)) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;

        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (jsonData.length < 2) continue;

        const headerRow = jsonData[0];
        
        // Find date columns (starting from column C, index 2)
        for (let rowIdx = 1; rowIdx < jsonData.length; rowIdx++) {
          const row = jsonData[rowIdx];
          if (!row[0]) continue; // Skip empty rows
          
          const staffName = row[0].toString().trim();
          staffFound.add(staffName);

          // Find matching staff member
          const staffMember = staff.find(s => 
            s.name.toLowerCase() === staffName.toLowerCase()
          );

          if (!staffMember) continue;

          // Process each day column (starting from column C, index 2)
          for (let colIdx = 2; colIdx < row.length; colIdx++) {
            const cellValue = row[colIdx];
            if (!cellValue || typeof cellValue !== 'string') continue;

            const status = cellValue.toString().trim().toUpperCase();
            if (!STATUS_CODES[status]) continue;

            // Parse date from header
            const headerCell = headerRow[colIdx];
            if (!headerCell) continue;

            let dateStr;
            if (typeof headerCell === 'string') {
              // Format: "01-Jan" or similar
              const parts = headerCell.split('-');
              if (parts.length === 2) {
                const day = parseInt(parts[0]);
                const year = 2026;
                const date = new Date(year, monthIndex, day);
                dateStr = formatDate(date);
              }
            } else if (headerCell instanceof Date) {
              dateStr = formatDate(headerCell);
            } else if (typeof headerCell === 'number') {
              // Excel serial date
              const date = new Date((headerCell - 25569) * 86400 * 1000);
              dateStr = formatDate(date);
            }

            if (dateStr) {
              if (!newAvailability[dateStr]) {
                newAvailability[dateStr] = {};
              }
              newAvailability[dateStr][staffMember.id] = status;
              importedCount++;
            }
          }
        }
      }

      setAvailability(newAvailability);
      
      // Add any new staff found in the file
      const newStaffMembers = [];
      let maxId = Math.max(...staff.map(s => s.id));
      
      staffFound.forEach(name => {
        if (!staff.find(s => s.name.toLowerCase() === name.toLowerCase())) {
          newStaffMembers.push({
            id: ++maxId,
            name: name,
            skapLevel: 0,
            role: 'Operator'
          });
        }
      });

      if (newStaffMembers.length > 0) {
        setStaff([...staff, ...newStaffMembers]);
      }

      setImportStatus({
        type: 'success',
        message: `Successfully imported ${importedCount} availability records for ${staffFound.size} staff members.${newStaffMembers.length > 0 ? ` Added ${newStaffMembers.length} new staff.` : ''}`
      });

    } catch (error) {
      console.error('Import error:', error);
      setImportStatus({
        type: 'error',
        message: `Error importing file: ${error.message}`
      });
    }

    // Clear the input
    event.target.value = '';
  };

  // Handle weekly rota file upload (FTE tab - A Shift)
  const handleWeeklyRotaUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setWeeklyImportStatus({ type: 'loading', message: 'Processing weekly rota...' });

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: true });
      
      // Check for FTE sheet
      if (!workbook.SheetNames.includes('FTE')) {
        throw new Error('FTE sheet not found in file');
      }

      const sheet = workbook.Sheets['FTE'];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });
      
      let importedCount = 0;
      const newAvailability = { ...availability };
      const staffFound = new Set();
      const mismatches = []; // Track mismatches between weekly and year planner
      
      // Find dates in row 2 (index 1) - columns C onwards (index 2+)
      let dates = [];
      const dateRow = jsonData[1]; // Row 2
      
      if (dateRow) {
        for (let col = 2; col <= 8; col++) {
          const cellValue = dateRow[col];
          if (cellValue) {
            // Try to parse the date
            let dateStr = null;
            
            if (cellValue instanceof Date) {
              dateStr = formatDate(cellValue);
            } else if (typeof cellValue === 'string') {
              // Try parsing string date
              const parsed = new Date(cellValue);
              if (!isNaN(parsed.getTime())) {
                dateStr = formatDate(parsed);
              }
            } else if (typeof cellValue === 'number') {
              // Excel serial date
              const parsed = new Date((cellValue - 25569) * 86400 * 1000);
              if (!isNaN(parsed.getTime())) {
                dateStr = formatDate(parsed);
              }
            }
            
            if (dateStr) {
              dates.push(dateStr);
            }
          }
        }
      }

      if (dates.length === 0) {
        throw new Error('Could not find dates in row 2 of FTE sheet');
      }

      // Find A SHIFT section
      let aShiftStartRow = -1;
      let aShiftEndRow = -1;
      
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row) continue;
        
        const firstCell = row[0]?.toString() || '';
        
        // Check for A SHIFT marker
        if (firstCell.toUpperCase().includes('A SHIFT')) {
          aShiftStartRow = i + 1; // Data starts on next row
        }
        // Check for B SHIFT marker (end of A SHIFT section)
        if (firstCell.toUpperCase().includes('B SHIFT') && aShiftStartRow > -1) {
          aShiftEndRow = i;
          break;
        }
      }

      if (aShiftStartRow === -1) {
        throw new Error('Could not find A SHIFT section in FTE sheet');
      }
      if (aShiftEndRow === -1) {
        aShiftEndRow = Math.min(aShiftStartRow + 25, jsonData.length);
      }

      // Status code mapping from weekly rota
      const weeklyStatusMap = {
        'D': 'D',   // Day
        'N': 'N',   // Night
        'H': 'A',   // Holiday -> Annual Leave
        'S': 'S',   // Sick
        '10M': 'O', // 10 Month contract -> Off
      };

      // Process A Shift rows
      for (let rowIdx = aShiftStartRow; rowIdx < aShiftEndRow; rowIdx++) {
        const row = jsonData[rowIdx];
        if (!row || !row[0]) continue;
        
        const staffName = row[0].toString().trim();
        if (!staffName || staffName.toUpperCase().includes('SHIFT')) continue;
        
        staffFound.add(staffName);
        
        // Find matching staff member (fuzzy match)
        let staffMember = staff.find(s => 
          s.name.toLowerCase() === staffName.toLowerCase() ||
          s.name.toLowerCase().replace(/\s+/g, ' ').trim() === staffName.toLowerCase().replace(/\s+/g, ' ').trim()
        );
        
        // Try partial match if exact match fails
        if (!staffMember) {
          staffMember = staff.find(s => {
            const sNameParts = s.name.toLowerCase().split(' ');
            const inputParts = staffName.toLowerCase().split(' ');
            return sNameParts[0] === inputParts[0] && 
                   (sNameParts[1]?.startsWith(inputParts[1]?.substring(0, 3) || '') ||
                    inputParts[1]?.startsWith(sNameParts[1]?.substring(0, 3) || ''));
          });
        }

        if (!staffMember) continue;

        // Process each day column (C through I, index 2-8)
        for (let dayIdx = 0; dayIdx < dates.length && dayIdx < 7; dayIdx++) {
          const colIdx = dayIdx + 2; // Columns C=2, D=3, etc.
          const cellValue = row[colIdx];
          
          if (!cellValue) continue;
          
          const weeklyStatus = cellValue.toString().trim().toUpperCase();
          const mappedStatus = weeklyStatusMap[weeklyStatus];
          
          if (mappedStatus && dates[dayIdx]) {
            const dateStr = dates[dayIdx];
            
            // Check against year planner if we have data for this date
            const yearPlannerStatus = availability[dateStr]?.[staffMember.id];
            
            if (yearPlannerStatus) {
              // Compare statuses - flag mismatches
              const isHolidayMismatch = 
                (weeklyStatus === 'H' && yearPlannerStatus !== 'A') || // Weekly shows holiday, year doesn't
                (yearPlannerStatus === 'A' && weeklyStatus !== 'H');   // Year shows annual leave, weekly doesn't
              
              const isSickMismatch = 
                (weeklyStatus === 'S' && yearPlannerStatus !== 'S') || // Weekly shows sick, year doesn't
                (yearPlannerStatus === 'S' && weeklyStatus !== 'S');   // Year shows sick, weekly doesn't
              
              const isShiftMismatch =
                (weeklyStatus === 'D' && yearPlannerStatus === 'N') || // Weekly says Day, year says Night
                (weeklyStatus === 'N' && yearPlannerStatus === 'D');   // Weekly says Night, year says Day
              
              if (isHolidayMismatch) {
                const dateDisplay = new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                mismatches.push({
                  type: 'holiday',
                  staffName: staffMember.name,
                  date: dateDisplay,
                  weekly: weeklyStatus,
                  yearPlanner: yearPlannerStatus,
                  message: `${staffMember.name} on ${dateDisplay}: Weekly=${weeklyStatus === 'H' ? 'Holiday' : weeklyStatus}, Year Planner=${yearPlannerStatus === 'A' ? 'Annual Leave' : yearPlannerStatus}`
                });
              }
              
              if (isSickMismatch) {
                const dateDisplay = new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                mismatches.push({
                  type: 'sick',
                  staffName: staffMember.name,
                  date: dateDisplay,
                  weekly: weeklyStatus,
                  yearPlanner: yearPlannerStatus,
                  message: `${staffMember.name} on ${dateDisplay}: Weekly=${weeklyStatus === 'S' ? 'Sick' : weeklyStatus}, Year Planner=${yearPlannerStatus === 'S' ? 'Sick' : yearPlannerStatus}`
                });
              }
              
              if (isShiftMismatch) {
                const dateDisplay = new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                mismatches.push({
                  type: 'shift',
                  staffName: staffMember.name,
                  date: dateDisplay,
                  weekly: weeklyStatus,
                  yearPlanner: yearPlannerStatus,
                  message: `${staffMember.name} on ${dateDisplay}: Weekly=${weeklyStatus}, Year Planner=${yearPlannerStatus}`
                });
              }
            }
            
            // Update availability with weekly rota (weekly takes precedence)
            if (!newAvailability[dateStr]) {
              newAvailability[dateStr] = {};
            }
            newAvailability[dateStr][staffMember.id] = mappedStatus;
            importedCount++;
          }
        }
      }

      setAvailability(newAvailability);
      
      // Format date range for message
      const startDate = dates[0] ? new Date(dates[0]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
      const endDate = dates[dates.length - 1] ? new Date(dates[dates.length - 1]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';

      // Build status message
      let statusMessage = `Imported ${importedCount} records for ${staffFound.size} A Shift staff (${startDate} - ${endDate})`;
      
      if (mismatches.length > 0) {
        const holidayMismatches = mismatches.filter(m => m.type === 'holiday');
        const sickMismatches = mismatches.filter(m => m.type === 'sick');
        const shiftMismatches = mismatches.filter(m => m.type === 'shift');
        
        setWeeklyImportStatus({
          type: 'warning',
          message: statusMessage,
          mismatches: mismatches,
          summary: {
            holiday: holidayMismatches.length,
            sick: sickMismatches.length,
            shift: shiftMismatches.length
          }
        });
      } else {
        setWeeklyImportStatus({
          type: 'success',
          message: statusMessage + ' ✓ No mismatches with year planner'
        });
      }

    } catch (error) {
      console.error('Weekly rota import error:', error);
      setWeeklyImportStatus({
        type: 'error',
        message: `Error importing weekly rota: ${error.message}`
      });
    }

    event.target.value = '';
  };

  // Get staff availability for a specific date
  const getStaffAvailability = (staffId, date) => {
    const dateStr = typeof date === 'string' ? date : formatDate(date);
    return availability[dateStr]?.[staffId] || 'O';
  };

  // Get available staff for a date and shift type
  const getAvailableStaff = (date, shiftType) => {
    const dateStr = typeof date === 'string' ? date : formatDate(date);
    return staff.filter(s => {
      const status = getStaffAvailability(s.id, dateStr);
      const statusInfo = STATUS_CODES[status];
      return statusInfo?.available && statusInfo?.shift === shiftType;
    });
  };

  // Check if staff was assigned to area this month
  const wasAssignedThisMonth = (staffId, area, date) => {
    const monthKey = getMonthKey(date);
    const history = assignmentHistory[staffId]?.[monthKey] || [];
    return history.includes(area);
  };

  // Check if staff member is qualified for a position
  const isQualifiedForPosition = (staffMember, positionReqs, areaName, positionName) => {
    if (!positionReqs) return false;
    
    // Check SKAP level
    if (staffMember.skapLevel < positionReqs.minSkapLevel) {
      return false;
    }
    
    // Check keg training if required
    if (positionReqs.kegTrainedRequired && !staffMember.kegTrained) {
      return false;
    }
    
    // Check Agency area restrictions
    if (staffMember.isAgency && staffMember.areaRestrictions) {
      if (!staffMember.areaRestrictions.includes(areaName)) {
        return false;
      }
      
      // Special case: Kenode can only do Keg Outside, not Inside
      if (staffMember.kegLineOutsideOnly && areaName === 'Keg Line' && positionName !== 'MAK1 Outside') {
        return false;
      }
    }
    
    return true;
  };

  // Record an assignment
  const recordAssignment = (staffId, area, date) => {
    const monthKey = getMonthKey(date);
    setAssignmentHistory(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        [monthKey]: [...(prev[staffId]?.[monthKey] || []), area]
      }
    }));
  };

  // Generate rota for a specific date using production plan
  const generateRota = (date, shiftType) => {
    const dateStr = typeof date === 'string' ? date : formatDate(date);
    const availableStaff = getAvailableStaff(dateStr, shiftType);
    const plan = getProductionPlan(dateStr, shiftType);
    const requirements = calculateRequiredOps(plan);
    
    const assignments = {};
    const assignedStaffIds = new Set();
    const warnings = [];

    // Separate staff by type
    const fteStaff = availableStaff.filter(s => !s.isAgency);
    const agencyStaff = availableStaff.filter(s => s.isAgency);
    
    // Separate FTE by role priority - Distop/MOP (levels 4-6) for Pilot first
    const pilotEligibleFTE = fteStaff.filter(s => s.skapLevel >= 4);
    const regularFTE = fteStaff.filter(s => s.skapLevel < 4);
    
    // Sort each group by SKAP level (higher first)
    pilotEligibleFTE.sort((a, b) => b.skapLevel - a.skapLevel);
    regularFTE.sort((a, b) => b.skapLevel - a.skapLevel);
    agencyStaff.sort((a, b) => b.skapLevel - a.skapLevel);

    // STEP 1: Assign Pilots first (Distop/MOP priority - FTE only)
    if (requirements['Pilot']) {
      assignments['Pilot'] = {};
      Object.entries(requirements['Pilot'].positions).forEach(([position, posReqs]) => {
        let eligiblePilots = pilotEligibleFTE.filter(s => 
          !assignedStaffIds.has(s.id) &&
          isQualifiedForPosition(s, posReqs, 'Pilot', position) &&
          !wasAssignedThisMonth(s.id, 'Pilot', dateStr)
        );

        if (eligiblePilots.length === 0) {
          eligiblePilots = pilotEligibleFTE.filter(s =>
            !assignedStaffIds.has(s.id) &&
            isQualifiedForPosition(s, posReqs, 'Pilot', position)
          );
          if (eligiblePilots.length > 0) {
            warnings.push(`${eligiblePilots[0].name} assigned to Pilot again this month (rotation override)`);
          }
        }

        if (eligiblePilots.length > 0) {
          assignments['Pilot'][position] = eligiblePilots[0];
          assignedStaffIds.add(eligiblePilots[0].id);
        } else {
          assignments['Pilot'][position] = null;
          warnings.push(`No qualified staff for ${position}`);
        }
      });
    }

    // STEP 2: Assign Can Line with FTE minimum rule (1 FTE required, rest can be Agency)
    if (requirements['Can Line']) {
      assignments['Can Line'] = {};
      const canLinePositions = Object.entries(requirements['Can Line'].positions);
      let fteAssignedToCanLine = 0;
      const minFTEForCanLine = 1;
      
      // First pass: Assign at least 1 FTE to Can Line
      const remainingFTE = [
        ...pilotEligibleFTE.filter(s => !assignedStaffIds.has(s.id)),
        ...regularFTE.filter(s => !assignedStaffIds.has(s.id))
      ].sort((a, b) => b.skapLevel - a.skapLevel);
      
      for (const [position, posReqs] of canLinePositions) {
        if (fteAssignedToCanLine < minFTEForCanLine) {
          // Must assign FTE
          let eligibleFTE = remainingFTE.filter(s =>
            !assignedStaffIds.has(s.id) &&
            isQualifiedForPosition(s, posReqs, 'Can Line', position) &&
            !wasAssignedThisMonth(s.id, 'Can Line', dateStr)
          );
          
          if (eligibleFTE.length === 0) {
            eligibleFTE = remainingFTE.filter(s =>
              !assignedStaffIds.has(s.id) &&
              isQualifiedForPosition(s, posReqs, 'Can Line', position)
            );
          }
          
          if (eligibleFTE.length > 0) {
            assignments['Can Line'][position] = eligibleFTE[0];
            assignedStaffIds.add(eligibleFTE[0].id);
            fteAssignedToCanLine++;
          } else {
            assignments['Can Line'][position] = null;
            warnings.push(`No FTE available for ${position} in Can Line (FTE minimum not met)`);
          }
        } else {
          // Can use Agency for remaining positions
          let eligibleStaff = agencyStaff.filter(s =>
            !assignedStaffIds.has(s.id) &&
            isQualifiedForPosition(s, posReqs, 'Can Line', position)
          );
          
          // If no agency available, fall back to FTE
          if (eligibleStaff.length === 0) {
            eligibleStaff = remainingFTE.filter(s =>
              !assignedStaffIds.has(s.id) &&
              isQualifiedForPosition(s, posReqs, 'Can Line', position)
            );
          }
          
          if (eligibleStaff.length > 0) {
            assignments['Can Line'][position] = eligibleStaff[0];
            assignedStaffIds.add(eligibleStaff[0].id);
            if (!eligibleStaff[0].isAgency) fteAssignedToCanLine++;
          } else {
            assignments['Can Line'][position] = null;
            warnings.push(`No available staff for ${position} in Can Line`);
          }
        }
      }
    }

    // STEP 3: Assign remaining areas
    // Combine remaining staff for other positions
    const remainingStaff = [
      ...pilotEligibleFTE.filter(s => !assignedStaffIds.has(s.id)),
      ...regularFTE.filter(s => !assignedStaffIds.has(s.id)),
      ...agencyStaff.filter(s => !assignedStaffIds.has(s.id))
    ].sort((a, b) => {
      // Prefer FTE over Agency for most positions
      if (a.isAgency !== b.isAgency) return a.isAgency ? 1 : -1;
      return b.skapLevel - a.skapLevel;
    });

    // Process other areas (not Pilot or Can Line)
    Object.entries(requirements).forEach(([areaName, areaConfig]) => {
      if (areaName === 'Pilot' || areaName === 'Can Line') return; // Already handled
      
      assignments[areaName] = {};
      
      Object.entries(areaConfig.positions).forEach(([position, posReqs]) => {
        // Special handling for Keg Line Outside - check if Kenode is available
        if (areaName === 'Keg Line' && position === 'MAK1 Outside') {
          const kenodeAvailable = remainingStaff.find(s => 
            !assignedStaffIds.has(s.id) &&
            s.kegLineOutsideOnly &&
            isQualifiedForPosition(s, posReqs, areaName, position)
          );
          if (kenodeAvailable) {
            assignments[areaName][position] = kenodeAvailable;
            assignedStaffIds.add(kenodeAvailable.id);
            return;
          }
        }
        
        // Find eligible staff: qualified, not assigned, not worked this area this month
        let eligibleStaff = remainingStaff.filter(s => 
          !assignedStaffIds.has(s.id) &&
          isQualifiedForPosition(s, posReqs, areaName, position) &&
          !wasAssignedThisMonth(s.id, areaName, dateStr)
        );

        // If no eligible staff, try without month restriction
        let selectedStaff = eligibleStaff[0];
        if (!selectedStaff) {
          const fallbackStaff = remainingStaff.filter(s =>
            !assignedStaffIds.has(s.id) &&
            isQualifiedForPosition(s, posReqs, areaName, position)
          );
          selectedStaff = fallbackStaff[0];
          if (selectedStaff) {
            warnings.push(`${selectedStaff.name} assigned to ${areaName} again this month (rotation override)`);
          }
        }

        if (selectedStaff) {
          assignments[areaName][position] = selectedStaff;
          assignedStaffIds.add(selectedStaff.id);
        } else {
          assignments[areaName][position] = null;
          warnings.push(`No qualified staff for ${position} in ${areaName}`);
        }
      });
    });

    // Calculate totals
    const totalRequired = Object.values(requirements).reduce((sum, r) => sum + r.totalOps, 0);
    const totalAssigned = assignedStaffIds.size;
    const fteAssigned = availableStaff.filter(s => assignedStaffIds.has(s.id) && !s.isAgency).length;
    const agencyAssigned = availableStaff.filter(s => assignedStaffIds.has(s.id) && s.isAgency).length;

    return { 
      assignments, 
      warnings, 
      unassignedStaff: availableStaff.filter(s => !assignedStaffIds.has(s.id)),
      requirements,
      totalRequired,
      totalAssigned,
      fteAssigned,
      agencyAssigned,
      plan
    };
  };

  // Save a generated rota
  const saveRota = (date, shiftType, assignments, warnings) => {
    const dateStr = typeof date === 'string' ? date : formatDate(date);
    
    // Record all assignments in history
    Object.entries(assignments).forEach(([areaName, positions]) => {
      Object.values(positions).forEach(staffMember => {
        if (staffMember) {
          recordAssignment(staffMember.id, areaName, dateStr);
        }
      });
    });

    const newRota = {
      id: Date.now(),
      date: dateStr,
      shiftType,
      assignments,
      warnings,
      createdAt: new Date().toISOString()
    };

    setRotas(prev => {
      // Remove existing rota for same date/shift if exists
      const filtered = prev.filter(r => !(r.date === dateStr && r.shiftType === shiftType));
      return [...filtered, newRota];
    });

    return newRota;
  };

  // Get existing rota for a date and shift
  const getExistingRota = (date, shiftType) => {
    const dateStr = typeof date === 'string' ? date : formatDate(date);
    return rotas.find(r => r.date === dateStr && r.shiftType === shiftType);
  };

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Add empty slots for days before the first day
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  // Render Dashboard
  const renderDashboard = () => {
    const today = new Date();
    const todayStr = formatDate(today);
    const availableToday = {
      Day: getAvailableStaff(todayStr, 'Day'),
      Night: getAvailableStaff(todayStr, 'Night')
    };

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Today's Overview - {formatDisplayDate(today)}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                Day Shift
              </h3>
              <p className="text-3xl font-bold text-green-600">{availableToday.Day.length}</p>
              <p className="text-gray-500">operators available</p>
              <div className="mt-3">
                <button
                  onClick={() => {
                    setSelectedDate(today);
                    setActiveTab('rota');
                  }}
                  className="text-blue-600 hover:underline text-sm"
                >
                  View/Generate Rota →
                </button>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                Night Shift
              </h3>
              <p className="text-3xl font-bold text-blue-600">{availableToday.Night.length}</p>
              <p className="text-gray-500">operators available</p>
              <div className="mt-3">
                <button
                  onClick={() => {
                    setSelectedDate(today);
                    setActiveTab('rota');
                  }}
                  className="text-blue-600 hover:underline text-sm"
                >
                  View/Generate Rota →
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Quick Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold">{staff.length}</p>
              <p className="text-gray-500 text-sm">Total Staff</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold">{rotas.length}</p>
              <p className="text-gray-500 text-sm">Saved Rotas</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold">{Object.keys(WORK_AREAS_CONFIG).length}</p>
              <p className="text-gray-500 text-sm">Work Areas</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold">
                {Object.values(WORK_AREAS_CONFIG).reduce((sum, area) => sum + (area.lines?.length || 1), 0)}
              </p>
              <p className="text-gray-500 text-sm">Positions</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Import Files</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Year Planner Import */}
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-blue-50">
              <h3 className="font-semibold text-lg mb-2">📅 Year Planner</h3>
              <p className="text-gray-600 text-sm mb-3">
                Import full year availability (A_Shift_2026_Shift_Planner.xlsx)
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="year-planner-upload"
              />
              <label
                htmlFor="year-planner-upload"
                className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 inline-block"
              >
                Upload Year Planner
              </label>
              {importStatus && (
                <div className={`mt-3 p-2 rounded text-sm ${
                  importStatus.type === 'success' ? 'bg-green-100 text-green-800' :
                  importStatus.type === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {importStatus.message}
                </div>
              )}
            </div>

            {/* Weekly Rota Import */}
            <div className="border-2 border-dashed border-green-300 rounded-lg p-6 bg-green-50">
              <h3 className="font-semibold text-lg mb-2">📋 Weekly Rota</h3>
              <p className="text-gray-600 text-sm mb-3">
                Import weekly staffing file (Staffing_WK_X.xlsx - FTE tab, A Shift)
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleWeeklyRotaUpload}
                className="hidden"
                id="weekly-rota-upload"
              />
              <label
                htmlFor="weekly-rota-upload"
                className="cursor-pointer bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 inline-block"
              >
                Upload Weekly Rota
              </label>
              {weeklyImportStatus && (
                <div className={`mt-3 p-2 rounded text-sm ${
                  weeklyImportStatus.type === 'success' ? 'bg-green-100 text-green-800' :
                  weeklyImportStatus.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  weeklyImportStatus.type === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  <div>{weeklyImportStatus.message}</div>
                  
                  {weeklyImportStatus.mismatches && weeklyImportStatus.mismatches.length > 0 && (
                    <div className="mt-3">
                      <div className="font-semibold mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Mismatches Found ({weeklyImportStatus.mismatches.length}):
                      </div>
                      {weeklyImportStatus.summary && (
                        <div className="mb-2 text-xs">
                          {weeklyImportStatus.summary.holiday > 0 && (
                            <span className="mr-3">🏖️ Holiday: {weeklyImportStatus.summary.holiday}</span>
                          )}
                          {weeklyImportStatus.summary.sick > 0 && (
                            <span className="mr-3">🤒 Sick: {weeklyImportStatus.summary.sick}</span>
                          )}
                          {weeklyImportStatus.summary.shift > 0 && (
                            <span>🔄 Shift: {weeklyImportStatus.summary.shift}</span>
                          )}
                        </div>
                      )}
                      <div className="max-h-40 overflow-y-auto bg-white bg-opacity-50 rounded p-2">
                        {weeklyImportStatus.mismatches.map((m, idx) => (
                          <div key={idx} className="text-xs py-1 border-b border-yellow-200 last:border-0">
                            {m.type === 'holiday' && '🏖️ '}
                            {m.type === 'sick' && '🤒 '}
                            {m.type === 'shift' && '🔄 '}
                            {m.message}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-xs italic">
                        Weekly rota has been applied. Please update year planner if needed.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Staff Management
  const renderStaffManagement = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Staff Management</h2>
            <button
              onClick={() => setShowAddStaff(true)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Add Staff
            </button>
          </div>

          {showAddStaff && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
              <h3 className="font-semibold mb-3">Add New Staff Member</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={newStaff.name}
                  onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                  className="border rounded px-3 py-2"
                />
                <select
                  value={newStaff.skapLevel}
                  onChange={e => setNewStaff({ ...newStaff, skapLevel: parseInt(e.target.value) })}
                  className="border rounded px-3 py-2"
                >
                  {SKAP_LEVELS.map((level, idx) => (
                    <option key={idx} value={idx}>{level}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newStaff.isAgency || false}
                    onChange={e => setNewStaff({ ...newStaff, isAgency: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>Agency</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newStaff.kegTrained || false}
                    onChange={e => setNewStaff({ ...newStaff, kegTrained: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>Keg Trained</span>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (newStaff.name.trim()) {
                        setStaff([...staff, {
                          id: Math.max(...staff.map(s => s.id)) + 1,
                          ...newStaff,
                          role: newStaff.isAgency ? 'Agency' : 'Operator',
                          kegTrained: newStaff.kegTrained || false,
                          isAgency: newStaff.isAgency || false
                        }]);
                        setNewStaff({ name: '', skapLevel: 0, role: 'Operator', kegTrained: false, isAgency: false });
                        setShowAddStaff(false);
                      }
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddStaff(false);
                      setNewStaff({ name: '', skapLevel: 0, role: 'Operator', kegTrained: false, isAgency: false });
                    }}
                    className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">SKAP Level</th>
                  <th className="px-4 py-3 text-left">Keg Trained</th>
                  <th className="px-4 py-3 text-left">Eligible Areas</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.sort((a, b) => {
                  // Sort: FTE first, then Agency, then by SKAP level
                  if (a.isAgency !== b.isAgency) return a.isAgency ? 1 : -1;
                  return b.skapLevel - a.skapLevel;
                }).map(member => (
                  <tr key={member.id} className={`border-t ${member.isAgency ? 'bg-orange-50' : ''}`}>
                    <td className="px-4 py-3">
                      {editingStaff?.id === member.id ? (
                        <input
                          type="text"
                          value={editingStaff.name}
                          onChange={e => setEditingStaff({ ...editingStaff, name: e.target.value })}
                          className="border rounded px-2 py-1 w-full"
                        />
                      ) : (
                        <span className="flex items-center gap-2">
                          {member.name}
                          {member.areaRestrictions && (
                            <span className="text-xs text-gray-500" title={`Restricted to: ${member.areaRestrictions.join(', ')}`}>
                              ⚠️
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingStaff?.id === member.id ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingStaff.isAgency || false}
                            onChange={e => setEditingStaff({ ...editingStaff, isAgency: e.target.checked, role: e.target.checked ? 'Agency' : 'Operator' })}
                            className="w-4 h-4"
                          />
                          <span>Agency</span>
                        </label>
                      ) : (
                        <span className={`px-2 py-1 rounded text-sm ${member.isAgency ? 'bg-orange-200 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                          {member.isAgency ? 'Agency' : 'FTE'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingStaff?.id === member.id ? (
                        <select
                          value={editingStaff.skapLevel}
                          onChange={e => setEditingStaff({ ...editingStaff, skapLevel: parseInt(e.target.value) })}
                          className="border rounded px-2 py-1"
                        >
                          {SKAP_LEVELS.map((level, idx) => (
                            <option key={idx} value={idx}>{level}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded text-sm ${
                          member.skapLevel >= 5 ? 'bg-purple-100 text-purple-800' :
                          member.skapLevel >= 3 ? 'bg-blue-100 text-blue-800' :
                          member.skapLevel >= 1 ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {SKAP_LEVELS[member.skapLevel]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingStaff?.id === member.id ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingStaff.kegTrained || false}
                            onChange={e => setEditingStaff({ ...editingStaff, kegTrained: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <span>Yes</span>
                        </label>
                      ) : (
                        <span className={`px-2 py-1 rounded text-sm ${member.kegTrained ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                          {member.kegTrained ? '✓ Yes' : 'No'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(WORK_AREAS_CONFIG).map(([areaName, config]) => {
                          // Check if member can work any position in this area
                          const canWorkArea = Object.values(config.positions || {}).some(posReqs => 
                            member.skapLevel >= posReqs.minSkapLevel && 
                            (!posReqs.kegTrainedRequired || member.kegTrained)
                          );
                          if (!canWorkArea) return null;
                          return (
                            <span key={areaName} className={`px-2 py-0.5 rounded text-xs ${config.color}`}>
                              {areaName}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {editingStaff?.id === member.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setStaff(staff.map(s => s.id === editingStaff.id ? editingStaff : s));
                              setEditingStaff(null);
                            }}
                            className="text-green-600 hover:text-green-800"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setEditingStaff(null)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingStaff({ ...member })}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Edit
                          </button>
                          {confirmDelete === member.id ? (
                            <>
                              <button
                                onClick={() => {
                                  setStaff(staff.filter(s => s.id !== member.id));
                                  setConfirmDelete(null);
                                }}
                                className="text-white bg-red-600 px-2 py-1 rounded text-sm hover:bg-red-700"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="text-gray-600 hover:text-gray-800 text-sm"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(member.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Render Availability Calendar
  const renderAvailability = () => {
    const days = getDaysInMonth(currentMonth);
    const monthName = currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

    // Cycle through status codes on click
    const statusOrder = ['D', 'N', 'O', 'A', 'S', 'T'];
    
    const handleCellClick = (staffId, day) => {
      const dateStr = formatDate(day);
      const currentStatus = getStaffAvailability(staffId, day);
      const currentIndex = statusOrder.indexOf(currentStatus);
      const nextIndex = (currentIndex + 1) % statusOrder.length;
      const nextStatus = statusOrder[nextIndex];
      
      setAvailability(prev => ({
        ...prev,
        [dateStr]: {
          ...prev[dateStr],
          [staffId]: nextStatus
        }
      }));
    };

    // Set specific status via dropdown
    const handleStatusSelect = (staffId, day, newStatus) => {
      const dateStr = formatDate(day);
      setAvailability(prev => ({
        ...prev,
        [dateStr]: {
          ...prev[dateStr],
          [staffId]: newStatus
        }
      }));
    };

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Availability Calendar</h2>
            <div className="flex items-center gap-4">
              <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-100 rounded">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-semibold text-lg min-w-[180px] text-center">{monthName}</span>
              <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 rounded">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Click</strong> a cell to cycle through statuses, or <strong>right-click</strong> for quick select
            </p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(STATUS_CODES).map(([code, info]) => (
                <div key={code} className={`px-3 py-1 rounded text-sm ${info.color}`}>
                  {code} = {info.label}
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-2 py-2 text-left sticky left-0 bg-gray-50 min-w-[150px]">Staff</th>
                  {days.map((day, idx) => (
                    <th key={idx} className="px-1 py-2 text-center min-w-[40px]">
                      {day ? (
                        <div>
                          <div className="text-xs text-gray-500">
                            {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                          </div>
                          <div>{day.getDate()}</div>
                        </div>
                      ) : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staff.map(member => (
                  <tr key={member.id} className="border-t">
                    <td className="px-2 py-2 font-medium sticky left-0 bg-white">{member.name}</td>
                    {days.map((day, idx) => {
                      if (!day) return <td key={idx}></td>;
                      const status = getStaffAvailability(member.id, day);
                      const statusInfo = STATUS_CODES[status] || { color: 'bg-gray-50', label: status };
                      return (
                        <td key={idx} className="px-1 py-1 text-center">
                          <div className="relative group">
                            <button
                              onClick={() => handleCellClick(member.id, day)}
                              className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium mx-auto cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all ${statusInfo.color}`}
                              title={`${member.name} - ${day.toLocaleDateString('en-GB')}: ${statusInfo.label} (click to change)`}
                            >
                              {status}
                            </button>
                            {/* Quick select dropdown on hover */}
                            <div className="absolute z-10 hidden group-hover:flex flex-col bg-white shadow-lg rounded border mt-1 left-1/2 transform -translate-x-1/2">
                              {statusOrder.map(code => (
                                <button
                                  key={code}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusSelect(member.id, day, code);
                                  }}
                                  className={`px-2 py-1 text-xs hover:bg-gray-100 whitespace-nowrap ${STATUS_CODES[code].color}`}
                                >
                                  {code}
                                </button>
                              ))}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Render Rota Generator
  const renderRotaGenerator = () => {
    const dateStr = formatDate(selectedDate);
    const existingDayRota = getExistingRota(dateStr, 'Day');
    const existingNightRota = getExistingRota(dateStr, 'Night');

    // Get production plan info
    const dayPlan = getProductionPlan(dateStr, 'Day');
    const nightPlan = getProductionPlan(dateStr, 'Night');
    const dayRequirements = calculateRequiredOps(dayPlan);
    const nightRequirements = calculateRequiredOps(nightPlan);
    const dayOpsNeeded = Object.values(dayRequirements).reduce((sum, r) => sum + r.totalOps, 0);
    const nightOpsNeeded = Object.values(nightRequirements).reduce((sum, r) => sum + r.totalOps, 0);

    const handleGeneratePreview = (shiftType) => {
      const result = generateRota(selectedDate, shiftType);
      setPreviewRota(result);
      setPreviewShift(shiftType);
    };

    const handleSaveRota = () => {
      if (previewRota && previewShift) {
        saveRota(selectedDate, previewShift, previewRota.assignments, previewRota.warnings);
        setPreviewRota(null);
        setPreviewShift(null);
      }
    };

    const renderRotaDisplay = (rota, title) => (
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-lg mb-3">{title}</h3>
        {rota.totalRequired !== undefined && (
          <div className="mb-3 text-sm flex flex-wrap gap-3">
            <span className="font-medium">Required: {rota.totalRequired}</span>
            <span className="font-medium">Assigned: {rota.totalAssigned}</span>
            {rota.fteAssigned !== undefined && (
              <>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded">FTE: {rota.fteAssigned}</span>
                <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded">Agency: {rota.agencyAssigned}</span>
              </>
            )}
            {rota.totalAssigned < rota.totalRequired && (
              <span className="text-red-600 ml-2">⚠ Short by {rota.totalRequired - rota.totalAssigned}</span>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(rota.assignments).map(([areaName, positions]) => {
            const areaConfig = WORK_AREAS_CONFIG[areaName] || {};
            return (
              <div key={areaName} className={`border rounded p-3 ${areaConfig.color || 'bg-gray-50'}`}>
                <h4 className="font-semibold mb-2">{areaName}</h4>
                {Object.entries(positions).map(([position, staffMember]) => (
                  <div key={position} className="text-sm mb-1 flex items-center gap-1">
                    <span className="text-gray-600">{position}:</span>{' '}
                    <span className={staffMember ? 'font-medium' : 'text-red-600'}>
                      {staffMember?.name || 'UNFILLED'}
                    </span>
                    {staffMember?.isAgency && (
                      <span className="px-1 py-0.5 bg-orange-200 text-orange-800 rounded text-xs">A</span>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        {rota.warnings && rota.warnings.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <div className="flex items-center gap-2 text-yellow-800 font-medium mb-2">
              <AlertTriangle className="w-4 h-4" />
              Warnings
            </div>
            <ul className="list-disc list-inside text-sm text-yellow-700">
              {rota.warnings.map((w, idx) => <li key={idx}>{w}</li>)}
            </ul>
          </div>
        )}
        {rota.unassignedStaff && rota.unassignedStaff.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="font-medium text-blue-800 mb-2">Unassigned Staff ({rota.unassignedStaff.length})</div>
            <div className="flex flex-wrap gap-2">
              {rota.unassignedStaff.map(s => (
                <span key={s.id} className={`px-2 py-1 rounded text-sm ${s.isAgency ? 'bg-orange-100' : 'bg-blue-100'}`}>
                  {s.name} {s.isAgency && <span className="text-xs">(A)</span>}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Rota Generator</h2>
          
          <div className="flex items-center gap-4 mb-6">
            <label className="font-medium">Select Date:</label>
            <input
              type="date"
              value={dateStr}
              onChange={e => setSelectedDate(new Date(e.target.value))}
              className="border rounded px-3 py-2"
            />
            <span className="text-gray-600">{formatDisplayDate(selectedDate)}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Day Shift */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                Day Shift (07:00 - 19:00)
              </h3>
              <div className="text-sm text-gray-600 mb-2">
                <div>Staff available: <strong>{getAvailableStaff(dateStr, 'Day').length}</strong></div>
                <div>Ops required: <strong>{dayOpsNeeded}</strong></div>
                {dayOpsNeeded > 0 ? (
                  <div className={dayOpsNeeded <= getAvailableStaff(dateStr, 'Day').length ? 'text-green-600' : 'text-red-600'}>
                    {dayOpsNeeded <= getAvailableStaff(dateStr, 'Day').length ? '✓ Sufficient' : `⚠ Short by ${dayOpsNeeded - getAvailableStaff(dateStr, 'Day').length}`}
                  </div>
                ) : (
                  <div className="text-orange-600">⚠ No production plan set</div>
                )}
              </div>
              {existingDayRota ? (
                <div className="text-green-600 text-sm mb-2">
                  ✓ Rota exists (saved {new Date(existingDayRota.createdAt).toLocaleDateString()})
                </div>
              ) : null}
              <div className="flex gap-2">
                <button
                  onClick={() => handleGeneratePreview('Day')}
                  className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 flex-1"
                  disabled={dayOpsNeeded === 0}
                >
                  {existingDayRota ? 'Regenerate' : 'Generate'} Day Rota
                </button>
                <button
                  onClick={() => {
                    setPlanDate(dateStr);
                    setPlanShift('Day');
                    setActiveTab('production');
                  }}
                  className="bg-gray-200 px-3 py-2 rounded hover:bg-gray-300"
                  title="Edit Production Plan"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Night Shift */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                Night Shift (19:00 - 07:00)
              </h3>
              <div className="text-sm text-gray-600 mb-2">
                <div>Staff available: <strong>{getAvailableStaff(dateStr, 'Night').length}</strong></div>
                <div>Ops required: <strong>{nightOpsNeeded}</strong></div>
                {nightOpsNeeded > 0 ? (
                  <div className={nightOpsNeeded <= getAvailableStaff(dateStr, 'Night').length ? 'text-green-600' : 'text-red-600'}>
                    {nightOpsNeeded <= getAvailableStaff(dateStr, 'Night').length ? '✓ Sufficient' : `⚠ Short by ${nightOpsNeeded - getAvailableStaff(dateStr, 'Night').length}`}
                  </div>
                ) : (
                  <div className="text-orange-600">⚠ No production plan set</div>
                )}
              </div>
              {existingNightRota ? (
                <div className="text-green-600 text-sm mb-2">
                  ✓ Rota exists (saved {new Date(existingNightRota.createdAt).toLocaleDateString()})
                </div>
              ) : null}
              <div className="flex gap-2">
                <button
                  onClick={() => handleGeneratePreview('Night')}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex-1"
                  disabled={nightOpsNeeded === 0}
                >
                  {existingNightRota ? 'Regenerate' : 'Generate'} Night Rota
                </button>
                <button
                  onClick={() => {
                    setPlanDate(dateStr);
                    setPlanShift('Night');
                    setActiveTab('production');
                  }}
                  className="bg-gray-200 px-3 py-2 rounded hover:bg-gray-300"
                  title="Edit Production Plan"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {previewRota && (
            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Preview: {previewShift} Shift Rota</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveRota}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Save Rota
                  </button>
                  <button
                    onClick={() => {
                      setPreviewRota(null);
                      setPreviewShift(null);
                    }}
                    className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              {renderRotaDisplay(previewRota, `${formatDisplayDate(selectedDate)} - ${previewShift} Shift`)}
            </div>
          )}
        </div>

        {(existingDayRota || existingNightRota) && !previewRota && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Existing Rotas for {formatDisplayDate(selectedDate)}</h2>
            <div className="space-y-6">
              {existingDayRota && renderRotaDisplay(existingDayRota, 'Day Shift (07:00 - 19:00)')}
              {existingNightRota && renderRotaDisplay(existingNightRota, 'Night Shift (19:00 - 07:00)')}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Production Plan
  const renderProductionPlan = () => {
    const plan = getProductionPlan(planDate, planShift);
    const requirements = calculateRequiredOps(plan);
    const totalOpsNeeded = Object.values(requirements).reduce((sum, r) => sum + r.totalOps, 0);
    const availableCount = getAvailableStaff(planDate, planShift).length;

    const updateLine = (line, value) => {
      updateProductionPlan(planDate, planShift, {
        lines: { ...plan.lines, [line]: value }
      });
    };

    const updateLoading = (field, value) => {
      updateProductionPlan(planDate, planShift, {
        loading: { ...plan.loading, [field]: parseInt(value) || 0 }
      });
    };

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Production Plan</h2>
          
          {/* Date and Shift Selection */}
          <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={planDate}
                onChange={e => setPlanDate(e.target.value)}
                className="border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Shift</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPlanShift('Day')}
                  className={`px-4 py-2 rounded ${planShift === 'Day' ? 'bg-yellow-500 text-white' : 'bg-gray-200'}`}
                >
                  Day (07:00-19:00)
                </button>
                <button
                  onClick={() => setPlanShift('Night')}
                  className={`px-4 py-2 rounded ${planShift === 'Night' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                >
                  Night (19:00-07:00)
                </button>
              </div>
            </div>
            <div className="ml-auto">
              <button
                onClick={() => copyDayToNight(planDate)}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Copy Day → Night
              </button>
            </div>
          </div>

          {/* Summary Bar */}
          <div className={`mb-6 p-4 rounded-lg ${totalOpsNeeded <= availableCount ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex justify-between items-center">
              <div>
                <span className="font-semibold">Operators Required:</span> {totalOpsNeeded}
              </div>
              <div>
                <span className="font-semibold">Available:</span> {availableCount}
              </div>
              <div className={`font-bold ${totalOpsNeeded <= availableCount ? 'text-green-600' : 'text-red-600'}`}>
                {totalOpsNeeded <= availableCount ? '✓ Sufficient Staff' : `⚠ Short by ${totalOpsNeeded - availableCount}`}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lines Section */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Lines Running
              </h3>

              {/* Can Line */}
              <div className="mb-4 p-3 bg-blue-50 rounded">
                <div className="font-medium mb-2">Can Line</div>
                <div className="flex flex-wrap gap-3 mb-2">
                  {['MAC1', 'MAC2', 'MAB3'].map(line => (
                    <label key={line} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={plan.lines[line] || false}
                        onChange={e => updateLine(line, e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span>{line}</span>
                    </label>
                  ))}
                </div>
                {['MAC1', 'MAC2', 'MAB3'].some(l => plan.lines[l]) && (
                  <div className="flex items-center gap-2 mt-2">
                    <label className="text-sm">Ops needed:</label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={plan.canLineOps || 4}
                      onChange={e => updateProductionPlan(planDate, planShift, { canLineOps: parseInt(e.target.value) || 4 })}
                      className="w-16 border rounded px-2 py-1"
                    />
                    <span className="text-sm text-gray-500">(typically 4 for break cover)</span>
                  </div>
                )}
              </div>

              {/* Bot Line */}
              <div className="mb-4 p-3 bg-green-50 rounded">
                <div className="font-medium mb-2">Bot Line</div>
                <div className="flex flex-wrap gap-3">
                  {['MAB1', 'MAB2'].map(line => (
                    <label key={line} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={plan.lines[line] || false}
                        onChange={e => updateLine(line, e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span>{line}</span>
                    </label>
                  ))}
                </div>
                <div className="text-sm text-gray-500 mt-1">1 op per line running</div>
              </div>

              {/* Other Lines */}
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <div className="font-medium mb-2">Other Lines</div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={plan.lines['Corona'] || false}
                      onChange={e => updateLine('Corona', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Corona Line</span>
                    <span className="text-sm text-gray-500">(1 op)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={plan.lines['MAK1'] || false}
                      onChange={e => updateLine('MAK1', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Keg Line (MAK1)</span>
                    <span className="text-sm text-gray-500">(2 ops - inside + outside)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={plan.lines['Packaging'] || false}
                      onChange={e => updateLine('Packaging', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Packaging</span>
                    <span className="text-sm text-gray-500">(1 op)</span>
                  </label>
                </div>
              </div>

              {/* Pilot */}
              <div className="p-3 bg-red-50 rounded">
                <div className="font-medium mb-2">Pilot Coordinators</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="4"
                    value={plan.pilotCount ?? 2}
                    onChange={e => updateProductionPlan(planDate, planShift, { pilotCount: parseInt(e.target.value) || 0 })}
                    className="w-16 border rounded px-2 py-1"
                  />
                  <span className="text-sm text-gray-500">coordinators (typically 2)</span>
                </div>
              </div>
            </div>

            {/* Loading Section */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Loading Plan
              </h3>

              {/* Magor 1 */}
              <div className="mb-4 p-3 bg-orange-50 rounded">
                <div className="font-medium mb-2">Magor 1</div>
                <div className="flex items-center gap-3">
                  <div>
                    <label className="text-sm text-gray-600">Loads:</label>
                    <input
                      type="number"
                      min="0"
                      value={plan.loading?.magor1Loads || 0}
                      onChange={e => updateLoading('magor1Loads', e.target.value)}
                      className="w-20 border rounded px-2 py-1 ml-2"
                    />
                  </div>
                  <div className="text-sm">
                    ÷ 15 = <strong>{Math.ceil((plan.loading?.magor1Loads || 0) / 15)} ops</strong>
                  </div>
                </div>
              </div>

              {/* Tents */}
              <div className="mb-4 p-3 bg-orange-100 rounded">
                <div className="font-medium mb-2">Tents (Combined)</div>
                <div className="flex items-center gap-3">
                  <div>
                    <label className="text-sm text-gray-600">Loads:</label>
                    <input
                      type="number"
                      min="0"
                      value={plan.loading?.tentsLoads || 0}
                      onChange={e => updateLoading('tentsLoads', e.target.value)}
                      className="w-20 border rounded px-2 py-1 ml-2"
                    />
                  </div>
                  <div className="text-sm">
                    ÷ 15 = <strong>{Math.ceil((plan.loading?.tentsLoads || 0) / 15)} ops</strong>
                  </div>
                </div>
              </div>

              {/* Keg Loading */}
              <div className="mb-4 p-3 bg-pink-50 rounded">
                <div className="font-medium mb-2">Keg Loading</div>
                <div className="flex items-center gap-3">
                  <div>
                    <label className="text-sm text-gray-600">Loads:</label>
                    <input
                      type="number"
                      min="0"
                      value={plan.loading?.kegLoads || 0}
                      onChange={e => updateLoading('kegLoads', e.target.value)}
                      className="w-20 border rounded px-2 py-1 ml-2"
                    />
                  </div>
                  <div className="text-sm">
                    ÷ 6 = <strong>{Math.ceil((plan.loading?.kegLoads || 0) / 6)} ops</strong>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">More complex - 6 loads per op per shift</div>
              </div>

              {/* Requirements Summary */}
              <div className="mt-6 p-3 bg-gray-100 rounded">
                <div className="font-medium mb-2">Summary - Ops Required</div>
                <div className="space-y-1 text-sm">
                  {Object.entries(requirements).map(([area, config]) => (
                    <div key={area} className="flex justify-between">
                      <span>{area}:</span>
                      <span className="font-medium">{config.totalOps}</span>
                    </div>
                  ))}
                  <div className="border-t pt-1 mt-2 flex justify-between font-bold">
                    <span>Total:</span>
                    <span>{totalOpsNeeded}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => {
                setSelectedDate(new Date(planDate));
                setActiveTab('rota');
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Generate Rota for this Plan →
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render History
  const renderHistory = () => {
    const sortedRotas = [...rotas].sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Rota History</h2>
          
          {sortedRotas.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No rotas saved yet</p>
          ) : (
            <div className="space-y-4">
              {sortedRotas.map(rota => (
                <div key={rota.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold">{formatDisplayDate(rota.date)}</h3>
                      <span className={`text-sm px-2 py-1 rounded ${
                        rota.shiftType === 'Day' ? 'bg-yellow-100' : 'bg-blue-100'
                      }`}>
                        {rota.shiftType} Shift
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Created: {new Date(rota.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {Object.entries(rota.assignments).map(([area, positions]) => (
                      <div key={area} className="bg-gray-50 p-2 rounded">
                        <div className="font-medium text-xs text-gray-600">{area}</div>
                        {Object.entries(positions).map(([pos, staff]) => (
                          <div key={pos} className="truncate">
                            {staff?.name || <span className="text-red-500">Unfilled</span>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedDate(new Date(rota.date));
                        setActiveTab('rota');
                      }}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View/Edit
                    </button>
                    {confirmRotaDelete === rota.id ? (
                      <>
                        <button
                          onClick={() => {
                            setRotas(rotas.filter(r => r.id !== rota.id));
                            setConfirmRotaDelete(null);
                          }}
                          className="text-white bg-red-600 px-2 py-1 rounded text-sm hover:bg-red-700"
                        >
                          Confirm Delete
                        </button>
                        <button
                          onClick={() => setConfirmRotaDelete(null)}
                          className="text-gray-600 hover:underline text-sm"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmRotaDelete(rota.id)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-900 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">A Shift Management</h1>
          <div className="text-sm opacity-75">
            {new Date().toLocaleDateString('en-GB', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </header>

      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto">
          <div className="flex space-x-1 p-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'production', label: 'Production Plan', icon: Settings },
              { id: 'staff', label: 'Staff', icon: Users },
              { id: 'availability', label: 'Availability', icon: Calendar },
              { id: 'rota', label: 'Generate Rota', icon: FileSpreadsheet },
              { id: 'history', label: 'History', icon: Clock }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'production' && renderProductionPlan()}
        {activeTab === 'staff' && renderStaffManagement()}
        {activeTab === 'availability' && renderAvailability()}
        {activeTab === 'rota' && renderRotaGenerator()}
        {activeTab === 'history' && renderHistory()}
      </main>
    </div>
  );
}
