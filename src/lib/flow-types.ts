export type NodeType = 'start' | 'send_message' | 'wait' | 'condition' | 'webhook' | 'end';

export interface FlowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
}

export interface NodeData {
  label?: string;
  // send_message
  message?: string;
  instanceId?: string;
  contactListId?: string;
  // wait
  delay?: number;
  delayUnit?: 'seconds' | 'minutes' | 'hours';
  // condition
  expression?: string;
  trueLabel?: string;
  falseLabel?: string;
  // webhook
  url?: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

export interface Flow {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Execution {
  id: string;
  user_id: string;
  flow_id: string;
  status: 'running' | 'success' | 'failed';
  context: Record<string, any>;
  current_node_id?: string;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

export interface Job {
  id: string;
  user_id: string;
  execution_id: string;
  node_id: string;
  node_type: NodeType;
  node_data: NodeData;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  scheduled_at: string;
  processed_at?: string;
  retry_count: number;
  max_retries: number;
  error_message?: string;
  created_at: string;
}