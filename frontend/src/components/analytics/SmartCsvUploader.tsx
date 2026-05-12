// frontend/src/components/analytics/SmartCsvUploader.tsx
import React, { useState, useRef } from 'react';
import { Company, AnnexUploadType, CsvValidationResult, ValidationError, ValidationWarning } from '@/types/companyTypes';

interface SmartCsvUploaderProps {
  company: Company;
  onValidationComplete: (result: CsvValidationResult) => void;
  onBack: () => void;
}

const Icons = {
  Back: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
  ),
  Upload: () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
  ),
  Document: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  ),
  Building: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
  )
};

export default function SmartCsvUploader({ company, onValidationComplete, onBack }: SmartCsvUploaderProps) {
  const [selectedType, setSelectedType] = useState<AnnexUploadType>('ventas-contribuyentes');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const annexTypes: { id: AnnexUploadType; label: string; cols: number; form: string }[] = [
    { id: 'ventas-contribuyentes', label: 'Ventas a Contribuyentes', cols: 19, form: 'F07' },
    { id: 'ventas-consumidor', label: 'Ventas Consumidor Final', cols: 19, form: 'F07' },
    { id: 'compras', label: 'Compras', cols: 20, form: 'F07' },
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateFile(e.target.files[0]);
    }
  };

  const validateFile = (file: File) => {
    setIsProcessing(true);
    
    // Validar extensión
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setTimeout(() => {
        setIsProcessing(false);
        onValidationComplete({
          isValid: false,
          fileName: file.name,
          fileSize: file.size,
          errors: [{ code: 'INVALID_FILE_TYPE', severity: 'critical', message: 'Error: Tipo de archivo inválido. Solo se admiten archivos .CSV reales' }],
          warnings: []
        });
      }, 1000);
      return;
    }

    const expectedCols = annexTypes.find(t => t.id === selectedType)?.cols || 0;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];

      if (lines.length > 0) {
        const separator = lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(separator);
        const expectedCols = annexTypes.find(t => t.id === selectedType)?.cols || 0;
        
        if (headers.length !== expectedCols) {
          const suggestedType = annexTypes.find(t => t.cols === headers.length);
          let extraMsg = '';
          if (suggestedType) {
            extraMsg = ` ¿Quisiste decir "${suggestedType.label}"?`;
          }
          
          errors.push({
            code: 'COLUMNS_MISMATCH',
            severity: 'structural',
            message: `Error Estructural: El archivo tiene ${headers.length} columnas, pero el tipo seleccionado "${selectedType}" requiere ${expectedCols}.${extraMsg}`
          });
        }

        // Mock Row-level validation on lines 1-10
        for (let i = 1; i < Math.min(lines.length, 10); i++) {
          const cols = lines[i].split(separator);
          
          // El formato de Hacienda para estos anexos usualmente tiene la fecha en la columna 7 (index 6)
          // NIT_RECEPTOR,NRC_RECEPTOR,ANIO,MES,TIPO_DOC,NUM_DOC,FECHA_EMISION...
          const dateColIndex = 6; 
          
          if (cols.length > dateColIndex) {
            const dateValue = cols[dateColIndex].trim();
            const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
            
            if (dateValue !== '' && !dateRegex.test(dateValue)) {
              errors.push({
                code: 'INVALID_DATE_FORMAT',
                severity: 'row-level',
                message: `Línea ${i + 1}: El formato de fecha en la columna ${dateColIndex + 1} debe ser DD/MM/AAAA.`,
                line: i + 1,
                column: (dateColIndex + 1).toString()
              });
            }
          }
          
          // Validación de Identificación (NIT o DUI)
          // Ventas Contribuyente: NIT en col 8 (index 7)
          // Compras: NIT en col 8 (index 7)
          // Ventas Consumidor: DUI en col 9 (index 8)
          const isConsumidor = selectedType === 'ventas-consumidor';
          const idColIndex = isConsumidor ? 8 : 7;
          
          if (cols.length > idColIndex) {
            const idRaw = cols[idColIndex].trim();
            const idClean = idRaw.replace(/\D/g, '');
            
            if (idRaw !== '') {
              if (isConsumidor) {
                // Validación DUI (9 dígitos)
                if (idClean.length !== 9) {
                  errors.push({
                    code: 'INVALID_DUI',
                    severity: 'row-level',
                    message: `Línea ${i + 1}: El DUI "${idRaw}" no es válido. Se esperan 9 dígitos.`,
                    line: i + 1,
                    column: (idColIndex + 1).toString()
                  });
                }
              } else {
                // Validación NIT (14 dígitos)
                if (idClean.length !== 14) {
                  errors.push({
                    code: 'INVALID_NIT',
                    severity: 'row-level',
                    message: `Línea ${i + 1}: El NIT "${idRaw}" no es válido. Se esperan 14 dígitos.`,
                    line: i + 1,
                    column: (idColIndex + 1).toString()
                  });
                }
              }
            }
          }
        }
      }

      setTimeout(() => {
        setIsProcessing(false);
        onValidationComplete({
          isValid: errors.length === 0,
          fileName: file.name,
          fileSize: file.size,
          errors,
          warnings,
          rowCount: lines.length - 1,
          detectedType: selectedType
        });
      }, 1500); // Mock processing delay
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      {/* Header Contextual */}
      <div className="flex items-center gap-4 border-b border-zinc-200 pb-6">
        <button 
          onClick={onBack}
          className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
        >
          <Icons.Back />
        </button>
        <div>
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Carga de Anexos</h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-100 rounded-md text-[10px] font-black uppercase tracking-widest text-zinc-600">
              <Icons.Building />
              {company.name}
            </div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase">NIT: {company.nit}</span>
          </div>
        </div>
      </div>

      {/* Selector de Tipo de Anexo */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Paso 1: Seleccionar Tipo de Anexo</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {annexTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`p-6 rounded-3xl border-2 text-left transition-all ${
                selectedType === type.id 
                  ? 'border-emerald-500 bg-emerald-50/30 shadow-lg shadow-emerald-500/10' 
                  : 'border-zinc-200 bg-white hover:border-emerald-500/50 hover:bg-emerald-50/10'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${selectedType === type.id ? 'bg-emerald-500 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                  <Icons.Document />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${selectedType === type.id ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                  {type.form}
                </span>
              </div>
              <h4 className={`font-black text-sm mb-1 ${selectedType === type.id ? 'text-zinc-900' : 'text-zinc-700'}`}>{type.label}</h4>
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">{type.cols} Columnas requeridas</p>
            </button>
          ))}
        </div>
      </div>

      {/* Zona Drag & Drop */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Paso 2: Subir Archivo</h3>
        
        {isProcessing ? (
          <div className="w-full h-80 rounded-[2.5rem] border-2 border-zinc-200 bg-zinc-50 flex flex-col items-center justify-center animate-pulse">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6" />
            <p className="text-sm font-black text-zinc-900 tracking-widest uppercase">Validando Estructura</p>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-2">Revisando columnas y formatos de celda...</p>
          </div>
        ) : (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full h-80 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group
              ${isDragging ? 'border-emerald-500 bg-emerald-50/50' : 'border-zinc-300 bg-white hover:border-emerald-500 hover:bg-emerald-50/20'}`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".csv"
              onChange={handleFileChange}
            />
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 ${isDragging ? 'bg-emerald-500 text-white scale-110 shadow-xl shadow-emerald-500/30' : 'bg-zinc-100 text-zinc-400 group-hover:bg-emerald-500 group-hover:text-white group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-emerald-500/30'}`}>
              <Icons.Upload />
            </div>
            <p className="text-lg font-black text-zinc-900 mb-2">Arrastra tu archivo CSV aquí</p>
            <p className="text-sm font-medium text-zinc-500">o haz clic para explorar tus archivos</p>
          </div>
        )}
      </div>
    </div>
  );
}
