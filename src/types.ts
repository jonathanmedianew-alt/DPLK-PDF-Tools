export type ToolId =
  | 'merge'
  | 'split'
  | 'compress'
  | 'pdf-to-word'
  | 'pdf-to-powerpoint'
  | 'pdf-to-excel'
  | 'word-to-pdf'
  | 'powerpoint-to-pdf'
  | 'excel-to-pdf'
  | 'edit'
  | 'excel-editor'
  | 'word-editor'
  | 'sign'
  | 'watermark'
  | 'powerpoint-editor';

export interface PDFTool {
  id: ToolId;
  title: string;
  shortDesc: string;
  description: string;
  icon: string;
  category: 'organize' | 'optimize' | 'convert-from' | 'convert-to' | 'edit';
  color: string;
}

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  totalPages?: number;
  previewUrl?: string;
  order: number;
}

export type AnnotationType =
  | 'text'
  | 'shape'
  | 'drawing'
  | 'image'
  | 'signature'
  | 'highlight'
  | 'form-field';

export interface BaseAnnotation {
  id: string;
  pageIndex: number;
  type: AnnotationType;
  x: number; // percentage (0-100) relative to page width
  y: number; // percentage (0-100) relative to page height
  rotation?: number; // degrees (0-360)
  opacity?: number; // 0.0 to 1.0
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  text: string;
  fontSize: number;
  color: string;
  fontFamily: 'Helvetica' | 'Courier' | 'Times-Roman';
  underline?: boolean;
  strikethrough?: boolean;
  isExisting?: boolean;
  isDeleted?: boolean;
  originalText?: string;
  originalX?: number;
  originalY?: number;
  originalWidth?: number;
  originalHeight?: number;
}

export interface ShapeAnnotation extends BaseAnnotation {
  type: 'shape';
  shapeType: 'rectangle' | 'circle';
  width: number; // percentage relative to page width
  height: number; // percentage relative to page height
  color: string; // fill color
  borderColor: string;
  borderWidth: number;
}

export interface DrawingAnnotation extends BaseAnnotation {
  type: 'drawing';
  points: { x: number; y: number }[]; // coordinates within (0-100) range
  color: string;
  lineWidth: number;
}

export interface ImageAnnotation extends BaseAnnotation {
  type: 'image';
  imageUrl: string; // base64 or object URL of selected image
  width: number;
  height: number;
}

export interface SignatureAnnotation extends BaseAnnotation {
  type: 'signature';
  signatureUrl: string; // base64 signature image
  color: string;
  width: number;
  height: number;
}

export interface HighlightAnnotation extends BaseAnnotation {
  type: 'highlight';
  width: number;
  height: number;
  color: string; // highlight color
}

export interface FormFieldAnnotation extends BaseAnnotation {
  type: 'form-field';
  fieldName: string;
  fieldValue: string;
  width: number;
  height: number;
  fontSize: number;
  placeholder?: string;
}

export type Annotation =
  | TextAnnotation
  | ShapeAnnotation
  | DrawingAnnotation
  | ImageAnnotation
  | SignatureAnnotation
  | HighlightAnnotation
  | FormFieldAnnotation;

export interface AccessRequest {
  email: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

