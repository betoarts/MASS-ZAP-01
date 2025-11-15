import { supabase } from '@/integrations/supabase/client';
import { Flow, FlowNode, FlowEdge, Execution, Job } from './flow-types';

export const getFlows = async (userId: string): Promise<Flow[]> => {
  const { data, error } = await supabase
    .from('flows')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching flows:', error);
    return [];
  }
  return data as Flow[];
};

export const getFlowById = async (flowId: string): Promise<Flow | null> => {
  const { data, error } = await supabase
    .from('flows')
    .select('*')
    .eq('id', flowId)
    .single();

  if (error) {
    console.error('Error fetching flow:', error);
    return null;
  }
  return data as Flow;
};

export const createFlow = async (
  userId: string,
  name: string,
  description?: string
): Promise<Flow | null> => {
  const { data, error } = await supabase
    .from('flows')
    .insert({
      user_id: userId,
      name,
      description,
      nodes: [],
      edges: [],
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating flow:', error);
    return null;
  }
  return data as Flow;
};

export const updateFlow = async (
  flowId: string,
  nodes: FlowNode[],
  edges: FlowEdge[]
): Promise<boolean> => {
  const { error } = await supabase
    .from('flows')
    .update({
      nodes,
      edges,
      updated_at: new Date().toISOString(),
    })
    .eq('id', flowId);

  if (error) {
    console.error('Error updating flow:', error);
    return false;
  }
  return true;
};

export const deleteFlow = async (flowId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('flows')
    .delete()
    .eq('id', flowId);

  if (error) {
    console.error('Error deleting flow:', error);
    return false;
  }
  return true;
};

export const getExecutions = async (flowId: string): Promise<Execution[]> => {
  const { data, error } = await supabase
    .from('executions')
    .select('*')
    .eq('flow_id', flowId)
    .order('started_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching executions:', error);
    return [];
  }
  return data as Execution[];
};

export const getExecutionById = async (executionId: string): Promise<Execution | null> => {
  const { data, error } = await supabase
    .from('executions')
    .select('*')
    .eq('id', executionId)
    .single();

  if (error) {
    console.error('Error fetching execution by ID:', error);
    return null;
  }
  return data as Execution;
};

export const getJobsByExecutionId = async (executionId: string): Promise<Job[]> => {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('execution_id', executionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching jobs by execution ID:', error);
    return [];
  }
  return data as Job[];
};