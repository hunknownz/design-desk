export type Viewport = 'desktop' | 'tablet' | 'mobile';
export type TaskStatus = 'review' | 'waiting' | 'in_progress' | 'done';
export type AnnotationStatus = 'open' | 'resolved' | 'archived';

export interface ProjectInfo {
  name: string;
  workbenchName?: string;
  subtitle: string;
  version: string;
  description: string;
  siteUrl: string;
  previewUrl?: string;
  demoUrl: string;
  demoVersion: string;
}

export type CompetitorSource = 'client-provided' | 'project-research';
export type CompetitorSeoLevel = 'strong' | 'moderate' | 'weak' | 'restricted' | 'pending';

export interface CompetitorProfile {
  id: string;
  rank: number;
  name: string;
  url: string;
  market?: string;
  sources: CompetitorSource[];
  annotationPriority?: boolean;
  priorityReason?: string;
  learn: string[];
  seo: {
    level: CompetitorSeoLevel;
    label: string;
    summary: string;
    observedAt?: string;
    evidenceStatus: string;
  };
}

export interface CompetitorTracker {
  title: string;
  subtitle?: string;
  updatedAt: string;
  rankingNote: string;
  coverageNote?: string;
  items: CompetitorProfile[];
}

export interface PageInfo {
  id: string;
  label: string;
  description: string;
  path: string;
}

export interface ReviewTask {
  id: string;
  order: number;
  lane: string;
  title: string;
  description: string;
  solution: string;
  pageId: string;
  targetId: string;
  targetLabel: string;
  buildStatus: string;
  status: TaskStatus;
  owner: string;
  note: string;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  parentId?: string | null;
  deletedBy?: string | null;
  deletedAt?: string | null;
}

export type AnnotationKind = 'review' | 'rationale';
export type AnnotationCalloutTone = 'decision' | 'evidence' | 'attention' | 'neutral';

export interface AnnotationSource {
  label: string;
  url: string;
  note?: string;
}

export type AnnotationContentBlock =
  | { type: 'lead'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; caption?: string; columns: string[]; rows: string[][] }
  | { type: 'callout'; label: string; text: string; tone?: AnnotationCalloutTone }
  | { type: 'sources'; title?: string; items: AnnotationSource[] };

export interface Annotation {
  id: string;
  sequence?: number;
  kind?: AnnotationKind;
  title?: string;
  summary?: string;
  content?: AnnotationContentBlock[];
  pageId: string;
  taskId: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  viewportWidth: number;
  viewport?: Viewport;
  selectionType: 'element' | 'area';
  elementLabel: string;
  elementPath: string;
  locationLabel: string;
  targetId?: string;
  demoVersion?: string;
  status: AnnotationStatus;
  author: string;
  createdAt: string;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  archivedBy?: string | null;
  archivedAt?: string | null;
  comments: Comment[];
}

export interface Activity {
  id: string;
  user: string;
  verb: string;
  detail: string;
  targetId: string | null;
  createdAt: string;
}

export interface ProjectState {
  revision: number;
  updatedAt: string;
  project: ProjectInfo;
  pages: PageInfo[];
  tasks: ReviewTask[];
  annotations: Annotation[];
  activity: Activity[];
  competitorTracker?: CompetitorTracker;
  deletedDesignNoteIds?: string[];
}

export interface DemoMetrics {
  documentWidth: number;
  documentHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  scrollX: number;
  scrollY: number;
}

export interface InspectedElement {
  requestId: string;
  targetId: string;
  elementLabel: string;
  elementPath: string;
  locationLabel: string;
  rect: { left: number; top: number; width: number; height: number };
}

export interface LocatedTarget {
  targetId: string;
  point: { x: number; y: number };
}

export interface PendingAnnotation {
  pageId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  viewportWidth: number;
  viewport: Viewport;
  selectionType: 'element' | 'area';
  elementLabel: string;
  elementPath: string;
  locationLabel: string;
  targetId: string;
  demoVersion: string;
  viewRect: { left: number; top: number; width: number; height: number };
}
