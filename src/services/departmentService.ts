
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Department {
  id: string;
  code: string;
  name: string;
  created_at: string;
}

export interface DepartmentInput {
  code: string;
  name: string;
}

export const departmentService = {
  async getDepartments() {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');
        
      if (error) throw error;
      return data as Department[];
    } catch (error: any) {
      console.error('Error fetching departments:', error);
      toast({
        title: "Error",
        description: `Failed to fetch departments: ${error.message}`,
        variant: "destructive",
      });
      return [];
    }
  },

  async getDepartment(id: string) {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      return data as Department;
    } catch (error: any) {
      console.error(`Error fetching department ${id}:`, error);
      toast({
        title: "Error",
        description: `Failed to fetch department: ${error.message}`,
        variant: "destructive",
      });
      return null;
    }
  },

  async createDepartment(department: DepartmentInput) {
    try {
      const { data, error } = await supabase
        .from('departments')
        .insert(department)
        .select()
        .single();
        
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Department created successfully",
      });
      
      return data as Department;
    } catch (error: any) {
      console.error('Error creating department:', error);
      toast({
        title: "Error",
        description: `Failed to create department: ${error.message}`,
        variant: "destructive",
      });
      return null;
    }
  },

  async updateDepartment(id: string, department: Partial<DepartmentInput>) {
    try {
      const { data, error } = await supabase
        .from('departments')
        .update(department)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Department updated successfully",
      });
      
      return data as Department;
    } catch (error: any) {
      console.error(`Error updating department ${id}:`, error);
      toast({
        title: "Error",
        description: `Failed to update department: ${error.message}`,
        variant: "destructive",
      });
      return null;
    }
  },

  async deleteDepartment(id: string) {
    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Department deleted successfully",
      });
      
      return true;
    } catch (error: any) {
      console.error(`Error deleting department ${id}:`, error);
      toast({
        title: "Error",
        description: `Failed to delete department: ${error.message}`,
        variant: "destructive",
      });
      return false;
    }
  }
};

export default departmentService;
