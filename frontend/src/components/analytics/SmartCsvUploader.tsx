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
    { id: 'ventas-contribuyentes', label: 'Ventas a Contribuyentes', cols: 20, form: 'F07' },
    { id: 'ventas-consumidor', label: 'Ventas Consumidor Final', cols: 23, form: 'F07' },
    { id: 'compras', label: 'Compras', cols: 21, form: 'F07' },
  ];

  // Plantillas de encabezados para CSVs de Hacienda sin headers (formato LIBRO)
  const LIBRO_TEMPLATES: Record<string, string> = {
    'ventas-contribuyentes': 'FECHA_EMISION,CLASE_DOC,TIPO_DOC,NUM_RESOLUCION,SERIE,NUM_DOC,NUM_CONTROL,NIT_CLIENTE,NOMBRE_CLIENTE,VENTAS_EXENTAS,VENTAS_NO_SUJETAS,VENTAS_GRAVADAS,DEBITO_FISCAL,VENTAS_TERCEROS,DEBITO_TERCEROS,TOTAL_VENTA,DUI_CLIENTE,TIPO_OPERACION,TIPO_INGRESO,NUM_ANEXO',
    'ventas-consumidor': 'FECHA_EMISION,CLASE_DOC,TIPO_DOC,NUM_RESOLUCION,SERIE,NUM_CONTROL_DESDE,NUM_CONTROL_HASTA,NUM_DOC_DESDE,NUM_DOC_HASTA,NUM_MAQUINA,VENTAS_EXENTAS,VENTAS_INTERNAS_EXENTAS,VENTAS_NO_SUJETAS,VENTAS_GRAVADAS,EXPORTACIONES_CENTROAMERICA,EXPORTACIONES_FUERA_CENTROAMERICA,EXPORTACIONES_SERVICIO,VENTAS_ZONAS_FRANCAS,VENTAS_TERCEROS,TOTAL_VENTAS,TIPO_OPERACION,TIPO_INGRESO,NUM_ANEXO',
    'compras': 'FECHA_EMISION,CLASE_DOC,TIPO_DOC,NUM_DOC,NIT_PROVEEDOR,NOMBRE_PROVEEDOR,COMPRAS_INTERNAS_EXENTAS,INTERNACIONES_EXENTAS,IMPORTACIONES_EXENTAS,COMPRAS_INTERNAS_GRAVADAS,INTERNACIONES_GRAVADAS,IMPORTACIONES_GRAVADAS_BIENES,IMPORTACIONES_GRAVADAS_SERVICIOS,CREDITO_FISCAL,TOTAL_COMPRAS,DUI_PROVEEDOR,TIPO_OPERACION,CLASIFICACION,SECTOR,TIPO_COSTO_GASTO,NUM_ANEXO',
  };

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

  const handleDownloadTemplate = (typeId: AnnexUploadType) => {
    const template = LIBRO_TEMPLATES[typeId] || LIBRO_TEMPLATES['ventas-contribuyentes'];
    const csvContent = template + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `plantilla_${typeId}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          throw new Error("El archivo está vacío o no pudo leerse.");
        }
        
        const rawLines = text.split('\n');
        const lines = rawLines.map(l => l.trim()).filter(line => line !== '');
        
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        if (lines.length > 0) {
          // Detectar separador: probar cual da mas columnas
          const sepCandidates = [',', ';', '\t', '|'];
          let separator = ',';
          let maxCols = 0;
          for (const sep of sepCandidates) {
            const cols = lines[0].split(sep).length;
            if (cols > maxCols) {
              maxCols = cols;
              separator = sep;
            }
          }
          const firstRowCols = lines[0].split(separator);
          const typeConfig = annexTypes.find(t => t.id === selectedType);
          const expectedCols = typeConfig?.cols || 0;

          // Detectar CSVs sin encabezados (formato LIBRO de Hacienda)
          const headerKeywords = ['FECHA', 'TIPO', 'DOC', 'NIT', 'NOMBRE', 'CLIENTE', 'PROVEEDOR', 'GRAVADA', 'EXENTA', 'DEBITO'];
          const hasHeaders = firstRowCols.some(c => headerKeywords.some(k => c.toUpperCase().includes(k)));
          if (!hasHeaders) {
            const template = LIBRO_TEMPLATES[selectedType];
            if (template) {
              // Usar el mismo separador que el archivo
              lines.unshift(template.split(',').join(separator));
              warnings.push({
                code: 'NO_HEADERS',
                message: 'El archivo no contiene encabezados. Se ha aplicado la plantilla de columnas Hacienda automáticamente.'
              });
            }
          }

          const headers = lines[0].split(separator);

          if (headers.length < expectedCols) {
            const suggestedType = annexTypes.find(t => t.cols === headers.length);
            let extraMsg = '';
            if (suggestedType) {
              extraMsg = ` ¿Quisiste decir "${suggestedType.label}"?`;
            }

            errors.push({
              code: 'COLUMNS_MISMATCH',
              severity: 'structural',
              message: `Error Estructural: El archivo tiene ${headers.length} columnas, pero el tipo seleccionado "${selectedType}" requiere al menos ${expectedCols}.${extraMsg}`
            });
          }

          // Mejoramos la detección de columnas usando nombres de encabezados
          const findColIndex = (keywords: string[]) => {
            return headers.findIndex(h => keywords.some(k => h.toUpperCase().includes(k)));
          };

          const dateColIndex = findColIndex(['FECHA']);
          const isConsumidor = selectedType === 'ventas-consumidor';
          const idColIndex = isConsumidor ? findColIndex(['DUI', 'IDENTIFICACION']) : findColIndex(['NIT', 'NRC']);
          const totalColIndex = findColIndex(['TOTAL', 'MONTO', 'VALOR']);

          // Fallbacks por defecto
          const finalDateCol = dateColIndex !== -1 ? dateColIndex : 6;
          const finalIdCol = idColIndex !== -1 ? idColIndex : (isConsumidor ? 8 : 7);
          const finalTotalCol = totalColIndex !== -1 ? totalColIndex : 13;

          // Escaneamos hasta 500 filas para una validación más profunda en archivos grandes
          const rowsToScan = Math.min(lines.length, 500);
          for (let i = 1; i < rowsToScan; i++) {
            const cols = lines[i].split(separator);
            if (cols.length <= 1) continue; 
            
            // Validación de Fecha
            if (cols.length > finalDateCol) {
              const dateValue = cols[finalDateCol].trim();
              const dateRegex = /^(\d{1,2}\/\d{1,2}\/\d{4})|(\d{4}-\d{1,2}-\d{1,2})$/;
              
              if (dateValue !== '' && !dateRegex.test(dateValue)) {
                errors.push({
                  code: 'INVALID_DATE_FORMAT',
                  severity: 'row-level',
                  message: `Línea ${i + 1}: El formato de fecha "${dateValue}" es inválido. Use DD/MM/AAAA.`,
                  line: i + 1,
                  column: (finalDateCol + 1).toString()
                });
              }
            }
            
              // Validación de Identificación (NIT o DUI)
            if (cols.length > finalIdCol) {
              const idRaw = cols[finalIdCol].trim();
              const idClean = idRaw.replace(/\D/g, '');
              
              // Ignorar UUIDs (contienen guiones) o valores nulos/falsos
              const isUuid = idRaw.includes('-');
              const isValidIdentifier = idRaw !== '' && idRaw.toUpperCase() !== 'N/A' && idRaw.toUpperCase() !== 'DESCONOCIDO' && idRaw !== '0' && !isUuid;

              if (isValidIdentifier) {
                if (isConsumidor) {
                  // Validación DUI (9 dígitos)
                  if (idClean.length !== 9 && idClean.length !== 0) {
                    errors.push({
                      code: 'INVALID_DUI',
                      severity: 'row-level',
                      message: `Línea ${i + 1}: El DUI "${idRaw}" no es válido. Se esperan 9 dígitos.`,
                      line: i + 1,
                      column: (finalIdCol + 1).toString()
                    });
                  }
                } else {
                  // Validación NIT (6-14 dígitos: permitimos desde 6 dígitos)
                  if ((idClean.length < 6 || idClean.length > 14) && idClean.length !== 0) {
                    errors.push({
                      code: 'INVALID_NIT',
                      severity: 'row-level',
                      message: `Línea ${i + 1}: El NIT "${idRaw}" no es válido. Se esperan 6-14 dígitos.`,
                      line: i + 1,
                      column: (finalIdCol + 1).toString()
                    });
                  }
                }
              }
            }

            // Validación de Monto Total (Debe ser numérico)
            if (cols.length > finalTotalCol) {
              const totalRaw = cols[finalTotalCol].trim().replace(',', '');
              if (totalRaw !== '' && isNaN(Number(totalRaw))) {
                errors.push({
                  code: 'INVALID_AMOUNT',
                  severity: 'row-level',
                  message: `Línea ${i + 1}: El monto "${cols[finalTotalCol]}" no es un número válido.`,
                  line: i + 1,
                  column: (finalTotalCol + 1).toString()
                });
              }
            }
          }

          if (lines.length > 500) {
            warnings.push({
              code: 'PARTIAL_SCAN',
              message: `El archivo es grande. Se validaron las primeras 500 de ${lines.length - 1} filas.`
            });
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
            rowCount: lines.length > 0 ? lines.length - 1 : 0,
            detectedType: selectedType,
            file: file
          });
        }, 1200); 
        
      } catch (err: any) {
        console.error("Error validando el CSV:", err);
        setIsProcessing(false);
        onValidationComplete({
          isValid: false,
          fileName: file.name,
          fileSize: file.size,
          errors: [{ code: 'PARSE_ERROR', severity: 'critical', message: `Error al procesar el archivo: ${err.message}` }],
          warnings: []
        });
      }
    };
    
    reader.onerror = () => {
      setIsProcessing(false);
      onValidationComplete({
        isValid: false,
        fileName: file.name,
        fileSize: file.size,
        errors: [{ code: 'READ_ERROR', severity: 'critical', message: 'No se pudo leer el archivo físico.' }],
        warnings: []
      });
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
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Paso 1: Seleccionar Tipo de Anexo</h3>
          <button 
            onClick={() => handleDownloadTemplate(selectedType)}
            className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline flex items-center gap-2"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Descargar Plantilla {selectedType.split('-')[0]}
          </button>
        </div>
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
              ${isDragging ? 'border-emerald-500 bg-emerald-50/50 shadow-2xl shadow-emerald-500/10' : 'border-zinc-300 bg-white hover:border-emerald-500 hover:bg-emerald-50/20'}`}
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
            <p className="text-sm font-medium text-zinc-500 uppercase tracking-widest text-[10px] font-black">o haz clic para explorar tus archivos</p>
          </div>
        )}
      </div>
    </div>
  );
}
